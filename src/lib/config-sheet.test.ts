import { describe, it, expect } from 'vitest';
import type { CellData } from '../types';
import {
  parseConfigSheet,
  getSpecValues,
  lookupSkuCode,
  getSpecNames,
} from './config-sheet';

// Helper to create cell data
const cell = (value: string): CellData => ({ v: value, m: value });

describe('parseConfigSheet', () => {
  it('returns empty array for empty data', () => {
    expect(parseConfigSheet([])).toEqual([]);
  });

  it('returns empty array for headers-only data', () => {
    const data = [[cell('Specification'), cell('Value'), cell('SKU Code')]];
    expect(parseConfigSheet(data)).toEqual([]);
  });

  it('parses single specification with one value', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('Color'), cell('Red'), cell('R')],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Color');
    expect(result[0].values).toEqual([{ label: 'Red', skuCode: 'R' }]);
  });

  it('groups multiple values under same specification', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('Color'), cell('Red'), cell('R')],
      [cell('Color'), cell('Blue'), cell('B')],
      [cell('Color'), cell('Green'), cell('G')],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Color');
    expect(result[0].values).toHaveLength(3);
    expect(result[0].values).toEqual([
      { label: 'Red', skuCode: 'R' },
      { label: 'Blue', skuCode: 'B' },
      { label: 'Green', skuCode: 'G' },
    ]);
  });

  it('parses multiple specifications', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('Temperature'), cell('29deg C'), cell('29C')],
      [cell('Temperature'), cell('30deg C'), cell('30C')],
      [cell('Color'), cell('Red'), cell('R')],
      [cell('Color'), cell('Blue'), cell('B')],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(2);

    const tempSpec = result.find((s) => s.name === 'Temperature');
    const colorSpec = result.find((s) => s.name === 'Color');

    expect(tempSpec?.values).toEqual([
      { label: '29deg C', skuCode: '29C' },
      { label: '30deg C', skuCode: '30C' },
    ]);

    expect(colorSpec?.values).toEqual([
      { label: 'Red', skuCode: 'R' },
      { label: 'Blue', skuCode: 'B' },
    ]);
  });

  it('skips rows with empty specification name', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell(''), cell('Red'), cell('R')],
      [cell('Color'), cell('Blue'), cell('B')],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(1);
    expect(result[0].values).toHaveLength(1);
  });

  it('skips rows with empty value', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('Color'), cell(''), cell('R')],
      [cell('Color'), cell('Blue'), cell('B')],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(1);
    expect(result[0].values).toHaveLength(1);
  });

  it('handles empty SKU code (allowed)', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('Color'), cell('Red'), cell('')],
    ];

    const result = parseConfigSheet(data);

    expect(result[0].values[0]).toEqual({ label: 'Red', skuCode: '' });
  });

  it('handles cells with undefined or null values', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [{ v: null }, cell('Red'), cell('R')],
      [cell('Color'), { v: undefined }, cell('B')],
      [cell('Color'), cell('Green'), { v: 'G', m: 'G' }],
    ];

    const result = parseConfigSheet(data);

    expect(result).toHaveLength(1);
    expect(result[0].values).toEqual([{ label: 'Green', skuCode: 'G' }]);
  });

  it('trims whitespace from values', () => {
    const data = [
      [cell('Specification'), cell('Value'), cell('SKU Code')],
      [cell('  Color  '), cell(' Red '), cell(' R ')],
    ];

    const result = parseConfigSheet(data);

    expect(result[0].name).toBe('Color');
    expect(result[0].values[0]).toEqual({ label: 'Red', skuCode: 'R' });
  });
});

describe('getSpecValues', () => {
  const specs = [
    {
      name: 'Color',
      values: [
        { label: 'Red', skuCode: 'R' },
        { label: 'Blue', skuCode: 'B' },
      ],
    },
    {
      name: 'Size',
      values: [
        { label: 'Small', skuCode: 'S' },
        { label: 'Large', skuCode: 'L' },
      ],
    },
  ];

  it('returns values for existing specification', () => {
    expect(getSpecValues(specs, 'Color')).toEqual([
      { label: 'Red', skuCode: 'R' },
      { label: 'Blue', skuCode: 'B' },
    ]);
  });

  it('returns empty array for non-existent specification', () => {
    expect(getSpecValues(specs, 'Weight')).toEqual([]);
  });

  it('returns empty array for empty specs', () => {
    expect(getSpecValues([], 'Color')).toEqual([]);
  });
});

describe('lookupSkuCode', () => {
  const specs = [
    {
      name: 'Color',
      values: [
        { label: 'Red', skuCode: 'R' },
        { label: 'Blue', skuCode: 'B' },
      ],
    },
    {
      name: 'Temperature',
      values: [
        { label: '29deg C', skuCode: '29C' },
        { label: '30deg C', skuCode: '30C' },
      ],
    },
  ];

  it('returns SKU code for matching spec and value', () => {
    expect(lookupSkuCode(specs, 'Color', 'Red')).toBe('R');
    expect(lookupSkuCode(specs, 'Temperature', '29deg C')).toBe('29C');
  });

  it('returns empty string for non-existent spec', () => {
    expect(lookupSkuCode(specs, 'Size', 'Small')).toBe('');
  });

  it('returns empty string for non-existent value', () => {
    expect(lookupSkuCode(specs, 'Color', 'Green')).toBe('');
  });

  it('returns empty string for empty specs', () => {
    expect(lookupSkuCode([], 'Color', 'Red')).toBe('');
  });
});

describe('getSpecNames', () => {
  it('returns all specification names', () => {
    const specs = [
      { name: 'Color', values: [] },
      { name: 'Size', values: [] },
      { name: 'Material', values: [] },
    ];

    expect(getSpecNames(specs)).toEqual(['Color', 'Size', 'Material']);
  });

  it('returns empty array for empty specs', () => {
    expect(getSpecNames([])).toEqual([]);
  });
});
