import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSheetsStore } from '@/store/sheets'

// Track hooks and onChange passed to Workbook for testing
let capturedHooks: Record<string, (...args: unknown[]) => unknown> = {}
let capturedOnChange: ((data: unknown[]) => void) | null = null

// Mock Fortune-Sheet Workbook since it uses canvas
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(({ data, showSheetTabs, hooks, onChange }) => {
    // Capture hooks and onChange for testing
    capturedHooks = hooks || {}
    capturedOnChange = onChange || null
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
    // Reset captured hooks
    capturedHooks = {}
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
  })

  // Dropdown building now handled via specifications store (see remove-config-3)
  it('renders data sheets without errors', () => {
    useSheetsStore.getState().initializeWithSampleData()

    render(<SpreadsheetContainer />)

    // The component should have rendered without errors
    expect(screen.getByTestId('mock-workbook')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer onChange handler', () => {
  beforeEach(() => {
    localStorage.clear()
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    capturedHooks = {}
    capturedOnChange = null
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
    capturedHooks = {}
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
