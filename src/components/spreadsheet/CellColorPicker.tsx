import { Paintbrush, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

/**
 * Predefined color palette for cell backgrounds
 * Colors are chosen to be easily distinguishable and not clash with
 * read-only (gray-blue #f1f5f9) or duplicate warning (amber #fef3c7) styling
 */
const COLOR_PALETTE = [
  // Row 1: Light pastels
  "#fce4ec", // Light pink
  "#fff3e0", // Light orange
  "#fffde7", // Light yellow
  "#e8f5e9", // Light green
  "#e3f2fd", // Light blue
  "#f3e5f5", // Light purple
  // Row 2: Medium pastels
  "#f8bbd0", // Pink
  "#ffcc80", // Orange
  "#fff59d", // Yellow
  "#a5d6a7", // Green
  "#90caf9", // Blue
  "#ce93d8", // Purple
  // Row 3: Stronger colors
  "#f48fb1", // Strong pink
  "#ffb74d", // Strong orange
  "#fff176", // Strong yellow
  "#81c784", // Strong green
  "#64b5f6", // Strong blue
  "#ba68c8", // Strong purple
]

export interface CellColorPickerProps {
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
 * Color picker component for selecting cell background colors
 * Shows a dropdown with color swatches and a clear option
 */
export function CellColorPicker({
  disabled = false,
  currentColor,
  onColorSelect,
  onOpenChange,
  className,
}: CellColorPickerProps) {
  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="Cell background color"
          className={className}
          data-testid="cell-color-picker-trigger"
        >
          <div className="relative">
            <Paintbrush className="h-4 w-4" />
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
        data-testid="cell-color-picker-dropdown"
      >
        {/* Clear color button */}
        <button
          type="button"
          onClick={() => onColorSelect(null)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          data-testid="cell-color-clear"
        >
          <Ban className="h-4 w-4" />
          <span>Clear color</span>
        </button>

        {/* Color grid */}
        <div className="mt-2 grid grid-cols-6 gap-1" data-testid="cell-color-grid">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onColorSelect(color)}
              className="h-6 w-6 rounded-sm border border-border hover:ring-2 hover:ring-ring hover:ring-offset-1"
              style={{ backgroundColor: color }}
              title={color}
              data-testid={`cell-color-swatch-${color.replace("#", "")}`}
              aria-label={`Select color ${color}`}
            >
              {currentColor === color && (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-800">
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

/** Export the color palette for use in tests */
export { COLOR_PALETTE }
