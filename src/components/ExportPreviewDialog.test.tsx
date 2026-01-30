import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ExportPreviewDialog } from './ExportPreviewDialog'
import type { SheetConfig } from '@/types'

const createMockSheet = (overrides: Partial<SheetConfig> = {}): SheetConfig => ({
  id: 'sheet-1',
  name: 'Sheet 1',
  type: 'data',
  columns: [],
  specifications: [],
  data: [
    [{ v: 'SKU', m: 'SKU' }, { v: 'Color', m: 'Color' }, { v: 'Size', m: 'Size' }],
    [{ v: 'ABC-001', m: 'ABC-001' }, { v: 'Red', m: 'Red' }, { v: 'Large', m: 'Large' }],
    [{ v: 'ABC-002', m: 'ABC-002' }, { v: 'Blue', m: 'Blue' }, { v: 'Small', m: 'Small' }],
  ],
  ...overrides,
})

const createMockSheetWithStyles = (): SheetConfig => ({
  id: 'sheet-styled',
  name: 'Styled Sheet',
  type: 'data',
  columns: [],
  specifications: [],
  data: [
    [
      { v: 'Header', m: 'Header', bold: true, bg: '#f0f0f0' },
      { v: 'Value', m: 'Value', italic: true, fc: '#ff0000' },
    ],
    [
      { v: 'Data', m: 'Data', align: 'center' },
      { v: 'Styled', m: 'Styled', bold: true, italic: true, bg: '#ffff00', fc: '#0000ff' },
    ],
  ],
})

