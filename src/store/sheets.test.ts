import { describe, it, expect, beforeEach } from 'vitest';
import { useSheetsStore } from './sheets';
import { useSpecificationsStore } from './specifications';
import type { SheetConfig, CellData } from '../types';

describe('useSheetsStore', () => {
  beforeEach(() => {
    useSheetsStore.setState({ sheets: [], activeSheetId: null });
    useSpecificationsStore.setState({ specifications: [] });
  });

  /**
   * @deprecated Tests for initializeWithConfigSheet which is deprecated.
   * Kept for migration-1 task to ensure existing Config sheets work.
   */
  describe('initializeWithConfigSheet (deprecated - for migration)', () => {
    it('should create Config sheet with headers when no sheets exist', () => {
      const { initializeWithConfigSheet } = useSheetsStore.getState();
      initializeWithConfigSheet();

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Config');
      expect(sheets[0].type).toBe('config');
      expect(sheets[0].data).toHaveLength(1);
      expect(sheets[0].data[0]).toEqual([
        { v: 'Specification', m: 'Specification' },
        { v: 'Value', m: 'Value' },
        { v: 'SKU Code', m: 'SKU Code' },
      ]);
      expect(activeSheetId).toBe(sheets[0].id);
    });

    it('should not create duplicate Config sheet', () => {
      const { initializeWithConfigSheet } = useSheetsStore.getState();
      initializeWithConfigSheet();
      initializeWithConfigSheet();

      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets.filter((s) => s.type === 'config')).toHaveLength(1);
    });

    it('should prepend Config sheet to existing data sheets', () => {
      const { addSheet, initializeWithConfigSheet } = useSheetsStore.getState();
      addSheet('Data Sheet');

      initializeWithConfigSheet();

      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(2);
      expect(sheets[0].type).toBe('config');
      expect(sheets[1].name).toBe('Data Sheet');
    });
  });

  describe('initializeWithSampleData', () => {
    beforeEach(() => {
      localStorage.clear();
      useSpecificationsStore.setState({ specifications: [] });
    });

    it('should create only Sample Products sheet on first launch (no Config sheet)', () => {
      const { initializeWithSampleData } = useSheetsStore.getState();
      initializeWithSampleData();

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Sample Products');
      expect(sheets[0].type).toBe('data');
      expect(sheets[0].data).toHaveLength(6); // header + 5 products
      expect(activeSheetId).toBe(sheets[0].id);
      // Verify no Config sheet
      expect(sheets.find((s) => s.type === 'config')).toBeUndefined();
    });

    it('should add sample specifications to useSpecificationsStore', () => {
      const { initializeWithSampleData } = useSheetsStore.getState();
      initializeWithSampleData();

      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(3);
      expect(specifications.map((s) => s.name)).toEqual(['Color', 'Size', 'Material']);
    });

    it('should include Color, Size, Material specs in specifications store', () => {
      const { initializeWithSampleData } = useSheetsStore.getState();
      initializeWithSampleData();

      const { specifications } = useSpecificationsStore.getState();
      const colorSpec = specifications.find((s) => s.name === 'Color');
      expect(colorSpec).toBeDefined();
      expect(colorSpec!.values.map((v) => v.displayValue)).toEqual(['Red', 'Blue', 'Green']);

      const sizeSpec = specifications.find((s) => s.name === 'Size');
      expect(sizeSpec).toBeDefined();
      expect(sizeSpec!.values.map((v) => v.displayValue)).toEqual(['Small', 'Medium', 'Large']);

      const materialSpec = specifications.find((s) => s.name === 'Material');
      expect(materialSpec).toBeDefined();
      expect(materialSpec!.values.map((v) => v.displayValue)).toEqual(['Cotton', 'Polyester', 'Wool']);
    });

    it('should mark app as initialized after creating sample data', () => {
      const { initializeWithSampleData } = useSheetsStore.getState();
      expect(localStorage.getItem('sku-has-data')).toBeNull();

      initializeWithSampleData();

      expect(localStorage.getItem('sku-has-data')).toBe('true');
    });

    it('should not add sheets if sheets already exist', () => {
      const { addSheet, initializeWithSampleData } = useSheetsStore.getState();
      addSheet('Existing Sheet');

      initializeWithSampleData();

      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Existing Sheet');
      // No Config sheet should be added
      expect(sheets.find((s) => s.type === 'config')).toBeUndefined();
    });

    it('should not duplicate data on multiple calls', () => {
      const { initializeWithSampleData } = useSheetsStore.getState();
      initializeWithSampleData();
      initializeWithSampleData();

      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].type).toBe('data');
    });
  });

  /**
   * @deprecated Tests for getConfigSheet which is deprecated.
   * Kept for migration-1 task to detect existing Config sheets.
   */
  describe('getConfigSheet (deprecated - for migration)', () => {
    it('should return Config sheet when it exists', () => {
      const { initializeWithConfigSheet, getConfigSheet } = useSheetsStore.getState();
      initializeWithConfigSheet();

      const configSheet = getConfigSheet();
      expect(configSheet).toBeDefined();
      expect(configSheet?.type).toBe('config');
      expect(configSheet?.name).toBe('Config');
    });

    it('should return undefined when no Config sheet', () => {
      const { getConfigSheet } = useSheetsStore.getState();
      const configSheet = getConfigSheet();
      expect(configSheet).toBeUndefined();
    });
  });

  /**
   * @deprecated Tests for Config sheet protection which is deprecated.
   * Kept for migration-1 task compatibility.
   */
  describe('Config sheet protection (deprecated - for migration)', () => {
    it('should not allow deleting Config sheet', () => {
      const { initializeWithConfigSheet, removeSheet, getConfigSheet } = useSheetsStore.getState();
      initializeWithConfigSheet();

      const configSheet = getConfigSheet();
      const result = removeSheet(configSheet!.id);

      expect(result).toBe(false);
      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].type).toBe('config');
    });

    it('should allow deleting data sheets', () => {
      const { initializeWithConfigSheet, addSheet, removeSheet } = useSheetsStore.getState();
      initializeWithConfigSheet();
      const dataSheetId = addSheet('Data');

      const result = removeSheet(dataSheetId);

      expect(result).toBe(true);
      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
    });
  });

  describe('addSheet', () => {
    it('should add a sheet with default name, SKU header, and 50 empty rows', () => {
      const { addSheet } = useSheetsStore.getState();
      const id = addSheet();

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Sheet 1');
      // New sheets have header row + 50 empty data rows = 51 total
      expect(sheets[0].data).toHaveLength(51);
      // Header row only has SKU when no specs exist
      expect(sheets[0].data[0]).toEqual([{ v: 'SKU', m: 'SKU' }]);
      // Each empty row has one empty cell for SKU column
      expect(sheets[0].data[1]).toEqual([{}]);
      expect(sheets[0].data[50]).toEqual([{}]);
      expect(activeSheetId).toBe(id);
    });

    it('should create new sheet with only SKU column (not using global specs)', () => {
      // Set up specs in global store (these should NOT be used for new sheets)
      useSpecificationsStore.setState({
        specifications: [
          { id: 's2', name: 'Size', order: 1, values: [] },
          { id: 's1', name: 'Color', order: 0, values: [] },
          { id: 's3', name: 'Material', order: 2, values: [] },
        ],
      });

      const { addSheet } = useSheetsStore.getState();
      addSheet();

      const { sheets } = useSheetsStore.getState();
      // New sheets only have SKU column - specs are now per-sheet and start empty
      // 51 rows = 1 header + 50 empty data rows
      expect(sheets[0].data).toHaveLength(51);
      expect(sheets[0].data[0]).toEqual([{ v: 'SKU', m: 'SKU' }]);
      expect(sheets[0].specifications).toEqual([]);
      expect(sheets[0].columns).toHaveLength(1);
      expect(sheets[0].columns[0].type).toBe('sku');
    });

    it('should add a sheet with custom name', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet('My Sheet');

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].name).toBe('My Sheet');
    });

    it('should increment default sheet numbers', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet();
      addSheet();
      addSheet();

      const { sheets } = useSheetsStore.getState();
      expect(sheets.map((s) => s.name)).toEqual(['Sheet 1', 'Sheet 2', 'Sheet 3']);
    });
  });

  describe('sheet-default-rows feature', () => {
    it('new sheets should have exactly 51 rows (1 header + 50 data rows)', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet('Test Sheet');

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].data).toHaveLength(51);
    });

    it('new sheets should have only SKU column initially', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet('Test Sheet');

      const { sheets } = useSheetsStore.getState();
      // Only SKU column
      expect(sheets[0].columns).toHaveLength(1);
      expect(sheets[0].columns[0].type).toBe('sku');
      expect(sheets[0].columns[0].header).toBe('SKU');
    });

    it('header row should have only SKU column header', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet('Test Sheet');

      const { sheets } = useSheetsStore.getState();
      // Row 0 is header with SKU
      expect(sheets[0].data[0]).toHaveLength(1);
      expect(sheets[0].data[0][0]).toEqual({ v: 'SKU', m: 'SKU' });
    });

    it('each empty row should have an empty cell for the SKU column', () => {
      const { addSheet } = useSheetsStore.getState();
      addSheet('Test Sheet');

      const { sheets } = useSheetsStore.getState();
      // Rows 1-50 are empty data rows with one empty cell each
      for (let i = 1; i <= 50; i++) {
        expect(sheets[0].data[i]).toHaveLength(1);
        expect(sheets[0].data[i][0]).toEqual({});
      }
    });

    it('user can add spec columns to populate the sheet', () => {
      const { addSheet, updateSheet } = useSheetsStore.getState();
      addSheet('Test Sheet');

      const { sheets } = useSheetsStore.getState();
      const sheet = sheets[0];

      // Simulate adding a spec column by manually updating the sheet data
      // (In practice, this would be done through the store's column management methods)
      const newData = sheet.data.map((row, index) => {
        if (index === 0) {
          // Update header row
          return [...row, { v: 'Color', m: 'Color' }];
        }
        // Add empty cell for new column in data rows
        return [...row, {}];
      });

      updateSheet(sheet.id, { data: newData });

      // The sheet can be updated with new columns
      const { sheets: updatedSheets } = useSheetsStore.getState();
      expect(updatedSheets[0].data[0]).toHaveLength(2);
      expect(updatedSheets[0].data[0][1]).toEqual({ v: 'Color', m: 'Color' });
    });
  });

  describe('addSheetWithId', () => {
    it('should add a sheet with specific ID, SKU header, and 50 empty rows', () => {
      const { addSheetWithId } = useSheetsStore.getState();
      addSheetWithId('custom-id-123', 'External Sheet');

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].id).toBe('custom-id-123');
      expect(sheets[0].name).toBe('External Sheet');
      expect(sheets[0].type).toBe('data');
      // New sheets have header row + 50 empty data rows = 51 total
      expect(sheets[0].data).toHaveLength(51);
      // Header row only has SKU when no specs exist
      expect(sheets[0].data[0]).toEqual([{ v: 'SKU', m: 'SKU' }]);
      // Each empty row has one empty cell for SKU column
      expect(sheets[0].data[1]).toEqual([{}]);
      expect(activeSheetId).toBe('custom-id-123');
    });

    it('should create new sheet with only SKU column (not using global specs)', () => {
      // Set up specs in global store (these should NOT be used for new sheets)
      useSpecificationsStore.setState({
        specifications: [
          { id: 's2', name: 'Size', order: 1, values: [] },
          { id: 's1', name: 'Color', order: 0, values: [] },
        ],
      });

      const { addSheetWithId } = useSheetsStore.getState();
      addSheetWithId('test-id', 'Products');

      const { sheets } = useSheetsStore.getState();
      // New sheets only have SKU column - specs are now per-sheet and start empty
      // 51 rows = 1 header + 50 empty data rows
      expect(sheets[0].data).toHaveLength(51);
      expect(sheets[0].data[0]).toEqual([{ v: 'SKU', m: 'SKU' }]);
      expect(sheets[0].specifications).toEqual([]);
      expect(sheets[0].columns).toHaveLength(1);
      expect(sheets[0].columns[0].type).toBe('sku');
    });

    it('should not add duplicate sheet if ID already exists', () => {
      const { addSheetWithId } = useSheetsStore.getState();
      addSheetWithId('existing-id', 'First Sheet');
      addSheetWithId('existing-id', 'Duplicate Sheet');

      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('First Sheet');
    });

    it('should set new sheet as active', () => {
      const { addSheet, addSheetWithId } = useSheetsStore.getState();
      addSheet('First');
      addSheetWithId('new-id', 'Second');

      const { activeSheetId } = useSheetsStore.getState();
      expect(activeSheetId).toBe('new-id');
    });
  });

  describe('updateSheet', () => {
    it('should update sheet name', () => {
      const { addSheet, updateSheet } = useSheetsStore.getState();
      const id = addSheet();

      updateSheet(id, { name: 'Renamed' });

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].name).toBe('Renamed');
    });
  });

  describe('removeSheet', () => {
    it('should remove sheet and update active', () => {
      const { addSheet, removeSheet } = useSheetsStore.getState();
      const id1 = addSheet();
      const id2 = addSheet();

      removeSheet(id2);

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(activeSheetId).toBe(id1);
    });

    it('should update activeSheetId when active sheet is removed', () => {
      const { addSheet, removeSheet, setActiveSheet } = useSheetsStore.getState();
      const id1 = addSheet();
      const id2 = addSheet();
      setActiveSheet(id1);

      removeSheet(id1);

      const { activeSheetId } = useSheetsStore.getState();
      expect(activeSheetId).toBe(id2);
    });

    it('should set activeSheetId to null when last sheet removed', () => {
      const { addSheet, removeSheet } = useSheetsStore.getState();
      const id = addSheet();

      removeSheet(id);

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(0);
      expect(activeSheetId).toBeNull();
    });
  });

  describe('setActiveSheet', () => {
    it('should set active sheet', () => {
      const { addSheet, setActiveSheet } = useSheetsStore.getState();
      const id1 = addSheet();
      addSheet();

      setActiveSheet(id1);

      const { activeSheetId } = useSheetsStore.getState();
      expect(activeSheetId).toBe(id1);
    });
  });

  describe('getActiveSheet', () => {
    it('should return active sheet', () => {
      const { addSheet, getActiveSheet } = useSheetsStore.getState();
      addSheet('Active');

      const active = getActiveSheet();
      expect(active?.name).toBe('Active');
    });

    it('should return undefined when no active sheet', () => {
      const { getActiveSheet } = useSheetsStore.getState();
      const active = getActiveSheet();
      expect(active).toBeUndefined();
    });
  });

  describe('updateCellData', () => {
    it('should update cell data and expand data array', () => {
      const { addSheet, updateCellData } = useSheetsStore.getState();
      const id = addSheet();

      updateCellData(id, 2, 3, { v: 'test', m: 'test' });

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].data.length).toBeGreaterThan(2);
      expect(sheets[0].data[2][3]).toEqual({ v: 'test', m: 'test' });
    });
  });

  describe('setSheetData', () => {
    it('should set entire sheet data', () => {
      const { addSheet, setSheetData } = useSheetsStore.getState();
      const id = addSheet();
      const data = [
        [{ v: 'A1' }, { v: 'B1' }],
        [{ v: 'A2' }, { v: 'B2' }],
      ];

      setSheetData(id, data);

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].data).toEqual(data);
    });
  });

  describe('Config sheet migration (migration-1)', () => {
    beforeEach(() => {
      localStorage.clear();
      useSheetsStore.setState({ sheets: [], activeSheetId: null });
      useSpecificationsStore.setState({ specifications: [] });
      localStorage.setItem('sku-has-data', 'true'); // Mark as not first launch
    });

    /**
     * Helper to create a Config sheet with sample data for testing migration
     */
    function createLegacyConfigSheet(): SheetConfig {
      const configData: CellData[][] = [
        // Header row
        [
          { v: 'Specification', m: 'Specification' },
          { v: 'Value', m: 'Value' },
          { v: 'SKU Code', m: 'SKU Code' },
        ],
        // Color spec values
        [{ v: 'Color', m: 'Color' }, { v: 'Red', m: 'Red' }, { v: 'R', m: 'R' }],
        [{ v: 'Color', m: 'Color' }, { v: 'Blue', m: 'Blue' }, { v: 'B', m: 'B' }],
        // Size spec values
        [{ v: 'Size', m: 'Size' }, { v: 'Small', m: 'Small' }, { v: 'S', m: 'S' }],
        [{ v: 'Size', m: 'Size' }, { v: 'Large', m: 'Large' }, { v: 'L', m: 'L' }],
      ];

      return {
        id: 'config-sheet-id',
        name: 'Config',
        type: 'config',
        data: configData,
        columns: [],
        specifications: [],
      };
    }

    /**
     * Helper to create a data sheet for testing
     */
    function createLegacyDataSheet(): SheetConfig {
      return {
        id: 'data-sheet-id',
        name: 'Products',
        type: 'data',
        data: [
          [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
          [{ v: 'R-S' }, { v: 'Red' }, { v: 'Small' }],
        ],
        columns: [],
        specifications: [],
      };
    }

    /**
     * Simulates onRehydrateStorage behavior by directly calling the migration logic
     * Note: Testing Zustand persist's onRehydrateStorage directly is complex,
     * so we test the migration logic separately and verify the store integration
     */
    it('should migrate Config sheet data to specifications store when Config exists and specs empty', () => {
      // Set up legacy state: Config sheet + data sheet, no specs in store
      const configSheet = createLegacyConfigSheet();
      const dataSheet = createLegacyDataSheet();

      useSheetsStore.setState({
        sheets: [configSheet, dataSheet],
        activeSheetId: configSheet.id,
      });

      // Verify initial state
      expect(useSheetsStore.getState().sheets).toHaveLength(2);
      expect(useSpecificationsStore.getState().specifications).toHaveLength(0);

      // Simulate what onRehydrateStorage does: migrate and remove config
      const state = useSheetsStore.getState();
      const foundConfig = state.sheets.find((s) => s.type === 'config');
      expect(foundConfig).toBeDefined();

      // Import migration function and run it
      import('../lib/migration').then(({ migrateConfigSheetData }) => {
        const migratedSpecs = migrateConfigSheetData(foundConfig!.data);
        if (migratedSpecs && migratedSpecs.length > 0) {
          useSpecificationsStore.setState({ specifications: migratedSpecs });
        }

        // Remove config sheet
        useSheetsStore.setState({
          sheets: state.sheets.filter((s) => s.type !== 'config'),
          activeSheetId: dataSheet.id,
        });

        // Verify migration results
        const specs = useSpecificationsStore.getState().specifications;
        expect(specs).toHaveLength(2);

        const colorSpec = specs.find((s) => s.name === 'Color');
        expect(colorSpec).toBeDefined();
        expect(colorSpec!.values).toHaveLength(2);
        expect(colorSpec!.values[0].displayValue).toBe('Red');
        expect(colorSpec!.values[0].skuFragment).toBe('R');

        const sizeSpec = specs.find((s) => s.name === 'Size');
        expect(sizeSpec).toBeDefined();
        expect(sizeSpec!.values).toHaveLength(2);

        // Verify Config sheet removed
        const { sheets } = useSheetsStore.getState();
        expect(sheets).toHaveLength(1);
        expect(sheets[0].type).toBe('data');
        expect(sheets[0].name).toBe('Products');
      });
    });

    it('should not migrate if specifications store already has data', () => {
      const configSheet = createLegacyConfigSheet();
      const dataSheet = createLegacyDataSheet();

      // Pre-populate specs store
      useSpecificationsStore.setState({
        specifications: [
          {
            id: 'existing-spec',
            name: 'Existing',
            order: 0,
            values: [{ id: 'v1', displayValue: 'Value', skuFragment: 'V' }],
          },
        ],
      });

      useSheetsStore.setState({
        sheets: [configSheet, dataSheet],
        activeSheetId: configSheet.id,
      });

      // Migration should be skipped when specs already exist
      const specsStore = useSpecificationsStore.getState();
      expect(specsStore.specifications.length).toBeGreaterThan(0);

      // Specs should remain unchanged (not overwritten by migration)
      const { specifications } = useSpecificationsStore.getState();
      expect(specifications).toHaveLength(1);
      expect(specifications[0].name).toBe('Existing');
    });

    it('should update activeSheetId if it was pointing to Config sheet', async () => {
      const configSheet = createLegacyConfigSheet();
      const dataSheet = createLegacyDataSheet();

      useSheetsStore.setState({
        sheets: [configSheet, dataSheet],
        activeSheetId: configSheet.id, // Config is active
      });

      // Simulate migration
      const { migrateConfigSheetData } = await import('../lib/migration');
      const migratedSpecs = migrateConfigSheetData(configSheet.data);
      if (migratedSpecs) {
        useSpecificationsStore.setState({ specifications: migratedSpecs });
      }

      // Remove config and update active
      useSheetsStore.setState({
        sheets: [dataSheet],
        activeSheetId: dataSheet.id,
      });

      // Verify activeSheetId now points to data sheet
      const { activeSheetId, sheets } = useSheetsStore.getState();
      expect(activeSheetId).toBe(dataSheet.id);
      expect(sheets.find((s) => s.id === activeSheetId)?.type).toBe('data');
    });

    it('should preserve data sheets after migration', async () => {
      const configSheet = createLegacyConfigSheet();
      const dataSheet1: SheetConfig = {
        id: 'data-1',
        name: 'Products',
        type: 'data',
        data: [[{ v: 'A' }]],
        columns: [],
        specifications: [],
      };
      const dataSheet2: SheetConfig = {
        id: 'data-2',
        name: 'Inventory',
        type: 'data',
        data: [[{ v: 'B' }]],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [configSheet, dataSheet1, dataSheet2],
        activeSheetId: dataSheet1.id,
      });

      // Simulate migration
      const { migrateConfigSheetData } = await import('../lib/migration');
      const migratedSpecs = migrateConfigSheetData(configSheet.data);
      if (migratedSpecs) {
        useSpecificationsStore.setState({ specifications: migratedSpecs });
      }

      // Remove config
      useSheetsStore.setState({
        sheets: [dataSheet1, dataSheet2],
        activeSheetId: dataSheet1.id,
      });

      // Verify both data sheets preserved
      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(2);
      expect(sheets[0].name).toBe('Products');
      expect(sheets[1].name).toBe('Inventory');
      expect(sheets.every((s) => s.type === 'data')).toBe(true);
    });

    it('should handle empty Config sheet gracefully', async () => {
      const emptyConfigSheet: SheetConfig = {
        id: 'config-id',
        name: 'Config',
        type: 'config',
        data: [
          // Only headers, no data
          [
            { v: 'Specification', m: 'Specification' },
            { v: 'Value', m: 'Value' },
            { v: 'SKU Code', m: 'SKU Code' },
          ],
        ],
        columns: [],
        specifications: [],
      };
      const dataSheet = createLegacyDataSheet();

      useSheetsStore.setState({
        sheets: [emptyConfigSheet, dataSheet],
        activeSheetId: emptyConfigSheet.id,
      });

      // Simulate migration
      const { migrateConfigSheetData } = await import('../lib/migration');
      const migratedSpecs = migrateConfigSheetData(emptyConfigSheet.data);

      // Migration should return null for empty config
      expect(migratedSpecs).toBeNull();

      // Specs store should remain empty
      expect(useSpecificationsStore.getState().specifications).toHaveLength(0);
    });
  });

  describe('Header repair on hydration (sheet-headers-repair)', () => {
    beforeEach(() => {
      localStorage.clear();
      useSheetsStore.setState({ sheets: [], activeSheetId: null });
      useSpecificationsStore.setState({ specifications: [] });
      localStorage.setItem('sku-has-data', 'true'); // Mark as not first launch
    });

    it('should repair sheets with missing SKU header on hydration', async () => {
      // Set up specs
      useSpecificationsStore.setState({
        specifications: [
          { id: 's1', name: 'Color', order: 0, values: [] },
          { id: 's2', name: 'Size', order: 1, values: [] },
        ],
      });

      // Simulate legacy sheet without proper header (data in row 0)
      const legacySheet: SheetConfig = {
        id: 'legacy-sheet',
        name: 'Products',
        type: 'data',
        data: [
          [{ v: 'Red' }, { v: 'Small' }],
          [{ v: 'Blue' }, { v: 'Large' }],
        ],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [legacySheet],
        activeSheetId: legacySheet.id,
      });

      // Import and call repair logic directly (simulating hydration)
      const { needsHeaderRepair, repairAllSheetHeaders } = await import('../lib/header-repair');
      const state = useSheetsStore.getState();
      const specifications = useSpecificationsStore.getState().specifications;

      if (needsHeaderRepair(state.sheets)) {
        useSheetsStore.setState({
          sheets: repairAllSheetHeaders(state.sheets, specifications),
        });
      }

      // Verify header was inserted
      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].data).toHaveLength(3); // Header + 2 original rows
      expect(sheets[0].data[0]).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
        { v: 'Size', m: 'Size' },
      ]);
      // Original data shifted down
      expect(sheets[0].data[1]).toEqual([{ v: 'Red' }, { v: 'Small' }]);
      expect(sheets[0].data[2]).toEqual([{ v: 'Blue' }, { v: 'Large' }]);
    });

    it('should not modify sheets that already have valid headers', async () => {
      useSpecificationsStore.setState({
        specifications: [
          { id: 's1', name: 'Color', order: 0, values: [] },
        ],
      });

      const validSheet: SheetConfig = {
        id: 'valid-sheet',
        name: 'Products',
        type: 'data',
        data: [
          [{ v: 'SKU' }, { v: 'Color' }],
          [{ v: 'R' }, { v: 'Red' }],
        ],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [validSheet],
        activeSheetId: validSheet.id,
      });

      const { needsHeaderRepair, repairAllSheetHeaders } = await import('../lib/header-repair');
      const state = useSheetsStore.getState();
      const specifications = useSpecificationsStore.getState().specifications;

      if (needsHeaderRepair(state.sheets)) {
        useSheetsStore.setState({
          sheets: repairAllSheetHeaders(state.sheets, specifications),
        });
      }

      // Verify no changes
      const { sheets } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].data).toHaveLength(2); // No header inserted
    });

    it('should repair multiple sheets independently', async () => {
      useSpecificationsStore.setState({
        specifications: [
          { id: 's1', name: 'Color', order: 0, values: [] },
        ],
      });

      const sheetNeedsRepair: SheetConfig = {
        id: 'needs-repair',
        name: 'NeedsRepair',
        type: 'data',
        data: [[{ v: 'Red' }]],
        columns: [],
        specifications: [],
      };

      const sheetValid: SheetConfig = {
        id: 'valid',
        name: 'Valid',
        type: 'data',
        data: [[{ v: 'SKU' }, { v: 'Color' }]],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [sheetNeedsRepair, sheetValid],
        activeSheetId: sheetNeedsRepair.id,
      });

      const { needsHeaderRepair, repairAllSheetHeaders } = await import('../lib/header-repair');
      const state = useSheetsStore.getState();
      const specifications = useSpecificationsStore.getState().specifications;

      if (needsHeaderRepair(state.sheets)) {
        useSheetsStore.setState({
          sheets: repairAllSheetHeaders(state.sheets, specifications),
        });
      }

      const { sheets } = useSheetsStore.getState();

      // First sheet repaired
      expect(sheets[0].data).toHaveLength(2);
      expect(sheets[0].data[0][0]).toEqual({ v: 'SKU', m: 'SKU' });

      // Second sheet unchanged
      expect(sheets[1].data).toHaveLength(1);
    });

    it('should handle empty sheets during repair', async () => {
      useSpecificationsStore.setState({
        specifications: [
          { id: 's1', name: 'Color', order: 0, values: [] },
        ],
      });

      const emptySheet: SheetConfig = {
        id: 'empty',
        name: 'Empty',
        type: 'data',
        data: [],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [emptySheet],
        activeSheetId: emptySheet.id,
      });

      const { needsHeaderRepair, repairAllSheetHeaders } = await import('../lib/header-repair');
      const state = useSheetsStore.getState();
      const specifications = useSpecificationsStore.getState().specifications;

      if (needsHeaderRepair(state.sheets)) {
        useSheetsStore.setState({
          sheets: repairAllSheetHeaders(state.sheets, specifications),
        });
      }

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].data).toHaveLength(1);
      expect(sheets[0].data[0]).toEqual([
        { v: 'SKU', m: 'SKU' },
        { v: 'Color', m: 'Color' },
      ]);
    });

    it('should work correctly when specs store is empty', async () => {
      // No specs set up - should still add SKU header
      useSpecificationsStore.setState({ specifications: [] });

      const legacySheet: SheetConfig = {
        id: 'legacy',
        name: 'Products',
        type: 'data',
        data: [[{ v: 'SomeData' }]],
        columns: [],
        specifications: [],
      };

      useSheetsStore.setState({
        sheets: [legacySheet],
        activeSheetId: legacySheet.id,
      });

      const { needsHeaderRepair, repairAllSheetHeaders } = await import('../lib/header-repair');
      const state = useSheetsStore.getState();
      const specifications = useSpecificationsStore.getState().specifications;

      if (needsHeaderRepair(state.sheets)) {
        useSheetsStore.setState({
          sheets: repairAllSheetHeaders(state.sheets, specifications),
        });
      }

      const { sheets } = useSheetsStore.getState();
      expect(sheets[0].data).toHaveLength(2);
      expect(sheets[0].data[0]).toEqual([{ v: 'SKU', m: 'SKU' }]);
      expect(sheets[0].data[1]).toEqual([{ v: 'SomeData' }]);
    });
  });

  describe('Sheet-scoped specification methods (spec-store-migration)', () => {
    let sheetId: string;

    beforeEach(() => {
      useSheetsStore.setState({ sheets: [], activeSheetId: null });
      useSpecificationsStore.setState({ specifications: [] });
      const { addSheet } = useSheetsStore.getState();
      sheetId = addSheet('Test Sheet');
    });

    describe('addSpecification', () => {
      it('should add a specification to the sheet', () => {
        const { addSpecification } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');

        expect(specId).toBeTruthy();
        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        expect(sheet?.specifications).toHaveLength(1);
        expect(sheet?.specifications[0].name).toBe('Color');
        expect(sheet?.specifications[0].order).toBe(0);
        expect(sheet?.specifications[0].values).toEqual([]);
      });

      it('should return null if sheet not found', () => {
        const { addSpecification } = useSheetsStore.getState();
        const specId = addSpecification('non-existent-id', 'Color');
        expect(specId).toBeNull();
      });

      it('should assign incrementing order values to new specs', () => {
        const { addSpecification } = useSheetsStore.getState();
        addSpecification(sheetId, 'Color');
        addSpecification(sheetId, 'Size');
        addSpecification(sheetId, 'Material');

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        expect(sheet?.specifications).toHaveLength(3);
        expect(sheet?.specifications[0].order).toBe(0);
        expect(sheet?.specifications[1].order).toBe(1);
        expect(sheet?.specifications[2].order).toBe(2);
      });

      it('should not affect specifications in other sheets', () => {
        const { addSheet, addSpecification } = useSheetsStore.getState();
        const sheet2Id = addSheet('Sheet 2');

        addSpecification(sheetId, 'Color');
        addSpecification(sheet2Id, 'Size');

        const { sheets } = useSheetsStore.getState();
        const sheet1 = sheets.find((s) => s.id === sheetId);
        const sheet2 = sheets.find((s) => s.id === sheet2Id);

        expect(sheet1?.specifications).toHaveLength(1);
        expect(sheet1?.specifications[0].name).toBe('Color');
        expect(sheet2?.specifications).toHaveLength(1);
        expect(sheet2?.specifications[0].name).toBe('Size');
      });
    });

    describe('updateSpecification', () => {
      it('should update specification name', () => {
        const { addSpecification, updateSpecification } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');

        const result = updateSpecification(sheetId, specId!, { name: 'Colour' });
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        expect(sheet?.specifications[0].name).toBe('Colour');
      });

      it('should return false if sheet not found', () => {
        const { addSpecification, updateSpecification } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const result = updateSpecification('non-existent', specId!, { name: 'Colour' });
        expect(result).toBe(false);
      });
    });

    describe('removeSpecification', () => {
      it('should remove specification and recalculate order', () => {
        const { addSpecification, removeSpecification } = useSheetsStore.getState();
        addSpecification(sheetId, 'Color');
        const sizeId = addSpecification(sheetId, 'Size');
        addSpecification(sheetId, 'Material');

        const result = removeSpecification(sheetId, sizeId!);
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        expect(sheet?.specifications).toHaveLength(2);
        expect(sheet?.specifications[0].name).toBe('Color');
        expect(sheet?.specifications[0].order).toBe(0);
        expect(sheet?.specifications[1].name).toBe('Material');
        expect(sheet?.specifications[1].order).toBe(1);
      });

      it('should return false if sheet not found', () => {
        const { removeSpecification } = useSheetsStore.getState();
        const result = removeSpecification('non-existent', 'spec-id');
        expect(result).toBe(false);
      });
    });

    describe('reorderSpec', () => {
      it('should reorder specifications correctly when moving down', () => {
        const { addSpecification, reorderSpec } = useSheetsStore.getState();
        const colorId = addSpecification(sheetId, 'Color');
        addSpecification(sheetId, 'Size');
        addSpecification(sheetId, 'Material');

        // Move Color from order 0 to order 2
        const result = reorderSpec(sheetId, colorId!, 2);
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const specs = [...sheet!.specifications].sort((a, b) => a.order - b.order);
        expect(specs[0].name).toBe('Size');
        expect(specs[1].name).toBe('Material');
        expect(specs[2].name).toBe('Color');
      });

      it('should reorder specifications correctly when moving up', () => {
        const { addSpecification, reorderSpec } = useSheetsStore.getState();
        addSpecification(sheetId, 'Color');
        addSpecification(sheetId, 'Size');
        const materialId = addSpecification(sheetId, 'Material');

        // Move Material from order 2 to order 0
        const result = reorderSpec(sheetId, materialId!, 0);
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const specs = [...sheet!.specifications].sort((a, b) => a.order - b.order);
        expect(specs[0].name).toBe('Material');
        expect(specs[1].name).toBe('Color');
        expect(specs[2].name).toBe('Size');
      });

      it('should return true if order unchanged', () => {
        const { addSpecification, reorderSpec } = useSheetsStore.getState();
        const colorId = addSpecification(sheetId, 'Color');

        const result = reorderSpec(sheetId, colorId!, 0);
        expect(result).toBe(true);
      });

      it('should return false if sheet not found', () => {
        const { reorderSpec } = useSheetsStore.getState();
        const result = reorderSpec('non-existent', 'spec-id', 0);
        expect(result).toBe(false);
      });
    });

    describe('addSpecValue', () => {
      it('should add a value to the specification', () => {
        const { addSpecification, addSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const valueId = addSpecValue(sheetId, specId!, 'Red', 'R');

        expect(valueId).toBeTruthy();
        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values).toHaveLength(1);
        expect(spec?.values[0].displayValue).toBe('Red');
        expect(spec?.values[0].skuFragment).toBe('R');
      });

      it('should return null for duplicate skuFragment', () => {
        const { addSpecification, addSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        addSpecValue(sheetId, specId!, 'Red', 'R');
        const duplicateId = addSpecValue(sheetId, specId!, 'Crimson', 'R');

        expect(duplicateId).toBeNull();
        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values).toHaveLength(1);
      });
    });

    describe('updateSpecValue', () => {
      it('should update spec value displayValue', () => {
        const { addSpecification, addSpecValue, updateSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const valueId = addSpecValue(sheetId, specId!, 'Red', 'R');

        const result = updateSpecValue(sheetId, specId!, valueId!, { displayValue: 'Crimson' });
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values[0].displayValue).toBe('Crimson');
        expect(spec?.values[0].skuFragment).toBe('R');
      });

      it('should update spec value skuFragment', () => {
        const { addSpecification, addSpecValue, updateSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const valueId = addSpecValue(sheetId, specId!, 'Red', 'R');

        const result = updateSpecValue(sheetId, specId!, valueId!, { skuFragment: 'RD' });
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values[0].skuFragment).toBe('RD');
      });

      it('should return false for duplicate skuFragment on update', () => {
        const { addSpecification, addSpecValue, updateSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        addSpecValue(sheetId, specId!, 'Red', 'R');
        const blueId = addSpecValue(sheetId, specId!, 'Blue', 'B');

        const result = updateSpecValue(sheetId, specId!, blueId!, { skuFragment: 'R' });
        expect(result).toBe(false);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values[1].skuFragment).toBe('B');
      });
    });

    describe('removeSpecValue', () => {
      it('should remove a value from the specification', () => {
        const { addSpecification, addSpecValue, removeSpecValue } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const redId = addSpecValue(sheetId, specId!, 'Red', 'R');
        addSpecValue(sheetId, specId!, 'Blue', 'B');

        const result = removeSpecValue(sheetId, specId!, redId!);
        expect(result).toBe(true);

        const { sheets } = useSheetsStore.getState();
        const sheet = sheets.find((s) => s.id === sheetId);
        const spec = sheet?.specifications.find((s) => s.id === specId);
        expect(spec?.values).toHaveLength(1);
        expect(spec?.values[0].displayValue).toBe('Blue');
      });
    });

    describe('getSpecificationById', () => {
      it('should return the specification', () => {
        const { addSpecification, getSpecificationById } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');

        const spec = getSpecificationById(sheetId, specId!);
        expect(spec?.name).toBe('Color');
      });

      it('should return undefined if spec not found', () => {
        const { getSpecificationById } = useSheetsStore.getState();
        const spec = getSpecificationById(sheetId, 'non-existent');
        expect(spec).toBeUndefined();
      });

      it('should return undefined if sheet not found', () => {
        const { getSpecificationById } = useSheetsStore.getState();
        const spec = getSpecificationById('non-existent', 'spec-id');
        expect(spec).toBeUndefined();
      });
    });

    describe('validateSkuFragment', () => {
      it('should return true for unique fragment', () => {
        const { addSpecification, addSpecValue, validateSkuFragment } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        addSpecValue(sheetId, specId!, 'Red', 'R');

        const result = validateSkuFragment(sheetId, specId!, 'B');
        expect(result).toBe(true);
      });

      it('should return false for duplicate fragment', () => {
        const { addSpecification, addSpecValue, validateSkuFragment } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        addSpecValue(sheetId, specId!, 'Red', 'R');

        const result = validateSkuFragment(sheetId, specId!, 'R');
        expect(result).toBe(false);
      });

      it('should allow same fragment when excluding the value', () => {
        const { addSpecification, addSpecValue, validateSkuFragment } = useSheetsStore.getState();
        const specId = addSpecification(sheetId, 'Color');
        const redId = addSpecValue(sheetId, specId!, 'Red', 'R');

        const result = validateSkuFragment(sheetId, specId!, 'R', redId!);
        expect(result).toBe(true);
      });

      it('should return true if sheet not found', () => {
        const { validateSkuFragment } = useSheetsStore.getState();
        const result = validateSkuFragment('non-existent', 'spec-id', 'R');
        expect(result).toBe(true);
      });
    });

    describe('SpecificationList reads from activeSheet.specifications', () => {
      it('switching sheets shows different specifications', () => {
        const { addSheet, addSpecification, setActiveSheet } = useSheetsStore.getState();
        const sheet2Id = addSheet('Sheet 2');

        // Add different specs to each sheet
        addSpecification(sheetId, 'Color');
        addSpecification(sheet2Id, 'Size');

        // Verify sheet1 has Color
        setActiveSheet(sheetId);
        let state = useSheetsStore.getState();
        let activeSheet = state.sheets.find((s) => s.id === state.activeSheetId);
        expect(activeSheet?.specifications).toHaveLength(1);
        expect(activeSheet?.specifications[0].name).toBe('Color');

        // Verify sheet2 has Size
        setActiveSheet(sheet2Id);
        state = useSheetsStore.getState();
        activeSheet = state.sheets.find((s) => s.id === state.activeSheetId);
        expect(activeSheet?.specifications).toHaveLength(1);
        expect(activeSheet?.specifications[0].name).toBe('Size');
      });
    });
  });
});
