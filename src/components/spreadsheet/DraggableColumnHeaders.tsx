import { useState, useCallback, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { ColumnHeaderDropdownMenu } from "./ColumnHeaderDropdownMenu"
import type { ColumnDef } from "@/types"

/** Default width for columns without explicit width */
const DEFAULT_COLUMN_WIDTH = 120
/** Minimum allowed column width */
const MIN_COLUMN_WIDTH = 80

export interface DraggableColumnHeadersProps {
  /** Column definitions for the current sheet */
  columns: ColumnDef[]
  /** Called when a column is reordered */
  onReorder: (oldIndex: number, newIndex: number) => void
  /** Called when a column width is changed via resize handle */
  onColumnResize?: (columnIndex: number, newWidth: number) => void
  /** Called when a free column header is renamed */
  onRenameColumn?: (columnIndex: number, newHeader: string) => void
  /** Default width for columns without explicit width */
  defaultColumnWidth?: number
  /** Width of the row indicator column (leftmost column) */
  rowIndicatorWidth?: number
  /** Reference to the spreadsheet container for auto-fit measurement */
  spreadsheetRef?: React.RefObject<HTMLDivElement>
  /** Controlled state: which column is being edited (for context menu integration) */
  editingColumnIndex?: number | null
  /** Callback when editing state changes (for context menu integration) */
  onEditingColumnIndexChange?: (index: number | null) => void
  /** Called when user selects "Insert column before" from dropdown */
  onInsertBefore?: (columnIndex: number) => void
  /** Called when user selects "Insert column after" from dropdown */
  onInsertAfter?: (columnIndex: number) => void
  /** Called when user selects "Delete column" from dropdown */
  onDeleteColumn?: (columnIndex: number, column: ColumnDef) => void
  /** Called when user selects "Pin column" or "Unpin column" from dropdown */
  onPinChange?: (columnIndex: number, pinned: boolean) => void
  /** Number of pinned columns (columns 0 through pinnedColumns-1 are pinned) */
  pinnedColumns?: number
}

/**
 * Draggable header row for spreadsheet columns.
 * Renders above the spreadsheet and allows drag-reorder of columns.
 * Also supports column resizing via drag handles at the right edge.
 * SKU column (index 0) is not draggable but can be resized.
 */
export function DraggableColumnHeaders({
  columns,
  onReorder,
  onColumnResize,
  onRenameColumn,
  defaultColumnWidth = DEFAULT_COLUMN_WIDTH,
  rowIndicatorWidth = 40,
  spreadsheetRef,
  editingColumnIndex: controlledEditingIndex,
  onEditingColumnIndexChange,
  onInsertBefore,
  onInsertAfter,
  onDeleteColumn,
  onPinChange,
  pinnedColumns = 1, // Default: SKU column (index 0) is pinned
}: DraggableColumnHeadersProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragOverColumnRef = useRef<number | null>(null)

  // Resize state
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null)
  const resizeStartXRef = useRef<number>(0)
  const resizeStartWidthRef = useRef<number>(0)

  // Rename state - support both controlled and uncontrolled modes
  const [internalEditingIndex, setInternalEditingIndex] = useState<number | null>(null)
  const editingColumnIndex = controlledEditingIndex !== undefined ? controlledEditingIndex : internalEditingIndex
  const setEditingColumnIndex = useCallback((index: number | null) => {
    if (onEditingColumnIndexChange) {
      onEditingColumnIndexChange(index)
    } else {
      setInternalEditingIndex(index)
    }
  }, [onEditingColumnIndexChange])
  const [editValue, setEditValue] = useState<string>("")
  const editInputRef = useRef<HTMLInputElement>(null)

  // Check if a column can be dragged (SKU column and pinned columns cannot be moved)
  const canDragColumn = useCallback((index: number) => {
    const column = columns[index]
    if (!column) return false
    // SKU column cannot be dragged
    if (column.type === "sku") return false
    // Pinned columns cannot be dragged
    if (index < pinnedColumns) return false
    return true
  }, [columns, pinnedColumns])

  // Check if a column can receive a drop
  const canDropOnColumn = useCallback((index: number) => {
    // Cannot drop on SKU column (index 0) or on itself
    if (index === 0) return false
    if (index === draggedIndex) return false
    // Cannot drop onto a pinned column
    if (index < pinnedColumns) return false
    return true
  }, [draggedIndex, pinnedColumns])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!canDragColumn(index)) {
      e.preventDefault()
      return
    }
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))

    // Add a slight delay to allow the drag image to be captured
    requestAnimationFrame(() => {
      const target = e.target as HTMLElement
      target.style.opacity = "0.5"
    })
  }, [canDragColumn])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = "1"
    setDraggedIndex(null)
    setDropTargetIndex(null)
    dragOverColumnRef.current = null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()

    if (!canDropOnColumn(index)) {
      e.dataTransfer.dropEffect = "none"
      return
    }

    e.dataTransfer.dropEffect = "move"

    // Only update drop target if it changed (reduces re-renders)
    if (dragOverColumnRef.current !== index) {
      dragOverColumnRef.current = index
      setDropTargetIndex(index)
    }
  }, [canDropOnColumn])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the headers area entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget?.closest("[data-column-header]")) {
      setDropTargetIndex(null)
      dragOverColumnRef.current = null
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()

    const sourceIndex = draggedIndex
    if (sourceIndex === null) return
    if (!canDropOnColumn(targetIndex)) return
    if (sourceIndex === targetIndex) return

    onReorder(sourceIndex, targetIndex)

    setDraggedIndex(null)
    setDropTargetIndex(null)
    dragOverColumnRef.current = null
  }, [draggedIndex, canDropOnColumn, onReorder])

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const column = columns[columnIndex]
    const currentWidth = column?.width ?? defaultColumnWidth

    setResizingColumnIndex(columnIndex)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = currentWidth

    // Add mouse event listeners to document for tracking resize
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - resizeStartXRef.current
      const newWidth = Math.max(MIN_COLUMN_WIDTH, resizeStartWidthRef.current + deltaX)

      // Update width while dragging (for visual feedback)
      onColumnResize?.(columnIndex, newWidth)
    }

    const handleMouseUp = () => {
      setResizingColumnIndex(null)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [columns, defaultColumnWidth, onColumnResize])

  // Double-click to auto-fit column width to content
  const handleResizeDoubleClick = useCallback((e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!spreadsheetRef?.current || !onColumnResize) return

    // Find all cells in this column and measure their content width
    const tbody = spreadsheetRef.current.querySelector("tbody")
    if (!tbody) return

    const rows = tbody.querySelectorAll("tr")
    let maxWidth = MIN_COLUMN_WIDTH

    rows.forEach((row) => {
      // Get the cell at columnIndex + 1 (accounting for row indicator column)
      const cells = row.querySelectorAll("th, td")
      const cell = cells[columnIndex + 1] as HTMLElement | null

      if (cell) {
        // Create a temporary span to measure content width
        const span = document.createElement("span")
        span.style.visibility = "hidden"
        span.style.position = "absolute"
        span.style.whiteSpace = "nowrap"
        span.style.font = window.getComputedStyle(cell).font
        span.textContent = cell.textContent || ""
        document.body.appendChild(span)

        // Add some padding (16px on each side = 32px total)
        const contentWidth = span.offsetWidth + 32
        maxWidth = Math.max(maxWidth, contentWidth)

        document.body.removeChild(span)
      }
    })

    // Also measure the header text
    const column = columns[columnIndex]
    if (column) {
      const span = document.createElement("span")
      span.style.visibility = "hidden"
      span.style.position = "absolute"
      span.style.whiteSpace = "nowrap"
      span.style.fontWeight = "600"
      span.style.fontSize = "14px"
      span.textContent = column.header
      document.body.appendChild(span)

      // Add padding for header (including drag handle and type badge)
      const headerWidth = span.offsetWidth + 80
      maxWidth = Math.max(maxWidth, headerWidth)

      document.body.removeChild(span)
    }

    // Clamp to reasonable maximum
    maxWidth = Math.min(maxWidth, 400)

    onColumnResize(columnIndex, maxWidth)
  }, [columns, spreadsheetRef, onColumnResize])

  // Get the effective width for a column
  const getColumnWidth = useCallback((column: ColumnDef) => {
    return column.width ?? defaultColumnWidth
  }, [defaultColumnWidth])

  // Rename handlers for free columns
  const canRenameColumn = useCallback((index: number) => {
    const column = columns[index]
    return column && column.type === "free"
  }, [columns])

  const handleStartRename = useCallback((index: number) => {
    if (!canRenameColumn(index)) return
    const column = columns[index]
    setEditingColumnIndex(index)
    setEditValue(column.header)
    // Focus input after render
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }, [columns, canRenameColumn, setEditingColumnIndex])

  // Effect to handle externally-triggered editing (from context menu)
  const prevControlledEditingIndexRef = useRef<number | null>(null)
  useEffect(() => {
    // Only trigger when controlled index changes from null/different to a new value
    if (
      controlledEditingIndex !== undefined &&
      controlledEditingIndex !== null &&
      controlledEditingIndex !== prevControlledEditingIndexRef.current &&
      canRenameColumn(controlledEditingIndex)
    ) {
      const column = columns[controlledEditingIndex]
      setEditValue(column.header)
      // Focus input after render
      setTimeout(() => {
        editInputRef.current?.focus()
        editInputRef.current?.select()
      }, 0)
    }
    prevControlledEditingIndexRef.current = controlledEditingIndex ?? null
  }, [controlledEditingIndex, columns, canRenameColumn])

  const handleSaveRename = useCallback(() => {
    if (editingColumnIndex === null) return
    const trimmedValue = editValue.trim()
    if (trimmedValue && onRenameColumn) {
      onRenameColumn(editingColumnIndex, trimmedValue)
    }
    setEditingColumnIndex(null)
    setEditValue("")
  }, [editingColumnIndex, editValue, onRenameColumn, setEditingColumnIndex])

  const handleCancelRename = useCallback(() => {
    setEditingColumnIndex(null)
    setEditValue("")
  }, [setEditingColumnIndex])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveRename()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancelRename()
    }
  }, [handleSaveRename, handleCancelRename])

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
    // Don't trigger rename if clicking on resize handle area or dropdown trigger
    const target = e.target as HTMLElement
    if (target.closest("[data-testid^='resize-handle']")) return
    if (target.closest("[data-testid^='column-menu-trigger']")) return

    if (canRenameColumn(index)) {
      e.preventDefault()
      e.stopPropagation()
      handleStartRename(index)
    }
  }, [canRenameColumn, handleStartRename])

  // Handle rename from dropdown menu
  const handleDropdownRename = useCallback((columnIndex: number) => {
    if (canRenameColumn(columnIndex)) {
      handleStartRename(columnIndex)
    }
  }, [canRenameColumn, handleStartRename])

  // Check if a column is pinned (all columns 0 through pinnedColumns-1 are pinned)
  const isColumnPinned = useCallback((index: number) => {
    return index < pinnedColumns
  }, [pinnedColumns])

  // Calculate left offset for sticky pinned columns
  const getLeftOffset = useCallback((index: number) => {
    if (index >= pinnedColumns) return undefined
    // Start with row indicator width
    let offset = rowIndicatorWidth
    for (let i = 0; i < index; i++) {
      offset += columns[i]?.width ?? defaultColumnWidth
    }
    return offset
  }, [columns, pinnedColumns, rowIndicatorWidth, defaultColumnWidth])

  return (
    <div
      className="draggable-column-headers flex items-stretch border-b bg-[var(--spreadsheet-header-bg,#f8fafc)]"
      role="row"
      aria-label="Column headers"
      data-testid="draggable-column-headers"
    >
      {/* Row indicator spacer (matches spreadsheet row indicator width) */}
      <div
        className="flex-shrink-0 border-r border-[var(--spreadsheet-cell-border,#e2e8f0)] bg-[var(--spreadsheet-header-bg,#f8fafc)]"
        style={{
          width: rowIndicatorWidth,
          minWidth: rowIndicatorWidth,
          position: "sticky",
          left: 0,
          zIndex: 3, // Above pinned columns
        }}
        aria-hidden="true"
      />

      {columns.map((column, index) => {
        const isDragging = draggedIndex === index
        const isDropTarget = dropTargetIndex === index
        const isDraggable = canDragColumn(index)
        const isSKUColumn = column.type === "sku"
        const isResizing = resizingColumnIndex === index
        const isEditing = editingColumnIndex === index
        const isFreeColumn = column.type === "free"
        const columnWidth = getColumnWidth(column)
        const isPinned = isColumnPinned(index)
        const leftOffset = getLeftOffset(index)

        return (
          <div
            key={column.id}
            data-column-header
            data-column-index={index}
            data-testid={`column-header-${index}`}
            draggable={isDraggable && !isResizing && !isEditing}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDoubleClick={(e) => handleHeaderDoubleClick(e, index)}
            className={cn(
              "group relative flex items-center gap-1 px-2 py-1.5 font-semibold text-sm border-r border-[var(--spreadsheet-cell-border,#e2e8f0)]",
              "transition-colors flex-shrink-0 flex-grow-0",
              isDraggable && !isResizing && !isEditing && "cursor-grab active:cursor-grabbing",
              !isDraggable && !isResizing && !isEditing && "cursor-default",
              isFreeColumn && !isEditing && "cursor-text",
              isDragging && "opacity-50 bg-muted",
              isDropTarget && !isDragging && "bg-primary/10 border-primary",
              isDropTarget && !isDragging && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary",
              // Add background color for pinned columns to cover scrolled content
              isPinned && "bg-[var(--spreadsheet-header-bg,#f8fafc)]"
            )}
            style={{
              width: columnWidth,
              minWidth: MIN_COLUMN_WIDTH,
              maxWidth: columnWidth,
              ...(isPinned ? {
                position: "sticky",
                left: leftOffset,
                zIndex: 2,
              } : {}),
            }}
            role="columnheader"
            aria-colindex={index + 1}
          >
            {/* Drag handle - only show for non-SKU columns when not editing */}
            {isDraggable && !isEditing && (
              <span
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`drag-handle-${index}`}
                aria-label={`Drag to reorder ${column.header} column`}
              >
                <GripVertical className="h-4 w-4" />
              </span>
            )}

            {/* SKU column indicator (no drag handle) */}
            {isSKUColumn && (
              <span className="flex-shrink-0 w-4" aria-hidden="true" />
            )}

            {/* Column header text or edit input */}
            {isEditing ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleSaveRename}
                className="flex-1 min-w-0 px-1 py-0.5 text-sm font-semibold bg-background border border-primary rounded outline-none"
                data-testid={`column-header-input-${index}`}
                aria-label="Edit column name"
              />
            ) : (
              <span
                className={cn(
                  "flex-1 truncate",
                  isFreeColumn && "hover:bg-muted/50 rounded px-1 -ml-1"
                )}
                title={isFreeColumn ? `${column.header} (double-click to rename)` : column.header}
              >
                {column.header}
              </span>
            )}

            {/* Column type indicator */}
            {column.type === "spec" && (
              <span
                className="flex-shrink-0 text-xs text-muted-foreground px-1 py-0.5 bg-muted rounded"
                title="Specification column"
              >
                spec
              </span>
            )}
            {column.type === "free" && (
              <span
                className="flex-shrink-0 text-xs text-muted-foreground px-1 py-0.5 bg-muted rounded"
                title="Free-form column"
              >
                free
              </span>
            )}

            {/* Column header dropdown menu - only show when not editing */}
            {!isEditing && (onInsertBefore || onInsertAfter || onDeleteColumn) && (
              <ColumnHeaderDropdownMenu
                column={column}
                columnIndex={index}
                onInsertBefore={onInsertBefore ?? (() => {})}
                onInsertAfter={onInsertAfter ?? (() => {})}
                onDelete={onDeleteColumn ?? (() => {})}
                onRename={canRenameColumn(index) ? handleDropdownRename : undefined}
                onPinChange={onPinChange}
                isPinned={isColumnPinned(index)}
              />
            )}

            {/* Resize handle at right edge */}
            {onColumnResize && (
              <div
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
                  "hover:bg-primary/50 active:bg-primary",
                  isResizing && "bg-primary"
                )}
                data-testid={`resize-handle-${index}`}
                onMouseDown={(e) => handleResizeStart(e, index)}
                onDoubleClick={(e) => handleResizeDoubleClick(e, index)}
                aria-label={`Resize ${column.header} column`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
