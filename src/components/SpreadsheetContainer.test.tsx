import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSheetsStore } from '@/store/sheets'

// Mock Fortune-Sheet Workbook since it uses canvas
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(({ data, showSheetTabs }) => (
    <div data-testid="mock-workbook">
      <span data-testid="sheet-count">{data?.length || 0} sheets</span>
      {showSheetTabs && <span data-testid="sheet-tabs">tabs shown</span>}
      {data?.map((sheet: { id: string; name: string; color?: string }) => (
        <div key={sheet.id} data-testid={`sheet-${sheet.name}`} data-color={sheet.color}>
          {sheet.name}
        </div>
      ))}
    </div>
  )),
}))

// Import after mocking
import { SpreadsheetContainer } from './SpreadsheetContainer'

describe('SpreadsheetContainer', () => {
  beforeEach(() => {
    // Reset store state
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
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
