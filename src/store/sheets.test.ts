import { describe, it, expect, beforeEach } from 'vitest';
import { useSheetsStore } from './sheets';

describe('useSheetsStore', () => {
  beforeEach(() => {
    useSheetsStore.setState({ sheets: [], activeSheetId: null });
  });

  describe('addSheet', () => {
    it('should add a sheet with default name', () => {
      const { addSheet } = useSheetsStore.getState();
      const id = addSheet();

      const { sheets, activeSheetId } = useSheetsStore.getState();
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Sheet 1');
      expect(sheets[0].data).toEqual([]);
      expect(activeSheetId).toBe(id);
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
});
