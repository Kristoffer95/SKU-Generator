import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Plus, ChevronDown, GripVertical, Check, X, Trash2, Pencil } from "lucide-react"
import { AnimatePresence, motion, Reorder } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { AddSpecDialog } from "@/components/AddSpecDialog"
import { DeleteSpecConfirmDialog } from "@/components/DeleteSpecConfirmDialog"
import { registerTourDialogOpeners, unregisterTourDialogOpeners } from "@/lib/guided-tour"
import { updateRowSKU } from "@/lib/auto-sku"
import type { Specification, SpecValue, ColumnDef } from "@/types"

interface SpecValueItemProps {
  sheetId: string
  specId: string
  value: SpecValue
}

function SpecValueItem({ sheetId, specId, value }: SpecValueItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayValue, setEditDisplayValue] = useState(value.displayValue)
  const [editSkuFragment, setEditSkuFragment] = useState(value.skuFragment)
  const [error, setError] = useState<string | null>(null)
  const displayInputRef = useRef<HTMLInputElement>(null)

  const updateSpecValue = useSheetsStore((state) => state.updateSpecValue)
  const validateSkuFragment = useSheetsStore((state) => state.validateSkuFragment)

  // Reset local state when value changes (e.g., from another source)
  useEffect(() => {
    if (!isEditing) {
      setEditDisplayValue(value.displayValue)
      setEditSkuFragment(value.skuFragment)
    }
  }, [value.displayValue, value.skuFragment, isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditDisplayValue(value.displayValue)
    setEditSkuFragment(value.skuFragment)
    setError(null)
    // Focus input after render
    setTimeout(() => displayInputRef.current?.focus(), 0)
  }, [value.displayValue, value.skuFragment])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditDisplayValue(value.displayValue)
    setEditSkuFragment(value.skuFragment)
    setError(null)
  }, [value.displayValue, value.skuFragment])

  const handleSave = useCallback(() => {
    // Validate skuFragment uniqueness within spec
    if (editSkuFragment !== value.skuFragment) {
      const isUnique = validateSkuFragment(sheetId, specId, editSkuFragment, value.id)
      if (!isUnique) {
        setError("SKU fragment must be unique within this specification")
        return
      }
    }

    // Check if anything changed
    const displayValueChanged = editDisplayValue !== value.displayValue
    const skuFragmentChanged = editSkuFragment !== value.skuFragment

    if (displayValueChanged || skuFragmentChanged) {
      const updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment'>> = {}
      if (displayValueChanged) updates.displayValue = editDisplayValue
      if (skuFragmentChanged) updates.skuFragment = editSkuFragment

      const success = updateSpecValue(sheetId, specId, value.id, updates)
      if (!success) {
        setError("SKU fragment must be unique within this specification")
        return
      }
    }

    setIsEditing(false)
    setError(null)
  }, [sheetId, specId, value.id, value.displayValue, value.skuFragment, editDisplayValue, editSkuFragment, updateSpecValue, validateSkuFragment])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  if (isEditing) {
    return (
      <div className="py-1 px-2 space-y-2" data-testid="value-edit-form">
        <div className="flex items-center gap-2">
          <Input
            ref={displayInputRef}
            value={editDisplayValue}
            onChange={(e) => setEditDisplayValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Display value"
            className="h-7 text-sm flex-1"
            data-testid="edit-display-value"
          />
          <Input
            value={editSkuFragment}
            onChange={(e) => {
              setEditSkuFragment(e.target.value)
              setError(null) // Clear error on change
            }}
            onKeyDown={handleKeyDown}
            placeholder="SKU"
            className="h-7 text-sm w-16 font-mono"
            data-testid="edit-sku-fragment"
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
            title="Save"
            data-testid="save-edit"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            title="Cancel"
            data-testid="cancel-edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="text-xs text-destructive" data-testid="edit-error">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer"
      onClick={handleStartEdit}
      data-testid="value-item"
    >
      <span className="text-sm flex-1 truncate">
        {value.displayValue}
      </span>
      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
        {value.skuFragment || "-"}
      </span>
    </motion.div>
  )
}

interface SpecItemProps {
  sheetId: string
  spec: Specification
  allSpecifications: Specification[]
  isFirst?: boolean
  onDelete: () => void
}

function SpecItem({ sheetId, spec, allSpecifications, isFirst, onDelete }: SpecItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(spec.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const updateSpecification = useSheetsStore((state) => state.updateSpecification)

  // Reset local state when spec name changes externally
  useEffect(() => {
    if (!isEditingName) {
      setEditName(spec.name)
    }
  }, [spec.name, isEditingName])

  const handleStartEditName = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding/collapsing
    setIsEditingName(true)
    setEditName(spec.name)
    setNameError(null)
    setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 0)
  }, [spec.name])

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false)
    setEditName(spec.name)
    setNameError(null)
  }, [spec.name])

  const handleSaveEditName = useCallback(() => {
    const trimmedName = editName.trim()

    // Validate: not empty
    if (!trimmedName) {
      setNameError("Name cannot be empty")
      return
    }

    // Validate: not duplicate (case-insensitive)
    const isDuplicate = allSpecifications.some(
      (s) => s.id !== spec.id && s.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (isDuplicate) {
      setNameError("A specification with this name already exists")
      return
    }

    // Skip update if name unchanged
    if (trimmedName === spec.name) {
      setIsEditingName(false)
      setNameError(null)
      return
    }

    // Update spec name in store
    const success = updateSpecification(sheetId, spec.id, { name: trimmedName })
    if (!success) {
      setNameError("Failed to update specification name")
      return
    }

    // Update column headers that reference this spec
    useSheetsStore.setState((state) => ({
      sheets: state.sheets.map((sheet) => {
        if (sheet.id !== sheetId) return sheet

        // Update columns that reference this spec
        const updatedColumns = sheet.columns.map((col) =>
          col.type === "spec" && col.specId === spec.id
            ? { ...col, header: trimmedName }
            : col
        )

        // Update header row (row 0) to match column headers
        const updatedData = [...sheet.data]
        if (updatedData.length > 0) {
          updatedData[0] = updatedColumns.map((col) => ({
            v: col.header,
            m: col.header,
          }))
        }

        return { ...sheet, columns: updatedColumns, data: updatedData }
      }),
    }))

    setIsEditingName(false)
    setNameError(null)
  }, [sheetId, spec.id, spec.name, editName, allSpecifications, updateSpecification])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveEditName()
    } else if (e.key === "Escape") {
      handleCancelEditName()
    }
  }, [handleSaveEditName, handleCancelEditName])

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding/collapsing
    onDelete()
  }

  return (
    <div
      className="overflow-hidden"
      {...(isFirst ? { "data-tour": "spec-item" } : {})}
    >
      <div className="rounded-md border bg-card">
        {/* Header */}
        <div className="flex items-center gap-1 p-2">
          <div
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            data-testid="drag-handle"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {isEditingName ? (
            <div className="flex flex-1 items-center gap-1" data-testid="spec-name-edit-form">
              <Input
                ref={nameInputRef}
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setNameError(null)
                }}
                onKeyDown={handleNameKeyDown}
                onBlur={handleSaveEditName}
                placeholder="Specification name"
                className="h-7 text-sm flex-1"
                data-testid="edit-spec-name"
              />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleSaveEditName()
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                title="Save"
                data-testid="save-spec-name"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleCancelEditName()
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                title="Cancel"
                data-testid="cancel-spec-name"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.span>
                <span className="font-medium text-sm truncate flex-1">
                  {spec.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {spec.values.length} value{spec.values.length !== 1 ? "s" : ""}
                </span>
              </button>
              <button
                className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                onClick={handleStartEditName}
                title="Edit specification name"
                data-testid="edit-spec-name-button"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
            onClick={handleDeleteClick}
            title="Delete specification"
            data-testid="delete-spec-button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {nameError && (
          <p className="text-xs text-destructive px-2 pb-2" data-testid="spec-name-error">
            {nameError}
          </p>
        )}

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t px-2 py-2 space-y-1">
                {spec.values.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    No values defined
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {spec.values.map((value) => (
                      <SpecValueItem
                        key={value.id}
                        sheetId={sheetId}
                        specId={spec.id}
                        value={value}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const EMPTY_SPECIFICATIONS: never[] = []
const EMPTY_COLUMNS: ColumnDef[] = []

export function SpecificationList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [specToDelete, setSpecToDelete] = useState<Specification | null>(null)
  // Get active sheet and its local specifications
  const { sheets, activeSheetId, setSheetData, reorderSpec, removeSpecification } = useSheetsStore()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  // Use sheet-local specifications (fallback to empty array for backward compat)
  const specifications = useMemo(
    () => activeSheet?.specifications ?? EMPTY_SPECIFICATIONS,
    [activeSheet?.specifications]
  )
  // Get columns for delete confirmation (to show affected columns)
  const columns = useMemo(
    () => activeSheet?.columns ?? EMPTY_COLUMNS,
    [activeSheet?.columns]
  )
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)

  // Sort specifications by order field (lowest first)
  const sortedSpecifications = useMemo(() => {
    return [...specifications].sort((a, b) => a.order - b.order)
  }, [specifications])

  // Local state for drag reordering (to avoid store updates during drag)
  const [localOrder, setLocalOrder] = useState<Specification[]>(sortedSpecifications)

  // Sync local order when store specifications change (but not during drag)
  useEffect(() => {
    setLocalOrder(sortedSpecifications)
  }, [sortedSpecifications])

  // Regenerate all SKUs in active sheet only (specs are now per-sheet)
  const regenerateAllSKUs = useCallback((updatedSpecs: Specification[]) => {
    if (!activeSheet || updatedSpecs.length === 0) return
    if (activeSheet.type !== "data" || activeSheet.data.length <= 1) return

    const settings = { delimiter, prefix, suffix }

    // Create a copy of the data to modify
    const newData = activeSheet.data.map((row) => [...row])

    // Update SKU for each data row (skip header row 0)
    for (let rowIndex = 1; rowIndex < newData.length; rowIndex++) {
      updateRowSKU(newData, rowIndex, updatedSpecs, settings)
    }

    // Update the sheet in the store
    setSheetData(activeSheet.id, newData)
  }, [activeSheet, setSheetData, delimiter, prefix, suffix])

  // Handle reorder during drag (updates local state only)
  const handleReorder = useCallback((reorderedSpecs: Specification[]) => {
    setLocalOrder(reorderedSpecs)
  }, [])

  // Commit reorder to store when drag ends
  const handleDragEnd = useCallback(() => {
    if (!activeSheetId) return

    // Check if order actually changed by comparing IDs
    const orderChanged = localOrder.some(
      (spec, index) => sortedSpecifications[index]?.id !== spec.id
    )

    if (!orderChanged) return

    // Update the store with new order
    localOrder.forEach((spec, newIndex) => {
      if (spec.order !== newIndex) {
        reorderSpec(activeSheetId, spec.id, newIndex)
      }
    })

    // After reordering, regenerate all SKUs with updated order
    // Get the latest specifications from the active sheet after reorder
    const latestSheet = useSheetsStore.getState().sheets.find(s => s.id === activeSheetId)
    const latestSpecs = latestSheet?.specifications ?? []
    regenerateAllSKUs(latestSpecs)
  }, [activeSheetId, localOrder, sortedSpecifications, reorderSpec, regenerateAllSKUs])

  // Handle delete spec button click (opens confirmation dialog)
  const handleDeleteClick = useCallback((spec: Specification) => {
    setSpecToDelete(spec)
    setIsDeleteDialogOpen(true)
  }, [])

  // Confirm deletion: remove spec and all columns that reference it
  const handleDeleteConfirm = useCallback(() => {
    if (!activeSheetId || !specToDelete || !activeSheet) return

    // Find all columns that reference this spec
    const columnsToRemove = columns.filter(
      (col) => col.type === "spec" && col.specId === specToDelete.id
    )

    // Get indices of columns to remove (in reverse order to preserve indices)
    const columnIndices = columnsToRemove
      .map((col) => columns.findIndex((c) => c.id === col.id))
      .filter((idx) => idx !== -1)
      .sort((a, b) => b - a) // Sort descending for safe removal

    // Remove columns from columns array and data rows
    const newColumns = [...columns]
    const newData = activeSheet.data.map((row) => [...row])

    // Remove columns by index (descending order preserves indices)
    for (const idx of columnIndices) {
      newColumns.splice(idx, 1)
      for (const row of newData) {
        if (row.length > idx) {
          row.splice(idx, 1)
        }
      }
    }

    // Remove the specification
    removeSpecification(activeSheetId, specToDelete.id)

    // Update the sheet with new columns and data
    useSheetsStore.setState((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === activeSheetId
          ? { ...s, columns: newColumns, data: newData }
          : s
      ),
    }))

    // Regenerate all SKUs after column removal
    const latestSheet = useSheetsStore.getState().sheets.find((s) => s.id === activeSheetId)
    const latestSpecs = latestSheet?.specifications ?? []
    regenerateAllSKUs(latestSpecs)

    // Close dialog and clear state
    setIsDeleteDialogOpen(false)
    setSpecToDelete(null)
  }, [activeSheetId, specToDelete, activeSheet, columns, removeSpecification, regenerateAllSKUs])

  // Callbacks for tour dialog openers
  const openAddSpecDialog = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  const closeAllDialogs = useCallback(() => {
    setIsAddDialogOpen(false)
    setIsDeleteDialogOpen(false)
    setSpecToDelete(null)
  }, [])

  // Register dialog openers for guided tour
  useEffect(() => {
    registerTourDialogOpeners({
      addSpec: openAddSpecDialog,
      closeAll: closeAllDialogs,
    })

    return () => {
      unregisterTourDialogOpeners(["addSpec"])
    }
  }, [openAddSpecDialog, closeAllDialogs])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {sortedSpecifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 text-center text-sm text-muted-foreground"
          >
            No specifications yet.
            <br />
            Click "Add Specification" to create one.
          </motion.div>
        ) : (
          <Reorder.Group
            axis="y"
            values={localOrder}
            onReorder={handleReorder}
            className="p-2 space-y-1"
          >
            {localOrder.map((spec, index) => (
              <Reorder.Item
                key={spec.id}
                value={spec}
                className="list-none"
                onDragEnd={handleDragEnd}
              >
                <SpecItem
                  sheetId={activeSheetId!}
                  spec={spec}
                  allSpecifications={specifications}
                  isFirst={index === 0}
                  onDelete={() => handleDeleteClick(spec)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
      <div className="p-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setIsAddDialogOpen(true)}
          data-tour="add-spec-button"
        >
          <Plus className="h-4 w-4" />
          Add Specification
        </Button>
      </div>
      <AddSpecDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      <DeleteSpecConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        spec={specToDelete}
        columns={columns}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
