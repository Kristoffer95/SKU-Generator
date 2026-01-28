import { describe, it, expect } from 'vitest';
import { validateDataSheet, findDuplicateSKUs } from './validation';
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

describe('findDuplicateSKUs', () => {
  it('returns empty array for empty data', () => {
    const errors = findDuplicateSKUs([]);
    expect(errors).toEqual([]);
  });

  it('returns empty array for header-only data', () => {
    const data: CellData[][] = [[cell('SKU'), cell('Color'), cell('Size')]];
    const errors = findDuplicateSKUs(data);
    expect(errors).toEqual([]);
  });

  it('returns empty array when all SKUs are unique', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell('R-S'), cell('Red'), cell('Small')],
      [cell('B-M'), cell('Blue'), cell('Medium')],
      [cell('G-L'), cell('Green'), cell('Large')],
    ];
    const errors = findDuplicateSKUs(data);
    expect(errors).toEqual([]);
  });

  it('detects two rows with the same SKU', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color'), cell('Size')],
      [cell('R-S'), cell('Red'), cell('Small')],
      [cell('R-S'), cell('Red'), cell('Small')], // Duplicate
    ];
    const errors = findDuplicateSKUs(data);

    expect(errors).toHaveLength(2);
    // Both rows should be flagged
    expect(errors[0]).toEqual({
      row: 1,
      column: 0,
      message: 'Duplicate SKU "R-S" found in rows 1, 2',
      type: 'duplicate-sku',
    });
    expect(errors[1]).toEqual({
      row: 2,
      column: 0,
      message: 'Duplicate SKU "R-S" found in rows 1, 2',
      type: 'duplicate-sku',
    });
  });

  it('detects multiple rows with the same SKU', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('ABC'), cell('Red')],
      [cell('XYZ'), cell('Blue')],
      [cell('ABC'), cell('Red')], // Duplicate of row 1
      [cell('ABC'), cell('Red')], // Duplicate of rows 1 and 3
    ];
    const errors = findDuplicateSKUs(data);

    expect(errors).toHaveLength(3);
    expect(errors[0].row).toBe(1);
    expect(errors[1].row).toBe(3);
    expect(errors[2].row).toBe(4);
    expect(errors[0].message).toBe('Duplicate SKU "ABC" found in rows 1, 3, 4');
  });

  it('detects multiple different duplicate SKUs', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('AAA'), cell('Red')],
      [cell('BBB'), cell('Blue')],
      [cell('AAA'), cell('Red')], // Duplicate of AAA
      [cell('BBB'), cell('Blue')], // Duplicate of BBB
    ];
    const errors = findDuplicateSKUs(data);

    expect(errors).toHaveLength(4);
    // Check AAA duplicates
    const aaaErrors = errors.filter((e) => e.message.includes('AAA'));
    expect(aaaErrors).toHaveLength(2);
    expect(aaaErrors[0].row).toBe(1);
    expect(aaaErrors[1].row).toBe(3);
    // Check BBB duplicates
    const bbbErrors = errors.filter((e) => e.message.includes('BBB'));
    expect(bbbErrors).toHaveLength(2);
    expect(bbbErrors[0].row).toBe(2);
    expect(bbbErrors[1].row).toBe(4);
  });

  it('ignores empty SKU values', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell(''), cell('Red')], // Empty SKU
      [cell(''), cell('Blue')], // Empty SKU - should not be flagged as duplicate
      [cell('R-S'), cell('Green')],
    ];
    const errors = findDuplicateSKUs(data);
    expect(errors).toEqual([]);
  });

  it('handles whitespace-only SKU values as empty', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('   '), cell('Red')], // Whitespace SKU
      [cell('   '), cell('Blue')], // Whitespace SKU - should not be flagged
      [cell('R-S'), cell('Green')],
    ];
    const errors = findDuplicateSKUs(data);
    expect(errors).toEqual([]);
  });

  it('trims whitespace when comparing SKUs', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('R-S'), cell('Red')],
      [cell('  R-S  '), cell('Blue')], // Same SKU with whitespace
    ];
    const errors = findDuplicateSKUs(data);

    expect(errors).toHaveLength(2);
    expect(errors[0].message).toBe('Duplicate SKU "R-S" found in rows 1, 2');
  });

  it('handles sparse data array', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [cell('R-S'), cell('Red')],
      undefined as unknown as CellData[], // Sparse row
      [cell('R-S'), cell('Blue')],
    ];
    const errors = findDuplicateSKUs(data);

    expect(errors).toHaveLength(2);
    expect(errors[0].row).toBe(1);
    expect(errors[1].row).toBe(3);
  });

  it('handles rows with missing first cell', () => {
    const data: CellData[][] = [
      [cell('SKU'), cell('Color')],
      [undefined as unknown as CellData, cell('Red')], // No SKU cell
      [cell('R-S'), cell('Blue')],
    ];
    const errors = findDuplicateSKUs(data);
    expect(errors).toEqual([]);
  });
});
