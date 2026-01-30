import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddColumnDialog } from './AddColumnDialog'
import { useSheetsStore } from '@/store/sheets'
import type { ColumnDef, Specification } from '@/types'

/**
 * Helper to get columns from the active sheet.
 */
function getActiveSheetColumns(): ColumnDef[] {
  const { sheets, activeSheetId } = useSheetsStore.getState()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  return activeSheet?.columns ?? []
}

/**
 * Helper to get specifications from the active sheet.
 */
function getActiveSheetSpecs(): Specification[] {
  const { sheets, activeSheetId } = useSheetsStore.getState()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  return activeSheet?.specifications ?? []
}

/**
 * Helper to get data from the active sheet.
 */
function getActiveSheetData() {
  const { sheets, activeSheetId } = useSheetsStore.getState()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  return activeSheet?.data ?? []
}

// Reset stores before each test
beforeEach(() => {
  useSheetsStore.setState({
    sheets: [
      {
        id: 'data-1',
        name: 'Sheet 1',
        type: 'data',
        data: [
          // Data rows only - no header row
          [{ v: '' }, { v: 'Red' }],
          [{ v: '' }, { v: 'Blue' }],
        ],
        columns: [
          { id: 'col-sku', type: 'sku', header: 'SKU' },
          { id: 'col-color', type: 'spec', specId: 'spec-color', header: 'Color' },
        ],
        specifications: [
          { id: 'spec-color', name: 'Color', order: 0, values: [
            { id: 'v-red', displayValue: 'Red', skuFragment: 'R' },
            { id: 'v-blue', displayValue: 'Blue', skuFragment: 'B' },
          ]},
        ],
      },
    ],
    activeSheetId: 'data-1',
  })
})

