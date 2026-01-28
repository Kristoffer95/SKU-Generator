import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { GuidedTourButton } from "./GuidedTourButton"

// Mock the guided-tour module
vi.mock("@/lib/guided-tour", () => ({
  startGuidedTour: vi.fn(),
}))

describe("GuidedTourButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders tour button with correct text", () => {
    render(<GuidedTourButton />)

    expect(screen.getByTestId("start-tour-button")).toBeInTheDocument()
    expect(screen.getByText("Tour")).toBeInTheDocument()
  })

  it("has HelpCircle icon", () => {
    render(<GuidedTourButton />)

    const button = screen.getByTestId("start-tour-button")
    const svg = button.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("starts tour when clicked", async () => {
    const { startGuidedTour } = await import("@/lib/guided-tour")

    render(<GuidedTourButton />)

    const button = screen.getByTestId("start-tour-button")
    fireEvent.click(button)

    expect(startGuidedTour).toHaveBeenCalledTimes(1)
  })

  it("applies custom className", () => {
    render(<GuidedTourButton className="custom-class" />)

    const button = screen.getByTestId("start-tour-button")
    expect(button).toHaveClass("custom-class")
  })

  it("supports different variants", () => {
    const { rerender } = render(<GuidedTourButton variant="ghost" />)
    expect(screen.getByTestId("start-tour-button")).toBeInTheDocument()

    rerender(<GuidedTourButton variant="default" />)
    expect(screen.getByTestId("start-tour-button")).toBeInTheDocument()
  })

  it("supports different sizes", () => {
    const { rerender } = render(<GuidedTourButton size="lg" />)
    expect(screen.getByTestId("start-tour-button")).toBeInTheDocument()

    rerender(<GuidedTourButton size="icon" />)
    expect(screen.getByTestId("start-tour-button")).toBeInTheDocument()
  })
})
