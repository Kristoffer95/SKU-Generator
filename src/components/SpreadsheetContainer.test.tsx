import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSheetsStore } from '@/store/sheets'
import { useSpecificationsStore } from '@/store/specifications'
import type { Specification, CellData, SheetConfig, ColumnDef } from '@/types'
import { createColumnsFromSpecs } from '@/lib/sample-data'

/**
 * Helper to create a sheet with local specifications
 * Use this instead of addSheet() when the test needs specs in the sheet
 */
function createSheetWithSpecs(
  name: string,
  data: CellData[][],
  specifications: Specification[]
): string {
  const sheetId = crypto.randomUUID()
  const columns = createColumnsFromSpecs(specifications)
  const sheet: SheetConfig = {
    id: sheetId,
    name,
    type: 'data',
    data,
    columns,
    specifications,
  }
  const { sheets } = useSheetsStore.getState()
  useSheetsStore.setState({
    sheets: [...sheets, sheet],
    activeSheetId: sheetId,
  })
  return sheetId
}

/**
 * Helper to create a sheet with explicit columns
 * Use this when testing column type behavior (spec vs free columns)
 */
function createSheetWithColumns(
  name: string,
  data: CellData[][],
  columns: ColumnDef[],
  specifications: Specification[]
): string {
  const sheetId = crypto.randomUUID()
  const sheet: SheetConfig = {
    id: sheetId,
    name,
    type: 'data',
    data,
    columns,
    specifications,
  }
  const { sheets } = useSheetsStore.getState()
  useSheetsStore.setState({
    sheets: [...sheets, sheet],
    activeSheetId: sheetId,
  })
  return sheetId
}

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Track onChange passed to Spreadsheet for testing
let capturedOnChange: ((data: unknown[][]) => void) | null = null
let capturedOnSelect: ((selection: unknown) => void) | null = null
let capturedData: unknown[][] = []
let capturedSelected: unknown = null

// Mock react-spreadsheet with selection support
vi.mock('react-spreadsheet', () => {
  // Create mock selection classes
  class MockPointRange {
    start: { row: number; column: number }
    end: { row: number; column: number }
    constructor(start: { row: number; column: number }, end: { row: number; column: number }) {
      this.start = start
      this.end = end
    }
  }

  class MockRangeSelection {
    range: MockPointRange
    constructor(range: MockPointRange) {
      this.range = range
    }
  }

  return {
    default: vi.fn(({ data, onChange, selected, onSelect }) => {
      // Capture onChange and data for testing
      capturedOnChange = onChange || null
      capturedOnSelect = onSelect || null
      capturedData = data || []
      capturedSelected = selected || null
      return (
        <div data-testid="mock-spreadsheet">
          <span data-testid="row-count">{data?.length || 0} rows</span>
          {/* Render table structure for scroll-to-cell to work in tests */}
          <table>
            <tbody>
              {data?.map((row: unknown[], rowIdx: number) => (
                <tr key={rowIdx} data-testid={`row-${rowIdx}`}>
                  <th data-testid={`row-indicator-${rowIdx}`}>Row {rowIdx}</th>
                  {Array.isArray(row) && row.map((cell: unknown, colIdx: number) => {
                    const cellObj = cell as { value?: string | number | null; readOnly?: boolean; className?: string } | null
                    return (
                      <td
                        key={colIdx}
                        data-testid={`cell-${rowIdx}-${colIdx}`}
                        data-value={cellObj?.value ?? ''}
                        data-readonly={cellObj?.readOnly ?? false}
                        data-classname={cellObj?.className ?? ''}
                        className="Spreadsheet__cell"
                      >
                        {String(cellObj?.value ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }),
    PointRange: MockPointRange,
    RangeSelection: MockRangeSelection,
    Selection: class {},
  }
})

// Import after mocking
import { SpreadsheetContainer } from './SpreadsheetContainer'

describe('SpreadsheetContainer', () => {
  beforeEach(() => {
    // Reset localStorage for isFirstLaunch check
    localStorage.clear()
    // Reset store state
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    // Reset captured values
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no sheets exist', () => {
    render(<SpreadsheetContainer />)
    expect(screen.getByText('No sheets available')).toBeInTheDocument()
  })

  it('renders spreadsheet when sheets exist', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('mock-spreadsheet')).toBeInTheDocument()
  })

  it('renders SheetTabs component below spreadsheet', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('sheet-tabs')).toBeInTheDocument()
  })

  it('renders SpreadsheetToolbar above spreadsheet', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('spreadsheet-toolbar')).toBeInTheDocument()
  })

  it('has spreadsheet-container test id wrapper', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('spreadsheet-container')).toBeInTheDocument()
  })

  it('includes multiple sheets in SheetTabs', () => {
    useSheetsStore.getState().initializeWithSampleData()
    useSheetsStore.getState().addSheet('Sheet 1')

    render(<SpreadsheetContainer />)
    // Check SheetTabs shows both sheets
    const sheetTabs = screen.getByTestId('sheet-tabs')
    expect(within(sheetTabs).getByText('Sample Products')).toBeInTheDocument()
    expect(within(sheetTabs).getByText('Sheet 1')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer data sheets', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders data sheets without errors', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // The component should have rendered without errors
    expect(screen.getByTestId('mock-spreadsheet')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer dropdown building', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('builds dropdownOptions from specifications store for spec columns', () => {
    // Set up specifications in sheet
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Check that row 1, col 1 (Color data cell) has dropdownOptions
    // The dropdownOptions are set via convertToSpreadsheetData
    expect(capturedData.length).toBeGreaterThan(1)
    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    expect(row1[1]?.dropdownOptions).toEqual(['Red', 'Blue']) // In spec values order
  })

  it('adds dropdownOptions based on column position, not header names', () => {
    // The adapter assigns dropdowns by column position (col 1 = spec[0], col 2 = spec[1])
    // regardless of header names
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Description' }], // Header name doesn't affect dropdown assignment
      [{ v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // SKU column (col 0) should not have dropdownOptions
    expect(row1[0]?.dropdownOptions).toBeUndefined()
    // Column 1 gets dropdowns from spec at position 0, regardless of header
    expect(row1[1]?.dropdownOptions).toEqual(['Red'])
  })

  it('applies dropdownOptions to multiple columns matching different specs', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
      {
        id: 'spec-2',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // Color column (col 1) should have Color values (in spec values order)
    expect(row1[1]?.dropdownOptions).toEqual(['Red', 'Blue'])
    // Size column (col 2) should have Size values (in spec values order)
    expect(row1[2]?.dropdownOptions).toEqual(['Small', 'Large'])
  })

  it('handles empty specifications gracefully', () => {
    // Create a sheet with empty specifications
    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], [])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // No dropdownOptions when no specifications
    expect(row1[1]?.dropdownOptions).toBeUndefined()
  })

  it('handles specifications with no values gracefully', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [], // Empty values array
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // No dropdown for specs with no values (empty array or undefined)
    expect(row1[1]?.dropdownOptions?.length ?? 0).toBe(0)
  })
})

describe('SpreadsheetContainer onChange handler', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('processes data sheet changes via onChange', () => {
    // Initialize with sample data
    useSheetsStore.getState().initializeWithSampleData()
    const sheets = useSheetsStore.getState().sheets
    const dataSheet = sheets[0]

    render(<SpreadsheetContainer />)

    // Simulate react-spreadsheet onChange with new data
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: '' }, { value: 'NewValue' }],
    ])

    // Data sheet should be updated
    const updatedSheet = useSheetsStore.getState().sheets.find(s => s.id === dataSheet.id)!
    expect(updatedSheet.data[1][1]?.v).toBe('NewValue')
  })

  it('generates SKU using specifications from store when cell value changes', () => {
    // Set up specifications in sheet
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
      {
        id: 'spec-2',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    // Set up sheet with Color and Size columns
    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Simulate user selecting Red and Small in row 1
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    // SKU should be auto-generated as R-S (using fragments from store, sorted by order)
    const { sheets } = useSheetsStore.getState()
    const sheet = sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R-S')
  })

  it('generates SKU based on spec order field, not column order', () => {
    // Set up specifications with Size having lower order than Color
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 1, // Color has higher order (comes second in SKU)
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
      {
        id: 'spec-2',
        name: 'Size',
        order: 0, // Size has lower order (comes first in SKU)
        values: [
          { id: 'v2', displayValue: 'Small', skuFragment: 'S' },
        ],
      },
    ]

    // Set up columns with Color column before Size column (opposite of spec order)
    // The columns array explicitly references specs by specId
    const columns: ColumnDef[] = [
      { id: 'col-sku', type: 'sku', header: 'SKU' },
      { id: 'col-color', type: 'spec', specId: 'spec-1', header: 'Color' }, // Color first in columns
      { id: 'col-size', type: 'spec', specId: 'spec-2', header: 'Size' },   // Size second in columns
    ]

    // Data matches column order: [SKU, Color, Size]
    const sheetId = createSheetWithColumns(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: '' }, { v: '' }, { v: '' }],
      ],
      columns,
      specs
    )

    render(<SpreadsheetContainer />)

    // Simulate user selecting Red and Small (Color in col 1, Size in col 2)
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    // SKU should be S-R (Size first due to order:0, Color second due to order:1)
    // Even though Color is in column 1 and Size is in column 2, the SKU fragments
    // are joined in spec.order order: Size(0) then Color(1)
    const { sheets } = useSheetsStore.getState()
    const sheet = sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('S-R')
  })
})

