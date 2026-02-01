import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ColumnLetterHeaders, columnIndexToLetter } from "./ColumnLetterHeaders"
import type { ColumnDef } from "@/types"

// Sample columns for testing
const mockColumns: ColumnDef[] = [
  { id: "col-sku", type: "sku", header: "SKU" },
  { id: "col-1", type: "spec", specId: "spec-1", header: "Color" },
  { id: "col-2", type: "spec", specId: "spec-2", header: "Size" },
  { id: "col-3", type: "free", header: "Notes" },
]

describe("columnIndexToLetter", () => {
  it("converts single letter indices correctly", () => {
    expect(columnIndexToLetter(0)).toBe("A")
    expect(columnIndexToLetter(1)).toBe("B")
    expect(columnIndexToLetter(25)).toBe("Z")
  })

  it("converts double letter indices correctly", () => {
    expect(columnIndexToLetter(26)).toBe("AA")
    expect(columnIndexToLetter(27)).toBe("AB")
    expect(columnIndexToLetter(51)).toBe("AZ")
    expect(columnIndexToLetter(52)).toBe("BA")
  })

  it("converts triple letter indices correctly", () => {
    // 26 + 26*26 = 26 + 676 = 702
    expect(columnIndexToLetter(702)).toBe("AAA")
    expect(columnIndexToLetter(703)).toBe("AAB")
  })
})

describe("ColumnLetterHeaders", () => {
  it("renders column letters for each column", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
      />
    )

    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.getByText("B")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()
    expect(screen.getByText("D")).toBeInTheDocument()
  })

  it("renders the corner spacer for row indicator column", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
      />
    )

    const corner = screen.getByTestId("column-letter-corner")
    expect(corner).toBeInTheDocument()
  })

  it("renders column letters with correct test ids", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
      />
    )

    expect(screen.getByTestId("column-letter-0")).toBeInTheDocument()
    expect(screen.getByTestId("column-letter-1")).toBeInTheDocument()
    expect(screen.getByTestId("column-letter-2")).toBeInTheDocument()
    expect(screen.getByTestId("column-letter-3")).toBeInTheDocument()
  })

  it("calls onColumnSelect when a column letter is clicked", () => {
    const onColumnSelect = vi.fn()

    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        onColumnSelect={onColumnSelect}
      />
    )

    fireEvent.click(screen.getByTestId("column-letter-1"))

    expect(onColumnSelect).toHaveBeenCalledWith(1, false)
  })

  it("calls onColumnSelect with addToSelection=true when Cmd/Ctrl is held", () => {
    const onColumnSelect = vi.fn()

    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        onColumnSelect={onColumnSelect}
      />
    )

    // Simulate Cmd+click (macOS) or Ctrl+click
    fireEvent.click(screen.getByTestId("column-letter-2"), { metaKey: true })

    expect(onColumnSelect).toHaveBeenCalledWith(2, true)
  })

  it("calls onColumnRangeSelect when Shift+clicking after a previous click", () => {
    const onColumnSelect = vi.fn()
    const onColumnRangeSelect = vi.fn()

    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        onColumnSelect={onColumnSelect}
        onColumnRangeSelect={onColumnRangeSelect}
      />
    )

    // First click to set the anchor
    fireEvent.click(screen.getByTestId("column-letter-0"))

    // Shift+click to select range
    fireEvent.click(screen.getByTestId("column-letter-3"), { shiftKey: true })

    expect(onColumnRangeSelect).toHaveBeenCalledWith(0, 3)
  })

  it("highlights selected columns", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        selectedColumns={new Set([1, 2])}
      />
    )

    const col0 = screen.getByTestId("column-letter-0")
    const col1 = screen.getByTestId("column-letter-1")
    const col2 = screen.getByTestId("column-letter-2")
    const col3 = screen.getByTestId("column-letter-3")

    expect(col0).toHaveAttribute("aria-selected", "false")
    expect(col1).toHaveAttribute("aria-selected", "true")
    expect(col2).toHaveAttribute("aria-selected", "true")
    expect(col3).toHaveAttribute("aria-selected", "false")
  })

  it("renders with correct ARIA roles", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
      />
    )

    const headerRow = screen.getByRole("row", { name: "Column letters" })
    expect(headerRow).toBeInTheDocument()

    // Each column letter should be a columnheader
    const columnHeaders = screen.getAllByRole("columnheader")
    expect(columnHeaders).toHaveLength(4)
  })

  it("uses column widths from column definitions", () => {
    const columnsWithWidths: ColumnDef[] = [
      { id: "col-1", type: "sku", header: "SKU", width: 100 },
      { id: "col-2", type: "spec", specId: "spec-1", header: "Color", width: 150 },
    ]

    render(
      <ColumnLetterHeaders
        columns={columnsWithWidths}
        rowCount={10}
        defaultColumnWidth={120}
      />
    )

    const col0 = screen.getByTestId("column-letter-0")
    const col1 = screen.getByTestId("column-letter-1")

    // Check that widths are applied via style attribute
    expect(col0).toHaveStyle({ width: "100px" })
    expect(col1).toHaveStyle({ width: "150px" })
  })

  it("uses default column width when not specified", () => {
    const columnsNoWidth: ColumnDef[] = [
      { id: "col-1", type: "sku", header: "SKU" },
    ]

    render(
      <ColumnLetterHeaders
        columns={columnsNoWidth}
        rowCount={10}
        defaultColumnWidth={200}
      />
    )

    const col0 = screen.getByTestId("column-letter-0")
    expect(col0).toHaveStyle({ width: "200px" })
  })

  it("renders empty when no columns provided", () => {
    render(
      <ColumnLetterHeaders
        columns={[]}
        rowCount={10}
      />
    )

    // Only the corner spacer should be present
    const container = screen.getByTestId("column-letter-headers")
    expect(container.querySelectorAll("[data-column-letter]")).toHaveLength(0)
  })

  it("has correct row indicator width", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        rowIndicatorWidth={50}
      />
    )

    const corner = screen.getByTestId("column-letter-corner")
    expect(corner).toHaveStyle({ width: "50px" })
  })

  it("handles shift+click range in reverse order", () => {
    const onColumnSelect = vi.fn()
    const onColumnRangeSelect = vi.fn()

    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
        onColumnSelect={onColumnSelect}
        onColumnRangeSelect={onColumnRangeSelect}
      />
    )

    // First click on column 3
    fireEvent.click(screen.getByTestId("column-letter-3"))

    // Shift+click on column 1 (going backwards)
    fireEvent.click(screen.getByTestId("column-letter-1"), { shiftKey: true })

    // Should still be called with start < end order
    expect(onColumnRangeSelect).toHaveBeenCalledWith(1, 3)
  })

  it("sets aria-label with column letter", () => {
    render(
      <ColumnLetterHeaders
        columns={mockColumns}
        rowCount={10}
      />
    )

    expect(screen.getByTestId("column-letter-0")).toHaveAttribute("aria-label", "Column A")
    expect(screen.getByTestId("column-letter-1")).toHaveAttribute("aria-label", "Column B")
    expect(screen.getByTestId("column-letter-2")).toHaveAttribute("aria-label", "Column C")
    expect(screen.getByTestId("column-letter-3")).toHaveAttribute("aria-label", "Column D")
  })
})
