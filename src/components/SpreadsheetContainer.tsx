import { useMemo, useCallback, useRef, useEffect } from "react"
import { Workbook } from "@fortune-sheet/react"
import type { Sheet, Cell, CellMatrix } from "@fortune-sheet/core"
import "@fortune-sheet/react/dist/index.css"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { parseConfigSheet, getSpecValues } from "@/lib/config-sheet"
import { processAutoSKU } from "@/lib/auto-sku"
import type { CellData, ParsedSpec, SheetConfig } from "@/types"

/**
 * Deep comparison of CellData[][] arrays to detect actual changes
 */
function isDataEqual(a: CellData[][], b: CellData[][]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const rowA = a[i]
    const rowB = b[i]
    if (!rowA && !rowB) continue
    if (!rowA || !rowB) return false
    if (rowA.length !== rowB.length) return false
    for (let j = 0; j < rowA.length; j++) {
      const cellA = rowA[j]
      const cellB = rowB[j]
      if (!cellA && !cellB) continue
      if (!cellA || !cellB) return false
      if (cellA.v !== cellB.v || cellA.m !== cellB.m) return false
    }
  }
  return true
}

/**
 * Build dataVerification object for dropdown cells based on column headers
 * matching spec names from Config sheet
 */
function buildDataVerification(
  parsedSpecs: ParsedSpec[],
  columnHeaders: string[],
  rowCount: number
): Record<string, { type: string; value1: string; prohibitInput: boolean }> {
  const dataVerification: Record<string, { type: string; value1: string; prohibitInput: boolean }> = {}

  // For each column header that matches a spec name
  // Headers start from column 1 (index 0 is SKU column)
  columnHeaders.forEach((header, headerIndex) => {
    if (!header) return

    const specValues = getSpecValues(parsedSpecs, header)
    if (specValues.length === 0) return

    // Create dropdown options (comma-separated labels)
    const options = specValues.map(v => v.label).join(",")

    // Actual column index is headerIndex + 1 (SKU is at column 0)
    const colIndex = headerIndex + 1

    // Apply to all data rows (skip header row 0)
    for (let row = 1; row < rowCount; row++) {
      const key = `${row}_${colIndex}`
      dataVerification[key] = {
        type: "dropdown",
        value1: options,
        prohibitInput: false,
      }
    }
  })

  return dataVerification
}

/**
 * Extract column headers from the first row of sheet data
 * Excludes first column (SKU column at index 0)
 */
function extractHeaders(data: CellData[][]): string[] {
  if (!data || data.length === 0 || !data[0]) return []

  const firstRow = data[0]
  // Exclude first column (SKU column at index 0)
  const headers: string[] = []
  for (let i = 1; i < firstRow.length; i++) {
    const cell = firstRow[i]
    headers.push(String(cell?.v ?? cell?.m ?? "").trim())
  }
  return headers
}

/**
 * Convert our CellData[][] to Fortune-Sheet CellMatrix format
 */
function convertToFortuneSheetData(data: CellData[][]): CellMatrix {
  return data.map(row =>
    row.map(cell => {
      if (!cell || (cell.v === undefined && cell.m === undefined)) {
        return null
      }
      return {
        v: cell.v,
        m: cell.m ?? String(cell.v ?? ""),
        ct: cell.ct,
      } as Cell
    })
  )
}

/**
 * Convert Fortune-Sheet data back to our CellData[][] format
 */
function convertFromFortuneSheetData(data: CellMatrix | undefined): CellData[][] {
  if (!data) return []
  return data.map(row =>
    row.map(cell => {
      if (!cell) return {}
      // Handle boolean values by converting to string
      const value = typeof cell.v === "boolean" ? String(cell.v) : cell.v
      return {
        v: value,
        m: cell.m !== undefined ? String(cell.m) : undefined,
        ct: cell.ct,
      }
    })
  )
}

