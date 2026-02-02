import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SheetConfig, CellData, ColumnDef, Specification, SpecValue, SheetGroup } from '../types';
import { createSampleProductSheet, getSampleSpecifications, createColumnsFromSpecs, isFirstLaunch, markAsInitialized } from '../lib/sample-data';
import { useSpecificationsStore } from './specifications';
import { migrateConfigSheetData } from '../lib/migration';
import { needsHeaderRepair, repairAllSheetHeaders } from '../lib/header-repair';
import { getAutoColor } from '../lib/color-utils';

interface SheetsState {
  sheets: SheetConfig[];
  groups: SheetGroup[];
  activeSheetId: string | null;
  addSheet: (name?: string) => string;
  addSheetWithId: (id: string, name: string) => void;
  updateSheet: (id: string, updates: Partial<Pick<SheetConfig, 'name' | 'data'>>) => void;
  removeSheet: (id: string) => boolean;
  setActiveSheet: (id: string) => void;
  getActiveSheet: () => SheetConfig | undefined;
  /**
   * Duplicate a sheet with all its data, columns, and specifications.
   * All IDs are regenerated to ensure independence.
   * @param sheetId - ID of the sheet to duplicate
   * @returns ID of the new sheet, or null if source sheet not found
   */
  duplicateSheet: (sheetId: string) => string | null;
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
  addSpecValue: (sheetId: string, specId: string, displayValue: string, skuFragment: string, color?: string) => string | null;
  updateSpecValue: (sheetId: string, specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment' | 'color'>>) => boolean;
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

  /**
   * Update the height of a row.
   * @param sheetId - The ID of the sheet
   * @param rowIndex - The index of the row to resize
   * @param height - The new height in pixels (min: 24)
   */
  updateRowHeight: (sheetId: string, rowIndex: number, height: number) => boolean;

  /**
   * Update the header name of a free column.
   * Only works for columns with type === 'free'.
   * @param sheetId - The ID of the sheet
   * @param columnIndex - The index of the column to rename
   * @param header - The new header name
   */
  updateFreeColumnHeader: (sheetId: string, columnIndex: number, header: string) => boolean;

  /**
   * Set the number of pinned columns for a sheet.
   * Columns 0 through (pinnedColumns - 1) will be pinned.
   * Pinned columns stay visible while scrolling horizontally.
   * @param sheetId - The ID of the sheet
   * @param pinnedColumns - Number of columns to pin (min: 1 for SKU column)
   */
  setPinnedColumns: (sheetId: string, pinnedColumns: number) => boolean;

  /**
   * Set the number of pinned rows for a sheet.
   * Rows 0 through (pinnedRows - 1) will be pinned.
   * Pinned rows stay visible while scrolling vertically.
   * @param sheetId - The ID of the sheet
   * @param pinnedRows - Number of rows to pin (min: 0)
   */
  setPinnedRows: (sheetId: string, pinnedRows: number) => boolean;

  // Sheet group management methods

  /**
   * Create a new sheet group.
   * @param name - Name for the new group
   * @returns ID of the new group
   */
  addGroup: (name: string) => string;

  /**
   * Update a group's properties (name, collapsed state, color).
   * @param groupId - ID of the group to update
   * @param updates - Properties to update
   */
  updateGroup: (groupId: string, updates: Partial<Pick<SheetGroup, 'name' | 'collapsed' | 'color'>>) => boolean;

  /**
   * Remove a group.
   * @param groupId - ID of the group to remove
   * @param deleteSheets - If true, delete all sheets in the group. If false, move sheets to ungrouped.
   */
  removeGroup: (groupId: string, deleteSheets?: boolean) => boolean;

  /**
   * Move a sheet into a group.
   * Removes the sheet from its current group (if any) and adds it to the target group.
   * @param sheetId - ID of the sheet to move
   * @param groupId - ID of the target group, or null to move to ungrouped
   */
  moveSheetToGroup: (sheetId: string, groupId: string | null) => boolean;

  /**
   * Toggle the collapsed state of a group.
   * @param groupId - ID of the group to toggle
   */
  toggleGroupCollapsed: (groupId: string) => boolean;

  /**
   * Get the group that a sheet belongs to.
   * @param sheetId - ID of the sheet
   * @returns The group, or undefined if the sheet is ungrouped
   */
  getSheetGroup: (sheetId: string) => SheetGroup | undefined;

  /**
   * Get ungrouped sheets (sheets not in any group).
   * @returns Array of sheet IDs not in any group
   */
  getUngroupedSheetIds: () => string[];
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
 * Checks if a sheet's data[0] appears to be a header row (redundant with columns[].header).
 * A header row is detected when data[0] values match the column headers.
 */
function isLikelyHeaderRow(sheet: SheetConfig): boolean {
  if (!sheet.data || sheet.data.length === 0) return false;
  if (!sheet.columns || sheet.columns.length === 0) return false;

  const firstRow = sheet.data[0];
  if (!firstRow || firstRow.length === 0) return false;

  // Check if first row values match column headers
  let matchCount = 0;
  const minLength = Math.min(firstRow.length, sheet.columns.length);

  for (let i = 0; i < minLength; i++) {
    const cellValue = String(firstRow[i]?.v ?? firstRow[i]?.m ?? '').trim();
    const columnHeader = sheet.columns[i]?.header?.trim() ?? '';
    if (cellValue === columnHeader && cellValue !== '') {
      matchCount++;
    }
  }

  // If majority of cells match column headers, it's likely a header row
  return matchCount >= Math.min(2, minLength) && matchCount >= minLength * 0.5;
}

/**
 * Removes header row from sheet data if it exists (migration for remove-redundant-header-row).
 * Also adjusts pinnedRows if needed.
 */
function removeHeaderRowFromSheet(sheet: SheetConfig): SheetConfig {
  if (sheet.type === 'config') return sheet;
  if (!isLikelyHeaderRow(sheet)) return sheet;

  // Remove the first row (header row)
  const newData = sheet.data.slice(1);

  // Decrement pinnedRows if > 0 (since row indices shift down by 1)
  const newPinnedRows = sheet.pinnedRows && sheet.pinnedRows > 0
    ? sheet.pinnedRows - 1
    : sheet.pinnedRows;

  // Adjust rowHeights - shift all keys down by 1 (row 1 becomes row 0, etc.)
  let newRowHeights: Record<number, number> | undefined;
  if (sheet.rowHeights && Object.keys(sheet.rowHeights).length > 0) {
    newRowHeights = {};
    for (const [key, value] of Object.entries(sheet.rowHeights)) {
      const oldIndex = parseInt(key, 10);
      if (oldIndex > 0) {
        newRowHeights[oldIndex - 1] = value;
      }
      // Drop row 0 heights (header row is removed)
    }
    // Only keep if non-empty
    if (Object.keys(newRowHeights).length === 0) {
      newRowHeights = undefined;
    }
  }

  return {
    ...sheet,
    data: newData,
    ...(newPinnedRows !== undefined && { pinnedRows: newPinnedRows }),
    // Explicitly set rowHeights to the new shifted value, or undefined if empty
    rowHeights: newRowHeights,
  };
}

/**
 * Ensures all spec values have colors assigned (migration for migrate-existing-spec-values-colors).
 * Specs created before the color feature was implemented don't have color properties.
 * This migration assigns colors from COLOR_PALETTE using round-robin per spec.
 */
function ensureSpecValueColors(sheets: SheetConfig[]): SheetConfig[] {
  return sheets.map((sheet) => {
    if (!sheet.specifications || sheet.specifications.length === 0) {
      return sheet;
    }

    let hasChanges = false;
    const updatedSpecs = sheet.specifications.map((spec) => {
      // Check if any values need color assignment
      const needsColors = spec.values.some((val) => !val.color);
      if (!needsColors) {
        return spec;
      }

      hasChanges = true;
      return {
        ...spec,
        values: spec.values.map((val, index) => {
          if (val.color) {
            return val;
          }
          return {
            ...val,
            color: getAutoColor(index),
          };
        }),
      };
    });

    if (!hasChanges) {
      return sheet;
    }

    return {
      ...sheet,
      specifications: updatedSpecs,
    };
  });
}

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
 * Column headers are stored in columns[].header, NOT in data[0].
 */
const createEmptySheet = (name: string, type: SheetConfig['type'] = 'data'): SheetConfig => {
  const columns = type === 'data' ? createDefaultColumns() : [];
  // Data array contains only data rows, no header row - headers live in columns[].header
  const emptyRows = type === 'data' ? createEmptyDataRows(columns.length, 50) : [];
  return {
    id: generateId(),
    name,
    type,
    data: emptyRows,
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
      groups: [],
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
        // Data array contains only data rows, no header row - headers live in columns[].header
        const emptyRows = createEmptyDataRows(columns.length, 50);
        const newSheet: SheetConfig = {
          id,
          name,
          type: 'data',
          data: emptyRows,
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

      duplicateSheet: (sheetId: string) => {
        const { sheets } = get();
        const sourceSheet = sheets.find((s) => s.id === sheetId);

        if (!sourceSheet) {
          return null;
        }

        // Create ID mapping for specifications (old ID -> new ID)
        const specIdMap = new Map<string, string>();
        sourceSheet.specifications?.forEach((spec) => {
          specIdMap.set(spec.id, generateId());
        });

        // Deep clone specifications with new IDs
        const clonedSpecifications: Specification[] = (sourceSheet.specifications ?? []).map((spec) => ({
          id: specIdMap.get(spec.id) ?? generateId(),
          name: spec.name,
          order: spec.order,
          values: spec.values.map((val) => ({
            id: generateId(),
            displayValue: val.displayValue,
            skuFragment: val.skuFragment,
            ...(val.color && { color: val.color }),
          })),
        }));

        // Deep clone columns with new IDs, updating specId references
        const clonedColumns: ColumnDef[] = (sourceSheet.columns ?? []).map((col) => ({
          id: generateColumnId(),
          type: col.type,
          header: col.header,
          width: col.width,
          // Map specId to the new specification ID
          ...(col.specId && { specId: specIdMap.get(col.specId) }),
        }));

        // Deep clone cell data (preserves all formatting: bg, fc, bold, italic, align)
        const clonedData: CellData[][] = sourceSheet.data.map((row) =>
          row.map((cell) => ({ ...cell }))
        );

        // Deep clone rowHeights if present
        const clonedRowHeights = sourceSheet.rowHeights
          ? { ...sourceSheet.rowHeights }
          : undefined;

        // Create the duplicated sheet
        const newSheetId = generateId();
        const newSheet: SheetConfig = {
          id: newSheetId,
          name: `Copy of ${sourceSheet.name}`,
          type: sourceSheet.type,
          data: clonedData,
          columns: clonedColumns,
          specifications: clonedSpecifications,
          ...(clonedRowHeights && { rowHeights: clonedRowHeights }),
          ...(sourceSheet.pinnedColumns !== undefined && { pinnedColumns: sourceSheet.pinnedColumns }),
          ...(sourceSheet.pinnedRows !== undefined && { pinnedRows: sourceSheet.pinnedRows }),
        };

        // Find the index of the source sheet and insert after it
        const sourceIndex = sheets.findIndex((s) => s.id === sheetId);
        const newSheets = [...sheets];
        newSheets.splice(sourceIndex + 1, 0, newSheet);

        set({
          sheets: newSheets,
          activeSheetId: newSheetId,
        });

        return newSheetId;
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

        // Create new column for the specification
        const newColumn: ColumnDef = { id: generateId(), type: 'spec', header: name, specId };

        // If columns is empty, add SKU column first
        const currentColumns = sheet.columns ?? [];
        const updatedColumns = currentColumns.length === 0
          ? [{ id: generateId(), type: 'sku' as const, header: 'SKU' }, newColumn]
          : [...currentColumns, newColumn];

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: [...(s.specifications ?? []), newSpec],
                  columns: updatedColumns,
                }
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

      addSpecValue: (sheetId: string, specId: string, displayValue: string, skuFragment: string, color?: string) => {
        const { validateSkuFragment } = get();
        // Check for duplicate skuFragment within this spec
        if (!validateSkuFragment(sheetId, specId, skuFragment)) {
          return null;
        }

        const valueId = generateId();
        const newValue: SpecValue = { id: valueId, displayValue, skuFragment };
        if (color) {
          newValue.color = color;
        }

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  specifications: (s.specifications ?? []).map((spec) =>
                    spec.id === specId
                      ? { ...spec, values: [...spec.values, newValue] }
                      : spec
                  ),
                }
              : s
          ),
        }));

