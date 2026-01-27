/**
 * A single value within a specification (e.g., "Red" -> "R")
 */
export interface SpecValue {
  id: string;
  label: string;
  skuCode: string;
}

/**
 * A specification column (e.g., "Color" with values Red, Blue, Green)
 */
export interface Specification {
  id: string;
  name: string;
  values: SpecValue[];
  columnIndex: number;
}

/**
 * Configuration for a single spreadsheet tab
 */
export interface SheetConfig {
  id: string;
  name: string;
  data: CellData[][];
}

/**
 * Fortune-Sheet cell data structure
 */
export interface CellData {
  v?: string | number | null; // cell value
  m?: string; // display text
  ct?: { fa?: string; t?: string }; // cell type info
}

/**
 * App-wide settings for SKU generation
 */
export interface AppSettings {
  delimiter: string;
  prefix: string;
  suffix: string;
}

/**
 * Map of specification ID to selected label value
 */
export type SelectedValues = Map<string, string>;
