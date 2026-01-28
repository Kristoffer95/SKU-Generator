import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SheetConfig, CellData, ColumnDef } from '../types';
import { createSampleProductSheet, getSampleSpecifications, createColumnsFromSpecs, isFirstLaunch, markAsInitialized } from '../lib/sample-data';
import { useSpecificationsStore } from './specifications';
import { migrateConfigSheetData } from '../lib/migration';
import { needsHeaderRepair, repairAllSheetHeaders } from '../lib/header-repair';

interface SheetsState {
  sheets: SheetConfig[];
  activeSheetId: string | null;
  addSheet: (name?: string) => string;
  addSheetWithId: (id: string, name: string) => void;
  updateSheet: (id: string, updates: Partial<Pick<SheetConfig, 'name' | 'data'>>) => void;
  removeSheet: (id: string) => boolean;
  setActiveSheet: (id: string) => void;
  getActiveSheet: () => SheetConfig | undefined;
  /**
   * @deprecated Config sheet approach is deprecated. Use useSpecificationsStore instead.
   * This method is kept only for migration-1 task to detect existing Config sheets.
   */
  getConfigSheet: () => SheetConfig | undefined;
  updateCellData: (sheetId: string, row: number, col: number, cell: CellData) => void;
  setSheetData: (sheetId: string, data: CellData[][]) => void;
  /**
   * @deprecated Config sheet approach is deprecated. Use initializeWithSampleData instead.
   * This method is kept only for migration-1 task to support legacy setups.
   */
  initializeWithConfigSheet: () => void;
  initializeWithSampleData: () => void;
}

const generateId = () => crypto.randomUUID();

/**
 * @deprecated Config sheet approach is deprecated.
 * Kept only for migration-1 task.
 */
const CONFIG_SHEET_HEADERS: CellData[] = [
  { v: 'Specification', m: 'Specification' },
  { v: 'Value', m: 'Value' },
  { v: 'SKU Code', m: 'SKU Code' },
];

const generateColumnId = () => crypto.randomUUID();

/**
 * Creates the header row from columns definitions
 */
const createHeaderRowFromColumns = (columns: ColumnDef[]): CellData[] => {
  return columns.map(col => ({ v: col.header, m: col.header }));
};

/**
 * Creates the default column (just SKU) for a new empty sheet
 */
const createDefaultColumns = (): ColumnDef[] => {
  return [{ id: generateColumnId(), type: 'sku', header: 'SKU' }];
};

/**
 * Creates an empty sheet with default SKU column and empty specifications.
 * New sheets start with just the SKU column; users add spec columns as needed.
 */
const createEmptySheet = (name: string, type: SheetConfig['type'] = 'data'): SheetConfig => {
  const columns = type === 'data' ? createDefaultColumns() : [];
  const headerRow = type === 'data' ? createHeaderRowFromColumns(columns) : [];
  return {
    id: generateId(),
    name,
    type,
    data: headerRow.length > 0 ? [headerRow] : [],
    columns,
    specifications: [],
  };
};

/**
 * @deprecated Config sheet approach is deprecated.
 * Kept only for migration-1 task.
 */
const createConfigSheet = (): SheetConfig => ({
  id: generateId(),
  name: 'Config',
  type: 'config',
  data: [CONFIG_SHEET_HEADERS],
  columns: [],
  specifications: [],
});

export const useSheetsStore = create<SheetsState>()(
  persist(
    (set, get) => ({
      sheets: [],
      activeSheetId: null,

      /**
       * @deprecated Config sheet approach is deprecated.
       * Kept only for migration-1 task to support legacy setups.
       */
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

      initializeWithSampleData: () => {
        const { sheets } = get();
        // Only initialize on first launch (no existing sheets)
        if (sheets.length === 0 && isFirstLaunch()) {
          const productSheet = createSampleProductSheet();
          // Add sample specifications to the specifications store
          const sampleSpecs = getSampleSpecifications();
          useSpecificationsStore.setState({ specifications: sampleSpecs });
          set({
            sheets: [productSheet],
            activeSheetId: productSheet.id,
          });
          markAsInitialized();
        } else {
          // Mark as initialized if we have any sheets
          if (sheets.length > 0) {
            markAsInitialized();
          }
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

      addSheetWithId: (id: string, name: string) => {
        const { sheets } = get();
        // Check if sheet with this ID already exists
        if (sheets.some((s) => s.id === id)) return;

        const columns = createDefaultColumns();
        const headerRow = createHeaderRowFromColumns(columns);
        const newSheet: SheetConfig = {
          id,
          name,
          type: 'data',
          data: headerRow.length > 0 ? [headerRow] : [],
          columns,
          specifications: [],
        };

        set({
          sheets: [...sheets, newSheet],
          activeSheetId: id,
        });
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

      /**
       * @deprecated Config sheet approach is deprecated.
       * Kept only for migration-1 task to detect existing Config sheets.
       */
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
      onRehydrateStorage: () => (state) => {
        // Called AFTER hydration completes - this is the right time to init sample data
        if (state && isFirstLaunch()) {
          const productSheet = createSampleProductSheet();
          // Also keep specs in global store for backward compatibility during transition
          const sampleSpecs = getSampleSpecifications();
          useSpecificationsStore.setState({ specifications: sampleSpecs });
          state.sheets = [productSheet];
          state.activeSheetId = productSheet.id;
          markAsInitialized();
        } else if (state && state.sheets.length > 0) {
          // Check if migration from Config sheet is needed
          const configSheet = state.sheets.find((s) => s.type === 'config');
          const specsStore = useSpecificationsStore.getState();

          if (configSheet && specsStore.specifications.length === 0) {
            // Migrate Config sheet data to specifications store
            const migratedSpecs = migrateConfigSheetData(configSheet.data);
            if (migratedSpecs && migratedSpecs.length > 0) {
              useSpecificationsStore.setState({ specifications: migratedSpecs });
            }

            // Remove Config sheet from sheets array
            state.sheets = state.sheets.filter((s) => s.type !== 'config');

            // Update activeSheetId if it was the Config sheet
            if (state.activeSheetId === configSheet.id) {
              state.activeSheetId = state.sheets[0]?.id ?? null;
            }
          }

          // Check if header repair is needed for existing sheets
          // This fixes data saved before sheet-headers-1 and sheet-headers-2 fixes
          const specifications = useSpecificationsStore.getState().specifications;
          if (needsHeaderRepair(state.sheets)) {
            state.sheets = repairAllSheetHeaders(state.sheets, specifications);
          }

          // Migrate sheets to have local specifications and columns if not present
          const globalSpecs = useSpecificationsStore.getState().specifications;
          state.sheets = state.sheets.map((sheet) => {
            // Skip if sheet already has local specs (already migrated)
            if (sheet.specifications && sheet.specifications.length > 0) {
              return sheet;
            }

            // Skip config sheets
            if (sheet.type === 'config') {
              return {
                ...sheet,
                columns: sheet.columns ?? [],
                specifications: sheet.specifications ?? [],
              };
            }

            // Copy global specs to this sheet
            const localSpecs = globalSpecs.map(spec => ({
              ...spec,
              id: crypto.randomUUID(), // New ID for local copy
              values: spec.values.map(v => ({
                ...v,
                id: crypto.randomUUID(), // New ID for local copy
              })),
            }));

            // Create columns from specs
            const columns = createColumnsFromSpecs(localSpecs);

            return {
              ...sheet,
              columns,
              specifications: localSpecs,
            };
          });

          markAsInitialized();
        }
      },
    }
  )
);
