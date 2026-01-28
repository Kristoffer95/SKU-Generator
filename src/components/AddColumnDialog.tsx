import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
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
import type { ColumnDef, Specification } from "@/types"

interface AddColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected position index. If provided, position selector defaults to this. */
  defaultPosition?: number
}

type ColumnTypeOption = 'spec' | 'free'

const generateId = () => crypto.randomUUID()

export function AddColumnDialog({ open, onOpenChange, defaultPosition }: AddColumnDialogProps) {
  const { getActiveSheet } = useSheetsStore()
  const activeSheet = getActiveSheet()

  // Column type: 'spec' or 'free'
  const [columnType, setColumnType] = useState<ColumnTypeOption>('spec')

  // For spec type: selected existing spec ID or 'new' for creating new
  const [selectedSpecId, setSelectedSpecId] = useState<string>('new')

  // For spec type with 'new': new spec name and values
  const [newSpecName, setNewSpecName] = useState('')
  const [newSpecValues, setNewSpecValues] = useState<{ id: string; displayValue: string; skuFragment: string }[]>([
    { id: generateId(), displayValue: '', skuFragment: '' }
  ])

  // For free type: column name
  const [freeColumnName, setFreeColumnName] = useState('')

  // Position: 'end' or column index to insert before
  const [position, setPosition] = useState<string>('end')

  const [error, setError] = useState<string | null>(null)

  // Get columns and specifications from active sheet
  const columns = activeSheet?.columns ?? []
  const specifications = activeSheet?.specifications ?? []

  // Get spec columns to show existing specs (for dropdown)
  const existingSpecs = specifications

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setColumnType('spec')
      setSelectedSpecId('new')
      setNewSpecName('')
      setNewSpecValues([{ id: generateId(), displayValue: '', skuFragment: '' }])
      setFreeColumnName('')
      // Set position based on defaultPosition prop
      if (defaultPosition !== undefined && defaultPosition >= 0 && defaultPosition < columns.length) {
        setPosition(defaultPosition.toString())
      } else {
        setPosition('end')
      }
      setError(null)
    }
  }, [open, defaultPosition, columns.length])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  // New spec value entry management
  const addValueEntry = () => {
    setNewSpecValues([...newSpecValues, { id: generateId(), displayValue: '', skuFragment: '' }])
  }

  const removeValueEntry = (id: string) => {
    if (newSpecValues.length > 1) {
      setNewSpecValues(newSpecValues.filter(v => v.id !== id))
    }
  }

  const updateValueEntry = (id: string, field: 'displayValue' | 'skuFragment', value: string) => {
    setNewSpecValues(newSpecValues.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  const validateForm = (): boolean => {
    if (!activeSheet) {
      setError('No active sheet')
      return false
    }

    if (columnType === 'spec') {
      if (selectedSpecId === 'new') {
        // Creating new spec
        const trimmedName = newSpecName.trim()
        if (!trimmedName) {
          setError('Specification name is required')
          return false
        }
        // Check for duplicate spec name
        if (existingSpecs.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
          setError(`Specification "${trimmedName}" already exists`)
          return false
        }
        // Check at least one value has displayValue
        const validValues = newSpecValues.filter(v => v.displayValue.trim())
        if (validValues.length === 0) {
          setError('At least one value with a label is required')
          return false
        }
      } else {
        // Using existing spec - nothing more to validate
      }
    } else {
      // Free column
      const trimmedName = freeColumnName.trim()
      if (!trimmedName) {
        setError('Column name is required')
        return false
      }
      // Check for duplicate column header
      if (columns.some(c => c.header.toLowerCase() === trimmedName.toLowerCase())) {
        setError(`Column "${trimmedName}" already exists`)
        return false
      }
    }

    setError(null)
    return true
  }

  const handleSubmit = () => {
    if (!validateForm() || !activeSheet) return

    const { addSpecification, addSpecValue } = useSheetsStore.getState()

    let newColumn: ColumnDef
    let specForColumn: Specification | undefined

    if (columnType === 'spec') {
      if (selectedSpecId === 'new') {
        // Create new spec first
        const trimmedName = newSpecName.trim()
        const specId = addSpecification(activeSheet.id, trimmedName)
        if (!specId) {
          setError('Failed to add specification')
          return
        }

        // Add values to the spec
        const validValues = newSpecValues.filter(v => v.displayValue.trim())
        validValues.forEach(v => {
          addSpecValue(activeSheet.id, specId, v.displayValue.trim(), v.skuFragment.trim())
        })

        newColumn = {
          id: generateId(),
          type: 'spec',
          specId,
          header: trimmedName
        }
      } else {
        // Use existing spec
        specForColumn = existingSpecs.find(s => s.id === selectedSpecId)
        if (!specForColumn) {
          setError('Selected specification not found')
          return
        }
        newColumn = {
          id: generateId(),
          type: 'spec',
          specId: selectedSpecId,
          header: specForColumn.name
        }
      }
    } else {
      // Free column
      newColumn = {
        id: generateId(),
        type: 'free',
        header: freeColumnName.trim()
      }
    }

    // Calculate insert position
    let insertIndex: number
    if (position === 'end') {
      insertIndex = columns.length
    } else {
      insertIndex = parseInt(position, 10)
    }

    // Update columns array
    const newColumns = [...columns]
    newColumns.splice(insertIndex, 0, newColumn)

    // Update sheet data to add new column at position
    const newData = activeSheet.data.map((row, rowIndex) => {
      const newRow = [...row]
      if (rowIndex === 0) {
        // Header row: insert column header
        newRow.splice(insertIndex, 0, { v: newColumn.header, m: newColumn.header })
      } else {
        // Data row: insert empty cell
        newRow.splice(insertIndex, 0, {})
      }
      return newRow
    })

    // Update the sheet with new columns and data
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(sheet =>
        sheet.id === activeSheet.id
          ? { ...sheet, columns: newColumns, data: newData }
          : sheet
      )
    }))

    handleOpenChange(false)
  }

  // Get non-SKU columns for position dropdown
  const positionOptions = columns
    .map((col, index) => ({ col, index }))
    .filter(({ col }) => col.type !== 'sku') // Can't insert before SKU

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="add-column-dialog">
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Add a new column to the active sheet. Choose between a specification column (with dropdown values) or a free text column.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Column Type Toggle */}
          <div className="grid gap-2">
            <Label>Column Type</Label>
            <div className="flex gap-2" data-testid="column-type-toggle">
              <Button
                type="button"
                variant={columnType === 'spec' ? 'default' : 'outline'}
                onClick={() => setColumnType('spec')}
                className="flex-1"
                data-testid="column-type-spec"
              >
                Specification
              </Button>
              <Button
                type="button"
                variant={columnType === 'free' ? 'default' : 'outline'}
                onClick={() => setColumnType('free')}
                className="flex-1"
                data-testid="column-type-free"
              >
                Free
              </Button>
            </div>
          </div>

          {/* Specification Type - Show spec selector or new spec form */}
          {columnType === 'spec' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="spec-selector">Specification</Label>
                <select
                  id="spec-selector"
                  value={selectedSpecId}
                  onChange={e => setSelectedSpecId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="spec-selector"
                >
                  <option value="new">+ Create new specification</option>
                  {existingSpecs.map(spec => (
                    <option key={spec.id} value={spec.id}>{spec.name}</option>
                  ))}
                </select>
              </div>

              {/* New Spec Form */}
              {selectedSpecId === 'new' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="new-spec-name">Specification Name</Label>
                    <Input
                      id="new-spec-name"
                      value={newSpecName}
                      onChange={e => {
                        setNewSpecName(e.target.value)
                        setError(null)
                      }}
                      placeholder="e.g., Color, Size, Material"
                      data-testid="new-spec-name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Values</Label>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {newSpecValues.map((entry, index) => (
                        <div key={entry.id} className="flex gap-2 items-center">
                          <Input
                            value={entry.displayValue}
                            onChange={e => updateValueEntry(entry.id, 'displayValue', e.target.value)}
                            placeholder="Value label"
                            className="flex-1"
                            aria-label={`Value ${index + 1} label`}
                            data-testid={`value-label-${index}`}
                          />
                          <Input
                            value={entry.skuFragment}
                            onChange={e => updateValueEntry(entry.id, 'skuFragment', e.target.value)}
                            placeholder="SKU code"
                            className="w-24"
                            aria-label={`Value ${index + 1} SKU code`}
                            data-testid={`value-sku-${index}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeValueEntry(entry.id)}
                            disabled={newSpecValues.length === 1}
                            aria-label={`Remove value ${index + 1}`}
                            data-testid={`remove-value-${index}`}
                          >
                            <span className="sr-only">Remove</span>
                            ×
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
                      data-testid="add-value-button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Value
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Free Column - Show name input */}
          {columnType === 'free' && (
            <div className="grid gap-2">
              <Label htmlFor="free-column-name">Column Name</Label>
              <Input
                id="free-column-name"
                value={freeColumnName}
                onChange={e => {
                  setFreeColumnName(e.target.value)
                  setError(null)
                }}
                placeholder="e.g., Notes, Description"
                data-testid="free-column-name"
              />
            </div>
          )}

          {/* Position Selector */}
          <div className="grid gap-2">
            <Label htmlFor="position-selector">Position</Label>
            <select
              id="position-selector"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="position-selector"
            >
              <option value="end">At end</option>
              {positionOptions.map(({ col, index }) => (
                <option key={col.id} value={index.toString()}>
                  Before "{col.header}"
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive" role="alert" data-testid="error-message">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} data-testid="cancel-button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} data-testid="submit-button">
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
