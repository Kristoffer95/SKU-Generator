import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSheetsStore } from '@/store/sheets'
import { useSpecificationsStore } from '@/store/specifications'

// Track hooks and onChange passed to Workbook for testing
let capturedHooks: Record<string, (...args: unknown[]) => unknown> = {}
let capturedOnChange: ((data: unknown[]) => void) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedData: any[] = []

// Mock Fortune-Sheet Workbook since it uses canvas
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(({ data, showSheetTabs, hooks, onChange }) => {
    // Capture hooks, onChange, and data for testing
    capturedHooks = hooks || {}
    capturedOnChange = onChange || null
    capturedData = data || []
    return (
      <div data-testid="mock-workbook">
        <span data-testid="sheet-count">{data?.length || 0} sheets</span>
        {showSheetTabs && <span data-testid="sheet-tabs">tabs shown</span>}
        {data?.map((sheet: { id: string; name: string; color?: string }) => (
          <div key={sheet.id} data-testid={`sheet-${sheet.name}`} data-color={sheet.color}>
            {sheet.name}
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
    capturedHooks = {}
    capturedData = []
  })

  it('shows empty state when no sheets exist', () => {
    render(<SpreadsheetContainer />)
    expect(screen.getByText('No sheets available')).toBeInTheDocument()
  })

  it('renders workbook when sheets exist', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('mock-workbook')).toBeInTheDocument()
  })

  it('renders sheets without special coloring', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    // All sheets have same styling (no Config sheet special treatment)
    const sheet = screen.getByTestId('sheet-Sample Products')
    expect(sheet).not.toHaveAttribute('data-color', '#f97316')
  })

  it('shows sheet tabs', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('sheet-tabs')).toBeInTheDocument()
  })

  it('includes multiple sheets in workbook data', () => {
    useSheetsStore.getState().initializeWithSampleData()
    useSheetsStore.getState().addSheet('Sheet 1')

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('sheet-count')).toHaveTextContent('2 sheets')
  })

  it('renders all sheets without special coloring', () => {
    useSheetsStore.getState().initializeWithSampleData()
    useSheetsStore.getState().addSheet('MyData')

    render(<SpreadsheetContainer />)
    const dataSheet = screen.getByTestId('sheet-MyData')
    expect(dataSheet).not.toHaveAttribute('data-color', '#f97316')
  })

  it('has spreadsheet-container test id wrapper', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('spreadsheet-container')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer data sheets', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  it('renders data sheets without errors', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // The component should have rendered without errors
    expect(screen.getByTestId('mock-workbook')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer dropdown building', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedData = []
  })

  it('builds dataVerification with dropdown options from specifications store', () => {
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

    // Check that dataVerification was built for the Color column
    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)
    expect(sheet.dataVerification).toBeDefined()

    // Row 1, Column 1 (Color column) should have dropdown
    const key = '1_1'
    expect(sheet.dataVerification[key]).toBeDefined()
    expect(sheet.dataVerification[key].type).toBe('dropdown')
    expect(sheet.dataVerification[key].value1).toBe('Red,Blue')
  })

  it('does not add dropdown for columns that do not match spec names', () => {
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
      [{ v: 'SKU' }, { v: 'Description' }], // Description doesn't match any spec
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // SKU column (col 0) should not have dropdown
    expect(sheet.dataVerification['1_0']).toBeUndefined()
    // Description column (col 1) should not have dropdown
    expect(sheet.dataVerification['1_1']).toBeUndefined()
  })

  it('applies dropdowns to multiple columns matching different specs', () => {
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

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Color column (col 1) should have Color values
    expect(sheet.dataVerification['1_1'].value1).toBe('Red,Blue')
    // Size column (col 2) should have Size values
    expect(sheet.dataVerification['1_2'].value1).toBe('Small,Large')
  })

  it('updates dropdowns when specifications change', () => {
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

    const { rerender } = render(<SpreadsheetContainer />)

    // Initial state: only Red
    let sheet = capturedData.find((s: { id: string }) => s.id === sheetId)
    expect(sheet.dataVerification['1_1'].value1).toBe('Red')

    // Add Blue to the specification
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

    rerender(<SpreadsheetContainer />)

    // Updated: Red,Blue
    sheet = capturedData.find((s: { id: string }) => s.id === sheetId)
    expect(sheet.dataVerification['1_1'].value1).toBe('Red,Blue')
  })

  it('handles empty specifications gracefully', () => {
    useSpecificationsStore.setState({ specifications: [] })

    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // No dropdowns when no specifications
    expect(Object.keys(sheet.dataVerification).length).toBe(0)
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

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // No dropdown for specs with no values
    expect(sheet.dataVerification['1_1']).toBeUndefined()
  })
})

