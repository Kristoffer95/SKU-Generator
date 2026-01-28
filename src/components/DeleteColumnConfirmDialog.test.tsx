import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteColumnConfirmDialog } from './DeleteColumnConfirmDialog'
import type { ColumnDef } from '@/types'

describe('DeleteColumnConfirmDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when column is null', () => {
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={null}
        />
      )
      expect(screen.queryByTestId('delete-column-dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open and column provided', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByTestId('delete-column-dialog')).toBeInTheDocument()
    })

    it('displays column name in the dialog', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'My Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByText(/My Notes/)).toBeInTheDocument()
    })
  })

  describe('spec column warning', () => {
    it('shows warning for spec columns', () => {
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
      expect(screen.getByText(/specification column/i)).toBeInTheDocument()
    })

    it('does NOT show spec warning for free columns', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/specification column/i)).not.toBeInTheDocument()
    })

    it('shows data loss warning for free columns', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByText(/All data in this column will be permanently removed/)).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('renders Cancel button', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByTestId('delete-column-cancel')).toBeInTheDocument()
      expect(screen.getByTestId('delete-column-cancel')).toHaveTextContent('Cancel')
    })

    it('renders Delete button', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      expect(screen.getByTestId('delete-column-confirm')).toBeInTheDocument()
      expect(screen.getByTestId('delete-column-confirm')).toHaveTextContent('Delete')
    })
  })

  describe('callbacks', () => {
    it('calls onOpenChange(false) when Cancel clicked', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      fireEvent.click(screen.getByTestId('delete-column-cancel'))
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onConfirm and onOpenChange(false) when Delete clicked', () => {
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <DeleteColumnConfirmDialog
          {...defaultProps}
          column={column}
        />
      )
      fireEvent.click(screen.getByTestId('delete-column-confirm'))
      expect(mockOnConfirm).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
