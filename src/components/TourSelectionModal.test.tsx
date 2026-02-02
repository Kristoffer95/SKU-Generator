import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TourSelectionModal } from "./TourSelectionModal"

// Mock the guided-tour module
vi.mock("@/lib/guided-tour", () => ({
  updateTourState: vi.fn(),
}))

describe("TourSelectionModal", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSelectTour = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal when open", () => {
    render(
      <TourSelectionModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelectTour={mockOnSelectTour}
      />
    )

    expect(screen.getByTestId("tour-selection-modal")).toBeInTheDocument()
    expect(screen.getByText("Welcome to SKU Generator!")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    render(
      <TourSelectionModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onSelectTour={mockOnSelectTour}
      />
    )

    expect(screen.queryByTestId("tour-selection-modal")).not.toBeInTheDocument()
  })

  describe("Basic Tour Card", () => {
    it("renders Basic Tour card with title and description", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("basic-tour-card")).toBeInTheDocument()
      expect(screen.getByText("Basic Tour")).toBeInTheDocument()
      expect(screen.getByText("Learn the core workflow in 18 steps")).toBeInTheDocument()
    })

    it("renders Basic Tour bullet points", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByText("App structure overview")).toBeInTheDocument()
      expect(screen.getByText("Creating specifications")).toBeInTheDocument()
      expect(screen.getByText("Adding columns to spreadsheet")).toBeInTheDocument()
      expect(screen.getByText("Auto-generating SKU codes")).toBeInTheDocument()
      expect(screen.getByText("Configuring SKU format")).toBeInTheDocument()
      expect(screen.getByText("Managing multiple sheets")).toBeInTheDocument()
    })

    it("renders Start Basic Tour button", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("start-basic-tour")).toBeInTheDocument()
      expect(screen.getByText("Start Basic Tour")).toBeInTheDocument()
    })

    it("calls onSelectTour with 'basic' when Start Basic Tour is clicked", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      fireEvent.click(screen.getByTestId("start-basic-tour"))

      expect(mockOnSelectTour).toHaveBeenCalledWith("basic")
    })
  })

  describe("Advanced Tour Card", () => {
    it("renders Advanced Tour card with title and description", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("advanced-tour-card")).toBeInTheDocument()
      expect(screen.getByText("Advanced Tour")).toBeInTheDocument()
      expect(screen.getByText("Master all features in 28 steps")).toBeInTheDocument()
    })

    it("renders Advanced Tour bullet points", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByText("Toolbar controls and formatting")).toBeInTheDocument()
      expect(screen.getByText("Column and row operations")).toBeInTheDocument()
      expect(screen.getByText("Drag-to-reorder and pinning")).toBeInTheDocument()
      expect(screen.getByText("Import and export options")).toBeInTheDocument()
      expect(screen.getByText("Validation panel")).toBeInTheDocument()
      expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument()
    })

    it("renders Start Advanced Tour button", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("start-advanced-tour")).toBeInTheDocument()
      expect(screen.getByText("Start Advanced Tour")).toBeInTheDocument()
    })

    it("calls onSelectTour with 'advanced' when Start Advanced Tour is clicked", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      fireEvent.click(screen.getByTestId("start-advanced-tour"))

      expect(mockOnSelectTour).toHaveBeenCalledWith("advanced")
    })
  })

  describe("Skip for now link", () => {
    it("renders Skip for now link", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("skip-tour-link")).toBeInTheDocument()
      expect(screen.getByText("Skip for now")).toBeInTheDocument()
    })

    it("calls onOpenChange with false when Skip for now is clicked", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      fireEvent.click(screen.getByTestId("skip-tour-link"))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Don't show this again checkbox", () => {
    it("renders checkbox unchecked by default", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      const checkbox = screen.getByTestId("never-show-checkbox") as HTMLInputElement
      expect(checkbox).toBeInTheDocument()
      expect(checkbox.checked).toBe(false)
      expect(screen.getByText("Don't show this again")).toBeInTheDocument()
    })

    it("toggles checkbox when clicked", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      const checkbox = screen.getByTestId("never-show-checkbox") as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      fireEvent.click(checkbox)
      expect(checkbox.checked).toBe(true)

      fireEvent.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })

    it("updates neverShowModal when checkbox is checked and Skip is clicked", async () => {
      const { updateTourState } = await import("@/lib/guided-tour")

      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      // Check the checkbox
      const checkbox = screen.getByTestId("never-show-checkbox")
      fireEvent.click(checkbox)

      // Click Skip for now
      fireEvent.click(screen.getByTestId("skip-tour-link"))

      expect(updateTourState).toHaveBeenCalledWith({ neverShowModal: true })
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it("updates neverShowModal when checkbox is checked and tour is selected", async () => {
      const { updateTourState } = await import("@/lib/guided-tour")

      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      // Check the checkbox
      const checkbox = screen.getByTestId("never-show-checkbox")
      fireEvent.click(checkbox)

      // Select basic tour
      fireEvent.click(screen.getByTestId("start-basic-tour"))

      expect(updateTourState).toHaveBeenCalledWith({ neverShowModal: true })
      expect(mockOnSelectTour).toHaveBeenCalledWith("basic")
    })

    it("does not update neverShowModal when checkbox is unchecked", async () => {
      const { updateTourState } = await import("@/lib/guided-tour")

      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      // Click Skip without checking the checkbox
      fireEvent.click(screen.getByTestId("skip-tour-link"))

      expect(updateTourState).not.toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Close button", () => {
    it("renders close button", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      expect(screen.getByTestId("close-modal-button")).toBeInTheDocument()
    })

    it("calls onOpenChange with false when close button is clicked", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      fireEvent.click(screen.getByTestId("close-modal-button"))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Visual elements", () => {
    it("renders BookOpen icon for Basic Tour", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      const basicCard = screen.getByTestId("basic-tour-card")
      expect(basicCard.querySelector("svg")).toBeInTheDocument()
    })

    it("renders Zap icon for Advanced Tour", () => {
      render(
        <TourSelectionModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSelectTour={mockOnSelectTour}
        />
      )

      const advancedCard = screen.getByTestId("advanced-tour-card")
      expect(advancedCard.querySelector("svg")).toBeInTheDocument()
    })
  })
})
