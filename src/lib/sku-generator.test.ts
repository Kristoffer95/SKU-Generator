import { describe, it, expect } from 'vitest';
import { generateSKU } from './sku-generator';
import type { Specification, SelectedValues, AppSettings } from '../types';

const defaultSettings: AppSettings = {
  delimiter: '-',
  prefix: '',
  suffix: '',
};

// Test specifications matching PRD example
const testSpecs: Specification[] = [
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

describe('generateSKU', () => {
  it('generates SKU from two selected values with default delimiter', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
    ]);

    const result = generateSKU(selected, testSpecs, defaultSettings);
    expect(result).toBe('29C-R');
  });

  it('generates SKU from three selected values', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
      ['type', 'Standard'],
    ]);

    const result = generateSKU(selected, testSpecs, defaultSettings);
    expect(result).toBe('29C-R-STD');
  });

  it('respects order field when generating SKU', () => {
    // Select values in different order than spec order
    const selected: SelectedValues = new Map([
      ['type', 'Premium'],
      ['temp', '30deg C'],
      ['color', 'Blue'],
    ]);

    const result = generateSKU(selected, testSpecs, defaultSettings);
    // Should be ordered by order field: temp(0), color(1), type(2)
    expect(result).toBe('30C-B-PRM');
  });

  it('uses custom delimiter', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
    ]);

    const settings: AppSettings = { ...defaultSettings, delimiter: '_' };
    const result = generateSKU(selected, testSpecs, settings);
    expect(result).toBe('29C_R');
  });

  it('adds prefix to SKU', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
    ]);

    const settings: AppSettings = { ...defaultSettings, prefix: 'SKU-' };
    const result = generateSKU(selected, testSpecs, settings);
    expect(result).toBe('SKU-29C-R');
  });

  it('adds suffix to SKU', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
    ]);

    const settings: AppSettings = { ...defaultSettings, suffix: '-v1' };
    const result = generateSKU(selected, testSpecs, settings);
    expect(result).toBe('29C-R-v1');
  });

  it('combines prefix, delimiter, and suffix', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
      ['type', 'Standard'],
    ]);

    const settings: AppSettings = {
      delimiter: '_',
      prefix: 'PRD-',
      suffix: '-2024',
    };
    const result = generateSKU(selected, testSpecs, settings);
    expect(result).toBe('PRD-29C_R_STD-2024');
  });

  it('returns empty string when no values are selected', () => {
    const selected: SelectedValues = new Map();
    const result = generateSKU(selected, [], defaultSettings);
    expect(result).toBe('');
  });

  it('returns empty string when specifications array is empty', () => {
    const selected: SelectedValues = new Map([['temp', '29deg C']]);
    const result = generateSKU(selected, [], defaultSettings);
    expect(result).toBe('');
  });

  it('skips spec when selected displayValue not found in values', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Green'], // Not in spec values
    ]);

    const result = generateSKU(selected, testSpecs, defaultSettings);
    expect(result).toBe('29C'); // Only temp fragment included
  });

  it('skips spec when spec ID not in specifications', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['unknown', 'Value'], // Not a known spec
    ]);

    const result = generateSKU(selected, testSpecs, defaultSettings);
    expect(result).toBe('29C');
  });

  it('handles single value selection', () => {
    const selected: SelectedValues = new Map([['color', 'Blue']]);
    const result = generateSKU(selected, testSpecs, defaultSettings);
    expect(result).toBe('B');
  });

  it('handles empty delimiter (concatenation)', () => {
    const selected: SelectedValues = new Map([
      ['temp', '29deg C'],
      ['color', 'Red'],
      ['type', 'Standard'],
    ]);

    const settings: AppSettings = { ...defaultSettings, delimiter: '' };
    const result = generateSKU(selected, testSpecs, settings);
    expect(result).toBe('29CRSTD');
  });
});
