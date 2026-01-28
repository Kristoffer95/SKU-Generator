import { describe, it, expect } from 'vitest';
import type { CellData, Specification, AppSettings } from '../types';
import {
  generateRowSKU,
  extractColumnHeaders,
  getRowValuesWithoutSKU,
} from './sheet-sku';

// Helper to create cell data
const cell = (value: string): CellData => ({ v: value, m: value });

// Default settings
const defaultSettings: AppSettings = {
  delimiter: '-',
  prefix: '',
  suffix: '',
};

// Sample specifications (using Specification type with order field)
const sampleSpecs: Specification[] = [
  {
    id: 'temp',
    name: 'Temperature',
    order: 0,
    values: [
      { id: 'v1', displayValue: '29deg C', skuFragment: '29C' },
      { id: 'v2', displayValue: '30deg C', skuFragment: '30C' },
    ],
  },
  {
    id: 'color',
    name: 'Color',
    order: 1,
    values: [
      { id: 'v3', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v4', displayValue: 'Blue', skuFragment: 'B' },
    ],
  },
  {
    id: 'type',
    name: 'Type',
    order: 2,
    values: [
      { id: 'v5', displayValue: 'Standard', skuFragment: 'STD' },
      { id: 'v6', displayValue: 'Premium', skuFragment: 'PRM' },
    ],
  },
];

describe('generateRowSKU', () => {
  it('generates SKU from row values using specification lookup', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      {
        id: 'color',
        name: 'Color',
        order: 0,
        values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
      },
      {
        id: 'size',
        name: 'Size',
        order: 1,
        values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }],
      },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    expect(result).toBe('R-S');
  });

  it('generates SKU matching PRD example: Red, Small -> R-S', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];

    expect(generateRowSKU(rowValues, columnHeaders, specs, defaultSettings)).toBe('R-S');
  });

  it('generates SKU for temperature example: 29deg C, Red -> 29C-R', () => {
    const rowValues = [cell('29deg C'), cell('Red')];
    const columnHeaders = ['Temperature', 'Color'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleSpecs, defaultSettings);

    expect(result).toBe('29C-R');
  });

  it('generates SKU with multiple values: 29deg C, Red, Standard -> 29C-R-STD', () => {
    const rowValues = [cell('29deg C'), cell('Red'), cell('Standard')];
    const columnHeaders = ['Temperature', 'Color', 'Type'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleSpecs, defaultSettings);

    expect(result).toBe('29C-R-STD');
  });

  it('returns empty string when no values selected', () => {
    const rowValues: CellData[] = [];
    const columnHeaders: string[] = [];

    const result = generateRowSKU(rowValues, columnHeaders, sampleSpecs, defaultSettings);

    expect(result).toBe('');
  });

  it('returns empty string when no matching values found', () => {
    const rowValues = [cell('Unknown'), cell('Invalid')];
    const columnHeaders = ['Color', 'Size'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleSpecs, defaultSettings);

    expect(result).toBe('');
  });

  it('skips empty cell values', () => {
    const rowValues = [cell('Red'), cell(''), cell('Standard')];
    const columnHeaders = ['Color', 'Size', 'Type'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
      { id: 'type', name: 'Type', order: 2, values: [{ id: 'v3', displayValue: 'Standard', skuFragment: 'STD' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    expect(result).toBe('R-STD');
  });

  it('skips columns with empty headers', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', ''];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    expect(result).toBe('R');
  });

  it('uses custom delimiter', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '_', prefix: '', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, specs, settings);

    expect(result).toBe('R_S');
  });

  it('uses empty delimiter', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '', prefix: '', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, specs, settings);

    expect(result).toBe('RS');
  });

  it('adds prefix to SKU', () => {
    const rowValues = [cell('Red')];
    const columnHeaders = ['Color'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: 'SKU-', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, specs, settings);

    expect(result).toBe('SKU-R');
  });

  it('adds suffix to SKU', () => {
    const rowValues = [cell('Red')];
    const columnHeaders = ['Color'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: '', suffix: '-2024' };

    const result = generateRowSKU(rowValues, columnHeaders, specs, settings);

    expect(result).toBe('R-2024');
  });

  it('adds both prefix and suffix', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: 'PRD-', suffix: '-V1' };

    const result = generateRowSKU(rowValues, columnHeaders, specs, settings);

    expect(result).toBe('PRD-R-S-V1');
  });

  it('handles cells with only m property', () => {
    const rowValues = [{ m: 'Red' }];
    const columnHeaders = ['Color'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    expect(result).toBe('R');
  });

  it('handles value with empty skuFragment in spec', () => {
    const rowValues = [cell('Red'), cell('Medium')];
    const columnHeaders = ['Color', 'Size'];
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 1, values: [{ id: 'v2', displayValue: 'Medium', skuFragment: '' }] }, // No skuFragment
    ];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    // Only 'R' since Medium has empty skuFragment (falsy, skipped)
    expect(result).toBe('R');
  });

  // NEW TESTS: Column order independence
  it('respects spec order field, not column order in data sheet', () => {
    // Specs have order: Color=1, Size=0 (Size should come first in SKU)
    const specs: Specification[] = [
      { id: 'color', name: 'Color', order: 1, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 0, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];
    // Data sheet has Color first, Size second
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    // SKU should be S-R (Size first because order=0)
    expect(result).toBe('S-R');
  });

  it('column order in data sheet does not affect SKU composition', () => {
    // Specs with explicit order
    const specs: Specification[] = [
      { id: 'temp', name: 'Temperature', order: 0, values: [{ id: 'v1', displayValue: '29deg C', skuFragment: '29C' }] },
      { id: 'color', name: 'Color', order: 1, values: [{ id: 'v2', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'type', name: 'Type', order: 2, values: [{ id: 'v3', displayValue: 'Standard', skuFragment: 'STD' }] },
    ];

    // Data sheet columns in different order: Type, Color, Temperature
    const rowValues = [cell('Standard'), cell('Red'), cell('29deg C')];
    const columnHeaders = ['Type', 'Color', 'Temperature'];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    // SKU should still be 29C-R-STD based on spec order (0,1,2)
    expect(result).toBe('29C-R-STD');
  });

  it('reordering columns in data sheet keeps SKU the same', () => {
    const specs: Specification[] = [
      { id: 'a', name: 'A', order: 0, values: [{ id: 'v1', displayValue: 'Val1', skuFragment: 'A1' }] },
      { id: 'b', name: 'B', order: 1, values: [{ id: 'v2', displayValue: 'Val2', skuFragment: 'B2' }] },
      { id: 'c', name: 'C', order: 2, values: [{ id: 'v3', displayValue: 'Val3', skuFragment: 'C3' }] },
    ];

    // Order 1: A, B, C
    const sku1 = generateRowSKU(
      [cell('Val1'), cell('Val2'), cell('Val3')],
      ['A', 'B', 'C'],
      specs,
      defaultSettings
    );

    // Order 2: C, A, B
    const sku2 = generateRowSKU(
      [cell('Val3'), cell('Val1'), cell('Val2')],
      ['C', 'A', 'B'],
      specs,
      defaultSettings
    );

    // Order 3: B, C, A
    const sku3 = generateRowSKU(
      [cell('Val2'), cell('Val3'), cell('Val1')],
      ['B', 'C', 'A'],
      specs,
      defaultSettings
    );

    // All should produce the same SKU
    expect(sku1).toBe('A1-B2-C3');
    expect(sku2).toBe('A1-B2-C3');
    expect(sku3).toBe('A1-B2-C3');
  });

  it('handles specs with non-contiguous order values', () => {
    const specs: Specification[] = [
      { id: 'x', name: 'X', order: 10, values: [{ id: 'v1', displayValue: 'X1', skuFragment: 'XX' }] },
      { id: 'y', name: 'Y', order: 5, values: [{ id: 'v2', displayValue: 'Y1', skuFragment: 'YY' }] },
      { id: 'z', name: 'Z', order: 20, values: [{ id: 'v3', displayValue: 'Z1', skuFragment: 'ZZ' }] },
    ];

    const rowValues = [cell('Z1'), cell('X1'), cell('Y1')];
    const columnHeaders = ['Z', 'X', 'Y'];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    // Order is: Y(5), X(10), Z(20)
    expect(result).toBe('YY-XX-ZZ');
  });

  it('only includes specs that match headers in the data sheet', () => {
    const specs: Specification[] = [
      { id: 'a', name: 'A', order: 0, values: [{ id: 'v1', displayValue: 'Val1', skuFragment: 'A1' }] },
      { id: 'b', name: 'B', order: 1, values: [{ id: 'v2', displayValue: 'Val2', skuFragment: 'B2' }] },
      { id: 'c', name: 'C', order: 2, values: [{ id: 'v3', displayValue: 'Val3', skuFragment: 'C3' }] },
    ];

    // Data sheet only has A and C columns (no B)
    const rowValues = [cell('Val1'), cell('Val3')];
    const columnHeaders = ['A', 'C'];

    const result = generateRowSKU(rowValues, columnHeaders, specs, defaultSettings);

    // SKU should be A1-C3 (B skipped because not in data sheet)
    expect(result).toBe('A1-C3');
  });
});

describe('extractColumnHeaders', () => {
  it('extracts headers excluding first column (SKU)', () => {
    const headerRow = [cell('SKU'), cell('Color'), cell('Size')];

    const result = extractColumnHeaders(headerRow);

    expect(result).toEqual(['Color', 'Size']);
  });

  it('returns empty array for empty row', () => {
    expect(extractColumnHeaders([])).toEqual([]);
  });

  it('returns empty array for single column (only SKU)', () => {
    const headerRow = [cell('SKU')];

    expect(extractColumnHeaders(headerRow)).toEqual([]);
  });

  it('handles cells with undefined values', () => {
    const headerRow = [cell('SKU'), { v: undefined }, cell('Size')];

    const result = extractColumnHeaders(headerRow);

    expect(result).toEqual(['', 'Size']);
  });
});

describe('getRowValuesWithoutSKU', () => {
  it('returns row values excluding first column (SKU)', () => {
    const row = [cell('R-S'), cell('Red'), cell('Small')];

    const result = getRowValuesWithoutSKU(row);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(cell('Red'));
    expect(result[1]).toEqual(cell('Small'));
  });

  it('returns empty array for empty row', () => {
    expect(getRowValuesWithoutSKU([])).toEqual([]);
  });

  it('returns empty array for single cell row', () => {
    expect(getRowValuesWithoutSKU([cell('SKU')])).toEqual([]);
  });
});
