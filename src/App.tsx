import { AppLayout } from "@/components/AppLayout"

function App() {
  return (
    <AppLayout
      sidebar={
        <div className="p-4 text-sm text-muted-foreground">
          Specifications will appear here
        </div>
      }
    >
      <div className="flex-1 p-4">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Spreadsheet will appear here
        </div>
      </div>
    </AppLayout>
  )
}

export default App
