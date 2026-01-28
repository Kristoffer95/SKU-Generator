/**
 * PRD-012: End-to-End Verification Tests
 *
 * These integration tests verify the complete workflow:
 * 1. Config sheet spec definitions -> parsed correctly (legacy - for migration)
 * 2. SKU generation from row values using specifications from store
 * 3. Settings (delimiter, prefix, suffix) applied correctly
 * 4. Export/import round-trip preserves Config and data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseConfigSheet, getSpecValues, lookupSkuCode, getSpecNames } from './config-sheet';
import { generateRowSKU, extractColumnHeaders, getRowValuesWithoutSKU } from './sheet-sku';
import { updateRowSKU, processAutoSKU } from './auto-sku';
import { exportToExcelBlob, sheetToCSVString, importFromExcel } from './import-export';
import type { CellData, SheetConfig, ParsedSpec, Specification } from '../types';

describe('PRD-012: End-to-End Verification', () => {
  // Sample Config sheet data matching PRD-012 requirements:
  // Temperature: 29deg C/29C, 30deg C/30C
  // Color: Red/R, Blue/B
  // Type: Standard/STD, Premium/PRM
  const configSheetData: CellData[][] = [
    [{ v: 'Specification', m: 'Specification' }, { v: 'Value', m: 'Value' }, { v: 'SKU Code', m: 'SKU Code' }],
    [{ v: 'Temperature', m: 'Temperature' }, { v: '29deg C', m: '29deg C' }, { v: '29C', m: '29C' }],
    [{ v: 'Temperature', m: 'Temperature' }, { v: '30deg C', m: '30deg C' }, { v: '30C', m: '30C' }],
    [{ v: 'Color', m: 'Color' }, { v: 'Red', m: 'Red' }, { v: 'R', m: 'R' }],
    [{ v: 'Color', m: 'Color' }, { v: 'Blue', m: 'Blue' }, { v: 'B', m: 'B' }],
    [{ v: 'Type', m: 'Type' }, { v: 'Standard', m: 'Standard' }, { v: 'STD', m: 'STD' }],
    [{ v: 'Type', m: 'Type' }, { v: 'Premium', m: 'Premium' }, { v: 'PRM', m: 'PRM' }],
  ];

  // Specifications array (new format used by store) - equivalent data to configSheetData
  const specifications: Specification[] = [
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

  let parsedSpecs: ParsedSpec[];

  beforeEach(() => {
    parsedSpecs = parseConfigSheet(configSheetData);
  });

  describe('Step 1-3: Config sheet parsing (legacy - for migration)', () => {
    it('parses Temperature specification with 2 values', () => {
      const tempValues = getSpecValues(parsedSpecs, 'Temperature');
      expect(tempValues).toHaveLength(2);
      expect(tempValues[0]).toEqual({ label: '29deg C', skuCode: '29C' });
      expect(tempValues[1]).toEqual({ label: '30deg C', skuCode: '30C' });
    });

    it('parses Color specification with 2 values', () => {
      const colorValues = getSpecValues(parsedSpecs, 'Color');
      expect(colorValues).toHaveLength(2);
      expect(colorValues[0]).toEqual({ label: 'Red', skuCode: 'R' });
      expect(colorValues[1]).toEqual({ label: 'Blue', skuCode: 'B' });
    });

    it('parses Type specification with 2 values', () => {
      const typeValues = getSpecValues(parsedSpecs, 'Type');
      expect(typeValues).toHaveLength(2);
      expect(typeValues[0]).toEqual({ label: 'Standard', skuCode: 'STD' });
      expect(typeValues[1]).toEqual({ label: 'Premium', skuCode: 'PRM' });
    });

    it('returns all 3 spec names', () => {
      const specNames = getSpecNames(parsedSpecs);
      expect(specNames).toContain('Temperature');
      expect(specNames).toContain('Color');
      expect(specNames).toContain('Type');
      expect(specNames).toHaveLength(3);
    });
  });

  describe('Step 4: Data sheet with columns matching specs', () => {
    // Data sheet header row: SKU, Temperature, Color, Type (SKU is Column A)
    const headerRow: CellData[] = [
      { v: 'SKU' },
      { v: 'Temperature' },
      { v: 'Color' },
      { v: 'Type' }
    ];

    it('extracts column headers correctly (excluding SKU at index 0)', () => {
      const headers = extractColumnHeaders(headerRow);
      expect(headers).toEqual(['Temperature', 'Color', 'Type']);
    });

    it('dropdowns would show correct values for Temperature column', () => {
      const tempValues = getSpecValues(parsedSpecs, 'Temperature');
      const labels = tempValues.map(v => v.label);
      expect(labels).toContain('29deg C');
      expect(labels).toContain('30deg C');
    });
  });

  describe('Step 5-6: SKU auto-generation when values selected', () => {
    const settings = { delimiter: '-', prefix: '', suffix: '' };

    it('generates SKU "29C-R-STD" for 29deg C, Red, Standard', () => {
      // Data row with selected values as CellData[]
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('29C-R-STD');
    });

    it('updates SKU column in row data (first column)', () => {
      // updateRowSKU takes the full sheet data and a row index
      // SKU is now at index 0
      const sheetData: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Temperature' }, { v: 'Color' }, { v: 'Type' }], // headers
        [{ v: '' }, { v: '29deg C' }, { v: 'Red' }, { v: 'Standard' }], // data row
      ];

      updateRowSKU(sheetData, 1, specifications, settings);

      expect(sheetData[1][0].v).toBe('29C-R-STD');
      expect(sheetData[1][0].m).toBe('29C-R-STD');
    });
  });

  describe('Step 7: SKU updates when value changes', () => {
    const settings = { delimiter: '-', prefix: '', suffix: '' };

    it('generates SKU "29C-B-STD" when Color changes from Red to Blue', () => {
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Blue' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('29C-B-STD');
    });

    it('processAutoSKU detects change and updates SKU', () => {
      // SKU is now at index 0
      const oldData: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Temperature' }, { v: 'Color' }, { v: 'Type' }],
        [{ v: '29C-R-STD' }, { v: '29deg C' }, { v: 'Red' }, { v: 'Standard' }],
      ];

      const newData: CellData[][] = [
        [{ v: 'SKU' }, { v: 'Temperature' }, { v: 'Color' }, { v: 'Type' }],
        [{ v: '29C-R-STD' }, { v: '29deg C' }, { v: 'Blue' }, { v: 'Standard' }], // Color changed, SKU not yet updated
      ];

      processAutoSKU(oldData, newData, specifications, settings);

      // SKU should now be updated at index 0
      expect(newData[1][0].v).toBe('29C-B-STD');
    });
  });

  describe('Step 8: Export verification', () => {
    const configSheet: SheetConfig = {
      id: 'config-1',
      name: 'Config',
      type: 'config',
      data: configSheetData,
    };

    // SKU is now at index 0 (Column A)
    const dataSheet: SheetConfig = {
      id: 'data-1',
      name: 'Sheet 1',
      type: 'data',
      data: [
        [{ v: 'SKU' }, { v: 'Temperature' }, { v: 'Color' }, { v: 'Type' }],
        [{ v: '29C-R-STD' }, { v: '29deg C' }, { v: 'Red' }, { v: 'Standard' }],
      ],
    };

    it('exports to Excel blob with Config and data sheets', () => {
      const blob = exportToExcelBlob([configSheet, dataSheet]);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('exports data sheet to CSV with correct content', () => {
      const csv = sheetToCSVString(dataSheet);
      expect(csv).toContain('SKU,Temperature,Color,Type');
      expect(csv).toContain('29C-R-STD,29deg C,Red,Standard');
    });

    it('round-trip preserves Config sheet data', async () => {
      const blob = exportToExcelBlob([configSheet, dataSheet]);
      const file = new File([blob], 'test.xlsx', { type: blob.type });

      const imported = await importFromExcel(file);

      // Config sheet should be first
      expect(imported[0].type).toBe('config');
      expect(imported[0].name).toBe('Config');

      // Verify Config data preserved
      const importedConfig = imported[0].data;
      expect(importedConfig.length).toBeGreaterThanOrEqual(configSheetData.length);

      // Check spec values are preserved
      // Row 1: Temperature, 29deg C, 29C
      expect(importedConfig[1][0]?.v).toBe('Temperature');
      expect(importedConfig[1][1]?.v).toBe('29deg C');
      expect(importedConfig[1][2]?.v).toBe('29C');
    });

    it('round-trip preserves data sheet with SKU', async () => {
      const blob = exportToExcelBlob([configSheet, dataSheet]);
      const file = new File([blob], 'test.xlsx', { type: blob.type });

      const imported = await importFromExcel(file);

      // Data sheet should be second
      const importedData = imported.find(s => s.type === 'data');
      expect(importedData).toBeDefined();

      // Check data values preserved including SKU at index 0
      const dataRows = importedData!.data;
      expect(dataRows[1][0]?.v).toBe('29C-R-STD');
    });
  });

  describe('Settings variations', () => {
    it('uses underscore delimiter correctly', () => {
      const settings = { delimiter: '_', prefix: '', suffix: '' };
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('29C_R_STD');
    });

    it('adds prefix and suffix correctly', () => {
      const settings = { delimiter: '-', prefix: 'PRD-', suffix: '-v1' };
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('PRD-29C-R-STD-v1');
    });

    it('handles no delimiter (concatenated codes)', () => {
      const settings = { delimiter: '', prefix: '', suffix: '' };
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('29CRSTD');
    });
  });

  describe('Edge cases', () => {
    const settings = { delimiter: '-', prefix: '', suffix: '' };

    it('handles partial row (missing Type)', () => {
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: '' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('29C-R');
    });

    it('handles values not in specs (no SKU code found)', () => {
      const rowValues: CellData[] = [
        { v: 'Unknown' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      // Unknown value has no SKU code, only Red and Standard contribute
      expect(sku).toBe('R-STD');
    });

    it('handles empty row', () => {
      const rowValues: CellData[] = [
        { v: '' },
        { v: '' },
        { v: '' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      expect(sku).toBe('');
    });

    it('lookupSkuCode returns correct code (legacy - for migration)', () => {
      const code = lookupSkuCode(parsedSpecs, 'Temperature', '29deg C');
      expect(code).toBe('29C');
    });

    it('lookupSkuCode returns empty string for unknown value (legacy)', () => {
      const code = lookupSkuCode(parsedSpecs, 'Temperature', 'Unknown');
      expect(code).toBe('');
    });

    it('getRowValuesWithoutSKU excludes first column (SKU)', () => {
      // SKU is now at index 0
      const row: CellData[] = [
        { v: '29C-R-STD' }, // SKU column at index 0
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];

      const values = getRowValuesWithoutSKU(row);
      expect(values).toHaveLength(3);
      expect(values[0]?.v).toBe('29deg C');
      expect(values[2]?.v).toBe('Standard');
    });
  });

  describe('Order field independence (new behavior)', () => {
    const settings = { delimiter: '-', prefix: '', suffix: '' };

    it('SKU composition is based on spec order, not column order', () => {
      // Specs with different order: Type=0, Color=1, Temperature=2
      const reorderedSpecs: Specification[] = [
        {
          id: 'type',
          name: 'Type',
          order: 0,
          values: [{ id: 'v1', displayValue: 'Standard', skuFragment: 'STD' }],
        },
        {
          id: 'color',
          name: 'Color',
          order: 1,
          values: [{ id: 'v2', displayValue: 'Red', skuFragment: 'R' }],
        },
        {
          id: 'temp',
          name: 'Temperature',
          order: 2,
          values: [{ id: 'v3', displayValue: '29deg C', skuFragment: '29C' }],
        },
      ];

      // Data sheet columns in original order: Temperature, Color, Type
      const rowValues: CellData[] = [
        { v: '29deg C' },
        { v: 'Red' },
        { v: 'Standard' },
      ];
      const headers = ['Temperature', 'Color', 'Type'];

      const sku = generateRowSKU(rowValues, headers, reorderedSpecs, settings);
      // SKU should be STD-R-29C based on order (Type=0, Color=1, Temp=2)
      expect(sku).toBe('STD-R-29C');
    });

    it('reordering columns in data sheet does not change SKU', () => {
      // Data sheet with reversed column order: Type, Color, Temperature
      const rowValues: CellData[] = [
        { v: 'Standard' },
        { v: 'Red' },
        { v: '29deg C' },
      ];
      const headers = ['Type', 'Color', 'Temperature'];

      const sku = generateRowSKU(rowValues, headers, specifications, settings);
      // SKU should still be 29C-R-STD based on spec order (Temp=0, Color=1, Type=2)
      expect(sku).toBe('29C-R-STD');
    });
  });
});
