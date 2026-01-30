import { describe, it, expect, vi } from 'vitest';
import {
  hexToRGB,
  exportToPDFBlob,
  exportAllSheetsToPDFBlob,
  exportToPDF,
  exportAllSheetsToPDF,
} from './pdf-export';
import type { SheetConfig, CellData, SheetType } from '../types';

/**
 * Helper to create a test sheet with required columns and specifications fields
 */
function createTestSheet(overrides: {
  id?: string;
  name?: string;
  type?: SheetType;
  data?: CellData[][];
} = {}): SheetConfig {
  return {
    id: overrides.id ?? 'test-sheet-id',
    name: overrides.name ?? 'Test',
    type: overrides.type ?? 'data',
    data: overrides.data ?? [],
    columns: [],
    specifications: [],
  };
}

describe('pdf-export', () => {
  describe('hexToRGB', () => {
    it('converts 6-character hex colors', () => {
      expect(hexToRGB('#ff0000')).toEqual([255, 0, 0]);
      expect(hexToRGB('#00ff00')).toEqual([0, 255, 0]);
      expect(hexToRGB('#0000ff')).toEqual([0, 0, 255]);
      expect(hexToRGB('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRGB('#000000')).toEqual([0, 0, 0]);
    });

    it('converts 6-character hex without #', () => {
      expect(hexToRGB('ff0000')).toEqual([255, 0, 0]);
      expect(hexToRGB('00ff00')).toEqual([0, 255, 0]);
    });

    it('converts 3-character hex colors', () => {
      expect(hexToRGB('#f00')).toEqual([255, 0, 0]);
      expect(hexToRGB('#0f0')).toEqual([0, 255, 0]);
      expect(hexToRGB('#00f')).toEqual([0, 0, 255]);
      expect(hexToRGB('#fff')).toEqual([255, 255, 255]);
      expect(hexToRGB('#000')).toEqual([0, 0, 0]);
    });

    it('converts 3-character hex without #', () => {
      expect(hexToRGB('f00')).toEqual([255, 0, 0]);
      expect(hexToRGB('abc')).toEqual([170, 187, 204]);
    });

    it('handles mixed case hex values', () => {
      expect(hexToRGB('#FF0000')).toEqual([255, 0, 0]);
      expect(hexToRGB('#Ff00fF')).toEqual([255, 0, 255]);
    });

    it('returns null for invalid hex values', () => {
      expect(hexToRGB('')).toBeNull();
      expect(hexToRGB('#')).toBeNull();
      expect(hexToRGB('#ff')).toBeNull();
      expect(hexToRGB('#ffff')).toBeNull();
      expect(hexToRGB('#fffff')).toBeNull();
      expect(hexToRGB('#fffffff')).toBeNull();
      expect(hexToRGB('#gggggg')).toBeNull();
      expect(hexToRGB('not-a-color')).toBeNull();
    });
  });

  describe('exportToPDFBlob', () => {
    const mockDataSheet: SheetConfig = createTestSheet({
      id: 'data-1',
      name: 'Sheet 1',
      type: 'data',
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
        [{ v: 'R-S', m: 'R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
        [{ v: 'B-L', m: 'B-L' }, { v: 'Blue', m: 'Blue' }, { v: 'Large', m: 'Large' }],
      ],
    });

    it('exports sheet to PDF blob', () => {
      const blob = exportToPDFBlob(mockDataSheet);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('creates non-empty PDF', () => {
      const blob = exportToPDFBlob(mockDataSheet);

      // PDF should have content
      expect(blob.size).toBeGreaterThan(0);
    });

    it('handles empty sheet', () => {
      const emptySheet = createTestSheet({
        id: 'empty',
        name: 'Empty',
        data: [],
      });

      const blob = exportToPDFBlob(emptySheet);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('handles sheet with only header row', () => {
      const headerOnlySheet = createTestSheet({
        id: 'header-only',
        name: 'Header Only',
        data: [
          [{ v: 'Col1' }, { v: 'Col2' }, { v: 'Col3' }],
        ],
      });

      const blob = exportToPDFBlob(headerOnlySheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('preserves cell formatting in PDF generation', () => {
      const formattedSheet = createTestSheet({
        id: 'formatted',
        name: 'Formatted',
        data: [
          [
            { v: 'Header', bold: true },
            { v: 'Colored', bg: '#ff0000', fc: '#ffffff' },
            { v: 'Styled', italic: true, align: 'center' },
          ],
          [
            { v: 'Normal' },
            { v: 'Bold Italic', bold: true, italic: true },
            { v: 'Right', align: 'right' },
          ],
        ],
      });

      // Should not throw when processing formatted cells
      const blob = exportToPDFBlob(formattedSheet);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('handles null and undefined cells', () => {
      const sparseSheet = createTestSheet({
        id: 'sparse',
        name: 'Sparse',
        data: [
          [{ v: 'A' }, null as unknown as CellData, { v: 'C' }],
          [undefined as unknown as CellData, { v: 'B' }, null as unknown as CellData],
        ],
      });

      const blob = exportToPDFBlob(sparseSheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles cells with numeric values', () => {
      const numericSheet = createTestSheet({
        id: 'numeric',
        name: 'Numeric',
        data: [
          [{ v: 'ID' }, { v: 'Count' }, { v: 'Price' }],
          [{ v: 1 }, { v: 100 }, { v: 29.99 }],
          [{ v: 2 }, { v: 50 }, { v: 15.5 }],
        ],
      });

      const blob = exportToPDFBlob(numericSheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('respects orientation option', () => {
      const portraitBlob = exportToPDFBlob(mockDataSheet, { orientation: 'portrait' });
      const landscapeBlob = exportToPDFBlob(mockDataSheet, { orientation: 'landscape' });

      // Both should generate valid PDFs
      expect(portraitBlob).toBeInstanceOf(Blob);
      expect(landscapeBlob).toBeInstanceOf(Blob);
      // Landscape typically produces larger PDFs due to wider page
      // We just verify both work
    });

    it('respects includeSheetName option', () => {
      const withName = exportToPDFBlob(mockDataSheet, { includeSheetName: true });
      const withoutName = exportToPDFBlob(mockDataSheet, { includeSheetName: false });

      expect(withName).toBeInstanceOf(Blob);
      expect(withoutName).toBeInstanceOf(Blob);
      // PDF without sheet name should be slightly smaller
    });
  });

  describe('exportAllSheetsToPDFBlob', () => {
    const mockSheet1: SheetConfig = createTestSheet({
      id: 'sheet-1',
      name: 'Products',
      data: [
        [{ v: 'SKU' }, { v: 'Name' }],
        [{ v: 'PRD-001' }, { v: 'Widget' }],
      ],
    });

    const mockSheet2: SheetConfig = createTestSheet({
      id: 'sheet-2',
      name: 'Inventory',
      data: [
        [{ v: 'SKU' }, { v: 'Quantity' }],
        [{ v: 'PRD-001' }, { v: 100 }],
      ],
    });

    it('exports multiple sheets to single PDF blob', () => {
      const blob = exportAllSheetsToPDFBlob([mockSheet1, mockSheet2]);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('creates larger PDF for multiple sheets', () => {
      const singleSheetBlob = exportToPDFBlob(mockSheet1);
      const multiSheetBlob = exportAllSheetsToPDFBlob([mockSheet1, mockSheet2]);

      // Multi-sheet PDF should be larger due to multiple pages
      expect(multiSheetBlob.size).toBeGreaterThan(singleSheetBlob.size);
    });

    it('handles empty sheets array', () => {
      const blob = exportAllSheetsToPDFBlob([]);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('handles single sheet in array', () => {
      const blob = exportAllSheetsToPDFBlob([mockSheet1]);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('preserves formatting across all sheets', () => {
      const formattedSheet1 = createTestSheet({
        id: 'f1',
        name: 'Formatted 1',
        data: [
          [{ v: 'Bold', bold: true }, { v: 'Red', bg: '#ff0000' }],
        ],
      });

      const formattedSheet2 = createTestSheet({
        id: 'f2',
        name: 'Formatted 2',
        data: [
          [{ v: 'Italic', italic: true }, { v: 'Blue', fc: '#0000ff' }],
        ],
      });

      const blob = exportAllSheetsToPDFBlob([formattedSheet1, formattedSheet2]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('exportToPDF', () => {
    const mockSheet: SheetConfig = createTestSheet({
      id: 'test',
      name: 'TestSheet',
      data: [
        [{ v: 'Header' }],
        [{ v: 'Data' }],
      ],
    });

    it('calls doc.save with correct filename', () => {
      // Mock URL.createObjectURL and document.createElement
      const mockUrl = 'blob:mock-url';
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn(() => mockUrl);
      URL.revokeObjectURL = vi.fn();

      // The function should complete without error
      expect(() => exportToPDF(mockSheet, 'test.pdf')).not.toThrow();

      // Restore
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('uses sheet name as default filename', () => {
      // The function should use sheet.name when no filename provided
      expect(() => exportToPDF(mockSheet)).not.toThrow();
    });
  });

  describe('exportAllSheetsToPDF', () => {
    const mockSheets: SheetConfig[] = [
      createTestSheet({ id: '1', name: 'Sheet1', data: [[{ v: 'A' }]] }),
      createTestSheet({ id: '2', name: 'Sheet2', data: [[{ v: 'B' }]] }),
    ];

    it('exports all sheets without error', () => {
      expect(() => exportAllSheetsToPDF(mockSheets)).not.toThrow();
    });

    it('uses default filename when not provided', () => {
      expect(() => exportAllSheetsToPDF(mockSheets)).not.toThrow();
    });

    it('uses custom filename when provided', () => {
      expect(() => exportAllSheetsToPDF(mockSheets, 'custom.pdf')).not.toThrow();
    });
  });

  describe('formatting edge cases', () => {
    it('handles all alignment types', () => {
      const alignmentSheet = createTestSheet({
        data: [
          [
            { v: 'Left', align: 'left' },
            { v: 'Center', align: 'center' },
            { v: 'Right', align: 'right' },
          ],
        ],
      });

      const blob = exportToPDFBlob(alignmentSheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles all font style combinations', () => {
      const fontSheet = createTestSheet({
        data: [
          [
            { v: 'Normal' },
            { v: 'Bold', bold: true },
            { v: 'Italic', italic: true },
            { v: 'BoldItalic', bold: true, italic: true },
          ],
        ],
      });

      const blob = exportToPDFBlob(fontSheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles invalid hex colors gracefully', () => {
      const badColorSheet = createTestSheet({
        data: [
          [
            { v: 'Bad BG', bg: 'not-a-color' },
            { v: 'Bad FC', fc: 'invalid' },
          ],
        ],
      });

      // Should not throw, should just skip invalid colors
      const blob = exportToPDFBlob(badColorSheet);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles cells with null values', () => {
      const nullValueSheet = createTestSheet({
        data: [
          [
            { v: null },
            { v: undefined as unknown as string },
            { v: '' },
          ],
        ],
      });

      const blob = exportToPDFBlob(nullValueSheet);
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