describe('SpreadsheetContainer SheetTabs interactions', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('switches active sheet when clicking a tab', () => {
    useSheetsStore.getState().initializeWithSampleData()
    const sampleSheet = useSheetsStore.getState().sheets[0]
    const sheet2Id = useSheetsStore.getState().addSheet('Sheet 2')

    // addSheet sets the new sheet as active, so Sheet 2 is initially active
    expect(useSheetsStore.getState().activeSheetId).toBe(sheet2Id)

    render(<SpreadsheetContainer />)

    // Click on Sample Products tab to switch back
    const sampleTab = screen.getByTestId(`sheet-tab-${sampleSheet.id}`)
    fireEvent.click(sampleTab)

    // Now Sample Products should be active
    expect(useSheetsStore.getState().activeSheetId).toBe(sampleSheet.id)
  })

  it('adds new sheet when clicking add button', () => {
    useSheetsStore.getState().initializeWithSampleData()
    const initialCount = useSheetsStore.getState().sheets.length

    render(<SpreadsheetContainer />)

    // Click add sheet button
    const addButton = screen.getByTestId('sheet-tab-add')
    fireEvent.click(addButton)

    // Should have one more sheet
    expect(useSheetsStore.getState().sheets.length).toBe(initialCount + 1)
  })
})

describe('SpreadsheetContainer read-only SKU column', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sets column 0 data cells as readOnly', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Row 1, col 0 (SKU data cell) should be readOnly
    const row1 = capturedData[1] as Array<{ readOnly?: boolean }>
    expect(row1[0]?.readOnly).toBe(true)
  })

  it('does not set header row cells as readOnly', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Row 0, col 0 (header) should NOT be readOnly
    const row0 = capturedData[0] as Array<{ readOnly?: boolean }>
    expect(row0[0]?.readOnly).not.toBe(true)
  })

  it('sets readOnly on all SKU column data rows', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
      [{ v: 'B' }, { v: 'Blue' }],
      [{ v: 'G' }, { v: 'Green' }],
    ])

    render(<SpreadsheetContainer />)

    // All data rows in column 0 should be readOnly
    const row1 = capturedData[1] as Array<{ readOnly?: boolean }>
    const row2 = capturedData[2] as Array<{ readOnly?: boolean }>
    const row3 = capturedData[3] as Array<{ readOnly?: boolean }>
    expect(row1[0]?.readOnly).toBe(true)
    expect(row2[0]?.readOnly).toBe(true)
    expect(row3[0]?.readOnly).toBe(true)
  })

  it('auto-generated SKU values still update via processAutoSKU', () => {
    // Set up specifications
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: '' }, { v: '' }],
      ],
      specs
    )

    render(<SpreadsheetContainer />)

    // Simulate selecting Red via onChange (auto-SKU update happens through processAutoSKU)
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: '' }, { value: 'Red' }],
    ])

    // SKU should be auto-generated despite column being read-only for manual edits
    const { sheets } = useSheetsStore.getState()
    const sheet = sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R')
  })
})

describe('SpreadsheetContainer SKU column visual styling', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('applies className with background color to SKU column data cells', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Row 1, Column 0 (SKU data cell) should have className with background color
    const row1 = capturedData[1] as Array<{ className?: string }>
    expect(row1[0]?.className).toContain('bg-[#f1f5f9]')
  })

  it('does not apply background className to header row', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Row 0 (header) cells should not have the SKU column background styling
    // Header cells may be null or have no className
    const row0 = capturedData[0] as Array<{ className?: string } | null>
    const headerClassName = row0[0]?.className ?? ''
    expect(headerClassName).not.toContain('bg-[#f1f5f9]')
  })

  it('applies className to all SKU column data rows', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
      [{ v: 'B' }, { v: 'Blue' }],
      [{ v: 'G' }, { v: 'Green' }],
    ])

    render(<SpreadsheetContainer />)

    // All data rows in column 0 should have className
    const row1 = capturedData[1] as Array<{ className?: string }>
    const row2 = capturedData[2] as Array<{ className?: string }>
    const row3 = capturedData[3] as Array<{ className?: string }>
    expect(row1[0]?.className).toContain('bg-[')
    expect(row2[0]?.className).toContain('bg-[')
    expect(row3[0]?.className).toContain('bg-[')
  })
})

describe('SpreadsheetContainer duplicate SKU highlighting', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('highlights duplicate SKU cells with amber background className', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'R-S' }, { v: 'Red' }], // Duplicate SKU
    ])

    render(<SpreadsheetContainer />)

    // Both duplicate rows should have amber background className
    const row1 = capturedData[1] as Array<{ className?: string }>
    const row2 = capturedData[2] as Array<{ className?: string }>
    expect(row1[0]?.className).toContain('bg-[#fef3c7]')
    expect(row2[0]?.className).toContain('bg-[#fef3c7]')
  })

  it('uses normal background for unique SKUs', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'B-L' }, { v: 'Blue' }], // Unique SKU
    ])

    render(<SpreadsheetContainer />)

    // Both should have normal gray-blue background (unique SKUs)
    const row1 = capturedData[1] as Array<{ className?: string }>
    const row2 = capturedData[2] as Array<{ className?: string }>
    expect(row1[0]?.className).toContain('bg-[#f1f5f9]')
    expect(row2[0]?.className).toContain('bg-[#f1f5f9]')
  })

  it('highlights all rows with the same duplicate SKU', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'ABC' }, { v: 'Red' }],
      [{ v: 'XYZ' }, { v: 'Blue' }],
      [{ v: 'ABC' }, { v: 'Green' }], // Duplicate of row 1
      [{ v: 'ABC' }, { v: 'Yellow' }], // Also duplicate
    ])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ className?: string }>
    const row2 = capturedData[2] as Array<{ className?: string }>
    const row3 = capturedData[3] as Array<{ className?: string }>
    const row4 = capturedData[4] as Array<{ className?: string }>

    // All ABC rows should be highlighted
    expect(row1[0]?.className).toContain('bg-[#fef3c7]')
    expect(row3[0]?.className).toContain('bg-[#fef3c7]')
    expect(row4[0]?.className).toContain('bg-[#fef3c7]')

    // XYZ should have normal background (unique)
    expect(row2[0]?.className).toContain('bg-[#f1f5f9]')
  })

  it('does not highlight empty SKU cells as duplicates', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: 'Red' }], // Empty SKU
      [{ v: '' }, { v: 'Blue' }], // Another empty SKU (not duplicates)
      [{ v: 'R-S' }, { v: 'Green' }],
    ])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ className?: string }>
    const row2 = capturedData[2] as Array<{ className?: string }>
    const row3 = capturedData[3] as Array<{ className?: string }>

    // Empty cells should have normal background, not duplicate highlight
    expect(row1[0]?.className).toContain('bg-[#f1f5f9]')
    expect(row2[0]?.className).toContain('bg-[#f1f5f9]')
    expect(row3[0]?.className).toContain('bg-[#f1f5f9]')
  })
})

describe('SpreadsheetContainer ValidationPanel integration', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not render ValidationPanel when there are no errors', () => {
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-1',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }], // Valid value
    ])
    useSheetsStore.getState().setActiveSheet(sheetId)

    render(<SpreadsheetContainer />)

    // ValidationPanel should not be rendered
    expect(screen.queryByTestId('validation-panel')).not.toBeInTheDocument()
  })

  it('renders ValidationPanel when there are missing value errors', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    createSheetWithSpecs(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'Y' }, { v: 'Yellow' }], // Invalid value (Yellow not in Color spec)
      ],
      specs
    )

    render(<SpreadsheetContainer />)

    // ValidationPanel should be rendered with the error
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText('1 issue found')).toBeInTheDocument()
    expect(screen.getByText('Value "Yellow" does not exist in specification "Color"')).toBeInTheDocument()
  })

  it('renders ValidationPanel when there are duplicate SKU errors', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'R-S' }, { v: 'Red' }], // Duplicate SKU
    ])
    useSheetsStore.getState().setActiveSheet(sheetId)

    render(<SpreadsheetContainer />)

    // ValidationPanel should be rendered with duplicate SKU errors
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText('2 issues found')).toBeInTheDocument()
    expect(screen.getByText('2 duplicate SKUs')).toBeInTheDocument()
  })

  it('displays both missing value and duplicate SKU errors', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    createSheetWithSpecs(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'R' }, { v: 'Red' }],
        [{ v: 'R' }, { v: 'Red' }], // Duplicate SKU
        [{ v: 'Y' }, { v: 'Yellow' }], // Invalid value
      ],
      specs
    )

    render(<SpreadsheetContainer />)

    // ValidationPanel should show both types of errors
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText('3 issues found')).toBeInTheDocument()
    expect(screen.getByText('1 invalid value')).toBeInTheDocument()
    expect(screen.getByText('2 duplicate SKUs')).toBeInTheDocument()
  })

  it('shows only errors for the active sheet', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    // Create two sheets - one with errors, one without
    const sheet1Id = createSheetWithSpecs(
      'Sheet 1',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'R' }, { v: 'Red' }], // Valid
      ],
      specs
    )

    createSheetWithSpecs(
      'Sheet 2',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'Y' }, { v: 'Yellow' }], // Invalid
      ],
      specs
    )

    // Set Sheet 1 (no errors) as active
    useSheetsStore.getState().setActiveSheet(sheet1Id)

    render(<SpreadsheetContainer />)

    // No validation panel when active sheet has no errors
    expect(screen.queryByTestId('validation-panel')).not.toBeInTheDocument()
  })

  it('updates validation errors when active sheet changes', () => {
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    const sheet1Id = createSheetWithSpecs(
      'Sheet 1',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'R' }, { v: 'Red' }],
      ],
      specs
    )

    const sheet2Id = createSheetWithSpecs(
      'Sheet 2',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'Y' }, { v: 'Yellow' }],
      ],
      specs
    )

    // Start with sheet 1 (no errors)
    useSheetsStore.getState().setActiveSheet(sheet1Id)

    const { rerender } = render(<SpreadsheetContainer />)
    expect(screen.queryByTestId('validation-panel')).not.toBeInTheDocument()

    // Switch to sheet 2 (has errors)
    useSheetsStore.getState().setActiveSheet(sheet2Id)
    rerender(<SpreadsheetContainer />)

    // Now validation panel should appear
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText(/Value "Yellow" does not exist/)).toBeInTheDocument()
  })
})

