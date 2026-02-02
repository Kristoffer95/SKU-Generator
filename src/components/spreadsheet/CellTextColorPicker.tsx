import { Type, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

/**
 * Prevent focus from leaving the spreadsheet when clicking color picker buttons
 * This preserves cell selection after applying colors
 */
function preventFocusLoss(e: React.MouseEvent) {
  e.preventDefault()
}

/**
 * Predefined color palette for cell text colors
 * Colors are darker/more saturated than background colors to ensure readability
 */
const TEXT_COLOR_PALETTE = [
  // Row 1: Dark basics
  "#000000", // Black
  "#374151", // Gray-700
  "#6b7280", // Gray-500
  "#dc2626", // Red-600
  "#ea580c", // Orange-600
  "#ca8a04", // Yellow-600
  // Row 2: Rich colors
  "#16a34a", // Green-600
  "#0891b2", // Cyan-600
  "#2563eb", // Blue-600
  "#7c3aed", // Violet-600
  "#c026d3", // Fuchsia-600
  "#db2777", // Pink-600
  // Row 3: Darker variants
  "#1e3a8a", // Blue-900
  "#166534", // Green-800
  "#7f1d1d", // Red-900
  "#78350f", // Amber-900
  "#581c87", // Purple-900
  "#701a75", // Fuchsia-900
]

export interface CellTextColorPickerProps {
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Current color value (hex) or undefined if no cells selected or mixed colors */
  currentColor?: string
  /** Called when a color is selected */
  onColorSelect: (color: string | null) => void
  /** Called when the dropdown open state changes - use to preserve selection state */
  onOpenChange?: (open: boolean) => void
  /** Optional additional class name */
  className?: string
}

/**
 * Color picker component for selecting cell text/font colors
 * Shows a dropdown with color swatches and a clear option
 */
export function CellTextColorPicker({
  disabled = false,
  currentColor,
  onColorSelect,
  onOpenChange,
  className,
}: CellTextColorPickerProps) {
  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="Text color"
          className={className}
          data-testid="cell-text-color-picker-trigger"
          data-tour="text-color"
          onMouseDown={preventFocusLoss}
        >
          <div className="relative">
            <Type className="h-4 w-4" />
            {/* Color indicator bar under the icon */}
            <div
              className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm"
              style={{
                backgroundColor: currentColor || "transparent",
                border: currentColor ? "none" : "1px dashed currentColor",
              }}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="p-2"
        data-testid="cell-text-color-picker-dropdown"
      >
        {/* Clear color button */}
        <button
          type="button"
          onClick={() => onColorSelect(null)}
          onMouseDown={preventFocusLoss}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          data-testid="cell-text-color-clear"
        >
          <Ban className="h-4 w-4" />
          <span>Clear text color</span>
        </button>

        {/* Color grid */}
        <div className="mt-2 grid grid-cols-6 gap-1" data-testid="cell-text-color-grid">
          {TEXT_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onColorSelect(color)}
              onMouseDown={preventFocusLoss}
              className="h-6 w-6 rounded-sm border border-border hover:ring-2 hover:ring-ring hover:ring-offset-1"
              style={{ backgroundColor: color }}
              title={color}
              data-testid={`cell-text-color-swatch-${color.replace("#", "")}`}
              aria-label={`Select text color ${color}`}
            >
              {currentColor === color && (
                <span
                  className="flex h-full w-full items-center justify-center text-xs font-bold"
                  style={{
                    // Use white or black check based on color brightness
                    color: isLightColor(color) ? "#000000" : "#ffffff",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Determine if a hex color is light (for contrast calculation)
 */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Using luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

/** Export the color palette for use in tests */
export { TEXT_COLOR_PALETTE }
