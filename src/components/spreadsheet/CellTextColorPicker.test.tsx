import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CellTextColorPicker, TEXT_COLOR_PALETTE } from "./CellTextColorPicker"

describe("CellTextColorPicker", () => {
  describe("rendering", () => {
    it("renders the trigger button with type icon", () => {
      render(<CellTextColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      expect(trigger).toBeInTheDocument()
    })

    it("shows disabled state when disabled prop is true", () => {
      render(<CellTextColorPicker onColorSelect={vi.fn()} disabled />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      expect(trigger).toBeDisabled()
    })

    it("is enabled when disabled prop is false", () => {
      render(<CellTextColorPicker onColorSelect={vi.fn()} disabled={false} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      expect(trigger).not.toBeDisabled()
    })

    it("shows current color in the indicator bar", () => {
      const currentColor = "#dc2626"
      render(<CellTextColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      const indicator = trigger.querySelector("div.absolute")
      expect(indicator).toHaveStyle({ backgroundColor: currentColor })
    })
  })

  describe("dropdown", () => {
    it("opens dropdown when trigger is clicked", async () => {
      const user = userEvent.setup()
      render(<CellTextColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const dropdown = screen.getByTestId("cell-text-color-picker-dropdown")
        expect(dropdown).toBeInTheDocument()
      })
    })

    it("shows clear text color option", async () => {
      const user = userEvent.setup()
      render(<CellTextColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const clearButton = screen.getByTestId("cell-text-color-clear")
        expect(clearButton).toBeInTheDocument()
        expect(clearButton).toHaveTextContent("Clear text color")
      })
    })

    it("shows all colors from the palette", async () => {
      const user = userEvent.setup()
      render(<CellTextColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        for (const color of TEXT_COLOR_PALETTE) {
          const swatch = screen.getByTestId(`cell-text-color-swatch-${color.replace("#", "")}`)
          expect(swatch).toBeInTheDocument()
          expect(swatch).toHaveStyle({ backgroundColor: color })
        }
      })
    })

    it("shows checkmark on currently selected color", async () => {
      const user = userEvent.setup()
      const currentColor = "#2563eb"
      render(<CellTextColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const selectedSwatch = screen.getByTestId(`cell-text-color-swatch-${currentColor.replace("#", "")}`)
        expect(selectedSwatch).toHaveTextContent("✓")
      })
    })

    it("does not show checkmark on non-selected colors", async () => {
      const user = userEvent.setup()
      const currentColor = "#2563eb"
      const otherColor = "#dc2626"
      render(<CellTextColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const otherSwatch = screen.getByTestId(`cell-text-color-swatch-${otherColor.replace("#", "")}`)
        expect(otherSwatch).not.toHaveTextContent("✓")
      })
    })
  })

  describe("color selection", () => {
    it("calls onColorSelect with color when a swatch is clicked", async () => {
      const user = userEvent.setup()
      const onColorSelect = vi.fn()
      const colorToSelect = "#16a34a"
      render(<CellTextColorPicker onColorSelect={onColorSelect} />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByTestId(`cell-text-color-swatch-${colorToSelect.replace("#", "")}`)).toBeInTheDocument()
      })

      const swatch = screen.getByTestId(`cell-text-color-swatch-${colorToSelect.replace("#", "")}`)
      await user.click(swatch)

      expect(onColorSelect).toHaveBeenCalledWith(colorToSelect)
    })

    it("calls onColorSelect with null when clear text color is clicked", async () => {
      const user = userEvent.setup()
      const onColorSelect = vi.fn()
      render(<CellTextColorPicker onColorSelect={onColorSelect} currentColor="#dc2626" />)

      const trigger = screen.getByTestId("cell-text-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByTestId("cell-text-color-clear")).toBeInTheDocument()
      })

      const clearButton = screen.getByTestId("cell-text-color-clear")
      await user.click(clearButton)

      expect(onColorSelect).toHaveBeenCalledWith(null)
    })
  })

  describe("TEXT_COLOR_PALETTE", () => {
    it("has exactly 18 colors", () => {
      expect(TEXT_COLOR_PALETTE).toHaveLength(18)
    })

    it("all colors are valid hex colors", () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/
      for (const color of TEXT_COLOR_PALETTE) {
        expect(color).toMatch(hexColorRegex)
      }
    })

    it("includes black for default text option", () => {
      expect(TEXT_COLOR_PALETTE).toContain("#000000")
    })
  })
})