describe('SpreadsheetContainer onChange handler', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedHooks = {}
    capturedOnChange = null
    capturedData = []
  })

  it('processes data sheet changes via onChange', () => {
    // Initialize with sample data
    useSheetsStore.getState().initializeWithSampleData()
    const sheets = useSheetsStore.getState().sheets
    const dataSheet = sheets[0]

    render(<SpreadsheetContainer />)

    // Simulate Fortune-Sheet onChange with new data
    capturedOnChange?.([{
      id: dataSheet.id,
      name: dataSheet.name,
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
        [{ v: '', m: '' }, { v: 'NewValue', m: 'NewValue' }],
      ],
    }])

    // Data sheet should be updated
    const updatedSheet = useSheetsStore.getState().sheets.find(s => s.id === dataSheet.id)!
    expect(updatedSheet.data[1][1]?.v).toBe('NewValue')
  })

  it('allows sheet updates via onChange', () => {
    useSheetsStore.getState().initializeWithSampleData()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')
    useSheetsStore.getState().setSheetData(dataSheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // Simulate Fortune-Sheet onChange with updated data sheet
    capturedOnChange?.([{
      id: dataSheetId,
      name: 'Data',
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
        [{ v: '', m: '' }, { v: 'Red', m: 'Red' }],
      ],
    }])

    // Data sheet should be updated
    const { sheets } = useSheetsStore.getState()
    const dataSheet = sheets.find(s => s.id === dataSheetId)!
    expect(dataSheet.data[1][1]?.v).toBe('Red')
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
    capturedOnChange?.([{
      id: sheetId,
      name: 'Products',
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
        [{ v: '', m: '' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
      ],
    }])

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
    capturedOnChange?.([{
      id: sheetId,
      name: 'Products',
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
        [{ v: '', m: '' }, { v: 'Red', m: 'Red' }, { v: 'Small', m: 'Small' }],
      ],
    }])

    // SKU should be S-R (Size first due to order:0, Color second due to order:1)
    const { sheets } = useSheetsStore.getState()
    const sheet = sheets.find(s => s.id === sheetId)!
    expect(sheet.data[1][0]?.v).toBe('S-R')
  })
})

describe('SpreadsheetContainer hooks', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedHooks = {}
    capturedData = []
  })

  it('does not provide beforeDeleteSheet hook (no protected sheets)', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // No beforeDeleteSheet hook - all sheets can be deleted
    expect(capturedHooks.beforeDeleteSheet).toBeUndefined()
  })

  it('does not provide beforeUpdateSheetName hook (no protected sheets)', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // No beforeUpdateSheetName hook - all sheets can be renamed
    expect(capturedHooks.beforeUpdateSheetName).toBeUndefined()
  })

  it('provides afterUpdateSheetName hook that syncs rename to store', () => {
    useSheetsStore.getState().initializeWithSampleData()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    capturedHooks.afterUpdateSheetName?.(dataSheetId, 'Data', 'Renamed')

    const { sheets } = useSheetsStore.getState()
    const renamedSheet = sheets.find(s => s.id === dataSheetId)
    expect(renamedSheet?.name).toBe('Renamed')
  })

  it('provides afterAddSheet hook that syncs new sheet to store', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // Simulate Fortune-Sheet adding a new sheet
    capturedHooks.afterAddSheet?.({ id: 'fortune-sheet-id', name: 'New Sheet' })

    const { sheets } = useSheetsStore.getState()
    const newSheet = sheets.find(s => s.id === 'fortune-sheet-id')
    expect(newSheet).toBeDefined()
    expect(newSheet?.name).toBe('New Sheet')
    expect(newSheet?.type).toBe('data')
  })

  it('provides afterDeleteSheet hook that syncs deletion to store', () => {
    useSheetsStore.getState().initializeWithSampleData()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    capturedHooks.afterDeleteSheet?.(dataSheetId)

    const { sheets } = useSheetsStore.getState()
    expect(sheets.find(s => s.id === dataSheetId)).toBeUndefined()
  })
})

