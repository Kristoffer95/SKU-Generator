import { useMemo, useCallback, useRef, useEffect, useState } from "react"
import Spreadsheet, { Matrix, CellBase, Selection, RangeSelection, PointRange, EntireColumnsSelection } from "react-spreadsheet"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { processAutoSKUFromColumns, processAutoSKUForAllRowsFromColumns } from "@/lib/auto-sku"
import { validateDataSheetFromColumns, findDuplicateSKUs, ValidationError } from "@/lib/validation"
import { ValidationPanel } from "@/components/ValidationPanel"
import { GroupedSheetTabs } from "@/components/spreadsheet/GroupedSheetTabs"
import { SpreadsheetToolbar } from "@/components/spreadsheet/SpreadsheetToolbar"
import { DropdownEditor } from "@/components/spreadsheet/DropdownEditor"
import { createCheckboxCellViewer } from "@/components/spreadsheet/CheckboxCell"
import { ColumnHeaderContextMenu, ContextMenuPosition } from "@/components/spreadsheet/ColumnHeaderContextMenu"
import { RowContextMenu, RowContextMenuPosition } from "@/components/spreadsheet/RowContextMenu"
import { DraggableColumnHeaders } from "@/components/spreadsheet/DraggableColumnHeaders"
import { ColumnLetterHeaders } from "@/components/spreadsheet/ColumnLetterHeaders"
import { ResizableRowIndicators, DEFAULT_ROW_HEIGHT } from "@/components/spreadsheet/ResizableRowIndicators"
import { AddColumnDialog } from "@/components/AddColumnDialog"
import { DeleteColumnConfirmDialog } from "@/components/DeleteColumnConfirmDialog"
import { DeleteRowConfirmDialog } from "@/components/DeleteRowConfirmDialog"
import { AutoPopulateDialog } from "@/components/AutoPopulateDialog"
import { convertToSpreadsheetData, convertFromSpreadsheetData } from "@/lib/spreadsheet-adapter"
import type { CellData, ColumnDef, CellTextAlign, CellStyles } from "@/types"
import type { SKUMatrix } from "@/types/spreadsheet"

/**
 * History entry for undo/redo - includes both data and columns
 * to support reverting column reorder operations
 */
interface HistoryEntry {
  data: CellData[][]
  columns: ColumnDef[]
}

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

/**
 * Extract cell coordinates from a react-spreadsheet Selection
 * Returns array of {row, column} objects for all selected cells
 * @param selection - The selection object from react-spreadsheet
 * @param rowCount - Number of rows in the data (needed for EntireColumnsSelection)
 */
function getSelectedCells(selection: Selection | undefined, rowCount: number = 0): { row: number; column: number }[] {
  if (!selection) return []

  // Check for RangeSelection - either instanceof or duck-typing for mocked objects
  // RangeSelection has a 'range' property with start and end points
  const sel = selection as unknown
  if (sel && typeof sel === "object" && "range" in sel) {
    const rangeSelection = sel as { range: { start: { row: number; column: number }; end: { row: number; column: number } } }
    const range = rangeSelection.range
    const cells: { row: number; column: number }[] = []
    const minRow = Math.min(range.start.row, range.end.row)
    const maxRow = Math.max(range.start.row, range.end.row)
    const minCol = Math.min(range.start.column, range.end.column)
    const maxCol = Math.max(range.start.column, range.end.column)

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push({ row, column: col })
      }
    }
    return cells
  }

  // For selection types with multiple ranges (like EntireRowsSelection)
  if (sel && typeof sel === "object" && "ranges" in sel) {
    const ranges = (sel as { ranges: Array<{ start: { row: number; column: number }; end: { row: number; column: number } }> }).ranges
    const cells: { row: number; column: number }[] = []
    for (const range of ranges) {
      const minRow = Math.min(range.start.row, range.end.row)
      const maxRow = Math.max(range.start.row, range.end.row)
      const minCol = Math.min(range.start.column, range.end.column)
      const maxCol = Math.max(range.start.column, range.end.column)

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          cells.push({ row, column: col })
        }
      }
    }
    return cells
  }

  // Handle EntireColumnsSelection - has start and end column indices
  // Duck-type check: has start, end properties and hasEntireColumn method
  if (sel && typeof sel === "object" && "start" in sel && "end" in sel && "hasEntireColumn" in sel) {
    const colSelection = sel as { start: number; end: number }
    const cells: { row: number; column: number }[] = []
    const minCol = Math.min(colSelection.start, colSelection.end)
    const maxCol = Math.max(colSelection.start, colSelection.end)

    for (let row = 0; row < rowCount; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push({ row, column: col })
      }
    }
    return cells
  }

  return []
}

