import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SheetConfig, CellData } from '../types';

interface SheetsState {
  sheets: SheetConfig[];
  activeSheetId: string | null;
  addSheet: (name?: string) => string;
  updateSheet: (id: string, updates: Partial<Pick<SheetConfig, 'name' | 'data'>>) => void;
  removeSheet: (id: string) => void;
  setActiveSheet: (id: string) => void;
  getActiveSheet: () => SheetConfig | undefined;
  updateCellData: (sheetId: string, row: number, col: number, cell: CellData) => void;
  setSheetData: (sheetId: string, data: CellData[][]) => void;
}

const generateId = () => crypto.randomUUID();

const createEmptySheet = (name: string): SheetConfig => ({
  id: generateId(),
  name,
  data: [],
});

export const useSheetsStore = create<SheetsState>()(
  persist(
    (set, get) => ({
      sheets: [],
      activeSheetId: null,

      addSheet: (name?: string) => {
        const { sheets } = get();
        const sheetName = name ?? `Sheet ${sheets.length + 1}`;
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
      },

      setActiveSheet: (id: string) => {
        set({ activeSheetId: id });
      },

      getActiveSheet: () => {
        const { sheets, activeSheetId } = get();
        return sheets.find((sheet) => sheet.id === activeSheetId);
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
