import { useCallback } from "react";
import type { SKUCell } from "@/types/spreadsheet";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the CheckboxCell DataViewer component
 * Based on react-spreadsheet's DataViewerProps interface
 */
export interface CheckboxCellProps {
  /** The cell being viewed */
  cell: SKUCell | undefined;
  /** Row index */
  row: number;
  /** Column index */
  column: number;
}

/**
 * Default data viewer that renders cell value as text
 * Used when cell is not a checkbox type
 */
function DefaultDataViewer({ cell }: CheckboxCellProps): React.ReactElement {
  const value = cell?.value ?? "";
  return <span>{String(value)}</span>;
}

/**
 * Custom DataViewer component for react-spreadsheet
 * Renders a checkbox for cells with checkbox=true,
 * otherwise renders the default text display
 */
export function CheckboxCell(props: CheckboxCellProps): React.ReactElement {
  const { cell } = props;

  // If not a checkbox cell, use default text rendering
  if (!cell?.checkbox) {
    return <DefaultDataViewer {...props} />;
  }

  const isChecked = cell.value === true;

  return (
    <div
      className="flex items-center justify-center w-full h-full cursor-pointer"
      data-testid="checkbox-cell"
      data-checkbox="true"
      data-checked={isChecked}
    >
      <div
        className={cn(
          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
          isChecked
            ? "bg-primary border-primary"
            : "bg-background border-muted-foreground/50 hover:border-muted-foreground"
        )}
      >
        {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
    </div>
  );
}

/**
 * Factory function to create a CheckboxCell component with onClick handler
 * The onClick handler is used to toggle checkbox value from outside the component
 * This is needed because DataViewer components shouldn't directly modify cell values
 */
export function createCheckboxCellViewer(
  onCheckboxClick?: (row: number, column: number, currentValue: boolean) => void
): React.FC<CheckboxCellProps> {
  return function CheckboxCellWithHandler(props: CheckboxCellProps): React.ReactElement {
    const { cell, row, column } = props;

    // Handle click to toggle checkbox
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (cell?.checkbox && onCheckboxClick) {
          e.stopPropagation();
          e.preventDefault();
          onCheckboxClick(row, column, cell.value === true);
        }
      },
      [cell, row, column]
    );

    // If not a checkbox cell, use default text rendering
    if (!cell?.checkbox) {
      return <DefaultDataViewer {...props} />;
    }

    const isChecked = cell.value === true;

    return (
      <div
        className="flex items-center justify-center w-full h-full cursor-pointer"
        onClick={handleClick}
        data-testid="checkbox-cell"
        data-checkbox="true"
        data-checked={isChecked}
      >
        <div
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
            isChecked
              ? "bg-primary border-primary"
              : "bg-background border-muted-foreground/50 hover:border-muted-foreground"
          )}
        >
          {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
    );
  };
}
