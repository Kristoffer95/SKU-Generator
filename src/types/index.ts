/**
 * A single row in the Config sheet defining a specification value
 * Each row maps: Specification name -> Value label -> SKU code
 */
export interface ConfigRow {
  specification: string;
  value: string;
  skuCode: string;
}

/**
 * A single value within a parsed specification
 */
export interface ParsedSpecValue {
  label: string;
  skuCode: string;
}

/**
 * A specification parsed from Config sheet data
 * Groups all values that share the same specification name
 */
export interface ParsedSpec {
  name: string;
  values: ParsedSpecValue[];
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
 * Type discriminator for sheet types
 */
export type SheetType = 'config' | 'data';

/**
 * Configuration for a single spreadsheet tab
 */
export interface SheetConfig {
  id: string;
  name: string;
  type: SheetType;
  data: CellData[][];
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
 * Map of specification name to selected value label
 */
export type SelectedValues = Map<string, string>;

// Legacy interfaces kept for backwards compatibility during migration
// TODO: Remove after migration to Config sheet approach

/**
 * @deprecated Use ConfigRow and ParsedSpec instead
 */
export interface SpecValue {
  id: string;
  label: string;
  skuCode: string;
}

/**
 * @deprecated Use ParsedSpec instead - specs now live in Config sheet
 */
export interface Specification {
  id: string;
  name: string;
  values: SpecValue[];
  columnIndex: number;
}