        return valueId;
      },

      updateSpecValue: (sheetId: string, specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment' | 'color'>>) => {
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

      updateRowHeight: (sheetId: string, rowIndex: number, height: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        // Validate row index
        if (rowIndex < 0 || rowIndex >= sheet.data.length) return false;

        // Enforce minimum height (24px)
        const clampedHeight = Math.max(24, height);

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  rowHeights: {
                    ...(s.rowHeights ?? {}),
                    [rowIndex]: clampedHeight,
                  },
                }
              : s
          ),
        }));

        return true;
      },

      updateFreeColumnHeader: (sheetId: string, columnIndex: number, header: string) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        const columns = sheet.columns ?? [];

        // Validate column index
        if (columnIndex < 0 || columnIndex >= columns.length) return false;

        // Only allow renaming free columns
        const column = columns[columnIndex];
        if (column.type !== 'free') return false;

        // Validate header is not empty
        const trimmedHeader = header.trim();
        if (!trimmedHeader) return false;

        // Update only the column definition - headers now live only in columns[].header
        set((state) => ({
          sheets: state.sheets.map((s) => {
            if (s.id !== sheetId) return s;

            // Update column definition
            const updatedColumns = s.columns.map((col, idx) =>
              idx === columnIndex ? { ...col, header: trimmedHeader } : col
            );

            return { ...s, columns: updatedColumns };
          }),
        }));

        return true;
      },

      setPinnedColumns: (sheetId: string, pinnedColumns: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        const columns = sheet.columns ?? [];

        // Enforce minimum of 1 (SKU column is always pinned)
        // Enforce maximum of column count
        const clampedPinnedColumns = Math.max(1, Math.min(pinnedColumns, columns.length));

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? { ...s, pinnedColumns: clampedPinnedColumns }
              : s
          ),
        }));

        return true;
      },

      setPinnedRows: (sheetId: string, pinnedRows: number) => {
        const { sheets } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        // Enforce minimum of 0 (no rows pinned by default)
        // Enforce maximum of row count
        const rowCount = sheet.data.length;
        const clampedPinnedRows = Math.max(0, Math.min(pinnedRows, rowCount));

        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === sheetId
              ? { ...s, pinnedRows: clampedPinnedRows }
              : s
          ),
        }));

        return true;
      },

      // Sheet group management methods

      addGroup: (name: string) => {
        const groupId = generateId();
        const newGroup: SheetGroup = {
          id: groupId,
          name,
          collapsed: false,
          sheetIds: [],
        };

        set((state) => ({
          groups: [...state.groups, newGroup],
        }));

        return groupId;
      },

      updateGroup: (groupId: string, updates: Partial<Pick<SheetGroup, 'name' | 'collapsed' | 'color'>>) => {
        const { groups } = get();
        const group = groups.find((g) => g.id === groupId);
        if (!group) return false;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g
          ),
        }));

        return true;
      },

      removeGroup: (groupId: string, deleteSheets = false) => {
        const { groups, removeSheet } = get();
        const group = groups.find((g) => g.id === groupId);
        if (!group) return false;

        if (deleteSheets) {
          // Delete all sheets in the group
          group.sheetIds.forEach((sheetId) => {
            removeSheet(sheetId);
          });
        }

        // Remove the group
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
        }));

        return true;
      },

      moveSheetToGroup: (sheetId: string, groupId: string | null) => {
        const { sheets, groups } = get();
        const sheet = sheets.find((s) => s.id === sheetId);
        if (!sheet) return false;

        // If moving to a specific group, verify it exists
        if (groupId !== null) {
          const targetGroup = groups.find((g) => g.id === groupId);
          if (!targetGroup) return false;
        }

        set((state) => ({
          groups: state.groups.map((g) => {
            // Remove sheet from current group if it's there
            if (g.sheetIds.includes(sheetId)) {
              return { ...g, sheetIds: g.sheetIds.filter((id) => id !== sheetId) };
            }
            // Add sheet to target group
            if (g.id === groupId) {
              return { ...g, sheetIds: [...g.sheetIds, sheetId] };
            }
            return g;
          }),
        }));

        return true;
      },

      toggleGroupCollapsed: (groupId: string) => {
        const { groups } = get();
        const group = groups.find((g) => g.id === groupId);
        if (!group) return false;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
          ),
        }));

        return true;
      },

      getSheetGroup: (sheetId: string) => {
        const { groups } = get();
        return groups.find((g) => g.sheetIds.includes(sheetId));
      },

      getUngroupedSheetIds: () => {
        const { sheets, groups } = get();
        const groupedSheetIds = new Set(groups.flatMap((g) => g.sheetIds));
        return sheets.map((s) => s.id).filter((id) => !groupedSheetIds.has(id));
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
          state.groups = [];
          state.activeSheetId = productSheet.id;
          // Ensure all spec values have colors (sample data now includes colors,
          // but call migration for safety in case sample-data.ts is modified)
          state.sheets = ensureSpecValueColors(state.sheets);
          markAsInitialized();
        } else if (state && state.sheets.length > 0) {
          // Ensure groups array exists (for existing users without groups)
          if (!state.groups) {
            state.groups = [];
          }
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

          // Migration: Remove redundant header row from data array
          // Headers now live only in columns[].header, not in data[0]
          state.sheets = state.sheets.map((sheet) => removeHeaderRowFromSheet(sheet));

          // Migration: Ensure all spec values have colors assigned
          // Specs created before the color feature don't have color properties
          state.sheets = ensureSpecValueColors(state.sheets);

          markAsInitialized();
        } else if (state && state.sheets.length === 0) {
          // Orphaned state recovery: User has initialized before (!isFirstLaunch)
          // but sheets array is empty (localStorage 'sku-sheets' was cleared/corrupted
          // while 'sku-has-data' flag still exists). Create a default empty sheet
          // so the app is usable.
          const defaultSheet = createEmptySheet('Sheet 1');
          state.sheets = [defaultSheet];
          state.groups = [];
          state.activeSheetId = defaultSheet.id;
        }
      },
    }
  )
);

// Export migration functions for testing
export { isLikelyHeaderRow, removeHeaderRowFromSheet, ensureSpecValueColors };
