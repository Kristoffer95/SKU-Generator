import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkuReactivity } from './use-sku-reactivity';
import { useSpecificationsStore } from '@/store/specifications';
import { useSheetsStore } from '@/store/sheets';
import { useSettingsStore } from '@/store/settings';
import type { Specification, CellData } from '@/types';

// Helper to create a specification
const createSpec = (
  id: string,
  name: string,
  order: number,
  values: { id: string; displayValue: string; skuFragment: string }[]
): Specification => ({
  id,
  name,
  order,
  values,
});

// Helper to create sheet data with SKU in column 0
const createSheetData = (rows: string[][]): CellData[][] => {
  return rows.map((row) =>
    row.map((val) => ({ v: val, m: val }))
  );
};

describe('useSkuReactivity', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useSpecificationsStore.setState({ specifications: [] });
    useSheetsStore.setState({
      sheets: [],
      activeSheetId: null,
    });
    useSettingsStore.setState({
      delimiter: '-',
      prefix: '',
      suffix: '',
    });
  });

  it('should not regenerate SKUs on initial render', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const setSheetDataSpy = vi.spyOn(useSheetsStore.getState(), 'setSheetData');

    renderHook(() => useSkuReactivity());

    // Should not call setSheetData on initial render
    expect(setSheetDataSpy).not.toHaveBeenCalled();

    setSheetDataSpy.mockRestore();
  });

  it('should regenerate SKUs when skuFragment changes', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Now update the skuFragment
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    // Check that the sheet data was updated with new SKU
    const updatedSheets = useSheetsStore.getState().sheets;
    const updatedData = updatedSheets[0].data;

    // SKU should be regenerated with new fragment
    expect(updatedData[1][0].v).toBe('RD');
  });

  it('should regenerate SKUs for multiple rows when skuFragment changes', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
    ]);

    const sizeSpec = createSpec('spec-size', 'Size', 1, [
      { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color', 'Size'],
      ['R-S', 'Red', 'Small'],
      ['B-S', 'Blue', 'Small'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec, sizeSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change Red's skuFragment from 'R' to 'RD'
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Row 1 (Red) should have updated SKU
    expect(updatedData[1][0].v).toBe('RD-S');
    // Row 2 (Blue) should be unchanged
    expect(updatedData[2][0].v).toBe('B-S');
  });

  it('should regenerate SKUs in multiple sheets when skuFragment changes', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheet1Data = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    const sheet2Data = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [
        { id: 'sheet-1', name: 'Products 1', type: 'data', data: sheet1Data },
        { id: 'sheet-2', name: 'Products 2', type: 'data', data: sheet2Data },
      ],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change skuFragment
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedSheets = useSheetsStore.getState().sheets;

    // Both sheets should have updated SKUs
    expect(updatedSheets[0].data[1][0].v).toBe('RD');
    expect(updatedSheets[1].data[1][0].v).toBe('RD');
  });

  it('should not regenerate SKUs when only displayValue changes', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Get initial data state
    const initialData = JSON.stringify(useSheetsStore.getState().sheets[0].data);

    // Change only displayValue (not skuFragment)
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        displayValue: 'Crimson',
      });
    });

    rerender();

    // Data should remain the same (only displayValue changed, not skuFragment)
    const updatedData = JSON.stringify(useSheetsStore.getState().sheets[0].data);
    expect(updatedData).toBe(initialData);
  });

  it('should respect settings when regenerating SKUs', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);
    const sizeSpec = createSpec('spec-size', 'Size', 1, [
      { id: 'v2', displayValue: 'Small', skuFragment: 'S' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color', 'Size'],
      ['PRE-R_S-SUF', 'Red', 'Small'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec, sizeSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    useSettingsStore.setState({
      delimiter: '_',
      prefix: 'PRE-',
      suffix: '-SUF',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change skuFragment
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // SKU should respect delimiter, prefix, and suffix
    expect(updatedData[1][0].v).toBe('PRE-RD_S-SUF');
  });

  it('should skip header row when regenerating SKUs', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change skuFragment
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Header row should remain unchanged
    expect(updatedData[0][0].v).toBe('SKU');
    expect(updatedData[0][1].v).toBe('Color');
  });

  it('should handle empty specifications array', () => {
    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    // Should not throw with empty specifications
    expect(() => {
      renderHook(() => useSkuReactivity());
    }).not.toThrow();
  });

  it('should handle sheets with only header row', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'], // Only header, no data rows
    ]);

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    });

    useSheetsStore.setState({
      sheets: [{ id: 'sheet-1', name: 'Products', type: 'data', data: sheetData }],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Should not throw when changing skuFragment
    act(() => {
      useSpecificationsStore.getState().updateSpecValue('spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    expect(() => rerender()).not.toThrow();

    const updatedData = useSheetsStore.getState().sheets[0].data;
    expect(updatedData).toHaveLength(1); // Still just header row
    expect(updatedData[0][0].v).toBe('SKU');
  });
});
