import { describe, it, expect, beforeEach } from 'vitest';
import { useSpecificationsStore } from './specifications';

describe('useSpecificationsStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useSpecificationsStore.setState({ specifications: [] });
  });

  describe('addSpecification', () => {
    it('should add a specification with correct structure including order field', () => {
      const { addSpecification } = useSpecificationsStore.getState();
      const id = addSpecification('Color');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(1);
      expect(specifications[0]).toEqual({
        id,
        name: 'Color',
        values: [],
        order: 0,
      });
    });

    it('should increment order for each new spec', () => {
      const { addSpecification } = useSpecificationsStore.getState();
      addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications.map((s) => s.order)).toEqual([0, 1, 2]);
    });
  });

  describe('updateSpecification', () => {
    it('should update specification name', () => {
      const { addSpecification, updateSpecification } = useSpecificationsStore.getState();
      const id = addSpecification('Color');

      updateSpecification(id, { name: 'Colour' });

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].name).toBe('Colour');
    });
  });

  describe('removeSpecification', () => {
    it('should remove specification and recalculate order values', () => {
      const { addSpecification, removeSpecification } = useSpecificationsStore.getState();
      const id1 = addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      removeSpecification(id1);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(2);
      expect(specifications.map((s) => s.order)).toEqual([0, 1]);
      expect(specifications.map((s) => s.name)).toEqual(['Size', 'Material']);
    });
  });

  describe('reorderSpec', () => {
    it('should reorder specification by specId and newOrder', () => {
      const { addSpecification, reorderSpec } = useSpecificationsStore.getState();
      const id1 = addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      // Move Color (order 0) to order 2
      reorderSpec(id1, 2);

      const { specifications } = useSpecificationsStore.getState();
      const sorted = [...specifications].sort((a, b) => a.order - b.order);
      expect(sorted.map((s) => s.name)).toEqual(['Size', 'Material', 'Color']);
      expect(sorted.map((s) => s.order)).toEqual([0, 1, 2]);
    });

    it('should handle moving spec up (from higher to lower order)', () => {
      const { addSpecification, reorderSpec } = useSpecificationsStore.getState();
      addSpecification('Color');
      addSpecification('Size');
      const id3 = addSpecification('Material');

      // Move Material (order 2) to order 0
      reorderSpec(id3, 0);

      const { specifications } = useSpecificationsStore.getState();
      const sorted = [...specifications].sort((a, b) => a.order - b.order);
      expect(sorted.map((s) => s.name)).toEqual(['Material', 'Color', 'Size']);
      expect(sorted.map((s) => s.order)).toEqual([0, 1, 2]);
    });

    it('should do nothing if spec not found', () => {
      const { addSpecification, reorderSpec } = useSpecificationsStore.getState();
      addSpecification('Color');

      reorderSpec('non-existent', 5);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].order).toBe(0);
    });

    it('should do nothing if newOrder equals current order', () => {
      const { addSpecification, reorderSpec } = useSpecificationsStore.getState();
      const id = addSpecification('Color');

      reorderSpec(id, 0);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].order).toBe(0);
    });
  });

  describe('spec values', () => {
    it('should add a value with displayValue and skuFragment', () => {
      const { addSpecification, addSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values).toHaveLength(1);
      expect(specifications[0].values[0]).toEqual({
        id: valueId,
        displayValue: 'Red',
        skuFragment: 'R',
      });
    });

    it('should update a value skuFragment', () => {
      const { addSpecification, addSpecValue, updateSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');

      updateSpecValue(specId, valueId, { skuFragment: 'RD' });

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values[0].skuFragment).toBe('RD');
    });

    it('should update a value displayValue', () => {
      const { addSpecification, addSpecValue, updateSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');

      updateSpecValue(specId, valueId, { displayValue: 'Crimson' });

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values[0].displayValue).toBe('Crimson');
    });

    it('should remove a value', () => {
      const { addSpecification, addSpecValue, removeSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');
      addSpecValue(specId, 'Blue', 'B');

      removeSpecValue(specId, valueId);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values).toHaveLength(1);
      expect(specifications[0].values[0].displayValue).toBe('Blue');
    });
  });

  describe('getSpecificationById', () => {
    it('should return specification by id', () => {
      const { addSpecification, getSpecificationById } = useSpecificationsStore.getState();
      const id = addSpecification('Color');

      const spec = getSpecificationById(id);
      expect(spec?.name).toBe('Color');
    });

    it('should return undefined for non-existent id', () => {
      const { getSpecificationById } = useSpecificationsStore.getState();
      const spec = getSpecificationById('non-existent');
      expect(spec).toBeUndefined();
    });
  });
});
