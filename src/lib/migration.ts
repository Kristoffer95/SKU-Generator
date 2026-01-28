import type { ParsedSpec, Specification, CellData } from '../types';
import { parseConfigSheet } from './config-sheet';

const generateId = () => crypto.randomUUID();

/**
 * Convert ParsedSpec[] (from Config sheet) to Specification[] (store format)
 * Assigns sequential order values based on array position.
 */
export function convertParsedSpecsToSpecifications(parsedSpecs: ParsedSpec[]): Specification[] {
  return parsedSpecs.map((spec, index) => ({
    id: generateId(),
    name: spec.name,
    order: index,
    values: spec.values.map((value) => ({
      id: generateId(),
      displayValue: value.label,
      skuFragment: value.skuCode,
    })),
  }));
}

/**
 * Migrate Config sheet data to specifications store format.
 * Returns the migrated specifications or null if no valid data.
 */
export function migrateConfigSheetData(configSheetData: CellData[][]): Specification[] | null {
  const parsedSpecs = parseConfigSheet(configSheetData);

  if (parsedSpecs.length === 0) {
    return null;
  }

  return convertParsedSpecsToSpecifications(parsedSpecs);
}
