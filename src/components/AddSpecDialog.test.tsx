import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddSpecDialog } from './AddSpecDialog'
import { useSheetsStore } from '@/store/sheets'
import { useSpecificationsStore } from '@/store/specifications'

// Reset stores before each test
beforeEach(() => {
  useSpecificationsStore.setState({
    specifications: [],
  })
  useSheetsStore.setState({
    sheets: [
      {
        id: 'data-1',
        name: 'Sheet 1',
        type: 'data',
        data: [],
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
    // Add existing spec to specifications store
    useSpecificationsStore.setState({
      specifications: [
        { id: 'spec-1', name: 'Color', order: 0, values: [{ id: 'v-1', displayValue: 'Red', skuFragment: 'R' }] },
      ],
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Blue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Specification "Color" already exists')
  })

  it('validates spec name case-insensitively', () => {
    useSpecificationsStore.setState({
      specifications: [
        { id: 'spec-1', name: 'Color', order: 0, values: [{ id: 'v-1', displayValue: 'Red', skuFragment: 'R' }] },
      ],
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

    const specs = useSpecificationsStore.getState().specifications
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
    useSpecificationsStore.setState({
      specifications: [
        { id: 'spec-1', name: 'Color', order: 0, values: [] },
        { id: 'spec-2', name: 'Size', order: 1, values: [] },
      ],
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Material' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Cotton' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = useSpecificationsStore.getState().specifications
    const materialSpec = specs.find((s) => s.name === 'Material')
    expect(materialSpec?.order).toBe(2)
  })

  it('adds column to active data sheet on submit', () => {
    // SKU is at column 0, Color is at column 1
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [{ v: 'SKU' }, { v: 'Color' }],
            [{ v: 'R' }, { v: 'Red' }],
          ],
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
    // SKU stays at column 0, new spec is appended at the end
    expect(dataSheet?.data[0][0].v).toBe('SKU')
    expect(dataSheet?.data[0][1].v).toBe('Color')
    expect(dataSheet?.data[0][2].v).toBe('Size')
    // Data rows also get new column appended
    expect(dataSheet?.data[1][0].v).toBe('R')
    expect(dataSheet?.data[1][1].v).toBe('Red')
    expect(dataSheet?.data[1][2]).toEqual({})
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
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Red' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // Should create header row with SKU at column 0 and spec name at column 1
    expect(dataSheet?.data[0][0].v).toBe('SKU')
    expect(dataSheet?.data[0][1].v).toBe('Color')
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

    const specs = useSpecificationsStore.getState().specifications
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

    const specs = useSpecificationsStore.getState().specifications
    expect(specs[0].name).toBe('Size')
    expect(specs[0].values[0].displayValue).toBe('Small')
    expect(specs[0].values[0].skuFragment).toBe('S')
  })

  it('new spec appears at bottom of sidebar list', () => {
    useSpecificationsStore.setState({
      specifications: [
        { id: 'spec-1', name: 'Color', order: 0, values: [] },
      ],
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Size' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Small' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const specs = useSpecificationsStore.getState().specifications
    // New spec should have higher order than existing
    const sizeSpec = specs.find((s) => s.name === 'Size')
    const colorSpec = specs.find((s) => s.name === 'Color')
    expect(sizeSpec?.order).toBeGreaterThan(colorSpec!.order)
  })

  it('SKU remains at column 0 when adding spec to sheet with existing specs', () => {
    // Sheet has SKU at column 0, Color at column 1, Size at column 2
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
            [{ v: 'R-S' }, { v: 'Red' }, { v: 'Small' }],
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Material' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Cotton' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // SKU must stay at column 0
    expect(dataSheet?.data[0][0].v).toBe('SKU')
    // Existing specs remain in place
    expect(dataSheet?.data[0][1].v).toBe('Color')
    expect(dataSheet?.data[0][2].v).toBe('Size')
    // New spec appended at the end
    expect(dataSheet?.data[0][3].v).toBe('Material')
  })

  it('handles sheet with empty header row', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [], // Empty header row
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<AddSpecDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Specification Name'), { target: { value: 'Color' } })
    fireEvent.change(screen.getByLabelText('Value 1 label'), { target: { value: 'Red' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Specification' }))

    const dataSheet = useSheetsStore.getState().sheets.find((s) => s.id === 'data-1')
    // SKU at column 0, new spec at column 1
    expect(dataSheet?.data[0][0].v).toBe('SKU')
    expect(dataSheet?.data[0][1].v).toBe('Color')
  })

  it('existing data rows get empty cell appended at end for new spec', () => {
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [{ v: 'SKU' }, { v: 'Color' }],
            [{ v: 'R' }, { v: 'Red' }],
            [{ v: 'B' }, { v: 'Blue' }],
          ],
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
    expect(dataSheet?.data[1]).toHaveLength(3)
    expect(dataSheet?.data[1][2]).toEqual({})
    expect(dataSheet?.data[2]).toHaveLength(3)
    expect(dataSheet?.data[2][2]).toEqual({})
  })
})
