import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "@/types"

/**
 * Convert a 0-based column index to Excel-style column letter(s).
 * 0 -> A, 1 -> B, ... 25 -> Z, 26 -> AA, 27 -> AB, ...
 */
export function columnIndexToLetter(index: number): string {
  let result = ""
  let n = index

  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result
    n = Math.floor(n / 26) - 1
  }

  return result
}

export interface ColumnLetterHeadersProps {
  /** Column definitions for the current sheet */
  columns: ColumnDef[]
  /** Number of rows in the data (for EntireColumnsSelection) */
  rowCount: number
  /** Called when a column letter is clicked to select the column */
  onColumnSelect?: (columnIndex: number, addToSelection: boolean) => void
  /** Called when columns are selected via shift-click (range selection) */
  onColumnRangeSelect?: (startColumn: number, endColumn: number) => void
  /** Currently selected column indices */
  selectedColumns?: Set<number>
  /** Default width for columns without explicit width */
  defaultColumnWidth?: number
  /** Width of the row indicator column (leftmost column) */
  rowIndicatorWidth?: number
  /** Number of pinned columns (columns 0 through pinnedColumns-1 are pinned) */
  pinnedColumns?: number
}

/** Default width for columns without explicit width */
const DEFAULT_COLUMN_WIDTH = 120

/**
 * Excel-style column letter headers (A, B, C, D...) row.
 * Clicking on a letter selects the entire column.
 * Shift+click selects a range of columns.
 */
export function ColumnLetterHeaders({
  columns,
  onColumnSelect,
  onColumnRangeSelect,
  selectedColumns = new Set<number>(),
  defaultColumnWidth = DEFAULT_COLUMN_WIDTH,
  rowIndicatorWidth = 40,
  pinnedColumns = 1, // Default: SKU column (index 0) is pinned
}: ColumnLetterHeadersProps) {
  // Track the last clicked column for shift-click range selection
  const lastClickedColumnRef = useRef<number | null>(null)

  const handleColumnClick = useCallback(
    (event: React.MouseEvent, columnIndex: number) => {
      event.preventDefault()

      const isShiftClick = event.shiftKey
      const isModifierClick = event.metaKey || event.ctrlKey

      if (isShiftClick && lastClickedColumnRef.current !== null) {
        // Shift+click: select range from last clicked to current
        const start = Math.min(lastClickedColumnRef.current, columnIndex)
        const end = Math.max(lastClickedColumnRef.current, columnIndex)
        onColumnRangeSelect?.(start, end)
      } else {
        // Regular click or modifier click: select single column
        onColumnSelect?.(columnIndex, isModifierClick)
        lastClickedColumnRef.current = columnIndex
      }
    },
    [onColumnSelect, onColumnRangeSelect]
  )

  // Get the effective width for a column
  const getColumnWidth = useCallback(
    (column: ColumnDef) => {
      return column.width ?? defaultColumnWidth
    },
    [defaultColumnWidth]
  )

  // Calculate left offsets for sticky pinned columns
  const getLeftOffset = useCallback(
    (index: number) => {
      if (index >= pinnedColumns) return undefined
      // Start with row indicator width
      let offset = rowIndicatorWidth
      for (let i = 0; i < index; i++) {
        offset += columns[i]?.width ?? defaultColumnWidth
      }
      return offset
    },
    [columns, pinnedColumns, rowIndicatorWidth, defaultColumnWidth]
  )

  // Check if a column is pinned
  const isColumnPinned = useCallback(
    (index: number) => index < pinnedColumns,
    [pinnedColumns]
  )

  return (
    <div
      className="column-letter-headers flex items-stretch border-b bg-[var(--spreadsheet-header-bg,#f8fafc)]"
      role="row"
      aria-label="Column letters"
      data-testid="column-letter-headers"
    >
      {/* Row indicator corner spacer (matches spreadsheet row indicator width) */}
      <div
        className="flex-shrink-0 border-r border-b border-[var(--spreadsheet-cell-border,#e2e8f0)] bg-[var(--spreadsheet-header-bg,#f8fafc)]"
        style={{
          width: rowIndicatorWidth,
          minWidth: rowIndicatorWidth,
          position: "sticky",
          left: 0,
          zIndex: 3, // Above pinned columns
        }}
        aria-hidden="true"
        data-testid="column-letter-corner"
      />

      {columns.map((column, index) => {
        const letter = columnIndexToLetter(index)
        const isSelected = selectedColumns.has(index)
        const columnWidth = getColumnWidth(column)
        const isPinned = isColumnPinned(index)
        const leftOffset = getLeftOffset(index)

        return (
          <div
            key={column.id}
            data-column-letter
            data-column-index={index}
            data-testid={`column-letter-${index}`}
            onClick={(e) => handleColumnClick(e, index)}
            className={cn(
              "relative flex items-center justify-center px-1 py-1 text-xs font-medium border-r border-b border-[var(--spreadsheet-cell-border,#e2e8f0)]",
              "cursor-pointer select-none transition-colors flex-shrink-0 flex-grow-0",
              "hover:bg-muted/70",
              isSelected && "bg-primary/20 text-primary font-semibold",
              // Add background color for pinned columns to cover scrolled content
              isPinned && "bg-[var(--spreadsheet-header-bg,#f8fafc)]"
            )}
            style={{
              width: columnWidth,
              minWidth: 80,
              maxWidth: columnWidth,
              ...(isPinned ? {
                position: "sticky",
                left: leftOffset,
                zIndex: 2,
              } : {}),
            }}
            role="columnheader"
            aria-colindex={index + 1}
            aria-label={`Column ${letter}`}
            aria-selected={isSelected}
          >
            {letter}
          </div>
        )
      })}
    </div>
  )
}