describe('SpreadsheetContainer read-only SKU column', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedHooks = {}
    capturedData = []
  })

  it('sets column 0 as read-only via colReadOnly config', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)
    expect(sheet.config).toBeDefined()
    expect(sheet.config.colReadOnly).toBeDefined()
    expect(sheet.config.colReadOnly[0]).toBe(1)
  })

  it('provides beforeUpdateCell hook that blocks edits to column 0 data cells', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // beforeUpdateCell should be provided
    expect(capturedHooks.beforeUpdateCell).toBeDefined()

    // Editing column 0, row 1 (data row) should be blocked
    const result = capturedHooks.beforeUpdateCell?.(1, 0, 'NEW-VALUE')
    expect(result).toBe(false)
  })

  it('allows editing column 0 header (row 0)', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Editing column 0, row 0 (header) should be allowed
    const result = capturedHooks.beforeUpdateCell?.(0, 0, 'Product Code')
    expect(result).toBe(true)
  })

  it('allows editing non-SKU columns (columns other than 0)', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    // Editing column 1, row 1 should be allowed
    const result = capturedHooks.beforeUpdateCell?.(1, 1, 'Blue')
    expect(result).toBe(true)
  })

  it('blocks edits to column 0 for all data rows', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'B-L' }, { v: 'Blue' }],
      [{ v: 'G-M' }, { v: 'Green' }],
    ])

    render(<SpreadsheetContainer />)

    // All data rows (1, 2, 3) should be blocked for column 0
    expect(capturedHooks.beforeUpdateCell?.(1, 0, 'X')).toBe(false)
    expect(capturedHooks.beforeUpdateCell?.(2, 0, 'Y')).toBe(false)
    expect(capturedHooks.beforeUpdateCell?.(3, 0, 'Z')).toBe(false)
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
    capturedOnChange?.([{
      id: sheetId,
      name: 'Products',
      data: [
        [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }],
        [{ v: '', m: '' }, { v: 'Red', m: 'Red' }],
      ],
    }])

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
    capturedHooks = {}
    capturedData = []
  })

  it('applies background color to SKU column data cells', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Row 1, Column 0 (SKU data cell) should have background color
    expect(sheet.data[1][0].bg).toBe('#f1f5f9')
  })

  it('does not apply background color to header row', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Row 0, Column 0 (header) should NOT have background color
    expect(sheet.data[0][0].bg).toBeUndefined()
  })

  it('does not apply background color to non-SKU columns', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Row 1, Column 1 (Color column) should NOT have background color
    expect(sheet.data[1][1].bg).toBeUndefined()
  })

  it('applies background color to all SKU column data rows', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R' }, { v: 'Red' }],
      [{ v: 'B' }, { v: 'Blue' }],
      [{ v: 'G' }, { v: 'Green' }],
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // All data rows in column 0 should have background color
    expect(sheet.data[1][0].bg).toBe('#f1f5f9')
    expect(sheet.data[2][0].bg).toBe('#f1f5f9')
    expect(sheet.data[3][0].bg).toBe('#f1f5f9')
  })

  it('applies background color to empty SKU cells', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{}, { v: 'Red' }], // Empty SKU cell
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Even empty cells in SKU column should have background color
    expect(sheet.data[1][0].bg).toBe('#f1f5f9')
  })
})

