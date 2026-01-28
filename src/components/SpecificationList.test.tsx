import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSpecificationsStore } from "@/store/specifications"
import type { Specification } from "@/types"

// Helper to create specifications
const createSpecification = (
  name: string,
  order: number,
  values: { displayValue: string; skuFragment: string }[]
): Specification => ({
  id: crypto.randomUUID(),
  name,
  order,
  values: values.map((v) => ({
    id: crypto.randomUUID(),
    displayValue: v.displayValue,
    skuFragment: v.skuFragment,
  })),
})

// Reset store before each test
beforeEach(() => {
  useSpecificationsStore.setState({
    specifications: [],
  })
})

describe("SpecificationList", () => {
  it("shows empty state when no specifications exist", () => {
    render(<SpecificationList />)
    expect(screen.getByText(/no specifications yet/i)).toBeInTheDocument()
    expect(screen.getByText(/click "add specification" to create one/i)).toBeInTheDocument()
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

  it("displays specifications from store", () => {
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Temperature", 0, [
          { displayValue: "29deg C", skuFragment: "29C" },
          { displayValue: "30deg C", skuFragment: "30C" },
        ]),
        createSpecification("Color", 1, [
          { displayValue: "Red", skuFragment: "R" },
          { displayValue: "Blue", skuFragment: "B" },
        ]),
      ],
    })

    render(<SpecificationList />)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Color")).toBeInTheDocument()
  })

  it("shows correct value count for each spec", () => {
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
          { displayValue: "Blue", skuFragment: "B" },
        ]),
        createSpecification("Size", 1, [
          { displayValue: "Small", skuFragment: "S" },
        ]),
      ],
    })

    render(<SpecificationList />)

    expect(screen.getByText("2 values")).toBeInTheDocument() // Color
    expect(screen.getByText("1 value")).toBeInTheDocument() // Size
  })

  it("expands specification to show values with skuFragments", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
          { displayValue: "Blue", skuFragment: "B" },
        ]),
      ],
    })

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

  it("collapses specification when clicked again", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ],
    })

    render(<SpecificationList />)

    // Expand
    await user.click(screen.getByText("Color"))
    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
    })

    // Collapse
    await user.click(screen.getByText("Color"))
    await waitFor(() => {
      expect(screen.queryByText("Red")).not.toBeInTheDocument()
    })
  })

  it("sorts specifications by order field (lowest first)", () => {
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Size", 2, []),
        createSpecification("Color", 0, []),
        createSpecification("Material", 1, []),
      ],
    })

    render(<SpecificationList />)

    const specNames = screen.getAllByText(/Color|Size|Material/)
    expect(specNames[0]).toHaveTextContent("Color")
    expect(specNames[1]).toHaveTextContent("Material")
    expect(specNames[2]).toHaveTextContent("Size")
  })

  it("closes add dialog when Cancel clicked", async () => {
    const user = userEvent.setup()
    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("handles spec with empty skuFragment", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "" },
        ]),
      ],
    })

    render(<SpecificationList />)

    await user.click(screen.getByText("Color"))

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
      expect(screen.getByText("-")).toBeInTheDocument() // Placeholder for empty skuFragment
    })
  })

  it("updates when specifications store changes", async () => {
    const colorSpec = createSpecification("Color", 0, [
      { displayValue: "Red", skuFragment: "R" },
    ])

    useSpecificationsStore.setState({
      specifications: [colorSpec],
    })

    const { rerender } = render(<SpecificationList />)
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()

    // Update existing spec and add a new one (reuse the ID to ensure proper update)
    useSpecificationsStore.setState({
      specifications: [
        {
          ...colorSpec,
          values: [
            { id: crypto.randomUUID(), displayValue: "Red", skuFragment: "R" },
            { id: crypto.randomUUID(), displayValue: "Blue", skuFragment: "B" },
          ],
        },
        createSpecification("Size", 1, [
          { displayValue: "Small", skuFragment: "S" },
        ]),
      ],
    })

    rerender(<SpecificationList />)
    // Use getAllBy since the same Color spec may show with updated values
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("2 values")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()
  })

  it("shows spec with no values defined message when expanded", async () => {
    const user = userEvent.setup()
    useSpecificationsStore.setState({
      specifications: [
        createSpecification("EmptySpec", 0, []),
      ],
    })

    render(<SpecificationList />)

    await user.click(screen.getByText("EmptySpec"))

    await waitFor(() => {
      expect(screen.getByText("No values defined")).toBeInTheDocument()
    })
  })
})
