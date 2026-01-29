import { useEffect, useRef, useCallback } from "react"
import { Trash2, Plus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "@/types"

export interface ContextMenuPosition {
  x: number
  y: number
}

export interface ColumnHeaderContextMenuProps {
  /** Position to render the menu at */
  position: ContextMenuPosition | null
  /** The column definition for the right-clicked column */
  column: ColumnDef | null
  /** Index of the column in the columns array */
  columnIndex: number
  /** Called when menu should close */
  onClose: () => void
  /** Called when user selects "Insert column before" */
  onInsertBefore: (columnIndex: number) => void
  /** Called when user selects "Insert column after" */
  onInsertAfter: (columnIndex: number) => void
  /** Called when user selects "Delete column" */
  onDelete: (columnIndex: number, column: ColumnDef) => void
  /** Called when user selects "Rename" (only for free columns) */
  onRename?: (columnIndex: number) => void
}

export function ColumnHeaderContextMenu({
  position,
  column,
  columnIndex,
  onClose,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onRename,
}: ColumnHeaderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!position) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    // Delay adding listeners to avoid immediate close from the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside)
      document.addEventListener("contextmenu", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("contextmenu", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [position, onClose])

  const handleInsertBefore = useCallback(() => {
    onInsertBefore(columnIndex)
    onClose()
  }, [columnIndex, onInsertBefore, onClose])

  const handleInsertAfter = useCallback(() => {
    onInsertAfter(columnIndex)
    onClose()
  }, [columnIndex, onInsertAfter, onClose])

  const handleDelete = useCallback(() => {
    if (column) {
      onDelete(columnIndex, column)
      onClose()
    }
  }, [columnIndex, column, onDelete, onClose])

  const handleRename = useCallback(() => {
    if (onRename) {
      onRename(columnIndex)
      onClose()
    }
  }, [columnIndex, onRename, onClose])

  if (!position || !column) return null

  // SKU column (type === 'sku') cannot be deleted
  const canDelete = column.type !== "sku"
  // Only free columns can be renamed via context menu
  const canRename = column.type === "free" && onRename

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      role="menu"
      aria-label="Column context menu"
      data-testid="column-context-menu"
    >
      {canRename && (
        <>
          <button
            className={cn(
              "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            )}
            role="menuitem"
            onClick={handleRename}
            data-testid="context-menu-rename"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          <div className="-mx-1 my-1 h-px bg-muted" role="separator" />
        </>
      )}

      <button
        className={cn(
          "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        )}
        role="menuitem"
        onClick={handleInsertBefore}
        data-testid="context-menu-insert-before"
      >
        <Plus className="h-4 w-4" />
        Insert column before
      </button>

      <button
        className={cn(
          "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        )}
        role="menuitem"
        onClick={handleInsertAfter}
        data-testid="context-menu-insert-after"
      >
        <Plus className="h-4 w-4" />
        Insert column after
      </button>

      {canDelete && (
        <>
          <div className="-mx-1 my-1 h-px bg-muted" role="separator" />
          <button
            className={cn(
              "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
              "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
            )}
            role="menuitem"
            onClick={handleDelete}
            data-testid="context-menu-delete"
          >
            <Trash2 className="h-4 w-4" />
            Delete column
          </button>
        </>
      )}
    </div>
  )
}
