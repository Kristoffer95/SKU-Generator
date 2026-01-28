/**
 * Base cell type from react-spreadsheet
 * Defined here for type safety before react-spreadsheet is installed
 * This matches the CellBase interface from react-spreadsheet
 */
export type CellBase<Value = unknown> = {
  /** Whether the cell should not be editable */
  readOnly?: boolean;
  /** Class to be given for the cell element */
  className?: string;
  /** The value of the cell */
  value: Value;
};

/**
 * Extended cell type for the SKU spreadsheet
 * Extends react-spreadsheet's CellBase with additional properties
 * for dropdown selection and styling
 */
export interface SKUCell extends CellBase<string | number | null> {
  /** The cell value (string, number, or null) */
  value: string | number | null;
  /** Whether the cell is read-only (used for SKU column) */
  readOnly?: boolean;
  /** CSS class name for styling (e.g., duplicate highlight) */
  className?: string;
  /** Dropdown options for spec columns (undefined for non-dropdown cells) */
  dropdownOptions?: string[];
}

/**
 * 2D matrix of SKU cells representing spreadsheet data
 * Cells can be null to represent empty/undefined cells
 */
export type SKUMatrix = (SKUCell | null)[][];
