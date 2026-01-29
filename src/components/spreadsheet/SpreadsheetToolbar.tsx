import { Undo2, Redo2, Plus, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellColorPicker } from "@/components/spreadsheet/CellColorPicker";
import { CellTextColorPicker } from "@/components/spreadsheet/CellTextColorPicker";
import { cn } from "@/lib/utils";

export interface SpreadsheetToolbarProps {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Called when undo button is clicked */
  onUndo: () => void;
  /** Called when redo button is clicked */
  onRedo: () => void;
  /** Called when add row button is clicked */
  onAddRow: () => void;
  /** Called when add column button is clicked */
  onAddColumn: () => void;
  /** Whether cells are currently selected (enables formatting options) */
  hasSelection?: boolean;
  /** Current background color of selected cells (or undefined if mixed/none) */
  selectedCellColor?: string;
  /** Called when a background color is selected */
  onCellColorChange?: (color: string | null) => void;
  /** Called when background color picker open state changes */
  onCellColorPickerOpenChange?: (open: boolean) => void;
  /** Current text color of selected cells (or undefined if mixed/none) */
  selectedTextColor?: string;
  /** Called when a text color is selected */
  onTextColorChange?: (color: string | null) => void;
  /** Called when text color picker open state changes */
  onTextColorPickerOpenChange?: (open: boolean) => void;
  /** Optional additional class name */
  className?: string;
}

/**
 * Toolbar component for spreadsheet actions
 * Includes: Undo/Redo, Add Row
 * Note: Import/Export functionality is in AppLayout header
 */
export function SpreadsheetToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
  onAddColumn,
  hasSelection = false,
  selectedCellColor,
  onCellColorChange,
  onCellColorPickerOpenChange,
  selectedTextColor,
  onTextColorChange,
  onTextColorPickerOpenChange,
  className,
}: SpreadsheetToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b bg-muted/30 px-2 py-1",
        className
      )}
      data-testid="spreadsheet-toolbar"
      data-tour="toolbar"
    >
      {/* Undo button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        data-testid="spreadsheet-toolbar-undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* Redo button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        data-testid="spreadsheet-toolbar-redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Add Row button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddRow}
        title="Add Row"
        data-testid="spreadsheet-toolbar-add-row"
      >
        <Plus className="h-4 w-4" />
        <span className="ml-1">Add Row</span>
      </Button>

      {/* Add Column button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddColumn}
        title="Add Column"
        data-testid="spreadsheet-toolbar-add-column"
        data-tour="add-column-button"
      >
        <Columns className="h-4 w-4" />
        <span className="ml-1">Add Column</span>
      </Button>

      {/* Separator before formatting options */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Cell background color picker */}
      {onCellColorChange && (
        <CellColorPicker
          disabled={!hasSelection}
          currentColor={selectedCellColor}
          onColorSelect={onCellColorChange}
          onOpenChange={onCellColorPickerOpenChange}
        />
      )}

      {/* Cell text color picker */}
      {onTextColorChange && (
        <CellTextColorPicker
          disabled={!hasSelection}
          currentColor={selectedTextColor}
          onColorSelect={onTextColorChange}
          onOpenChange={onTextColorPickerOpenChange}
        />
      )}
    </div>
  );
}
