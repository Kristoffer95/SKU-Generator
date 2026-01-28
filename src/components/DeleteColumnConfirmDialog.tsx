import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ColumnDef } from "@/types"

interface DeleteColumnConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  column: ColumnDef | null
  onConfirm: () => void
}

export function DeleteColumnConfirmDialog({
  open,
  onOpenChange,
  column,
  onConfirm,
}: DeleteColumnConfirmDialogProps) {
  if (!column) return null

  const isSpecColumn = column.type === "spec"

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="delete-column-dialog">
        <DialogHeader>
          <DialogTitle>Delete Column</DialogTitle>
          <DialogDescription>
            {isSpecColumn ? (
              <>
                Are you sure you want to delete the column "{column.header}"?
                <br />
                <br />
                <strong className="text-foreground">Warning:</strong> This is a specification column. Deleting it will remove all data in this column. The associated specification will remain available for future use.
              </>
            ) : (
              <>
                Are you sure you want to delete the column "{column.header}"?
                <br />
                <br />
                All data in this column will be permanently removed.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="delete-column-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            data-testid="delete-column-confirm"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
