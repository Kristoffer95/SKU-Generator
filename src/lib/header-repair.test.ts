import { describe, it, expect } from 'vitest';
import {
  createHeaderRow,
  hasValidHeader,
  headerMatchesSpecs,
  repairSheetHeaders,
  repairAllSheetHeaders,
  needsHeaderRepair,
} from './header-repair';
import type { SheetConfig, Specification, CellData } from '../types';

describe('header-repair', () => {
  const mockSpecs: Specification[] = [
    { id: 's1', name: 'Color', order: 0, values: [] },
    { id: 's2', name: 'Size', order: 1, values: [] },
    { id: 's3', name: 'Material', order: 2, values: [] },
  ];

  describe('createHeaderRow', () => {
    it('should create header with SKU and spec names sorted by order', () => {
      const header = createHeaderRow(mockSpecs);
      expect(header).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
        { v: 'Size', m: 'Size' },
        { v: 'Material', m: 'Material' },
      ]);
    });

    it('should sort specs by order field', () => {
      const unsortedSpecs: Specification[] = [
        { id: 's2', name: 'Size', order: 2, values: [] },
        { id: 's1', name: 'Color', order: 0, values: [] },
        { id: 's3', name: 'Material', order: 1, values: [] },
      ];
      const header = createHeaderRow(unsortedSpecs);
      expect(header).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
        { v: 'Material', m: 'Material' },
        { v: 'Size', m: 'Size' },
      ]);
    });

    it('should create header with only SKU when no specs', () => {
      const header = createHeaderRow([]);
      expect(header).toEqual([{ v: 'SKU', m: 'SKU' }]);
    });
  });

  describe('hasValidHeader', () => {
    it('should return true when first cell is SKU', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'SKU', m: 'SKU' }, { v: 'Color' }]],
      };
      expect(hasValidHeader(sheet)).toBe(true);
    });

    it('should return true for case-insensitive SKU match', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'sku' }]],
      };
      expect(hasValidHeader(sheet)).toBe(true);
    });

    it('should return true for SKU with whitespace', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: ' SKU ' }]],
      };
      expect(hasValidHeader(sheet)).toBe(true);
    });

    it('should return false when first cell is not SKU', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'Color' }, { v: 'Size' }]],
      };
      expect(hasValidHeader(sheet)).toBe(false);
    });

    it('should return false for empty sheet', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [],
      };
      expect(hasValidHeader(sheet)).toBe(false);
    });

    it('should return false for empty first row', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[]],
      };
      expect(hasValidHeader(sheet)).toBe(false);
    });

    it('should return false when first cell is empty', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: '' }, { v: 'Color' }]],
      };
      expect(hasValidHeader(sheet)).toBe(false);
    });

    it('should return true for non-data sheet types', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Config',
        type: 'config',
        data: [[{ v: 'Specification' }]],
      };
      expect(hasValidHeader(sheet)).toBe(true);
    });

    it('should use m property if v is undefined', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ m: 'SKU' }]],
      };
      expect(hasValidHeader(sheet)).toBe(true);
    });
  });

  describe('headerMatchesSpecs', () => {
    it('should return true when header matches specs', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [
          [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }, { v: 'Material' }],
        ],
      };
      expect(headerMatchesSpecs(sheet, mockSpecs)).toBe(true);
    });

    it('should return false when header missing specs', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'SKU' }, { v: 'Color' }]],
      };
      expect(headerMatchesSpecs(sheet, mockSpecs)).toBe(false);
    });

    it('should return false when spec names in wrong order', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [
          [{ v: 'SKU' }, { v: 'Size' }, { v: 'Color' }, { v: 'Material' }],
        ],
      };
      expect(headerMatchesSpecs(sheet, mockSpecs)).toBe(false);
    });

    it('should return false when no valid header', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'Color' }, { v: 'Size' }]],
      };
      expect(headerMatchesSpecs(sheet, mockSpecs)).toBe(false);
    });

    it('should return true for non-data sheets', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Config',
        type: 'config',
        data: [[{ v: 'Something' }]],
      };
      expect(headerMatchesSpecs(sheet, mockSpecs)).toBe(true);
    });

    it('should return true when no specs and header only has SKU', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [[{ v: 'SKU' }]],
      };
      expect(headerMatchesSpecs(sheet, [])).toBe(true);
    });
  });

  describe('repairSheetHeaders', () => {
    it('should insert header row and shift data down', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [
          [{ v: 'Red' }, { v: 'Small' }],
          [{ v: 'Blue' }, { v: 'Large' }],
        ],
      };

      const repaired = repairSheetHeaders(sheet, mockSpecs);

      expect(repaired.data).toHaveLength(3);
      expect(repaired.data[0]).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
        { v: 'Size', m: 'Size' },
        { v: 'Material', m: 'Material' },
      ]);
      expect(repaired.data[1]).toEqual([{ v: 'Red' }, { v: 'Small' }]);
      expect(repaired.data[2]).toEqual([{ v: 'Blue' }, { v: 'Large' }]);
    });

    it('should not modify sheet that already has valid header', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [
          [{ v: 'SKU' }, { v: 'Color' }],
          [{ v: 'R-S' }, { v: 'Red' }],
        ],
      };

      const repaired = repairSheetHeaders(sheet, mockSpecs);

      expect(repaired).toBe(sheet); // Same reference, no changes
      expect(repaired.data).toHaveLength(2);
    });

    it('should not modify non-data sheets', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Config',
        type: 'config',
        data: [[{ v: 'Specification' }]],
      };

      const repaired = repairSheetHeaders(sheet, mockSpecs);

      expect(repaired).toBe(sheet);
    });

    it('should handle empty sheet', () => {
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: [],
      };

      const repaired = repairSheetHeaders(sheet, mockSpecs);

      expect(repaired.data).toHaveLength(1);
      expect(repaired.data[0]).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
        { v: 'Size', m: 'Size' },
        { v: 'Material', m: 'Material' },
      ]);
    });

    it('should not mutate original sheet', () => {
      const originalData: CellData[][] = [
        [{ v: 'Red' }, { v: 'Small' }],
      ];
      const sheet: SheetConfig = {
        id: '1',
        name: 'Test',
        type: 'data',
        data: originalData,
      };

      const repaired = repairSheetHeaders(sheet, mockSpecs);

      expect(sheet.data).toBe(originalData);
      expect(sheet.data).toHaveLength(1);
      expect(repaired.data).toHaveLength(2);
    });
  });

  describe('repairAllSheetHeaders', () => {
    it('should repair all sheets needing repair', () => {
      const sheets: SheetConfig[] = [
        {
          id: '1',
          name: 'Sheet1',
          type: 'data',
          data: [[{ v: 'Red' }]], // Needs repair
        },
        {
          id: '2',
          name: 'Sheet2',
          type: 'data',
          data: [[{ v: 'SKU' }, { v: 'Color' }]], // Already has header
        },
        {
          id: '3',
          name: 'Sheet3',
          type: 'data',
          data: [[{ v: 'Blue' }]], // Needs repair
        },
      ];

      const repaired = repairAllSheetHeaders(sheets, mockSpecs);

      expect(repaired[0].data).toHaveLength(2); // Header added
      expect(repaired[0].data[0][0]).toEqual({ v: 'SKU', m: 'SKU' });
      expect(repaired[0].data[1]).toEqual([{ v: 'Red' }]);

      expect(repaired[1].data).toHaveLength(1); // Unchanged
      expect(repaired[1]).toBe(sheets[1]);

      expect(repaired[2].data).toHaveLength(2); // Header added
      expect(repaired[2].data[0][0]).toEqual({ v: 'SKU', m: 'SKU' });
    });

    it('should return same array if no repairs needed', () => {
      const sheets: SheetConfig[] = [
        {
          id: '1',
          name: 'Sheet1',
          type: 'data',
          data: [[{ v: 'SKU' }]],
        },
      ];

      const repaired = repairAllSheetHeaders(sheets, mockSpecs);

      expect(repaired[0]).toBe(sheets[0]);
    });
  });

  describe('needsHeaderRepair', () => {
    it('should return true when any data sheet needs repair', () => {
      const sheets: SheetConfig[] = [
        {
          id: '1',
          name: 'Good',
          type: 'data',
          data: [[{ v: 'SKU' }]],
        },
        {
          id: '2',
          name: 'Bad',
          type: 'data',
          data: [[{ v: 'Color' }]],
        },
      ];

      expect(needsHeaderRepair(sheets)).toBe(true);
    });

    it('should return false when all data sheets have valid headers', () => {
      const sheets: SheetConfig[] = [
        {
          id: '1',
          name: 'Good1',
          type: 'data',
          data: [[{ v: 'SKU' }]],
        },
        {
          id: '2',
          name: 'Good2',
          type: 'data',
          data: [[{ v: 'sku' }]],
        },
      ];

      expect(needsHeaderRepair(sheets)).toBe(false);
    });

    it('should return false for empty sheets array', () => {
      expect(needsHeaderRepair([])).toBe(false);
    });

    it('should ignore non-data sheets', () => {
      const sheets: SheetConfig[] = [
        {
          id: '1',
          name: 'Config',
          type: 'config',
          data: [[{ v: 'Specification' }]], // No SKU but it's not a data sheet
        },
      ];

      expect(needsHeaderRepair(sheets)).toBe(false);
    });
  });
});
