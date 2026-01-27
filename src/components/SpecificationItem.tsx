import { useState } from "react"
import { ChevronDown, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react"
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Specification } from "@/types"
import { useSpecificationsStore } from "@/store/specifications"
import { SpecificationForm } from "./SpecificationForm"

interface SpecificationItemProps {
  specification: Specification
}

export function SpecificationItem({ specification }: SpecificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddingValue, setIsAddingValue] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newSkuCode, setNewSkuCode] = useState("")

  const dragControls = useDragControls()
  const { removeSpecification, addSpecValue, removeSpecValue } =
    useSpecificationsStore()

  const handleAddValue = () => {
    if (newLabel.trim() && newSkuCode.trim()) {
      addSpecValue(specification.id, newLabel.trim(), newSkuCode.trim())
      setNewLabel("")
      setNewSkuCode("")
      setIsAddingValue(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddValue()
    } else if (e.key === "Escape") {
      setIsAddingValue(false)
      setNewLabel("")
      setNewSkuCode("")
    }
  }

  return (
    <Reorder.Item
      value={specification}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="rounded-md border bg-card">
        {/* Header */}
        <div className="flex items-center gap-1 p-2">
          <button
            className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
            onPointerDown={(e) => dragControls.start(e)}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
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
              {specification.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {specification.values.length} value
              {specification.values.length !== 1 ? "s" : ""}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditDialogOpen(true)}
            aria-label="Edit specification"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeSpecification(specification.id)}
            aria-label="Delete specification"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

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
                {/* Values List */}
                <AnimatePresence initial={false}>
                  {specification.values.map((value) => (
                    <motion.div
                      key={value.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 group"
                    >
                      <span className="text-sm flex-1 truncate">
                        {value.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        {value.skuCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() =>
                          removeSpecValue(specification.id, value.id)
                        }
                        aria-label={`Delete ${value.label}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Value Form */}
                {isAddingValue ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 py-1"
                  >
                    <Input
                      placeholder="Label (e.g., Red)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                    <Input
                      placeholder="Code (e.g., R)"
                      value={newSkuCode}
                      onChange={(e) => setNewSkuCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm w-20 font-mono"
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleAddValue}
                      disabled={!newLabel.trim() || !newSkuCode.trim()}
                      aria-label="Confirm add value"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setIsAddingValue(false)
                        setNewLabel("")
                        setNewSkuCode("")
                      }}
                      aria-label="Cancel add value"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
                      "h-8"
                    )}
                    onClick={() => setIsAddingValue(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add value
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SpecificationForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        specification={specification}
      />
    </Reorder.Item>
  )
}
