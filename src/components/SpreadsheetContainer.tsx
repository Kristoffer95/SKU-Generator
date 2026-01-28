import { useMemo, useCallback, useRef, useEffect, useState } from "react"
import Spreadsheet, { Matrix, CellBase, Selection, RangeSelection, PointRange } from "react-spreadsheet"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { processAutoSKUFromColumns, processAutoSKUForAllRowsFromColumns } from "@/lib/auto-sku"
import { validateDataSheetFromColumns, findDuplicateSKUs, ValidationError } from "@/lib/validation"
import { ValidationPanel } from "@/components/ValidationPanel"
import { SheetTabs } from "@/components/spreadsheet/SheetTabs"
import { SpreadsheetToolbar } from "@/components/spreadsheet/SpreadsheetToolbar"
import { DropdownEditor } from "@/components/spreadsheet/DropdownEditor"
import { convertToSpreadsheetData, convertFromSpreadsheetData } from "@/lib/spreadsheet-adapter"
import { importFromExcel, importFromCSV, exportToExcel, exportToCSV } from "@/lib/import-export"
import type { CellData, ColumnDef } from "@/types"
import type { SKUMatrix } from "@/types/spreadsheet"

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
 * Apply duplicate highlighting to SKU cells
 */
function applyDuplicateHighlighting(matrix: SKUMatrix, duplicateRows: Set<number>): SKUMatrix {
  return matrix.map((row, rowIndex) => {
    if (!row) return row
    return row.map((cell, colIndex) => {
      // Only apply to SKU column (col 0) for data rows (row > 0)
      if (colIndex === 0 && rowIndex > 0) {
        const bgColor = duplicateRows.has(rowIndex) ? DUPLICATE_SKU_BG_COLOR : SKU_COLUMN_BG_COLOR
        return {
          ...cell,
          value: cell?.value ?? null,
          readOnly: true,
          className: `bg-[${bgColor}]`,
        }
      }
      return cell
    })
  })
}

const EMPTY_SPECIFICATIONS: never[] = []
const EMPTY_COLUMNS: ColumnDef[] = []

