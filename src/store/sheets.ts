import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SheetConfig, CellData } from '../types';

interface SheetsState {
  sheets: SheetConfig[];
  activeSheetId: string | null;
  addSheet: (name?: string) => string;
  updateSheet: (id: string, updates: Partial<Pick<SheetConfig, 'name' | 'data'>>) => void;
  removeSheet: (id: string) => boolean;
  setActiveSheet: (id: string) => void;
  getActiveSheet: () => SheetConfig | undefined;
  getConfigSheet: () => SheetConfig | undefined;
  updateCellData: (sheetId: string, row: number, col: number, cell: CellData) => void;
  setSheetData: (sheetId: string, data: CellData[][]) => void;
  initializeWithConfigSheet: () => void;
}

const generateId = () => crypto.randomUUID();

/** Config sheet header row */
const CONFIG_SHEET_HEADERS: CellData[] = [
  { v: 'Specification', m: 'Specification' },
  { v: 'Value', m: 'Value' },
  { v: 'SKU Code', m: 'SKU Code' },
];

const createEmptySheet = (name: string, type: SheetConfig['type'] = 'data'): SheetConfig => ({
  id: generateId(),
  name,
  type,
  data: [],
});

const createConfigSheet = (): SheetConfig => ({
  id: generateId(),
  name: 'Config',
  type: 'config',
  data: [CONFIG_SHEET_HEADERS],
});

export const useSheetsStore = create<SheetsState>()(
  persist(
    (set, get) => ({
      sheets: [],
      activeSheetId: null,

      initializeWithConfigSheet: () => {
        const { sheets } = get();
        // Only initialize if no Config sheet exists
        const hasConfigSheet = sheets.some((s) => s.type === 'config');
        if (!hasConfigSheet) {
          const configSheet = createConfigSheet();
          set({
            sheets: [configSheet, ...sheets],
            activeSheetId: configSheet.id,
          });
        }
      },

      addSheet: (name?: string) => {
        const { sheets } = get();
        // Count only data sheets for naming
        const dataSheetCount = sheets.filter((s) => s.type === 'data').length;
        const sheetName = name ?? `Sheet ${dataSheetCount + 1}`;
        const newSheet = createEmptySheet(sheetName);

        set({
          sheets: [...sheets, newSheet],
          activeSheetId: newSheet.id,
        });

        return newSheet.id;
      },

      updateSheet: (id: string, updates: Partial<Pick<SheetConfig, 'name' | 'data'>>) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === id ? { ...sheet, ...updates } : sheet
          ),
        }));
      },

      removeSheet: (id: string) => {
        const { sheets } = get();
        const sheetToRemove = sheets.find((s) => s.id === id);

        // Prevent deletion of Config sheet
        if (sheetToRemove?.type === 'config') {
          return false;
        }

        set((state) => {
          const filtered = state.sheets.filter((sheet) => sheet.id !== id);
          const wasActive = state.activeSheetId === id;

          return {
            sheets: filtered,
            activeSheetId: wasActive
              ? (filtered[0]?.id ?? null)
              : state.activeSheetId,
          };
        });
        return true;
      },

      setActiveSheet: (id: string) => {
        set({ activeSheetId: id });
      },

      getActiveSheet: () => {
        const { sheets, activeSheetId } = get();
        return sheets.find((sheet) => sheet.id === activeSheetId);
      },

      getConfigSheet: () => {
        const { sheets } = get();
        return sheets.find((sheet) => sheet.type === 'config');
      },

      updateCellData: (sheetId: string, row: number, col: number, cell: CellData) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) => {
            if (sheet.id !== sheetId) return sheet;

            const data = [...sheet.data];
            // Ensure rows exist
            while (data.length <= row) {
              data.push([]);
            }
            // Ensure columns exist in the row
            while (data[row].length <= col) {
              data[row].push({});
            }
            data[row][col] = cell;

            return { ...sheet, data };
          }),
        }));
      },

      setSheetData: (sheetId: string, data: CellData[][]) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, data } : sheet
          ),
        }));
      },
    }),
    {
      name: 'sku-sheets',
    }
  )
);
