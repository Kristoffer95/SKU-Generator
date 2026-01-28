import { describe, it, expect } from 'vitest';
import { validateDataSheet } from './validation';
import type { CellData, Specification } from '../types';

// Helper to create cell data
const cell = (value: string): CellData => ({ v: value, m: value });

// Sample specifications for testing
const createSampleSpecs = (): Specification[] => [
  {
    id: 'spec-color',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
      { id: 'v3', displayValue: 'Green', skuFragment: 'G' },
    ],
  },
  {
    id: 'spec-size',
    name: 'Size',
    order: 1,
    values: [
      { id: 'v4', displayValue: 'Small', skuFragment: 'S' },
      { id: 'v5', displayValue: 'Medium', skuFragment: 'M' },
      { id: 'v6', displayValue: 'Large', skuFragment: 'L' },
    ],
  },
];

describe('validateDataSheet', () => {
  it('returns empty array for empty data', () => {
    const errors = validateDataSheet([], createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('returns empty array for header-only data', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
    ];
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('returns empty array when all values are valid', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell('R-S'), cell('Red'), cell('Small')],
      [cell('B-M'), cell('Blue'), cell('Medium')],
      [cell('G-L'), cell('Green'), cell('Large')],
    ];
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('detects value that no longer exists in specification', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell('R-S'), cell('Red'), cell('Small')],
      [cell('Y-M'), cell('Yellow'), cell('Medium')], // Yellow is not a valid Color
    ];
    const errors = validateDataSheet(data, createSampleSpecs());

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      row: 2,
      column: 1,
      message: 'Value "Yellow" does not exist in specification "Color"',
      type: 'missing-value',
    });
  });

  it('detects multiple missing values in the same row', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell(''), cell('Purple'), cell('XL')], // Both invalid
    ];
    const errors = validateDataSheet(data, createSampleSpecs());

    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      row: 1,
      column: 1,
      message: 'Value "Purple" does not exist in specification "Color"',
      type: 'missing-value',
    });
    expect(errors[1]).toEqual({
      row: 1,
      column: 2,
      message: 'Value "XL" does not exist in specification "Size"',
      type: 'missing-value',
    });
  });

  it('detects missing values across multiple rows', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell(''), cell('Orange'), cell('Small')], // Orange invalid
      [cell('R-S'), cell('Red'), cell('Small')],  // Valid
      [cell(''), cell('Blue'), cell('XXL')],       // XXL invalid
    ];
    const errors = validateDataSheet(data, createSampleSpecs());

    expect(errors).toHaveLength(2);
    expect(errors[0].row).toBe(1);
    expect(errors[0].column).toBe(1);
    expect(errors[1].row).toBe(3);
    expect(errors[1].column).toBe(2);
  });

  it('ignores empty cells', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell(''), cell(''), cell('Small')], // Empty Color is fine
      [cell(''), cell('Red'), cell('')],   // Empty Size is fine
    ];
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('ignores columns that do not match any specification', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Material'), cell('Size')],
      [cell(''), cell('Red'), cell('Cotton'), cell('Small')], // Material not in specs
    ];
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('handles specifications with no values', () => {
    const specsWithEmpty: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [], // No values defined
      },
    ];
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell(''), cell('Red')], // Any value should be invalid
    ];
    const errors = validateDataSheet(data, specsWithEmpty);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Value "Red" does not exist in specification "Color"');
  });

  it('returns empty array when specifications is empty', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell(''), cell('Red'), cell('Small')],
    ];
    const errors = validateDataSheet(data, []);
    expect(errors).toEqual([]);
  });

  it('handles whitespace in cell values', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell(''), cell('  Red  ')], // Whitespace should be trimmed
    ];
    // Note: the spec has 'Red' without whitespace
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]); // Should match after trimming
  });

  it('handles cells with only whitespace as empty', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell(''), cell('   ')], // Whitespace-only is treated as empty
    ];
    const errors = validateDataSheet(data, createSampleSpecs());
    expect(errors).toEqual([]);
  });

  it('detects error when spec value is deleted', () => {
    // Simulate scenario: user had "Red" in their data, then deleted "Red" from Color spec
    const specsAfterDeletion: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
          // Red was deleted
        ],
      },
    ];
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('B'), cell('Blue')],  // Valid
      [cell('R'), cell('Red')],   // Now invalid after deletion
    ];
    const errors = validateDataSheet(data, specsAfterDeletion);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      row: 2,
      column: 1,
      message: 'Value "Red" does not exist in specification "Color"',
      type: 'missing-value',
    });
  });
});
