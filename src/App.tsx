import { AppLayout } from "@/components/AppLayout"
import { SpecificationList } from "@/components/SpecificationList"

function App() {
  return (
    <AppLayout sidebar={<SpecificationList />}>
      <div className="flex-1 p-4">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Spreadsheet will appear here
        </div>
      </div>
    </AppLayout>
  )
}

export default App
