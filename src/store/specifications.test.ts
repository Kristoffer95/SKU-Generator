import { describe, it, expect, beforeEach } from 'vitest';
import { useSpecificationsStore } from './specifications';

describe('useSpecificationsStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useSpecificationsStore.setState({ specifications: [] });
  });

  describe('addSpecification', () => {
    it('should add a specification with correct structure', () => {
      const { addSpecification } = useSpecificationsStore.getState();
      const id = addSpecification('Color');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(1);
      expect(specifications[0]).toEqual({
        id,
        name: 'Color',
        values: [],
        columnIndex: 0,
      });
    });

    it('should increment columnIndex for each new spec', () => {
      const { addSpecification } = useSpecificationsStore.getState();
      addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications.map((s) => s.columnIndex)).toEqual([0, 1, 2]);
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
    it('should remove specification and recalculate indices', () => {
      const { addSpecification, removeSpecification } = useSpecificationsStore.getState();
      const id1 = addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      removeSpecification(id1);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(2);
      expect(specifications.map((s) => s.columnIndex)).toEqual([0, 1]);
      expect(specifications.map((s) => s.name)).toEqual(['Size', 'Material']);
    });
  });

  describe('reorderSpecifications', () => {
    it('should reorder specifications and recalculate indices', () => {
      const { addSpecification, reorderSpecifications } = useSpecificationsStore.getState();
      addSpecification('Color');
      addSpecification('Size');
      addSpecification('Material');

      reorderSpecifications(0, 2);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications.map((s) => s.name)).toEqual(['Size', 'Material', 'Color']);
      expect(specifications.map((s) => s.columnIndex)).toEqual([0, 1, 2]);
    });
  });

  describe('spec values', () => {
    it('should add a value to a specification', () => {
      const { addSpecification, addSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values).toHaveLength(1);
      expect(specifications[0].values[0]).toEqual({
        id: valueId,
        label: 'Red',
        skuCode: 'R',
      });
    });

    it('should update a value', () => {
      const { addSpecification, addSpecValue, updateSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');

      updateSpecValue(specId, valueId, { skuCode: 'RD' });

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values[0].skuCode).toBe('RD');
    });

    it('should remove a value', () => {
      const { addSpecification, addSpecValue, removeSpecValue } = useSpecificationsStore.getState();
      const specId = addSpecification('Color');
      const valueId = addSpecValue(specId, 'Red', 'R');
      addSpecValue(specId, 'Blue', 'B');

      removeSpecValue(specId, valueId);

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications[0].values).toHaveLength(1);
      expect(specifications[0].values[0].label).toBe('Blue');
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
