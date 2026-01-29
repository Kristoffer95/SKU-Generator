import { useEffect, useRef, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RowContextMenuPosition {
  x: number
  y: number
}

export interface RowContextMenuProps {
  /** Position to render the menu at */
  position: RowContextMenuPosition | null
  /** The row index (0-indexed from data array, row 0 is header) */
  rowIndex: number
  /** Called when menu should close */
  onClose: () => void
  /** Called when user selects "Delete row" */
  onDelete: (rowIndex: number) => void
}

export function RowContextMenu({
  position,
  rowIndex,
  onClose,
  onDelete,
}: RowContextMenuProps) {
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

  const handleDelete = useCallback(() => {
    onDelete(rowIndex)
    onClose()
  }, [rowIndex, onDelete, onClose])

  // Don't render if no position or if it's the header row (row 0)
  if (!position || rowIndex === 0) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      role="menu"
      aria-label="Row context menu"
      data-testid="row-context-menu"
    >
      <button
        className={cn(
          "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
          "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
        )}
        role="menuitem"
        onClick={handleDelete}
        data-testid="context-menu-delete-row"
      >
        <Trash2 className="h-4 w-4" />
        Delete row
      </button>
    </div>
  )
}
