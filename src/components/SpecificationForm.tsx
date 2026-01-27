import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpecificationsStore } from "@/store/specifications"
import type { Specification } from "@/types"

interface SpecificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specification?: Specification
}

export function SpecificationForm({
  open,
  onOpenChange,
  specification,
}: SpecificationFormProps) {
  const [name, setName] = useState("")
  const { addSpecification, updateSpecification } = useSpecificationsStore()

  const isEditing = !!specification

  useEffect(() => {
    if (open) {
      setName(specification?.name ?? "")
    }
  }, [open, specification])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (isEditing && specification) {
      updateSpecification(specification.id, { name: name.trim() })
    } else {
      addSpecification(name.trim())
    }

    onOpenChange(false)
    setName("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Specification" : "Add Specification"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the specification name."
                : "Enter a name for the new specification column."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="spec-name">Name</Label>
              <Input
                id="spec-name"
                placeholder="e.g., Color, Size, Temperature"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
