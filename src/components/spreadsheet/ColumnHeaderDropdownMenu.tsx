import { useCallback, useState } from "react"
import { MoreVertical, Trash2, Plus, Pencil, Pin, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ColumnDef } from "@/types"

export interface ColumnHeaderDropdownMenuProps {
  /** The column definition for this column */
  column: ColumnDef
  /** Index of the column in the columns array */
  columnIndex: number
  /** Called when user selects "Insert column before" */
  onInsertBefore: (columnIndex: number) => void
  /** Called when user selects "Insert column after" */
  onInsertAfter: (columnIndex: number) => void
  /** Called when user selects "Delete column" */
  onDelete: (columnIndex: number, column: ColumnDef) => void
  /** Called when user selects "Rename" (only for free columns) */
  onRename?: (columnIndex: number) => void
  /** Called when user selects "Pin column" or "Unpin column" */
  onPinChange?: (columnIndex: number, pinned: boolean) => void
  /** Whether the column is currently pinned */
  isPinned?: boolean
}

/**
 * Dropdown menu that appears in column headers for column management actions.
 * Uses shadcn DropdownMenu component for consistent styling.
 *
 * Features:
 * - Show on hover (trigger icon appears on hover)
 * - Insert column before/after
 * - Delete column (hidden for SKU column)
 * - Rename (only for free columns)
 * - Pin/Unpin column
 */
export function ColumnHeaderDropdownMenu({
  column,
  columnIndex,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onRename,
  onPinChange,
  isPinned = false,
}: ColumnHeaderDropdownMenuProps) {
  const [open, setOpen] = useState(false)

  // SKU column (type === 'sku') cannot be deleted and is always pinned
  const isSKUColumn = column.type === "sku"
  const canDelete = !isSKUColumn
  const canRename = column.type === "free" && onRename
  const canTogglePin = !isSKUColumn && onPinChange

  const handleInsertBefore = useCallback(() => {
    onInsertBefore(columnIndex)
    setOpen(false)
  }, [columnIndex, onInsertBefore])

  const handleInsertAfter = useCallback(() => {
    onInsertAfter(columnIndex)
    setOpen(false)
  }, [columnIndex, onInsertAfter])

  const handleDelete = useCallback(() => {
    onDelete(columnIndex, column)
    setOpen(false)
  }, [columnIndex, column, onDelete])

  const handleRename = useCallback(() => {
    if (onRename) {
      onRename(columnIndex)
      setOpen(false)
    }
  }, [columnIndex, onRename])

  const handlePinToggle = useCallback(() => {
    if (onPinChange) {
      onPinChange(columnIndex, !isPinned)
      setOpen(false)
    }
  }, [columnIndex, isPinned, onPinChange])

  // Prevent dropdown from triggering column drag
  const preventDragStart = useCallback((e: React.MouseEvent) => {
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
          onClick={preventDragStart}
          onMouseDown={preventDragStart}
          data-testid={`column-menu-trigger-${columnIndex}`}
          aria-label={`Column options for ${column.header}`}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {canRename && (
          <>
            <DropdownMenuItem
              onClick={handleRename}
              data-testid={`column-menu-rename-${columnIndex}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onClick={handleInsertBefore}
          data-testid={`column-menu-insert-before-${columnIndex}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Insert column before
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleInsertAfter}
          data-testid={`column-menu-insert-after-${columnIndex}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Insert column after
        </DropdownMenuItem>

        {canTogglePin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handlePinToggle}
              data-testid={`column-menu-pin-${columnIndex}`}
            >
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin column
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin column
                </>
              )}
            </DropdownMenuItem>
          </>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              data-testid={`column-menu-delete-${columnIndex}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete column
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
