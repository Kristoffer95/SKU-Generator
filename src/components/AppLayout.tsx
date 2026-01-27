import { useState } from "react"
import { PanelLeft, Settings } from "lucide-react"
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
import { SettingsDialog } from "@/components/SettingsDialog"

interface AppLayoutProps {
  sidebar?: React.ReactNode
  children: React.ReactNode
}

export function AppLayout({ sidebar, children }: AppLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar onSettingsClick={() => setSettingsOpen(true)}>{sidebar}</AppSidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">SKU Generator</h1>
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