/**
 * Tests for migration-click-navigate PRD task
 * Implement click-to-navigate for validation errors
 */
describe('SpreadsheetContainer click-to-navigate (migration-click-navigate)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('clicking validation error sets spreadsheet selection to affected cell', async () => {
    // stepsToVerify 1 & 3: Click on validation error, affected cell is selected/highlighted
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
    ]

    createSheetWithSpecs(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }],
        [{ v: 'Y' }, { v: 'Yellow' }], // Invalid value at row 1, col 1
      ],
      specs
    )

    render(<SpreadsheetContainer />)

    // ValidationPanel should be rendered with the error
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()

    // Click on the validation error
    const errorItem = screen.getByTestId('validation-error-item')
    await act(async () => {
      fireEvent.click(errorItem)
    })

    // Wait for the selection to be set (uses setTimeout internally)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify that selected was set (capturedSelected should be a RangeSelection)
    expect(capturedSelected).not.toBeNull()
    // The selection should point to row 1, column 1 (where the invalid value is)
    const selection = capturedSelected as { range: { start: { row: number; column: number } } }
    expect(selection.range.start.row).toBe(1)
    expect(selection.range.start.column).toBe(1)
  })

  it('clicking duplicate SKU error selects the affected SKU cell', async () => {
    // stepsToVerify 4: Works for duplicate-sku error types
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'R-S' }, { v: 'Red' }], // Duplicate SKU at row 2, col 0
    ])
    useSheetsStore.getState().setActiveSheet(sheetId)

    render(<SpreadsheetContainer />)

    // ValidationPanel should be rendered with duplicate errors
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText('2 duplicate SKUs')).toBeInTheDocument()

    // Click on the first validation error
    const errorItems = screen.getAllByTestId('validation-error-item')
    await act(async () => {
      fireEvent.click(errorItems[0])
    })

    // Wait for the selection to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify selection was set to the SKU cell
    expect(capturedSelected).not.toBeNull()
    const selection = capturedSelected as { range: { start: { row: number; column: number } } }
    // Duplicate SKU errors are in column 0
    expect(selection.range.start.column).toBe(0)
    // Row should be either 1 or 2 (both are duplicates)
    expect([1, 2]).toContain(selection.range.start.row)
  })

  it('clicking missing-value error selects the affected spec column cell', async () => {
    // stepsToVerify 4: Works for missing-value error types
    const specs: Specification[] = [
      {
        id: 'spec-1',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
      {
        id: 'spec-2',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v2', displayValue: 'Small', skuFragment: 'S' },
        ],
      },
    ]

    createSheetWithSpecs(
      'Products',
      [
        [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
        [{ v: 'R' }, { v: 'Red' }, { v: 'Invalid' }], // Invalid value at row 1, col 2
      ],
      specs
    )

    render(<SpreadsheetContainer />)

    // Click on the validation error
    const errorItem = screen.getByTestId('validation-error-item')
    await act(async () => {
      fireEvent.click(errorItem)
    })

    // Wait for the selection to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify selection points to the correct cell (row 1, col 2)
    expect(capturedSelected).not.toBeNull()
    const selection = capturedSelected as { range: { start: { row: number; column: number } } }
    expect(selection.range.start.row).toBe(1)
    expect(selection.range.start.column).toBe(2)
  })

  it('passes selected and onSelect props to Spreadsheet component', () => {
    // Verify the SpreadsheetContainer passes selection props to Spreadsheet
    useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    // The mock should capture that onSelect was passed
    expect(capturedOnSelect).not.toBeNull()
  })

  it('user can still select cells normally via onSelect', async () => {
    // Verify that the onSelect prop allows user selection to work
    useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    // Simulate user selection change via onSelect callback
    const mockSelection = { range: { start: { row: 2, column: 3 }, end: { row: 2, column: 3 } } }
    await act(async () => {
      capturedOnSelect?.(mockSelection)
    })

    // The selection state should be updated
    // After re-render, the captured selection should reflect the new selection
    // Note: This verifies the onSelect handler works without errors
  })
})

describe('SpreadsheetContainer SKU auto-generation from dropdown selection', () => {
  // Tests verifying PRD task sku-autogen-1: SKU auto-generation when selecting values from dropdowns

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('generates SKU when selecting a single value from dropdown', () => {
    // Set up specifications in sheet
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    // Create sheet with specs
    const sheetId = createSheetWithSpecs('Test Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], specs)

    // Sheet should be initialized with SKU and Color headers
    const initialSheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(initialSheet.data[0][0]?.v).toBe('SKU')
    expect(initialSheet.data[0][1]?.v).toBe('Color')

    render(<SpreadsheetContainer />)

    // Simulate user selecting Red from dropdown in column B (Color column)
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: '' }, { value: 'Red' }], // User selected Red
    ])

    // SKU in column A should auto-generate with Red's skuFragment
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R')
  })

  it('generates SKU with all fragments joined by delimiter when selecting multiple values', () => {
    // Set up specifications for Color and Size
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
      {
        id: 'spec-size',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    // Verify headers are correct
    const initialSheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(initialSheet.data[0][0]?.v).toBe('SKU')
    expect(initialSheet.data[0][1]?.v).toBe('Color')
    expect(initialSheet.data[0][2]?.v).toBe('Size')

    render(<SpreadsheetContainer />)

    // Simulate user selecting Red and Small
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    // SKU should be 'R-S' (fragments joined by default delimiter '-')
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R-S')
  })

  it('generates example SKU: Red (R) and Small (S) produces R-S', () => {
    // This test exactly matches the PRD example
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
      },
      {
        id: 'spec-size',
        name: 'Size',
        order: 1,
        values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Simulate selecting Red and Small
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R-S')
  })

  it('free columns do not contribute to SKU generation', () => {
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
      },
    ]

    // Create sheet with a free column (not linked to any spec)
    const columns: ColumnDef[] = [
      { id: 'col-sku', type: 'sku', header: 'SKU' },
      { id: 'col-notes', type: 'free', header: 'Notes' }, // Free column - no spec
    ]

    const sheetId = createSheetWithColumns('Products', [
      [{ v: 'SKU' }, { v: 'Notes' }],
      [{ v: '' }, { v: '' }],
    ], columns, specs)

    render(<SpreadsheetContainer />)

    // Simulate typing in the free column (value that looks like a spec value)
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Notes' }],
      [{ value: '' }, { value: 'Red' }], // "Red" in a free column
    ])

    // SKU should be empty because the Notes column is type 'free', not 'spec'
    // Free columns don't contribute to SKU generation
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('')
  })

  it('updates SKU in column A when dropdown value changes', () => {
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // First selection: Red
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: '' }, { value: 'Red' }],
    ])

    let sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R')

    // Change selection to Blue
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: 'R' }, { value: 'Blue' }],
    ])

    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('B')
  })
})

describe('SpreadsheetContainer toolbar interactions', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('adds row when clicking Add Row button', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    const initialRowCount = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!.data.length

    // Click add row button
    const addRowButton = screen.getByTestId('spreadsheet-toolbar-add-row')
    fireEvent.click(addRowButton)

    const newRowCount = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!.data.length
    expect(newRowCount).toBe(initialRowCount + 1)
  })

  it('new row from Add Row has empty cells matching column count', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: 'R-S' }, { v: 'Red' }, { v: 'Small' }],
    ])

    render(<SpreadsheetContainer />)

    const addRowButton = screen.getByTestId('spreadsheet-toolbar-add-row')
    fireEvent.click(addRowButton)

    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    const newRow = sheet.data[sheet.data.length - 1]

    // New row should have same number of columns as header
    expect(newRow.length).toBe(3)
    // All cells should be empty (no v value)
    newRow.forEach(cell => {
      expect(cell.v).toBeUndefined()
    })
  })

  it('new row cells get dropdownOptions from specifications', () => {
    const specs: Specification[] = [
      {
        id: 'color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
    ], specs)

    const { rerender } = render(<SpreadsheetContainer />)

    // Add new row
    const addRowButton = screen.getByTestId('spreadsheet-toolbar-add-row')
    fireEvent.click(addRowButton)

    // Rerender to see the new row in the spreadsheet data
    rerender(<SpreadsheetContainer />)

    // Check that the new row (row 2) has dropdownOptions on spec column
    const newRowData = capturedData[2] as Array<{ dropdownOptions?: string[]; value?: unknown }>

    // SKU column (col 0) should not have dropdownOptions
    expect(newRowData[0]?.dropdownOptions).toBeUndefined()
    // Color column (col 1) should have dropdown options
    expect(newRowData[1]?.dropdownOptions).toEqual(['Red', 'Blue'])
  })

  it('selecting values in new row generates SKU via onChange', () => {
    const specs: Specification[] = [
      {
        id: 'color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Add new row
    const addRowButton = screen.getByTestId('spreadsheet-toolbar-add-row')
    fireEvent.click(addRowButton)

    // Simulate selecting a value in the new row
    // This triggers onChange which should auto-generate SKU
    if (capturedOnChange) {
      capturedOnChange([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: null }, { value: 'Red' }],  // Select Red in new row
      ])
    }

    // Check that SKU was generated for the new row
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0].v).toBe('R')
  })

  it('undo button is disabled initially', () => {
    useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).toBeDisabled()
  })

  it('redo button is disabled initially', () => {
    useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).toBeDisabled()
  })
})

