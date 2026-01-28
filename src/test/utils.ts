/**
 * Test utilities for creating SheetConfig objects with required fields
 */
import type { SheetConfig, CellData, ColumnDef, Specification, SheetType } from '../types';

/**
 * Creates a test sheet with the required columns and specifications fields
 * Use this instead of creating SheetConfig objects directly in tests
 */
export function createTestSheet(overrides: {
  id?: string;
  name?: string;
  type?: SheetType;
  data?: CellData[][];
  columns?: ColumnDef[];
  specifications?: Specification[];
} = {}): SheetConfig {
  return {
    id: overrides.id ?? 'test-sheet-id',
    name: overrides.name ?? 'Test Sheet',
    type: overrides.type ?? 'data',
    data: overrides.data ?? [],
    columns: overrides.columns ?? [],
    specifications: overrides.specifications ?? [],
  };
}

/**
 * Creates default columns from specifications (SKU column + spec columns)
 */
export function createTestColumns(specifications: Specification[]): ColumnDef[] {
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);
  const columns: ColumnDef[] = [
    { id: 'sku-col', type: 'sku', header: 'SKU' },
  ];
  for (const spec of sortedSpecs) {
    columns.push({
      id: `col-${spec.id}`,
      type: 'spec',
      specId: spec.id,
      header: spec.name,
    });
  }
  return columns;
}
