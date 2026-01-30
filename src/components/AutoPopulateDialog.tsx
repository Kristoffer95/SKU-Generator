import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Sparkles, GripVertical } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ColumnDef, Specification, CellData } from "@/types"

interface AutoPopulateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Spec columns from the active sheet */
  specColumns: Array<{ column: ColumnDef; specification: Specification; columnIndex: number }>
  /** All columns in the sheet (for generating full rows) */
  allColumns: ColumnDef[]
  /** Called with the generated data rows when user clicks Generate */
  onGenerate: (data: { mode: 'replace' | 'append'; rows: CellData[][] }) => void
}

interface SpecColumnOrder {
  columnIndex: number
  column: ColumnDef
  specification: Specification
  order: number
}

/**
 * Generate all combinations of spec values in the specified order
 * Returns array of rows where each row is an array of cell values
 * The order determines which spec changes most/least frequently:
 * - First spec in order changes least (stays constant for longer blocks)
 * - Last spec in order changes most (changes every row)
 */
function generateCombinations(
  orderedSpecs: SpecColumnOrder[],
  columns: ColumnDef[]
): CellData[][] {
  if (orderedSpecs.length === 0) return []

  // Get all values for each spec in order
  const specValues = orderedSpecs.map(s => s.specification.values)

  // If any spec has no values, return empty
  if (specValues.some(v => v.length === 0)) return []

  // Calculate total combinations
  const totalCombinations = specValues.reduce((acc, v) => acc * v.length, 1)

  // Generate combinations
  const combinations: CellData[][] = []

  for (let i = 0; i < totalCombinations; i++) {
    // Create a row with empty cells for all columns
    const row: CellData[] = columns.map(() => ({}))

    // Calculate which value to use for each spec
    let divisor = 1
    for (let specIndex = orderedSpecs.length - 1; specIndex >= 0; specIndex--) {
      const spec = orderedSpecs[specIndex]
      const values = spec.specification.values
      const valueIndex = Math.floor(i / divisor) % values.length
      const value = values[valueIndex]

      // Set the cell value at the column position
      row[spec.columnIndex] = {
        v: value.displayValue,
        m: value.displayValue,
      }

      divisor *= values.length
    }

    combinations.push(row)
  }

  return combinations
}

export function AutoPopulateDialog({
  open,
  onOpenChange,
  specColumns,
  allColumns,
  onGenerate,
}: AutoPopulateDialogProps) {
  // Initialize spec order from the column order
  const [specOrder, setSpecOrder] = useState<SpecColumnOrder[]>([])
  const [mode, setMode] = useState<'replace' | 'append'>('replace')

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragOverRef = useRef<number | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSpecOrder(
        specColumns.map((sc, index) => ({
          columnIndex: sc.columnIndex,
          column: sc.column,
          specification: sc.specification,
          order: index,
        }))
      )
      setMode('replace')
      setDraggedIndex(null)
      setDropTargetIndex(null)
    }
  }, [open, specColumns])

  // Calculate total combinations
  const totalCombinations = useMemo(() => {
    if (specOrder.length === 0) return 0
    const counts = specOrder.map(s => s.specification.values.length)
    if (counts.some(c => c === 0)) return 0
    return counts.reduce((acc, c) => acc * c, 1)
  }, [specOrder])

  // Sorted spec order for rendering and generation
  const sortedSpecOrder = useMemo(() => {
    return [...specOrder].sort((a, b) => a.order - b.order)
  }, [specOrder])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))

    requestAnimationFrame(() => {
      const target = e.target as HTMLElement
      target.style.opacity = "0.5"
    })
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = "1"
    setDraggedIndex(null)
    setDropTargetIndex(null)
    dragOverRef.current = null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (dragOverRef.current !== index) {
      dragOverRef.current = index
      setDropTargetIndex(index)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    dragOverRef.current = null
    setDropTargetIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDropTargetIndex(null)
      return
    }

    // Reorder the specs
    setSpecOrder(prev => {
      const newOrder = [...prev]
      const draggedSpec = newOrder.find(s => s.order === draggedIndex)
      const targetSpec = newOrder.find(s => s.order === targetIndex)

      if (!draggedSpec || !targetSpec) return prev

      // Swap the order values
      const tempOrder = draggedSpec.order
      draggedSpec.order = targetSpec.order
      targetSpec.order = tempOrder

      return newOrder
    })

    setDraggedIndex(null)
    setDropTargetIndex(null)
  }, [draggedIndex])

  const handleGenerate = useCallback(() => {
    if (specOrder.length === 0 || totalCombinations === 0) return

    // Generate combination rows with all columns
    const rows = generateCombinations(sortedSpecOrder, allColumns)

    onGenerate({
      mode,
      rows,
    })

    onOpenChange(false)
  }, [specOrder, totalCombinations, mode, onGenerate, onOpenChange, sortedSpecOrder, allColumns])

  // Check if we have specs with values
  const hasValidSpecs = specOrder.length > 0 && totalCombinations > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="auto-populate-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Auto Populate Combinations
          </DialogTitle>
          <DialogDescription>
            Generate all possible combinations of specification values.
            Drag to reorder which specifications change most/least frequently.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Spec order list */}
          <div className="grid gap-2">
            <Label>Specification Order</Label>
            <p className="text-sm text-muted-foreground">
              First changes least frequently, last changes every row.
            </p>

            {specOrder.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No specification columns found. Add spec columns first.
              </p>
            ) : (
              <div className="space-y-1" data-testid="spec-order-list">
                {sortedSpecOrder.map((spec, index) => (
                  <div
                    key={spec.column.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, spec.order)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, spec.order)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, spec.order)}
                    className={`flex items-center gap-2 p-2 rounded-md border bg-background cursor-move
                      ${draggedIndex === spec.order ? 'opacity-50' : ''}
                      ${dropTargetIndex === spec.order && draggedIndex !== spec.order ? 'border-primary bg-accent' : ''}
                    `}
                    data-testid={`spec-order-item-${index}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium">{spec.specification.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {spec.specification.values.length} values
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Combination count preview */}
          {hasValidSpecs && (
            <div className="flex items-center justify-between p-3 rounded-md bg-muted" data-testid="combination-count">
              <span className="text-sm font-medium">Total combinations:</span>
              <span className="text-sm font-bold">{totalCombinations.toLocaleString()}</span>
            </div>
          )}

          {/* Mode selection */}
          <div className="grid gap-2">
            <Label>Mode</Label>
            <div className="flex gap-2" data-testid="mode-toggle">
              <Button
                type="button"
                variant={mode === 'replace' ? 'default' : 'outline'}
                onClick={() => setMode('replace')}
                className="flex-1"
                data-testid="mode-replace"
              >
                Replace all data
              </Button>
              <Button
                type="button"
                variant={mode === 'append' ? 'default' : 'outline'}
                onClick={() => setMode('append')}
                className="flex-1"
                data-testid="mode-append"
              >
                Append below
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'replace'
                ? 'Keep header row, replace all data rows'
                : 'Add rows below existing data'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!hasValidSpecs}
            data-testid="generate-button"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate {totalCombinations > 0 ? `(${totalCombinations.toLocaleString()})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { generateCombinations }
