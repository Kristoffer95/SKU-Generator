import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
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
import { useSheetsStore } from "@/store/sheets"

interface AddSpecDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ValueEntry {
  id: string
  displayValue: string
  skuFragment: string
}

const generateId = () => crypto.randomUUID()

export function AddSpecDialog({ open, onOpenChange }: AddSpecDialogProps) {
  const { getActiveSheet, setSheetData, addSpecification, addSpecValue } = useSheetsStore()
  const activeSheet = getActiveSheet()
  // Use sheet-local specifications
  const specifications = activeSheet?.specifications ?? []

  const [specName, setSpecName] = useState("")
  const [values, setValues] = useState<ValueEntry[]>([
    { id: generateId(), displayValue: "", skuFragment: "" },
  ])
  const [error, setError] = useState<string | null>(null)

  // Get existing spec names for validation
  const existingSpecNames = specifications.map((spec) => spec.name)

  const resetForm = () => {
    setSpecName("")
    setValues([{ id: generateId(), displayValue: "", skuFragment: "" }])
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const addValueEntry = () => {
    setValues([...values, { id: generateId(), displayValue: "", skuFragment: "" }])
  }

  const removeValueEntry = (id: string) => {
    if (values.length > 1) {
      setValues(values.filter((v) => v.id !== id))
    }
  }

  const updateValueEntry = (id: string, field: "displayValue" | "skuFragment", value: string) => {
    setValues(
      values.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    )
  }

  const validateForm = (): boolean => {
    const trimmedName = specName.trim()

    if (!trimmedName) {
      setError("Specification name is required")
      return false
    }

    // Check for duplicate spec name (case-insensitive)
    if (existingSpecNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`Specification "${trimmedName}" already exists`)
      return false
    }

    // Check that at least one value has a displayValue
    const validValues = values.filter((v) => v.displayValue.trim())
    if (validValues.length === 0) {
      setError("At least one value with a label is required")
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const trimmedName = specName.trim()
    const validValues = values.filter((v) => v.displayValue.trim())

    // Get active sheet - we need its ID for sheet-scoped methods
    const currentSheet = getActiveSheet()
    if (!currentSheet) {
      setError("No active sheet")
      return
    }

    // Add specification to sheet-scoped store
    const specId = addSpecification(currentSheet.id, trimmedName)
    if (!specId) {
      setError("Failed to add specification")
      return
    }

    // Add values to the specification
    validValues.forEach((v) => {
      addSpecValue(currentSheet.id, specId, v.displayValue.trim(), v.skuFragment.trim())
    })

    // Add column to active data sheet (if it's a data sheet)
    // SKU is always at column 0, spec columns are appended at the end
    // All rows are data rows now - no header row in data array (headers in columns[].header)
    if (currentSheet.type === "data") {
      const newDataSheetData = currentSheet.data.map((row) => {
        const newRow = [...row]

        // All rows are data rows - just add an empty cell for the new column
        if (newRow.length === 0) {
          // Empty row: add two empty cells (SKU column + new spec column)
          newRow.push({})
          newRow.push({})
        } else {
          // Existing row: append empty cell at the end for new spec
          newRow.push({})
        }

        return newRow
      })

      setSheetData(currentSheet.id, newDataSheetData)
    }

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-tour="add-spec-dialog">
        <DialogHeader>
          <DialogTitle>Add Specification</DialogTitle>
          <DialogDescription>
            Create a new specification with values. This will add a column to the active
            data sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="spec-name">Specification Name</Label>
            <Input
              id="spec-name"
              value={specName}
              onChange={(e) => {
                setSpecName(e.target.value)
                setError(null)
              }}
              placeholder="e.g., Color, Size, Material"
              data-tour="spec-name-input"
            />
          </div>

          <div className="grid gap-2" data-tour="spec-values-section">
            <Label>Values</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {values.map((entry, index) => (
                <div key={entry.id} className="flex gap-2 items-center">
                  <Input
                    value={entry.displayValue}
                    onChange={(e) => updateValueEntry(entry.id, "displayValue", e.target.value)}
                    placeholder="Value label"
                    className="flex-1"
                    aria-label={`Value ${index + 1} label`}
                  />
                  <Input
                    value={entry.skuFragment}
                    onChange={(e) => updateValueEntry(entry.id, "skuFragment", e.target.value)}
                    placeholder="SKU code"
                    className="w-24"
                    aria-label={`Value ${index + 1} SKU code`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeValueEntry(entry.id)}
                    disabled={values.length === 1}
                    aria-label={`Remove value ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addValueEntry}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Specification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
