import { useCallback, useState } from "react"
import { MoreVertical, Trash2, Plus, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RowHeaderDropdownMenuProps {
  /** The row index (0-indexed, row 0 is header) */
  rowIndex: number
  /** Called when user selects "Insert row above" */
  onInsertAbove: (rowIndex: number) => void
  /** Called when user selects "Insert row below" */
  onInsertBelow: (rowIndex: number) => void
  /** Called when user selects "Delete row" */
  onDelete: (rowIndex: number) => void
  /** Called when user selects "Pin rows above" */
  onPinRowsAbove?: (rowIndex: number) => void
  /** Number of currently pinned rows */
  pinnedRows?: number
}

/**
 * Dropdown menu that appears in row headers for row management actions.
 * Uses shadcn DropdownMenu component for consistent styling.
 *
 * Features:
 * - Show on hover (trigger icon appears on hover)
 * - Insert row above/below
 * - Delete row (hidden for header row)
 * - Pin rows above
 */
export function RowHeaderDropdownMenu({
  rowIndex,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  onPinRowsAbove,
  pinnedRows = 0,
}: RowHeaderDropdownMenuProps) {
  const [open, setOpen] = useState(false)

  // Header row (row 0) cannot be deleted
  const isHeaderRow = rowIndex === 0
  const canDelete = !isHeaderRow

  // Check if rows up to this row are currently pinned
  const isRowPinned = pinnedRows > rowIndex

  const handleInsertAbove = useCallback(() => {
    onInsertAbove(rowIndex)
    setOpen(false)
  }, [rowIndex, onInsertAbove])

  const handleInsertBelow = useCallback(() => {
    onInsertBelow(rowIndex)
    setOpen(false)
  }, [rowIndex, onInsertBelow])

  const handleDelete = useCallback(() => {
    onDelete(rowIndex)
    setOpen(false)
  }, [rowIndex, onDelete])

  const handlePinRowsAbove = useCallback(() => {
    if (onPinRowsAbove) {
      onPinRowsAbove(rowIndex)
      setOpen(false)
    }
  }, [rowIndex, onPinRowsAbove])

  // Prevent interactions from propagating
  const preventPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex-shrink-0 p-0.5 rounded hover:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-primary",
            "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
            open && "opacity-100 bg-muted/80"
          )}
          onClick={preventPropagation}
          onMouseDown={preventPropagation}
          data-testid={`row-menu-trigger-${rowIndex}`}
          aria-label={`Row options for row ${rowIndex + 1}`}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem
          onClick={handleInsertAbove}
          data-testid={`row-menu-insert-above-${rowIndex}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Insert row above
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleInsertBelow}
          data-testid={`row-menu-insert-below-${rowIndex}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Insert row below
        </DropdownMenuItem>

        {onPinRowsAbove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handlePinRowsAbove}
              data-testid={`row-menu-pin-${rowIndex}`}
            >
              <Pin className="h-4 w-4 mr-2" />
              {isRowPinned ? "Unpin rows" : "Pin rows above"}
            </DropdownMenuItem>
          </>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              data-testid={`row-menu-delete-${rowIndex}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete row
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
