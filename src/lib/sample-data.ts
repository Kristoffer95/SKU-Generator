import type { CellData, SheetConfig } from '../types';

/** Config sheet header row */
const CONFIG_SHEET_HEADERS: CellData[] = [
  { v: 'Specification', m: 'Specification' },
  { v: 'Value', m: 'Value' },
  { v: 'SKU Code', m: 'SKU Code' },
];

/**
 * Returns sample Config sheet data with Color, Size, and Material specifications.
 * Includes header row + 9 spec entries (3 for each spec).
 */
export function getSampleConfigData(): CellData[][] {
  return [
    CONFIG_SHEET_HEADERS,
    // Color specifications
    [{ v: 'Color', m: 'Color' }, { v: 'Red', m: 'Red' }, { v: 'R', m: 'R' }],
    [{ v: 'Color', m: 'Color' }, { v: 'Blue', m: 'Blue' }, { v: 'B', m: 'B' }],
    [{ v: 'Color', m: 'Color' }, { v: 'Green', m: 'Green' }, { v: 'G', m: 'G' }],
    // Size specifications
    [{ v: 'Size', m: 'Size' }, { v: 'Small', m: 'Small' }, { v: 'S', m: 'S' }],
    [{ v: 'Size', m: 'Size' }, { v: 'Medium', m: 'Medium' }, { v: 'M', m: 'M' }],
    [{ v: 'Size', m: 'Size' }, { v: 'Large', m: 'Large' }, { v: 'L', m: 'L' }],
    // Material specifications
    [{ v: 'Material', m: 'Material' }, { v: 'Cotton', m: 'Cotton' }, { v: 'COT', m: 'COT' }],
    [{ v: 'Material', m: 'Material' }, { v: 'Polyester', m: 'Polyester' }, { v: 'POL', m: 'POL' }],
    [{ v: 'Material', m: 'Material' }, { v: 'Wool', m: 'Wool' }, { v: 'WOL', m: 'WOL' }],
  ];
}

/**
 * Returns sample products data sheet with 5 pre-filled products demonstrating SKU generation.
 * SKU column is first (Column A), followed by Color, Size, Material columns.
 *
 * Sample products demonstrate various SKU combinations:
 * - R-S-COT (Red, Small, Cotton)
 * - B-M-POL (Blue, Medium, Polyester)
 * - G-L-WOL (Green, Large, Wool)
 * - R-L-COT (Red, Large, Cotton)
 * - B-S-POL (Blue, Small, Polyester)
 */
export function getSampleProductData(): CellData[][] {
  return [
    // Header row: SKU first, then spec columns
    [
      { v: 'SKU', m: 'SKU' },
      { v: 'Color', m: 'Color' },
      { v: 'Size', m: 'Size' },
      { v: 'Material', m: 'Material' },
    ],
    // Product 1: Red, Small, Cotton -> R-S-COT
    [
      { v: 'R-S-COT', m: 'R-S-COT' },
      { v: 'Red', m: 'Red' },
      { v: 'Small', m: 'Small' },
      { v: 'Cotton', m: 'Cotton' },
    ],
    // Product 2: Blue, Medium, Polyester -> B-M-POL
    [
      { v: 'B-M-POL', m: 'B-M-POL' },
      { v: 'Blue', m: 'Blue' },
      { v: 'Medium', m: 'Medium' },
      { v: 'Polyester', m: 'Polyester' },
    ],
    // Product 3: Green, Large, Wool -> G-L-WOL
    [
      { v: 'G-L-WOL', m: 'G-L-WOL' },
      { v: 'Green', m: 'Green' },
      { v: 'Large', m: 'Large' },
      { v: 'Wool', m: 'Wool' },
    ],
    // Product 4: Red, Large, Cotton -> R-L-COT
    [
      { v: 'R-L-COT', m: 'R-L-COT' },
      { v: 'Red', m: 'Red' },
      { v: 'Large', m: 'Large' },
      { v: 'Cotton', m: 'Cotton' },
    ],
    // Product 5: Blue, Small, Polyester -> B-S-POL
    [
      { v: 'B-S-POL', m: 'B-S-POL' },
      { v: 'Blue', m: 'Blue' },
      { v: 'Small', m: 'Small' },
      { v: 'Polyester', m: 'Polyester' },
    ],
  ];
}

const generateId = () => crypto.randomUUID();

/**
 * Creates sample sheets for first-time users.
 * Returns a Config sheet with sample specs and a Sample Products data sheet.
 */
export function createSampleSheets(): { configSheet: SheetConfig; productSheet: SheetConfig } {
  const configSheet: SheetConfig = {
    id: generateId(),
    name: 'Config',
    type: 'config',
    data: getSampleConfigData(),
  };

  const productSheet: SheetConfig = {
    id: generateId(),
    name: 'Sample Products',
    type: 'data',
    data: getSampleProductData(),
  };

  return { configSheet, productSheet };
}

/**
 * Checks if the app has been launched before by checking localStorage for existing sheets.
 * Returns true if this is the first launch (no sheets in localStorage).
 */
export function isFirstLaunch(): boolean {
  try {
    const stored = localStorage.getItem('sku-sheets');
    if (!stored) return true;
    const parsed = JSON.parse(stored);
    // Check if there are any sheets
    return !parsed.state?.sheets || parsed.state.sheets.length === 0;
  } catch {
    return true;
  }
}
