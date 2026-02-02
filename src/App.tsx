import { useEffect, useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { SpecificationList } from "@/components/SpecificationList"
import { SpreadsheetContainer } from "@/components/SpreadsheetContainer"
import { TourSelectionModal } from "@/components/TourSelectionModal"
import { useSheetsStore } from "@/store/sheets"
import { getTourState, startGuidedTour, TourType } from "@/lib/guided-tour"
import { useSkuReactivity } from "@/lib/use-sku-reactivity"

function App() {
  const initializeWithSampleData = useSheetsStore(s => s.initializeWithSampleData)
  const [showTourModal, setShowTourModal] = useState(false)

  // Watch for specification changes and regenerate SKUs automatically
  useSkuReactivity()

  // Initialize with sample data on first launch, or Config sheet if sheets already exist
  useEffect(() => {
    initializeWithSampleData()
  }, [initializeWithSampleData])

  // Show tour selection modal for first-time users
  useEffect(() => {
    const tourState = getTourState()
    // Show modal if neither tour completed and user hasn't opted out
    if (!tourState.basicCompleted && !tourState.advancedCompleted && !tourState.neverShowModal) {
      // Delay to ensure all elements are rendered before showing modal
      const timeout = setTimeout(() => {
        setShowTourModal(true)
      }, 750)
      return () => clearTimeout(timeout)
    }
  }, [])

  const handleSelectTour = (tourType: TourType) => {
    setShowTourModal(false)
    // Small delay to allow modal close animation before starting tour
    setTimeout(() => {
      startGuidedTour(tourType)
    }, 100)
  }

  return (
    <>
      <AppLayout sidebar={<SpecificationList />}>
        <div className="flex-1 overflow-hidden">
          <SpreadsheetContainer />
        </div>
      </AppLayout>
      <TourSelectionModal
        open={showTourModal}
        onOpenChange={setShowTourModal}
        onSelectTour={handleSelectTour}
      />
    </>
  )
}

export default App