export function SpreadsheetContainer() {
  const { sheets, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet } = useSheetsStore()
  // Get active sheet and use its local specifications and columns
  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  const specifications = useMemo(
    () => activeSheet?.specifications ?? EMPTY_SPECIFICATIONS,
    [activeSheet?.specifications]
  )
  const columns = useMemo(
    () => activeSheet?.columns ?? EMPTY_COLUMNS,
    [activeSheet?.columns]
  )
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Undo/Redo history: array of past data states
  // history[0] = oldest state, history[history.length-1] = most recent saved state
  // historyIndex points to current position in history (-1 means at latest/unsaved state)
  const [history, setHistory] = useState<CellData[][][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)

  // Selection state for programmatic cell navigation
  const [selected, setSelected] = useState<Selection | undefined>(undefined)
  // Ref for the spreadsheet scroll container
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync with state
  useEffect(() => {
    historyIndexRef.current = historyIndex
  }, [historyIndex])

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

  // Handle sheet tab switching
  const handleSheetActivate = useCallback((sheetId: string) => {
    // Clear history when switching sheets
    setHistory([])
    setHistoryIndex(-1)
    setActiveSheet(sheetId)
  }, [setActiveSheet])

  // Handle sheet deletion
  const handleSheetDelete = useCallback((id: string) => {
    removeSheet(id)
  }, [removeSheet])

  // Handle sheet rename
  const handleSheetRename = useCallback((id: string, newName: string) => {
    updateSheet(id, { name: newName })
  }, [updateSheet])

  // Handle new sheet
  const handleSheetAdd = useCallback(() => {
    const newId = `sheet-${Date.now()}`
    addSheetWithId(newId, `Sheet ${sheets.length + 1}`)
  }, [addSheetWithId, sheets.length])

  // Handle spreadsheet data change
  const handleDataChange = useCallback((data: Matrix<CellBase<string | number | null>>) => {
    if (!activeSheetId) return

    // Convert react-spreadsheet format back to our CellData format
    const newData = convertFromSpreadsheetData(data as SKUMatrix)
    const oldData = previousDataRef.current.get(activeSheetId) ?? []

    // Skip if data hasn't actually changed (prevents infinite loop)
    if (isDataEqual(oldData, newData)) {
      return
    }

    // Track history for undo/redo (unless this change is from undo/redo)
    if (!isUndoRedoRef.current) {
      const currentHistoryIndex = historyIndexRef.current
      // When making a new edit:
      // - If we're at latest state (historyIndex === -1), just push oldData to history
      // - If we're in middle of history (after some undos), truncate redo states only
      //   (don't push oldData since current state is already in history at historyIndex)
      setHistory(prev => {
        if (currentHistoryIndex === -1) {
          // At latest state - append the old state before this change
          return [...prev, oldData]
        } else {
          // In middle of history - truncate redo states only
          // The current state is already at history[currentHistoryIndex]
          return prev.slice(0, currentHistoryIndex + 1)
        }
      })
      // Reset to latest state
      setHistoryIndex(-1)
      historyIndexRef.current = -1
    }
    isUndoRedoRef.current = false

    // Auto-generate SKUs for changed rows (only spec columns contribute)
    processAutoSKUFromColumns(oldData, newData, columns, specifications, settings)

    setSheetData(activeSheetId, newData)
  }, [activeSheetId, setSheetData, settings, specifications, columns])

  // Undo handler
  const handleUndo = useCallback(() => {
    if (!activeSheetId) return

    // Determine which history entry to restore
    // If historyIndex is -1, we're at latest state, go to last history entry
    // Otherwise, go to previous entry
    const targetIndex = historyIndex === -1 ? history.length - 1 : historyIndex - 1

    if (targetIndex < 0 || targetIndex >= history.length) return

    const previousState = history[targetIndex]
    if (!previousState) return

    // If at latest state, save current state for potential redo
    if (historyIndex === -1) {
      const currentData = activeSheet?.data ?? []
      setHistory(prev => [...prev, currentData])
    }

    isUndoRedoRef.current = true
    setSheetData(activeSheetId, previousState)
    historyIndexRef.current = targetIndex
    setHistoryIndex(targetIndex)
    // Reset ref - in real usage, handleDataChange will reset it when onChange fires
    // but we also reset here for cases where onChange doesn't fire (e.g., tests)
    isUndoRedoRef.current = false
  }, [history, historyIndex, activeSheetId, activeSheet?.data, setSheetData])

  // Redo handler
  const handleRedo = useCallback(() => {
    if (!activeSheetId || historyIndex === -1) return
    if (historyIndex >= history.length - 1) return

    const nextIndex = historyIndex + 1
    const nextState = history[nextIndex]
    if (!nextState) return

    isUndoRedoRef.current = true
    setSheetData(activeSheetId, nextState)

    // If we're moving to the last history entry, set index to -1 (latest state)
    if (nextIndex === history.length - 1) {
      setHistoryIndex(-1)
      historyIndexRef.current = -1
    } else {
      setHistoryIndex(nextIndex)
      historyIndexRef.current = nextIndex
    }
    // Reset ref - see comment in handleUndo
    isUndoRedoRef.current = false
  }, [history, historyIndex, activeSheetId, setSheetData])

  // Add row handler
  const handleAddRow = useCallback(() => {
    if (!activeSheet) return
    const currentData = activeSheet.data
    const numCols = currentData[0]?.length ?? specifications.length + 1
    const newRow: CellData[] = Array(numCols).fill(null).map(() => ({}))
    setSheetData(activeSheet.id, [...currentData, newRow])
  }, [activeSheet, setSheetData, specifications.length])

  // Import handler - loads Excel/CSV files into active sheet
  const handleImport = useCallback(async (file: File) => {
    if (!activeSheetId) return

    const isCSV = file.name.toLowerCase().endsWith('.csv')

    try {
      let importedData: CellData[][]

      if (isCSV) {
        // Import CSV directly into active sheet
        importedData = await importFromCSV(file)
      } else {
        // Import Excel - use first data sheet (or first sheet if no data sheets)
        const importedSheets = await importFromExcel(file)
        const dataSheet = importedSheets.find(s => s.type === 'data') || importedSheets[0]
        if (!dataSheet) {
          console.error("No sheets found in imported file")
          return
        }
        importedData = dataSheet.data
      }

      // Regenerate SKUs for all rows (only spec columns contribute)
      processAutoSKUForAllRowsFromColumns(importedData, columns, specifications, settings)

      // Update the active sheet with imported data
      setSheetData(activeSheetId, importedData)

      // Clear history after import
      setHistory([])
      setHistoryIndex(-1)
    } catch (error) {
      console.error("Import failed:", error)
    }
  }, [activeSheetId, setSheetData, columns, specifications, settings])

  // Export all sheets to Excel
  const handleExportExcel = useCallback(() => {
    exportToExcel(sheets, 'sku-data.xlsx')
  }, [sheets])

  // Export current sheet to CSV
  const handleExportCSV = useCallback(() => {
    if (!activeSheet) return
    exportToCSV(activeSheet, `${activeSheet.name}.csv`)
  }, [activeSheet])

  // Handle clicking a validation error to navigate to the affected cell
  const handleErrorClick = useCallback((error: ValidationError) => {
    // Create a point for the error cell
    const point = { row: error.row, column: error.column }
    // Create a single-cell selection using PointRange and RangeSelection
    const range = new PointRange(point, point)
    const selection = new RangeSelection(range)
    setSelected(selection)

    // Scroll to the cell - find the cell element and scroll it into view
    // Use setTimeout to allow React to update the selection state first
    setTimeout(() => {
      const container = spreadsheetContainerRef.current
      if (container) {
        // Find the cell by navigating the table structure
        // The table has row indicators (first column) and a header row
        // So the actual cell is at: tbody > tr[rowIndex+1] > td[columnIndex+1]
        // (+1 for header row, +1 for row indicator column)
        const tbody = container.querySelector("tbody")
        if (tbody) {
          // Get all rows (including header row which is in thead, so tbody rows start at data row 0)
          const rows = tbody.querySelectorAll("tr")
          // Row index in tbody corresponds to error.row (0-indexed)
          const targetRow = rows[error.row]
          if (targetRow) {
            // Get all cells in the row (th for row indicator, td for data cells)
            const cells = targetRow.querySelectorAll("th, td")
            // Column 0 is the row indicator, so actual data column is at error.column + 1
            const cellElement = cells[error.column + 1] as HTMLElement | null
            if (cellElement) {
              cellElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
            }
          }
        }
      }
    }, 0)
  }, [])

  // Compute validation errors for the active sheet
  const validationErrors = useMemo((): ValidationError[] => {
    if (!activeSheet) return []
    // Use column-based validation (only validates spec columns, not free columns)
    const missingValueErrors = validateDataSheetFromColumns(activeSheet.data, columns, specifications)
    const duplicateErrors = findDuplicateSKUs(activeSheet.data)
    return [...missingValueErrors, ...duplicateErrors]
  }, [activeSheet, columns, specifications])

  // Convert sheet data to react-spreadsheet format
  const spreadsheetData = useMemo(() => {
    if (!activeSheet) return []

    // Find duplicate SKUs in this sheet
    const duplicateErrors = findDuplicateSKUs(activeSheet.data)
    const duplicateRows = new Set(duplicateErrors.map(err => err.row))

    // Convert to react-spreadsheet format using columns for type detection
    const matrix = convertToSpreadsheetData(activeSheet.data, columns, specifications)

    // Apply duplicate highlighting
    return applyDuplicateHighlighting(matrix, duplicateRows)
  }, [activeSheet, columns, specifications])

  // Sheets data for SheetTabs component
  const sheetTabsData = useMemo(() => {
    return sheets.map(sheet => ({
      id: sheet.id,
      name: sheet.name,
    }))
  }, [sheets])

  // Handle selection changes from user interaction
  const handleSelectionChange = useCallback((newSelection: Selection) => {
    setSelected(newSelection)
  }, [])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col" data-testid="spreadsheet-container" data-tour="spreadsheet">
      <SpreadsheetToolbar
        canUndo={historyIndex === -1 ? history.length > 0 : historyIndex > 0}
        canRedo={historyIndex !== -1 && historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImport={handleImport}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onAddRow={handleAddRow}
      />
      <div ref={spreadsheetContainerRef} className="flex-1 min-h-0 overflow-auto sku-spreadsheet">
        <Spreadsheet
          data={spreadsheetData as Matrix<CellBase<string | number | null>>}
          onChange={handleDataChange}
          DataEditor={DropdownEditor}
          selected={selected}
          onSelect={handleSelectionChange}
        />
      </div>
      <SheetTabs
        sheets={sheetTabsData}
        activeSheetId={activeSheetId}
        onActivate={handleSheetActivate}
        onRename={handleSheetRename}
        onDelete={handleSheetDelete}
        onAdd={handleSheetAdd}
      />
      <ValidationPanel
        errors={validationErrors}
        onErrorClick={handleErrorClick}
      />
    </div>
  )
}