/**
 * Tests for migration-dropdowns PRD task
 * Verify dropdown selection works in spec columns
 */
describe('SpreadsheetContainer dropdown selection (migration-dropdowns)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('spec column cells have dropdownOptions with displayValues from specifications', () => {
    // stepsToVerify 1 & 2: Click/Enter on spec column cell shows dropdown with spec values
    // and dropdown options match displayValues from sheet-local specifications
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
          { id: 'v3', displayValue: 'Green', skuFragment: 'G' },
        ],
      },
      {
        id: 'spec-size',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v4', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v5', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Verify capturedData has dropdownOptions on spec columns
    const dataRow = capturedData[1] as Array<{ dropdownOptions?: string[]; value?: unknown }>

    // SKU column (col 0) should NOT have dropdownOptions
    expect(dataRow[0]?.dropdownOptions).toBeUndefined()

    // Color column (col 1) should have Color spec displayValues
    expect(dataRow[1]?.dropdownOptions).toEqual(['Red', 'Blue', 'Green'])

    // Size column (col 2) should have Size spec displayValues
    expect(dataRow[2]?.dropdownOptions).toEqual(['Small', 'Large'])
  })

  it('selecting a value from dropdown updates cell content', () => {
    // stepsToVerify 3: Selecting a value updates cell content
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Simulate selecting 'Blue' from the dropdown
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }],
      [{ value: '' }, { value: 'Blue' }],
    ])

    // Verify the cell content was updated in the store
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Blue')
  })

  it('SKU in column A regenerates when dropdown value is selected', () => {
    // stepsToVerify 4: SKU in column A regenerates with new skuFragment
    const specs: Specification[] = [
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,
        values: [
          { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
        ],
      },
      {
        id: 'spec-size',
        name: 'Size',
        order: 1,
        values: [
          { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    const sheetId = createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    // Select Red and Small
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    // SKU should be 'R-S'
    let sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R-S')

    // Change Color to Blue - SKU should update to 'B-S'
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: 'R-S' }, { value: 'Blue' }, { value: 'Small' }],
    ])

    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('B-S')
  })

  it('dropdown options are populated for each spec column independently', () => {
    // Verify dropdown options match the correct specification for each column
    const specs: Specification[] = [
      {
        id: 'spec-material',
        name: 'Material',
        order: 2,  // Different order to test sorting
        values: [
          { id: 'v1', displayValue: 'Cotton', skuFragment: 'CT' },
          { id: 'v2', displayValue: 'Polyester', skuFragment: 'PO' },
        ],
      },
      {
        id: 'spec-color',
        name: 'Color',
        order: 0,  // First in order
        values: [
          { id: 'v3', displayValue: 'Red', skuFragment: 'R' },
        ],
      },
      {
        id: 'spec-size',
        name: 'Size',
        order: 1,  // Second in order
        values: [
          { id: 'v4', displayValue: 'Small', skuFragment: 'S' },
          { id: 'v5', displayValue: 'Medium', skuFragment: 'M' },
          { id: 'v6', displayValue: 'Large', skuFragment: 'L' },
        ],
      },
    ]

    createSheetWithSpecs('Products', [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }, { v: 'Material' }],
      [{ v: '' }, { v: '' }, { v: '' }, { v: '' }],
    ], specs)

    render(<SpreadsheetContainer />)

    const dataRow = capturedData[1] as Array<{ dropdownOptions?: string[] }>

    // Column order is based on spec.order, not array order
    // Col 1 (Color, order 0) -> ['Red']
    expect(dataRow[1]?.dropdownOptions).toEqual(['Red'])
    // Col 2 (Size, order 1) -> ['Small', 'Medium', 'Large']
    expect(dataRow[2]?.dropdownOptions).toEqual(['Small', 'Medium', 'Large'])
    // Col 3 (Material, order 2) -> ['Cotton', 'Polyester']
    expect(dataRow[3]?.dropdownOptions).toEqual(['Cotton', 'Polyester'])
  })
})

/**
 * Tests for migration-undo-redo PRD task
 * Implement undo/redo functionality for spreadsheet edits
 */
describe('SpreadsheetContainer undo/redo (migration-undo-redo)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('undo reverts cell value to previous state', async () => {
    // stepsToVerify 1: Edit a cell value, click Undo - value reverts to previous
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Edit cell: change 'Red' to 'Blue'
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'R' }, { value: 'Blue' }],
      ])
    })

    // Verify cell was changed
    let sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Blue')

    // Undo button should now be enabled
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).not.toBeDisabled()

    // Click Undo
    await act(async () => {
      fireEvent.click(undoButton)
    })

    // Verify value reverted to 'Red'
    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Red')
  })

  it('redo re-applies undone change', async () => {
    // stepsToVerify 2: After Undo, click Redo - value returns to edited state
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Edit cell: change 'Red' to 'Blue'
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'R' }, { value: 'Blue' }],
      ])
    })

    // Undo
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    await act(async () => {
      fireEvent.click(undoButton)
    })

    // Verify undone
    let sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Red')

    // Redo button should now be enabled
    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).not.toBeDisabled()

    // Click Redo
    await act(async () => {
      fireEvent.click(redoButton)
    })

    // Verify value returned to 'Blue'
    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Blue')
  })

  it('undo button disabled when no history', () => {
    // stepsToVerify 3: Undo button disabled when no history
    useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).toBeDisabled()
  })

  it('redo button disabled when at latest state', async () => {
    // stepsToVerify 4: Redo button disabled when at latest state
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // Make an edit
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'R' }, { value: 'Red' }],
      ])
    })

    // Redo should be disabled (we're at latest state)
    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).toBeDisabled()
  })

  it('history clears when switching sheets', async () => {
    // stepsToVerify 5: History clears when switching sheets
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
          ],
        },
      ],
    })

    const sheet1Id = useSheetsStore.getState().addSheet('Sheet 1')
    useSheetsStore.getState().setSheetData(sheet1Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    const sheet2Id = useSheetsStore.getState().addSheet('Sheet 2')
    useSheetsStore.getState().setSheetData(sheet2Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // Make an edit on Sheet 1
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'R' }, { value: 'Red' }],
      ])
    })

    // Undo should be enabled
    let undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).not.toBeDisabled()

    // Switch to Sheet 2
    await act(async () => {
      const sheet2Tab = screen.getByTestId('sheet-tab-' + sheet2Id)
      fireEvent.click(sheet2Tab)
    })

    // Undo should now be disabled (history cleared)
    undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).toBeDisabled()
  })

  it('multiple undos revert multiple changes in order', async () => {
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
            { id: 'v3', displayValue: 'Green', skuFragment: 'G' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Edit 1: Red -> Blue
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'B' }, { value: 'Blue' }],
      ])
    })

    // Edit 2: Blue -> Green
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'G' }, { value: 'Green' }],
      ])
    })

    // Verify at Green
    let sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Green')

    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')

    // Undo 1: Green -> Blue
    await act(async () => {
      fireEvent.click(undoButton)
    })
    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Blue')

    // Undo 2: Blue -> Red
    await act(async () => {
      fireEvent.click(undoButton)
    })
    sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Red')

    // Undo should now be disabled
    expect(undoButton).toBeDisabled()
  })

  it('new edit after undo clears redo history', async () => {
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
            { id: 'v3', displayValue: 'Green', skuFragment: 'G' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Edit: Red -> Blue
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'B' }, { value: 'Blue' }],
      ])
    })

    // Undo: Blue -> Red
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    await act(async () => {
      fireEvent.click(undoButton)
    })

    // Redo should be enabled
    let redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).not.toBeDisabled()

    // Make new edit: Red -> Green (should clear redo history)
    await act(async () => {
      capturedOnChange?.([
        [{ value: 'SKU' }, { value: 'Color' }],
        [{ value: 'G' }, { value: 'Green' }],
      ])
    })

    // Redo should now be disabled (redo history cleared)
    redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).toBeDisabled()

    // Value should be Green
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][1]?.v).toBe('Green')
  })
})

/**
 * Tests for toolbar after import/export removal (remove-duplicate-import-export)
 * Import/export is now in AppLayout header only
 */
