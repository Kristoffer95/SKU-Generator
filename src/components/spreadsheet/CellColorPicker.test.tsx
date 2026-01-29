import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CellColorPicker, COLOR_PALETTE } from "./CellColorPicker"

describe("CellColorPicker", () => {
  describe("rendering", () => {
    it("renders the trigger button with paintbrush icon", () => {
      render(<CellColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      expect(trigger).toBeInTheDocument()
    })

    it("shows disabled state when disabled prop is true", () => {
      render(<CellColorPicker onColorSelect={vi.fn()} disabled />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      expect(trigger).toBeDisabled()
    })

    it("is enabled when disabled prop is false", () => {
      render(<CellColorPicker onColorSelect={vi.fn()} disabled={false} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      expect(trigger).not.toBeDisabled()
    })

    it("shows current color in the indicator bar", () => {
      const currentColor = "#fce4ec"
      render(<CellColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      const indicator = trigger.querySelector("div.absolute")
      expect(indicator).toHaveStyle({ backgroundColor: currentColor })
    })
  })

  describe("dropdown", () => {
    it("opens dropdown when trigger is clicked", async () => {
      const user = userEvent.setup()
      render(<CellColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const dropdown = screen.getByTestId("cell-color-picker-dropdown")
        expect(dropdown).toBeInTheDocument()
      })
    })

    it("shows clear color option", async () => {
      const user = userEvent.setup()
      render(<CellColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const clearButton = screen.getByTestId("cell-color-clear")
        expect(clearButton).toBeInTheDocument()
        expect(clearButton).toHaveTextContent("Clear color")
      })
    })

    it("shows all colors from the palette", async () => {
      const user = userEvent.setup()
      render(<CellColorPicker onColorSelect={vi.fn()} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        for (const color of COLOR_PALETTE) {
          const swatch = screen.getByTestId(`cell-color-swatch-${color.replace("#", "")}`)
          expect(swatch).toBeInTheDocument()
          expect(swatch).toHaveStyle({ backgroundColor: color })
        }
      })
    })

    it("shows checkmark on currently selected color", async () => {
      const user = userEvent.setup()
      const currentColor = "#90caf9"
      render(<CellColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const selectedSwatch = screen.getByTestId(`cell-color-swatch-${currentColor.replace("#", "")}`)
        expect(selectedSwatch).toHaveTextContent("✓")
      })
    })

    it("does not show checkmark on non-selected colors", async () => {
      const user = userEvent.setup()
      const currentColor = "#90caf9"
      const otherColor = "#fce4ec"
      render(<CellColorPicker onColorSelect={vi.fn()} currentColor={currentColor} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        const otherSwatch = screen.getByTestId(`cell-color-swatch-${otherColor.replace("#", "")}`)
        expect(otherSwatch).not.toHaveTextContent("✓")
      })
    })
  })

  describe("color selection", () => {
    it("calls onColorSelect with color when a swatch is clicked", async () => {
      const user = userEvent.setup()
      const onColorSelect = vi.fn()
      const colorToSelect = "#81c784"
      render(<CellColorPicker onColorSelect={onColorSelect} />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByTestId(`cell-color-swatch-${colorToSelect.replace("#", "")}`)).toBeInTheDocument()
      })

      const swatch = screen.getByTestId(`cell-color-swatch-${colorToSelect.replace("#", "")}`)
      await user.click(swatch)

      expect(onColorSelect).toHaveBeenCalledWith(colorToSelect)
    })

    it("calls onColorSelect with null when clear color is clicked", async () => {
      const user = userEvent.setup()
      const onColorSelect = vi.fn()
      render(<CellColorPicker onColorSelect={onColorSelect} currentColor="#fce4ec" />)

      const trigger = screen.getByTestId("cell-color-picker-trigger")
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByTestId("cell-color-clear")).toBeInTheDocument()
      })

      const clearButton = screen.getByTestId("cell-color-clear")
      await user.click(clearButton)

      expect(onColorSelect).toHaveBeenCalledWith(null)
    })
  })

  describe("COLOR_PALETTE", () => {
    it("has exactly 18 colors", () => {
      expect(COLOR_PALETTE).toHaveLength(18)
    })

    it("all colors are valid hex colors", () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/
      for (const color of COLOR_PALETTE) {
        expect(color).toMatch(hexColorRegex)
      }
    })

    it("does not include system colors (read-only and duplicate warning)", () => {
      // These colors are reserved for system use
      const systemColors = ["#f1f5f9", "#fef3c7"]
      for (const systemColor of systemColors) {
        expect(COLOR_PALETTE).not.toContain(systemColor)
      }
    })
  })
})