describe('SpreadsheetContainer duplicate SKU highlighting', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedHooks = {}
    capturedData = []
  })

  it('highlights duplicate SKU cells with amber background', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'R-S' }, { v: 'Red' }], // Duplicate SKU
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Both duplicate rows should have amber background on SKU column
    expect(sheet.data[1][0].bg).toBe('#fef3c7')
    expect(sheet.data[2][0].bg).toBe('#fef3c7')
  })

  it('uses normal background for unique SKUs', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'B-L' }, { v: 'Blue' }], // Unique SKU
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Both should have normal gray-blue background (unique SKUs)
    expect(sheet.data[1][0].bg).toBe('#f1f5f9')
    expect(sheet.data[2][0].bg).toBe('#f1f5f9')
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

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // All ABC rows should be highlighted
    expect(sheet.data[1][0].bg).toBe('#fef3c7')
    expect(sheet.data[3][0].bg).toBe('#fef3c7')
    expect(sheet.data[4][0].bg).toBe('#fef3c7')

    // XYZ should have normal background (unique)
    expect(sheet.data[2][0].bg).toBe('#f1f5f9')
  })

  it('highlights multiple different duplicate SKU groups', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'AAA' }, { v: 'Red' }],
      [{ v: 'BBB' }, { v: 'Blue' }],
      [{ v: 'AAA' }, { v: 'Green' }], // Duplicate of AAA
      [{ v: 'BBB' }, { v: 'Yellow' }], // Duplicate of BBB
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // All duplicate rows should be highlighted
    expect(sheet.data[1][0].bg).toBe('#fef3c7') // AAA
    expect(sheet.data[2][0].bg).toBe('#fef3c7') // BBB
    expect(sheet.data[3][0].bg).toBe('#fef3c7') // AAA duplicate
    expect(sheet.data[4][0].bg).toBe('#fef3c7') // BBB duplicate
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

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Empty cells should have normal background, not duplicate highlight
    expect(sheet.data[1][0].bg).toBe('#f1f5f9')
    expect(sheet.data[2][0].bg).toBe('#f1f5f9')
    expect(sheet.data[3][0].bg).toBe('#f1f5f9')
  })

  it('handles mix of duplicate and unique SKUs', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{ v: 'R-S' }, { v: 'Red' }], // Duplicate
      [{ v: 'B-L' }, { v: 'Blue' }], // Unique
      [{ v: 'G-M' }, { v: 'Green' }], // Unique
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Duplicate rows highlighted
    expect(sheet.data[1][0].bg).toBe('#fef3c7')
    expect(sheet.data[2][0].bg).toBe('#fef3c7')

    // Unique rows have normal background
    expect(sheet.data[3][0].bg).toBe('#f1f5f9')
    expect(sheet.data[4][0].bg).toBe('#f1f5f9')
  })

  it('highlights empty SKU cells in duplicate rows with amber background', () => {
    const sheetId = useSheetsStore.getState().addSheet('Products')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'SKU' }, { v: 'Color' }],
      [{ v: 'R-S' }, { v: 'Red' }],
      [{}, { v: 'Blue' }], // Unique empty
      [{ v: 'R-S' }, { v: 'Green' }], // Duplicate
    ])

    render(<SpreadsheetContainer />)

    const sheet = capturedData.find((s: { id: string }) => s.id === sheetId)

    // Duplicate rows highlighted
    expect(sheet.data[1][0].bg).toBe('#fef3c7')
    expect(sheet.data[3][0].bg).toBe('#fef3c7')

    // Empty but unique cell has normal background
    expect(sheet.data[2][0].bg).toBe('#f1f5f9')
  })
})

describe('SpreadsheetContainer ValidationPanel integration', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    useSpecificationsStore.setState({ specifications: [] })
    capturedHooks = {}
    capturedData = []
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
    expect(screen.getByText(/Yellow/)).toBeInTheDocument()
  })
})
