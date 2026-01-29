import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteRowConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The row index to delete (1-indexed for display, actual data row) */
  rowIndex: number | null
  onConfirm: () => void
}

export function DeleteRowConfirmDialog({
  open,
  onOpenChange,
  rowIndex,
  onConfirm,
}: DeleteRowConfirmDialogProps) {
  if (rowIndex === null) return null

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="delete-row-dialog">
        <DialogHeader>
          <DialogTitle>Delete Row</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete row {rowIndex}?
            <br />
            <br />
            All data in this row will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="delete-row-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            data-testid="delete-row-confirm"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
