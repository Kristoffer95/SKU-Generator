import { HelpCircle, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  startGuidedTour,
  getTourState,
  resetTourState,
  TourType,
} from "@/lib/guided-tour"
import { useState, useEffect } from "react"

interface GuidedTourButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function GuidedTourButton({
  variant = "outline",
  size = "sm",
  className,
}: GuidedTourButtonProps) {
  const [tourState, setTourState] = useState(getTourState)

  // Refresh tour state when dropdown opens
  const refreshTourState = () => {
    setTourState(getTourState())
  }

  // Also refresh on mount
  useEffect(() => {
    refreshTourState()
  }, [])

  const handleStartTour = (type: TourType) => {
    startGuidedTour(type, () => {
      // Refresh state after tour completes
      setTourState(getTourState())
    })
  }

  const handleResetProgress = () => {
    resetTourState()
    setTourState(getTourState())
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && refreshTourState()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          data-testid="start-tour-button"
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Tour
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleStartTour("basic")}
          data-testid="tour-option-basic"
        >
          <span className="flex-1">Basic Tour</span>
          {tourState.basicCompleted && (
            <Check className="h-4 w-4 ml-2 text-green-500" data-testid="basic-tour-checkmark" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStartTour("advanced")}
          data-testid="tour-option-advanced"
        >
          <span className="flex-1">Advanced Tour</span>
          {tourState.advancedCompleted && (
            <Check className="h-4 w-4 ml-2 text-green-500" data-testid="advanced-tour-checkmark" />
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleResetProgress}
          data-testid="tour-option-reset"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Tour Progress
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
