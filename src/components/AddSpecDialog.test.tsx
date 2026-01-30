import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddSpecDialog } from './AddSpecDialog'
import { useSheetsStore } from '@/store/sheets'
import type { Specification } from '@/types'

/**
 * Helper to get specifications from the active sheet.
 */
function getActiveSheetSpecs(): Specification[] {
  const { sheets, activeSheetId } = useSheetsStore.getState()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  return activeSheet?.specifications ?? []
}

// Reset stores before each test
beforeEach(() => {
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
})

describe('AddSpecDialog', () => {
  it('renders dialog when open', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Specification' })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddSpecDialog open={false} onOpenChange={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows specification name input', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Specification Name')).toBeInTheDocument()
  })

  it('shows value and SKU code inputs', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Value 1 label')).toBeInTheDocument()
    expect(screen.getByLabelText('Value 1 SKU code')).toBeInTheDocument()
  })

  it('adds new value row when Add Value is clicked', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.click(screen.getByText('Add Value'))

    expect(screen.getByLabelText('Value 2 label')).toBeInTheDocument()
    expect(screen.getByLabelText('Value 2 SKU code')).toBeInTheDocument()
  })

  it('removes value row when trash button is clicked', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    // Add a second value
    fireEvent.click(screen.getByText('Add Value'))
    expect(screen.getByLabelText('Value 2 label')).toBeInTheDocument()

    // Remove first value
    fireEvent.click(screen.getByLabelText('Remove value 1'))
    expect(screen.queryByLabelText('Value 2 label')).not.toBeInTheDocument()
  })

  it('does not allow removing the last value row', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    const removeButton = screen.getByLabelText('Remove value 1')
    expect(removeButton).toBeDisabled()
  })

  it('shows error when submitting without specification name', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    // Add a value but no spec name
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Red' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Specification name is required')
  })

  it('shows error when submitting without any values', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    // Add spec name but no values
    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    expect(screen.getByRole('alert')).toHaveTextContent('At least one value with a label is required')
  })

  it('shows error when specification name already exists', () => {
    // Add existing spec to the sheet's specifications
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [],
          columns: [],
          specifications: [
            { id: 'spec-1', name: 'Color', order: 0, values: [{ id: 'v-1', displayValue: 'Red', skuFragment: 'R' }] },
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Blue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Specification "Color" already exists')
  })

  it('validates spec name case-insensitively', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [],
          columns: [],
          specifications: [
            { id: 'spec-1', name: 'Color', order: 0, values: [{ id: 'v-1', displayValue: 'Red', skuFragment: 'R' }] },
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'COLOR' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Blue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Specification "COLOR" already exists')
  })

  it('adds specification to store on submit', () => {
    const onOpenChange = vi.fn()
    render(<AddSpecDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })
    fireEvent.change(screen.getByLabelText('Value 1 SKU code'), { target: { value: 'S' } })

    // Add another value
    fireEvent.click(screen.getByText('Add Value'))
    fireEvent.change(screen.getByLabelText('Value 2 label'), { target: { value: 'Large' } })
    fireEvent.change(screen.getByLabelText('Value 2 SKU code'), { target: { value: 'L' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = getActiveSheetSpecs()
    expect(specs).toHaveLength(1)
    expect(specs[0].name).toBe('Size')
    expect(specs[0].values).toHaveLength(2)
    expect(specs[0].values[0].displayValue).toBe('Small')
    expect(specs[0].values[0].skuFragment).toBe('S')
    expect(specs[0].values[1].displayValue).toBe('Large')
    expect(specs[0].values[1].skuFragment).toBe('L')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('assigns order = max + 1 to new specification', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [],
          columns: [],
          specifications: [
            { id: 'spec-1', name: 'Color', order: 0, values: [] },
            { id: 'spec-2', name: 'Size', order: 1, values: [] },
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Material' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Cotton' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = getActiveSheetSpecs()
    const materialSpec = specs.find((s) => s.name === 'Material')
    expect(materialSpec?.order).toBe(2)
  })

  it('adds column to active data sheet on submit', () => {
    // SKU is at column 0, Color is at column 1 (headers in columns array)
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            // Data rows only, no header row
            [{ v: 'R' }, { v: 'Red' }],
          ],
          columns: [
            { id: 'col-0', type: 'sku', header: 'SKU' },
            { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-color' },
          ],
          specifications: [],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })
    fireEvent.change(screen.getByLabelText('Value 1 SKU code'), { target: { value: 'S' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // Headers are in columns array
    expect(dataSheet?.columns[0].header).toBe('SKU')
    expect(dataSheet?.columns[1].header).toBe('Color')
    expect(dataSheet?.columns[2].header).toBe('Size')
    // Data rows get new column appended
    expect(dataSheet?.data[0][0].v).toBe('R')
    expect(dataSheet?.data[0][1].v).toBe('Red')
    expect(dataSheet?.data[0][2]).toEqual({})
  })

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<AddSpecDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets form when dialog closes and reopens', () => {
    let isOpen = true
    const onOpenChange = (open: boolean) => { isOpen = open }

    const { rerender } = render(<AddSpecDialog open={isOpen} onOpenChange={onOpenChange} />)

    // Fill in some data
    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })

    // Close dialog by clicking Cancel (which triggers onOpenChange(false) -> resetForm)
    fireEvent.click(screen.getByText('Cancel'))

    // Reopen dialog
    isOpen = true
    rerender(<AddSpecDialog open={isOpen} onOpenChange={onOpenChange} />)

    // Form should be reset
    expect(screen.getByLabelText('Specification Name')).toHaveValue('')
  })

  it('handles empty data sheet correctly', () => {
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

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Red' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // Headers are in columns array
    expect(dataSheet?.columns[0].header).toBe('SKU')
    expect(dataSheet?.columns[1].header).toBe('Color')
    // Data array should still be empty (no header row)
    expect(dataSheet?.data).toHaveLength(0)
  })

  it('skips values with empty labels', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })
    fireEvent.change(screen.getByLabelText('Value 1 SKU code'), { target: { value: 'S' } })

    // Add second value but leave label empty
    fireEvent.click(screen.getByText('Add Value'))
    fireEvent.change(screen.getByLabelText('Value 2 SKU code'), { target: { value: 'X' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = getActiveSheetSpecs()
    // Only one value should be added (the one with a label)
    expect(specs[0].values).toHaveLength(1)
    expect(specs[0].values[0].displayValue).toBe('Small')
  })

  it('trims whitespace from spec name and values', () => {
    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: '  Size  ' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: '  Small  ' } })
    fireEvent.change(screen.getByLabelText('Value 1 SKU code'), { target: { value: '  S  ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = getActiveSheetSpecs()
    expect(specs[0].name).toBe('Size')
    expect(specs[0].values[0].displayValue).toBe('Small')
    expect(specs[0].values[0].skuFragment).toBe('S')
  })

  it('new spec appears at bottom of sidebar list', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [],
          columns: [],
          specifications: [
            { id: 'spec-1', name: 'Color', order: 0, values: [] },
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = getActiveSheetSpecs()
    // New spec should have higher order than existing
    const sizeSpec = specs.find((s) => s.name === 'Size')
    const colorSpec = specs.find((s) => s.name === 'Color')
    expect(sizeSpec?.order).toBeGreaterThan(colorSpec!.order)
  })

  it('SKU remains at column 0 when adding spec to sheet with existing specs', () => {
    // Sheet has SKU at column 0, Color at column 1, Size at column 2 (headers in columns array)
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            // Data rows only, no header row
            [{ v: 'R-S' }, { v: 'Red' }, { v: 'Small' }],
          ],
          columns: [
            { id: 'col-0', type: 'sku', header: 'SKU' },
            { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-color' },
            { id: 'col-2', type: 'spec', header: 'Size', specId: 'spec-size' },
          ],
          specifications: [],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Material' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Cotton' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // Headers are in columns array
    expect(dataSheet?.columns[0].header).toBe('SKU')
    expect(dataSheet?.columns[1].header).toBe('Color')
    expect(dataSheet?.columns[2].header).toBe('Size')
    expect(dataSheet?.columns[3].header).toBe('Material')
  })

  it('handles sheet with empty data row', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [], // Empty data row
          ],
          columns: [],
          specifications: [],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Red' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // Headers are in columns array
    expect(dataSheet?.columns[0].header).toBe('SKU')
    expect(dataSheet?.columns[1].header).toBe('Color')
    // Data row gets empty cells appended
    expect(dataSheet?.data[0][0]).toEqual({})
    expect(dataSheet?.data[0][1]).toEqual({})
  })

  it('existing data rows get empty cell appended at end for new spec', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            // Data rows only, no header row
            [{ v: 'R' }, { v: 'Red' }],
            [{ v: 'B' }, { v: 'Blue' }],
          ],
          columns: [
            { id: 'col-0', type: 'sku', header: 'SKU' },
            { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-color' },
          ],
          specifications: [],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // All data rows should have empty cell appended
    expect(dataSheet?.data[0]).toHaveLength(3)
    expect(dataSheet?.data[0][2]).toEqual({})
    expect(dataSheet?.data[1]).toHaveLength(3)
    expect(dataSheet?.data[1][2]).toEqual({})
  })
})
