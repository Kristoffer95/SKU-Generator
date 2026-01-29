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
  bg?: string; // background color (hex)
  fc?: string; // font/text color (hex)
}

/**
 * Type discriminator for sheet types
 */
export type SheetType = 'config' | 'data';

/**
 * Configuration for a single spreadsheet tab
 * Each sheet has its own local specifications and columns
 */
export interface SheetConfig {
  id: string;
  name: string;
  type: SheetType;
  data: CellData[][];
  columns: ColumnDef[];          // Column definitions for this sheet
  specifications: Specification[]; // Specifications local to this sheet
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

/**
 * A single value within a specification
 * Maps a user-facing display value to its SKU fragment code
 */
export interface SpecValue {
  id: string;
  displayValue: string;
  skuFragment: string;
}

/**
 * A specification that defines a product attribute with its possible values
 * order field determines the position in SKU generation (lower = earlier in SKU)
 */
export interface Specification {
  id: string;
  name: string;
  order: number;
  values: SpecValue[];
}

/**
 * Column type discriminator
 * - 'sku': The auto-generated SKU column (always first)
 * - 'spec': A specification column linked to a Specification via specId
 * - 'free': A free-text column (no dropdown, no SKU contribution)
 */
export type ColumnType = 'sku' | 'spec' | 'free';

/**
 * Definition of a column in the spreadsheet
 * Each sheet has its own columns array defining the column structure
 */
export interface ColumnDef {
  id: string;
  type: ColumnType;
  specId?: string;  // Required when type is 'spec', references a Specification.id
  header: string;   // Column header text
  width?: number;   // Column width in pixels (default: 120, min: 80)
}