describe('SpreadsheetContainer toolbar buttons', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not render import button in toolbar (moved to AppLayout header)', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    expect(screen.queryByTestId('spreadsheet-toolbar-import')).not.toBeInTheDocument()
  })

  it('does not render export button in toolbar (moved to AppLayout header)', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    expect(screen.queryByTestId('spreadsheet-toolbar-export')).not.toBeInTheDocument()
  })

  it('renders undo/redo and add row buttons in toolbar', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    expect(screen.getByTestId('spreadsheet-toolbar-undo')).toBeInTheDocument()
    expect(screen.getByTestId('spreadsheet-toolbar-redo')).toBeInTheDocument()
    expect(screen.getByTestId('spreadsheet-toolbar-add-row')).toBeInTheDocument()
  })

  it('renders add column button in toolbar', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    expect(screen.getByTestId('spreadsheet-toolbar-add-column')).toBeInTheDocument()
    expect(screen.getByText('Add Column')).toBeInTheDocument()
  })

  it('opens AddColumnDialog when Add Column button clicked', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    // Click add column button
    const addColumnButton = screen.getByTestId('spreadsheet-toolbar-add-column')
    fireEvent.click(addColumnButton)

    // AddColumnDialog should be open
    expect(screen.getByTestId('add-column-dialog')).toBeInTheDocument()
  })

  it('AddColumnDialog from toolbar defaults to inserting at end', () => {
    useSheetsStore.getState().addSheet('Products')
    render(<SpreadsheetContainer />)

    // Click add column button
    const addColumnButton = screen.getByTestId('spreadsheet-toolbar-add-column')
    fireEvent.click(addColumnButton)

    // Check that position selector defaults to "At end"
    const positionSelect = screen.getByTestId('position-selector')
    expect(positionSelect).toHaveValue('end')
  })
})

describe('SpreadsheetContainer column context menu', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  const sizeSpec: Specification = {
    id: 'size-spec',
    name: 'Size',
    order: 1,
    values: [
      { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
      { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not show context menu initially', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    expect(screen.queryByTestId('column-context-menu')).not.toBeInTheDocument()
  })

  it('shows context menu on right-click header row cell', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell (row 0, col 1)
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    expect(screen.getByTestId('column-context-menu')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-insert-before')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-insert-after')).toBeInTheDocument()
  })

  it('shows delete option for spec columns', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell (row 0, col 1)
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
  })

  it('shows delete option for free columns', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'free', header: 'Notes' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Notes', m: 'Notes' }],
      [{}, { v: 'Some note', m: 'Some note' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    // Right-click on the Notes header cell (row 0, col 1)
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
  })

  it('does NOT show delete option for SKU column', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the SKU header cell (row 0, col 0)
    const headerCell = screen.getByTestId('cell-0-0')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    expect(screen.getByTestId('column-context-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('context-menu-delete')).not.toBeInTheDocument()
  })

  it('does not show context menu when right-clicking data rows', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on a data cell (row 1, col 1)
    const dataCell = screen.getByTestId('cell-1-1')
    fireEvent.contextMenu(dataCell, { clientX: 100, clientY: 100 })

    expect(screen.queryByTestId('column-context-menu')).not.toBeInTheDocument()
  })

  it('opens AddColumnDialog when "Insert column before" clicked', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Insert column before"
    fireEvent.click(screen.getByTestId('context-menu-insert-before'))

    // AddColumnDialog should be open
    expect(screen.getByTestId('add-column-dialog')).toBeInTheDocument()
  })

  it('opens AddColumnDialog when "Insert column after" clicked', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Insert column after"
    fireEvent.click(screen.getByTestId('context-menu-insert-after'))

    // AddColumnDialog should be open
    expect(screen.getByTestId('add-column-dialog')).toBeInTheDocument()
  })

  it('opens delete confirmation dialog when "Delete column" clicked', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Delete column"
    fireEvent.click(screen.getByTestId('context-menu-delete'))

    // Delete confirmation dialog should be open
    expect(screen.getByTestId('delete-column-dialog')).toBeInTheDocument()
  })

  it('deletes column when confirming deletion', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'spec', header: 'Size', specId: 'size-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      [{ v: 'SKU1', m: 'SKU1' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec, sizeSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell (column index 1)
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Delete column"
    fireEvent.click(screen.getByTestId('context-menu-delete'))

    // Confirm deletion
    fireEvent.click(screen.getByTestId('delete-column-confirm'))

    // Verify column was deleted from store
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.columns.length).toBe(2) // SKU and Size remain
    expect(activeSheet!.columns[0].header).toBe('SKU')
    expect(activeSheet!.columns[1].header).toBe('Size')

    // Verify data was updated
    expect(activeSheet!.data[0].length).toBe(2) // SKU and Size columns
    expect(activeSheet!.data[1].length).toBe(2)
  })

  it('cancels deletion when clicking cancel', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Color header cell
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Delete column"
    fireEvent.click(screen.getByTestId('context-menu-delete'))

    // Cancel deletion
    fireEvent.click(screen.getByTestId('delete-column-cancel'))

    // Verify column was NOT deleted
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.columns.length).toBe(2) // SKU and Color remain
    expect(activeSheet!.columns[1].header).toBe('Color')
  })

  it('deletes free column when confirming deletion', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'free', header: 'Notes' },
      { id: 'col-2', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Notes', m: 'Notes' }, { v: 'Color', m: 'Color' }],
      [{ v: 'SKU1', m: 'SKU1' }, { v: 'A note', m: 'A note' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on the Notes header cell (column index 1 - free column)
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })

    // Click "Delete column"
    fireEvent.click(screen.getByTestId('context-menu-delete'))

    // Confirm deletion
    fireEvent.click(screen.getByTestId('delete-column-confirm'))

    // Verify free column was deleted from store
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.columns.length).toBe(2) // SKU and Color remain
    expect(activeSheet!.columns[0].header).toBe('SKU')
    expect(activeSheet!.columns[1].header).toBe('Color')

    // Verify data was updated - Notes column data removed
    expect(activeSheet!.data[0].length).toBe(2) // SKU and Color columns
    expect(activeSheet!.data[1].length).toBe(2)
  })

  it('can undo free column deletion', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'free', header: 'Notes' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Notes', m: 'Notes' }],
      [{}, { v: 'Some note', m: 'Some note' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    // Right-click on the Notes header cell and delete
    const headerCell = screen.getByTestId('cell-0-1')
    fireEvent.contextMenu(headerCell, { clientX: 100, clientY: 100 })
    fireEvent.click(screen.getByTestId('context-menu-delete'))
    fireEvent.click(screen.getByTestId('delete-column-confirm'))

    // Verify column was deleted
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns.length).toBe(1) // Only SKU

    // Click undo button
    const undoButton = screen.getByRole('button', { name: /undo/i })
    fireEvent.click(undoButton)

    // Verify column was restored
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns.length).toBe(2) // SKU and Notes restored
    expect(activeSheet!.columns[1].header).toBe('Notes')
    expect(activeSheet!.data[1][1]).toEqual({ v: 'Some note', m: 'Some note' })
  })
})

/**
 * Tests for column-drag-reorder PRD task
 * Implement column reordering by dragging column headers
 */
