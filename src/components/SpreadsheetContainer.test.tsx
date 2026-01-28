import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { useSheetsStore } from '@/store/sheets'
import { useSpecificationsStore } from '@/store/specifications'

// Track onChange passed to Spreadsheet for testing
let capturedOnChange: ((data: unknown[][]) => void) | null = null
let capturedData: unknown[][] = []

// Mock react-spreadsheet
vi.mock('react-spreadsheet', () => ({
  default: vi.fn(({ data, onChange }) => {
    // Capture onChange and data for testing
    capturedOnChange = onChange || null
    capturedData = data || []
    return (
      <div data-testid="mock-spreadsheet">
        <span data-testid="row-count">{data?.length || 0} rows</span>
        {data?.map((row: unknown[], rowIdx: number) => (
          <div key={rowIdx} data-testid={`row-${rowIdx}`}>
            {Array.isArray(row) && row.map((cell: unknown, colIdx: number) => {
              const cellObj = cell as { value?: string | number | null; readOnly?: boolean; className?: string } | null
              return (
                <span
                  key={colIdx}
                  data-testid={`cell-${rowIdx}-${colIdx}`}
                  data-value={cellObj?.value ?? ''}
                  data-readonly={cellObj?.readOnly ?? false}
                  data-classname={cellObj?.className ?? ''}
                >
                  {String(cellObj?.value ?? '')}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    )
  }),
}))

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
    capturedData = []
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
    // Set up specifications in store
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-1',
          name: 'Color',
          order: 0,
          values: [
            { id: 'v1', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v2', displayValue: 'Blue', skuFragment: 'B' },
          ],
        },
      ],
    })

    // Set up sheet with Color column header
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

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
      [{ v: 'SKU' }, { v: 'Description' }], // Header name doesn't affect dropdown assignment
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // SKU column (col 0) should not have dropdownOptions
    expect(row1[0]?.dropdownOptions).toBeUndefined()
    // Column 1 gets dropdowns from spec at position 0, regardless of header
    expect(row1[1]?.dropdownOptions).toEqual(['Red'])
  })

  it('applies dropdownOptions to multiple columns matching different specs', () => {
    useSpecificationsStore.setState({
      specifications: [
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
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // Color column (col 1) should have Color values (in spec values order)
    expect(row1[1]?.dropdownOptions).toEqual(['Red', 'Blue'])
    // Size column (col 2) should have Size values (in spec values order)
    expect(row1[2]?.dropdownOptions).toEqual(['Small', 'Large'])
  })

  it('handles empty specifications gracefully', () => {
    useSpecificationsStore.setState({ specifications: [] })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    const row1 = capturedData[1] as Array<{ dropdownOptions?: string[] }>
    // No dropdownOptions when no specifications
    expect(row1[1]?.dropdownOptions).toBeUndefined()
  })

  it('handles specifications with no values gracefully', () => {
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-1',
          name: 'Color',
          order: 0,
          values: [], // Empty values array
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

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
    capturedData = []
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
    // Set up specifications in store
    useSpecificationsStore.setState({
      specifications: [
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
      ],
    })

    // Set up sheet with Color and Size columns
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ])

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
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-1',
          name: 'Color',
          order: 1, // Color has higher order
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
      ],
    })

    // Set up sheet with Color column before Size column (opposite of spec order)
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // Simulate user selecting Red and Small
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    // SKU should be S-R (Size first due to order:0, Color second due to order:1)
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
      [{ v: '' }, { v: '' }],
    ])

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
      [{ v: 'Y' }, { v: 'Yellow' }], // Invalid value (Yellow not in Color spec)
    ])
    useSheetsStore.getState().setActiveSheet(sheetId)

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
      [{ v: 'R' }, { v: 'Red' }],
      [{ v: 'R' }, { v: 'Red' }], // Duplicate SKU
      [{ v: 'Y' }, { v: 'Yellow' }], // Invalid value
    ])
    useSheetsStore.getState().setActiveSheet(sheetId)

    render(<SpreadsheetContainer />)

    // ValidationPanel should show both types of errors
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument()
    expect(screen.getByText('3 issues found')).toBeInTheDocument()
    expect(screen.getByText('1 invalid value')).toBeInTheDocument()
    expect(screen.getByText('2 duplicate SKUs')).toBeInTheDocument()
  })

  it('shows only errors for the active sheet', () => {
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

    // Create two sheets - one with errors, one without
    const sheet1Id = useSheetsStore.getState().addSheet('Sheet 1')
    useSheetsStore.getState().setSheetData(sheet1Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }], // Valid
    ])

    const sheet2Id = useSheetsStore.getState().addSheet('Sheet 2')
    useSheetsStore.getState().setSheetData(sheet2Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'Y' }, { v: 'Yellow' }], // Invalid
    ])

    // Set Sheet 1 (no errors) as active
    useSheetsStore.getState().setActiveSheet(sheet1Id)

    render(<SpreadsheetContainer />)

    // No validation panel when active sheet has no errors
    expect(screen.queryByTestId('validation-panel')).not.toBeInTheDocument()
  })

  it('updates validation errors when active sheet changes', () => {
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

    const sheet1Id = useSheetsStore.getState().addSheet('Sheet 1')
    useSheetsStore.getState().setSheetData(sheet1Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
    ])

    const sheet2Id = useSheetsStore.getState().addSheet('Sheet 2')
    useSheetsStore.getState().setSheetData(sheet2Id, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'Y' }, { v: 'Yellow' }],
    ])

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

