import { useEffect, useRef } from 'react';
import { useSpecificationsStore } from '@/store/specifications';
import { useSheetsStore } from '@/store/sheets';
import { useSettingsStore } from '@/store/settings';
import { updateRowSKU } from '@/lib/auto-sku';
import type { Specification, CellData } from '@/types';

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
 * Update cell values in all data sheets when a displayValue is renamed
 * Finds cells with the old value in columns matching the spec name and updates them
 */
function updateDisplayValuesInSheets(changes: DisplayValueChange[]): void {
  if (changes.length === 0) return;

  const { sheets, setSheetData } = useSheetsStore.getState();

  sheets.forEach((sheet) => {
    if (sheet.type !== 'data' || sheet.data.length === 0) return;

    // Extract headers from first row to find column indices for spec names
    const headers = sheet.data[0]?.map(cell => String(cell?.v ?? cell?.m ?? '').trim()) ?? [];

    // Build a map of column index -> change to apply for this sheet
    const columnChanges = new Map<number, DisplayValueChange>();
    for (const change of changes) {
      const colIndex = headers.indexOf(change.specName);
      if (colIndex !== -1) {
        columnChanges.set(colIndex, change);
      }
    }

    // If no columns match any change, skip this sheet
    if (columnChanges.size === 0) return;

    // Create a copy of the data to modify
    let modified = false;
    const newData: CellData[][] = sheet.data.map((row, rowIndex) => {
      // Skip header row (row 0)
      if (rowIndex === 0) return [...row];

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
      setSheetData(sheet.id, newData);
    }
  });
}

/**
 * Regenerate all SKUs in all data sheets using current specifications
 */
function regenerateAllSKUs(
  specifications: Specification[],
  settings: { delimiter: string; prefix: string; suffix: string }
): void {
  const { sheets, setSheetData } = useSheetsStore.getState();

  if (specifications.length === 0) return;

  sheets.forEach((sheet) => {
    if (sheet.type !== 'data' || sheet.data.length <= 1) return;

    // Create a copy of the data to modify
    const newData = sheet.data.map((row) => [...row]);

    // Update SKU for each data row (skip header row 0)
    for (let rowIndex = 1; rowIndex < newData.length; rowIndex++) {
      updateRowSKU(newData, rowIndex, specifications, settings);
    }

    // Update the sheet in the store
    setSheetData(sheet.id, newData);
  });
}

/**
 * Hook that watches for specification changes and regenerates SKUs automatically
 *
 * Handles reactivity for:
 * - skuFragment changes (reactivity-1)
 * - displayValue changes (reactivity-3)
 *
 * Call this hook at the app root level to enable automatic SKU updates.
 */
export function useSkuReactivity(): void {
  const specifications = useSpecificationsStore((state) => state.specifications);
  const delimiter = useSettingsStore((state) => state.delimiter);
  const prefix = useSettingsStore((state) => state.prefix);
  const suffix = useSettingsStore((state) => state.suffix);

  // Store previous specifications for comparison
  const prevSpecsRef = useRef<Specification[]>(specifications);

  useEffect(() => {
    const prevSpecs = prevSpecsRef.current;

    // Check if skuFragment changed - regenerate SKUs
    if (hasSkuFragmentChanged(prevSpecs, specifications)) {
      regenerateAllSKUs(specifications, { delimiter, prefix, suffix });
    }

    // Check if displayValue changed - update cell values (not SKUs)
    const displayValueChanges = getDisplayValueChanges(prevSpecs, specifications);
    if (displayValueChanges.length > 0) {
      updateDisplayValuesInSheets(displayValueChanges);
    }

    // Update ref for next comparison
    prevSpecsRef.current = specifications;
  }, [specifications, delimiter, prefix, suffix]);
}