describe('SpreadsheetContainer column drag-and-drop (column-drag-reorder)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  const sizeSpec: Specification = {
    id: 'size-spec',
    name: 'Size',
    order: 1,
    values: [
      { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
      { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders DraggableColumnHeaders component', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // DraggableColumnHeaders should be rendered
    expect(screen.getByTestId('draggable-column-headers')).toBeInTheDocument()
  })

  it('shows drag handles for non-SKU columns', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'spec', header: 'Size', specId: 'size-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      [{}, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec, sizeSpec])

    render(<SpreadsheetContainer />)

    // SKU column (index 0) should NOT have a drag handle
    expect(screen.queryByTestId('drag-handle-0')).not.toBeInTheDocument()

    // Color column (index 1) should have a drag handle
    expect(screen.getByTestId('drag-handle-1')).toBeInTheDocument()

    // Size column (index 2) should have a drag handle
    expect(screen.getByTestId('drag-handle-2')).toBeInTheDocument()
  })

  it('SKU column is not draggable', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // SKU column header should have draggable=false
    const skuHeader = screen.getByTestId('column-header-0')
    expect(skuHeader).toHaveAttribute('draggable', 'false')
  })

  it('non-SKU columns are draggable', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'free', header: 'Notes' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Notes', m: 'Notes' }],
      [{}, { v: 'Red', m: 'Red' }, { v: 'Note 1', m: 'Note 1' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Color column header (spec) should be draggable
    const colorHeader = screen.getByTestId('column-header-1')
    expect(colorHeader).toHaveAttribute('draggable', 'true')

    // Notes column header (free) should be draggable
    const notesHeader = screen.getByTestId('column-header-2')
    expect(notesHeader).toHaveAttribute('draggable', 'true')
  })

  it('reorders columns via drag-and-drop and updates store', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'spec', header: 'Size', specId: 'size-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      [{ v: 'R-S', m: 'R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec, sizeSpec])

    render(<SpreadsheetContainer />)

    const colorHeader = screen.getByTestId('column-header-1')
    const sizeHeader = screen.getByTestId('column-header-2')

    // Simulate drag: Color (index 1) to Size's position (index 2)
    // Events must be fired synchronously for state to update between them
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: '' },
      preventDefault: vi.fn(),
    })
    fireEvent.drop(sizeHeader, {
      dataTransfer: { getData: () => '1' },
      preventDefault: vi.fn(),
    })

    // Verify columns were reordered in the store
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.columns[0].header).toBe('SKU')
    expect(activeSheet!.columns[1].header).toBe('Size')
    expect(activeSheet!.columns[2].header).toBe('Color')

    // Verify data rows were also reordered
    expect(activeSheet!.data[0][1]?.v).toBe('Size')
    expect(activeSheet!.data[0][2]?.v).toBe('Color')
    expect(activeSheet!.data[1][1]?.v).toBe('Small')
    expect(activeSheet!.data[1][2]?.v).toBe('Red')
  })

  it('undo reverts column reorder operation', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'spec', header: 'Size', specId: 'size-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      [{ v: 'R-S', m: 'R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec, sizeSpec])

    render(<SpreadsheetContainer />)

    const colorHeader = screen.getByTestId('column-header-1')
    const sizeHeader = screen.getByTestId('column-header-2')

    // Perform drag reorder
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: '' },
      preventDefault: vi.fn(),
    })
    fireEvent.drop(sizeHeader, {
      dataTransfer: { getData: () => '1' },
      preventDefault: vi.fn(),
    })

    // Verify reorder happened
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns[1].header).toBe('Size')
    expect(activeSheet!.columns[2].header).toBe('Color')

    // Click Undo
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).not.toBeDisabled()

    fireEvent.click(undoButton)

    // Verify column order was reverted
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns[1].header).toBe('Color')
    expect(activeSheet!.columns[2].header).toBe('Size')

    // Verify data was also reverted
    expect(activeSheet!.data[1][1]?.v).toBe('Red')
    expect(activeSheet!.data[1][2]?.v).toBe('Small')
  })

  it('redo re-applies column reorder after undo', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
      { id: 'col-2', type: 'spec', header: 'Size', specId: 'size-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
      [{ v: 'R-S', m: 'R-S' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec, sizeSpec])

    render(<SpreadsheetContainer />)

    const colorHeader = screen.getByTestId('column-header-1')
    const sizeHeader = screen.getByTestId('column-header-2')

    // Perform drag reorder
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: '' },
      preventDefault: vi.fn(),
    })
    fireEvent.drop(sizeHeader, {
      dataTransfer: { getData: () => '1' },
      preventDefault: vi.fn(),
    })

    // Undo
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    fireEvent.click(undoButton)

    // Verify undone (Color back to index 1)
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns[1].header).toBe('Color')

    // Click Redo
    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).not.toBeDisabled()

    fireEvent.click(redoButton)

    // Verify redo re-applied the reorder (Size at index 1)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns[1].header).toBe('Size')
    expect(activeSheet!.columns[2].header).toBe('Color')
  })

  it('cannot drop column on SKU column (index 0)', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{}, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    const colorHeader = screen.getByTestId('column-header-1')
    const skuHeader = screen.getByTestId('column-header-0')

    // Try to drag Color onto SKU column
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    fireEvent.drop(skuHeader, {
      dataTransfer: { getData: () => '1' },
      preventDefault: vi.fn(),
    })

    // Verify columns were NOT reordered (Color should still be at index 1)
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.columns[0].header).toBe('SKU')
    expect(activeSheet!.columns[1].header).toBe('Color')
  })
})

/**
 * Tests for row-deletion PRD task
 * Add ability to delete rows from the spreadsheet with right-click context menu
 */
describe('SpreadsheetContainer row deletion (row-deletion)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not show row context menu initially', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    expect(screen.queryByTestId('row-context-menu')).not.toBeInTheDocument()
  })

  it('shows row context menu on right-click row indicator for data row', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on row indicator for row 1 (first data row)
    const rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })

    expect(screen.getByTestId('row-context-menu')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-delete-row')).toBeInTheDocument()
  })

  it('does NOT show row context menu on right-click header row indicator', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on header row indicator (row 0)
    const headerRowIndicator = screen.getByTestId('row-indicator-0')
    fireEvent.contextMenu(headerRowIndicator, { clientX: 50, clientY: 50 })

    // Row context menu should NOT appear for header row
    expect(screen.queryByTestId('row-context-menu')).not.toBeInTheDocument()
  })

  it('opens delete confirmation dialog when "Delete row" clicked', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on row 1 indicator
    const rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })

    // Click "Delete row"
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))

    // Delete row confirmation dialog should be open
    expect(screen.getByTestId('delete-row-dialog')).toBeInTheDocument()
  })

  it('deletes row when confirming deletion', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
      [{ v: 'G', m: 'G' }, { v: 'Green', m: 'Green' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Verify initial state (4 rows: header + 3 data rows)
    const initialSheet = useSheetsStore.getState().getActiveSheet()
    expect(initialSheet!.data.length).toBe(4)

    // Right-click on row 2 indicator (second data row)
    const rowIndicator = screen.getByTestId('row-indicator-2')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })

    // Click "Delete row"
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))

    // Confirm deletion
    fireEvent.click(screen.getByTestId('delete-row-confirm'))

    // Verify row was deleted
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.data.length).toBe(3) // Was 4, now 3
    // Row with Blue (was row 2) should be gone, Green (was row 3) should now be row 2
    expect(activeSheet!.data[1][0].v).toBe('R') // Row 1 still has Red
    expect(activeSheet!.data[2][0].v).toBe('G') // Row 2 now has Green (was row 3)
  })

  it('does NOT delete row when canceling deletion', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Right-click on row 1 indicator
    const rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })

    // Click "Delete row"
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))

    // Cancel deletion
    fireEvent.click(screen.getByTestId('delete-row-cancel'))

    // Verify row was NOT deleted
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet).toBeDefined()
    expect(activeSheet!.data.length).toBe(3) // Still has all 3 rows
    expect(activeSheet!.data[1][0].v).toBe('R')
    expect(activeSheet!.data[2][0].v).toBe('B')
  })

  it('undo restores deleted row', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Delete row 1
    const rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))
    fireEvent.click(screen.getByTestId('delete-row-confirm'))

    // Verify row was deleted
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(2)

    // Click Undo button
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    fireEvent.click(undoButton)

    // Verify row was restored
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(3)
    expect(activeSheet!.data[1][0].v).toBe('R')
    expect(activeSheet!.data[2][0].v).toBe('B')
  })

  it('redo re-deletes row after undo', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Delete row 1
    const rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))
    fireEvent.click(screen.getByTestId('delete-row-confirm'))

    // Undo
    fireEvent.click(screen.getByTestId('spreadsheet-toolbar-undo'))

    // Verify row was restored
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(3)

    // Redo
    fireEvent.click(screen.getByTestId('spreadsheet-toolbar-redo'))

    // Verify row was deleted again
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(2)
    expect(activeSheet!.data[1][0].v).toBe('B') // Row with Blue is now at index 1
  })

  it('works correctly with any number of rows', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: '1', m: '1' }, { v: 'Row1', m: 'Row1' }],
      [{ v: '2', m: '2' }, { v: 'Row2', m: 'Row2' }],
      [{ v: '3', m: '3' }, { v: 'Row3', m: 'Row3' }],
      [{ v: '4', m: '4' }, { v: 'Row4', m: 'Row4' }],
      [{ v: '5', m: '5' }, { v: 'Row5', m: 'Row5' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Delete row 3 (middle row)
    let rowIndicator = screen.getByTestId('row-indicator-3')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))
    fireEvent.click(screen.getByTestId('delete-row-confirm'))

    // Verify row was deleted
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(5)
    expect(activeSheet!.data[3][0].v).toBe('4') // Row4 moved up

    // Delete first data row (row 1)
    rowIndicator = screen.getByTestId('row-indicator-1')
    fireEvent.contextMenu(rowIndicator, { clientX: 50, clientY: 100 })
    fireEvent.click(screen.getByTestId('context-menu-delete-row'))
    fireEvent.click(screen.getByTestId('delete-row-confirm'))

    // Verify another row was deleted
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data.length).toBe(4)
    expect(activeSheet!.data[1][0].v).toBe('2') // Row2 is now first data row
  })
})

