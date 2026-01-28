import { useState, useCallback, useRef } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "@/types"

export interface DraggableColumnHeadersProps {
  /** Column definitions for the current sheet */
  columns: ColumnDef[]
  /** Called when a column is reordered */
  onReorder: (oldIndex: number, newIndex: number) => void
  /** Width of each column header cell (should match spreadsheet column width) */
  columnWidth?: number
  /** Width of the row indicator column (leftmost column) */
  rowIndicatorWidth?: number
}

/**
 * Draggable header row for spreadsheet columns.
 * Renders above the spreadsheet and allows drag-reorder of columns.
 * SKU column (index 0) is not draggable.
 */
export function DraggableColumnHeaders({
  columns,
  onReorder,
  columnWidth = 120,
  rowIndicatorWidth = 40,
}: DraggableColumnHeadersProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragOverColumnRef = useRef<number | null>(null)

  // Check if a column can be dragged (SKU column at index 0 cannot be moved)
  const canDragColumn = useCallback((index: number) => {
    const column = columns[index]
    return column && column.type !== "sku"
  }, [columns])

  // Check if a column can receive a drop
  const canDropOnColumn = useCallback((index: number) => {
    // Cannot drop on SKU column (index 0) or on itself
    if (index === 0) return false
    if (index === draggedIndex) return false
    return true
  }, [draggedIndex])

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

  return (
    <div
      className="draggable-column-headers flex items-stretch border-b bg-[var(--spreadsheet-header-bg,#f8fafc)]"
      role="row"
      aria-label="Column headers"
      data-testid="draggable-column-headers"
    >
      {/* Row indicator spacer (matches spreadsheet row indicator width) */}
      <div
        className="flex-shrink-0 border-r border-[var(--spreadsheet-cell-border,#e2e8f0)]"
        style={{ width: rowIndicatorWidth, minWidth: rowIndicatorWidth }}
        aria-hidden="true"
      />

      {columns.map((column, index) => {
        const isDragging = draggedIndex === index
        const isDropTarget = dropTargetIndex === index
        const isDraggable = canDragColumn(index)
        const isSKUColumn = column.type === "sku"

        return (
          <div
            key={column.id}
            data-column-header
            data-column-index={index}
            data-testid={`column-header-${index}`}
            draggable={isDraggable}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={cn(
              "relative flex items-center gap-1 px-2 py-1.5 font-semibold text-sm border-r border-[var(--spreadsheet-cell-border,#e2e8f0)]",
              "transition-colors",
              isDraggable && "cursor-grab active:cursor-grabbing",
              !isDraggable && "cursor-default",
              isDragging && "opacity-50 bg-muted",
              isDropTarget && !isDragging && "bg-primary/10 border-primary",
              isDropTarget && !isDragging && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
            )}
            style={{
              width: columnWidth,
              minWidth: 80,
              maxWidth: 300,
            }}
            role="columnheader"
            aria-colindex={index + 1}
          >
            {/* Drag handle - only show for non-SKU columns */}
            {isDraggable && (
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

            {/* Column header text */}
            <span className="flex-1 truncate" title={column.header}>
              {column.header}
            </span>

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
          </div>
        )
      })}
    </div>
  )
}