export function SpreadsheetContainer() {
  const { sheets, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet } = useSheetsStore()
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Memoize configSheet - find the config type sheet from sheets array
  const configSheet = useMemo(() => {
    return sheets.find(s => s.type === "config") ?? null
  }, [sheets])

  // Parse Config sheet for spec definitions
  const parsedSpecs = useMemo(() => {
    if (!configSheet) return []
    return parseConfigSheet(configSheet.data)
  }, [configSheet])

  // Use ref for previous sheet data to avoid triggering re-renders
  const previousDataRef = useRef<Map<string, CellData[][]>>(new Map())

  // Update previous data ref when sheets change
  useEffect(() => {
    const map = new Map<string, CellData[][]>()
    sheets.forEach(sheet => {
      map.set(sheet.id, sheet.data)
    })
    previousDataRef.current = map
  }, [sheets])

  // Keep a snapshot ref for sheets to access current state without dependency
  const sheetsSnapshotRef = useRef<SheetConfig[]>(sheets)
  useEffect(() => {
    sheetsSnapshotRef.current = sheets
  }, [sheets])

  // Handle when user clicks a sheet tab in Fortune-Sheet
  const handleSheetActivate = useCallback((sheetId: string) => {
    setActiveSheet(sheetId)
  }, [setActiveSheet])

  // Prevent deletion of Config sheet (uses ref to avoid sheets dependency)
  const handleBeforeDeleteSheet = useCallback((id: string): boolean => {
    const sheet = sheetsSnapshotRef.current.find(s => s.id === id)
    if (sheet?.type === "config") {
      return false // Prevent deletion
    }
    return true // Allow deletion of data sheets
  }, [])

  // Sync sheet deletion to Zustand store
  const handleAfterDeleteSheet = useCallback((id: string) => {
    removeSheet(id)
  }, [removeSheet])

  // Prevent renaming of Config sheet (uses ref to avoid sheets dependency)
  const handleBeforeUpdateSheetName = useCallback((id: string): boolean => {
    const sheet = sheetsSnapshotRef.current.find(s => s.id === id)
    if (sheet?.type === "config") {
      return false // Prevent rename
    }
    return true // Allow rename of data sheets
  }, [])

  // Sync sheet rename to Zustand store
  // Fortune-Sheet hook signature: (id: string, oldName: string, newName: string)
  const handleAfterUpdateSheetName = useCallback((id: string, oldName: string, newName: string) => {
    void oldName // Unused but required by Fortune-Sheet hook signature
    updateSheet(id, { name: newName })
  }, [updateSheet])

  // Handle new sheet added via Fortune-Sheet UI
  const handleAfterAddSheet = useCallback((sheet: Sheet) => {
    // Fortune-Sheet generates its own ID; we need to sync to our store
    if (sheet.id) {
      addSheetWithId(sheet.id, sheet.name ?? "Sheet")
    }
  }, [addSheetWithId])

  // Handle sheet data changes from Fortune-Sheet
  const handleChange = useCallback((data: Sheet[]) => {
    // Find changed sheets and update our store
    data.forEach(sheet => {
      if (!sheet.id) return

      const newData = convertFromFortuneSheetData(sheet.data)
      const oldData = previousDataRef.current.get(sheet.id) ?? []

      // Skip if data hasn't actually changed (prevents infinite loop)
      if (isDataEqual(oldData, newData)) {
        return
      }

      // Get sheet config from snapshot ref
      const sheetConfig = sheetsSnapshotRef.current.find(s => s.id === sheet.id)

      // Skip Config sheets - they should only be modified through explicit spec operations (AddSpecDialog)
      // This prevents Fortune-Sheet onChange from overwriting spec definitions
      if (sheetConfig?.type === "config") {
        return
      }

      // For data sheets, auto-generate SKUs for changed rows
      if (sheetConfig?.type === "data") {
        processAutoSKU(oldData, newData, parsedSpecs, settings)
      }

      setSheetData(sheet.id, newData)
    })
  }, [setSheetData, parsedSpecs, settings])

  // Convert sheets to Fortune-Sheet format with hooks
  const fortuneSheetData: Sheet[] = useMemo(() => {
    return sheets.map((sheet, index) => {
      const sheetData: Sheet = {
        id: sheet.id,
        name: sheet.name,
        order: index,
        status: sheet.id === activeSheetId ? 1 : 0,
        data: convertToFortuneSheetData(sheet.data),
        color: sheet.type === "config" ? "#f97316" : undefined, // Orange for Config sheet
      }

      // Add dropdowns for data sheets based on column headers
      if (sheet.type === "data" && sheet.data.length > 0) {
        const headers = extractHeaders(sheet.data)
        const rowCount = Math.max(sheet.data.length, 100) // At least 100 rows for new entries
        sheetData.dataVerification = buildDataVerification(parsedSpecs, headers, rowCount)
      }

      return sheetData
    })
  }, [sheets, activeSheetId, parsedSpecs])

  // Hooks for Fortune-Sheet events
  const hooks = useMemo(() => ({
    afterActivateSheet: handleSheetActivate,
    beforeDeleteSheet: handleBeforeDeleteSheet,
    afterDeleteSheet: handleAfterDeleteSheet,
    beforeUpdateSheetName: handleBeforeUpdateSheetName,
    afterUpdateSheetName: handleAfterUpdateSheetName,
    afterAddSheet: handleAfterAddSheet,
  }), [handleSheetActivate, handleBeforeDeleteSheet, handleAfterDeleteSheet, handleBeforeUpdateSheetName, handleAfterUpdateSheetName, handleAfterAddSheet])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full" data-testid="spreadsheet-container" data-tour="spreadsheet">
      <Workbook
        data={fortuneSheetData}
        onChange={handleChange}
        hooks={hooks}
        showSheetTabs={true}
        showToolbar={true}
        showFormulaBar={true}
        allowEdit={true}
        row={100}
        column={26}
      />
    </div>
  )
}
