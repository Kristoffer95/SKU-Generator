import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecificationList } from "./SpecificationList"
import { useSheetsStore } from "@/store/sheets"
import type { CellData } from "@/types"

// Helper to create Config sheet data
const createConfigData = (specs: { name: string; value: string; code: string }[]): CellData[][] => {
  const data: CellData[][] = [
    [{ v: "Specification" }, { v: "Value" }, { v: "SKU Code" }]
  ]
  specs.forEach(({ name, value, code }) => {
    data.push([{ v: name }, { v: value }, { v: code }])
  })
  return data
}

// Reset store before each test
beforeEach(() => {
  useSheetsStore.setState({
    sheets: [],
    activeSheetId: null
  })
})

describe("SpecificationList", () => {
  it("shows empty state when Config sheet has no specs", () => {
    // Initialize with empty Config sheet (only headers)
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpecificationList />)
    expect(screen.getByText(/no specifications yet/i)).toBeInTheDocument()
    expect(screen.getByText(/add specs in the config sheet/i)).toBeInTheDocument()
  })

  it("shows add specification button", () => {
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpecificationList />)
    expect(screen.getByRole("button", { name: /add specification/i })).toBeInTheDocument()
  })

  it("opens add dialog when button clicked", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Add Specification" })).toBeInTheDocument()
  })

  it("displays specifications parsed from Config sheet", () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Temperature", value: "29deg C", code: "29C" },
        { name: "Temperature", value: "30deg C", code: "30C" },
        { name: "Color", value: "Red", code: "R" },
        { name: "Color", value: "Blue", code: "B" },
      ]))
    }

    render(<SpecificationList />)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Color")).toBeInTheDocument()
  })

  it("shows correct value count for each spec", () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
        { name: "Color", value: "Blue", code: "B" },
        { name: "Size", value: "Small", code: "S" },
      ]))
    }

    render(<SpecificationList />)

    expect(screen.getByText("2 values")).toBeInTheDocument() // Color
    expect(screen.getByText("1 value")).toBeInTheDocument() // Size
  })

  it("expands specification to show values", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
        { name: "Color", value: "Blue", code: "B" },
      ]))
    }

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
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
      ]))
    }

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

  it("shows Edit button that jumps to Config sheet", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
      ]))
    }

    // Add a data sheet and make it active
    useSheetsStore.getState().addSheet("Sheet 1")
    const activeSheetBefore = useSheetsStore.getState().activeSheetId

    render(<SpecificationList />)

    // Click Edit button on a spec
    await user.click(screen.getByRole("button", { name: /edit/i }))

    // Should switch to Config sheet
    const activeSheetAfter = useSheetsStore.getState().activeSheetId
    expect(activeSheetAfter).not.toBe(activeSheetBefore)
    expect(activeSheetAfter).toBe(configSheet?.id)
  })

  it("closes add dialog when Cancel clicked", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes dialog after successfully adding specification", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()

    render(<SpecificationList />)

    await user.click(screen.getByRole("button", { name: /add specification/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Fill in the form
    await user.type(screen.getByLabelText("Specification Name"), "Color")
    await user.type(screen.getByLabelText("Value 1 label"), "Red")
    await user.type(screen.getByLabelText("Value 1 SKU code"), "R")

    // Submit the form
    await user.click(screen.getByRole("button", { name: "Add Specification" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // New spec should appear in the list
    expect(screen.getByText("Color")).toBeInTheDocument()
  })

  it("updates when Config sheet data changes", async () => {
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
      ]))
    }

    const { rerender } = render(<SpecificationList />)
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()

    // Add more values to Color
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "R" },
        { name: "Color", value: "Blue", code: "B" },
        { name: "Size", value: "Small", code: "S" },
      ]))
    }

    rerender(<SpecificationList />)
    expect(screen.getByText("Color")).toBeInTheDocument()
    expect(screen.getByText("2 values")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("1 value")).toBeInTheDocument()
  })

  it("handles spec with empty SKU code", async () => {
    const user = userEvent.setup()
    useSheetsStore.getState().initializeWithConfigSheet()
    const configSheet = useSheetsStore.getState().getConfigSheet()
    if (configSheet) {
      useSheetsStore.getState().setSheetData(configSheet.id, createConfigData([
        { name: "Color", value: "Red", code: "" },
      ]))
    }

    render(<SpecificationList />)

    await user.click(screen.getByText("Color"))

    await waitFor(() => {
      expect(screen.getByText("Red")).toBeInTheDocument()
      expect(screen.getByText("-")).toBeInTheDocument() // Placeholder for empty code
    })
  })
})
