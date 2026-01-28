import { describe, it, expect } from 'vitest';
import { convertParsedSpecsToSpecifications, migrateConfigSheetData } from './migration';
import type { ParsedSpec, CellData } from '../types';

describe('migration', () => {
  describe('convertParsedSpecsToSpecifications', () => {
    it('should convert ParsedSpec[] to Specification[] format', () => {
      const parsedSpecs: ParsedSpec[] = [
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
          ],
        },
      ];

      const result = convertParsedSpecsToSpecifications(parsedSpecs);

      expect(result).toHaveLength(2);

      // Color spec
      expect(result[0].name).toBe('Color');
      expect(result[0].order).toBe(0);
      expect(result[0].id).toBeDefined();
      expect(result[0].values).toHaveLength(2);
      expect(result[0].values[0].displayValue).toBe('Red');
      expect(result[0].values[0].skuFragment).toBe('R');
      expect(result[0].values[0].id).toBeDefined();
      expect(result[0].values[1].displayValue).toBe('Blue');
      expect(result[0].values[1].skuFragment).toBe('B');

      // Size spec
      expect(result[1].name).toBe('Size');
      expect(result[1].order).toBe(1);
      expect(result[1].values).toHaveLength(1);
      expect(result[1].values[0].displayValue).toBe('Small');
      expect(result[1].values[0].skuFragment).toBe('S');
    });

    it('should assign sequential order values', () => {
      const parsedSpecs: ParsedSpec[] = [
        { name: 'A', values: [] },
        { name: 'B', values: [] },
        { name: 'C', values: [] },
      ];

      const result = convertParsedSpecsToSpecifications(parsedSpecs);

      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });

    it('should generate unique IDs for specs and values', () => {
      const parsedSpecs: ParsedSpec[] = [
        {
          name: 'Test',
          values: [
            { label: 'A', skuCode: 'A' },
            { label: 'B', skuCode: 'B' },
          ],
        },
      ];

      const result = convertParsedSpecsToSpecifications(parsedSpecs);

      expect(result[0].id).toBeDefined();
      expect(result[0].values[0].id).toBeDefined();
      expect(result[0].values[1].id).toBeDefined();
      expect(result[0].values[0].id).not.toBe(result[0].values[1].id);
    });

    it('should handle empty specs array', () => {
      const result = convertParsedSpecsToSpecifications([]);
      expect(result).toEqual([]);
    });

    it('should handle specs with empty values', () => {
      const parsedSpecs: ParsedSpec[] = [
        { name: 'Empty', values: [] },
      ];

      const result = convertParsedSpecsToSpecifications(parsedSpecs);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Empty');
      expect(result[0].values).toEqual([]);
    });
  });

  describe('migrateConfigSheetData', () => {
    it('should migrate Config sheet data to Specification[] format', () => {
      const configData: CellData[][] = [
        // Header row
        [
          { v: 'Specification', m: 'Specification' },
          { v: 'Value', m: 'Value' },
          { v: 'SKU Code', m: 'SKU Code' },
        ],
        // Data rows
        [{ v: 'Color', m: 'Color' }, { v: 'Red', m: 'Red' }, { v: 'R', m: 'R' }],
        [{ v: 'Color', m: 'Color' }, { v: 'Blue', m: 'Blue' }, { v: 'B', m: 'B' }],
        [{ v: 'Size', m: 'Size' }, { v: 'Small', m: 'Small' }, { v: 'S', m: 'S' }],
      ];

      const result = migrateConfigSheetData(configData);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0].name).toBe('Color');
      expect(result![0].values).toHaveLength(2);
      expect(result![1].name).toBe('Size');
      expect(result![1].values).toHaveLength(1);
    });

    it('should return null for empty Config sheet (headers only)', () => {
      const configData: CellData[][] = [
        [
          { v: 'Specification', m: 'Specification' },
          { v: 'Value', m: 'Value' },
          { v: 'SKU Code', m: 'SKU Code' },
        ],
      ];

      const result = migrateConfigSheetData(configData);

      expect(result).toBeNull();
    });

    it('should return null for completely empty Config sheet', () => {
      const result = migrateConfigSheetData([]);
      expect(result).toBeNull();
    });

    it('should preserve skuFragment values', () => {
      const configData: CellData[][] = [
        [{ v: 'Spec' }, { v: 'Val' }, { v: 'Code' }],
        [{ v: 'Material', m: 'Material' }, { v: 'Cotton', m: 'Cotton' }, { v: 'COT', m: 'COT' }],
      ];

      const result = migrateConfigSheetData(configData);

      expect(result).not.toBeNull();
      expect(result![0].values[0].skuFragment).toBe('COT');
    });

    it('should group values by specification name', () => {
      const configData: CellData[][] = [
        [{ v: 'Spec' }, { v: 'Val' }, { v: 'Code' }],
        [{ v: 'Type', m: 'Type' }, { v: 'A', m: 'A' }, { v: 'TA', m: 'TA' }],
        [{ v: 'Type', m: 'Type' }, { v: 'B', m: 'B' }, { v: 'TB', m: 'TB' }],
        [{ v: 'Type', m: 'Type' }, { v: 'C', m: 'C' }, { v: 'TC', m: 'TC' }],
      ];

      const result = migrateConfigSheetData(configData);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('Type');
      expect(result![0].values).toHaveLength(3);
    });
  });
});
