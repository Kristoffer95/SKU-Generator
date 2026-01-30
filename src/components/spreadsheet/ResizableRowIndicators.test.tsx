import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResizableRowIndicators, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT } from './ResizableRowIndicators'

describe('ResizableRowIndicators', () => {
  const defaultProps = {
    rowCount: 5,
    onRowResize: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render resize handles for each row', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`row-resize-handle-${i}`)).toBeInTheDocument()
      }
    })

    it('should not render when rowCount is 0', () => {
      render(<ResizableRowIndicators {...defaultProps} rowCount={0} />)
      expect(screen.queryByTestId('resizable-row-indicators')).not.toBeInTheDocument()
    })

    it('should not render when no interactive callbacks are provided', () => {
      render(<ResizableRowIndicators rowCount={5} />)
      expect(screen.queryByTestId('resizable-row-indicators')).not.toBeInTheDocument()
    })

    it('should render when only row dropdown callbacks are provided', () => {
      render(
        <ResizableRowIndicators
          rowCount={5}
          onInsertRowAbove={vi.fn()}
          onInsertRowBelow={vi.fn()}
          onDeleteRow={vi.fn()}
        />
      )
      expect(screen.getByTestId('resizable-row-indicators')).toBeInTheDocument()
    })

    it('should render row dropdown menus for each row', () => {
      render(
        <ResizableRowIndicators
          rowCount={3}
          onInsertRowAbove={vi.fn()}
          onInsertRowBelow={vi.fn()}
          onDeleteRow={vi.fn()}
        />
      )

      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`row-dropdown-area-${i}`)).toBeInTheDocument()
        expect(screen.getByTestId(`row-menu-trigger-${i}`)).toBeInTheDocument()
      }
    })

    it('should not render resize handles when only row operations provided', () => {
      render(
        <ResizableRowIndicators
          rowCount={3}
          onInsertRowAbove={vi.fn()}
          onInsertRowBelow={vi.fn()}
          onDeleteRow={vi.fn()}
        />
      )

      expect(screen.queryByTestId('row-resize-handle-0')).not.toBeInTheDocument()
    })

    it('should use default row height when rowHeights is empty', () => {
      render(<ResizableRowIndicators {...defaultProps} rowHeights={{}} />)

      // Component should render without errors
      expect(screen.getByTestId('resizable-row-indicators')).toBeInTheDocument()
    })

    it('should use custom row heights when provided', () => {
      const rowHeights = { 1: 50, 3: 75 }
      render(<ResizableRowIndicators {...defaultProps} rowHeights={rowHeights} />)

      expect(screen.getByTestId('resizable-row-indicators')).toBeInTheDocument()
    })

    it('should have correct width based on width prop', () => {
      render(<ResizableRowIndicators {...defaultProps} width={60} />)

      const container = screen.getByTestId('resizable-row-indicators')
      expect(container).toHaveStyle({ width: '60px' })
    })
  })

  describe('resize interactions', () => {
    let mockAddEventListener: ReturnType<typeof vi.spyOn>
    let mockRemoveEventListener: ReturnType<typeof vi.spyOn>
    let mouseMoveHandler: ((e: MouseEvent) => void) | undefined
    let mouseUpHandler: (() => void) | undefined

    beforeEach(() => {
      mockAddEventListener = vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'mousemove') {
          mouseMoveHandler = handler as (e: MouseEvent) => void
        } else if (event === 'mouseup') {
          mouseUpHandler = handler as () => void
        }
      })
      mockRemoveEventListener = vi.spyOn(document, 'removeEventListener')
    })

    afterEach(() => {
      mockAddEventListener.mockRestore()
      mockRemoveEventListener.mockRestore()
      mouseMoveHandler = undefined
      mouseUpHandler = undefined
    })

    it('should start resize on mousedown', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.mouseDown(handle, { clientY: 100 })

      expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should update row height on mouse move during resize', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.mouseDown(handle, { clientY: 100 })

      // Simulate mouse move
      if (mouseMoveHandler) {
        mouseMoveHandler({ clientY: 120 } as MouseEvent)
      }

      // Default height (32) + delta (20) = 52
      expect(defaultProps.onRowResize).toHaveBeenCalledWith(1, DEFAULT_ROW_HEIGHT + 20)
    })

    it('should enforce minimum height during resize', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.mouseDown(handle, { clientY: 100 })

      // Simulate mouse move that would result in height below minimum
      if (mouseMoveHandler) {
        mouseMoveHandler({ clientY: 50 } as MouseEvent) // Delta of -50
      }

      // Should clamp to minimum height
      expect(defaultProps.onRowResize).toHaveBeenCalledWith(1, MIN_ROW_HEIGHT)
    })

    it('should clean up event listeners on mouseup', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.mouseDown(handle, { clientY: 100 })

      // Simulate mouse up
      if (mouseUpHandler) {
        mouseUpHandler()
      }

      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should use custom row height as starting point for resize', () => {
      const rowHeights = { 1: 50 }
      render(<ResizableRowIndicators {...defaultProps} rowHeights={rowHeights} />)

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.mouseDown(handle, { clientY: 100 })

      // Simulate mouse move
      if (mouseMoveHandler) {
        mouseMoveHandler({ clientY: 110 } as MouseEvent)
      }

      // Custom height (50) + delta (10) = 60
      expect(defaultProps.onRowResize).toHaveBeenCalledWith(1, 60)
    })
  })

  describe('auto-fit (double-click)', () => {
    it('should call onRowResize on double-click', () => {
      const mockRef = {
        current: {
          querySelector: vi.fn().mockReturnValue(null),
        },
      }

      render(
        <ResizableRowIndicators
          {...defaultProps}
          spreadsheetRef={mockRef as unknown as React.RefObject<HTMLDivElement>}
        />
      )

      const handle = screen.getByTestId('row-resize-handle-1')
      fireEvent.doubleClick(handle)

      // Without finding the row, it won't resize
      expect(mockRef.current.querySelector).toHaveBeenCalledWith('tbody')
    })
  })

  describe('accessibility', () => {
    it('should have aria-label on resize handles', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-0')
      expect(handle).toHaveAttribute('aria-label', 'Resize row 1')
    })

    it('should have row-resize cursor on handles', () => {
      render(<ResizableRowIndicators {...defaultProps} />)

      const handle = screen.getByTestId('row-resize-handle-0')
      expect(handle).toHaveClass('cursor-row-resize')
    })
  })
})
