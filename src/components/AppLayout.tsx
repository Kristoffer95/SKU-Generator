import { useState, useRef } from "react"
import { PanelLeft, Settings, Upload, Download, FileSpreadsheet, FileText } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SettingsDialog } from "@/components/SettingsDialog"
import { exportToExcel, exportToCSV, importFromExcel } from "@/lib/import-export"
import { useSheetsStore } from "@/store/sheets"

interface AppLayoutProps {
  sidebar?: React.ReactNode
  children: React.ReactNode
}

export function AppLayout({ sidebar, children }: AppLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sheets = useSheetsStore((state) => state.sheets)
  const getActiveSheet = useSheetsStore((state) => state.getActiveSheet)

  const handleExportExcel = () => {
    exportToExcel(sheets, 'sku-data.xlsx')
  }

  const handleExportCSV = () => {
    const activeSheet = getActiveSheet()
    if (activeSheet) {
      exportToCSV(activeSheet)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const importedSheets = await importFromExcel(file)
      // Replace all sheets with imported data
      useSheetsStore.setState({ sheets: importedSheets, activeSheetId: importedSheets[0]?.id ?? null })
    } catch (error) {
      console.error('Failed to import file:', error)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar onSettingsClick={() => setSettingsOpen(true)}>{sidebar}</AppSidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">SKU Generator</h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              data-testid="file-input"
            />
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Current Sheet to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  )
}

interface AppSidebarProps {
  children?: React.ReactNode
  onSettingsClick?: () => void
}

function AppSidebar({ children, onSettingsClick }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <PanelLeft className="h-5 w-5" />
          <span className="font-semibold">Specifications</span>
        </div>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter className="border-t">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onSettingsClick}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
