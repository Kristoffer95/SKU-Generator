import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSpecificationsStore } from "@/store/specifications"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { updateRowSKU } from "@/lib/auto-sku"
import type { Specification, CellData, SheetConfig } from "@/types"

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

/**
 * Helper to create a sheet with per-sheet specifications.
 * Sets the sheet as active and returns the sheet ID.
 */
function createSheetWithSpecs(
  name: string,
  data: CellData[][],
  specifications: Specification[]
): string {
  const sheetId = crypto.randomUUID()
  const sheet: SheetConfig = {
    id: sheetId,
    name,
    type: "data",
    data,
    columns: [],
    specifications,
  }
  useSheetsStore.setState((state) => ({
    sheets: [...state.sheets, sheet],
    activeSheetId: sheetId,
  }))
  // Also sync global store for backward compat with methods like updateSpecValue
  useSpecificationsStore.setState({ specifications })
  return sheetId
}

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
    const specs = [
      createSpecification("Temperature", 0, [
        { displayValue: "29deg C", skuFragment: "29C" },
        { displayValue: "30deg C", skuFragment: "30C" },
      ]),
      createSpecification("Color", 1, [
        { displayValue: "Red", skuFragment: "R" },
        { displayValue: "Blue", skuFragment: "B" },
      ]),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

    render(<SpecificationList />)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Color")).toBeInTheDocument()
  })

  it("shows correct value count for each spec", () => {
    const specs = [
      createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "R" },
        { displayValue: "Blue", skuFragment: "B" },
      ]),
      createSpecification("Size", 1, [
        { displayValue: "Small", skuFragment: "S" },
      ]),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

    render(<SpecificationList />)

    expect(screen.getByText("2 values")).toBeInTheDocument() // Color
    expect(screen.getByText("1 value")).toBeInTheDocument() // Size
  })

  it("expands specification to show values with skuFragments", async () => {
    const user = userEvent.setup()
    const specs = [
      createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "R" },
        { displayValue: "Blue", skuFragment: "B" },
      ]),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

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
    const specs = [
      createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "R" },
      ]),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

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
    const specs = [
      createSpecification("Size", 2, []),
      createSpecification("Color", 0, []),
      createSpecification("Material", 1, []),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

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
    const specs = [
      createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "" },
      ]),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

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

    const sheetId = createSheetWithSpecs("Test Sheet", [], [colorSpec])

    const { rerender } = render(<SpecificationList />)
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()

    // Update existing spec and add a new one (reuse the ID to ensure proper update)
    const updatedSpecs = [
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
    ]
    // Update both the sheet and global store
    useSheetsStore.setState((state) => ({
      sheets: state.sheets.map(s =>
        s.id === sheetId ? { ...s, specifications: updatedSpecs } : s
      ),
    }))
    useSpecificationsStore.setState({ specifications: updatedSpecs })

    rerender(<SpecificationList />)
    // Use getAllBy since the same Color spec may show with updated values
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("2 values")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()
  })

  it("shows spec with no values defined message when expanded", async () => {
    const user = userEvent.setup()
    const specs = [
      createSpecification("EmptySpec", 0, []),
    ]
    createSheetWithSpecs("Test Sheet", [], specs)

    render(<SpecificationList />)

    await user.click(screen.getByText("EmptySpec"))

    await waitFor(() => {
      expect(screen.getByText("No values defined")).toBeInTheDocument()
    })
  })

  describe("drag-and-drop reordering", () => {
    it("renders drag handles for each specification", () => {
      const specs = [
        createSpecification("Color", 0, []),
        createSpecification("Size", 1, []),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

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

    it("regenerates SKUs after reorder with correct fragment order", () => {
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

      // Create a data sheet with sample data - initial SKU is R-S (Color first, Size second)
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
          columns: [],
          specifications: [],
        }],
        activeSheetId: "sheet-1",
      })

      // Verify initial SKU is R-S
      expect(useSheetsStore.getState().sheets[0].data[1][0].v).toBe("R-S")

      // Render component - necessary for the reorder logic to be available
      render(<SpecificationList />)

      // Simulate reordering: Size moves to order 0, Color to order 1
      // This mimics what handleDragEnd does internally
      act(() => {
        // 1. First, update the store (as reorderSpec would do)
        useSpecificationsStore.getState().reorderSpec("spec-size", 0)

        // 2. Then manually call regeneration with updated specs
        // This simulates what regenerateAllSKUs does in the component
        const updatedSpecs = useSpecificationsStore.getState().specifications
        const settings = useSettingsStore.getState()
        const sheets = useSheetsStore.getState().sheets

        sheets.forEach((sheet) => {
          if (sheet.type !== "data" || sheet.data.length <= 1) return
          const newData = sheet.data.map((row) => [...row])
          for (let rowIndex = 1; rowIndex < newData.length; rowIndex++) {
            updateRowSKU(newData, rowIndex, updatedSpecs, settings)
          }
          useSheetsStore.getState().setSheetData(sheet.id, newData)
        })
      })

      // After reorder, the store should have updated orders
      const updatedSpecs = useSpecificationsStore.getState().specifications
      expect(updatedSpecs.find((s) => s.id === "spec-size")?.order).toBe(0)
      expect(updatedSpecs.find((s) => s.id === "spec-color")?.order).toBe(1)

      // SKU should now be S-R (Size first, Color second)
      const sheets = useSheetsStore.getState().sheets
      expect(sheets[0].data[1][0].v).toBe("S-R")
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

  describe("inline editing", () => {
    it("shows edit form when clicking on a value", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      // Expand the spec first
      await user.click(screen.getByText("Color"))

      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      // Click on the value to edit
      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("value-edit-form")).toBeInTheDocument()
        expect(screen.getByTestId("edit-display-value")).toBeInTheDocument()
        expect(screen.getByTestId("edit-sku-fragment")).toBeInTheDocument()
      })
    })

    it("pre-fills edit inputs with current values", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-display-value")).toHaveValue("Red")
        expect(screen.getByTestId("edit-sku-fragment")).toHaveValue("R")
      })
    })

    it("saves changes when clicking save button", async () => {
      const user = userEvent.setup()
      const spec = createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "R" },
      ])
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-display-value")).toBeInTheDocument()
      })

      // Change the display value
      const displayInput = screen.getByTestId("edit-display-value")
      await user.clear(displayInput)
      await user.type(displayInput, "Crimson")

      // Save
      await user.click(screen.getByTestId("save-edit"))

      // Verify the store was updated
      await waitFor(() => {
        const specs = useSpecificationsStore.getState().specifications
        const value = specs[0].values[0]
        expect(value.displayValue).toBe("Crimson")
        expect(value.skuFragment).toBe("R") // Should remain unchanged
      })
    })

    it("saves changes when pressing Enter", async () => {
      const user = userEvent.setup()
      const spec = createSpecification("Color", 0, [
        { displayValue: "Red", skuFragment: "R" },
      ])
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-sku-fragment")).toBeInTheDocument()
      })

      // Change the SKU fragment
      const skuInput = screen.getByTestId("edit-sku-fragment")
      await user.clear(skuInput)
      await user.type(skuInput, "RD{Enter}")

      // Verify the store was updated
      await waitFor(() => {
        const specs = useSpecificationsStore.getState().specifications
        const value = specs[0].values[0]
        expect(value.skuFragment).toBe("RD")
      })
    })

    it("cancels editing when clicking cancel button", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-display-value")).toBeInTheDocument()
      })

      // Make changes
      const displayInput = screen.getByTestId("edit-display-value")
      await user.clear(displayInput)
      await user.type(displayInput, "Changed")

      // Cancel
      await user.click(screen.getByTestId("cancel-edit"))

      // Edit form should be closed
      await waitFor(() => {
        expect(screen.queryByTestId("value-edit-form")).not.toBeInTheDocument()
      })

      // Store should not be updated
      const storeSpecs = useSpecificationsStore.getState().specifications
      expect(storeSpecs[0].values[0].displayValue).toBe("Red")
    })

    it("cancels editing when pressing Escape", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-display-value")).toBeInTheDocument()
      })

      // Press Escape
      await user.keyboard("{Escape}")

      // Edit form should be closed
      await waitFor(() => {
        expect(screen.queryByTestId("value-edit-form")).not.toBeInTheDocument()
      })
    })

    it("shows error for duplicate skuFragment within same spec", async () => {
      const user = userEvent.setup()
      // Create spec with two values
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [
          { id: "v1", displayValue: "Red", skuFragment: "R" },
          { id: "v2", displayValue: "Blue", skuFragment: "B" },
        ],
      }
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getAllByTestId("value-item")).toHaveLength(2)
      })

      // Click on Blue value to edit
      const valueItems = screen.getAllByTestId("value-item")
      await user.click(valueItems[1]) // Blue

      await waitFor(() => {
        expect(screen.getByTestId("edit-sku-fragment")).toBeInTheDocument()
      })

      // Try to change skuFragment to 'R' which is already used by Red
      const skuInput = screen.getByTestId("edit-sku-fragment")
      await user.clear(skuInput)
      await user.type(skuInput, "R")

      // Try to save
      await user.click(screen.getByTestId("save-edit"))

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId("edit-error")).toBeInTheDocument()
        expect(screen.getByTestId("edit-error")).toHaveTextContent(
          /unique within this specification/i
        )
      })

      // Store should not be updated
      const specs = useSpecificationsStore.getState().specifications
      expect(specs[0].values[1].skuFragment).toBe("B") // Still 'B'
    })

    it("allows same skuFragment in different specs", async () => {
      const user = userEvent.setup()
      const specs: Specification[] = [
        {
          id: "spec-color",
          name: "Color",
          order: 0,
          values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
        },
        {
          id: "spec-size",
          name: "Size",
          order: 1,
          values: [{ id: "v2", displayValue: "Regular", skuFragment: "X" }],
        },
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      // Expand Size spec
      await user.click(screen.getByText("Size"))
      await waitFor(() => {
        expect(screen.getByTestId("value-item")).toBeInTheDocument()
      })

      // Click to edit
      await user.click(screen.getByTestId("value-item"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-sku-fragment")).toBeInTheDocument()
      })

      // Change skuFragment to 'R' (same as Color spec's Red)
      const skuInput = screen.getByTestId("edit-sku-fragment")
      await user.clear(skuInput)
      await user.type(skuInput, "R")

      // Save
      await user.click(screen.getByTestId("save-edit"))

      // Should succeed (no error shown)
      await waitFor(() => {
        expect(screen.queryByTestId("edit-error")).not.toBeInTheDocument()
        expect(screen.queryByTestId("value-edit-form")).not.toBeInTheDocument()
      })

      // Verify store was updated
      const storeSpecs = useSpecificationsStore.getState().specifications
      const sizeSpec = storeSpecs.find((s) => s.id === "spec-size")
      expect(sizeSpec?.values[0].skuFragment).toBe("R")
    })

    it("clears error when skuFragment input changes", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [
          { id: "v1", displayValue: "Red", skuFragment: "R" },
          { id: "v2", displayValue: "Blue", skuFragment: "B" },
        ],
      }
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByText("Color"))
      await waitFor(() => {
        expect(screen.getAllByTestId("value-item")).toHaveLength(2)
      })

      const valueItems = screen.getAllByTestId("value-item")
      await user.click(valueItems[1]) // Blue

      await waitFor(() => {
        expect(screen.getByTestId("edit-sku-fragment")).toBeInTheDocument()
      })

      // Enter duplicate
      const skuInput = screen.getByTestId("edit-sku-fragment")
      await user.clear(skuInput)
      await user.type(skuInput, "R")
      await user.click(screen.getByTestId("save-edit"))

      // Error should appear
      await waitFor(() => {
        expect(screen.getByTestId("edit-error")).toBeInTheDocument()
      })

      // Change to a unique value
      await user.clear(skuInput)
      await user.type(skuInput, "BL")

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId("edit-error")).not.toBeInTheDocument()
      })
    })
  })
})
