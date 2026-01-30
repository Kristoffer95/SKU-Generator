import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ColumnHeaderDropdownMenu } from "./ColumnHeaderDropdownMenu"
import type { ColumnDef } from "@/types"

describe("ColumnHeaderDropdownMenu", () => {
  const mockOnInsertBefore = vi.fn()
  const mockOnInsertAfter = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnRename = vi.fn()
  const mockOnPinChange = vi.fn()

  const specColumn: ColumnDef = {
    id: "col-spec",
    type: "spec",
    specId: "spec-1",
    header: "Color",
  }

  const freeColumn: ColumnDef = {
    id: "col-free",
    type: "free",
    header: "Notes",
  }

  const skuColumn: ColumnDef = {
    id: "col-sku",
    type: "sku",
    header: "SKU",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders dropdown trigger button", () => {
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByTestId("column-menu-trigger-1")).toBeInTheDocument()
  })

  it("shows menu on click", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))

    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-1")).toBeInTheDocument()
      expect(screen.getByTestId("column-menu-insert-after-1")).toBeInTheDocument()
      expect(screen.getByTestId("column-menu-delete-1")).toBeInTheDocument()
    })
  })

  it("calls onInsertBefore when Insert column before is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={2}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-2")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-insert-before-2"))

    expect(mockOnInsertBefore).toHaveBeenCalledWith(2)
  })

  it("calls onInsertAfter when Insert column after is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={2}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-after-2")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-insert-after-2"))

    expect(mockOnInsertAfter).toHaveBeenCalledWith(2)
  })

  it("calls onDelete when Delete column is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-delete-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-delete-1"))

    expect(mockOnDelete).toHaveBeenCalledWith(1, specColumn)
  })

  it("does not show delete option for SKU column", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={skuColumn}
        columnIndex={0}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-0"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-0")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("column-menu-delete-0")).not.toBeInTheDocument()
  })

  it("shows rename option only for free columns", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={freeColumn}
        columnIndex={2}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onRename={mockOnRename}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-rename-2")).toBeInTheDocument()
    })
  })

  it("does not show rename option for spec columns", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onRename={mockOnRename}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-1")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("column-menu-rename-1")).not.toBeInTheDocument()
  })

  it("does not show rename option for SKU column", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={skuColumn}
        columnIndex={0}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onRename={mockOnRename}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-0"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-0")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("column-menu-rename-0")).not.toBeInTheDocument()
  })

  it("calls onRename when Rename is clicked for free column", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={freeColumn}
        columnIndex={2}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onRename={mockOnRename}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-rename-2")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-rename-2"))

    expect(mockOnRename).toHaveBeenCalledWith(2)
  })

  it("shows Pin column option when onPinChange is provided and column is not pinned", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onPinChange={mockOnPinChange}
        isPinned={false}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-pin-1")).toBeInTheDocument()
    })

    expect(screen.getByText("Pin column")).toBeInTheDocument()
  })

  it("shows Unpin column option when column is pinned", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onPinChange={mockOnPinChange}
        isPinned={true}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-pin-1")).toBeInTheDocument()
    })

    expect(screen.getByText("Unpin column")).toBeInTheDocument()
  })

  it("does not show pin option for SKU column", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={skuColumn}
        columnIndex={0}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onPinChange={mockOnPinChange}
        isPinned={true}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-0"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-0")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("column-menu-pin-0")).not.toBeInTheDocument()
  })

  it("calls onPinChange with true when Pin column is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onPinChange={mockOnPinChange}
        isPinned={false}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-pin-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-pin-1"))

    expect(mockOnPinChange).toHaveBeenCalledWith(1, true)
  })

  it("calls onPinChange with false when Unpin column is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
        onPinChange={mockOnPinChange}
        isPinned={true}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-pin-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-pin-1"))

    expect(mockOnPinChange).toHaveBeenCalledWith(1, false)
  })

  it("dropdown trigger has correct aria-label", () => {
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByLabelText("Column options for Color")).toBeInTheDocument()
  })

  it("closes menu after action is performed", async () => {
    const user = userEvent.setup()
    render(
      <ColumnHeaderDropdownMenu
        column={specColumn}
        columnIndex={1}
        onInsertBefore={mockOnInsertBefore}
        onInsertAfter={mockOnInsertAfter}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("column-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("column-menu-insert-before-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("column-menu-insert-before-1"))

    // Menu should be closed after action
    await waitFor(() => {
      expect(screen.queryByTestId("column-menu-insert-before-1")).not.toBeInTheDocument()
    })
  })
})
