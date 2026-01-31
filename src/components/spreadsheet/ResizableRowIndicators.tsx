import { useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { RowHeaderDropdownMenu } from "./RowHeaderDropdownMenu"

/** Default height for rows without explicit height */
export const DEFAULT_ROW_HEIGHT = 32
/** Minimum allowed row height */
export const MIN_ROW_HEIGHT = 24

export interface ResizableRowIndicatorsProps {
  /** Total number of rows in the spreadsheet */
  rowCount: number
  /** Row heights map (row index -> height in pixels) */
  rowHeights?: Record<number, number>
  /** Called when a row height is changed via resize handle */
  onRowResize?: (rowIndex: number, newHeight: number) => void
  /** Reference to the spreadsheet container for auto-fit measurement */
  spreadsheetRef?: React.RefObject<HTMLDivElement>
  /** Width of this indicator column (should match react-spreadsheet row indicator width) */
  width?: number
  /** Called when user selects "Insert row above" from dropdown menu */
  onInsertRowAbove?: (rowIndex: number) => void
  /** Called when user selects "Insert row below" from dropdown menu */
  onInsertRowBelow?: (rowIndex: number) => void
  /** Called when user selects "Delete row" from dropdown menu */
  onDeleteRow?: (rowIndex: number) => void
  /** Called when user selects "Pin rows above" from dropdown menu */
  onPinRowsAbove?: (rowIndex: number) => void
  /** Number of currently pinned rows */
  pinnedRows?: number
}

/**
 * Overlay component that adds resize handles to row indicators.
 * Positioned absolutely over the spreadsheet's row indicator column.
 * Each row has a 4px resize handle at the bottom edge.
 */
export function ResizableRowIndicators({
  rowCount,
  rowHeights = {},
  onRowResize,
  spreadsheetRef,
  width = 40,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onPinRowsAbove,
  pinnedRows = 0,
}: ResizableRowIndicatorsProps) {
  const [resizingRowIndex, setResizingRowIndex] = useState<number | null>(null)
  const resizeStartYRef = useRef<number>(0)
  const resizeStartHeightRef = useRef<number>(0)

  // Get the effective height for a row
  const getRowHeight = useCallback((rowIndex: number) => {
    return rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT
  }, [rowHeights])

  // Calculate cumulative offset for a row (sum of all previous row heights)
  const getRowOffset = useCallback((rowIndex: number) => {
    let offset = 0
    for (let i = 0; i < rowIndex; i++) {
      offset += getRowHeight(i)
    }
    return offset
  }, [getRowHeight])

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const currentHeight = getRowHeight(rowIndex)

    setResizingRowIndex(rowIndex)
    resizeStartYRef.current = e.clientY
    resizeStartHeightRef.current = currentHeight

    // Add mouse event listeners to document for tracking resize
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - resizeStartYRef.current
      const newHeight = Math.max(MIN_ROW_HEIGHT, resizeStartHeightRef.current + deltaY)

      // Update height while dragging (for visual feedback)
      onRowResize?.(rowIndex, newHeight)
    }

    const handleMouseUp = () => {
      setResizingRowIndex(null)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"
  }, [getRowHeight, onRowResize])

  // Double-click to auto-fit row height to content
  const handleResizeDoubleClick = useCallback((e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!spreadsheetRef?.current || !onRowResize) return

    // Find the row and measure content height of all cells
    const tbody = spreadsheetRef.current.querySelector("tbody")
    if (!tbody) return

    const rows = tbody.querySelectorAll("tr")
    // +1 accounts for the hidden column header row in react-spreadsheet tbody
    // react-spreadsheet renders a header row with column letters (A, B, C...) as the first tr in tbody
    const targetRow = rows[rowIndex + 1] as HTMLElement | null
    if (!targetRow) return

    let maxHeight = MIN_ROW_HEIGHT

    // Measure all cells in the row
    const cells = targetRow.querySelectorAll("th, td")
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement
      // Create a temporary clone to measure natural height
      const clone = cellEl.cloneNode(true) as HTMLElement
      clone.style.position = "absolute"
      clone.style.visibility = "hidden"
      clone.style.height = "auto"
      clone.style.width = `${cellEl.offsetWidth}px`
      clone.style.whiteSpace = "normal"
      document.body.appendChild(clone)

      // Add padding (8px top + 8px bottom = 16px)
      const contentHeight = clone.scrollHeight + 16
      maxHeight = Math.max(maxHeight, contentHeight)

      document.body.removeChild(clone)
    })

    // Clamp to reasonable maximum (100px)
    maxHeight = Math.min(maxHeight, 100)

    onRowResize(rowIndex, maxHeight)
  }, [spreadsheetRef, onRowResize])

  // Check if we have any interactive functionality
  const hasRowOperations = onInsertRowAbove || onInsertRowBelow || onDeleteRow
  if (rowCount === 0 || (!onRowResize && !hasRowOperations)) return null

  // Calculate total height for the overlay
  const totalHeight = getRowOffset(rowCount)

  return (
    <div
      className="absolute left-0 top-0 z-20 pointer-events-none"
      style={{ width, height: totalHeight }}
      data-testid="resizable-row-indicators"
    >
      {Array.from({ length: rowCount }).map((_, rowIndex) => {
        const rowHeight = getRowHeight(rowIndex)
        const rowOffset = getRowOffset(rowIndex)
        const isResizing = resizingRowIndex === rowIndex

        return (
          <div
            key={rowIndex}
            className="absolute w-full group"
            style={{
              top: rowOffset,
              height: rowHeight,
            }}
          >
            {/* Dropdown menu trigger area */}
            {hasRowOperations && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                data-testid={`row-dropdown-area-${rowIndex}`}
              >
                <RowHeaderDropdownMenu
                  rowIndex={rowIndex}
                  onInsertAbove={onInsertRowAbove ?? (() => {})}
                  onInsertBelow={onInsertRowBelow ?? (() => {})}
                  onDelete={onDeleteRow ?? (() => {})}
                  onPinRowsAbove={onPinRowsAbove}
                  pinnedRows={pinnedRows}
                />
              </div>
            )}

            {/* Resize handle at bottom edge */}
            {onRowResize && (
              <div
                className={cn(
                  "absolute left-0 right-0 h-1 cursor-row-resize z-30 pointer-events-auto",
                  "hover:bg-primary/50 active:bg-primary",
                  isResizing && "bg-primary"
                )}
                style={{
                  bottom: 0,
                }}
                data-testid={`row-resize-handle-${rowIndex}`}
                onMouseDown={(e) => handleResizeStart(e, rowIndex)}
                onDoubleClick={(e) => handleResizeDoubleClick(e, rowIndex)}
                aria-label={`Resize row ${rowIndex + 1}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
