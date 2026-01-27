import { describe, it, expect } from 'vitest';
import { updateRowSKU, findChangedRows, processAutoSKU } from './auto-sku';
import type { CellData, ParsedSpec, AppSettings } from '../types';

describe('findChangedRows', () => {
  it('returns empty array when both arrays are empty', () => {
    expect(findChangedRows([], [])).toEqual([]);
  });

  it('returns empty array when only header row exists and is same', () => {
    const oldData: CellData[][] = [[{ v: 'Color' }, { v: 'SKU' }]];
    const newData: CellData[][] = [[{ v: 'Color' }, { v: 'SKU' }]];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });

  it('detects new row added', () => {
    const oldData: CellData[][] = [[{ v: 'Color' }, { v: 'SKU' }]];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([1]);
  });

  it('detects cell value change in existing row', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'R' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Blue' }, { v: 'R' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([1]);
  });

  it('ignores SKU column changes (last column)', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'R' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });

  it('detects multiple changed rows', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
      [{ v: 'Blue' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Green' }, { v: '' }],
      [{ v: 'Yellow' }, { v: '' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([1, 2]);
  });

  it('handles m property fallback', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ m: 'Red' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ m: 'Blue' }, { v: '' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([1]);
  });

  it('trims whitespace when comparing', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: '  Red  ' }, { v: '' }],
    ];
    expect(findChangedRows(oldData, newData)).toEqual([]);
  });
});

describe('updateRowSKU', () => {
  const defaultSettings: AppSettings = { delimiter: '-', prefix: '', suffix: '' };
  const parsedSpecs: ParsedSpec[] = [
    { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }, { label: 'Blue', skuCode: 'B' }] },
    { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }, { label: 'Large', skuCode: 'L' }] },
  ];

  it('skips header row (index 0)', () => {
    const data: CellData[][] = [[{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }]];
    updateRowSKU(data, 0, parsedSpecs, defaultSettings);
    expect(data[0][2]).toEqual({ v: 'SKU' });
  });

  it('skips row index out of bounds', () => {
    const data: CellData[][] = [[{ v: 'Color' }, { v: 'SKU' }]];
    updateRowSKU(data, 5, parsedSpecs, defaultSettings);
    expect(data.length).toBe(1);
  });

  it('generates SKU for single value', () => {
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];
    updateRowSKU(data, 1, parsedSpecs, defaultSettings);
    expect(data[1][1]).toEqual({ v: 'R', m: 'R' });
  });

  it('generates SKU for multiple values with delimiter', () => {
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'Small' }, { v: '' }],
    ];
    updateRowSKU(data, 1, parsedSpecs, defaultSettings);
    expect(data[1][2]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('uses custom delimiter', () => {
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'Small' }, { v: '' }],
    ];
    updateRowSKU(data, 1, parsedSpecs, { delimiter: '_', prefix: '', suffix: '' });
    expect(data[1][2]).toEqual({ v: 'R_S', m: 'R_S' });
  });

  it('adds prefix and suffix', () => {
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];
    updateRowSKU(data, 1, parsedSpecs, { delimiter: '-', prefix: 'PRE-', suffix: '-SUF' });
    expect(data[1][1]).toEqual({ v: 'PRE-R-SUF', m: 'PRE-R-SUF' });
  });

  it('generates empty SKU when no matching values', () => {
    const data: CellData[][] = [
      [{ v: 'Unknown' }, { v: 'SKU' }],
      [{ v: 'Value' }, { v: 'old' }],
    ];
    updateRowSKU(data, 1, parsedSpecs, defaultSettings);
    expect(data[1][1]).toEqual({ v: '', m: '' });
  });

  it('extends row if SKU column is missing', () => {
    // Header has 2 columns (Color, SKU), data row should have at least Color value
    // When data row has fewer columns than header, we need to extend it
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'Small' }], // Missing SKU column
    ];
    updateRowSKU(data, 1, parsedSpecs, defaultSettings);
    expect(data[1].length).toBe(3);
    expect(data[1][2]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('handles empty row gracefully', () => {
    const data: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [],
    ];
    updateRowSKU(data, 1, parsedSpecs, defaultSettings);
    expect(data[1]).toEqual([]);
  });
});

describe('processAutoSKU', () => {
  const defaultSettings: AppSettings = { delimiter: '-', prefix: '', suffix: '' };
  const parsedSpecs: ParsedSpec[] = [
    { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }, { label: 'Blue', skuCode: 'B' }] },
    { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
  ];

  it('updates SKU for changed row', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
    ];

    processAutoSKU(oldData, newData, parsedSpecs, defaultSettings);
    expect(newData[1][1]).toEqual({ v: 'R', m: 'R' });
  });

  it('updates multiple changed rows', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: '' }, { v: '' }],
      [{ v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: '' }],
      [{ v: 'Blue' }, { v: '' }],
    ];

    processAutoSKU(oldData, newData, parsedSpecs, defaultSettings);
    expect(newData[1][1]).toEqual({ v: 'R', m: 'R' });
    expect(newData[2][1]).toEqual({ v: 'B', m: 'B' });
  });

  it('does not modify unchanged rows', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'R' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'OLD' }],
    ];

    processAutoSKU(oldData, newData, parsedSpecs, defaultSettings);
    // SKU column was changed but value column was not, so no update
    expect(newData[1][1]).toEqual({ v: 'OLD' });
  });

  it('handles complete workflow: select Red, Small -> R-S', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'Size' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'Small' }, { v: '' }],
    ];

    processAutoSKU(oldData, newData, parsedSpecs, defaultSettings);
    expect(newData[1][2]).toEqual({ v: 'R-S', m: 'R-S' });
  });

  it('updates SKU when value changes: Red->Blue', () => {
    const oldData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Red' }, { v: 'R' }],
    ];
    const newData: CellData[][] = [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: 'Blue' }, { v: 'R' }],
    ];

    processAutoSKU(oldData, newData, parsedSpecs, defaultSettings);
    expect(newData[1][1]).toEqual({ v: 'B', m: 'B' });
  });
});
