import { Undo2, Redo2, Plus, Columns, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellColorPicker } from "@/components/spreadsheet/CellColorPicker";
import { CellTextColorPicker } from "@/components/spreadsheet/CellTextColorPicker";
import { cn } from "@/lib/utils";
import type { CellTextAlign } from "@/types";

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
  /** Whether selected cells are bold (or undefined if mixed) */
  isBold?: boolean;
  /** Called when bold button is clicked */
  onBoldChange?: (bold: boolean) => void;
  /** Whether selected cells are italic (or undefined if mixed) */
  isItalic?: boolean;
  /** Called when italic button is clicked */
  onItalicChange?: (italic: boolean) => void;
  /** Current text alignment of selected cells (or undefined if mixed) */
  textAlign?: CellTextAlign;
  /** Called when alignment button is clicked */
  onAlignChange?: (align: CellTextAlign) => void;
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
  isBold,
  onBoldChange,
  isItalic,
  onItalicChange,
  textAlign,
  onAlignChange,
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

      {/* Separator before text formatting options */}
      {(onBoldChange || onItalicChange || onAlignChange) && (
        <div className="mx-1 h-6 w-px bg-border" />
      )}

      {/* Bold button */}
      {onBoldChange && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBoldChange(!isBold)}
          disabled={!hasSelection}
          title="Bold"
          data-testid="spreadsheet-toolbar-bold"
          className={cn(isBold && hasSelection && "bg-accent")}
        >
          <Bold className="h-4 w-4" />
        </Button>
      )}

      {/* Italic button */}
      {onItalicChange && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onItalicChange(!isItalic)}
          disabled={!hasSelection}
          title="Italic"
          data-testid="spreadsheet-toolbar-italic"
          className={cn(isItalic && hasSelection && "bg-accent")}
        >
          <Italic className="h-4 w-4" />
        </Button>
      )}

      {/* Alignment buttons */}
      {onAlignChange && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAlignChange("left")}
            disabled={!hasSelection}
            title="Align Left"
            data-testid="spreadsheet-toolbar-align-left"
            className={cn(textAlign === "left" && hasSelection && "bg-accent")}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAlignChange("center")}
            disabled={!hasSelection}
            title="Align Center"
            data-testid="spreadsheet-toolbar-align-center"
            className={cn(textAlign === "center" && hasSelection && "bg-accent")}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAlignChange("right")}
            disabled={!hasSelection}
            title="Align Right"
            data-testid="spreadsheet-toolbar-align-right"
            className={cn(textAlign === "right" && hasSelection && "bg-accent")}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
