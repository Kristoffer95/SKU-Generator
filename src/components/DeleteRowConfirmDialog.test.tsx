import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteRowConfirmDialog } from './DeleteRowConfirmDialog'

describe('DeleteRowConfirmDialog', () => {
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
    it('renders nothing when rowIndex is null', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={null}
        />
      )
      expect(screen.queryByTestId('delete-row-dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open and rowIndex provided', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      expect(screen.getByTestId('delete-row-dialog')).toBeInTheDocument()
    })

    it('displays row number in the dialog', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={5}
        />
      )
      expect(screen.getByText(/row 5/i)).toBeInTheDocument()
    })

    it('shows data loss warning', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      expect(screen.getByText(/All data in this row will be permanently removed/)).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('renders Cancel button', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      expect(screen.getByTestId('delete-row-cancel')).toBeInTheDocument()
      expect(screen.getByTestId('delete-row-cancel')).toHaveTextContent('Cancel')
    })

    it('renders Delete button', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      expect(screen.getByTestId('delete-row-confirm')).toBeInTheDocument()
      expect(screen.getByTestId('delete-row-confirm')).toHaveTextContent('Delete')
    })
  })

  describe('callbacks', () => {
    it('calls onOpenChange(false) when Cancel clicked', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      fireEvent.click(screen.getByTestId('delete-row-cancel'))
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onConfirm and onOpenChange(false) when Delete clicked', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={1}
        />
      )
      fireEvent.click(screen.getByTestId('delete-row-confirm'))
      expect(mockOnConfirm).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('different row numbers', () => {
    it('displays row number correctly for row 3', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={3}
        />
      )
      expect(screen.getByText(/row 3/i)).toBeInTheDocument()
    })

    it('displays row number correctly for row 100', () => {
      render(
        <DeleteRowConfirmDialog
          {...defaultProps}
          rowIndex={100}
        />
      )
      expect(screen.getByText(/row 100/i)).toBeInTheDocument()
    })
  })
})
