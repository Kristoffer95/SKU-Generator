import { useState } from "react"
import { BookOpen, Zap, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TourType, updateTourState } from "@/lib/guided-tour"

interface TourSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTour: (tourType: TourType) => void
}

export function TourSelectionModal({
  open,
  onOpenChange,
  onSelectTour,
}: TourSelectionModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false)

  const handleClose = () => {
    if (neverShowAgain) {
      updateTourState({ neverShowModal: true })
    }
    onOpenChange(false)
  }

  const handleSelectTour = (tourType: TourType) => {
    if (neverShowAgain) {
      updateTourState({ neverShowModal: true })
    }
    onSelectTour(tourType)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[700px]"
        data-testid="tour-selection-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to SKU Generator!</DialogTitle>
          <DialogDescription>
            Get started with an interactive tutorial to learn how to use the app.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          {/* Basic Tour Card */}
          <Card
            className="relative cursor-pointer transition-all hover:border-primary hover:shadow-md"
            data-testid="basic-tour-card"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Basic Tour</CardTitle>
              </div>
              <CardDescription>
                Learn the core workflow in 18 steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>App structure overview</li>
                <li>Creating specifications</li>
                <li>Adding columns to spreadsheet</li>
                <li>Auto-generating SKU codes</li>
                <li>Configuring SKU format</li>
                <li>Managing multiple sheets</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleSelectTour("basic")}
                data-testid="start-basic-tour"
              >
                Start Basic Tour
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Tour Card */}
          <Card
            className="relative cursor-pointer transition-all hover:border-primary hover:shadow-md"
            data-testid="advanced-tour-card"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Advanced Tour</CardTitle>
              </div>
              <CardDescription>
                Master all features in 28 steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Toolbar controls and formatting</li>
                <li>Column and row operations</li>
                <li>Drag-to-reorder and pinning</li>
                <li>Import and export options</li>
                <li>Validation panel</li>
                <li>Keyboard shortcuts</li>
              </ul>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleSelectTour("advanced")}
                data-testid="start-advanced-tour"
              >
                Start Advanced Tour
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="never-show-again"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              data-testid="never-show-checkbox"
            />
            <Label
              htmlFor="never-show-again"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don&apos;t show this again
            </Label>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground underline cursor-pointer mx-auto"
            data-testid="skip-tour-link"
          >
            Skip for now
          </button>
        </div>

        {/* Custom close button to ensure it's visible */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
          data-testid="close-modal-button"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}
