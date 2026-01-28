import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startGuidedTour } from "@/lib/guided-tour"

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
  const handleClick = () => {
    startGuidedTour()
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
      data-testid="start-tour-button"
    >
      <HelpCircle className="h-4 w-4 mr-1" />
      Tour
    </Button>
  )
}
