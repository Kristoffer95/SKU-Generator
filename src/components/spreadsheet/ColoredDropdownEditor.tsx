import { useCallback, useEffect, useState, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SKUCell } from "@/types/spreadsheet";

/**
 * Props for the ColoredDropdownEditor component
 */
export interface ColoredDropdownEditorProps {
  /** The cell being edited */
  cell: SKUCell | undefined;
  /** Dropdown options (display values) */
  options: string[];
  /** Colors for dropdown options (displayValue -> hex color) */
  colors: Record<string, string>;
  /** Callback to update the cell value */
  onChange: (cell: SKUCell) => void;
  /** Callback to exit edit mode */
  exitEditMode: () => void;
}

/**
 * Custom colored dropdown editor for react-spreadsheet
 * Renders a dropdown menu with colored backgrounds for each option
 * using shadcn/ui DropdownMenu component
 */
export function ColoredDropdownEditor({
  cell,
  options,
  colors,
  onChange,
  exitEditMode,
}: ColoredDropdownEditorProps) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentValue = cell?.value ?? "";

  // Auto-open and focus on mount
  useEffect(() => {
    // Focus the trigger to enable keyboard navigation
    triggerRef.current?.focus();
  }, []);

  // Handle selecting an option
  const handleSelect = useCallback(
    (value: string) => {
      onChange({ ...cell, value });
      setOpen(false);
      // Exit edit mode after a brief delay to allow the value to be set
      setTimeout(() => {
        exitEditMode();
      }, 0);
    },
    [cell, onChange, exitEditMode]
  );

  // Handle clearing selection
  const handleClear = useCallback(() => {
    onChange({ ...cell, value: null });
    setOpen(false);
    setTimeout(() => {
      exitEditMode();
    }, 0);
  }, [cell, onChange, exitEditMode]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        exitEditMode();
      } else if (event.key === "Tab") {
        setOpen(false);
        exitEditMode();
      }
    },
    [exitEditMode]
  );

  // Handle dropdown open state change
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        exitEditMode();
      }
    },
    [exitEditMode]
  );

  // Get color for current value to display in trigger
  const currentColor = currentValue ? colors[String(currentValue)] : undefined;

  return (
    <div
      className="Spreadsheet__data-editor w-full h-full"
      onKeyDown={handleKeyDown}
      data-testid="colored-dropdown-editor"
    >
      <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            className="flex items-center justify-between w-full h-full px-2 text-sm bg-white border-none outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: currentColor || "white",
            }}
            data-testid="colored-dropdown-trigger"
          >
            <span className="truncate">
              {currentValue ? String(currentValue) : "Select..."}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] p-1"
          data-testid="colored-dropdown-content"
        >
          {/* Clear option */}
          <DropdownMenuItem
            onClick={handleClear}
            className="cursor-pointer"
            data-testid="colored-dropdown-clear"
          >
            <span className="text-muted-foreground">Clear selection</span>
          </DropdownMenuItem>
          {/* Options with colors */}
          {options.map((option) => {
            const optionColor = colors[option];
            const isSelected = String(currentValue) === option;
            return (
              <DropdownMenuItem
                key={option}
                onClick={() => handleSelect(option)}
                className="cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: optionColor || "transparent",
                }}
                data-testid={`colored-dropdown-option-${option}`}
              >
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
                <span className={isSelected ? "font-medium" : ""}>
                  {option}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
