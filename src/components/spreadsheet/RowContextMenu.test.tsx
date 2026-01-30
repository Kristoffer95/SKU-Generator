import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RowContextMenu, RowContextMenuPosition } from './RowContextMenu'

describe('RowContextMenu', () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    onClose: mockOnClose,
    onDelete: mockOnDelete,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders nothing when position is null', () => {
      render(
        <RowContextMenu
          {...defaultProps}
          position={null}
          rowIndex={1}
        />
      )
      expect(screen.queryByTestId('row-context-menu')).not.toBeInTheDocument()
    })

    it('renders context menu when position provided and rowIndex >= 0', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      // Row 0 is now a valid data row (no header row)
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={0}
        />
      )
      expect(screen.getByTestId('row-context-menu')).toBeInTheDocument()
    })

    it('renders context menu for any valid row index', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={1}
        />
      )
      expect(screen.getByTestId('row-context-menu')).toBeInTheDocument()
    })

    it('renders at correct position', () => {
      const position: RowContextMenuPosition = { x: 150, y: 200 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={1}
        />
      )
      const menu = screen.getByTestId('row-context-menu')
      expect(menu).toHaveStyle({ left: '150px', top: '200px' })
    })
  })

  describe('menu options', () => {
    it('renders "Delete row" option', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={1}
        />
      )
      expect(screen.getByTestId('context-menu-delete-row')).toBeInTheDocument()
      expect(screen.getByText('Delete row')).toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onDelete with rowIndex when "Delete row" clicked', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={5}
        />
      )
      fireEvent.click(screen.getByTestId('context-menu-delete-row'))
      expect(mockOnDelete).toHaveBeenCalledWith(5)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('passes correct rowIndex for different rows', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={10}
        />
      )
      fireEvent.click(screen.getByTestId('context-menu-delete-row'))
      expect(mockOnDelete).toHaveBeenCalledWith(10)
    })
  })

  describe('closing behavior', () => {
    it('closes on Escape key press', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={1}
        />
      )

      // Advance timers to add event listeners (component uses setTimeout(0))
      act(() => {
        vi.advanceTimersByTime(1)
      })

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes on click outside', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }

      const { container } = render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <RowContextMenu
            {...defaultProps}
            position={position}
            rowIndex={1}
          />
        </div>
      )

      // Advance timers to add event listeners (component uses setTimeout(0))
      act(() => {
        vi.advanceTimersByTime(1)
      })

      fireEvent.click(container)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper role attributes', () => {
      const position: RowContextMenuPosition = { x: 100, y: 100 }
      render(
        <RowContextMenu
          {...defaultProps}
          position={position}
          rowIndex={1}
        />
      )

      const menu = screen.getByTestId('row-context-menu')
      expect(menu).toHaveAttribute('role', 'menu')
      expect(menu).toHaveAttribute('aria-label', 'Row context menu')

      const menuItem = screen.getByRole('menuitem')
      expect(menuItem).toHaveTextContent('Delete row')
    })
  })
})
