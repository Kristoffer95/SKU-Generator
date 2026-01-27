import { useState } from "react"
import { Plus } from "lucide-react"
import { AnimatePresence, motion, Reorder } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useSpecificationsStore } from "@/store/specifications"
import { SpecificationItem } from "./SpecificationItem"
import { SpecificationForm } from "./SpecificationForm"

export function SpecificationList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { specifications, reorderSpecifications } = useSpecificationsStore()

  const handleReorder = (newOrder: typeof specifications) => {
    const oldIndices = specifications.map((s) => s.id)
    const newIndices = newOrder.map((s) => s.id)

    // Find what moved
    for (let i = 0; i < oldIndices.length; i++) {
      if (oldIndices[i] !== newIndices[i]) {
        const movedId = newIndices[i]
        const fromIndex = oldIndices.indexOf(movedId)
        reorderSpecifications(fromIndex, i)
        break
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {specifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 text-center text-sm text-muted-foreground"
          >
            No specifications yet.
            <br />
            Add one to get started.
          </motion.div>
        ) : (
          <Reorder.Group
            axis="y"
            values={specifications}
            onReorder={handleReorder}
            className="p-2 space-y-1"
          >
            <AnimatePresence initial={false}>
              {specifications.map((spec) => (
                <SpecificationItem key={spec.id} specification={spec} />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>
      <div className="p-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Specification
        </Button>
      </div>
      <SpecificationForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
