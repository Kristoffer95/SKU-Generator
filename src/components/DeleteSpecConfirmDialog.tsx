import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Specification, ColumnDef } from "@/types"

interface DeleteSpecConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spec: Specification | null
  columns: ColumnDef[]
  onConfirm: () => void
}

export function DeleteSpecConfirmDialog({
  open,
  onOpenChange,
  spec,
  columns,
  onConfirm,
}: DeleteSpecConfirmDialogProps) {
  if (!spec) return null

  // Find all columns that reference this spec
  const affectedColumns = columns.filter(
    (col) => col.type === "spec" && col.specId === spec.id
  )
  const columnCount = affectedColumns.length

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="delete-spec-dialog">
        <DialogHeader>
          <DialogTitle>Delete Specification</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>
                Are you sure you want to delete the specification "{spec.name}"?
              </p>
              {columnCount > 0 ? (
                <p className="mt-2">
                  <strong className="text-foreground">Warning:</strong>{" "}
                  {columnCount === 1
                    ? "1 column uses this specification and will be removed."
                    : `${columnCount} columns use this specification and will be removed.`}{" "}
                  All data in {columnCount === 1 ? "this column" : "these columns"} will be permanently deleted.
                </p>
              ) : (
                <p className="mt-2">
                  This specification is not currently used by any columns.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="delete-spec-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            data-testid="delete-spec-confirm"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
