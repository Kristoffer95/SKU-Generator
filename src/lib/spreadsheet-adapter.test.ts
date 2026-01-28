import { describe, it, expect } from 'vitest';
import { convertToSpreadsheetData, convertFromSpreadsheetData } from './spreadsheet-adapter';
import type { CellData, Specification } from '../types';
import type { SKUMatrix } from '../types/spreadsheet';

describe('spreadsheet-adapter', () => {
  const mockSpecifications: Specification[] = [
    {
      id: 'spec-1',
      name: 'Color',
      order: 0,
      values: [
        { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
      ],
    },
    {
      id: 'spec-2',
      name: 'Size',
      order: 1,
      values: [
        { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
        { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
      ],
    },
  ];

  describe('convertToSpreadsheetData', () => {
    it('converts empty data to empty matrix', () => {
      const result = convertToSpreadsheetData([], mockSpecifications);
      expect(result).toEqual([]);
    });

    it('converts header row without readOnly or dropdownOptions', () => {
      const data: CellData[][] = [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      expect(result).toHaveLength(1);
      // Header row should not have readOnly or dropdownOptions
      expect(result[0][0]).toEqual({ value: 'SKU' });
      expect(result[0][1]).toEqual({ value: 'Color' });
      expect(result[0][2]).toEqual({ value: 'Size' });
    });

    it('sets readOnly: true on SKU column (col 0) for data rows', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      // Row 0 (header) - no readOnly
      expect(result[0][0]?.readOnly).toBeUndefined();
      // Row 1 (data) - readOnly on col 0
      expect(result[1][0]?.readOnly).toBe(true);
      expect(result[1][0]?.value).toBe('SKU-001');
    });

    it('populates dropdownOptions from specifications for spec columns', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      // Row 0 (header) - no dropdown options
      expect(result[0][1]?.dropdownOptions).toBeUndefined();
      expect(result[0][2]?.dropdownOptions).toBeUndefined();

      // Row 1 (data) - dropdown options for spec columns
      expect(result[1][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      expect(result[1][2]?.dropdownOptions).toEqual(['Small', 'Large']);
    });

    it('handles specifications in different orders', () => {
      const reorderedSpecs: Specification[] = [
        {
          id: 'spec-2',
          name: 'Size',
          order: 0, // Size first
          values: [{ id: 'v3', displayValue: 'Small', skuFragment: 'S' }],
        },
        {
          id: 'spec-1',
          name: 'Color',
          order: 1, // Color second
          values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
        },
      ];

      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Size' }, { v: 'Color' }],
        [{ v: 'SKU-001' }, { v: 'Small' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, reorderedSpecs);

      // Col 1 should have Size dropdown options (order 0)
      expect(result[1][1]?.dropdownOptions).toEqual(['Small']);
      // Col 2 should have Color dropdown options (order 1)
      expect(result[1][2]?.dropdownOptions).toEqual(['Red']);
    });

    it('handles empty cells correctly', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{}, {}], // Empty cells
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      // Empty SKU cell should be readOnly with null value
      expect(result[1][0]).toEqual({ value: null, readOnly: true });
      // Empty spec cell should have dropdown options
      expect(result[1][1]).toEqual({ value: null, dropdownOptions: ['Red', 'Blue'] });
    });

    it('preserves background color as className', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }],
        [{ v: 'SKU-001', bg: '#fef3c7' }], // amber duplicate warning
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      expect(result[1][0]?.className).toBe('bg-[#fef3c7]');
    });

    it('handles cells with only m (display text) value', () => {
      const data: CellData[][] = [
        [{ m: 'SKU' }],
        [{ m: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, mockSpecifications);

      expect(result[0][0]?.value).toBe('SKU');
      expect(result[1][0]?.value).toBe('Red');
    });
  });

  describe('convertFromSpreadsheetData', () => {
    it('converts empty matrix to empty data', () => {
      const result = convertFromSpreadsheetData([]);
      expect(result).toEqual([]);
    });

    it('converts SKUMatrix back to CellData format', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'SKU-001', readOnly: true }, { value: 'Red', dropdownOptions: ['Red', 'Blue'] }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toEqual({ v: 'SKU', m: 'SKU' });
      expect(result[0][1]).toEqual({ v: 'Color', m: 'Color' });
      expect(result[1][0]).toEqual({ v: 'SKU-001', m: 'SKU-001' });
      expect(result[1][1]).toEqual({ v: 'Red', m: 'Red' });
    });

    it('handles null cells', () => {
      const matrix: SKUMatrix = [
        [null, { value: 'Test' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({});
      expect(result[0][1]).toEqual({ v: 'Test', m: 'Test' });
    });

    it('handles cells with null value', () => {
      const matrix: SKUMatrix = [
        [{ value: null }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({});
    });

    it('converts className back to bg color', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'bg-[#fef3c7]' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'SKU-001', m: 'SKU-001', bg: '#fef3c7' });
    });

    it('handles numeric values', () => {
      const matrix: SKUMatrix = [
        [{ value: 123 }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 123, m: '123' });
    });
  });

  describe('roundtrip conversion', () => {
    it('preserves data through convert -> convertFrom cycle', () => {
      const original: CellData[][] = [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
        [{ v: 'SKU-R-S', m: 'SKU-R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
        [{ v: 'SKU-B-L', m: 'SKU-B-L' }, { v: 'Blue', m: 'Blue' }, { v: 'Large', m: 'Large' }],
      ];

      const spreadsheetData = convertToSpreadsheetData(original, mockSpecifications);
      const result = convertFromSpreadsheetData(spreadsheetData);

      // Values should be preserved
      expect(result[0][0]?.v).toBe('SKU');
      expect(result[1][0]?.v).toBe('SKU-R-S');
      expect(result[1][1]?.v).toBe('Red');
      expect(result[2][2]?.v).toBe('Large');
    });
  });
});
