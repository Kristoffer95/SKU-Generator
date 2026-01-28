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
import { parseConfigSheet, getSpecNames } from "@/lib/config-sheet"
import type { CellData } from "@/types"

interface AddSpecDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ValueEntry {
  id: string
  label: string
  skuCode: string
}

const generateId = () => crypto.randomUUID()

export function AddSpecDialog({ open, onOpenChange }: AddSpecDialogProps) {
  const { getConfigSheet, getActiveSheet, setSheetData } = useSheetsStore()

  const [specName, setSpecName] = useState("")
  const [values, setValues] = useState<ValueEntry[]>([
    { id: generateId(), label: "", skuCode: "" },
  ])
  const [error, setError] = useState<string | null>(null)

  // Get existing spec names for validation
  const configSheet = getConfigSheet()
  const existingSpecNames = configSheet
    ? getSpecNames(parseConfigSheet(configSheet.data))
    : []

  const resetForm = () => {
    setSpecName("")
    setValues([{ id: generateId(), label: "", skuCode: "" }])
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const addValueEntry = () => {
    setValues([...values, { id: generateId(), label: "", skuCode: "" }])
  }

  const removeValueEntry = (id: string) => {
    if (values.length > 1) {
      setValues(values.filter((v) => v.id !== id))
    }
  }

  const updateValueEntry = (id: string, field: "label" | "skuCode", value: string) => {
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

    // Check that at least one value has a label
    const validValues = values.filter((v) => v.label.trim())
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
    const validValues = values.filter((v) => v.label.trim())

    // Add rows to Config sheet
    if (configSheet) {
      const newConfigData = [...configSheet.data]

      validValues.forEach((v) => {
        const newRow: CellData[] = [
          { v: trimmedName, m: trimmedName },
          { v: v.label.trim(), m: v.label.trim() },
          { v: v.skuCode.trim(), m: v.skuCode.trim() },
        ]
        newConfigData.push(newRow)
      })

      setSheetData(configSheet.id, newConfigData)
    }

    // Add column to active data sheet (if it's a data sheet)
    const activeSheet = getActiveSheet()
    if (activeSheet && activeSheet.type === "data") {
      const newDataSheetData = activeSheet.data.map((row, rowIndex) => {
        const newRow = [...row]

        // Add header to first row
        if (rowIndex === 0) {
          // Insert new column before SKU column (last column)
          // If row is empty, just add the header
          if (newRow.length === 0) {
            newRow.push({ v: trimmedName, m: trimmedName })
            newRow.push({ v: "SKU", m: "SKU" })
          } else {
            // Insert before last column (SKU)
            newRow.splice(newRow.length - 1, 0, { v: trimmedName, m: trimmedName })
          }
        } else {
          // Add empty cell for data rows
          if (newRow.length === 0) {
            newRow.push({})
            newRow.push({})
          } else {
            // Insert empty cell before SKU column
            newRow.splice(newRow.length - 1, 0, {})
          }
        }

        return newRow
      })

      // If no rows exist, create header row
      if (newDataSheetData.length === 0) {
        newDataSheetData.push([
          { v: trimmedName, m: trimmedName },
          { v: "SKU", m: "SKU" },
        ])
      }

      setSheetData(activeSheet.id, newDataSheetData)
    }

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-tour="add-spec-dialog">
        <DialogHeader>
          <DialogTitle>Add Specification</DialogTitle>
          <DialogDescription>
            Create a new specification with values. This will add rows to the Config sheet
            and a column to the active data sheet.
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
                    value={entry.label}
                    onChange={(e) => updateValueEntry(entry.id, "label", e.target.value)}
                    placeholder="Value label"
                    className="flex-1"
                    aria-label={`Value ${index + 1} label`}
                  />
                  <Input
                    value={entry.skuCode}
                    onChange={(e) => updateValueEntry(entry.id, "skuCode", e.target.value)}
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
