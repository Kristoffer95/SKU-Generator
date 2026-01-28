import { useState, useMemo, useEffect, useCallback } from "react"
import { Plus, ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useSpecificationsStore } from "@/store/specifications"
import { AddSpecDialog } from "@/components/AddSpecDialog"
import { registerTourDialogOpeners, unregisterTourDialogOpeners } from "@/lib/guided-tour"
import type { Specification } from "@/types"

interface SpecItemProps {
  spec: Specification
  isFirst?: boolean
}

function SpecItem({ spec, isFirst }: SpecItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
      {...(isFirst ? { "data-tour": "spec-item" } : {})}
    >
      <div className="rounded-md border bg-card">
        {/* Header */}
        <div className="flex items-center gap-1 p-2">
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
                {spec.values.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    No values defined
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {spec.values.map((value) => (
                      <motion.div
                        key={value.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
                      >
                        <span className="text-sm flex-1 truncate">
                          {value.displayValue}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {value.skuFragment || "-"}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function SpecificationList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const specifications = useSpecificationsStore((state) => state.specifications)

  // Sort specifications by order field (lowest first)
  const sortedSpecifications = useMemo(() => {
    return [...specifications].sort((a, b) => a.order - b.order)
  }, [specifications])

  // Callbacks for tour dialog openers
  const openAddSpecDialog = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  const closeAllDialogs = useCallback(() => {
    setIsAddDialogOpen(false)
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
          <div className="p-2 space-y-1">
            <AnimatePresence initial={false}>
              {sortedSpecifications.map((spec, index) => (
                <SpecItem
                  key={spec.id}
                  spec={spec}
                  isFirst={index === 0}
                />
              ))}
            </AnimatePresence>
          </div>
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
    </div>
  )
}
