import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSampleConfigData,
  getSampleProductData,
  createSampleSheets,
  isFirstLaunch,
  markAsInitialized,
} from './sample-data';

describe('sample-data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getSampleConfigData', () => {
    it('returns array with header row plus 9 spec entries', () => {
      const data = getSampleConfigData();
      expect(data).toHaveLength(10); // 1 header + 9 specs
    });

    it('has correct header row', () => {
      const data = getSampleConfigData();
      expect(data[0]).toHaveLength(3);
      expect(data[0][0].v).toBe('Specification');
      expect(data[0][1].v).toBe('Value');
      expect(data[0][2].v).toBe('SKU Code');
    });

    it('includes 3 Color specs', () => {
      const data = getSampleConfigData();
      const colorRows = data.filter((row) => row[0]?.v === 'Color');
      expect(colorRows).toHaveLength(3);
      expect(colorRows.map((r) => r[1].v)).toEqual(['Red', 'Blue', 'Green']);
      expect(colorRows.map((r) => r[2].v)).toEqual(['R', 'B', 'G']);
    });

    it('includes 3 Size specs', () => {
      const data = getSampleConfigData();
      const sizeRows = data.filter((row) => row[0]?.v === 'Size');
      expect(sizeRows).toHaveLength(3);
      expect(sizeRows.map((r) => r[1].v)).toEqual(['Small', 'Medium', 'Large']);
      expect(sizeRows.map((r) => r[2].v)).toEqual(['S', 'M', 'L']);
    });

    it('includes 3 Material specs', () => {
      const data = getSampleConfigData();
      const materialRows = data.filter((row) => row[0]?.v === 'Material');
      expect(materialRows).toHaveLength(3);
      expect(materialRows.map((r) => r[1].v)).toEqual(['Cotton', 'Polyester', 'Wool']);
      expect(materialRows.map((r) => r[2].v)).toEqual(['COT', 'POL', 'WOL']);
    });
  });

  describe('getSampleProductData', () => {
    it('returns array with header row plus 5 products', () => {
      const data = getSampleProductData();
      expect(data).toHaveLength(6); // 1 header + 5 products
    });

    it('has correct header row with SKU first', () => {
      const data = getSampleProductData();
      expect(data[0]).toHaveLength(4);
      expect(data[0][0].v).toBe('SKU');
      expect(data[0][1].v).toBe('Color');
      expect(data[0][2].v).toBe('Size');
      expect(data[0][3].v).toBe('Material');
    });

    it('product 1: Red, Small, Cotton -> R-S-COT', () => {
      const data = getSampleProductData();
      expect(data[1][0].v).toBe('R-S-COT');
      expect(data[1][1].v).toBe('Red');
      expect(data[1][2].v).toBe('Small');
      expect(data[1][3].v).toBe('Cotton');
    });

    it('product 2: Blue, Medium, Polyester -> B-M-POL', () => {
      const data = getSampleProductData();
      expect(data[2][0].v).toBe('B-M-POL');
      expect(data[2][1].v).toBe('Blue');
      expect(data[2][2].v).toBe('Medium');
      expect(data[2][3].v).toBe('Polyester');
    });

    it('product 3: Green, Large, Wool -> G-L-WOL', () => {
      const data = getSampleProductData();
      expect(data[3][0].v).toBe('G-L-WOL');
      expect(data[3][1].v).toBe('Green');
      expect(data[3][2].v).toBe('Large');
      expect(data[3][3].v).toBe('Wool');
    });

    it('product 4: Red, Large, Cotton -> R-L-COT', () => {
      const data = getSampleProductData();
      expect(data[4][0].v).toBe('R-L-COT');
      expect(data[4][1].v).toBe('Red');
      expect(data[4][2].v).toBe('Large');
      expect(data[4][3].v).toBe('Cotton');
    });

    it('product 5: Blue, Small, Polyester -> B-S-POL', () => {
      const data = getSampleProductData();
      expect(data[5][0].v).toBe('B-S-POL');
      expect(data[5][1].v).toBe('Blue');
      expect(data[5][2].v).toBe('Small');
      expect(data[5][3].v).toBe('Polyester');
    });
  });

  describe('createSampleSheets', () => {
    it('returns config sheet and product sheet', () => {
      const { configSheet, productSheet } = createSampleSheets();
      expect(configSheet).toBeDefined();
      expect(productSheet).toBeDefined();
    });

    it('config sheet has correct properties', () => {
      const { configSheet } = createSampleSheets();
      expect(configSheet.name).toBe('Config');
      expect(configSheet.type).toBe('config');
      expect(configSheet.id).toBeDefined();
      expect(configSheet.data).toHaveLength(10);
    });

    it('product sheet has correct properties', () => {
      const { productSheet } = createSampleSheets();
      expect(productSheet.name).toBe('Sample Products');
      expect(productSheet.type).toBe('data');
      expect(productSheet.id).toBeDefined();
      expect(productSheet.data).toHaveLength(6);
    });

    it('sheets have unique IDs', () => {
      const { configSheet, productSheet } = createSampleSheets();
      expect(configSheet.id).not.toBe(productSheet.id);
    });
  });

  describe('isFirstLaunch', () => {
    it('returns true when localStorage is empty', () => {
      expect(isFirstLaunch()).toBe(true);
    });

    it('returns true when sku-has-data key does not exist', () => {
      localStorage.setItem('other-key', 'value');
      expect(isFirstLaunch()).toBe(true);
    });

    it('returns true when sku-has-data is not "true"', () => {
      localStorage.setItem('sku-has-data', 'false');
      expect(isFirstLaunch()).toBe(true);
    });

    it('returns false when sku-has-data is "true"', () => {
      localStorage.setItem('sku-has-data', 'true');
      expect(isFirstLaunch()).toBe(false);
    });

    it('ignores sku-sheets key (avoids race condition)', () => {
      // Even if sku-sheets has data, we use sku-has-data for detection
      localStorage.setItem(
        'sku-sheets',
        JSON.stringify({
          state: {
            sheets: [{ id: '1', name: 'Config', type: 'config', data: [] }],
          },
        })
      );
      expect(isFirstLaunch()).toBe(true); // Because sku-has-data not set
    });
  });

  describe('markAsInitialized', () => {
    it('sets sku-has-data to "true"', () => {
      expect(localStorage.getItem('sku-has-data')).toBeNull();
      markAsInitialized();
      expect(localStorage.getItem('sku-has-data')).toBe('true');
    });

    it('causes isFirstLaunch to return false', () => {
      expect(isFirstLaunch()).toBe(true);
      markAsInitialized();
      expect(isFirstLaunch()).toBe(false);
    });
  });
});
