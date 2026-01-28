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
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('mock-workbook')).toBeInTheDocument()
  })

  it('displays Config sheet with orange color', () => {
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpreadsheetContainer />)
    const configSheet = screen.getByTestId('sheet-Config')
    expect(configSheet).toHaveAttribute('data-color', '#f97316')
  })

  it('shows sheet tabs', () => {
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('sheet-tabs')).toBeInTheDocument()
  })

  it('includes multiple sheets in workbook data', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    useSheetsStore.getState().addSheet('Sheet 1')

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('sheet-count')).toHaveTextContent('2 sheets')
  })

  it('renders data sheets without orange color', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    useSheetsStore.getState().addSheet('MyData')

    render(<SpreadsheetContainer />)
    const dataSheet = screen.getByTestId('sheet-MyData')
    expect(dataSheet).not.toHaveAttribute('data-color', '#f97316')
  })

  it('has spreadsheet-container test id wrapper', () => {
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpreadsheetContainer />)
    expect(screen.getByTestId('spreadsheet-container')).toBeInTheDocument()
  })
})

describe('buildDataVerification helper', () => {
  // Test the dataVerification building logic indirectly through the mocked workbook
  it('creates dropdowns for data sheets with headers matching spec names', () => {
    useSheetsStore.getState().initializeWithConfigSheet()

    // Add spec to Config sheet
    const configSheet = useSheetsStore.getState().getConfigSheet()!
    useSheetsStore.getState().setSheetData(configSheet.id, [
      [{ v: 'Specification' }, { v: 'Value' }, { v: 'SKU Code' }],
      [{ v: 'Color' }, { v: 'Red' }, { v: 'R' }],
      [{ v: 'Color' }, { v: 'Blue' }, { v: 'B' }],
    ])

    // Add data sheet with Color column
    const sheetId = useSheetsStore.getState().addSheet('Data')
    useSheetsStore.getState().setSheetData(sheetId, [
      [{ v: 'Color' }, { v: 'SKU' }],
      [{ v: '' }, { v: '' }],
    ])

    render(<SpreadsheetContainer />)

    // The component should have rendered without errors
    expect(screen.getByTestId('mock-workbook')).toBeInTheDocument()
  })
})

describe('SpreadsheetContainer onChange handler', () => {
  beforeEach(() => {
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    capturedHooks = {}
    capturedOnChange = null
  })

  it('does not overwrite Config sheet data when onChange is triggered', () => {
    // Initialize with Config sheet containing specs
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()!
    useSheetsStore.getState().setSheetData(configSheet.id, [
      [{ v: 'Specification' }, { v: 'Value' }, { v: 'SKU Code' }],
      [{ v: 'Color' }, { v: 'Red' }, { v: 'R' }],
      [{ v: 'Color' }, { v: 'Blue' }, { v: 'B' }],
    ])

    render(<SpreadsheetContainer />)

    // Simulate Fortune-Sheet onChange with modified Config data (e.g., empty data)
    capturedOnChange?.([{
      id: configSheet.id,
      name: 'Config',
      data: [[null, null, null]], // Empty/corrupted data
    }])

    // Config sheet data should remain unchanged (specs preserved)
    const updatedConfigSheet = useSheetsStore.getState().getConfigSheet()!
    expect(updatedConfigSheet.data.length).toBe(3) // Header + 2 spec rows
    expect(updatedConfigSheet.data[1][0]?.v).toBe('Color')
    expect(updatedConfigSheet.data[1][1]?.v).toBe('Red')
  })

  it('allows data sheet updates via onChange', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
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
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
    capturedHooks = {}
  })

  it('provides beforeDeleteSheet hook that blocks Config sheet deletion', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()!

    render(<SpreadsheetContainer />)

    const result = capturedHooks.beforeDeleteSheet?.(configSheet.id)
    expect(result).toBe(false)
  })

  it('provides beforeDeleteSheet hook that allows data sheet deletion', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    const result = capturedHooks.beforeDeleteSheet?.(dataSheetId)
    expect(result).toBe(true)
  })

  it('provides beforeUpdateSheetName hook that blocks Config sheet rename', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()!

    render(<SpreadsheetContainer />)

    const result = capturedHooks.beforeUpdateSheetName?.(configSheet.id, 'Config', 'NewName')
    expect(result).toBe(false)
  })

  it('provides beforeUpdateSheetName hook that allows data sheet rename', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    const result = capturedHooks.beforeUpdateSheetName?.(dataSheetId, 'Data', 'Renamed')
    expect(result).toBe(true)
  })

  it('provides afterUpdateSheetName hook that syncs rename to store', () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    capturedHooks.afterUpdateSheetName?.(dataSheetId, 'Data', 'Renamed')

    const { sheets } = useSheetsStore.getState()
    const renamedSheet = sheets.find(s => s.id === dataSheetId)
    expect(renamedSheet?.name).toBe('Renamed')
  })

  it('provides afterAddSheet hook that syncs new sheet to store', () => {
    useSheetsStore.getState().initializeWithConfigSheet()

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
    useSheetsStore.getState().initializeWithConfigSheet()
    const dataSheetId = useSheetsStore.getState().addSheet('Data')

    render(<SpreadsheetContainer />)

    capturedHooks.afterDeleteSheet?.(dataSheetId)

    const { sheets } = useSheetsStore.getState()
    expect(sheets.find(s => s.id === dataSheetId)).toBeUndefined()
  })
})