describe('AddColumnDialog', () => {
  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Add Column' })).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<AddColumnDialog open={false} onOpenChange={() => {}} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows column type toggle with Specification and Free options', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByTestId('column-type-spec')).toBeInTheDocument()
      expect(screen.getByTestId('column-type-free')).toBeInTheDocument()
    })

    it('defaults to Specification type', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      // Spec button should be default variant (not outline)
      const specButton = screen.getByTestId('column-type-spec')
      expect(specButton).toHaveClass('bg-primary')
    })

    it('shows spec selector dropdown', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByTestId('spec-selector')).toBeInTheDocument()
    })

    it('shows position selector dropdown', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByTestId('position-selector')).toBeInTheDocument()
    })
  })

  describe('Column Type Toggle', () => {
    it('switches to free type when Free button clicked', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))

      // Free button should now be active
      const freeButton = screen.getByTestId('column-type-free')
      expect(freeButton).toHaveClass('bg-primary')

      // Should show column name input for free columns
      expect(screen.getByTestId('free-column-name')).toBeInTheDocument()
    })

    it('hides spec selector when Free type selected', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))

      expect(screen.queryByTestId('spec-selector')).not.toBeInTheDocument()
    })

    it('shows spec selector when switching back to Specification type', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.click(screen.getByTestId('column-type-spec'))

      expect(screen.getByTestId('spec-selector')).toBeInTheDocument()
    })
  })

  describe('Spec Selector', () => {
    it('shows Create new option as first option', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('spec-selector')
      const options = selector.querySelectorAll('option')

      expect(options[0]).toHaveTextContent('Create new specification')
    })

    it('lists existing specifications', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('spec-selector')
      const options = selector.querySelectorAll('option')

      expect(options[1]).toHaveTextContent('Color')
    })

    it('shows new spec form when Create new selected', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Create new should be selected by default
      expect(screen.getByTestId('new-spec-name')).toBeInTheDocument()
    })

    it('hides new spec form when existing spec selected', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('spec-selector')
      fireEvent.change(selector, { target: { value: 'spec-color' } })

      expect(screen.queryByTestId('new-spec-name')).not.toBeInTheDocument()
    })
  })

  describe('New Spec Form', () => {
    it('shows spec name input', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByTestId('new-spec-name')).toBeInTheDocument()
    })

    it('shows value inputs', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)
      expect(screen.getByTestId('value-label-0')).toBeInTheDocument()
      expect(screen.getByTestId('value-sku-0')).toBeInTheDocument()
    })

    it('adds new value row when Add Value clicked', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('add-value-button'))

      expect(screen.getByTestId('value-label-1')).toBeInTheDocument()
      expect(screen.getByTestId('value-sku-1')).toBeInTheDocument()
    })

    it('removes value row when remove button clicked', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Add second value
      fireEvent.click(screen.getByTestId('add-value-button'))
      expect(screen.getByTestId('value-label-1')).toBeInTheDocument()

      // Remove first value
      fireEvent.click(screen.getByTestId('remove-value-0'))

      expect(screen.queryByTestId('value-label-1')).not.toBeInTheDocument()
    })

    it('disables remove button when only one value', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const removeButton = screen.getByTestId('remove-value-0')
      expect(removeButton).toBeDisabled()
    })
  })

  describe('Position Selector', () => {
    it('shows At end as first option', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('position-selector')
      const options = selector.querySelectorAll('option')

      expect(options[0]).toHaveTextContent('At end')
      expect(options[0]).toHaveValue('end')
    })

    it('shows Before options for non-SKU columns', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('position-selector')
      const options = selector.querySelectorAll('option')

      // Should have: At end, Before "Color"
      expect(options).toHaveLength(2)
      expect(options[1]).toHaveTextContent('Before "Color"')
    })

    it('does not show Before option for SKU column', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      const selector = screen.getByTestId('position-selector')
      const optionsText = Array.from(selector.querySelectorAll('option')).map(o => o.textContent)

      expect(optionsText).not.toContain('Before "SKU"')
    })

    it('uses defaultPosition when provided', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} defaultPosition={1} />)

      const selector = screen.getByTestId('position-selector') as HTMLSelectElement
      expect(selector.value).toBe('1')
    })
  })

  describe('Validation', () => {
    it('shows error when spec name empty for new spec', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Leave spec name empty, add a value
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('Specification name is required')
    })

    it('shows error when no values for new spec', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      // Leave value empty
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('At least one value with a label is required')
    })

    it('shows error when spec name already exists', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Color' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Green' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('Specification "Color" already exists')
    })

    it('validates spec name case-insensitively', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'COLOR' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Green' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('Specification "COLOR" already exists')
    })

    it('shows error when free column name empty', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('Column name is required')
    })

    it('shows error when free column name already exists', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Color' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('Column "Color" already exists')
    })
  })

  describe('Adding Spec Column with New Spec', () => {
    it('adds spec to specifications array', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.change(screen.getByTestId('value-sku-0'), { target: { value: 'S' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const specs = getActiveSheetSpecs()
      expect(specs).toHaveLength(2)
      const sizeSpec = specs.find(s => s.name === 'Size')
      expect(sizeSpec).toBeDefined()
      expect(sizeSpec?.values).toHaveLength(1)
      expect(sizeSpec?.values[0].displayValue).toBe('Small')
      expect(sizeSpec?.values[0].skuFragment).toBe('S')
    })

    it('adds column to columns array', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns).toHaveLength(3)
      expect(columns[2].type).toBe('spec')
      expect(columns[2].header).toBe('Size')
      expect(columns[2].specId).toBeDefined()
    })

    it('adds column header to columns array', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns).toHaveLength(3)
      expect(columns[2].header).toBe('Size')
    })

    it('adds empty cells to data rows', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const data = getActiveSheetData()
      // Data rows now start at index 0 (no header row)
      expect(data[0]).toHaveLength(3)
      expect(data[0][2]).toEqual({})
      expect(data[1]).toHaveLength(3)
      expect(data[1][2]).toEqual({})
    })
  })

  describe('Adding Spec Column with Existing Spec', () => {
    it('adds column with existing spec reference', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Select existing Color spec
      fireEvent.change(screen.getByTestId('spec-selector'), { target: { value: 'spec-color' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns).toHaveLength(3)
      expect(columns[2].type).toBe('spec')
      expect(columns[2].specId).toBe('spec-color')
      expect(columns[2].header).toBe('Color')
    })

    it('does not add duplicate spec to specifications array', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Select existing Color spec
      fireEvent.change(screen.getByTestId('spec-selector'), { target: { value: 'spec-color' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const specs = getActiveSheetSpecs()
      expect(specs).toHaveLength(1) // Still just one spec
    })
  })

  describe('Adding Free Column', () => {
    it('adds free column to columns array', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns).toHaveLength(3)
      expect(columns[2].type).toBe('free')
      expect(columns[2].header).toBe('Notes')
      expect(columns[2].specId).toBeUndefined()
    })

    it('adds column header to columns and empty cells to data', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      // Header is now in columns array
      const columns = getActiveSheetColumns()
      expect(columns[2].header).toBe('Notes')

      // Data rows have empty cells
      const data = getActiveSheetData()
      expect(data[0][2]).toEqual({})
      expect(data[1][2]).toEqual({})
    })
  })

  describe('Position Selection', () => {
    it('inserts column at end when At end selected', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      // Position is 'end' by default
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns[2].header).toBe('Notes')
    })

    it('inserts column before selected column', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      // Select 'Before "Color"' (index 1)
      fireEvent.change(screen.getByTestId('position-selector'), { target: { value: '1' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns[1].header).toBe('Notes')
      expect(columns[2].header).toBe('Color')
    })

    it('inserts data at correct position', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.change(screen.getByTestId('position-selector'), { target: { value: '1' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      // Headers are in columns array
      const columns = getActiveSheetColumns()
      expect(columns[0].header).toBe('SKU')
      expect(columns[1].header).toBe('Notes')
      expect(columns[2].header).toBe('Color')

      // Data rows only contain values, no header row
      const data = getActiveSheetData()
      expect(data[0][1]).toEqual({})
      expect(data[0][2].v).toBe('Red')
    })
  })

  describe('Dialog Behavior', () => {
    it('calls onOpenChange(false) when Cancel clicked', () => {
      const onOpenChange = vi.fn()
      render(<AddColumnDialog open={true} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onOpenChange(false) after successful submit', () => {
      const onOpenChange = vi.fn()
      render(<AddColumnDialog open={true} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets form when dialog closes and reopens', () => {
      const { rerender } = render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Change to free type and enter name
      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })

      // Close and reopen
      rerender(<AddColumnDialog open={false} onOpenChange={() => {}} />)
      rerender(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      // Should be back to spec type
      expect(screen.getByTestId('spec-selector')).toBeInTheDocument()
      expect(screen.queryByTestId('free-column-name')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty sheet with no columns', () => {
      useSheetsStore.setState({
        sheets: [
          {
            id: 'data-1',
            name: 'Sheet 1',
            type: 'data',
            data: [],
            columns: [],
            specifications: [],
          },
        ],
        activeSheetId: 'data-1',
      })

      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns).toHaveLength(1)
      expect(columns[0].header).toBe('Notes')
    })

    it('trims whitespace from names', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: '  Notes  ' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      const columns = getActiveSheetColumns()
      expect(columns[2].header).toBe('Notes')
    })

    it('skips values with empty labels for new spec', () => {
      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.change(screen.getByTestId('new-spec-name'), { target: { value: 'Size' } })
      fireEvent.change(screen.getByTestId('value-label-0'), { target: { value: 'Small' } })
      fireEvent.change(screen.getByTestId('value-sku-0'), { target: { value: 'S' } })

      // Add second value with empty label
      fireEvent.click(screen.getByTestId('add-value-button'))
      fireEvent.change(screen.getByTestId('value-sku-1'), { target: { value: 'X' } })

      fireEvent.click(screen.getByTestId('submit-button'))

      const specs = getActiveSheetSpecs()
      const sizeSpec = specs.find(s => s.name === 'Size')
      expect(sizeSpec?.values).toHaveLength(1)
    })

    it('handles no active sheet gracefully', () => {
      useSheetsStore.setState({
        sheets: [],
        activeSheetId: null,
      })

      render(<AddColumnDialog open={true} onOpenChange={() => {}} />)

      fireEvent.click(screen.getByTestId('column-type-free'))
      fireEvent.change(screen.getByTestId('free-column-name'), { target: { value: 'Notes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('error-message')).toHaveTextContent('No active sheet')
    })
  })
})
