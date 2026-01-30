import { describe, it, expect } from 'vitest';
import { updateRowSKU, findChangedRows, processAutoSKU } from './auto-sku';
import type { CellData, Specification, AppSettings } from '../types';

describe('findChangedRows', () => {
  it('returns empty array when both arrays are empty', () => {
    expect(findChangedRows([], [])).toEqual([]);
  });

  it('returns empty array when single row is same', () => {
    const oldData: CellData[][] = [[{ v: '' }, { v: 'Red' }]];
    const newData: CellData[][] = [[{ v: '' }, { v: 'Red' }]];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });

  it('detects new row added', () => {
    const oldData: CellData[][] = [];
    const newData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([0]);
  });

  it('detects cell value change in existing row', () => {
    const oldData: CellData[][] = [
      [{ v: 'R' }, { v: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'R' }, { v: 'Blue' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([0]);
  });

  it('ignores SKU column changes (first column)', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'R' }, { v: 'Red' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });

  it('detects multiple changed rows', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
      [{ v: '' }, { v: 'Blue' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { v: 'Green' }],
      [{ v: '' }, { v: 'Yellow' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([0, 1]);
  });

  it('handles m property fallback', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { m: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { m: 'Blue' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([0]);
  });

  it('trims whitespace when comparing', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { v: '  Red  ' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });
});

describe('updateRowSKU', () => {
  const defaultSettings: AppSettings = { delimiter: '-', prefix: '', suffix: '' };
  const specifications: Specification[] = [
    { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }, { id: 'v2', displayValue: 'Blue', skuFragment: 'B' }] },
    { id: 'size', name: 'Size', order: 1, values: [{ id: 'v3', displayValue: 'Small', skuFragment: 'S' }, { id: 'v4', displayValue: 'Large', skuFragment: 'L' }] },
  ];

  it('skips row index out of bounds', () => {
    const data: CellData[][] = [[{ v: '' }, { v: 'Red' }]];
    updateRowSKU(data, 5, specifications, defaultSettings, ['Color']);
    expect(data.length).toBe(1);
  });

  it('generates SKU for single value', () => {
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];
    updateRowSKU(data, 0, specifications, defaultSettings, ['Color']);
    expect(data[0][0]).toEqual({ v: 'R', m: 'R' });
  });

  it('generates SKU for multiple values with delimiter', () => {
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }, { v: 'Small' }],
    ];
    updateRowSKU(data, 0, specifications, defaultSettings, ['Color', 'Size']);
    expect(data[0][0]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('uses custom delimiter', () => {
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }, { v: 'Small' }],
    ];
    updateRowSKU(data, 0, specifications, { delimiter: '_', prefix: '', suffix: '' }, ['Color', 'Size']);
    expect(data[0][0]).toEqual({ v: 'R_S', m: 'R_S' });
  });

  it('adds prefix and suffix', () => {
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];
    updateRowSKU(data, 0, specifications, { delimiter: '-', prefix: 'PRE-', suffix: '-SUF' }, ['Color']);
    expect(data[0][0]).toEqual({ v: 'PRE-R-SUF', m: 'PRE-R-SUF' });
  });

  it('generates empty SKU when no matching values', () => {
    const data: CellData[][] = [
      [{ v: 'old' }, { v: 'Value' }],
    ];
    updateRowSKU(data, 0, specifications, defaultSettings, ['Unknown']);
    expect(data[0][0]).toEqual({ v: '', m: '' });
  });

  it('overwrites SKU column (first column)', () => {
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }, { v: 'Small' }],
    ];
    updateRowSKU(data, 0, specifications, defaultSettings, ['Color', 'Size']);
    expect(data[0][0]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('handles empty row gracefully', () => {
    const data: CellData[][] = [
      [],
    ];
    updateRowSKU(data, 0, specifications, defaultSettings, ['Color']);
    expect(data[0]).toEqual([]);
  });

  it('respects spec order field, not column order', () => {
    // Specs have Size with order=0, Color with order=1
    const specsReversedOrder: Specification[] = [
      { id: 'color', name: 'Color', order: 1, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }] },
      { id: 'size', name: 'Size', order: 0, values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }] },
    ];
    // Data sheet has Color first, then Size
    const data: CellData[][] = [
      [{ v: '' }, { v: 'Red' }, { v: 'Small' }],
    ];
    updateRowSKU(data, 0, specsReversedOrder, defaultSettings, ['Color', 'Size']);
    // SKU should be S-R (Size first because order=0)
    expect(data[0][0]).toEqual({ v: 'S-R', m: 'S-R' });
  });
});

describe('processAutoSKU', () => {
  const defaultSettings: AppSettings = { delimiter: '-', prefix: '', suffix: '' };
  const specifications: Specification[] = [
    { id: 'color', name: 'Color', order: 0, values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }, { id: 'v2', displayValue: 'Blue', skuFragment: 'B' }] },
    { id: 'size', name: 'Size', order: 1, values: [{ id: 'v3', displayValue: 'Small', skuFragment: 'S' }] },
  ];

  it('updates SKU for changed row', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
    ];

    processAutoSKU(oldData, newData, specifications, defaultSettings, ['Color']);
    expect(newData[0][0]).toEqual({ v: 'R', m: 'R' });
  });

  it('updates multiple changed rows', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: '' }],
      [{ v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }],
      [{ v: '' }, { v: 'Blue' }],
    ];

    processAutoSKU(oldData, newData, specifications, defaultSettings, ['Color']);
    expect(newData[0][0]).toEqual({ v: 'R', m: 'R' });
    expect(newData[1][0]).toEqual({ v: 'B', m: 'B' });
  });

  it('does not modify unchanged rows', () => {
    const oldData: CellData[][] = [
      [{ v: 'R' }, { v: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'OLD' }, { v: 'Red' }],
    ];

    processAutoSKU(oldData, newData, specifications, defaultSettings, ['Color']);
    // SKU column was changed but value column was not, so no update
    expect(newData[0][0]).toEqual({ v: 'OLD' });
  });

  it('handles complete workflow: select Red, Small -> R-S', () => {
    const oldData: CellData[][] = [
      [{ v: '' }, { v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: '' }, { v: 'Red' }, { v: 'Small' }],
    ];

    processAutoSKU(oldData, newData, specifications, defaultSettings, ['Color', 'Size']);
    expect(newData[0][0]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('updates SKU when value changes: Red->Blue', () => {
    const oldData: CellData[][] = [
      [{ v: 'R' }, { v: 'Red' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'R' }, { v: 'Blue' }],
    ];

    processAutoSKU(oldData, newData, specifications, defaultSettings, ['Color']);
    expect(newData[0][0]).toEqual({ v: 'B', m: 'B' });
  });
});
