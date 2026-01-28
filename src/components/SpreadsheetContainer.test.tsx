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