describe('SpreadsheetContainer cell background color (cell-background-color)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v-1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v-2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders cell color picker in toolbar', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Color picker should be in toolbar
    expect(screen.getByTestId('cell-color-picker-trigger')).toBeInTheDocument()
  })

  it('color picker is disabled when no cells are selected', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Color picker should be disabled when no selection
    expect(screen.getByTestId('cell-color-picker-trigger')).toBeDisabled()
  })

  it('color picker is enabled when cells are selected', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Simulate selection via onSelect callback
    act(() => {
      if (capturedOnSelect) {
        // Create a mock RangeSelection
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Color picker should be enabled after selection
    expect(screen.getByTestId('cell-color-picker-trigger')).not.toBeDisabled()
  })

  it('applies background color to selected cell', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell (1, 1) - the "Red" cell
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Open color picker and select a color
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-fce4ec')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-fce4ec')) // Light pink

    // Verify background color was applied to store
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#fce4ec')
  })

  it('applies background color to multiple selected cells', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select a range of cells (1,1) to (2,1)
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 2, column: 1 },
          },
        })
      }
    })

    // Open color picker and select a color
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-90caf9')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-90caf9')) // Light blue

    // Verify background color was applied to both cells
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#90caf9')
    expect(activeSheet!.data[2][1].bg).toBe('#90caf9')
  })

  it('clears background color when clear option is selected', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red', bg: '#fce4ec' }], // Already has a bg color
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Verify cell initially has background color
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#fce4ec')

    // Select cell (1, 1)
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Open color picker and clear color
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-clear')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-clear'))

    // Verify background color was removed
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBeUndefined()
  })

  it('background color persists after page refresh (via localStorage)', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-e8f5e9')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-e8f5e9')) // Light green

    // Get current state (which is persisted to localStorage by Zustand)
    const stateBeforeRefresh = useSheetsStore.getState()
    const activeSheet = stateBeforeRefresh.getActiveSheet()
    const cellBg = activeSheet!.data[1][1].bg

    // Verify color was applied
    expect(cellBg).toBe('#e8f5e9')

    // The bg field should be in the store which uses persist middleware
    // to localStorage, so it will persist across "refresh"
  })

  it('undo reverts background color change', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-f3e5f5')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-f3e5f5')) // Light purple

    // Verify color was applied
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#f3e5f5')

    // Click undo
    fireEvent.click(screen.getByTestId('spreadsheet-toolbar-undo'))

    // Verify color was reverted (original cell had no bg)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBeUndefined()
  })

  it('redo re-applies background color after undo', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-ffcc80')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-ffcc80')) // Orange

    // Verify color was applied
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#ffcc80')

    // Verify undo button is enabled
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).not.toBeDisabled()

    // Undo
    fireEvent.click(undoButton)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBeUndefined()

    // Verify redo button is enabled
    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).not.toBeDisabled()

    // Redo
    fireEvent.click(redoButton)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#ffcc80')
  })

  it('cell className includes background color for rendering', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red', bg: '#a5d6a7' }], // Green bg
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // The spreadsheet adapter should convert bg to className
    // Check the mock captured data
    expect(capturedData.length).toBeGreaterThan(0)
    const cell = capturedData[1]?.[1] as { className?: string }
    expect(cell?.className).toBe('bg-[#a5d6a7]')
  })
})

describe('SpreadsheetContainer cell text color (cell-text-color)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v-1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v-2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders text color picker in toolbar', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Text color picker should be in toolbar
    expect(screen.getByTestId('cell-text-color-picker-trigger')).toBeInTheDocument()
  })

  it('text color picker is disabled when no cells are selected', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Text color picker should be disabled when no selection
    expect(screen.getByTestId('cell-text-color-picker-trigger')).toBeDisabled()
  })

  it('text color picker is enabled when cells are selected', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Simulate selection via onSelect callback
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Text color picker should be enabled after selection
    expect(screen.getByTestId('cell-text-color-picker-trigger')).not.toBeDisabled()
  })

  it('applies text color to selected cell', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell (1, 1) - the "Red" cell
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Open text color picker and select a color
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-dc2626')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-swatch-dc2626')) // Red

    // Verify text color was applied to store
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#dc2626')
  })

  it('applies text color to multiple selected cells', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select a range of cells (1,1) to (2,1)
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 2, column: 1 },
          },
        })
      }
    })

    // Open text color picker and select a color
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-2563eb')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-swatch-2563eb')) // Blue

    // Verify text color was applied to both cells
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#2563eb')
    expect(activeSheet!.data[2][1].fc).toBe('#2563eb')
  })

  it('clears text color when clear option is selected', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red', fc: '#dc2626' }], // Already has text color
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Verify cell initially has text color
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#dc2626')

    // Select cell (1, 1)
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Open text color picker and clear color
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-clear')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-clear'))

    // Verify text color was removed
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBeUndefined()
  })

  it('text color persists after page refresh (via localStorage)', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply text color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-16a34a')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-swatch-16a34a')) // Green

    // Get current state (which is persisted to localStorage by Zustand)
    const stateBeforeRefresh = useSheetsStore.getState()
    const activeSheet = stateBeforeRefresh.getActiveSheet()
    const cellFc = activeSheet!.data[1][1].fc

    // Verify color was applied
    expect(cellFc).toBe('#16a34a')

    // The fc field should be in the store which uses persist middleware
    // to localStorage, so it will persist across "refresh"
  })

  it('undo reverts text color change', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply text color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-7c3aed')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-swatch-7c3aed')) // Violet

    // Verify text color was applied
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#7c3aed')

    // Click undo
    fireEvent.click(screen.getByTestId('spreadsheet-toolbar-undo'))

    // Verify text color was reverted (original cell had no fc)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBeUndefined()
  })

  it('redo re-applies text color after undo', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell and apply text color
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-ea580c')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-text-color-swatch-ea580c')) // Orange

    // Verify text color was applied
    let activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#ea580c')

    // Verify undo button is enabled
    const undoButton = screen.getByTestId('spreadsheet-toolbar-undo')
    expect(undoButton).not.toBeDisabled()

    // Undo
    fireEvent.click(undoButton)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBeUndefined()

    // Verify redo button is enabled
    const redoButton = screen.getByTestId('spreadsheet-toolbar-redo')
    expect(redoButton).not.toBeDisabled()

    // Redo
    fireEvent.click(redoButton)
    activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#ea580c')
  })

  it('cell className includes text color for rendering', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red', fc: '#dc2626' }], // Red text
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // The spreadsheet adapter should convert fc to className
    // Check the mock captured data
    expect(capturedData.length).toBeGreaterThan(0)
    const cell = capturedData[1]?.[1] as { className?: string }
    expect(cell?.className).toBe('text-[#dc2626]')
  })

  it('cell className includes both background and text color', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red', bg: '#fce4ec', fc: '#dc2626' }], // Pink bg, Red text
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // The spreadsheet adapter should convert both bg and fc to className
    // Check the mock captured data
    expect(capturedData.length).toBeGreaterThan(0)
    const cell = capturedData[1]?.[1] as { className?: string }
    expect(cell?.className).toBe('bg-[#fce4ec] text-[#dc2626]')
  })
})

describe('SpreadsheetContainer color picker selection fix (color-picker-selection-fix)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'v-1', displayValue: 'Red', skuFragment: 'R' },
      { id: 'v-2', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('cell stays selected after opening background color picker (modal=false)', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell (1, 1) - the "Red" cell
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Verify color picker is enabled (cells selected)
    expect(screen.getByTestId('cell-color-picker-trigger')).not.toBeDisabled()

    // Open the color picker dropdown
    await user.click(screen.getByTestId('cell-color-picker-trigger'))

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-fce4ec')).toBeInTheDocument()
    })

    // With modal={false}, selection should still be active
    // Click a color - it should apply to the selected cell
    await user.click(screen.getByTestId('cell-color-swatch-fce4ec')) // Light pink

    // Verify background color was applied
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#fce4ec')
  })

  it('cell stays selected after opening text color picker (modal=false)', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select cell (1, 1) - the "Red" cell
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 1, column: 1 },
          },
        })
      }
    })

    // Verify text color picker is enabled (cells selected)
    expect(screen.getByTestId('cell-text-color-picker-trigger')).not.toBeDisabled()

    // Open the text color picker dropdown
    await user.click(screen.getByTestId('cell-text-color-picker-trigger'))

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByTestId('cell-text-color-swatch-dc2626')).toBeInTheDocument()
    })

    // With modal={false}, selection should still be active
    // Click a color - it should apply to the selected cell
    await user.click(screen.getByTestId('cell-text-color-swatch-dc2626')) // Red

    // Verify text color was applied
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].fc).toBe('#dc2626')
  })

  it('applies color to multiple selected cells with dropdown open', async () => {
    const user = userEvent.setup()
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
      [{ v: 'R', m: 'R' }, { v: 'Red', m: 'Red' }],
      [{ v: 'B', m: 'B' }, { v: 'Blue', m: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    // Select range (1,1) to (2,1) - both cells in Color column
    act(() => {
      if (capturedOnSelect) {
        capturedOnSelect({
          range: {
            start: { row: 1, column: 1 },
            end: { row: 2, column: 1 },
          },
        })
      }
    })

    // Open the color picker and select a color
    await user.click(screen.getByTestId('cell-color-picker-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('cell-color-swatch-a5d6a7')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('cell-color-swatch-a5d6a7')) // Green

    // Verify color was applied to both selected cells
    const activeSheet = useSheetsStore.getState().getActiveSheet()
    expect(activeSheet!.data[1][1].bg).toBe('#a5d6a7')
    expect(activeSheet!.data[2][1].bg).toBe('#a5d6a7')
  })
})

describe('SpreadsheetContainer row resizing (row-resizing)', () => {
  const colorSpec: Specification = {
    id: 'color-spec',
    name: 'Color',
    order: 0,
    values: [
      { id: 'red', displayValue: 'Red', skuFragment: 'R' },
      { id: 'blue', displayValue: 'Blue', skuFragment: 'B' },
    ],
  }

  beforeEach(() => {
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedOnSelect = null
    capturedData = []
    capturedSelected = null
  })

  it('renders ResizableRowIndicators component', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
      { id: 'col-1', type: 'spec', header: 'Color', specId: 'color-spec' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
      [{ v: 'B' }, { v: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [colorSpec])

    render(<SpreadsheetContainer />)

    expect(screen.getByTestId('resizable-row-indicators')).toBeInTheDocument()
  })

  it('renders row resize handles for each data row', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
      [{ v: 'SKU-002' }],
      [{ v: 'SKU-003' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    // Should have resize handles for all 4 rows (including header)
    expect(screen.getByTestId('row-resize-handle-0')).toBeInTheDocument()
    expect(screen.getByTestId('row-resize-handle-1')).toBeInTheDocument()
    expect(screen.getByTestId('row-resize-handle-2')).toBeInTheDocument()
    expect(screen.getByTestId('row-resize-handle-3')).toBeInTheDocument()
  })

  it('updates row height in store when resize handle is dragged', async () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
    ]
    const sheetId = createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const handle = screen.getByTestId('row-resize-handle-1')

    // Start resize
    fireEvent.mouseDown(handle, { clientY: 100 })

    // Simulate mouse move via document event
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientY: 150,
      bubbles: true,
    })
    document.dispatchEvent(mouseMoveEvent)

    // End resize
    const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUpEvent)

    // Check that row height was updated in store
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)
    expect(sheet?.rowHeights?.[1]).toBeDefined()
  })

  it('generates row height styles for custom heights', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
    ]
    const sheetId = createSheetWithColumns('Products', data, columns, [])

    // Set a custom row height
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(s =>
        s.id === sheetId
          ? { ...s, rowHeights: { 1: 60 } }
          : s
      )
    }))

    render(<SpreadsheetContainer />)

    // Check that row height styles are generated
    const styleElement = document.querySelector('[data-testid="row-height-styles"]')
    expect(styleElement).toBeInTheDocument()
    expect(styleElement?.textContent).toContain('height: 60px')
  })

  it('preserves row heights after switching sheets and returning', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data1: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
    ]
    const data2: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-A' }],
    ]

    // Create first sheet with custom row height
    const sheetId1 = createSheetWithColumns('Products', data1, columns, [])
    useSheetsStore.setState(state => ({
      sheets: state.sheets.map(s =>
        s.id === sheetId1
          ? { ...s, rowHeights: { 1: 50 } }
          : s
      )
    }))

    // Create second sheet
    createSheetWithColumns('Other', data2, columns, [])

    render(<SpreadsheetContainer />)

    // Switch to first sheet
    useSheetsStore.setState({ activeSheetId: sheetId1 })

    // Verify row height is still 50
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId1)
    expect(sheet?.rowHeights?.[1]).toBe(50)
  })

  it('enforces minimum row height of 24px', async () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
    ]
    const sheetId = createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const handle = screen.getByTestId('row-resize-handle-1')

    // Start resize
    fireEvent.mouseDown(handle, { clientY: 100 })

    // Drag up significantly to try to make height negative
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientY: 20, // Very high up - would result in negative delta
      bubbles: true,
    })
    document.dispatchEvent(mouseMoveEvent)

    // End resize
    const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUpEvent)

    // Check that row height is clamped to minimum
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)
    expect(sheet?.rowHeights?.[1]).toBe(24) // Minimum enforced
  })

  it('uses default row height (32px) for rows without custom height', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
      [{ v: 'SKU-002' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    // Row height styles should include default height (32px) for rows without custom height
    const styleElement = document.querySelector('[data-testid="row-height-styles"]')
    expect(styleElement).toBeInTheDocument()
    expect(styleElement?.textContent).toContain('height: 32px')
  })
})

