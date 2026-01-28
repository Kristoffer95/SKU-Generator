import { useEffect, useRef } from 'react';
import { useSpecificationsStore } from '@/store/specifications';
import { useSheetsStore } from '@/store/sheets';
import { useSettingsStore } from '@/store/settings';
import { updateRowSKU } from '@/lib/auto-sku';
import type { Specification } from '@/types';

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

    // Check if skuFragment changed
    if (hasSkuFragmentChanged(prevSpecs, specifications)) {
      regenerateAllSKUs(specifications, { delimiter, prefix, suffix });
    }

    // Update ref for next comparison
    prevSpecsRef.current = specifications;
  }, [specifications, delimiter, prefix, suffix]);
}
