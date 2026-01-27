import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSpecificationsStore } from "@/store/specifications"

// Reset store before each test
beforeEach(() => {
  useSpecificationsStore.setState({ specifications: [] })
})

describe("SpecificationList", () => {
  it("shows empty state when no specifications", () => {
    render(<SpecificationList />)
    expect(screen.getByText(/no specifications yet/i)).toBeInTheDocument()
    expect(screen.getByText(/add one to get started/i)).toBeInTheDocument()
  })

  it("shows add specification button", () => {
    render(<SpecificationList />)
    expect(screen.getByRole("button", { name: /add specification/i })).toBeInTheDocument()
  })

  it("opens add dialog when button clicked", async () => {
    const user = userEvent.setup()
    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Add Specification" })).toBeInTheDocument()
  })

  it("adds a specification via dialog", async () => {
    const user = userEvent.setup()
    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))
    await user.type(screen.getByLabelText(/name/i), "Color")
    await user.click(screen.getByRole("button", { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("0 values")).toBeInTheDocument()
  })

  it("displays existing specifications", () => {
    useSpecificationsStore.getState().addSpecification("Temperature")
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Color")).toBeInTheDocument()
  })

  it("expands specification to show values", async () => {
    const user = userEvent.setup()
    const specId = useSpecificationsStore.getState().addSpecification("Color")
    useSpecificationsStore.getState().addSpecValue(specId, "Red", "R")
    useSpecificationsStore.getState().addSpecValue(specId, "Blue", "B")

    render(<SpecificationList />)

    // Click on the specification to expand
    await user.click(screen.getByText("Color"))

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
      expect(screen.getByText("R")).toBeInTheDocument()
      expect(screen.getByText("Blue")).toBeInTheDocument()
      expect(screen.getByText("B")).toBeInTheDocument()
    })
  })

  it("adds value to specification", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)

    // Expand specification
    await user.click(screen.getByText("Color"))

    // Click add value button
    await user.click(screen.getByRole("button", { name: /add value/i }))

    // Fill in the form
    const labelInput = screen.getByPlaceholderText(/label/i)
    const codeInput = screen.getByPlaceholderText(/code/i)

    await user.type(labelInput, "Red")
    await user.type(codeInput, "R")
    await user.click(screen.getByRole("button", { name: /confirm add value/i }))

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
      expect(screen.getByText("R")).toBeInTheDocument()
    })
  })

  it("deletes a value from specification", async () => {
    const user = userEvent.setup()
    const specId = useSpecificationsStore.getState().addSpecification("Color")
    useSpecificationsStore.getState().addSpecValue(specId, "Red", "R")

    render(<SpecificationList />)

    // Expand specification
    await user.click(screen.getByText("Color"))

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
    })

    // Find and click delete button for Red value
    const deleteBtn = screen.getByRole("button", { name: /delete red/i })
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(screen.queryByText("Red")).not.toBeInTheDocument()
    })
  })

  it("deletes a specification", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)
    expect(screen.getByText("Color")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /delete specification/i }))

    await waitFor(() => {
      expect(screen.queryByText("Color")).not.toBeInTheDocument()
    })
    expect(screen.getByText(/no specifications yet/i)).toBeInTheDocument()
  })

  it("edits specification name via dialog", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /edit specification/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Edit Specification")).toBeInTheDocument()

    const input = screen.getByLabelText(/name/i)
    await user.clear(input)
    await user.type(input, "Colour")
    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(screen.getByText("Colour")).toBeInTheDocument()
    expect(screen.queryByText("Color")).not.toBeInTheDocument()
  })

  it("shows correct value count", async () => {
    const specId = useSpecificationsStore.getState().addSpecification("Color")

    const { rerender } = render(<SpecificationList />)
    expect(screen.getByText("0 values")).toBeInTheDocument()

    useSpecificationsStore.getState().addSpecValue(specId, "Red", "R")

    // Rerender same instance to see updated count
    rerender(<SpecificationList />)
    expect(screen.getByText("1 value")).toBeInTheDocument()

    useSpecificationsStore.getState().addSpecValue(specId, "Blue", "B")

    rerender(<SpecificationList />)
    expect(screen.getByText("2 values")).toBeInTheDocument()
  })

  it("cancels add value form with Escape key", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)

    await user.click(screen.getByText("Color"))
    await user.click(screen.getByRole("button", { name: /add value/i }))

    expect(screen.getByPlaceholderText(/label/i)).toBeInTheDocument()

    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/label/i)).not.toBeInTheDocument()
    })
  })

  it("submits add value form with Enter key", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.getState().addSpecification("Color")

    render(<SpecificationList />)

    await user.click(screen.getByText("Color"))
    await user.click(screen.getByRole("button", { name: /add value/i }))

    await user.type(screen.getByPlaceholderText(/label/i), "Red")
    await user.type(screen.getByPlaceholderText(/code/i), "R")
    await user.keyboard("{Enter}")

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
    })
  })
})
