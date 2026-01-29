import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SheetConfig, CellData, ColumnDef, Specification, SpecValue } from '../types';
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

  // Sheet-scoped specification management methods
  addSpecification: (sheetId: string, name: string) => string | null;
  updateSpecification: (sheetId: string, specId: string, updates: Partial<Pick<Specification, 'name'>>) => boolean;
  removeSpecification: (sheetId: string, specId: string) => boolean;
  reorderSpec: (sheetId: string, specId: string, newOrder: number) => boolean;
  addSpecValue: (sheetId: string, specId: string, displayValue: string, skuFragment: string) => string | null;
  updateSpecValue: (sheetId: string, specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment'>>) => boolean;
  removeSpecValue: (sheetId: string, specId: string, valueId: string) => boolean;
  getSpecificationById: (sheetId: string, specId: string) => Specification | undefined;
  validateSkuFragment: (sheetId: string, specId: string, skuFragment: string, excludeValueId?: string) => boolean;

  // Column management methods
  /**
   * Reorder columns in a sheet.
   * Moves a column from oldIndex to newIndex and updates all row data accordingly.
   * SKU column (index 0) cannot be moved.
   */
  reorderColumns: (sheetId: string, oldIndex: number, newIndex: number) => boolean;

  /**
   * Update the width of a column.
   * @param sheetId - The ID of the sheet
   * @param columnIndex - The index of the column to resize
   * @param width - The new width in pixels (min: 80)
   */
  updateColumnWidth: (sheetId: string, columnIndex: number, width: number) => boolean;
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
 * Creates empty data rows for a new sheet.
 * Each row has empty cells matching the number of columns.
 */
const createEmptyDataRows = (columnCount: number, rowCount: number): CellData[][] => {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => ({}))
  );
};

/**
 * Creates an empty sheet with default SKU column and empty specifications.
 * New sheets start with just the SKU column and 50 empty data rows; users add spec columns as needed.
 */
