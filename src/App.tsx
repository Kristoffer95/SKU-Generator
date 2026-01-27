import { useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { SpecificationList } from "@/components/SpecificationList"
import { SpreadsheetContainer } from "@/components/SpreadsheetContainer"
import { useSheetsStore } from "@/store/sheets"

function App() {
  const initializeWithConfigSheet = useSheetsStore(s => s.initializeWithConfigSheet)

  // Initialize Config sheet on app start
  useEffect(() => {
    initializeWithConfigSheet()
  }, [initializeWithConfigSheet])

  return (
    <AppLayout sidebar={<SpecificationList />}>
      <div className="flex-1 overflow-hidden">
        <SpreadsheetContainer />
      </div>
    </AppLayout>
  )
}

export default App
