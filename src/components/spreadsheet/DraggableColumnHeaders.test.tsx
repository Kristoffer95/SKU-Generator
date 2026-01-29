import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DraggableColumnHeaders } from "./DraggableColumnHeaders"
import type { ColumnDef } from "@/types"

const createColumns = (): ColumnDef[] => [
  { id: "col-1", type: "sku", header: "SKU" },
  { id: "col-2", type: "spec", specId: "spec-1", header: "Color" },
  { id: "col-3", type: "spec", specId: "spec-2", header: "Size" },
  { id: "col-4", type: "free", header: "Notes" },
]

describe("DraggableColumnHeaders", () => {
  let mockOnReorder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnReorder = vi.fn()
  })

  it("renders all column headers", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    expect(screen.getByText("SKU")).toBeInTheDocument()
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("Notes")).toBeInTheDocument()
  })

  it("renders drag handles for non-SKU columns", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    // SKU column (index 0) should not have a drag handle
    expect(screen.queryByTestId("drag-handle-0")).not.toBeInTheDocument()

    // Spec and free columns should have drag handles
    expect(screen.getByTestId("drag-handle-1")).toBeInTheDocument()
    expect(screen.getByTestId("drag-handle-2")).toBeInTheDocument()
    expect(screen.getByTestId("drag-handle-3")).toBeInTheDocument()
  })

  it("marks SKU column as not draggable", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const skuHeader = screen.getByTestId("column-header-0")
    expect(skuHeader).toHaveAttribute("draggable", "false")
  })

  it("marks non-SKU columns as draggable", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")
    const sizeHeader = screen.getByTestId("column-header-2")
    const notesHeader = screen.getByTestId("column-header-3")

    expect(colorHeader).toHaveAttribute("draggable", "true")
    expect(sizeHeader).toHaveAttribute("draggable", "true")
    expect(notesHeader).toHaveAttribute("draggable", "true")
  })

  it("shows column type indicators for spec columns", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    // Spec columns should have "spec" indicator
    const specIndicators = screen.getAllByText("spec")
    expect(specIndicators).toHaveLength(2)
  })

  it("shows column type indicator for free columns", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    expect(screen.getByText("free")).toBeInTheDocument()
  })

  it("prevents drag start for SKU column", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const skuHeader = screen.getByTestId("column-header-0")

    const dragStartEvent = new Event("dragstart", { bubbles: true })
    Object.defineProperty(dragStartEvent, "preventDefault", { value: vi.fn() })
    Object.defineProperty(dragStartEvent, "dataTransfer", {
      value: { effectAllowed: "", setData: vi.fn() },
    })

    fireEvent(skuHeader, dragStartEvent)

    // Should prevent default because SKU column is not draggable
    expect(dragStartEvent.preventDefault).toHaveBeenCalled()
  })

  it("calls onReorder when a column is dropped on a valid target", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")
    const sizeHeader = screen.getByTestId("column-header-2")

    // Start drag on Color column (index 1)
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    })

    // Drag over Size column (index 2)
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: "" },
      preventDefault: vi.fn(),
    })

    // Drop on Size column
    fireEvent.drop(sizeHeader, {
      dataTransfer: { getData: () => "1" },
      preventDefault: vi.fn(),
    })

    // Should call onReorder with old index 1 and new index 2
    expect(mockOnReorder).toHaveBeenCalledWith(1, 2)
  })

  it("does not call onReorder when dropping on SKU column", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")
    const skuHeader = screen.getByTestId("column-header-0")

    // Start drag on Color column
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    })

    // Drop on SKU column
    fireEvent.drop(skuHeader, {
      dataTransfer: { getData: () => "1" },
      preventDefault: vi.fn(),
    })

    expect(mockOnReorder).not.toHaveBeenCalled()
  })

  it("does not call onReorder when dropping on same column", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")

    // Start drag on Color column
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    })

    // Drop on same column
    fireEvent.drop(colorHeader, {
      dataTransfer: { getData: () => "1" },
      preventDefault: vi.fn(),
    })

    expect(mockOnReorder).not.toHaveBeenCalled()
  })

  it("applies visual feedback when dragging over valid drop target", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")
    const sizeHeader = screen.getByTestId("column-header-2")

    // Start drag on Color column
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    })

    // Drag over Size column
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: "" },
      preventDefault: vi.fn(),
    })

    // Size header should have drop target styling (contains bg-primary/10)
    expect(sizeHeader).toHaveClass("bg-primary/10")
  })

  it("clears visual feedback on drag end", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    const colorHeader = screen.getByTestId("column-header-1")
    const sizeHeader = screen.getByTestId("column-header-2")

    // Start drag on Color column
    fireEvent.dragStart(colorHeader, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    })

    // Drag over Size column
    fireEvent.dragOver(sizeHeader, {
      dataTransfer: { dropEffect: "" },
      preventDefault: vi.fn(),
    })

    // End drag
    fireEvent.dragEnd(colorHeader)

    // Size header should no longer have drop target styling
    expect(sizeHeader).not.toHaveClass("bg-primary/10")
  })

  it("has accessible role attributes", () => {
    const columns = createColumns()
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    // Container should have role="row"
    const headerRow = screen.getByTestId("draggable-column-headers")
    expect(headerRow).toHaveAttribute("role", "row")
    expect(headerRow).toHaveAttribute("aria-label", "Column headers")

    // Each column header should have role="columnheader"
    const columnHeaders = screen.getAllByRole("columnheader")
    expect(columnHeaders).toHaveLength(4)
  })

  it("handles empty columns array", () => {
    render(<DraggableColumnHeaders columns={[]} onReorder={mockOnReorder} />)

    const headerRow = screen.getByTestId("draggable-column-headers")
    expect(headerRow).toBeInTheDocument()

    // Should only have the row indicator spacer, no column headers
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument()
  })

  it("shows column header truncated with title tooltip", () => {
    const columns: ColumnDef[] = [
      { id: "col-1", type: "sku", header: "SKU" },
      { id: "col-2", type: "free", header: "Very Long Column Header Name That Should Be Truncated" },
    ]
    render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

    // Free columns show "(double-click to rename)" hint in title
    const longHeader = screen.getByTitle("Very Long Column Header Name That Should Be Truncated (double-click to rename)")
    expect(longHeader).toBeInTheDocument()
  })

  describe("column resizing", () => {
    let mockOnColumnResize: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnColumnResize = vi.fn()
    })

    it("renders resize handles when onColumnResize is provided", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      // All columns should have resize handles
      expect(screen.getByTestId("resize-handle-0")).toBeInTheDocument()
      expect(screen.getByTestId("resize-handle-1")).toBeInTheDocument()
      expect(screen.getByTestId("resize-handle-2")).toBeInTheDocument()
      expect(screen.getByTestId("resize-handle-3")).toBeInTheDocument()
    })

    it("does not render resize handles when onColumnResize is not provided", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
        />
      )

      expect(screen.queryByTestId("resize-handle-0")).not.toBeInTheDocument()
      expect(screen.queryByTestId("resize-handle-1")).not.toBeInTheDocument()
    })

    it("uses column.width when provided", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU", width: 150 },
        { id: "col-2", type: "spec", specId: "spec-1", header: "Color", width: 200 },
      ]
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const skuHeader = screen.getByTestId("column-header-0")
      const colorHeader = screen.getByTestId("column-header-1")

      expect(skuHeader).toHaveStyle({ width: "150px" })
      expect(colorHeader).toHaveStyle({ width: "200px" })
    })

    it("uses defaultColumnWidth when column.width is not set", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU" },
      ]
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
          defaultColumnWidth={180}
        />
      )

      const skuHeader = screen.getByTestId("column-header-0")
      expect(skuHeader).toHaveStyle({ width: "180px" })
    })

    it("calls onColumnResize when dragging resize handle", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const resizeHandle = screen.getByTestId("resize-handle-1")

      // Simulate mousedown
      fireEvent.mouseDown(resizeHandle, { clientX: 100 })

      // Simulate mousemove on document
      fireEvent.mouseMove(document, { clientX: 150 })

      // Should call onColumnResize with new width (120 default + 50 delta = 170)
      // But minimum is 80, so expect the calculation to be based on default 120 + 50 = 170
      expect(mockOnColumnResize).toHaveBeenCalled()
    })

    it("enforces minimum column width of 80px", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU", width: 120 },
      ]
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const resizeHandle = screen.getByTestId("resize-handle-0")

      // Simulate mousedown
      fireEvent.mouseDown(resizeHandle, { clientX: 100 })

      // Simulate dragging far to the left (beyond minimum)
      fireEvent.mouseMove(document, { clientX: 0 })

      // Should call onColumnResize with minimum width 80
      expect(mockOnColumnResize).toHaveBeenCalledWith(0, 80)
    })

    it("resize handle has col-resize cursor style", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const resizeHandle = screen.getByTestId("resize-handle-0")
      expect(resizeHandle).toHaveClass("cursor-col-resize")
    })

    it("stops event propagation to prevent dragging during resize", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const resizeHandle = screen.getByTestId("resize-handle-1")

      // Create a MouseEvent and spy on its methods
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
      })
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation")
      const preventDefaultSpy = vi.spyOn(event, "preventDefault")

      resizeHandle.dispatchEvent(event)

      // stopPropagation and preventDefault should have been called
      expect(stopPropagationSpy).toHaveBeenCalled()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it("disables dragging while resizing", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onColumnResize={mockOnColumnResize}
        />
      )

      const resizeHandle = screen.getByTestId("resize-handle-1")
      const colorHeader = screen.getByTestId("column-header-1")

      // Start resizing
      fireEvent.mouseDown(resizeHandle, { clientX: 100 })

      // During resize, column should not be draggable
      expect(colorHeader).toHaveAttribute("draggable", "false")

      // End resizing
      fireEvent.mouseUp(document)

      // After resize ends, column should be draggable again
      expect(colorHeader).toHaveAttribute("draggable", "true")
    })
  })

  describe("column renaming", () => {
    let mockOnRenameColumn: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnRenameColumn = vi.fn()
    })

    it("shows inline input on double-click for free columns", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")
      fireEvent.doubleClick(notesHeader)

      // Should show input field
      expect(screen.getByTestId("column-header-input-3")).toBeInTheDocument()
      expect(screen.getByTestId("column-header-input-3")).toHaveValue("Notes")
    })

    it("does NOT show inline input on double-click for spec columns", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const colorHeader = screen.getByTestId("column-header-1")
      fireEvent.doubleClick(colorHeader)

      // Should NOT show input field
      expect(screen.queryByTestId("column-header-input-1")).not.toBeInTheDocument()
    })

    it("does NOT show inline input on double-click for SKU column", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const skuHeader = screen.getByTestId("column-header-0")
      fireEvent.doubleClick(skuHeader)

      // Should NOT show input field
      expect(screen.queryByTestId("column-header-input-0")).not.toBeInTheDocument()
    })

    it("calls onRenameColumn when Enter is pressed after editing", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")
      fireEvent.doubleClick(notesHeader)

      const input = screen.getByTestId("column-header-input-3")
      fireEvent.change(input, { target: { value: "Comments" } })
      fireEvent.keyDown(input, { key: "Enter" })

      expect(mockOnRenameColumn).toHaveBeenCalledWith(3, "Comments")
    })

    it("cancels editing on Escape press", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")
      fireEvent.doubleClick(notesHeader)

      const input = screen.getByTestId("column-header-input-3")
      fireEvent.change(input, { target: { value: "Changed" } })
      fireEvent.keyDown(input, { key: "Escape" })

      // Should close input without calling callback
      expect(mockOnRenameColumn).not.toHaveBeenCalled()
      expect(screen.queryByTestId("column-header-input-3")).not.toBeInTheDocument()
      expect(screen.getByText("Notes")).toBeInTheDocument()
    })

    it("saves on blur", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")
      fireEvent.doubleClick(notesHeader)

      const input = screen.getByTestId("column-header-input-3")
      fireEvent.change(input, { target: { value: "Comments" } })
      fireEvent.blur(input)

      expect(mockOnRenameColumn).toHaveBeenCalledWith(3, "Comments")
    })

    it("does not call onRenameColumn if value is empty", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")
      fireEvent.doubleClick(notesHeader)

      const input = screen.getByTestId("column-header-input-3")
      fireEvent.change(input, { target: { value: "   " } })
      fireEvent.keyDown(input, { key: "Enter" })

      // Should NOT call callback for empty value
      expect(mockOnRenameColumn).not.toHaveBeenCalled()
    })

    it("disables dragging while editing", () => {
      const columns = createColumns()
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
        />
      )

      const notesHeader = screen.getByTestId("column-header-3")

      // Before editing, should be draggable
      expect(notesHeader).toHaveAttribute("draggable", "true")

      fireEvent.doubleClick(notesHeader)

      // During editing, should not be draggable
      expect(notesHeader).toHaveAttribute("draggable", "false")

      // Exit editing
      const input = screen.getByTestId("column-header-input-3")
      fireEvent.keyDown(input, { key: "Escape" })

      // After editing, should be draggable again
      expect(notesHeader).toHaveAttribute("draggable", "true")
    })

    it("responds to controlled editingColumnIndex prop", () => {
      const columns = createColumns()
      const { rerender } = render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
          editingColumnIndex={null}
          onEditingColumnIndexChange={vi.fn()}
        />
      )

      // Initially no input
      expect(screen.queryByTestId("column-header-input-3")).not.toBeInTheDocument()

      // Update controlled prop to trigger editing
      rerender(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
          editingColumnIndex={3}
          onEditingColumnIndexChange={vi.fn()}
        />
      )

      // Should show input for index 3 (Notes column)
      expect(screen.getByTestId("column-header-input-3")).toBeInTheDocument()
    })

    it("calls onEditingColumnIndexChange when exiting edit mode", () => {
      const columns = createColumns()
      const mockOnEditingChange = vi.fn()

      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          onRenameColumn={mockOnRenameColumn}
          editingColumnIndex={3}
          onEditingColumnIndexChange={mockOnEditingChange}
        />
      )

      const input = screen.getByTestId("column-header-input-3")
      fireEvent.keyDown(input, { key: "Escape" })

      expect(mockOnEditingChange).toHaveBeenCalledWith(null)
    })
  })

  describe("column width consistency", () => {
    it("applies flex-shrink-0 and flex-grow-0 to prevent flex size changes", () => {
      const columns = createColumns()
      render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

      // Each column header should have flex-shrink-0 and flex-grow-0 to prevent flex resizing
      columns.forEach((_, index) => {
        const header = screen.getByTestId(`column-header-${index}`)
        expect(header).toHaveClass("flex-shrink-0")
        expect(header).toHaveClass("flex-grow-0")
      })
    })

    it("sets maxWidth equal to width on column headers", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU", width: 100 },
        { id: "col-2", type: "spec", specId: "spec-1", header: "Color", width: 150 },
        { id: "col-3", type: "free", header: "Notes", width: 200 },
      ]
      render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

      // Each header should have maxWidth matching its width
      expect(screen.getByTestId("column-header-0")).toHaveStyle({ maxWidth: "100px" })
      expect(screen.getByTestId("column-header-1")).toHaveStyle({ maxWidth: "150px" })
      expect(screen.getByTestId("column-header-2")).toHaveStyle({ maxWidth: "200px" })
    })

    it("uses default width for maxWidth when column has no explicit width", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU" }, // No explicit width
        { id: "col-2", type: "spec", specId: "spec-1", header: "Color" },
      ]
      const defaultWidth = 120
      render(
        <DraggableColumnHeaders
          columns={columns}
          onReorder={mockOnReorder}
          defaultColumnWidth={defaultWidth}
        />
      )

      // Headers without explicit width should use defaultColumnWidth for maxWidth
      expect(screen.getByTestId("column-header-0")).toHaveStyle({ maxWidth: "120px" })
      expect(screen.getByTestId("column-header-1")).toHaveStyle({ maxWidth: "120px" })
    })

    it("sets width and minWidth consistently", () => {
      const columns: ColumnDef[] = [
        { id: "col-1", type: "sku", header: "SKU", width: 150 },
      ]
      render(<DraggableColumnHeaders columns={columns} onReorder={mockOnReorder} />)

      const header = screen.getByTestId("column-header-0")
      // width, minWidth, and maxWidth should all create consistent constraints
      expect(header).toHaveStyle({ width: "150px" })
      expect(header).toHaveStyle({ minWidth: "80px" }) // MIN_COLUMN_WIDTH constant
      expect(header).toHaveStyle({ maxWidth: "150px" })
    })
  })
})
