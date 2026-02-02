import { useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { SpecificationList } from "@/components/SpecificationList"
import { SpreadsheetContainer } from "@/components/SpreadsheetContainer"
import { useSheetsStore } from "@/store/sheets"
import { hasTourCompleted, startGuidedTour } from "@/lib/guided-tour"
import { useSkuReactivity } from "@/lib/use-sku-reactivity"

function App() {
  const initializeWithSampleData = useSheetsStore(s => s.initializeWithSampleData)

  // Watch for specification changes and regenerate SKUs automatically
  useSkuReactivity()

  // Initialize with sample data on first launch, or Config sheet if sheets already exist
  useEffect(() => {
    initializeWithSampleData()
  }, [initializeWithSampleData])

  // Auto-start guided tour on first page load
  useEffect(() => {
    if (!hasTourCompleted("basic")) {
      // Delay to ensure all elements are rendered before starting tour
      const timeout = setTimeout(() => {
        startGuidedTour()
      }, 750)
      return () => clearTimeout(timeout)
    }
  }, [])

  return (
    <AppLayout sidebar={<SpecificationList />}>
      <div className="flex-1 overflow-hidden">
        <SpreadsheetContainer />
      </div>
    </AppLayout>
  )
}

export default App
