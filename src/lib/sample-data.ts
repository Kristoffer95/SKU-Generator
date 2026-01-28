import type { CellData, SheetConfig, Specification, ColumnDef } from '../types';

const generateId = () => crypto.randomUUID();

/** Config sheet header row - kept for backwards compatibility/migration */
const CONFIG_SHEET_HEADERS: CellData[] = [
  { v: 'Specification', m: 'Specification' },
  { v: 'Value', m: 'Value' },
  { v: 'SKU Code', m: 'SKU Code' },
];

/**
 * Returns sample specifications in the Specification[] format for the specifications store.
 * Includes Color, Size, and Material with 3 values each.
 */
export function getSampleSpecifications(): Specification[] {
  return [
    {
      id: generateId(),
      name: 'Color',
      order: 0,
      values: [
        { id: generateId(), displayValue: 'Red', skuFragment: 'R' },
        { id: generateId(), displayValue: 'Blue', skuFragment: 'B' },
        { id: generateId(), displayValue: 'Green', skuFragment: 'G' },
      ],
    },
    {
      id: generateId(),
      name: 'Size',
      order: 1,
      values: [
        { id: generateId(), displayValue: 'Small', skuFragment: 'S' },
        { id: generateId(), displayValue: 'Medium', skuFragment: 'M' },
        { id: generateId(), displayValue: 'Large', skuFragment: 'L' },
      ],
    },
    {
      id: generateId(),
      name: 'Material',
      order: 2,
      values: [
        { id: generateId(), displayValue: 'Cotton', skuFragment: 'COT' },
        { id: generateId(), displayValue: 'Polyester', skuFragment: 'POL' },
        { id: generateId(), displayValue: 'Wool', skuFragment: 'WOL' },
      ],
    },
  ];
}

/**
 * Returns sample Config sheet data with Color, Size, and Material specifications.
 * Includes header row + 9 spec entries (3 for each spec).
 * @deprecated Use getSampleSpecifications() instead - Config sheet is being removed
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

/**
 * Creates column definitions from specifications
 * Returns SKU column + one spec column per specification
 */
export function createColumnsFromSpecs(specifications: Specification[]): ColumnDef[] {
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);
  const columns: ColumnDef[] = [
    { id: generateId(), type: 'sku', header: 'SKU' },
  ];
  for (const spec of sortedSpecs) {
    columns.push({
      id: generateId(),
      type: 'spec',
      specId: spec.id,
      header: spec.name,
    });
  }
  return columns;
}

/**
 * Creates sample product sheet for first-time users.
 * Includes local specifications and columns definitions.
 */
export function createSampleProductSheet(): SheetConfig {
  const specifications = getSampleSpecifications();
  const columns = createColumnsFromSpecs(specifications);
  return {
    id: generateId(),
    name: 'Sample Products',
    type: 'data',
    data: getSampleProductData(),
    columns,
    specifications,
  };
}

/**
 * Creates sample sheets for first-time users.
 * @deprecated Use createSampleProductSheet() instead - includes local specs and columns
 */
export function createSampleSheets(): { configSheet: SheetConfig; productSheet: SheetConfig } {
  const specifications = getSampleSpecifications();
  const columns = createColumnsFromSpecs(specifications);

  const configSheet: SheetConfig = {
    id: generateId(),
    name: 'Config',
    type: 'config',
    data: getSampleConfigData(),
    columns: [],
    specifications: [],
  };

  const productSheet: SheetConfig = {
    id: generateId(),
    name: 'Sample Products',
    type: 'data',
    data: getSampleProductData(),
    columns,
    specifications,
  };

  return { configSheet, productSheet };
}

const HAS_DATA_KEY = 'sku-has-data';

/**
 * Checks if the app has been launched before by checking a separate localStorage key.
 * Uses 'sku-has-data' instead of 'sku-sheets' to avoid race conditions with Zustand persist.
 * Returns true if this is the first launch (key not set).
 */
export function isFirstLaunch(): boolean {
  return localStorage.getItem(HAS_DATA_KEY) !== 'true';
}

/**
 * Marks the app as having been initialized with data.
 * Called after sample data or user data has been loaded.
 */
export function markAsInitialized(): void {
  localStorage.setItem(HAS_DATA_KEY, 'true');
}
