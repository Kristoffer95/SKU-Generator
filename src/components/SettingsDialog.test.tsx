import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import { useSettingsStore } from '@/store/settings'
import { useSheetsStore } from '@/store/sheets'
import { useSpecificationsStore } from '@/store/specifications'

// Reset stores before each test
beforeEach(() => {
  useSettingsStore.setState({
    delimiter: '-',
    prefix: '',
    suffix: '',
  })
  useSheetsStore.setState({
    sheets: [],
    activeSheetId: null,
  })
  useSpecificationsStore.setState({
    specifications: [],
  })
})

describe('SettingsDialog', () => {
  it('renders dialog when open', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<SettingsDialog open={false} onOpenChange={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows delimiter options', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByText('Hyphen (-)')).toBeInTheDocument()
    expect(screen.getByText('Underscore (_)')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('shows prefix and suffix inputs', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByLabelText('SKU Prefix')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU Suffix')).toBeInTheDocument()
  })

  it('shows current settings values', () => {
    useSettingsStore.setState({
      delimiter: '-',
      prefix: 'PRE-',
      suffix: '-END',
    })
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByLabelText('SKU Prefix')).toHaveValue('PRE-')
    expect(screen.getByLabelText('SKU Suffix')).toHaveValue('-END')
  })

  it('updates settings when save is clicked', () => {
    const onOpenChange = vi.fn()
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)

    // Change prefix
    const prefixInput = screen.getByLabelText('SKU Prefix')
    fireEvent.change(prefixInput, { target: { value: 'NEW-' } })

    // Click save
    fireEvent.click(screen.getByText('Save changes'))

    // Verify settings updated
    expect(useSettingsStore.getState().prefix).toBe('NEW-')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows custom delimiter input when Custom is selected', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    fireEvent.click(screen.getByText('Custom'))

    expect(screen.getByPlaceholderText('Enter custom delimiter')).toBeInTheDocument()
  })

  it('selects underscore delimiter when clicked', () => {
    const onOpenChange = vi.fn()
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByText('Underscore (_)'))
    fireEvent.click(screen.getByText('Save changes'))

    expect(useSettingsStore.getState().delimiter).toBe('_')
  })

  it('recalculates SKUs in data sheets when settings change', () => {
    // Setup: Specifications in store and a data sheet with values
    // SKU is now at index 0 (Column A)
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'color',
          name: 'Color',
          order: 0,
          values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
        },
        {
          id: 'size',
          name: 'Size',
          order: 1,
          values: [{ id: 'v2', displayValue: 'Small', skuFragment: 'S' }],
        },
      ],
    })
    useSheetsStore.setState({
      sheets: [
        {
          id: 'data-1',
          name: 'Sheet 1',
          type: 'data',
          data: [
            [{ v: 'SKU' }, { v: 'Color' }, { v: 'Size' }],
            [{ v: 'R-S' }, { v: 'Red' }, { v: 'Small' }], // Old SKU with hyphen at index 0
          ],
        },
      ],
      activeSheetId: 'data-1',
    })

    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Change to underscore delimiter
    fireEvent.click(screen.getByText('Underscore (_)'))
    fireEvent.click(screen.getByText('Save changes'))

    // Check that SKU was recalculated at index 0
    const sheets = useSheetsStore.getState().sheets
    const dataSheet = sheets.find(s => s.id === 'data-1')
    expect(dataSheet?.data[1][0].v).toBe('R_S')
  })

  it('applies prefix and suffix to recalculated SKUs', () => {
    // SKU is now at index 0 (Column A)
    useSpecificationsStore.setState({
      specifications: [
        {
          id: 'color',
          name: 'Color',
          order: 0,
          values: [{ id: 'v1', displayValue: 'Red', skuFragment: 'R' }],
        },
      ],
    })
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

    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Set prefix and suffix
    fireEvent.change(screen.getByLabelText('SKU Prefix'), { target: { value: 'PRE-' } })
    fireEvent.change(screen.getByLabelText('SKU Suffix'), { target: { value: '-END' } })
    fireEvent.click(screen.getByText('Save changes'))

    const sheets = useSheetsStore.getState().sheets
    const dataSheet = sheets.find(s => s.id === 'data-1')
    expect(dataSheet?.data[1][0].v).toBe('PRE-R-END')
  })
})