describe('ExportPreviewDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    sheets: [createMockSheet()],
    activeSheetId: 'sheet-1',
    onExport: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(<ExportPreviewDialog {...defaultProps} />)
    expect(screen.getByTestId('export-preview-dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ExportPreviewDialog {...defaultProps} open={false} />)
    expect(screen.queryByTestId('export-preview-dialog')).not.toBeInTheDocument()
  })

  it('renders dialog title and description', () => {
    render(<ExportPreviewDialog {...defaultProps} />)
    expect(screen.getByText('Export Preview')).toBeInTheDocument()
    expect(screen.getByText(/Preview your data before exporting/)).toBeInTheDocument()
  })

  describe('format selector', () => {
    it('renders all format options', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      expect(screen.getByTestId('format-excel')).toBeInTheDocument()
      expect(screen.getByTestId('format-csv')).toBeInTheDocument()
      expect(screen.getByTestId('format-pdf')).toBeInTheDocument()
    })

    it('defaults to Excel format', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      const excelButton = screen.getByTestId('format-excel')
      // Check that Excel button has "default" variant (darker background)
      expect(excelButton).toHaveClass('bg-primary')
    })

    it('allows switching between formats', () => {
      render(<ExportPreviewDialog {...defaultProps} />)

      const pdfButton = screen.getByTestId('format-pdf')
      fireEvent.click(pdfButton)
      expect(pdfButton).toHaveClass('bg-primary')

      const csvButton = screen.getByTestId('format-csv')
      fireEvent.click(csvButton)
      expect(csvButton).toHaveClass('bg-primary')
    })
  })

  describe('preview table', () => {
    it('renders sheet data in preview table', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      expect(screen.getByText('SKU')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText('Blue')).toBeInTheDocument()
    })

    it('displays "No data to preview" for empty sheets', () => {
      const emptySheet = createMockSheet({ data: [] })
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[emptySheet]}
        />
      )
      expect(screen.getByText('No data to preview')).toBeInTheDocument()
    })

    it('renders cell styles in preview', () => {
      const styledSheet = createMockSheetWithStyles()
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[styledSheet]}
          activeSheetId={styledSheet.id}
        />
      )

      // Find cells and check their styles
      const table = screen.getByRole('table')
      const cells = within(table).getAllByRole('cell')

      // Find the "Styled" cell which has bold, italic, bg, fc
      const styledCell = cells.find(cell => cell.textContent === 'Styled')
      expect(styledCell).toBeDefined()
      expect(styledCell).toHaveStyle({
        fontWeight: 'bold',
        fontStyle: 'italic',
        backgroundColor: '#ffff00',
        color: '#0000ff',
      })
    })
  })

  describe('sheet tabs', () => {
    it('does not show sheet tabs for single sheet', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      expect(screen.queryByTestId('sheet-tabs')).not.toBeInTheDocument()
    })

    it('shows sheet tabs for multiple sheets', () => {
      const sheets = [
        createMockSheet({ id: 'sheet-1', name: 'Sheet 1' }),
        createMockSheet({ id: 'sheet-2', name: 'Sheet 2' }),
      ]
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={sheets}
        />
      )
      expect(screen.getByTestId('sheet-tabs')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-tab-sheet-1')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-tab-sheet-2')).toBeInTheDocument()
    })

    it('switches preview when clicking different sheet tab', () => {
      const sheets = [
        createMockSheet({ id: 'sheet-1', name: 'Sheet 1', data: [[{ v: 'Data1', m: 'Data1' }]] }),
        createMockSheet({ id: 'sheet-2', name: 'Sheet 2', data: [[{ v: 'Data2', m: 'Data2' }]] }),
      ]
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={sheets}
          activeSheetId="sheet-1"
        />
      )

      // Initially shows Sheet 1 data
      expect(screen.getByText('Data1')).toBeInTheDocument()
      expect(screen.queryByText('Data2')).not.toBeInTheDocument()

      // Click Sheet 2 tab
      fireEvent.click(screen.getByTestId('sheet-tab-sheet-2'))

      // Now shows Sheet 2 data
      expect(screen.getByText('Data2')).toBeInTheDocument()
      expect(screen.queryByText('Data1')).not.toBeInTheDocument()
    })
  })

  describe('truncation', () => {
    it('shows truncation indicator for large datasets', () => {
      // Create a sheet with more rows than MAX_PREVIEW_ROWS (50)
      const largeData = Array(60).fill(null).map((_, i) => [
        { v: `Row ${i}`, m: `Row ${i}` },
      ])
      const largeSheet = createMockSheet({ data: largeData })

      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[largeSheet]}
        />
      )

      expect(screen.getByTestId('truncation-indicator')).toBeInTheDocument()
      expect(screen.getByText(/Preview truncated/)).toBeInTheDocument()
      expect(screen.getByText(/Showing 50 of 60 rows/)).toBeInTheDocument()
    })

    it('shows column truncation info when columns exceed limit', () => {
      // Create a sheet with more columns than MAX_PREVIEW_COLS (15)
      const wideData = [
        Array(20).fill(null).map((_, i) => ({ v: `Col ${i}`, m: `Col ${i}` })),
      ]
      const wideSheet = createMockSheet({ data: wideData })

      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[wideSheet]}
        />
      )

      expect(screen.getByTestId('truncation-indicator')).toBeInTheDocument()
      expect(screen.getByText(/15 of 20 columns/)).toBeInTheDocument()
    })

    it('does not show truncation indicator for small datasets', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      expect(screen.queryByTestId('truncation-indicator')).not.toBeInTheDocument()
    })
  })

  describe('export actions', () => {
    it('calls onExport with correct format when clicking export button', () => {
      const onExport = vi.fn()
      render(<ExportPreviewDialog {...defaultProps} onExport={onExport} />)

      // Select PDF format
      fireEvent.click(screen.getByTestId('format-pdf'))

      // Click export button
      fireEvent.click(screen.getByTestId('export-button'))

      expect(onExport).toHaveBeenCalledWith('pdf', false)
    })

    it('calls onExport with allSheets=true when clicking export all button', () => {
      const onExport = vi.fn()
      const sheets = [
        createMockSheet({ id: 'sheet-1', name: 'Sheet 1' }),
        createMockSheet({ id: 'sheet-2', name: 'Sheet 2' }),
      ]
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={sheets}
          onExport={onExport}
        />
      )

      // Click export all button
      fireEvent.click(screen.getByTestId('export-all-button'))

      expect(onExport).toHaveBeenCalledWith('excel', true)
    })

    it('hides export all button when CSV format is selected', () => {
      const sheets = [
        createMockSheet({ id: 'sheet-1', name: 'Sheet 1' }),
        createMockSheet({ id: 'sheet-2', name: 'Sheet 2' }),
      ]
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={sheets}
        />
      )

      // Initially export all button is visible
      expect(screen.getByTestId('export-all-button')).toBeInTheDocument()

      // Select CSV format
      fireEvent.click(screen.getByTestId('format-csv'))

      // Export all button should be hidden
      expect(screen.queryByTestId('export-all-button')).not.toBeInTheDocument()
    })

    it('hides export all button for single sheet', () => {
      render(<ExportPreviewDialog {...defaultProps} />)
      expect(screen.queryByTestId('export-all-button')).not.toBeInTheDocument()
    })

    it('closes dialog after export', () => {
      const onOpenChange = vi.fn()
      render(<ExportPreviewDialog {...defaultProps} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('export-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('cancel button', () => {
    it('calls onOpenChange(false) when clicking cancel', () => {
      const onOpenChange = vi.fn()
      render(<ExportPreviewDialog {...defaultProps} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('dialog close', () => {
    it('calls onOpenChange with false when closing via cancel', () => {
      const onOpenChange = vi.fn()
      const sheets = [
        createMockSheet({ id: 'sheet-1', name: 'Sheet 1', data: [[{ v: 'Data1', m: 'Data1' }]] }),
        createMockSheet({ id: 'sheet-2', name: 'Sheet 2', data: [[{ v: 'Data2', m: 'Data2' }]] }),
      ]
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={sheets}
          activeSheetId="sheet-1"
          onOpenChange={onOpenChange}
        />
      )

      // Switch to sheet 2
      fireEvent.click(screen.getByTestId('sheet-tab-sheet-2'))
      expect(screen.getByText('Data2')).toBeInTheDocument()

      // Close dialog via cancel
      fireEvent.click(screen.getByTestId('cancel-button'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('edge cases', () => {
    it('handles null/undefined cells gracefully', () => {
      const sheetWithNulls = createMockSheet({
        data: [
          [{ v: 'Header', m: 'Header' }, null, undefined],
          [null, { v: 'Value', m: 'Value' }, undefined],
        ] as SheetConfig['data'],
      })

      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[sheetWithNulls]}
        />
      )

      // Should render without errors
      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
    })

    it('handles empty activeSheetId', () => {
      render(
        <ExportPreviewDialog
          {...defaultProps}
          activeSheetId={null}
        />
      )

      // Should default to first sheet
      expect(screen.getByText('SKU')).toBeInTheDocument()
    })

    it('handles empty sheets array', () => {
      render(
        <ExportPreviewDialog
          {...defaultProps}
          sheets={[]}
          activeSheetId={null}
        />
      )

      expect(screen.getByText('No sheet selected')).toBeInTheDocument()
    })
  })
})
