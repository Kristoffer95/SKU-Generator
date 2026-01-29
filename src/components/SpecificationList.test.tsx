import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { updateRowSKU } from "@/lib/auto-sku"
import type { Specification, CellData, SheetConfig, ColumnDef } from "@/types"

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
  specifications: Specification[],
  columns: ColumnDef[] = []
): string {
  const sheetId = crypto.randomUUID()
  const sheet: SheetConfig = {
    id: sheetId,
    name,
    type: "data",
    data,
    columns,
    specifications,
  }
  useSheetsStore.setState((state) => ({
    sheets: [...state.sheets, sheet],
    activeSheetId: sheetId,
  }))
  return sheetId
}

/**
 * Helper to get the specifications from the active sheet.
 */
function getActiveSheetSpecs(): Specification[] {
  const { sheets, activeSheetId } = useSheetsStore.getState()
  const activeSheet = sheets.find(s => s.id === activeSheetId)
  return activeSheet?.specifications ?? []
}

// Reset stores before each test
beforeEach(() => {
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
    // Update the sheet's specifications
    useSheetsStore.setState((state) => ({
      sheets: state.sheets.map(s =>
        s.id === sheetId ? { ...s, specifications: updatedSpecs } : s
      ),
    }))

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

      const sheetId = createSheetWithSpecs("Test Sheet", [], [colorSpec, sizeSpec])

      // Call sheet-scoped reorderSpec directly to simulate what happens after drag-end
      act(() => {
        useSheetsStore.getState().reorderSpec(sheetId, "spec-size", 0)
      })

      // Verify the sheet-scoped store was updated
      const specs = getActiveSheetSpecs()
      const sizeUpdated = specs.find((s) => s.id === "spec-size")
      const colorUpdated = specs.find((s) => s.id === "spec-color")

      expect(sizeUpdated?.order).toBe(0)
      expect(colorUpdated?.order).toBe(1)
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

      // Create a data sheet with sample data - initial SKU is R-S (Color first, Size second)
      const sheetData: CellData[][] = [
        [{ v: "SKU", m: "SKU" }, { v: "Color", m: "Color" }, { v: "Size", m: "Size" }],
        [{ v: "R-S", m: "R-S" }, { v: "Red", m: "Red" }, { v: "Small", m: "Small" }],
      ]

      // Create sheet with per-sheet specifications
      const sheetId = "sheet-1"
      useSheetsStore.setState({
        sheets: [{
          id: sheetId,
          name: "Products",
          type: "data",
          data: sheetData,
          columns: [],
          specifications: [colorSpec, sizeSpec],
        }],
        activeSheetId: sheetId,
      })

      // Verify initial SKU is R-S
      expect(useSheetsStore.getState().sheets[0].data[1][0].v).toBe("R-S")

      // Render component - necessary for the reorder logic to be available
      render(<SpecificationList />)

      // Simulate reordering: Size moves to order 0, Color to order 1
      // This mimics what handleDragEnd does internally
      act(() => {
        // 1. First, update the store (as sheet-scoped reorderSpec would do)
        useSheetsStore.getState().reorderSpec(sheetId, "spec-size", 0)

        // 2. Then manually call regeneration with updated specs
        // This simulates what regenerateAllSKUs does in the component
        const updatedSpecs = getActiveSheetSpecs()
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

      // After reorder, the sheet-scoped store should have updated orders
      const updatedSpecs = getActiveSheetSpecs()
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

      const sheetId = createSheetWithSpecs("Test Sheet", [], specs)

      // Simulate a reorder: Material moves to position 0
      act(() => {
        useSheetsStore.getState().reorderSpec(sheetId, specs[2].id, 0)
      })

      // Verify order persisted correctly
      const updatedSpecs = getActiveSheetSpecs()
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

      // Verify the sheet-scoped store was updated
      await waitFor(() => {
        const specs = getActiveSheetSpecs()
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

      // Verify the sheet-scoped store was updated
      await waitFor(() => {
        const specs = getActiveSheetSpecs()
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
      const storeSpecs = getActiveSheetSpecs()
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
      const specs = getActiveSheetSpecs()
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

      // Verify sheet-scoped store was updated
      const storeSpecs = getActiveSheetSpecs()
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

  describe("spec name editing", () => {
    it("shows edit button next to spec name", () => {
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      expect(screen.getByTestId("edit-spec-name-button")).toBeInTheDocument()
    })

    it("enters edit mode when clicking edit button", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("spec-name-edit-form")).toBeInTheDocument()
        expect(screen.getByTestId("edit-spec-name")).toHaveValue("Color")
      })
    })

    it("saves edited name when clicking save button", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Primary Color")

      // Click save (use mouseDown to prevent blur from firing first)
      const saveBtn = screen.getByTestId("save-spec-name")
      await user.click(saveBtn)

      // Verify spec name updated in store
      await waitFor(() => {
        const specs = getActiveSheetSpecs()
        expect(specs[0].name).toBe("Primary Color")
      })
    })

    it("saves edited name when pressing Enter", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Shade{Enter}")

      await waitFor(() => {
        const specs = getActiveSheetSpecs()
        expect(specs[0].name).toBe("Shade")
      })
    })

    it("cancels edit when pressing Escape", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Changed Name")
      await user.keyboard("{Escape}")

      // Edit form should be closed
      await waitFor(() => {
        expect(screen.queryByTestId("spec-name-edit-form")).not.toBeInTheDocument()
      })

      // Name should not have changed
      expect(screen.getByText("Color")).toBeInTheDocument()
    })

    it("cancels edit when clicking cancel button", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Changed Name")

      await user.click(screen.getByTestId("cancel-spec-name"))

      // Edit form should be closed
      await waitFor(() => {
        expect(screen.queryByTestId("spec-name-edit-form")).not.toBeInTheDocument()
      })

      // Name should not have changed
      const specs2 = getActiveSheetSpecs()
      expect(specs2[0].name).toBe("Color")
    })

    it("shows error for empty name", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "{Enter}")

      await waitFor(() => {
        expect(screen.getByTestId("spec-name-error")).toBeInTheDocument()
        expect(screen.getByTestId("spec-name-error")).toHaveTextContent(/cannot be empty/i)
      })
    })

    it("shows error for duplicate name", async () => {
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
          values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
        },
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      // Find the edit button for the second spec (Size)
      const editButtons = screen.getAllByTestId("edit-spec-name-button")
      await user.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Color{Enter}")

      await waitFor(() => {
        expect(screen.getByTestId("spec-name-error")).toBeInTheDocument()
        expect(screen.getByTestId("spec-name-error")).toHaveTextContent(/already exists/i)
      })
    })

    it("is case-insensitive when checking for duplicate names", async () => {
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
          values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
        },
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      // Edit Size to "COLOR" (uppercase) - should fail
      const editButtons = screen.getAllByTestId("edit-spec-name-button")
      await user.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "COLOR{Enter}")

      await waitFor(() => {
        expect(screen.getByTestId("spec-name-error")).toBeInTheDocument()
        expect(screen.getByTestId("spec-name-error")).toHaveTextContent(/already exists/i)
      })
    })

    it("updates column headers when spec name changes", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU", m: "SKU" }, { v: "Color", m: "Color" }],
        [{ v: "R", m: "R" }, { v: "Red", m: "Red" }],
      ]

      createSheetWithSpecs("Test Sheet", data, [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Shade{Enter}")

      // Verify column header was updated
      await waitFor(() => {
        const { sheets, activeSheetId } = useSheetsStore.getState()
        const sheet = sheets.find((s) => s.id === activeSheetId)

        // Column header should be updated
        expect(sheet?.columns[1].header).toBe("Shade")

        // Header row data should also be updated
        expect(sheet?.data[0][1].v).toBe("Shade")
      })
    })

    it("updates multiple columns with same specId", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color1", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-color2", type: "spec", header: "Color", specId: "spec-color" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }, { v: "Color" }],
      ]

      createSheetWithSpecs("Test Sheet", data, [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("edit-spec-name-button"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Hue{Enter}")

      // Verify both columns updated
      await waitFor(() => {
        const { sheets, activeSheetId } = useSheetsStore.getState()
        const sheet = sheets.find((s) => s.id === activeSheetId)

        expect(sheet?.columns[1].header).toBe("Hue")
        expect(sheet?.columns[2].header).toBe("Hue")
        expect(sheet?.data[0][1].v).toBe("Hue")
        expect(sheet?.data[0][2].v).toBe("Hue")
      })
    })

    it("clears error when input changes", async () => {
      const user = userEvent.setup()
      const specs: Specification[] = [
        {
          id: "spec-color",
          name: "Color",
          order: 0,
          values: [],
        },
        {
          id: "spec-size",
          name: "Size",
          order: 1,
          values: [],
        },
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      // Edit Size to "Color" - should fail
      const editButtons = screen.getAllByTestId("edit-spec-name-button")
      await user.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByTestId("edit-spec-name")).toBeInTheDocument()
      })

      const input = screen.getByTestId("edit-spec-name")
      await user.clear(input)
      await user.type(input, "Color{Enter}")

      // Error should appear
      await waitFor(() => {
        expect(screen.getByTestId("spec-name-error")).toBeInTheDocument()
      })

      // Type something else - error should clear
      await user.type(input, "2")

      await waitFor(() => {
        expect(screen.queryByTestId("spec-name-error")).not.toBeInTheDocument()
      })
    })
  })

  describe("delete specification", () => {
    it("shows delete button on each specification", () => {
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
        createSpecification("Size", 1, [
          { displayValue: "Small", skuFragment: "S" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      const deleteButtons = screen.getAllByTestId("delete-spec-button")
      expect(deleteButtons).toHaveLength(2)
    })

    it("opens delete confirmation dialog when delete button clicked", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: /delete specification/i })).toBeInTheDocument()
      })
    })

    it("shows spec name in delete confirmation dialog", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByText(/"Color"/)).toBeInTheDocument()
      })
    })

    it("closes dialog when Cancel clicked", async () => {
      const user = userEvent.setup()
      const specs = [
        createSpecification("Color", 0, [
          { displayValue: "Red", skuFragment: "R" },
        ]),
      ]
      createSheetWithSpecs("Test Sheet", [], specs)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-cancel"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Spec should still exist
      expect(screen.getByText("Color")).toBeInTheDocument()
    })

    it("removes spec from store when Delete confirmed", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      createSheetWithSpecs("Test Sheet", [], [spec])

      render(<SpecificationList />)

      expect(screen.getByText("Color")).toBeInTheDocument()

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
        expect(screen.queryByText("Color")).not.toBeInTheDocument()
      })

      // Verify spec removed from store
      const specs = getActiveSheetSpecs()
      expect(specs).toHaveLength(0)
    })

    it("removes associated columns when spec deleted", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-notes", type: "free", header: "Notes" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }, { v: "Notes" }],
        [{ v: "R" }, { v: "Red" }, { v: "Note 1" }],
      ]

      createSheetWithSpecs("Test Sheet", data, [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Verify columns updated
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)

      // Should have removed the Color column
      expect(sheet?.columns).toHaveLength(2)
      expect(sheet?.columns[0].header).toBe("SKU")
      expect(sheet?.columns[1].header).toBe("Notes")

      // Should have removed data for the Color column
      expect(sheet?.data[0]).toHaveLength(2)
      expect(sheet?.data[1]).toHaveLength(2)
    })

    it("shows column count warning in delete dialog", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-color2", type: "spec", header: "Primary Color", specId: "spec-color" },
      ]

      createSheetWithSpecs("Test Sheet", [], [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
        // Should show warning about 2 columns
        expect(screen.getByText(/2 columns use this specification/)).toBeInTheDocument()
      })
    })

    it("does not affect other specs when deleting one", async () => {
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
          values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
        },
      ]
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-size", type: "spec", header: "Size", specId: "spec-size" },
      ]

      createSheetWithSpecs("Test Sheet", [], specs, columns)

      render(<SpecificationList />)

      // Delete first spec (Color)
      const deleteButtons = screen.getAllByTestId("delete-spec-button")
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Size spec should still exist
      expect(screen.getByText("Size")).toBeInTheDocument()

      // Verify store
      const storeSpecs = getActiveSheetSpecs()
      expect(storeSpecs).toHaveLength(1)
      expect(storeSpecs[0].name).toBe("Size")

      // Size column should still exist
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)
      expect(sheet?.columns.some((c) => c.specId === "spec-size")).toBe(true)
    })

    it("regenerates SKUs without deleted spec fragment (atomic operation)", async () => {
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
          values: [{ id: "v2", displayValue: "Small", skuFragment: "S" }],
        },
      ]
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-size", type: "spec", header: "Size", specId: "spec-size" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }, { v: "Size" }],
        [{ v: "R-S" }, { v: "Red" }, { v: "Small" }],
      ]

      createSheetWithSpecs("Test Sheet", data, specs, columns)

      render(<SpecificationList />)

      // Delete Color spec
      const deleteButtons = screen.getAllByTestId("delete-spec-button")
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Verify SKU was regenerated without the Color fragment
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)

      // Should have only SKU and Size columns now
      expect(sheet?.columns).toHaveLength(2)
      expect(sheet?.columns[0].header).toBe("SKU")
      expect(sheet?.columns[1].header).toBe("Size")

      // SKU should be regenerated to just "S" (not "R-S")
      expect(sheet?.data[1][0].v).toBe("S")
    })

    it("handles deleting all spec columns atomically", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }],
        [{ v: "R" }, { v: "Red" }],
      ]

      createSheetWithSpecs("Test Sheet", data, [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Verify columns and data updated atomically
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)

      // Should have only SKU column
      expect(sheet?.columns).toHaveLength(1)
      expect(sheet?.columns[0].header).toBe("SKU")

      // Data should have only SKU column values
      expect(sheet?.data[0]).toHaveLength(1)
      expect(sheet?.data[1]).toHaveLength(1)

      // SKU should be empty (no specs left)
      expect(sheet?.data[1][0].v).toBe("")
    })

    it("deletes spec and regenerates SKUs in single atomic operation (no stale data)", async () => {
      // This test verifies the fix for the stale closure bug
      // Previously, regenerateAllSKUs used stale activeSheet data from closure
      const user = userEvent.setup()
      const specs: Specification[] = [
        {
          id: "spec-color",
          name: "Color",
          order: 0,
          values: [
            { id: "v1", displayValue: "Red", skuFragment: "R" },
            { id: "v2", displayValue: "Blue", skuFragment: "B" },
          ],
        },
        {
          id: "spec-size",
          name: "Size",
          order: 1,
          values: [
            { id: "v3", displayValue: "Small", skuFragment: "S" },
            { id: "v4", displayValue: "Large", skuFragment: "L" },
          ],
        },
      ]
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-size", type: "spec", header: "Size", specId: "spec-size" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }, { v: "Size" }],
        [{ v: "R-S" }, { v: "Red" }, { v: "Small" }],
        [{ v: "B-L" }, { v: "Blue" }, { v: "Large" }],
        [{ v: "R-L" }, { v: "Red" }, { v: "Large" }],
      ]

      createSheetWithSpecs("Test Sheet", data, specs, columns)

      render(<SpecificationList />)

      // Delete Color spec
      const deleteButtons = screen.getAllByTestId("delete-spec-button")
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Verify all data was updated atomically
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)

      // Should have 2 columns (SKU and Size)
      expect(sheet?.columns).toHaveLength(2)

      // All rows should have correct SKU regenerated (only Size fragment)
      expect(sheet?.data[1][0].v).toBe("S")
      expect(sheet?.data[2][0].v).toBe("L")
      expect(sheet?.data[3][0].v).toBe("L")

      // Size column data should be preserved
      expect(sheet?.data[1][1].v).toBe("Small")
      expect(sheet?.data[2][1].v).toBe("Large")
      expect(sheet?.data[3][1].v).toBe("Large")
    })

    it("removes multiple columns with same specId atomically", async () => {
      const user = userEvent.setup()
      const spec: Specification = {
        id: "spec-color",
        name: "Color",
        order: 0,
        values: [{ id: "v1", displayValue: "Red", skuFragment: "R" }],
      }
      const columns: ColumnDef[] = [
        { id: "col-sku", type: "sku", header: "SKU" },
        { id: "col-color1", type: "spec", header: "Color", specId: "spec-color" },
        { id: "col-notes", type: "free", header: "Notes" },
        { id: "col-color2", type: "spec", header: "Primary Color", specId: "spec-color" },
      ]
      const data: CellData[][] = [
        [{ v: "SKU" }, { v: "Color" }, { v: "Notes" }, { v: "Primary Color" }],
        [{ v: "R-R" }, { v: "Red" }, { v: "Test" }, { v: "Red" }],
      ]

      createSheetWithSpecs("Test Sheet", data, [spec], columns)

      render(<SpecificationList />)

      await user.click(screen.getByTestId("delete-spec-button"))

      await waitFor(() => {
        expect(screen.getByTestId("delete-spec-dialog")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("delete-spec-confirm"))

      await waitFor(() => {
        expect(screen.queryByTestId("delete-spec-dialog")).not.toBeInTheDocument()
      })

      // Verify both Color columns removed atomically
      const { sheets, activeSheetId } = useSheetsStore.getState()
      const sheet = sheets.find((s) => s.id === activeSheetId)

      // Should have only SKU and Notes columns
      expect(sheet?.columns).toHaveLength(2)
      expect(sheet?.columns[0].header).toBe("SKU")
      expect(sheet?.columns[1].header).toBe("Notes")

      // Data should reflect the removal
      expect(sheet?.data[0]).toHaveLength(2)
      expect(sheet?.data[1]).toHaveLength(2)

      // SKU should be empty (no more spec columns)
      expect(sheet?.data[1][0].v).toBe("")
      // Notes should be preserved
      expect(sheet?.data[1][1].v).toBe("Test")
    })
  })
})
