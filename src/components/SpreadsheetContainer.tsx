import { useMemo, useCallback } from "react"
import { Workbook } from "@fortune-sheet/react"
import type { Sheet, Cell, CellMatrix } from "@fortune-sheet/core"
import "@fortune-sheet/react/dist/index.css"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { parseConfigSheet, getSpecValues } from "@/lib/config-sheet"
import { processAutoSKU } from "@/lib/auto-sku"
import type { CellData, ParsedSpec, SheetConfig } from "@/types"

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
  columnHeaders.forEach((header, colIndex) => {
    if (!header) return

    const specValues = getSpecValues(parsedSpecs, header)
    if (specValues.length === 0) return

    // Create dropdown options (comma-separated labels)
    const options = specValues.map(v => v.label).join(",")

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
 * Excludes last column (SKU column)
 */
function extractHeaders(data: CellData[][]): string[] {
  if (!data || data.length === 0 || !data[0]) return []

  const firstRow = data[0]
  // Exclude last column (SKU column)
  const headers: string[] = []
  for (let i = 0; i < firstRow.length - 1; i++) {
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
  const { sheets, activeSheetId, setActiveSheet, setSheetData, getConfigSheet } = useSheetsStore()
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Parse Config sheet for spec definitions
  const configSheet = getConfigSheet()
  const parsedSpecs = useMemo(() => {
    if (!configSheet) return []
    return parseConfigSheet(configSheet.data)
  }, [configSheet])

  // Keep a reference to previous sheet data for change detection
  const sheetsRef = useMemo(() => {
    const map = new Map<string, CellData[][]>()
    sheets.forEach(sheet => {
      map.set(sheet.id, sheet.data)
    })
    return map
  }, [sheets])

  // Handle when user clicks a sheet tab in Fortune-Sheet
  const handleSheetActivate = useCallback((sheetId: string) => {
    setActiveSheet(sheetId)
  }, [setActiveSheet])

  // Handle sheet data changes from Fortune-Sheet
  const handleChange = useCallback((data: Sheet[]) => {
    // Find the original sheets from store for type information
    const sheetMap = new Map<string, SheetConfig>()
    sheets.forEach(s => sheetMap.set(s.id, s))

    // Find changed sheets and update our store
    data.forEach(sheet => {
      if (!sheet.id) return

      const sheetConfig = sheetMap.get(sheet.id)
      const newData = convertFromFortuneSheetData(sheet.data)

      // For data sheets, auto-generate SKUs for changed rows
      if (sheetConfig?.type === "data") {
        const oldData = sheetsRef.get(sheet.id) ?? []
        processAutoSKU(oldData, newData, parsedSpecs, settings)
      }

      setSheetData(sheet.id, newData)
    })
  }, [setSheetData, sheets, sheetsRef, parsedSpecs, settings])

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
  }), [handleSheetActivate])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full" data-testid="spreadsheet-container">
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
