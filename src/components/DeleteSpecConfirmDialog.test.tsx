import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteSpecConfirmDialog } from './DeleteSpecConfirmDialog'
import type { Specification, ColumnDef } from '@/types'

describe('DeleteSpecConfirmDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
    columns: [] as ColumnDef[],
  }

  const sampleSpec: Specification = {
    id: 'spec-1',
    name: 'Color',
    order: 0,
    values: [
      { id: 'val-1', displayValue: 'Red', skuFragment: 'RD' },
      { id: 'val-2', displayValue: 'Blue', skuFragment: 'BL' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when spec is null', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={null}
        />
      )
      expect(screen.queryByTestId('delete-spec-dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open and spec provided', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      expect(screen.getByTestId('delete-spec-dialog')).toBeInTheDocument()
    })

    it('displays spec name in the dialog', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      expect(screen.getByText(/Color/)).toBeInTheDocument()
    })

    it('displays dialog title', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      expect(screen.getByText('Delete Specification')).toBeInTheDocument()
    })
  })

  describe('column warnings', () => {
    it('shows message when no columns reference the spec', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
          columns={[]}
        />
      )
      expect(screen.getByText(/not currently used by any columns/)).toBeInTheDocument()
    })

    it('shows warning when 1 column references the spec', () => {
      const columns: ColumnDef[] = [
        { id: 'col-1', type: 'sku', header: 'SKU' },
        { id: 'col-2', type: 'spec', header: 'Color', specId: 'spec-1' },
      ]
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
          columns={columns}
        />
      )
      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
      expect(screen.getByText(/1 column uses this specification/)).toBeInTheDocument()
    })

    it('shows warning when multiple columns reference the spec', () => {
      const columns: ColumnDef[] = [
        { id: 'col-1', type: 'sku', header: 'SKU' },
        { id: 'col-2', type: 'spec', header: 'Color', specId: 'spec-1' },
        { id: 'col-3', type: 'spec', header: 'Secondary Color', specId: 'spec-1' },
      ]
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
          columns={columns}
        />
      )
      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
      expect(screen.getByText(/2 columns use this specification/)).toBeInTheDocument()
    })

    it('does not count columns referencing different specs', () => {
      const columns: ColumnDef[] = [
        { id: 'col-1', type: 'sku', header: 'SKU' },
        { id: 'col-2', type: 'spec', header: 'Color', specId: 'spec-1' },
        { id: 'col-3', type: 'spec', header: 'Size', specId: 'spec-2' },
      ]
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
          columns={columns}
        />
      )
      expect(screen.getByText(/1 column uses this specification/)).toBeInTheDocument()
    })

    it('does not count free columns', () => {
      const columns: ColumnDef[] = [
        { id: 'col-1', type: 'sku', header: 'SKU' },
        { id: 'col-2', type: 'free', header: 'Notes' },
      ]
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
          columns={columns}
        />
      )
      expect(screen.getByText(/not currently used by any columns/)).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('renders Cancel button', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      expect(screen.getByTestId('delete-spec-cancel')).toBeInTheDocument()
      expect(screen.getByTestId('delete-spec-cancel')).toHaveTextContent('Cancel')
    })

    it('renders Delete button with destructive styling', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      const deleteButton = screen.getByTestId('delete-spec-confirm')
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton).toHaveTextContent('Delete')
    })
  })

  describe('callbacks', () => {
    it('calls onOpenChange(false) when Cancel clicked', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      fireEvent.click(screen.getByTestId('delete-spec-cancel'))
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onConfirm when Delete clicked', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      fireEvent.click(screen.getByTestId('delete-spec-confirm'))
      expect(mockOnConfirm).toHaveBeenCalled()
    })

    it('calls onOpenChange(false) after onConfirm', () => {
      render(
        <DeleteSpecConfirmDialog
          {...defaultProps}
          spec={sampleSpec}
        />
      )
      fireEvent.click(screen.getByTestId('delete-spec-confirm'))
      expect(mockOnConfirm).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
