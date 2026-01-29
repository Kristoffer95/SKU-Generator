import { describe, it, expect } from 'vitest';
import { convertToSpreadsheetData, convertFromSpreadsheetData } from './spreadsheet-adapter';
import type { CellData, Specification, ColumnDef } from '../types';
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

  // Standard columns: SKU + Color (spec) + Size (spec)
  const mockColumns: ColumnDef[] = [
    { id: 'col-sku', type: 'sku', header: 'SKU' },
    { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
    { id: 'col-size', type: 'spec', specId: 'spec-2', header: 'Size' },
  ];

  describe('convertToSpreadsheetData', () => {
    it('converts empty data to empty matrix', () => {
      const result = convertToSpreadsheetData([], mockColumns, mockSpecifications);
      expect(result).toEqual([]);
    });

    it('converts header row without readOnly or dropdownOptions', () => {
      const data: CellData[][] = [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      expect(result).toHaveLength(1);
      // Header row should not have readOnly or dropdownOptions
      expect(result[0][0]).toEqual({ value: 'SKU' });
      expect(result[0][1]).toEqual({ value: 'Color' });
      expect(result[0][2]).toEqual({ value: 'Size' });
    });

    it('sets readOnly: true on SKU column for data rows', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      // Row 0 (header) - no readOnly
      expect(result[0][0]?.readOnly).toBeUndefined();
      // Row 1 (data) - readOnly on SKU column
      expect(result[1][0]?.readOnly).toBe(true);
      expect(result[1][0]?.value).toBe('SKU-001');
    });

    it('populates dropdownOptions from specifications for spec columns', () => {
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      // Row 0 (header) - no dropdown options
      expect(result[0][1]?.dropdownOptions).toBeUndefined();
      expect(result[0][2]?.dropdownOptions).toBeUndefined();

      // Row 1 (data) - dropdown options for spec columns
      expect(result[1][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      expect(result[1][2]?.dropdownOptions).toEqual(['Small', 'Large']);
    });

    it('columns determine dropdown options by specId, not spec order', () => {
      // Columns reference specs by specId, so column order can differ from spec order
      const reorderedColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-size', type: 'spec', specId: 'spec-2', header: 'Size' }, // Size first
        { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' }, // Color second
      ];

      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Size' }, { v: 'Color' }],
        [{ v: 'SKU-001' }, { v: 'Small' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, reorderedColumns, mockSpecifications);

      // Col 1 should have Size dropdown options (linked to spec-2)
      expect(result[1][1]?.dropdownOptions).toEqual(['Small', 'Large']);
      // Col 2 should have Color dropdown options (linked to spec-1)
      expect(result[1][2]?.dropdownOptions).toEqual(['Red', 'Blue']);
    });

    it('handles empty cells correctly', () => {
      const columnsWithTwoCols: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{}, {}], // Empty cells
      ];

      const result = convertToSpreadsheetData(data, columnsWithTwoCols, mockSpecifications);

      // Empty SKU cell should be readOnly with null value
      expect(result[1][0]).toEqual({ value: null, readOnly: true });
      // Empty spec cell should have dropdown options
      expect(result[1][1]).toEqual({ value: null, dropdownOptions: ['Red', 'Blue'] });
    });

    it('preserves background color as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }],
        [{ v: 'SKU-001', bg: '#fef3c7' }], // amber duplicate warning
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[1][0]?.className).toBe('bg-[#fef3c7]');
    });

    it('preserves font color as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }],
        [{ v: 'SKU-001', fc: '#dc2626' }], // red text
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[1][0]?.className).toBe('text-[#dc2626]');
    });

    it('preserves both background and font color as combined className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }],
        [{ v: 'SKU-001', bg: '#fce4ec', fc: '#dc2626' }], // pink bg, red text
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[1][0]?.className).toBe('bg-[#fce4ec] text-[#dc2626]');
    });

    it('handles cells with only m (display text) value', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ m: 'SKU' }],
        [{ m: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.value).toBe('SKU');
      expect(result[1][0]?.value).toBe('Red');
    });

    it('free columns have no dropdown options', () => {
      const columnsWithFree: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
        { id: 'col-notes', type: 'free', header: 'Notes' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Notes' }],
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Test note' }],
      ];

      const result = convertToSpreadsheetData(data, columnsWithFree, mockSpecifications);

      // Spec column should have dropdown
      expect(result[1][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      // Free column should NOT have dropdown
      expect(result[1][2]?.dropdownOptions).toBeUndefined();
      expect(result[1][2]?.value).toBe('Test note');
    });

    it('free columns are not readOnly', () => {
      const columnsWithFree: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-notes', type: 'free', header: 'Notes' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Notes' }],
        [{ v: 'SKU-001' }, { v: 'Test note' }],
      ];

      const result = convertToSpreadsheetData(data, columnsWithFree, mockSpecifications);

      // SKU column should be readOnly
      expect(result[1][0]?.readOnly).toBe(true);
      // Free column should NOT be readOnly
      expect(result[1][1]?.readOnly).toBeUndefined();
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

    it('converts className back to fc (font color)', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'text-[#dc2626]' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'SKU-001', m: 'SKU-001', fc: '#dc2626' });
    });

    it('converts className with both bg and fc colors', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'bg-[#fce4ec] text-[#dc2626]' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'SKU-001', m: 'SKU-001', bg: '#fce4ec', fc: '#dc2626' });
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

      const spreadsheetData = convertToSpreadsheetData(original, mockColumns, mockSpecifications);
      const result = convertFromSpreadsheetData(spreadsheetData);

      // Values should be preserved
      expect(result[0][0]?.v).toBe('SKU');
      expect(result[1][0]?.v).toBe('SKU-R-S');
      expect(result[1][1]?.v).toBe('Red');
      expect(result[2][2]?.v).toBe('Large');
    });
  });
});
