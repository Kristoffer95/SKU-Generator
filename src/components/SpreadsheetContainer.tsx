import { useMemo, useCallback, useRef, useEffect } from "react"
import { Workbook, WorkbookInstance } from "@fortune-sheet/react"
import type { Sheet, Cell, CellMatrix } from "@fortune-sheet/core"
import "@fortune-sheet/react/dist/index.css"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { useSpecificationsStore } from "@/store/specifications"
import { processAutoSKU } from "@/lib/auto-sku"
import { validateDataSheet, findDuplicateSKUs, ValidationError } from "@/lib/validation"
import { ValidationPanel } from "@/components/ValidationPanel"
import type { CellData, Specification } from "@/types"

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
 * Background color for read-only SKU column (subtle gray-blue tint)
 */
const SKU_COLUMN_BG_COLOR = "#f1f5f9"

/**
 * Background color for duplicate SKU warning (amber/yellow tint)
 */
const DUPLICATE_SKU_BG_COLOR = "#fef3c7"

/**
 * Convert our CellData[][] to Fortune-Sheet CellMatrix format
 * Applies visual styling to indicate SKU column (column 0) is read-only
 * Highlights duplicate SKU cells with a warning color
 */
function convertToFortuneSheetData(data: CellData[][], duplicateRows: Set<number>): CellMatrix {
  return data.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (!cell || (cell.v === undefined && cell.m === undefined)) {
        // For empty cells in SKU column (except header), still apply background
        if (colIndex === 0 && rowIndex > 0) {
          const bgColor = duplicateRows.has(rowIndex) ? DUPLICATE_SKU_BG_COLOR : SKU_COLUMN_BG_COLOR
          return { bg: bgColor } as Cell
        }
        return null
      }
      const result: Cell = {
        v: cell.v === null ? undefined : cell.v,
        m: cell.m ?? String(cell.v ?? ""),
        ct: cell.ct,
      }
      // Apply background color to SKU column (column 0), except header row
      if (colIndex === 0 && rowIndex > 0) {
        result.bg = duplicateRows.has(rowIndex) ? DUPLICATE_SKU_BG_COLOR : SKU_COLUMN_BG_COLOR
      }
      return result
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

/**
 * Extract header names from the first row of sheet data
 */
function extractHeaders(data: CellData[][]): string[] {
  if (data.length === 0 || !data[0]) return []
  return data[0].map(cell => String(cell?.v ?? cell?.m ?? "").trim())
}

/**
 * Build Fortune-Sheet dataVerification object for dropdown columns
 * Maps column indices to specifications based on header names
 *
 * Format: { "row_col": { type: "dropdown", value1: "comma,separated,values", ... }, ... }
 */
function buildDataVerification(
  data: CellData[][],
  specifications: Specification[],
  maxRows: number = 100
): Record<string, unknown> {
  const headers = extractHeaders(data)
  const dataVerification: Record<string, unknown> = {}

  // Build a map of spec name -> displayValues for quick lookup
  const specMap = new Map<string, string[]>()
  for (const spec of specifications) {
    specMap.set(spec.name, spec.values.map(v => v.displayValue))
  }

  // For each column, check if the header matches a specification name
  for (let col = 0; col < headers.length; col++) {
    const headerName = headers[col]
    const displayValues = specMap.get(headerName)

    if (displayValues && displayValues.length > 0) {
      // Apply dropdown to all data rows (row 1 to maxRows)
      // Row 0 is the header row
      for (let row = 1; row < maxRows; row++) {
        const key = `${row}_${col}`
        dataVerification[key] = {
          type: "dropdown",
          type2: "",
          value1: displayValues.join(","),
          value2: "",
          validity: "",
          remote: false,
          prohibitInput: false,
          hintShow: false,
          hintValue: "",
        }
      }
    }
  }

  return dataVerification
}

export function SpreadsheetContainer() {
  const { sheets, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet } = useSheetsStore()
  const specifications = useSpecificationsStore((state) => state.specifications)
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Ref for Fortune-Sheet Workbook to enable programmatic cell selection
  const workbookRef = useRef<WorkbookInstance>(null)

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

  // Handle when user clicks a sheet tab in Fortune-Sheet
  const handleSheetActivate = useCallback((sheetId: string) => {
    setActiveSheet(sheetId)
  }, [setActiveSheet])

  // Sync sheet deletion to Zustand store
  const handleAfterDeleteSheet = useCallback((id: string) => {
    removeSheet(id)
  }, [removeSheet])

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

      // Auto-generate SKUs for changed rows
      processAutoSKU(oldData, newData, specifications, settings)

      setSheetData(sheet.id, newData)
    })
  }, [setSheetData, settings, specifications])

  // Compute validation errors for the active sheet
  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  const validationErrors = useMemo((): ValidationError[] => {
    if (!activeSheet) return []
    const missingValueErrors = validateDataSheet(activeSheet.data, specifications)
    const duplicateErrors = findDuplicateSKUs(activeSheet.data)
    return [...missingValueErrors, ...duplicateErrors]
  }, [activeSheet, specifications])

  // Handle clicking a validation error to navigate to the affected cell
  const handleErrorClick = useCallback((error: ValidationError) => {
    if (!workbookRef.current) return
    // Scroll to the cell and select it
    workbookRef.current.scroll({ targetRow: error.row, targetColumn: error.column })
    // setSelection expects Range (SingleRange[]) - array of single range objects
    workbookRef.current.setSelection([{
      row: [error.row, error.row],
      column: [error.column, error.column],
    }])
  }, [])

  // Convert sheets to Fortune-Sheet format with hooks and dataVerification for dropdowns
  const fortuneSheetData: Sheet[] = useMemo(() => {
    return sheets.map((sheet, index) => {
      // Find duplicate SKUs in this sheet
      const duplicateErrors = findDuplicateSKUs(sheet.data)
      const duplicateRows = new Set(duplicateErrors.map(err => err.row))

      const sheetData: Sheet = {
        id: sheet.id,
        name: sheet.name,
        order: index,
        status: sheet.id === activeSheetId ? 1 : 0,
        data: convertToFortuneSheetData(sheet.data, duplicateRows),
        // Add dropdown validation for columns that match specification names
        dataVerification: buildDataVerification(sheet.data, specifications),
        // Configure column 0 (SKU) as read-only
        config: {
          colReadOnly: { 0: 1 },
        },
      }

      return sheetData
    })
  }, [sheets, activeSheetId, specifications])

  // Prevent edits to column 0 (SKU column) - return false to block the update
  const handleBeforeUpdateCell = useCallback((r: number, c: number) => {
    // Block edits to column 0 (SKU column), except for row 0 (header)
    if (c === 0 && r > 0) {
      return false
    }
    return true
  }, [])

  // Hooks for Fortune-Sheet events
  const hooks = useMemo(() => ({
    beforeUpdateCell: handleBeforeUpdateCell,
    afterActivateSheet: handleSheetActivate,
    afterDeleteSheet: handleAfterDeleteSheet,
    afterUpdateSheetName: handleAfterUpdateSheetName,
    afterAddSheet: handleAfterAddSheet,
  }), [handleBeforeUpdateCell, handleSheetActivate, handleAfterDeleteSheet, handleAfterUpdateSheetName, handleAfterAddSheet])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col" data-testid="spreadsheet-container" data-tour="spreadsheet">
      <div className="flex-1 min-h-0">
        <Workbook
          ref={workbookRef}
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
      <ValidationPanel
        errors={validationErrors}
        onErrorClick={handleErrorClick}
      />
    </div>
  )
}