describe('SpreadsheetContainer SKU auto-generation from dropdown selection', () => {
  // Tests verifying PRD task sku-autogen-1: SKU auto-generation when selecting values from dropdowns

  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedOnChange = null
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('generates SKU when selecting a single value from dropdown', () => {
    // Set up specifications
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

    // Create new sheet (has proper headers via sheet-headers-1)
    const sheetId = useSheetsStore.getState().addSheet('Test Products')
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
        {
          id: 'spec-size',
          name: 'Size',
          order: 1,
          values: [
            { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
            { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
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
    useSpecificationsStore.setState({
      specifications: [
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
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')

    render(<SpreadsheetContainer />)

    // Simulate selecting Red and Small
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'Color' }, { value: 'Size' }],
      [{ value: '' }, { value: 'Red' }, { value: 'Small' }],
    ])

    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('R-S')
  })

  it('does not generate SKU when headers are missing', () => {
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'spec-color',
          name: 'Color',
          order: 0,
          values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    // Manually set sheet with missing/wrong headers
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'WrongHeader' }], // Header doesn't match spec name
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // Simulate selecting Red in a column with wrong header
    capturedOnChange?.([
      [{ value: 'SKU' }, { value: 'WrongHeader' }],
      [{ value: '' }, { value: 'Red' }],
    ])

    // SKU should be empty (header doesn't match any spec name)
    const sheet = useSheetsStore.getState().sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('')
  })

  it('updates SKU in column A when dropdown value changes', () => {
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
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'color',
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
      [{ v: 'R' }, { v: 'Red' }],
    ])

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
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'color',
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
    ])

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
    capturedData = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('spec column cells have dropdownOptions with displayValues from specifications', () => {
    // stepsToVerify 1 & 2: Click/Enter on spec column cell shows dropdown with spec values
    // and dropdown options match displayValues from specification store
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
        {
          id: 'spec-size',
          name: 'Size',
          order: 1,
          values: [
            { id: 'v4', displayValue: 'Small', skuFragment: 'S' },
            { id: 'v5', displayValue: 'Large', skuFragment: 'L' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
      [{ v: '' }, { v: '' }, { v: '' }],
    ])

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
        {
          id: 'spec-size',
          name: 'Size',
          order: 1,
          values: [
            { id: 'v3', displayValue: 'Small', skuFragment: 'S' },
            { id: 'v4', displayValue: 'Large', skuFragment: 'L' },
          ],
        },
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')

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
    useSpecificationsStore.setState({
      specifications: [
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
      ],
    })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }, { v: 'Material' }],
      [{ v: '' }, { v: '' }, { v: '' }, { v: '' }],
    ])

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
