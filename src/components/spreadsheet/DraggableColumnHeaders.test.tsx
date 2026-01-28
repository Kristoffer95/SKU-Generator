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

    const longHeader = screen.getByTitle("Very Long Column Header Name That Should Be Truncated")
    expect(longHeader).toBeInTheDocument()
  })
})
