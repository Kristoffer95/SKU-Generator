import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  exportToExcelBlob,
  sheetToCSVString,
  importFromExcel,
} from './import-export';
import type { SheetConfig } from '../types';

describe('import-export', () => {
  const mockConfigSheet: SheetConfig = {
    id: 'config-1',
    name: 'Config',
    type: 'config',
    data: [
      [{ v: 'Specification', m: 'Specification' }, { v: 'Value', m: 'Value' }, { v: 'SKU Code', m: 'SKU Code' }],
      [{ v: 'Color', m: 'Color' }, { v: 'Red', m: 'Red' }, { v: 'R', m: 'R' }],
      [{ v: 'Color', m: 'Color' }, { v: 'Blue', m: 'Blue' }, { v: 'B', m: 'B' }],
      [{ v: 'Size', m: 'Size' }, { v: 'Small', m: 'Small' }, { v: 'S', m: 'S' }],
    ],
  };

  const mockDataSheet: SheetConfig = {
    id: 'data-1',
    name: 'Sheet 1',
    type: 'data',
    data: [
      [{ v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }, { v: 'SKU', m: 'SKU' }],
      [{ v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }, { v: 'R-S', m: 'R-S' }],
    ],
  };

  describe('exportToExcelBlob', () => {
    it('exports sheets to Excel blob', () => {
      const sheets = [mockConfigSheet, mockDataSheet];
      const blob = exportToExcelBlob(sheets);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('places Config sheet first in export', async () => {
      // Put data sheet first in input
      const sheets = [mockDataSheet, mockConfigSheet];
      const blob = exportToExcelBlob(sheets);

      // Read back using FileReader
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

      // Config should be first sheet
      expect(workbook.SheetNames[0]).toBe('Config');
      expect(workbook.SheetNames[1]).toBe('Sheet 1');
    });

    it('includes all sheet data in export', async () => {
      const sheets = [mockConfigSheet, mockDataSheet];
      const blob = exportToExcelBlob(sheets);

      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

      // Verify Config sheet data
      const configSheet = workbook.Sheets['Config'];
      expect(configSheet['A1']?.v).toBe('Specification');
      expect(configSheet['B2']?.v).toBe('Red');

      // Verify data sheet data
      const dataSheet = workbook.Sheets['Sheet 1'];
      expect(dataSheet['A1']?.v).toBe('Color');
      expect(dataSheet['C2']?.v).toBe('R-S');
    });

    it('handles empty sheets', () => {
      const emptySheet: SheetConfig = {
        id: 'empty-1',
        name: 'Empty',
        type: 'data',
        data: [],
      };

      const blob = exportToExcelBlob([emptySheet]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('sheetToCSVString', () => {
    it('converts sheet to CSV format', () => {
      const csv = sheetToCSVString(mockDataSheet);

      expect(csv).toContain('Color,Size,SKU');
      expect(csv).toContain('Red,Small,R-S');
    });

    it('handles empty cells in CSV', () => {
      const sheetWithEmpty: SheetConfig = {
        id: 'test-1',
        name: 'Test',
        type: 'data',
        data: [
          [{ v: 'A', m: 'A' }, {}, { v: 'C', m: 'C' }],
        ],
      };

      const csv = sheetToCSVString(sheetWithEmpty);
      expect(csv).toContain('A,,C');
    });

    it('returns empty for empty sheet', () => {
      const emptySheet: SheetConfig = {
        id: 'empty-1',
        name: 'Empty',
        type: 'data',
        data: [],
      };

      const csv = sheetToCSVString(emptySheet);
      expect(csv).toBe('');
    });
  });

  describe('importFromExcel', () => {
    it('imports Excel file to SheetConfig array', async () => {
      // Create a test workbook
      const workbook = XLSX.utils.book_new();
      const configData = [
        ['Specification', 'Value', 'SKU Code'],
        ['Color', 'Red', 'R'],
      ];
      const dataData = [
        ['Color', 'SKU'],
        ['Red', 'R'],
      ];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(configData), 'Config');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataData), 'Sheet 1');

      // Convert to blob/file
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new File([buffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const sheets = await importFromExcel(file);

      expect(sheets).toHaveLength(2);
      // Config sheet should be first
      expect(sheets[0].type).toBe('config');
      expect(sheets[0].name).toBe('Config');
      expect(sheets[1].type).toBe('data');
      expect(sheets[1].name).toBe('Sheet 1');
    });

    it('identifies Config sheet case-insensitively', async () => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['A']]), 'CONFIG');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new File([buffer], 'test.xlsx');

      const sheets = await importFromExcel(file);

      expect(sheets[0].type).toBe('config');
    });

    it('treats all sheets as data if no Config sheet', async () => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['A']]), 'Sheet1');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['B']]), 'Sheet2');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new File([buffer], 'test.xlsx');

      const sheets = await importFromExcel(file);

      expect(sheets).toHaveLength(2);
      expect(sheets[0].type).toBe('data');
      expect(sheets[1].type).toBe('data');
    });

    it('assigns unique IDs to imported sheets', async () => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['A']]), 'Sheet1');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['B']]), 'Sheet2');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new File([buffer], 'test.xlsx');

      const sheets = await importFromExcel(file);

      expect(sheets[0].id).toBeDefined();
      expect(sheets[1].id).toBeDefined();
      expect(sheets[0].id).not.toBe(sheets[1].id);
    });

    it('preserves cell values during import', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Name', 'Value'],
        ['Test', 123],
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), 'Data');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new File([buffer], 'test.xlsx');

      const sheets = await importFromExcel(file);

      expect(sheets[0].data[0][0].v).toBe('Name');
      expect(sheets[0].data[0][1].v).toBe('Value');
      expect(sheets[0].data[1][0].v).toBe('Test');
      expect(sheets[0].data[1][1].v).toBe(123);
    });
  });

  describe('round-trip export/import', () => {
    it('preserves data through export and import cycle', async () => {
      const sheets = [mockConfigSheet, mockDataSheet];

      // Export
      const blob = exportToExcelBlob(sheets);

      // Import back
      const file = new File([blob], 'test.xlsx');
      const importedSheets = await importFromExcel(file);

      // Verify structure preserved
      expect(importedSheets).toHaveLength(2);
      expect(importedSheets[0].type).toBe('config');
      expect(importedSheets[1].type).toBe('data');

      // Verify Config sheet data
      expect(importedSheets[0].data[0][0].v).toBe('Specification');
      expect(importedSheets[0].data[1][1].v).toBe('Red');
      expect(importedSheets[0].data[1][2].v).toBe('R');

      // Verify data sheet data
      expect(importedSheets[1].data[0][0].v).toBe('Color');
      expect(importedSheets[1].data[1][2].v).toBe('R-S');
    });
  });
});
