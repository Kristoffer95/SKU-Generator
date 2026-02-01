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

    it('sets readOnly: true and dropdownOptions on all data rows', () => {
      // All rows are now data rows (no header row in data array)
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      expect(result).toHaveLength(1);
      // Row 0 is a data row - has readOnly on SKU column
      expect(result[0][0]?.readOnly).toBe(true);
      expect(result[0][0]?.value).toBe('SKU-001');
      // Has dropdown options for spec columns
      expect(result[0][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      expect(result[0][2]?.dropdownOptions).toEqual(['Small', 'Large']);
    });

    it('sets readOnly: true on SKU column for all data rows', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
        [{ v: 'SKU-002' }, { v: 'Blue' }, { v: 'Large' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      // All rows are data rows - all have readOnly on SKU column
      expect(result[0][0]?.readOnly).toBe(true);
      expect(result[0][0]?.value).toBe('SKU-001');
      expect(result[1][0]?.readOnly).toBe(true);
      expect(result[1][0]?.value).toBe('SKU-002');
    });

    it('populates dropdownOptions from specifications for spec columns', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Small' }],
        [{ v: 'SKU-002' }, { v: 'Blue' }, { v: 'Large' }],
      ];

      const result = convertToSpreadsheetData(data, mockColumns, mockSpecifications);

      // All rows are data rows - all have dropdown options for spec columns
      expect(result[0][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      expect(result[0][2]?.dropdownOptions).toEqual(['Small', 'Large']);
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
        [{ v: 'SKU-001' }, { v: 'Small' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, reorderedColumns, mockSpecifications);

      // Col 1 should have Size dropdown options (linked to spec-2)
      expect(result[0][1]?.dropdownOptions).toEqual(['Small', 'Large']);
      // Col 2 should have Color dropdown options (linked to spec-1)
      expect(result[0][2]?.dropdownOptions).toEqual(['Red', 'Blue']);
    });

    it('handles empty cells correctly', () => {
      const columnsWithTwoCols: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
      ];
      const data: CellData[][] = [
        [{}, {}], // Empty cells
      ];

      const result = convertToSpreadsheetData(data, columnsWithTwoCols, mockSpecifications);

      // Empty SKU cell should be readOnly with null value
      expect(result[0][0]).toEqual({ value: null, readOnly: true });
      // Empty spec cell should have dropdown options
      expect(result[0][1]).toEqual({ value: null, dropdownOptions: ['Red', 'Blue'] });
    });

    it('preserves background color as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', bg: '#fef3c7' }], // amber duplicate warning
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('bg-[#fef3c7]');
    });

    it('preserves font color as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', fc: '#dc2626' }], // red text
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('text-[#dc2626]');
    });

    it('preserves both background and font color as combined className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', bg: '#fce4ec', fc: '#dc2626' }], // pink bg, red text
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('bg-[#fce4ec] text-[#dc2626]');
    });

    it('preserves bold formatting as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', bold: true }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('cell-bold');
    });

    it('preserves italic formatting as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', italic: true }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('cell-italic');
    });

    it('preserves text alignment as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'Left', align: 'left' }],
        [{ v: 'Center', align: 'center' }],
        [{ v: 'Right', align: 'right' }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('cell-align-left');
      expect(result[1][0]?.className).toBe('cell-align-center');
      expect(result[2][0]?.className).toBe('cell-align-right');
    });

    it('preserves all formatting options combined as className', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001', bg: '#fce4ec', fc: '#dc2626', bold: true, italic: true, align: 'center' }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.className).toBe('bg-[#fce4ec] text-[#dc2626] cell-bold cell-italic cell-align-center');
    });

    it('handles cells with only m (display text) value', () => {
      const skuOnlyColumns: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
      ];
      const data: CellData[][] = [
        [{ m: 'SKU-001' }],
        [{ m: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, skuOnlyColumns, mockSpecifications);

      expect(result[0][0]?.value).toBe('SKU-001');
      expect(result[1][0]?.value).toBe('Red');
    });

    it('free columns have no dropdown options', () => {
      const columnsWithFree: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
        { id: 'col-notes', type: 'free', header: 'Notes' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Test note' }],
      ];

      const result = convertToSpreadsheetData(data, columnsWithFree, mockSpecifications);

      // Spec column should have dropdown
      expect(result[0][1]?.dropdownOptions).toEqual(['Red', 'Blue']);
      // Free column should NOT have dropdown
      expect(result[0][2]?.dropdownOptions).toBeUndefined();
      expect(result[0][2]?.value).toBe('Test note');
    });

    it('free columns are not readOnly', () => {
      const columnsWithFree: ColumnDef[] = [
        { id: 'col-sku', type: 'sku', header: 'SKU' },
        { id: 'col-notes', type: 'free', header: 'Notes' },
      ];
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Test note' }],
      ];

      const result = convertToSpreadsheetData(data, columnsWithFree, mockSpecifications);

      // SKU column should be readOnly
      expect(result[0][0]?.readOnly).toBe(true);
      // Free column should NOT be readOnly
      expect(result[0][1]?.readOnly).toBeUndefined();
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

    it('converts className back to bold', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'cell-bold' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'SKU-001', m: 'SKU-001', bold: true });
    });

    it('converts className back to italic', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'cell-italic' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'SKU-001', m: 'SKU-001', italic: true });
    });

    it('converts className back to text alignment', () => {
      const matrix: SKUMatrix = [
        [{ value: 'Left', className: 'cell-align-left' }],
        [{ value: 'Center', className: 'cell-align-center' }],
        [{ value: 'Right', className: 'cell-align-right' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({ v: 'Left', m: 'Left', align: 'left' });
      expect(result[1][0]).toEqual({ v: 'Center', m: 'Center', align: 'center' });
      expect(result[2][0]).toEqual({ v: 'Right', m: 'Right', align: 'right' });
    });

    it('converts className with all formatting options combined', () => {
      const matrix: SKUMatrix = [
        [{ value: 'SKU-001', className: 'bg-[#fce4ec] text-[#dc2626] cell-bold cell-italic cell-align-center' }],
      ];

      const result = convertFromSpreadsheetData(matrix);

      expect(result[0][0]).toEqual({
        v: 'SKU-001',
        m: 'SKU-001',
        bg: '#fce4ec',
        fc: '#dc2626',
        bold: true,
        italic: true,
        align: 'center'
      });
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
      // No header row - all rows are data rows
      const original: CellData[][] = [
        [{ v: 'SKU-R-S', m: 'SKU-R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
        [{ v: 'SKU-B-L', m: 'SKU-B-L' }, { v: 'Blue', m: 'Blue' }, { v: 'Large', m: 'Large' }],
      ];

      const spreadsheetData = convertToSpreadsheetData(original, mockColumns, mockSpecifications);
      const result = convertFromSpreadsheetData(spreadsheetData);

      // Values should be preserved
      expect(result[0][0]?.v).toBe('SKU-R-S');
      expect(result[0][1]?.v).toBe('Red');
      expect(result[1][2]?.v).toBe('Large');
    });
  });

  describe('dropdown colors', () => {
    const mockSpecsWithColors: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R', color: '#fce4ec' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B', color: '#e3f2fd' },
        ],
      },
    ];

    const mockSpecsWithPartialColors: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R', color: '#fce4ec' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' }, // No color
        ],
      },
    ];

    const mockSpecsWithoutColors: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ];

    const colorColumns: ColumnDef[] = [
      { id: 'col-sku', type: 'sku', header: 'SKU' },
      { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' },
    ];

    it('includes dropdownColors when spec values have colors', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithColors);

      expect(result[0][1]?.dropdownColors).toEqual({
        Red: '#fce4ec',
        Blue: '#e3f2fd',
      });
    });

    it('includes only values with colors in dropdownColors', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithPartialColors);

      expect(result[0][1]?.dropdownColors).toEqual({
        Red: '#fce4ec',
        // Blue has no color, so it's not included
      });
    });

    it('does not include dropdownColors when no values have colors', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithoutColors);

      expect(result[0][1]?.dropdownColors).toBeUndefined();
    });

    it('includes dropdownColors on empty spec cells', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, {}],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithColors);

      expect(result[0][1]?.dropdownColors).toEqual({
        Red: '#fce4ec',
        Blue: '#e3f2fd',
      });
    });

    it('dropdownColors are consistent across all data rows', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }],
        [{ v: 'SKU-002' }, { v: 'Blue' }],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithColors);

      expect(result[0][1]?.dropdownColors).toEqual(result[1][1]?.dropdownColors);
    });

    it('applies valueColor based on cell value matching spec value', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Red' }],
        [{ v: 'SKU-002' }, { v: 'Blue' }],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithColors);

      // Cell with 'Red' should have Red's color
      expect(result[0][1]?.valueColor).toBe('#fce4ec');
      // Cell with 'Blue' should have Blue's color
      expect(result[1][1]?.valueColor).toBe('#e3f2fd');
    });

    it('does not apply valueColor for empty cells', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, {}],
      ];

      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithColors);

      expect(result[0][1]?.valueColor).toBeUndefined();
    });

    it('does not apply valueColor for values without colors', () => {
      const data: CellData[][] = [
        [{ v: 'SKU-001' }, { v: 'Blue' }],
      ];

      // Blue has no color in mockSpecsWithPartialColors
      const result = convertToSpreadsheetData(data, colorColumns, mockSpecsWithPartialColors);

      expect(result[0][1]?.valueColor).toBeUndefined();
    });
  });

  describe('checkbox cells', () => {
    const freeColumns: ColumnDef[] = [
      { id: 'col-sku', type: 'sku', header: 'SKU' },
      { id: 'col-status', type: 'free', header: 'Status' },
    ];

    describe('convertToSpreadsheetData with checkbox cells', () => {
      it('preserves checkbox flag on cells', () => {
        // No header row - all rows are data rows
        const data: CellData[][] = [
          [{ v: 'SKU-1', m: 'SKU-1' }, { v: true, checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]).toMatchObject({
          value: true,
          checkbox: true,
        });
      });

      it('converts boolean true value for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: true, checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(true);
      });

      it('converts boolean false value for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: false, checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(false);
      });

      it('converts string "true" to boolean true for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: 'true', checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(true);
      });

      it('converts string "TRUE" to boolean true for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: 'TRUE', checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(true);
      });

      it('converts other string values to boolean false for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: 'false', checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(false);
      });

      it('converts null to boolean false for checkbox cells', () => {
        const data: CellData[][] = [
          [{ v: 'SKU-1' }, { v: null, checkbox: true }],
        ];

        const result = convertToSpreadsheetData(data, freeColumns, []);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.value).toBe(false);
      });
    });

    describe('convertFromSpreadsheetData with checkbox cells', () => {
      it('preserves checkbox flag when converting back', () => {
        const matrix: SKUMatrix = [
          [{ value: 'SKU-1' }, { value: true, checkbox: true }],
        ];

        const result = convertFromSpreadsheetData(matrix);

        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[0][1]?.v).toBe(true);
      });

      it('does not set display text (m) for checkbox cells', () => {
        const matrix: SKUMatrix = [
          [{ value: 'SKU-1' }, { value: true, checkbox: true }],
        ];

        const result = convertFromSpreadsheetData(matrix);

        expect(result[0][1]?.m).toBeUndefined();
      });

      it('sets display text (m) for non-checkbox cells', () => {
        const matrix: SKUMatrix = [
          [{ value: 'SKU-1' }, { value: 'Active' }],
        ];

        const result = convertFromSpreadsheetData(matrix);

        expect(result[0][1]?.m).toBe('Active');
      });
    });

    describe('round-trip conversion with checkbox cells', () => {
      it('preserves checkbox state through round-trip', () => {
        // No header row - all rows are data rows
        const original: CellData[][] = [
          [{ v: 'SKU-1' }, { v: true, checkbox: true }],
          [{ v: 'SKU-2' }, { v: false, checkbox: true }],
        ];

        const spreadsheetData = convertToSpreadsheetData(original, freeColumns, []);
        const result = convertFromSpreadsheetData(spreadsheetData);

        expect(result[0][1]?.v).toBe(true);
        expect(result[0][1]?.checkbox).toBe(true);
        expect(result[1][1]?.v).toBe(false);
        expect(result[1][1]?.checkbox).toBe(true);
      });
    });
  });
});
