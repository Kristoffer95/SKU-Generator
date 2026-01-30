import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkuReactivity } from './use-sku-reactivity';
import { useSheetsStore } from '@/store/sheets';
import { useSettingsStore } from '@/store/settings';
import type { Specification, CellData, ColumnDef, SheetConfig } from '@/types';

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

// Helper to create sheet data from rows, handling header row automatically
// If first row looks like headers (first cell is 'SKU'), it will be used for columns but not data
const createSheetData = (rows: string[][]): { data: CellData[][], headers: string[] } => {
  // Check if first row is a header row
  const isHeader = rows[0]?.[0] === 'SKU';
  const headers = isHeader ? rows[0] : [];
  const dataRows = isHeader ? rows.slice(1) : rows;

  return {
    data: dataRows.map((row) =>
      row.map((val) => ({ v: val, m: val }))
    ),
    headers,
  };
};

// Helper to create column definitions from header names
const createColumns = (headers: string[], specifications: Specification[]): ColumnDef[] => {
  return headers.map((header, index) => {
    if (index === 0) {
      return { id: `col-${index}`, type: 'sku' as const, header };
    }
    const spec = specifications.find(s => s.name === header);
    if (spec) {
      return { id: `col-${index}`, type: 'spec' as const, specId: spec.id, header };
    }
    return { id: `col-${index}`, type: 'free' as const, header };
  });
};

// Helper to create a complete sheet with specs and columns
const createSheet = (
  id: string,
  name: string,
  rawData: { data: CellData[][], headers: string[] },
  specifications: Specification[]
): SheetConfig => {
  // Use headers from data extraction or default to ['SKU'] + spec names
  const columnHeaders = rawData.headers.length > 0
    ? rawData.headers
    : ['SKU', ...specifications.map(s => s.name)];
  const columns = createColumns(columnHeaders, specifications);
  return {
    id,
    name,
    type: 'data',
    data: rawData.data,
    columns,
    specifications,
  };
};

