import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RowHeaderDropdownMenu } from "./RowHeaderDropdownMenu"

describe("RowHeaderDropdownMenu", () => {
  const mockOnInsertAbove = vi.fn()
  const mockOnInsertBelow = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnPinRowsAbove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders dropdown trigger button", () => {
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByTestId("row-menu-trigger-1")).toBeInTheDocument()
  })

  it("shows menu on click", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))

    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-1")).toBeInTheDocument()
      expect(screen.getByTestId("row-menu-insert-below-1")).toBeInTheDocument()
      expect(screen.getByTestId("row-menu-delete-1")).toBeInTheDocument()
    })
  })

  it("calls onInsertAbove when Insert row above is clicked", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={2}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-2")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("row-menu-insert-above-2"))

    expect(mockOnInsertAbove).toHaveBeenCalledWith(2)
  })

  it("calls onInsertBelow when Insert row below is clicked", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={2}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-below-2")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("row-menu-insert-below-2"))

    expect(mockOnInsertBelow).toHaveBeenCalledWith(2)
  })

  it("calls onDelete when Delete row is clicked", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-delete-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("row-menu-delete-1"))

    expect(mockOnDelete).toHaveBeenCalledWith(1)
  })

  it("does not show delete option for header row (row 0)", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={0}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-0"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-0")).toBeInTheDocument()
    })

    // Delete option should not be present for header row
    expect(screen.queryByTestId("row-menu-delete-0")).not.toBeInTheDocument()
  })

  it("shows insert options for header row", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={0}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-0"))

    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-0")).toBeInTheDocument()
      expect(screen.getByTestId("row-menu-insert-below-0")).toBeInTheDocument()
    })
  })

  it("shows Pin rows above option when onPinRowsAbove is provided", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={2}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
        onPinRowsAbove={mockOnPinRowsAbove}
        pinnedRows={0}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-pin-2")).toBeInTheDocument()
    })

    expect(screen.getByText("Pin rows above")).toBeInTheDocument()
  })

  it("shows Unpin rows option when row is pinned", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={2}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
        onPinRowsAbove={mockOnPinRowsAbove}
        pinnedRows={5}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-2"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-pin-2")).toBeInTheDocument()
    })

    // Row 2 is within pinnedRows=5, so it should show "Unpin rows"
    expect(screen.getByText("Unpin rows")).toBeInTheDocument()
  })

  it("does not show pin option when onPinRowsAbove is not provided", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-1")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("row-menu-pin-1")).not.toBeInTheDocument()
  })

  it("calls onPinRowsAbove when Pin rows above is clicked", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={3}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
        onPinRowsAbove={mockOnPinRowsAbove}
        pinnedRows={0}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-3"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-pin-3")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("row-menu-pin-3"))

    expect(mockOnPinRowsAbove).toHaveBeenCalledWith(3)
  })

  it("dropdown trigger has correct aria-label", () => {
    render(
      <RowHeaderDropdownMenu
        rowIndex={5}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    // Row 5 is 0-indexed, so display as row 6
    expect(screen.getByLabelText("Row options for row 6")).toBeInTheDocument()
  })

  it("closes menu after action is performed", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByTestId("row-menu-insert-above-1")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("row-menu-insert-above-1"))

    // Menu should be closed after action
    await waitFor(() => {
      expect(screen.queryByTestId("row-menu-insert-above-1")).not.toBeInTheDocument()
    })
  })

  it("menu has Insert row above option with Plus icon", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByText("Insert row above")).toBeInTheDocument()
    })
  })

  it("menu has Insert row below option with Plus icon", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      expect(screen.getByText("Insert row below")).toBeInTheDocument()
    })
  })

  it("delete option has destructive styling", async () => {
    const user = userEvent.setup()
    render(
      <RowHeaderDropdownMenu
        rowIndex={1}
        onInsertAbove={mockOnInsertAbove}
        onInsertBelow={mockOnInsertBelow}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByTestId("row-menu-trigger-1"))
    await waitFor(() => {
      const deleteItem = screen.getByTestId("row-menu-delete-1")
      expect(deleteItem).toHaveClass("text-destructive")
    })
  })
})
