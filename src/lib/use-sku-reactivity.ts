import { useEffect, useRef, useMemo } from 'react';
import { useSheetsStore } from '@/store/sheets';
import { useSettingsStore } from '@/store/settings';
import { updateRowSKUFromColumns } from '@/lib/auto-sku';
import type { Specification, CellData, ColumnDef } from '@/types';

// Empty array constants to avoid creating new references on every render
const EMPTY_SPECIFICATIONS: Specification[] = [];
const EMPTY_COLUMNS: ColumnDef[] = [];

/**
 * Deep compare two specification arrays to detect changes in skuFragments
 * Returns true if any skuFragment has changed
 */
function hasSkuFragmentChanged(prev: Specification[], next: Specification[]): boolean {
  // Build a map of valueId -> skuFragment for previous specs
  const prevFragments = new Map<string, string>();
  for (const spec of prev) {
    for (const value of spec.values) {
      prevFragments.set(value.id, value.skuFragment);
    }
  }

  // Check if any next value has a different skuFragment
  for (const spec of next) {
    for (const value of spec.values) {
      const prevFragment = prevFragments.get(value.id);
      // If value existed before and fragment changed, return true
      if (prevFragment !== undefined && prevFragment !== value.skuFragment) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Represents a displayValue change that needs to be applied to sheet cells
 */
interface DisplayValueChange {
  specName: string;
  oldDisplayValue: string;
  newDisplayValue: string;
}

/**
 * Detect displayValue changes between two specification arrays
 * Returns a list of changes with spec name, old value, and new value
 */
function getDisplayValueChanges(prev: Specification[], next: Specification[]): DisplayValueChange[] {
  const changes: DisplayValueChange[] = [];

  // Build a map of valueId -> { specName, displayValue } for previous specs
  const prevValues = new Map<string, { specName: string; displayValue: string }>();
  for (const spec of prev) {
    for (const value of spec.values) {
      prevValues.set(value.id, { specName: spec.name, displayValue: value.displayValue });
    }
  }

  // Check for displayValue changes in next specs
  for (const spec of next) {
    for (const value of spec.values) {
      const prevInfo = prevValues.get(value.id);
      if (prevInfo && prevInfo.displayValue !== value.displayValue) {
        changes.push({
          specName: spec.name,
          oldDisplayValue: prevInfo.displayValue,
          newDisplayValue: value.displayValue,
        });
      }
    }
  }

  return changes;
}

/**
 * Update cell values in a single sheet when a displayValue is renamed
 * Uses column definitions to find which columns to update
 */
function updateDisplayValuesInSheet(
  sheetId: string,
  changes: DisplayValueChange[],
  columns: ColumnDef[],
  specifications: Specification[]
): void {
  if (changes.length === 0) return;

  const { sheets, setSheetData } = useSheetsStore.getState();
  const sheet = sheets.find(s => s.id === sheetId);

  if (!sheet || sheet.type !== 'data' || sheet.data.length === 0) return;

  // Build a map of column index -> change to apply
  // Find columns by specId, then match to the spec name from change
  const columnChanges = new Map<number, DisplayValueChange>();
  for (const change of changes) {
    // Find the spec by name
    const spec = specifications.find(s => s.name === change.specName);
    if (!spec) continue;

    // Find all columns that reference this spec
    columns.forEach((col, colIndex) => {
      if (col.type === 'spec' && col.specId === spec.id) {
        columnChanges.set(colIndex, change);
      }
    });
  }

  // If no columns match any change, skip this sheet
  if (columnChanges.size === 0) return;

  // Create a copy of the data to modify
  let modified = false;
  const newData: CellData[][] = sheet.data.map((row) => {
    // All rows are data rows now - no header row to skip

    const newRow = [...row];
    for (const [colIndex, change] of columnChanges) {
      const cell = row[colIndex];
      const cellValue = String(cell?.v ?? cell?.m ?? '').trim();

      // If cell value matches the old displayValue, update it
      if (cellValue === change.oldDisplayValue) {
        newRow[colIndex] = {
          ...cell,
          v: change.newDisplayValue,
          m: change.newDisplayValue,
        };
        modified = true;
      }
    }

    return newRow;
  });

  // Only update the sheet if we made changes
  if (modified) {
    setSheetData(sheetId, newData);
  }
}

/**
 * Regenerate all SKUs in a single sheet using its local specifications and columns
 */
function regenerateSheetSKUs(
  sheetId: string,
  columns: ColumnDef[],
  specifications: Specification[],
  settings: { delimiter: string; prefix: string; suffix: string }
): void {
  const { sheets, setSheetData } = useSheetsStore.getState();
  const sheet = sheets.find(s => s.id === sheetId);

  if (!sheet || sheet.type !== 'data' || sheet.data.length === 0) return;
  if (specifications.length === 0) return;

  // Create a copy of the data to modify
  const newData = sheet.data.map((row) => [...row]);

  // Update SKU for each data row (all rows are data rows now)
  for (let rowIndex = 0; rowIndex < newData.length; rowIndex++) {
    updateRowSKUFromColumns(newData, rowIndex, columns, specifications, settings);
  }

  // Update the sheet in the store
  setSheetData(sheetId, newData);
}

/**
 * Hook that watches for specification changes and regenerates SKUs automatically
 *
 * Handles reactivity for:
 * - skuFragment changes: regenerates all SKUs in the active sheet
 * - displayValue changes: updates cell values in the active sheet
 *
 * This hook watches the active sheet's local specifications (not global specs).
 * Call this hook at the app root level to enable automatic SKU updates.
 */
export function useSkuReactivity(): void {
  // Get active sheet and its local specifications and columns
  const activeSheetId = useSheetsStore((state) => state.activeSheetId);
  const sheets = useSheetsStore((state) => state.sheets);
  const activeSheet = sheets.find(s => s.id === activeSheetId);

  // Memoize to avoid creating new array references on every render
  const specifications = useMemo(
    () => activeSheet?.specifications ?? EMPTY_SPECIFICATIONS,
    [activeSheet?.specifications]
  );
  const columns = useMemo(
    () => activeSheet?.columns ?? EMPTY_COLUMNS,
    [activeSheet?.columns]
  );

  // Get settings
  const delimiter = useSettingsStore((state) => state.delimiter);
  const prefix = useSettingsStore((state) => state.prefix);
  const suffix = useSettingsStore((state) => state.suffix);

  // Store previous specifications and sheet ID for comparison
  const prevSpecsRef = useRef<Specification[]>(specifications);
  const prevSheetIdRef = useRef<string | null>(activeSheetId);

  useEffect(() => {
    // If sheet changed, just update ref and don't trigger SKU regeneration
    if (prevSheetIdRef.current !== activeSheetId) {
      prevSpecsRef.current = specifications;
      prevSheetIdRef.current = activeSheetId;
      return;
    }

    const prevSpecs = prevSpecsRef.current;

    // Check if displayValue changed - update cell values FIRST (before SKU regeneration)
    // This ensures that when both displayValue and skuFragment change together,
    // the cells have the correct displayValue before SKU regeneration runs
    const displayValueChanges = getDisplayValueChanges(prevSpecs, specifications);
    if (activeSheetId && displayValueChanges.length > 0) {
      updateDisplayValuesInSheet(activeSheetId, displayValueChanges, columns, specifications);
    }

    // Check if skuFragment changed - regenerate all SKUs in the active sheet
    // This runs AFTER displayValue updates so cells have correct values for matching
    if (activeSheetId && hasSkuFragmentChanged(prevSpecs, specifications)) {
      regenerateSheetSKUs(activeSheetId, columns, specifications, { delimiter, prefix, suffix });
    }

    // Update ref for next comparison
    prevSpecsRef.current = specifications;
  }, [activeSheetId, specifications, columns, delimiter, prefix, suffix]);
}