describe('useSkuReactivity', () => {
  beforeEach(() => {
    // Reset all stores before each test
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

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const setSheetDataSpy = vi.spyOn(useSheetsStore.getState(), 'setSheetData');

    renderHook(() => useSkuReactivity());

    // Should not call setSheetData on initial render
    expect(setSheetDataSpy).not.toHaveBeenCalled();

    setSheetDataSpy.mockRestore();
  });

  it('should regenerate SKUs when skuFragment changes in sheet-local specs', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Now update the skuFragment using sheet-local updateSpecValue
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    // Check that the sheet data was updated with new SKU
    const updatedSheets = useSheetsStore.getState().sheets;
    const updatedData = updatedSheets[0].data;

    // SKU should be regenerated with new fragment
    expect(updatedData[0][0].v).toBe('RD');
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

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec, sizeSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change Red's skuFragment from 'R' to 'RD'
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Row 1 (Red) should have updated SKU
    expect(updatedData[0][0].v).toBe('RD-S');
    // Row 2 (Blue) should be unchanged
    expect(updatedData[1][0].v).toBe('B-S');
  });

  it('should only update the active sheet when skuFragment changes (not other sheets)', () => {
    // Now that specs are per-sheet, changing a spec in one sheet
    // should NOT affect other sheets since they have their own specs
    const colorSpec1 = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const colorSpec2 = createSpec('spec-color', 'Color', 0, [
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

    const sheet1 = createSheet('sheet-1', 'Products 1', sheet1Data, [colorSpec1]);
    const sheet2 = createSheet('sheet-2', 'Products 2', sheet2Data, [colorSpec2]);

    useSheetsStore.setState({
      sheets: [sheet1, sheet2],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change skuFragment in sheet-1 only
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedSheets = useSheetsStore.getState().sheets;

    // Active sheet (sheet-1) should have updated SKUs (data[0] is first data row)
    expect(updatedSheets[0].data[0][0].v).toBe('RD');
    // Inactive sheet (sheet-2) should remain unchanged (has its own independent spec)
    expect(updatedSheets[1].data[0][0].v).toBe('R');
  });

  it('should not regenerate SKUs when only displayValue changes (but should update cell values)', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change only displayValue (not skuFragment)
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        displayValue: 'Crimson',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // SKU should remain unchanged (still 'R', not regenerated)
    expect(updatedData[0][0].v).toBe('R');
    // Cell value should be updated to new displayValue
    expect(updatedData[0][1].v).toBe('Crimson');
    expect(updatedData[0][1].m).toBe('Crimson');
  });

  it('should only update cells matching the old displayValue', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
      ['B', 'Blue'],
      ['R', 'Red'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change Red to Crimson
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        displayValue: 'Crimson',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Red cells should be updated (data[0] and data[2] were 'Red')
    expect(updatedData[0][1].v).toBe('Crimson');
    expect(updatedData[2][1].v).toBe('Crimson');
    // Blue cells should remain unchanged (data[1] was 'Blue')
    expect(updatedData[1][1].v).toBe('Blue');
  });

  it('should update cells only in columns matching the specification via specId', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    // Sheet has 'Color' and 'Notes' columns, both with 'Red' text
    // But Notes is a free column, not linked to the Color spec
    const sheetData = createSheetData([
      ['SKU', 'Color', 'Notes'],
      ['R', 'Red', 'Red is a nice color'],
    ]);

    // Create columns with Notes as 'free' type (not linked to spec)
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', specId: 'spec-color', header: 'Color' },
      { id: 'col-2', type: 'free', header: 'Notes' },
    ];

    const sheet: SheetConfig = {
      id: 'sheet-1',
      name: 'Products',
      type: 'data',
      data: sheetData.data,
      columns,
      specifications: [colorSpec],
    };

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change Red to Crimson
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        displayValue: 'Crimson',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Color column should be updated
    expect(updatedData[0][1].v).toBe('Crimson');
    // Notes column should remain unchanged (even though it contains 'Red')
    expect(updatedData[0][2].v).toBe('Red is a nice color');
  });

  it('should update displayValue in data rows', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Color', skuFragment: 'C' }, // displayValue matches header name
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['C', 'Color'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change 'Color' displayValue to something else
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        displayValue: 'Hue',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;
    const updatedColumns = useSheetsStore.getState().sheets[0].columns;

    // Column header should remain unchanged (in columns array, not data)
    expect(updatedColumns[1].header).toBe('Color');
    // Data row should be updated (row 0 is first data row)
    expect(updatedData[0][1].v).toBe('Hue');
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

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec, sizeSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
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
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // SKU should respect delimiter, prefix, and suffix
    expect(updatedData[0][0].v).toBe('PRE-RD_S-SUF');
  });

  it('should regenerate SKUs for all data rows', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change skuFragment
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;
    const updatedColumns = useSheetsStore.getState().sheets[0].columns;

    // Column headers should be in columns array
    expect(updatedColumns[0].header).toBe('SKU');
    expect(updatedColumns[1].header).toBe('Color');
    // SKU in data row 0 should be regenerated
    expect(updatedData[0][0].v).toBe('RD');
  });

  it('should handle empty specifications array', () => {
    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    // Sheet with no specifications
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'free', header: 'Color' },
    ];

    const sheet: SheetConfig = {
      id: 'sheet-1',
      name: 'Products',
      type: 'data',
      data: sheetData.data,
      columns,
      specifications: [],
    };

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    // Should not throw with empty specifications
    expect(() => {
      renderHook(() => useSkuReactivity());
    }).not.toThrow();
  });

  it('should handle sheets with no data rows', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    // Empty data rows (headers extracted into columns)
    const sheetData = createSheetData([
      ['SKU', 'Color'], // This becomes headers, no data rows remain
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Should not throw when changing skuFragment
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        skuFragment: 'RD',
      });
    });

    expect(() => rerender()).not.toThrow();

    const updatedData = useSheetsStore.getState().sheets[0].data;
    expect(updatedData).toHaveLength(0); // No data rows
    // Headers are in columns array
    const updatedColumns = useSheetsStore.getState().sheets[0].columns;
    expect(updatedColumns[0].header).toBe('SKU');
  });

  it('should not trigger SKU regeneration when switching sheets', () => {
    const colorSpec1 = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);
    const colorSpec2 = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Blue', skuFragment: 'B' },
    ]);

    const sheet1Data = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);
    const sheet2Data = createSheetData([
      ['SKU', 'Color'],
      ['B', 'Blue'],
    ]);

    const sheet1 = createSheet('sheet-1', 'Products 1', sheet1Data, [colorSpec1]);
    const sheet2 = createSheet('sheet-2', 'Products 2', sheet2Data, [colorSpec2]);

    useSheetsStore.setState({
      sheets: [sheet1, sheet2],
      activeSheetId: 'sheet-1',
    });

    const setSheetDataSpy = vi.spyOn(useSheetsStore.getState(), 'setSheetData');

    const { rerender } = renderHook(() => useSkuReactivity());

    // Switch to sheet-2
    act(() => {
      useSheetsStore.setState({ activeSheetId: 'sheet-2' });
    });

    rerender();

    // Should not call setSheetData when just switching sheets
    expect(setSheetDataSpy).not.toHaveBeenCalled();

    setSheetDataSpy.mockRestore();
  });

  it('should handle both displayValue and skuFragment changing at once', () => {
    const colorSpec = createSpec('spec-color', 'Color', 0, [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
    ]);

    const sheetData = createSheetData([
      ['SKU', 'Color'],
      ['R', 'Red'],
    ]);

    const sheet = createSheet('sheet-1', 'Products', sheetData, [colorSpec]);

    useSheetsStore.setState({
      sheets: [sheet],
      activeSheetId: 'sheet-1',
    });

    const { rerender } = renderHook(() => useSkuReactivity());

    // Change both displayValue and skuFragment at once
    act(() => {
      useSheetsStore.getState().updateSpecValue('sheet-1', 'spec-color', 'v1', {
        displayValue: 'Crimson',
        skuFragment: 'CR',
      });
    });

    rerender();

    const updatedData = useSheetsStore.getState().sheets[0].data;

    // Both SKU and cell value should be updated
    expect(updatedData[0][0].v).toBe('CR');
    expect(updatedData[0][1].v).toBe('Crimson');
  });
});
