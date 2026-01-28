import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ColumnHeaderContextMenu, ContextMenuPosition } from './ColumnHeaderContextMenu'
import type { ColumnDef } from '@/types'

describe('ColumnHeaderContextMenu', () => {
  const mockOnClose = vi.fn()
  const mockOnInsertBefore = vi.fn()
  const mockOnInsertAfter = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    onClose: mockOnClose,
    onInsertBefore: mockOnInsertBefore,
    onInsertAfter: mockOnInsertAfter,
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
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={null}
          column={null}
          columnIndex={0}
        />
      )
      expect(screen.queryByTestId('column-context-menu')).not.toBeInTheDocument()
    })

    it('renders nothing when column is null', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={null}
          columnIndex={0}
        />
      )
      expect(screen.queryByTestId('column-context-menu')).not.toBeInTheDocument()
    })

    it('renders context menu when position and column are provided', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      expect(screen.getByTestId('column-context-menu')).toBeInTheDocument()
    })

    it('renders at correct position', () => {
      const position: ContextMenuPosition = { x: 150, y: 200 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      const menu = screen.getByTestId('column-context-menu')
      expect(menu).toHaveStyle({ left: '150px', top: '200px' })
    })
  })

  describe('menu options', () => {
    it('renders "Insert column before" option', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      expect(screen.getByTestId('context-menu-insert-before')).toBeInTheDocument()
      expect(screen.getByText('Insert column before')).toBeInTheDocument()
    })

    it('renders "Insert column after" option', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      expect(screen.getByTestId('context-menu-insert-after')).toBeInTheDocument()
      expect(screen.getByText('Insert column after')).toBeInTheDocument()
    })

    it('renders "Delete column" option for spec columns', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
      expect(screen.getByText('Delete column')).toBeInTheDocument()
    })

    it('renders "Delete column" option for free columns', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'free', header: 'Notes' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )
      expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
    })

    it('does NOT render "Delete column" option for SKU column', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-0', type: 'sku', header: 'SKU' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={0}
        />
      )
      expect(screen.queryByTestId('context-menu-delete')).not.toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onInsertBefore with column index when "Insert column before" clicked', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={2}
        />
      )
      fireEvent.click(screen.getByTestId('context-menu-insert-before'))
      expect(mockOnInsertBefore).toHaveBeenCalledWith(2)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onInsertAfter with column index when "Insert column after" clicked', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={2}
        />
      )
      fireEvent.click(screen.getByTestId('context-menu-insert-after'))
      expect(mockOnInsertAfter).toHaveBeenCalledWith(2)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onDelete with column index and column when "Delete column" clicked', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={2}
        />
      )
      fireEvent.click(screen.getByTestId('context-menu-delete'))
      expect(mockOnDelete).toHaveBeenCalledWith(2, column)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('closing behavior', () => {
    it('closes on Escape key press', () => {
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
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
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }

      const { container } = render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <ColumnHeaderContextMenu
            {...defaultProps}
            position={position}
            column={column}
            columnIndex={1}
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
      const position: ContextMenuPosition = { x: 100, y: 100 }
      const column: ColumnDef = { id: 'col-1', type: 'spec', header: 'Color', specId: 'spec-1' }
      render(
        <ColumnHeaderContextMenu
          {...defaultProps}
          position={position}
          column={column}
          columnIndex={1}
        />
      )

      const menu = screen.getByTestId('column-context-menu')
      expect(menu).toHaveAttribute('role', 'menu')
      expect(menu).toHaveAttribute('aria-label', 'Column context menu')

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems.length).toBeGreaterThanOrEqual(2) // At least insert before and after
    })
  })
})
