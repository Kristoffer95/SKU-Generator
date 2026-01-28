import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ValidationPanel } from "./ValidationPanel"
import type { ValidationError } from "@/lib/validation"

describe("ValidationPanel", () => {
  const mockErrors: ValidationError[] = [
    {
      row: 1,
      column: 1,
      message: 'Value "Yellow" does not exist in specification "Color"',
      type: "missing-value",
    },
    {
      row: 2,
      column: 0,
      message: 'Duplicate SKU "R-S" found in rows 2, 3',
      type: "duplicate-sku",
    },
    {
      row: 3,
      column: 0,
      message: 'Duplicate SKU "R-S" found in rows 2, 3',
      type: "duplicate-sku",
    },
  ]

  it("does not render when errors array is empty", () => {
    const { container } = render(<ValidationPanel errors={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders when there are errors", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(screen.getByTestId("validation-panel")).toBeInTheDocument()
  })

  it("shows correct total error count", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(screen.getByText("3 issues found")).toBeInTheDocument()
  })

  it("shows singular form for single error", () => {
    const singleError: ValidationError[] = [mockErrors[0]]
    render(<ValidationPanel errors={singleError} />)
    expect(screen.getByText("1 issue found")).toBeInTheDocument()
  })

  it("displays summary counts by error type", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(screen.getByText("1 invalid value")).toBeInTheDocument()
    expect(screen.getByText("2 duplicate SKUs")).toBeInTheDocument()
  })

  it("shows singular form for single invalid value", () => {
    const errors: ValidationError[] = [mockErrors[0]]
    render(<ValidationPanel errors={errors} />)
    expect(screen.getByText("1 invalid value")).toBeInTheDocument()
  })

  it("shows singular form for single duplicate SKU", () => {
    const errors: ValidationError[] = [mockErrors[1]]
    render(<ValidationPanel errors={errors} />)
    expect(screen.getByText("1 duplicate SKU")).toBeInTheDocument()
  })

  it("displays all error messages", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(
      screen.getByText('Value "Yellow" does not exist in specification "Color"')
    ).toBeInTheDocument()
    expect(
      screen.getAllByText('Duplicate SKU "R-S" found in rows 2, 3').length
    ).toBe(2)
  })

  it("displays row and column location for each error", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(screen.getByText("Row 1, Col 1")).toBeInTheDocument()
    expect(screen.getAllByText("Row 2, Col 0").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Row 3, Col 0").length).toBeGreaterThanOrEqual(1)
  })

  it("calls onErrorClick when error item is clicked", async () => {
    const user = userEvent.setup()
    const handleErrorClick = vi.fn()
    render(<ValidationPanel errors={mockErrors} onErrorClick={handleErrorClick} />)

    const errorItems = screen.getAllByTestId("validation-error-item")
    await user.click(errorItems[0])

    expect(handleErrorClick).toHaveBeenCalledTimes(1)
    expect(handleErrorClick).toHaveBeenCalledWith(mockErrors[0])
  })

  it("calls onErrorClick with correct error for each item", async () => {
    const user = userEvent.setup()
    const handleErrorClick = vi.fn()
    render(<ValidationPanel errors={mockErrors} onErrorClick={handleErrorClick} />)

    const errorItems = screen.getAllByTestId("validation-error-item")

    await user.click(errorItems[1])
    expect(handleErrorClick).toHaveBeenCalledWith(mockErrors[1])

    await user.click(errorItems[2])
    expect(handleErrorClick).toHaveBeenCalledWith(mockErrors[2])
  })

  it("shows dismiss button when onDismiss is provided", () => {
    const handleDismiss = vi.fn()
    render(<ValidationPanel errors={mockErrors} onDismiss={handleDismiss} />)
    expect(screen.getByTestId("dismiss-validation")).toBeInTheDocument()
  })

  it("does not show dismiss button when onDismiss is not provided", () => {
    render(<ValidationPanel errors={mockErrors} />)
    expect(screen.queryByTestId("dismiss-validation")).not.toBeInTheDocument()
  })

  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup()
    const handleDismiss = vi.fn()
    render(<ValidationPanel errors={mockErrors} onDismiss={handleDismiss} />)

    await user.click(screen.getByTestId("dismiss-validation"))
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("renders errors in order", () => {
    render(<ValidationPanel errors={mockErrors} />)
    const errorItems = screen.getAllByTestId("validation-error-item")

    expect(errorItems[0]).toHaveTextContent("Yellow")
    expect(errorItems[1]).toHaveTextContent("Duplicate SKU")
    expect(errorItems[2]).toHaveTextContent("Duplicate SKU")
  })

  it("shows only duplicate SKU summary when no missing values", () => {
    const duplicateOnlyErrors: ValidationError[] = [
      mockErrors[1],
      mockErrors[2],
    ]
    render(<ValidationPanel errors={duplicateOnlyErrors} />)

    expect(screen.getByText("2 duplicate SKUs")).toBeInTheDocument()
    expect(screen.queryByText(/invalid value/)).not.toBeInTheDocument()
  })

  it("shows only missing values summary when no duplicates", () => {
    const missingOnlyErrors: ValidationError[] = [
      mockErrors[0],
      {
        row: 4,
        column: 2,
        message: 'Value "XL" does not exist in specification "Size"',
        type: "missing-value",
      },
    ]
    render(<ValidationPanel errors={missingOnlyErrors} />)

    expect(screen.getByText("2 invalid values")).toBeInTheDocument()
    expect(screen.queryByText(/duplicate SKU/)).not.toBeInTheDocument()
  })
})
