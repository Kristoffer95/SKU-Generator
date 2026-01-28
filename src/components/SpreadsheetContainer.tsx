import { useMemo, useCallback, useRef, useEffect, useState } from "react"
import Spreadsheet, { Matrix, CellBase } from "react-spreadsheet"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { useSpecificationsStore } from "@/store/specifications"
import { processAutoSKU } from "@/lib/auto-sku"
import { validateDataSheet, findDuplicateSKUs, ValidationError } from "@/lib/validation"
import { ValidationPanel } from "@/components/ValidationPanel"
import { SheetTabs } from "@/components/spreadsheet/SheetTabs"
import { SpreadsheetToolbar } from "@/components/spreadsheet/SpreadsheetToolbar"
import { DropdownEditor } from "@/components/spreadsheet/DropdownEditor"
import { convertToSpreadsheetData, convertFromSpreadsheetData } from "@/lib/spreadsheet-adapter"
import type { CellData } from "@/types"
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

// History entry for undo/redo
interface HistoryEntry {
  data: CellData[][]
  sheetId: string
}

export function SpreadsheetContainer() {
  const { sheets, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet } = useSheetsStore()
  const specifications = useSpecificationsStore((state) => state.specifications)
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Undo/Redo history state
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)

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

  // Get active sheet
  const activeSheet = sheets.find((s) => s.id === activeSheetId)

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
      setHistory(prev => {
        // Truncate any redo history
        const truncated = prev.slice(0, historyIndex + 1)
        return [...truncated, { data: oldData, sheetId: activeSheetId }]
      })
      setHistoryIndex(prev => prev + 1)
    }
    isUndoRedoRef.current = false

    // Auto-generate SKUs for changed rows
    processAutoSKU(oldData, newData, specifications, settings)

    setSheetData(activeSheetId, newData)
  }, [activeSheetId, setSheetData, settings, specifications, historyIndex])

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex < 0 || !activeSheetId) return

    const entry = history[historyIndex]
    if (entry && entry.sheetId === activeSheetId) {
      isUndoRedoRef.current = true
      // Save current state for redo
      const currentData = activeSheet?.data ?? []
      setHistory(prev => {
        const newHistory = [...prev]
        newHistory[historyIndex] = { data: currentData, sheetId: activeSheetId }
        return newHistory
      })
      setSheetData(activeSheetId, entry.data)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex, activeSheetId, activeSheet?.data, setSheetData])

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !activeSheetId) return

    const nextIndex = historyIndex + 1
    const entry = history[nextIndex]
    if (entry && entry.sheetId === activeSheetId) {
      isUndoRedoRef.current = true
      setSheetData(activeSheetId, entry.data)
      setHistoryIndex(nextIndex)
    }
  }, [history, historyIndex, activeSheetId, setSheetData])

  // Add row handler
  const handleAddRow = useCallback(() => {
    if (!activeSheet) return
    const currentData = activeSheet.data
    const numCols = currentData[0]?.length ?? specifications.length + 1
    const newRow: CellData[] = Array(numCols).fill(null).map(() => ({}))
    setSheetData(activeSheet.id, [...currentData, newRow])
  }, [activeSheet, setSheetData, specifications.length])

  // Import handler (placeholder - will be fully implemented in migration-import-export)
  const handleImport = useCallback((file: File) => {
    console.log("Import file:", file.name)
    // TODO: Implement in migration-import-export task
  }, [])

  // Export handlers (placeholder - will be fully implemented in migration-import-export)
  const handleExportExcel = useCallback(() => {
    console.log("Export Excel")
    // TODO: Implement in migration-import-export task
  }, [])

  const handleExportCSV = useCallback(() => {
    console.log("Export CSV")
    // TODO: Implement in migration-import-export task
  }, [])

  // Handle clicking a validation error to navigate to the affected cell
  const handleErrorClick = useCallback((error: ValidationError) => {
    // TODO: Implement cell selection in migration-click-navigate task
    console.log("Navigate to error:", error)
  }, [])

  // Compute validation errors for the active sheet
  const validationErrors = useMemo((): ValidationError[] => {
    if (!activeSheet) return []
    const missingValueErrors = validateDataSheet(activeSheet.data, specifications)
    const duplicateErrors = findDuplicateSKUs(activeSheet.data)
    return [...missingValueErrors, ...duplicateErrors]
  }, [activeSheet, specifications])

  // Convert sheet data to react-spreadsheet format
  const spreadsheetData = useMemo(() => {
    if (!activeSheet) return []

    // Find duplicate SKUs in this sheet
    const duplicateErrors = findDuplicateSKUs(activeSheet.data)
    const duplicateRows = new Set(duplicateErrors.map(err => err.row))

    // Convert to react-spreadsheet format
    const matrix = convertToSpreadsheetData(activeSheet.data, specifications)

    // Apply duplicate highlighting
    return applyDuplicateHighlighting(matrix, duplicateRows)
  }, [activeSheet, specifications])

  // Sheets data for SheetTabs component
  const sheetTabsData = useMemo(() => {
    return sheets.map(sheet => ({
      id: sheet.id,
      name: sheet.name,
    }))
  }, [sheets])

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
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImport={handleImport}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onAddRow={handleAddRow}
      />
      <div className="flex-1 min-h-0 overflow-auto">
        <Spreadsheet
          data={spreadsheetData as Matrix<CellBase<string | number | null>>}
          onChange={handleDataChange}
          DataEditor={DropdownEditor}
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