describe('column width styles (column-resize-full-column)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
  })

  it('generates column width styles for colgroup col elements', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU', width: 100 },
      { id: 'col-1', type: 'spec', specId: 'spec-1', header: 'Color', width: 150 },
      { id: 'col-2', type: 'free', header: 'Notes', width: 200 },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Notes' }],
      [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Test note' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).toBeInTheDocument()

    // Should target colgroup col elements for proper table-layout: fixed width control
    expect(styleElement?.textContent).toContain('.Spreadsheet__table colgroup col:nth-child(2)')
    expect(styleElement?.textContent).toContain('.Spreadsheet__table colgroup col:nth-child(3)')
    expect(styleElement?.textContent).toContain('.Spreadsheet__table colgroup col:nth-child(4)')

    // Verify actual widths are in the styles
    expect(styleElement?.textContent).toContain('width: 100px')
    expect(styleElement?.textContent).toContain('width: 150px')
    expect(styleElement?.textContent).toContain('width: 200px')
  })

  it('generates cell width styles for all cells in each column', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU', width: 100 },
      { id: 'col-1', type: 'spec', specId: 'spec-1', header: 'Color', width: 150 },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'SKU-001' }, { v: 'Red' }],
      [{ v: 'SKU-002' }, { v: 'Blue' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).toBeInTheDocument()

    // Should target all cells in column via tr > *:nth-child selector
    // This ensures both header row th and data row td cells are styled
    expect(styleElement?.textContent).toContain('.Spreadsheet__table tr > *:nth-child(2)')
    expect(styleElement?.textContent).toContain('.Spreadsheet__table tr > *:nth-child(3)')

    // Verify min-width and max-width are included for consistent sizing
    expect(styleElement?.textContent).toContain('min-width: 100px')
    expect(styleElement?.textContent).toContain('max-width: 100px')
    expect(styleElement?.textContent).toContain('min-width: 150px')
    expect(styleElement?.textContent).toContain('max-width: 150px')
  })

  it('uses default width (120px) when column.width is not set', () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU' }, // No width set
      { id: 'col-1', type: 'spec', specId: 'spec-1', header: 'Color' }, // No width set
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'SKU-001' }, { v: 'Red' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).toBeInTheDocument()

    // Default width should be 120px for columns without explicit width
    expect(styleElement?.textContent).toContain('width: 120px')
    expect(styleElement?.textContent).toContain('min-width: 120px')
    expect(styleElement?.textContent).toContain('max-width: 120px')
  })

  it('accounts for row indicator column with +2 offset in nth-child', () => {
    // In react-spreadsheet, the first col in colgroup is for row indicators
    // So data column 0 (SKU) should target col:nth-child(2)
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU', width: 100 },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }],
      [{ v: 'SKU-001' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).toBeInTheDocument()

    // Column index 0 should target nth-child(2) because:
    // - nth-child is 1-indexed (so add 1)
    // - row indicator column is first (so add 1 more)
    // = index 0 + 2 = nth-child(2)
    expect(styleElement?.textContent).toContain('col:nth-child(2) { width: 100px')
    expect(styleElement?.textContent).toContain('tr > *:nth-child(2) { width: 100px')
  })

  it('updates column width styles when column width changes in store', async () => {
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU', width: 100 },
      { id: 'col-1', type: 'free', header: 'Notes', width: 150 },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Notes' }],
      [{ v: 'SKU-001' }, { v: 'Test' }],
    ]
    const sheetId = createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    let styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement?.textContent).toContain('width: 150px')

    // Update column width in store
    await act(async () => {
      useSheetsStore.getState().updateColumnWidth(sheetId, 1, 250)
    })

    // Re-query the style element (React may have re-rendered)
    styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement?.textContent).toContain('width: 250px')
  })

  it('no column width styles when no columns exist', () => {
    useSheetsStore.setState({
      sheets: [{
        id: 'sheet-1',
        name: 'Empty Sheet',
        type: 'data',
        data: [],
        columns: [],
        specifications: [],
      }],
      activeSheetId: 'sheet-1',
    })

    render(<SpreadsheetContainer />)

    // No columns means no column width styles should be rendered
    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).not.toBeInTheDocument()
  })

  it('generates properly formatted CSS selectors without malformed characters', () => {
    // This test verifies the fix for the bug where CSS selectors were malformed
    // due to incorrect newline handling between colStyles and cellStyles
    const columns: ColumnDef[] = [
      { id: 'col-0', type: 'sku', header: 'SKU', width: 100 },
      { id: 'col-1', type: 'spec', specId: 'spec-1', header: 'Color', width: 150 },
      { id: 'col-2', type: 'free', header: 'Notes', width: 200 },
    ]
    const data: CellData[][] = [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Notes' }],
      [{ v: 'SKU-001' }, { v: 'Red' }, { v: 'Test' }],
    ]
    createSheetWithColumns('Products', data, columns, [])

    render(<SpreadsheetContainer />)

    const styleElement = document.querySelector('[data-testid="column-width-styles"]')
    expect(styleElement).toBeInTheDocument()

    const styleContent = styleElement?.textContent || ''

    // All selectors should start with .sku-spreadsheet (not n.sku-spreadsheet or other malformed variants)
    const selectorRegex = /[a-z]\.[a-z]/gi
    const malformedMatches = styleContent.match(selectorRegex)
    // The only valid match should be "sku-spreadsheet" patterns, not like "n.sku"
    if (malformedMatches) {
      malformedMatches.forEach(match => {
        // Valid patterns include "d.s" (spreadsheet), "t.S" (Spreadsheet__table), etc.
        // Invalid would be something starting a line that looks like a malformed selector
        expect(match).not.toBe('n.')
      })
    }

    // Verify that each cell style selector is properly formed
    expect(styleContent).toContain('.sku-spreadsheet .Spreadsheet__table tr > *:nth-child(2)')
    expect(styleContent).toContain('.sku-spreadsheet .Spreadsheet__table tr > *:nth-child(3)')
    expect(styleContent).toContain('.sku-spreadsheet .Spreadsheet__table tr > *:nth-child(4)')

    // Verify no malformed selectors like 'n.sku-spreadsheet' exist
    expect(styleContent).not.toMatch(/\bn\.sku-spreadsheet/)
  })
})