const createEmptySheet = (name: string, type: SheetConfig['type'] = 'data'): SheetConfig => {
  const columns = type === 'data' ? createDefaultColumns() : [];
  const headerRow = type === 'data' ? createHeaderRowFromColumns(columns) : [];
  const emptyRows = type === 'data' ? createEmptyDataRows(columns.length, 50) : [];
  return {
    id: generateId(),
    name,
    type,
    data: headerRow.length > 0 ? [headerRow, ...emptyRows] : [],
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
        const emptyRows = createEmptyDataRows(columns.length, 50);
        const newSheet: SheetConfig = {
          id,
          name,
          type: 'data',
          data: headerRow.length > 0 ? [headerRow, ...emptyRows] : [],
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

      // Sheet-scoped specification management methods

      addSpecification: (sheetId: string, name: string) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return null;

        const specId = generateId();
        const specs = sheet.specifications ?? [];
        // New specs get order = max existing order + 1 (or 0 if none exist)
        const maxOrder = specs.reduce((max, spec) => Math.max(max, spec.order), -1);
        const order = maxOrder + 1;

        const newSpec: Specification = { id: specId, name, order, values: [] };

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? { ...s, specifications: [...(s.specifications ?? []), newSpec] }
              : s
          ),
        }));

        return specId;
      },

      updateSpecification: (sheetId: string, specId: string, updates: Partial<Pick<Specification, 'name'>>) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: (s.specifications ?? []).map((spec) =>
                    spec.id === specId ? { ...spec, ...updates } : spec
                  ),
                }
              : s
          ),
        }));
        return true;
      },

      removeSpecification: (sheetId: string, specId: string) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        set((state) => ({
          sheets: state.sheets.map((s) => {
            if (s.id !== sheetId) return s;

            const filtered = (s.specifications ?? []).filter((spec) => spec.id !== specId);
            // Recalculate order values to be contiguous
            const sorted = [...filtered].sort((a, b) => a.order - b.order);
            const reorderedSpecs = sorted.map((spec, index) => ({
              ...spec,
              order: index,
            }));

            return { ...s, specifications: reorderedSpecs };
          }),
        }));
        return true;
      },

      reorderSpec: (sheetId: string, specId: string, newOrder: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        const specs = sheet.specifications ?? [];
        const spec = specs.find((sp) => sp.id === specId);
        if (!spec) return false;

        const oldOrder = spec.order;
        if (oldOrder === newOrder) return true;

        set((state) => ({
          sheets: state.sheets.map((s) => {
            if (s.id !== sheetId) return s;

            const updatedSpecs = (s.specifications ?? []).map((sp) => {
              if (sp.id === specId) {
                return { ...sp, order: newOrder };
              }
              // If moving down (oldOrder < newOrder), shift specs in between up
              if (oldOrder < newOrder && sp.order > oldOrder && sp.order <= newOrder) {
                return { ...sp, order: sp.order - 1 };
              }
              // If moving up (oldOrder > newOrder), shift specs in between down
              if (oldOrder > newOrder && sp.order >= newOrder && sp.order < oldOrder) {
                return { ...sp, order: sp.order + 1 };
              }
              return sp;
            });

            return { ...s, specifications: updatedSpecs };
          }),
        }));
        return true;
      },

      addSpecValue: (sheetId: string, specId: string, displayValue: string, skuFragment: string) => {
        const { validateSkuFragment } = get();
        // Check for duplicate skuFragment within this spec
        if (!validateSkuFragment(sheetId, specId, skuFragment)) {
          return null;
        }

        const valueId = generateId();

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: (s.specifications ?? []).map((spec) =>
                    spec.id === specId
                      ? { ...spec, values: [...spec.values, { id: valueId, displayValue, skuFragment }] }
                      : spec
                  ),
                }
              : s
          ),
        }));

        return valueId;
      },

      updateSpecValue: (sheetId: string, specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment'>>) => {
        const { validateSkuFragment } = get();
        // If updating skuFragment, validate uniqueness (excluding current value)
        if (updates.skuFragment !== undefined) {
          if (!validateSkuFragment(sheetId, specId, updates.skuFragment, valueId)) {
            return false;
          }
        }

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: (s.specifications ?? []).map((spec) =>
                    spec.id === specId
                      ? {
                          ...spec,
                          values: spec.values.map((val) =>
                            val.id === valueId ? { ...val, ...updates } : val
                          ),
                        }
                      : spec
                  ),
                }
              : s
          ),
        }));
        return true;
      },

      removeSpecValue: (sheetId: string, specId: string, valueId: string) => {
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: (s.specifications ?? []).map((spec) =>
                    spec.id === specId
                      ? { ...spec, values: spec.values.filter((val) => val.id !== valueId) }
                      : spec
                  ),
                }
              : s
          ),
        }));
        return true;
      },

      getSpecificationById: (sheetId: string, specId: string) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return undefined;
        return (sheet.specifications ?? []).find((spec) => spec.id === specId);
      },

      validateSkuFragment: (sheetId: string, specId: string, skuFragment: string, excludeValueId?: string) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return true; // Allow if sheet not found (edge case)

        const spec = (sheet.specifications ?? []).find((sp) => sp.id === specId);
        if (!spec) return true; // Allow if spec not found (edge case)

        // Check if any other value in this spec has the same skuFragment
        return !spec.values.some(
          (val) => val.skuFragment === skuFragment && val.id !== excludeValueId
        );
      },

      reorderColumns: (sheetId: string, oldIndex: number, newIndex: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        const columns = sheet.columns ?? [];

        // Validate indices
        if (oldIndex < 0 || oldIndex >= columns.length) return false;
        if (newIndex < 0 || newIndex >= columns.length) return false;
        if (oldIndex === newIndex) return true; // Nothing to do

        // SKU column (index 0) cannot be moved
        if (oldIndex === 0 || newIndex === 0) return false;

        // Reorder columns array
        const newColumns = [...columns];
        const [movedColumn] = newColumns.splice(oldIndex, 1);
        newColumns.splice(newIndex, 0, movedColumn);

        // Reorder data in all rows to match new column order
        const newData = sheet.data.map((row) => {
          const newRow = [...row];
          const [movedCell] = newRow.splice(oldIndex, 1);
          newRow.splice(newIndex, 0, movedCell);
          return newRow;
        });

        // Update the sheet atomically with both columns and data
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? { ...s, columns: newColumns, data: newData }
              : s
          ),
        }));

        return true;
      },

      updateColumnWidth: (sheetId: string, columnIndex: number, width: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        const columns = sheet.columns ?? [];

        // Validate column index
        if (columnIndex < 0 || columnIndex >= columns.length) return false;

        // Enforce minimum width
        const clampedWidth = Math.max(80, width);

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  columns: s.columns.map((col, idx) =>
                    idx === columnIndex ? { ...col, width: clampedWidth } : col
                  ),
                }
              : s
          ),
        }));

        return true;
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
