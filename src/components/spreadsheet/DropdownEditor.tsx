import { useCallback, useEffect, useRef } from "react";
import type { SKUCell } from "@/types/spreadsheet";

/**
 * Point in the spreadsheet grid
 */
interface Point {
  row: number;
  column: number;
}

/**
 * Props for the DataEditor component
 * Based on react-spreadsheet's DataEditorProps interface
 */
export interface DropdownEditorProps extends Point {
  /** The cell being edited */
  cell: SKUCell | undefined;
  /** Callback to update the cell value */
  onChange: (cell: SKUCell) => void;
  /** Callback to exit edit mode */
  exitEditMode: () => void;
}

/**
 * Custom DataEditor component for react-spreadsheet
 * Renders a dropdown <select> when cell has dropdownOptions,
 * otherwise renders a text <input>
 */
export function DropdownEditor({
  cell,
  onChange,
  exitEditMode,
}: DropdownEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasDropdownOptions =
    cell?.dropdownOptions && cell.dropdownOptions.length > 0;

  // Auto-focus on mount
  useEffect(() => {
    if (hasDropdownOptions) {
      selectRef.current?.focus();
    } else {
      inputRef.current?.focus();
      // Move cursor to end for text input
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [hasDropdownOptions]);

  // Handle select change
  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = event.target.value;
      onChange({ ...cell, value: newValue });
    },
    [cell, onChange]
  );

  // Handle text input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...cell, value: event.target.value });
    },
    [cell, onChange]
  );

  // Handle keyboard events for UX
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Tab") {
        // Commit value and exit edit mode
        // Note: Tab navigation is handled by the spreadsheet component
        exitEditMode();
      } else if (event.key === "Escape") {
        // Cancel edit and exit
        exitEditMode();
      }
    },
    [exitEditMode]
  );

  const currentValue = cell?.value ?? "";

  // Render dropdown select if cell has dropdown options
  if (hasDropdownOptions) {
    return (
      <div className="Spreadsheet__data-editor">
        <select
          ref={selectRef}
          value={String(currentValue)}
          onChange={handleSelectChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full border-none outline-none bg-white focus:ring-2 focus:ring-blue-500"
          data-testid="dropdown-editor-select"
        >
          {/* Empty option for clearing selection */}
          <option value="">Select...</option>
          {cell.dropdownOptions?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Render text input as fallback
  return (
    <div className="Spreadsheet__data-editor">
      <input
        ref={inputRef}
        type="text"
        value={String(currentValue)}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full h-full border-none outline-none"
        data-testid="dropdown-editor-input"
      />
    </div>
  );
}