export function SpreadsheetContainer() {
  const { sheets, groups, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet, reorderColumns, updateColumnWidth, updateRowHeight, updateFreeColumnHeader, duplicateSheet, setPinnedColumns, setPinnedRows, addGroup, updateGroup, removeGroup, moveSheetToGroup, toggleGroupCollapsed, getUngroupedSheetIds } = useSheetsStore()
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
  const rowHeights = useMemo(
    () => activeSheet?.rowHeights ?? {},
    [activeSheet?.rowHeights]
  )
  // Default pinnedColumns to 1 (SKU column) if not set
  const pinnedColumns = useMemo(
    () => activeSheet?.pinnedColumns ?? 1,
    [activeSheet?.pinnedColumns]
  )
  // Default pinnedRows to 0 (no rows pinned by default)
  const pinnedRows = useMemo(
    () => activeSheet?.pinnedRows ?? 0,
    [activeSheet?.pinnedRows]
  )
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Undo/Redo history: array of past sheet states (data + columns)
  // history[0] = oldest state, history[history.length-1] = most recent saved state
  // historyIndex points to current position in history (-1 means at latest/unsaved state)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)

  // Selection state for programmatic cell navigation
  const [selected, setSelected] = useState<Selection | undefined>(undefined)
  // Ref to preserve selection when color picker opens (dropdown can steal focus)
  const preservedSelectionRef = useRef<Selection | undefined>(undefined)
  // Ref for the spreadsheet scroll container
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null)
  // Ref to store copied cell styles for paste operation
  const copiedStylesRef = useRef<CellStyles | null>(null)

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null)
  const [contextMenuColumn, setContextMenuColumn] = useState<ColumnDef | null>(null)
  const [contextMenuColumnIndex, setContextMenuColumnIndex] = useState<number>(0)

  // Add column dialog state
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false)
  const [addColumnDefaultPosition, setAddColumnDefaultPosition] = useState<number | undefined>(undefined)

  // Delete column confirmation dialog state
  const [deleteColumnDialogOpen, setDeleteColumnDialogOpen] = useState(false)
  const [columnToDelete, setColumnToDelete] = useState<{ index: number; column: ColumnDef } | null>(null)

  // Row context menu state
  const [rowContextMenuPosition, setRowContextMenuPosition] = useState<RowContextMenuPosition | null>(null)
  const [rowContextMenuRowIndex, setRowContextMenuRowIndex] = useState<number>(0)

  // Delete row confirmation dialog state
  const [deleteRowDialogOpen, setDeleteRowDialogOpen] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<number | null>(null)

  // Auto populate dialog state
  const [autoPopulateDialogOpen, setAutoPopulateDialogOpen] = useState(false)

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

  // Handle sheet duplication
  const handleSheetDuplicate = useCallback((id: string) => {
    duplicateSheet(id)
    // Clear history for the new sheet (the duplicated sheet becomes active)
    setHistory([])
    setHistoryIndex(-1)
  }, [duplicateSheet])

  // Group management handlers
  const handleAddGroup = useCallback((name: string) => {
    addGroup(name)
  }, [addGroup])

  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
    updateGroup(groupId, { name: newName })
  }, [updateGroup])

  const handleDeleteGroup = useCallback((groupId: string, deleteSheets: boolean) => {
    removeGroup(groupId, deleteSheets)
  }, [removeGroup])

  const handleToggleGroup = useCallback((groupId: string) => {
    toggleGroupCollapsed(groupId)
  }, [toggleGroupCollapsed])

  const handleMoveSheetToGroup = useCallback((sheetId: string, groupId: string | null) => {
    moveSheetToGroup(sheetId, groupId)
  }, [moveSheetToGroup])

  const handleUpdateGroupColor = useCallback((groupId: string, color: string | undefined) => {
    updateGroup(groupId, { color })
  }, [updateGroup])

  // Get ungrouped sheet IDs - sheets and groups in deps ensure reactivity when they change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ungroupedSheetIds = useMemo(() => getUngroupedSheetIds(), [getUngroupedSheetIds, sheets, groups])

  // Handle spreadsheet data change
  const handleDataChange = useCallback((data: Matrix<CellBase<string | number | boolean | null>>) => {
    if (!activeSheetId || !activeSheet) return

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
      // - If we're at latest state (historyIndex === -1), push old state to history
      // - If we're in middle of history (after some undos), truncate redo states only
      setHistory(prev => {
        if (currentHistoryIndex === -1) {
          // At latest state - append the old state before this change
          return [...prev, { data: oldData, columns: activeSheet.columns }]
        } else {
          // In middle of history - truncate redo states only
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
  }, [activeSheetId, activeSheet, setSheetData, settings, specifications, columns])

  // Undo handler
  const handleUndo = useCallback(() => {
    if (!activeSheetId || !activeSheet) return

    // Determine which history entry to restore
    // If historyIndex is -1, we're at latest state, go to last history entry
    // Otherwise, go to previous entry
    const targetIndex = historyIndex === -1 ? history.length - 1 : historyIndex - 1

    if (targetIndex < 0 || targetIndex >= history.length) return

    const previousState = history[targetIndex]
    if (!previousState) return

    // If at latest state, save current state for potential redo
    if (historyIndex === -1) {
      const currentEntry: HistoryEntry = {
        data: activeSheet.data,
        columns: activeSheet.columns,
      }
      setHistory(prev => [...prev, currentEntry])
    }

    isUndoRedoRef.current = true
    // Restore both data and columns atomically
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheetId
          ? { ...sheet, data: previousState.data, columns: previousState.columns }
          : sheet
      )
    }))
    historyIndexRef.current = targetIndex
    setHistoryIndex(targetIndex)
    // Reset ref - in real usage, handleDataChange will reset it when onChange fires
    // but we also reset here for cases where onChange doesn't fire (e.g., tests)
    isUndoRedoRef.current = false
  }, [history, historyIndex, activeSheetId, activeSheet])

  // Redo handler
  const handleRedo = useCallback(() => {
    if (!activeSheetId || historyIndex === -1) return
    if (historyIndex >= history.length - 1) return

    const nextIndex = historyIndex + 1
    const nextState = history[nextIndex]
    if (!nextState) return

    isUndoRedoRef.current = true
    // Restore both data and columns atomically
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheetId
          ? { ...sheet, data: nextState.data, columns: nextState.columns }
          : sheet
      )
    }))

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
  }, [history, historyIndex, activeSheetId])

  // Add row handler
  const handleAddRow = useCallback(() => {
    if (!activeSheet) return
    const currentData = activeSheet.data
    const numCols = currentData[0]?.length ?? specifications.length + 1
    const newRow: CellData[] = Array(numCols).fill(null).map(() => ({}))
    setSheetData(activeSheet.id, [...currentData, newRow])
  }, [activeSheet, setSheetData, specifications.length])

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

  // Handle right-click on column headers or row indicators to show context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const cell = target.closest("td, th")
    if (!cell) return

    // Find the row and column indices
    const row = cell.closest("tr")
    if (!row) return

    const tbody = row.closest("tbody")
    if (!tbody) return

    const rowIndex = Array.from(tbody.querySelectorAll("tr")).indexOf(row)

    // Get cell index to determine if it's the row indicator (first cell) or a data cell
    const cells = Array.from(row.querySelectorAll("th, td"))
    const cellIndex = cells.indexOf(cell)

    // Check if this is a row indicator (first cell, cellIndex === 0)
    // Row indicator is the leftmost cell showing row numbers
    // Only show row context menu for data rows (rowIndex > 0), not header row
    if (cellIndex === 0 && rowIndex > 0) {
      event.preventDefault()
      setRowContextMenuPosition({ x: event.clientX, y: event.clientY })
      setRowContextMenuRowIndex(rowIndex)
      return
    }

    // Otherwise, check if this is the header row for column context menu
    if (rowIndex !== 0) return // Only show column context menu for header row

    if (cellIndex <= 0) return // Skip row indicator column (index 0)

    const columnIndex = cellIndex - 1 // Adjust for row indicator column
    if (columnIndex < 0 || columnIndex >= columns.length) return

    event.preventDefault()
    const column = columns[columnIndex]
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
    setContextMenuColumn(column)
    setContextMenuColumnIndex(columnIndex)
  }, [columns])

  // Close column context menu
  const handleContextMenuClose = useCallback(() => {
    setContextMenuPosition(null)
    setContextMenuColumn(null)
  }, [])

  // Close row context menu
  const handleRowContextMenuClose = useCallback(() => {
    setRowContextMenuPosition(null)
  }, [])

  // Handle insert column before
  const handleInsertColumnBefore = useCallback((columnIndex: number) => {
    setAddColumnDefaultPosition(columnIndex)
    setAddColumnDialogOpen(true)
  }, [])

  // Handle insert column after
  const handleInsertColumnAfter = useCallback((columnIndex: number) => {
    // Insert after = insert before the next column, or at end if last column
    const insertPosition = columnIndex + 1 < columns.length ? columnIndex + 1 : undefined
    setAddColumnDefaultPosition(insertPosition)
    setAddColumnDialogOpen(true)
  }, [columns.length])

  // Handle add column from toolbar button (inserts at end)
  const handleAddColumn = useCallback(() => {
    setAddColumnDefaultPosition(undefined) // undefined means "at end"
    setAddColumnDialogOpen(true)
  }, [])

  // Handle delete column request (opens confirmation dialog)
  const handleDeleteColumnRequest = useCallback((columnIndex: number, column: ColumnDef) => {
    setColumnToDelete({ index: columnIndex, column })
    setDeleteColumnDialogOpen(true)
  }, [])

  // Handle delete column confirmation
  const handleDeleteColumnConfirm = useCallback(() => {
    if (!activeSheet || !columnToDelete) return

    const { index: columnIndex } = columnToDelete

    // Save current state for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Remove column from columns array
    const newColumns = columns.filter((_, i) => i !== columnIndex)

    // Remove column data from all rows
    const newData = activeSheet.data.map(row => {
      const newRow = [...row]
      newRow.splice(columnIndex, 1)
      return newRow
    })

    // Update the sheet with new columns and data
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheet.id
          ? { ...sheet, columns: newColumns, data: newData }
          : sheet
      )
    }))

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        // At latest state - append the old state before this change
        return [...prev, oldEntry]
      } else {
        // In middle of history - truncate redo states only
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    // Reset to latest state
    setHistoryIndex(-1)
    historyIndexRef.current = -1

    // Clear the column to delete state
    setColumnToDelete(null)
  }, [activeSheet, columnToDelete, columns])

  // Handle delete row request (opens confirmation dialog)
  const handleDeleteRowRequest = useCallback((rowIndex: number) => {
    // rowIndex is the data array index, where 0 is header row
    // Header row (row 0) cannot be deleted - this should never be called for row 0
    if (rowIndex === 0) return
    setRowToDelete(rowIndex)
    setDeleteRowDialogOpen(true)
  }, [])

  // Handle delete row confirmation
  const handleDeleteRowConfirm = useCallback(() => {
    if (!activeSheet || rowToDelete === null || rowToDelete === 0) return

    // Save current state for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Remove the row from data
    const newData = activeSheet.data.filter((_, i) => i !== rowToDelete)

    // Update the sheet with new data
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheet.id
          ? { ...sheet, data: newData }
          : sheet
      )
    }))

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        // At latest state - append the old state before this change
        return [...prev, oldEntry]
      } else {
        // In middle of history - truncate redo states only
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    // Reset to latest state
    setHistoryIndex(-1)
    historyIndexRef.current = -1

    // Clear the row to delete state
    setRowToDelete(null)
  }, [activeSheet, rowToDelete])

  // Handle insert row above via dropdown menu
  const handleInsertRowAbove = useCallback((rowIndex: number) => {
    if (!activeSheet) return

    // Save current state for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a new empty row with the same number of columns
    const numCols = activeSheet.data[0]?.length ?? specifications.length + 1
    const newRow: CellData[] = Array(numCols).fill(null).map(() => ({}))

    // Insert the new row at the specified position
    const newData = [
      ...activeSheet.data.slice(0, rowIndex),
      newRow,
      ...activeSheet.data.slice(rowIndex),
    ]

    // Update the sheet with new data
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheet.id
          ? { ...sheet, data: newData }
          : sheet
      )
    }))

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, specifications.length])

  // Handle insert row below via dropdown menu
  const handleInsertRowBelow = useCallback((rowIndex: number) => {
    if (!activeSheet) return

    // Save current state for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a new empty row with the same number of columns
    const numCols = activeSheet.data[0]?.length ?? specifications.length + 1
    const newRow: CellData[] = Array(numCols).fill(null).map(() => ({}))

    // Insert the new row after the specified position
    const insertPosition = rowIndex + 1
    const newData = [
      ...activeSheet.data.slice(0, insertPosition),
      newRow,
      ...activeSheet.data.slice(insertPosition),
    ]

    // Update the sheet with new data
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheet.id
          ? { ...sheet, data: newData }
          : sheet
      )
    }))

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, specifications.length])

  // Handle column reorder via drag-and-drop
  const handleColumnReorder = useCallback((oldIndex: number, newIndex: number) => {
    if (!activeSheetId || !activeSheet) return

    // Track current state for undo before reordering (includes both data AND columns)
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Perform the reorder
    const success = reorderColumns(activeSheetId, oldIndex, newIndex)
    if (!success) return

    // Track history for undo/redo (same logic as handleDataChange)
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        // At latest state - append the old state before this change
        return [...prev, oldEntry]
      } else {
        // In middle of history - truncate redo states only
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    // Reset to latest state
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheetId, activeSheet, reorderColumns])

  // Handle column resize
  const handleColumnResize = useCallback((columnIndex: number, newWidth: number) => {
    if (!activeSheetId) return
    updateColumnWidth(activeSheetId, columnIndex, newWidth)
  }, [activeSheetId, updateColumnWidth])

  // Handle row resize
  const handleRowResize = useCallback((rowIndex: number, newHeight: number) => {
    if (!activeSheetId) return
    updateRowHeight(activeSheetId, rowIndex, newHeight)
  }, [activeSheetId, updateRowHeight])

  // Handle free column header rename
  const handleRenameColumn = useCallback((columnIndex: number, newHeader: string) => {
    if (!activeSheetId) return
    updateFreeColumnHeader(activeSheetId, columnIndex, newHeader)
  }, [activeSheetId, updateFreeColumnHeader])

  // Handle column pin/unpin toggle
  // When pinning column N, pins all columns 0 through N
  // When unpinning column N, unpins columns N and higher (pins 0 through N-1)
  const handlePinChange = useCallback((columnIndex: number, pinned: boolean) => {
    if (!activeSheetId) return
    if (pinned) {
      // Pin column N and all columns before it: pinnedColumns = N + 1
      setPinnedColumns(activeSheetId, columnIndex + 1)
    } else {
      // Unpin column N and all after: pinnedColumns = N
      // This means columns 0 through N-1 remain pinned
      setPinnedColumns(activeSheetId, columnIndex)
    }
  }, [activeSheetId, setPinnedColumns])

  // Handle row pin/unpin toggle via "Pin rows above" menu option
  // When clicking "Pin rows above" on row N:
  // - If rows 0 through N are already pinned, unpin all rows (pinnedRows = 0)
  // - Otherwise, pin rows 0 through N (pinnedRows = N + 1)
  const handlePinRowsAbove = useCallback((rowIndex: number) => {
    if (!activeSheetId) return
    // If rows up to this row are already pinned (pinnedRows > rowIndex), unpin all
    // Otherwise, pin rows 0 through rowIndex
    if (pinnedRows > rowIndex) {
      // Unpin all rows
      setPinnedRows(activeSheetId, 0)
    } else {
      // Pin rows 0 through rowIndex (inclusive)
      setPinnedRows(activeSheetId, rowIndex + 1)
    }
  }, [activeSheetId, pinnedRows, setPinnedRows])

  // State for programmatically triggering column rename (from context menu)
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null)

  // Handle context menu rename request
  const handleContextMenuRename = useCallback((columnIndex: number) => {
    // Context menu closes itself, set editing state to trigger inline rename
    setEditingColumnIndex(columnIndex)
  }, [])

  // Compute spec columns for auto populate functionality
  const specColumns = useMemo(() => {
    return columns
      .map((column, columnIndex) => {
        if (column.type !== 'spec' || !column.specId) return null
        const spec = specifications.find(s => s.id === column.specId)
        if (!spec) return null
        return { column, specification: spec, columnIndex }
      })
      .filter((item): item is { column: typeof columns[number]; specification: typeof specifications[number]; columnIndex: number } => item !== null)
  }, [columns, specifications])

  // Check if auto populate is available (has spec columns with values)
  const canAutoPopulate = useMemo(() => {
    return specColumns.length > 0 && specColumns.every(sc => sc.specification.values.length > 0)
  }, [specColumns])

  // Handle auto populate button click
  const handleAutoPopulateClick = useCallback(() => {
    setAutoPopulateDialogOpen(true)
  }, [])

  // Handle auto populate generation
  const handleAutoPopulateGenerate = useCallback(({ mode, rows }: { mode: 'replace' | 'append'; rows: CellData[][] }) => {
    if (!activeSheet) return

    // Save current state for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    let newData: CellData[][]

    if (mode === 'replace') {
      // Keep header row, replace all data rows
      const headerRow = activeSheet.data[0] ?? []
      newData = [headerRow, ...rows]
    } else {
      // Append rows to existing data
      newData = [...activeSheet.data, ...rows]
    }

    // Regenerate SKUs for all new rows
    processAutoSKUForAllRowsFromColumns(newData, columns, specifications, settings)

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, columns, specifications, settings, setSheetData])

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

  // Generate dynamic column width styles
  const columnWidthStyles = useMemo(() => {
    if (!columns.length) return null

    // react-spreadsheet uses table-layout: fixed with a <colgroup>
    // The first <col> is for the row indicator column, then one <col> per data column
    // With table-layout: fixed, widths on <col> elements control the entire column
    const colStyles = columns.map((col, index) => {
      const width = col.width ?? 120
      // nth-child is 1-indexed, +2 accounts for: 1-indexing and row indicator column
      return `.sku-spreadsheet .Spreadsheet__table colgroup col:nth-child(${index + 2}) { width: ${width}px; }`
    }).join("\n")

    // Also target cells directly for any edge cases where colgroup isn't sufficient
    // This targets all td/th in the column position across all rows
    const cellStyles = columns.map((col, index) => {
      const width = col.width ?? 120
      // Target both th and td at this column position (nth-child is 1-indexed, +2 for row indicator)
      return `.sku-spreadsheet .Spreadsheet__table tr > *:nth-child(${index + 2}) { width: ${width}px; min-width: ${width}px; max-width: ${width}px; }`
    }).join("\n")

    // Generate sticky positioning for pinned columns
    // Calculate cumulative left offset based on previous column widths
    // Row indicator column (40px) is always at left: 0
    const ROW_INDICATOR_WIDTH = 40
    const stickyStyles: string[] = []

    // Row indicator (th:first-child) is always sticky at left: 0
    stickyStyles.push(
      `.sku-spreadsheet .Spreadsheet__table tr > th:first-child { position: sticky; left: 0; z-index: 2; background-color: var(--spreadsheet-header-bg, #f8fafc); }`
    )

    // Calculate cumulative left offset for pinned columns
    let leftOffset = ROW_INDICATOR_WIDTH
    for (let i = 0; i < pinnedColumns; i++) {
      const width = columns[i]?.width ?? 120
      // Target all cells (th and td) in this column position
      // nth-child is 1-indexed, +2 for row indicator column
      // Add background-color with --spreadsheet-pinned-tint to prevent scrolled content showing through
      const isLastPinned = i === pinnedColumns - 1
      // Add 2px solid right border to the last pinned column to clearly separate from scrollable content
      const borderStyle = isLastPinned ? ' border-right: 2px solid var(--spreadsheet-cell-border, #e2e8f0);' : ''
      stickyStyles.push(
        `.sku-spreadsheet .Spreadsheet__table tr > *:nth-child(${i + 2}) { position: sticky; left: ${leftOffset}px; z-index: 2; background-color: var(--spreadsheet-pinned-tint, #f8fafc);${borderStyle} }`
      )
      leftOffset += width
    }

    // Combine styles with proper newline separation
    const combinedStyles = `${colStyles}\n${cellStyles}\n${stickyStyles.join("\n")}`
    return <style data-testid="column-width-styles">{combinedStyles}</style>
  }, [columns, pinnedColumns])

  // Generate dynamic row height styles and sticky row positioning for pinned rows
  const rowHeightStyles = useMemo(() => {
    const rowCount = activeSheet?.data.length ?? 0
    if (rowCount === 0) return null

    // Generate styles for all rows, using custom height or default
    const styles = Array.from({ length: rowCount }).map((_, index) => {
      const height = rowHeights[index] ?? DEFAULT_ROW_HEIGHT
      // Target rows in tbody (nth-child is 1-indexed)
      return `.sku-spreadsheet tbody tr:nth-child(${index + 1}) { height: ${height}px; min-height: ${height}px; }`
    }).join("\n")

    // Also ensure cells respect row height
    const cellStyles = Array.from({ length: rowCount }).map((_, index) => {
      const height = rowHeights[index] ?? DEFAULT_ROW_HEIGHT
      return `.sku-spreadsheet tbody tr:nth-child(${index + 1}) td, .sku-spreadsheet tbody tr:nth-child(${index + 1}) th { height: ${height}px; min-height: ${height}px; }`
    }).join("\n")

    // Generate sticky positioning for pinned rows
    // Calculate cumulative top offset based on previous row heights
    const stickyRowStyles: string[] = []

    let topOffset = 0
    for (let i = 0; i < pinnedRows; i++) {
      const height = rowHeights[i] ?? DEFAULT_ROW_HEIGHT
      // Target all cells in this row (tbody tr:nth-child is 1-indexed)
      // For pinned rows: position: sticky, top based on cumulative height of rows above
      // z-index: 3 for pinned rows (above pinned columns which are z-index: 2)
      // Add background-color with --spreadsheet-pinned-tint to prevent scrolled content showing through
      stickyRowStyles.push(
        `.sku-spreadsheet tbody tr:nth-child(${i + 1}) > * { position: sticky; top: ${topOffset}px; z-index: 3; background-color: var(--spreadsheet-pinned-tint, #f8fafc); }`
      )
      topOffset += height
    }

    // Handle intersection of pinned rows and pinned columns
    // The intersection cells need highest z-index (4) so they stay on top of both
    // This is handled by updating z-index for cells that are both in pinned rows and pinned columns
    // Pinned columns are cells at positions 1 through pinnedColumns (0 is row indicator)
    // Generate styles for cells at intersection of pinned rows and pinned columns
    for (let rowIndex = 0; rowIndex < pinnedRows; rowIndex++) {
      // Row indicator (th:first-child) in pinned rows needs highest z-index
      stickyRowStyles.push(
        `.sku-spreadsheet tbody tr:nth-child(${rowIndex + 1}) > th:first-child { z-index: 4; }`
      )
      // Pinned columns (nth-child 2 through pinnedColumns+1) in pinned rows need z-index: 4
      for (let colIndex = 0; colIndex < pinnedColumns; colIndex++) {
        stickyRowStyles.push(
          `.sku-spreadsheet tbody tr:nth-child(${rowIndex + 1}) > *:nth-child(${colIndex + 2}) { z-index: 4; }`
        )
      }
    }

    const combinedStyles = `${styles}\n${cellStyles}\n${stickyRowStyles.join("\n")}`
    return <style data-testid="row-height-styles">{combinedStyles}</style>
  }, [activeSheet?.data.length, rowHeights, pinnedRows, pinnedColumns])

  // Handle selection changes from user interaction
  const handleSelectionChange = useCallback((newSelection: Selection) => {
    setSelected(newSelection)
  }, [])

  // Handle column letter click to select entire column
  const handleColumnSelect = useCallback((columnIndex: number, _addToSelection: boolean) => {
    // Note: _addToSelection is received but not used currently - could be used for Cmd/Ctrl+click multi-column selection
    void _addToSelection // Silences TS unused variable error
    if (!activeSheet) return

    const rowCount = activeSheet.data.length
    if (rowCount === 0) return

    // Create an EntireColumnsSelection for this column
    // EntireColumnsSelection(start, end) where start and end are column indices
    const columnSelection = new EntireColumnsSelection(columnIndex, columnIndex)
    setSelected(columnSelection)
  }, [activeSheet])

  // Handle column range selection (shift+click)
  const handleColumnRangeSelect = useCallback((startColumn: number, endColumn: number) => {
    if (!activeSheet) return

    const rowCount = activeSheet.data.length
    if (rowCount === 0) return

    // Create an EntireColumnsSelection for the range
    // EntireColumnsSelection(start, end) selects all columns from start to end
    const start = Math.min(startColumn, endColumn)
    const end = Math.max(startColumn, endColumn)
    const columnSelection = new EntireColumnsSelection(start, end)
    setSelected(columnSelection)
  }, [activeSheet])

  // Compute which columns are currently selected (for highlighting column letters)
  const selectedColumnsSet = useMemo((): Set<number> => {
    if (!selected) return new Set()

    const sel = selected as unknown

    // Check for EntireColumnsSelection - has start and end properties plus hasEntireColumn method
    if (sel && typeof sel === "object" && "start" in sel && "end" in sel && "hasEntireColumn" in sel) {
      const colSelection = sel as { start: number; end: number }
      const result = new Set<number>()
      for (let col = colSelection.start; col <= colSelection.end; col++) {
        result.add(col)
      }
      return result
    }

    // For RangeSelection, check if selection spans all rows
    if (sel && typeof sel === "object" && "range" in sel && activeSheet) {
      const rangeSelection = sel as { range: { start: { row: number; column: number }; end: { row: number; column: number } } }
      const range = rangeSelection.range
      const minRow = Math.min(range.start.row, range.end.row)
      const maxRow = Math.max(range.start.row, range.end.row)
      const rowCount = activeSheet.data.length

      // Only highlight column if entire column is selected (all rows)
      if (minRow === 0 && maxRow === rowCount - 1) {
        const minCol = Math.min(range.start.column, range.end.column)
        const maxCol = Math.max(range.start.column, range.end.column)
        const result = new Set<number>()
        for (let col = minCol; col <= maxCol; col++) {
          result.add(col)
        }
        return result
      }
    }

    return new Set()
  }, [selected, activeSheet])

  // Compute selected cells from selection state
  const selectedCells = useMemo(
    () => getSelectedCells(selected, activeSheet?.data.length ?? 0),
    [selected, activeSheet?.data.length]
  )

  // Check if there are any selected cells
  const hasSelection = selectedCells.length > 0

  // Compute the current background color of selected cells
  // Returns undefined if no cells selected or mixed colors, otherwise the common color
  const selectedCellColor = useMemo(() => {
    if (!activeSheet || selectedCells.length === 0) return undefined

    const colors = new Set<string | undefined>()
    for (const { row, column } of selectedCells) {
      const cell = activeSheet.data[row]?.[column]
      colors.add(cell?.bg || undefined)
    }

    // If all cells have the same color, return that color
    if (colors.size === 1) {
      return Array.from(colors)[0]
    }

    // Mixed colors or some have no color
    return undefined
  }, [activeSheet, selectedCells])

  // Compute the current text color of selected cells
  // Returns undefined if no cells selected or mixed colors, otherwise the common color
  const selectedTextColor = useMemo(() => {
    if (!activeSheet || selectedCells.length === 0) return undefined

    const colors = new Set<string | undefined>()
    for (const { row, column } of selectedCells) {
      const cell = activeSheet.data[row]?.[column]
      colors.add(cell?.fc || undefined)
    }

    // If all cells have the same color, return that color
    if (colors.size === 1) {
      return Array.from(colors)[0]
    }

    // Mixed colors or some have no color
    return undefined
  }, [activeSheet, selectedCells])

  // Compute the current bold state of selected cells
  // Returns undefined if mixed, true if all bold, false if all not bold
  const isBold = useMemo((): boolean | undefined => {
    if (!activeSheet || selectedCells.length === 0) return undefined

    const states = new Set<boolean>()
    for (const { row, column } of selectedCells) {
      const cell = activeSheet.data[row]?.[column]
      states.add(cell?.bold === true)
    }

    // If all cells have the same state, return that state
    if (states.size === 1) {
      return Array.from(states)[0]
    }

    // Mixed states
    return undefined
  }, [activeSheet, selectedCells])

  // Compute the current italic state of selected cells
  // Returns undefined if mixed, true if all italic, false if all not italic
  const isItalic = useMemo((): boolean | undefined => {
    if (!activeSheet || selectedCells.length === 0) return undefined

    const states = new Set<boolean>()
    for (const { row, column } of selectedCells) {
      const cell = activeSheet.data[row]?.[column]
      states.add(cell?.italic === true)
    }

    // If all cells have the same state, return that state
    if (states.size === 1) {
      return Array.from(states)[0]
    }

    // Mixed states
    return undefined
  }, [activeSheet, selectedCells])

  // Compute the current text alignment of selected cells
  // Returns undefined if mixed, otherwise the common alignment
  const textAlign = useMemo((): CellTextAlign | undefined => {
    if (!activeSheet || selectedCells.length === 0) return undefined

    const alignments = new Set<CellTextAlign | undefined>()
    for (const { row, column } of selectedCells) {
      const cell = activeSheet.data[row]?.[column]
      alignments.add(cell?.align)
    }

    // If all cells have the same alignment, return it
    if (alignments.size === 1) {
      return Array.from(alignments)[0]
    }

    // Mixed alignments
    return undefined
  }, [activeSheet, selectedCells])

  // Handle cell background color change
  const handleCellColorChange = useCallback((color: string | null) => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty (dropdown stole focus)
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with new colors applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        // Check if this cell is selected
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          // Apply or remove the background color
          if (color === null) {
            // Remove background color - use rest spread to exclude bg
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { bg, ...rest } = cell || {}
            return rest
          } else {
            // Apply background color
            return { ...(cell || {}), bg: color }
          }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle color picker open state changes - preserve selection before dropdown steals focus
  const handleColorPickerOpenChange = useCallback((open: boolean) => {
    if (open) {
      // When opening, preserve the current selection in a ref
      preservedSelectionRef.current = selected
    }
  }, [selected])

  // Handle cell text color change
  const handleCellTextColorChange = useCallback((color: string | null) => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty (dropdown stole focus)
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with new colors applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        // Check if this cell is selected
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          // Apply or remove the text color
          if (color === null) {
            // Remove text color - use rest spread to exclude fc
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fc, ...rest } = cell || {}
            return rest
          } else {
            // Apply text color
            return { ...(cell || {}), fc: color }
          }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle bold formatting change
  const handleBoldChange = useCallback((bold: boolean) => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with new bold state applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          if (bold) {
            return { ...(cell || {}), bold: true }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { bold: _, ...rest } = cell || {}
            return rest
          }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle italic formatting change
  const handleItalicChange = useCallback((italic: boolean) => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with new italic state applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          if (italic) {
            return { ...(cell || {}), italic: true }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { italic: _, ...rest } = cell || {}
            return rest
          }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle text alignment change
  const handleAlignChange = useCallback((align: CellTextAlign) => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with new alignment applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          return { ...(cell || {}), align }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle copying cell styles (Option+Cmd+C / Alt+Ctrl+C)
  const handleCopyStyles = useCallback(() => {
    if (!activeSheet || selectedCells.length === 0) return

    // Copy styles from the first selected cell
    const firstCell = selectedCells[0]
    const cell = activeSheet.data[firstCell.row]?.[firstCell.column]

    // Extract only style properties (not value)
    const styles: CellStyles = {}
    if (cell?.bg) styles.bg = cell.bg
    if (cell?.fc) styles.fc = cell.fc
    if (cell?.bold) styles.bold = cell.bold
    if (cell?.italic) styles.italic = cell.italic
    if (cell?.align) styles.align = cell.align

    copiedStylesRef.current = styles
  }, [activeSheet, selectedCells])

  // Handle pasting cell styles (Option+Cmd+V / Alt+Ctrl+V)
  const handlePasteStyles = useCallback(() => {
    if (!activeSheet || selectedCells.length === 0 || !copiedStylesRef.current) return

    const styles = copiedStylesRef.current

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with styles applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        const isSelected = selectedCells.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          // Start with existing cell data (preserve value, display text, etc.)
          const newCell = { ...(cell || {}) }

          // Apply each style property, removing it if not in copied styles
          if (styles.bg !== undefined) {
            newCell.bg = styles.bg
          } else {
            delete newCell.bg
          }

          if (styles.fc !== undefined) {
            newCell.fc = styles.fc
          } else {
            delete newCell.fc
          }

          if (styles.bold !== undefined) {
            newCell.bold = styles.bold
          } else {
            delete newCell.bold
          }

          if (styles.italic !== undefined) {
            newCell.italic = styles.italic
          } else {
            delete newCell.italic
          }

          if (styles.align !== undefined) {
            newCell.align = styles.align
          } else {
            delete newCell.align
          }

          return newCell
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle select-all (Cmd+A / Ctrl+A)
  const handleSelectAll = useCallback(() => {
    if (!activeSheet) return

    const rowCount = activeSheet.data.length
    const colCount = columns.length
    if (rowCount === 0 || colCount === 0) return

    // Create a RangeSelection from (0,0) to (lastRow, lastCol)
    const startPoint = { row: 0, column: 0 }
    const endPoint = { row: rowCount - 1, column: colCount - 1 }
    const range = new PointRange(startPoint, endPoint)
    const selection = new RangeSelection(range)
    setSelected(selection)
  }, [activeSheet, columns.length])

  // Handle inserting checkboxes into selected cells
  const handleInsertCheckbox = useCallback(() => {
    if (!activeSheet) return

    // Use preserved selection if current selection is empty
    const cellsToApply = selectedCells.length > 0
      ? selectedCells
      : getSelectedCells(preservedSelectionRef.current, activeSheet.data.length)

    if (cellsToApply.length === 0) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with checkbox flag applied
    const newData = activeSheet.data.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        const isSelected = cellsToApply.some(
          (sel) => sel.row === rowIndex && sel.column === colIndex
        )

        if (isSelected) {
          // Convert cell to checkbox type
          return {
            ...(cell || {}),
            checkbox: true,
            v: false, // Default checkbox value to unchecked
          }
        }

        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, selectedCells, setSheetData])

  // Handle checkbox toggle when clicking on a checkbox cell
  const handleCheckboxToggle = useCallback((row: number, column: number, currentValue: boolean) => {
    if (!activeSheet) return

    // Track history for undo
    const oldEntry: HistoryEntry = {
      data: activeSheet.data,
      columns: activeSheet.columns,
    }
    const currentHistoryIndex = historyIndexRef.current

    // Create a deep copy of the data with the checkbox toggled
    const newData = activeSheet.data.map((rowData, rowIndex) => {
      return rowData.map((cell, colIndex) => {
        if (rowIndex === row && colIndex === column) {
          return {
            ...(cell || {}),
            v: !currentValue,
          }
        }
        return cell
      })
    })

    // Update sheet data
    setSheetData(activeSheet.id, newData)

    // Track history for undo/redo
    setHistory(prev => {
      if (currentHistoryIndex === -1) {
        return [...prev, oldEntry]
      } else {
        return prev.slice(0, currentHistoryIndex + 1)
      }
    })
    setHistoryIndex(-1)
    historyIndexRef.current = -1
  }, [activeSheet, setSheetData])

  // Create the CheckboxCellViewer component with the toggle handler
  const CheckboxCellViewer = useMemo(
    () => createCheckboxCellViewer(handleCheckboxToggle),
    [handleCheckboxToggle]
  )

  // Handle spacebar toggle for checkbox cells
  const handleSpacebarToggle = useCallback(() => {
    if (!activeSheet || selectedCells.length !== 1) return

    const { row, column } = selectedCells[0]
    const cell = activeSheet.data[row]?.[column]

    // Only toggle if cell is a checkbox type
    if (!cell?.checkbox) return

    const currentValue = cell.v === true
    handleCheckboxToggle(row, column, currentValue)
  }, [activeSheet, selectedCells, handleCheckboxToggle])

  // Handle keyboard shortcuts for copy/paste styles, undo/redo, select-all, and spacebar toggle
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Use event.code instead of event.key to detect the physical key pressed
    // On macOS, Option+C produces 'ç' for event.key, but event.code is always 'KeyC'
    // This ensures the shortcut works correctly across all platforms

    // Check for Spacebar - toggle checkbox cell
    // Only trigger when no modifier keys are pressed
    if (event.code === "Space" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      // Check if we have exactly one cell selected that is a checkbox
      if (activeSheet && selectedCells.length === 1) {
        const { row, column } = selectedCells[0]
        const cell = activeSheet.data[row]?.[column]
        if (cell?.checkbox) {
          event.preventDefault() // Prevent page scroll
          handleSpacebarToggle()
          return
        }
      }
    }

    // Check for Option+Cmd+C (Mac) or Alt+Ctrl+C (Windows/Linux) - Copy styles
    if (event.code === "KeyC" && event.altKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleCopyStyles()
      return
    }

    // Check for Option+Cmd+V (Mac) or Alt+Ctrl+V (Windows/Linux) - Paste styles
    if (event.code === "KeyV" && event.altKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handlePasteStyles()
      return
    }

    // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) - Undo
    // Only trigger when not combined with Shift (Shift+Cmd+Z is for redo)
    if (event.code === "KeyZ" && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      handleUndo()
      return
    }

    // Check for Shift+Cmd+Z (Mac) or Shift+Ctrl+Z (Windows/Linux) - Redo
    if (event.code === "KeyZ" && (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey) {
      event.preventDefault()
      handleRedo()
      return
    }

    // Check for Cmd+A (Mac) or Ctrl+A (Windows/Linux) - Select all
    // Do not trigger when combined with Alt/Option to allow other shortcuts
    if (event.code === "KeyA" && (event.metaKey || event.ctrlKey) && !event.altKey) {
      event.preventDefault()
      handleSelectAll()
      return
    }
  }, [handleCopyStyles, handlePasteStyles, handleUndo, handleRedo, handleSelectAll, activeSheet, selectedCells, handleSpacebarToggle])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col" data-testid="spreadsheet-container" data-tour="spreadsheet">
      {columnWidthStyles}
      {rowHeightStyles}
      <SpreadsheetToolbar
        canUndo={historyIndex === -1 ? history.length > 0 : historyIndex > 0}
        canRedo={historyIndex !== -1 && historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddRow={handleAddRow}
        onAddColumn={handleAddColumn}
        onAutoPopulate={handleAutoPopulateClick}
        canAutoPopulate={canAutoPopulate}
        hasSelection={hasSelection}
        selectedCellColor={selectedCellColor}
        onCellColorChange={handleCellColorChange}
        onCellColorPickerOpenChange={handleColorPickerOpenChange}
        selectedTextColor={selectedTextColor}
        onTextColorChange={handleCellTextColorChange}
        onTextColorPickerOpenChange={handleColorPickerOpenChange}
        isBold={isBold}
        onBoldChange={handleBoldChange}
        isItalic={isItalic}
        onItalicChange={handleItalicChange}
        textAlign={textAlign}
        onAlignChange={handleAlignChange}
        onInsertCheckbox={handleInsertCheckbox}
      />
      <ColumnLetterHeaders
        columns={columns}
        rowCount={activeSheet?.data.length ?? 0}
        onColumnSelect={handleColumnSelect}
        onColumnRangeSelect={handleColumnRangeSelect}
        selectedColumns={selectedColumnsSet}
        pinnedColumns={pinnedColumns}
      />
      <DraggableColumnHeaders
        columns={columns}
        onReorder={handleColumnReorder}
        onColumnResize={handleColumnResize}
        onRenameColumn={handleRenameColumn}
        spreadsheetRef={spreadsheetContainerRef}
        editingColumnIndex={editingColumnIndex}
        onEditingColumnIndexChange={setEditingColumnIndex}
        onInsertBefore={handleInsertColumnBefore}
        onInsertAfter={handleInsertColumnAfter}
        onDeleteColumn={handleDeleteColumnRequest}
        onPinChange={handlePinChange}
        pinnedColumns={pinnedColumns}
      />
      <div
        ref={spreadsheetContainerRef}
        className="flex-1 min-h-0 overflow-auto sku-spreadsheet with-draggable-headers relative"
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <ResizableRowIndicators
          rowCount={activeSheet?.data.length ?? 0}
          rowHeights={rowHeights}
          onRowResize={handleRowResize}
          spreadsheetRef={spreadsheetContainerRef}
          onInsertRowAbove={handleInsertRowAbove}
          onInsertRowBelow={handleInsertRowBelow}
          onDeleteRow={handleDeleteRowRequest}
          onPinRowsAbove={handlePinRowsAbove}
          pinnedRows={pinnedRows}
        />
        <Spreadsheet
          data={spreadsheetData as Matrix<CellBase<string | number | boolean | null>>}
          onChange={handleDataChange}
          DataEditor={DropdownEditor}
          DataViewer={CheckboxCellViewer}
          selected={selected}
          onSelect={handleSelectionChange}
        />
      </div>
      <GroupedSheetTabs
        sheets={sheetTabsData}
        groups={groups}
        activeSheetId={activeSheetId}
        onActivate={handleSheetActivate}
        onRename={handleSheetRename}
        onDelete={handleSheetDelete}
        onDuplicate={handleSheetDuplicate}
        onAdd={handleSheetAdd}
        onAddGroup={handleAddGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onToggleGroup={handleToggleGroup}
        onMoveSheetToGroup={handleMoveSheetToGroup}
        onUpdateGroupColor={handleUpdateGroupColor}
        ungroupedSheetIds={ungroupedSheetIds}
      />
      <ValidationPanel
        errors={validationErrors}
        onErrorClick={handleErrorClick}
      />

      {/* Column header context menu */}
      <ColumnHeaderContextMenu
        position={contextMenuPosition}
        column={contextMenuColumn}
        columnIndex={contextMenuColumnIndex}
        onClose={handleContextMenuClose}
        onInsertBefore={handleInsertColumnBefore}
        onInsertAfter={handleInsertColumnAfter}
        onDelete={handleDeleteColumnRequest}
        onRename={handleContextMenuRename}
      />

      {/* Add column dialog */}
      <AddColumnDialog
        open={addColumnDialogOpen}
        onOpenChange={setAddColumnDialogOpen}
        defaultPosition={addColumnDefaultPosition}
      />

      {/* Delete column confirmation dialog */}
      <DeleteColumnConfirmDialog
        open={deleteColumnDialogOpen}
        onOpenChange={setDeleteColumnDialogOpen}
        column={columnToDelete?.column ?? null}
        onConfirm={handleDeleteColumnConfirm}
      />

      {/* Row context menu */}
      <RowContextMenu
        position={rowContextMenuPosition}
        rowIndex={rowContextMenuRowIndex}
        onClose={handleRowContextMenuClose}
        onDelete={handleDeleteRowRequest}
      />

      {/* Delete row confirmation dialog */}
      <DeleteRowConfirmDialog
        open={deleteRowDialogOpen}
        onOpenChange={setDeleteRowDialogOpen}
        rowIndex={rowToDelete}
        onConfirm={handleDeleteRowConfirm}
      />

      {/* Auto populate dialog */}
      <AutoPopulateDialog
        open={autoPopulateDialogOpen}
        onOpenChange={setAutoPopulateDialogOpen}
        specColumns={specColumns}
        allColumns={columns}
        onGenerate={handleAutoPopulateGenerate}
      />
    </div>
  )
}
