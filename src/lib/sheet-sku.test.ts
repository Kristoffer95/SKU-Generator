import { describe, it, expect } from 'vitest';
import type { CellData, ParsedSpec, AppSettings } from '../types';
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

// Sample parsed config
const sampleConfig: ParsedSpec[] = [
  {
    name: 'Temperature',
    values: [
      { label: '29deg C', skuCode: '29C' },
      { label: '30deg C', skuCode: '30C' },
    ],
  },
  {
    name: 'Color',
    values: [
      { label: 'Red', skuCode: 'R' },
      { label: 'Blue', skuCode: 'B' },
    ],
  },
  {
    name: 'Type',
    values: [
      { label: 'Standard', skuCode: 'STD' },
      { label: 'Premium', skuCode: 'PRM' },
    ],
  },
];

describe('generateRowSKU', () => {
  it('generates SKU from row values using config lookup', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      {
        name: 'Color',
        values: [{ label: 'Red', skuCode: 'R' }],
      },
      {
        name: 'Size',
        values: [{ label: 'Small', skuCode: 'S' }],
      },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, config, defaultSettings);

    expect(result).toBe('R-S');
  });

  it('generates SKU matching PRD example: Red, Small -> R-S', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
    ];

    expect(generateRowSKU(rowValues, columnHeaders, config, defaultSettings)).toBe('R-S');
  });

  it('generates SKU for temperature example: 29deg C, Red -> 29C-R', () => {
    const rowValues = [cell('29deg C'), cell('Red')];
    const columnHeaders = ['Temperature', 'Color'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleConfig, defaultSettings);

    expect(result).toBe('29C-R');
  });

  it('generates SKU with multiple values: 29deg C, Red, Standard -> 29C-R-STD', () => {
    const rowValues = [cell('29deg C'), cell('Red'), cell('Standard')];
    const columnHeaders = ['Temperature', 'Color', 'Type'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleConfig, defaultSettings);

    expect(result).toBe('29C-R-STD');
  });

  it('returns empty string when no values selected', () => {
    const rowValues: CellData[] = [];
    const columnHeaders: string[] = [];

    const result = generateRowSKU(rowValues, columnHeaders, sampleConfig, defaultSettings);

    expect(result).toBe('');
  });

  it('returns empty string when no matching values found', () => {
    const rowValues = [cell('Unknown'), cell('Invalid')];
    const columnHeaders = ['Color', 'Size'];

    const result = generateRowSKU(rowValues, columnHeaders, sampleConfig, defaultSettings);

    expect(result).toBe('');
  });

  it('skips empty cell values', () => {
    const rowValues = [cell('Red'), cell(''), cell('Standard')];
    const columnHeaders = ['Color', 'Size', 'Type'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
      { name: 'Type', values: [{ label: 'Standard', skuCode: 'STD' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, config, defaultSettings);

    expect(result).toBe('R-STD');
  });

  it('skips columns with empty headers', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', ''];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, config, defaultSettings);

    expect(result).toBe('R');
  });

  it('uses custom delimiter', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '_', prefix: '', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, config, settings);

    expect(result).toBe('R_S');
  });

  it('uses empty delimiter', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '', prefix: '', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, config, settings);

    expect(result).toBe('RS');
  });

  it('adds prefix to SKU', () => {
    const rowValues = [cell('Red')];
    const columnHeaders = ['Color'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: 'SKU-', suffix: '' };

    const result = generateRowSKU(rowValues, columnHeaders, config, settings);

    expect(result).toBe('SKU-R');
  });

  it('adds suffix to SKU', () => {
    const rowValues = [cell('Red')];
    const columnHeaders = ['Color'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: '', suffix: '-2024' };

    const result = generateRowSKU(rowValues, columnHeaders, config, settings);

    expect(result).toBe('R-2024');
  });

  it('adds both prefix and suffix', () => {
    const rowValues = [cell('Red'), cell('Small')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Small', skuCode: 'S' }] },
    ];
    const settings: AppSettings = { delimiter: '-', prefix: 'PRD-', suffix: '-V1' };

    const result = generateRowSKU(rowValues, columnHeaders, config, settings);

    expect(result).toBe('PRD-R-S-V1');
  });

  it('handles cells with only m property', () => {
    const rowValues = [{ m: 'Red' }];
    const columnHeaders = ['Color'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
    ];

    const result = generateRowSKU(rowValues, columnHeaders, config, defaultSettings);

    expect(result).toBe('R');
  });

  it('handles value with empty SKU code in config', () => {
    const rowValues = [cell('Red'), cell('Medium')];
    const columnHeaders = ['Color', 'Size'];
    const config: ParsedSpec[] = [
      { name: 'Color', values: [{ label: 'Red', skuCode: 'R' }] },
      { name: 'Size', values: [{ label: 'Medium', skuCode: '' }] }, // No SKU code
    ];

    const result = generateRowSKU(rowValues, columnHeaders, config, defaultSettings);

    // Only 'R' since Medium has empty SKU code (falsy, skipped)
    expect(result).toBe('R');
  });
});

describe('extractColumnHeaders', () => {
  it('extracts headers excluding last column (SKU)', () => {
    const headerRow = [cell('Color'), cell('Size'), cell('SKU')];

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
    const headerRow = [{ v: undefined }, cell('Size'), cell('SKU')];

    const result = extractColumnHeaders(headerRow);

    expect(result).toEqual(['', 'Size']);
  });
});

describe('getRowValuesWithoutSKU', () => {
  it('returns row values excluding last column', () => {
    const row = [cell('Red'), cell('Small'), cell('R-S')];

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
