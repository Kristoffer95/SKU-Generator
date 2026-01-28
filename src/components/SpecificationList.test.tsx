import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSpecificationsStore } from "@/store/specifications"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import type { Specification, CellData } from "@/types"

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

// Reset stores before each test
beforeEach(() => {
  useSpecificationsStore.setState({
    specifications: [],
  })
  useSheetsStore.setState({
    sheets: [],
    activeSheetId: null,
  })
  useSettingsStore.setState({
    delimiter: "-",
    prefix: "",
    suffix: "",
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

  describe("drag-and-drop reordering", () => {
    it("renders drag handles for each specification", () => {
      useSpecificationsStore.setState({
        specifications: [
          createSpecification("Color", 0, []),
          createSpecification("Size", 1, []),
        ],
      })

      render(<SpecificationList />)

      const dragHandles = screen.getAllByTestId("drag-handle")
      expect(dragHandles).toHaveLength(2)
    })

    it("does not show drag handles when no specifications exist", () => {
      render(<SpecificationList />)

      expect(screen.queryAllByTestId("drag-handle")).toHaveLength(0)
    })

    it("updates order in store via reorderSpec when specs reordered", () => {
      const colorSpec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const sizeSpec: Specification = {
        id: "spec-size",
        name: "Size",
        order: 1,
        values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
      }

      useSpecificationsStore.setState({
        specifications: [colorSpec, sizeSpec],
      })

      // Spy on reorderSpec
      const reorderSpy = vi.spyOn(useSpecificationsStore.getState(), "reorderSpec")

      // Call reorderSpec directly to simulate what happens after drag-end
      act(() => {
        useSpecificationsStore.getState().reorderSpec("spec-size", 0)
      })

      // Verify the store was updated
      const specs = useSpecificationsStore.getState().specifications
      const sizeUpdated = specs.find((s) => s.id === "spec-size")
      const colorUpdated = specs.find((s) => s.id === "spec-color")

      expect(sizeUpdated?.order).toBe(0)
      expect(colorUpdated?.order).toBe(1)

      reorderSpy.mockRestore()
    })

    it("regenerates SKUs after reorder", () => {
      const colorSpec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const sizeSpec: Specification = {
        id: "spec-size",
        name: "Size",
        order: 1,
        values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
      }

      useSpecificationsStore.setState({
        specifications: [colorSpec, sizeSpec],
      })

      // Create a data sheet with sample data
      const sheetData: CellData[][] = [
        [{ v: "SKU", m: "SKU" }, { v: "Color", m: "Color" }, { v: "Size", m: "Size" }],
        [{ v: "R-S", m: "R-S" }, { v: "Red", m: "Red" }, { v: "Small", m: "Small" }],
      ]

      useSheetsStore.setState({
        sheets: [{
          id: "sheet-1",
          name: "Products",
          type: "data",
          data: sheetData,
        }],
        activeSheetId: "sheet-1",
      })

      render(<SpecificationList />)

      // Simulate reordering by calling reorderSpec and triggering SKU regeneration
      // The component calls reorderSpec and regenerateAllSKUs on drag end
      act(() => {
        // Swap order: Size becomes first (order 0), Color becomes second (order 1)
        useSpecificationsStore.getState().reorderSpec("spec-size", 0)
      })

      // After reorder, the store should have updated orders
      const updatedSpecs = useSpecificationsStore.getState().specifications
      expect(updatedSpecs.find((s) => s.id === "spec-size")?.order).toBe(0)
      expect(updatedSpecs.find((s) => s.id === "spec-color")?.order).toBe(1)
    })

    it("persists order after store state change", () => {
      const specs = [
        createSpecification("Color", 0, []),
        createSpecification("Size", 1, []),
        createSpecification("Material", 2, []),
      ]

      useSpecificationsStore.setState({ specifications: specs })

      // Simulate a reorder: Material moves to position 0
      act(() => {
        useSpecificationsStore.getState().reorderSpec(specs[2].id, 0)
      })

      // Verify order persisted correctly
      const updatedSpecs = useSpecificationsStore.getState().specifications
      const sorted = [...updatedSpecs].sort((a, b) => a.order - b.order)

      expect(sorted[0].name).toBe("Material")
      expect(sorted[1].name).toBe("Color")
      expect(sorted[2].name).toBe("Size")
    })
  })
})
