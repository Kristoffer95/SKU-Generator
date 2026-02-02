import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GuidedTourButton } from "./GuidedTourButton"

// Mock the guided-tour module
vi.mock("@/lib/guided-tour", () => ({
  startGuidedTour: vi.fn(),
  getTourState: vi.fn(() => ({
    basicCompleted: false,
    advancedCompleted: false,
    lastViewed: null,
    neverShowModal: false,
  })),
  resetTourState: vi.fn(),
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

  it("opens dropdown menu when clicked", async () => {
    const user = userEvent.setup()
    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-basic")).toBeInTheDocument()
      expect(screen.getByTestId("tour-option-advanced")).toBeInTheDocument()
      expect(screen.getByTestId("tour-option-reset")).toBeInTheDocument()
    })
  })

  it("shows 'Basic Tour' option in dropdown", async () => {
    const user = userEvent.setup()
    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByText("Basic Tour")).toBeInTheDocument()
    })
  })

  it("shows 'Advanced Tour' option in dropdown", async () => {
    const user = userEvent.setup()
    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByText("Advanced Tour")).toBeInTheDocument()
    })
  })

  it("shows 'Reset Tour Progress' option in dropdown", async () => {
    const user = userEvent.setup()
    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByText("Reset Tour Progress")).toBeInTheDocument()
    })
  })

  it("starts basic tour when 'Basic Tour' is clicked", async () => {
    const { startGuidedTour } = await import("@/lib/guided-tour")
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-basic")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("tour-option-basic"))

    expect(startGuidedTour).toHaveBeenCalledWith("basic", expect.any(Function))
  })

  it("starts advanced tour when 'Advanced Tour' is clicked", async () => {
    const { startGuidedTour } = await import("@/lib/guided-tour")
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-advanced")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("tour-option-advanced"))

    expect(startGuidedTour).toHaveBeenCalledWith("advanced", expect.any(Function))
  })

  it("resets tour progress when 'Reset Tour Progress' is clicked", async () => {
    const { resetTourState } = await import("@/lib/guided-tour")
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-reset")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("tour-option-reset"))

    expect(resetTourState).toHaveBeenCalled()
  })

  it("shows checkmark when basic tour is completed", async () => {
    const guidedTour = await import("@/lib/guided-tour")
    vi.mocked(guidedTour.getTourState).mockReturnValue({
      basicCompleted: true,
      advancedCompleted: false,
      lastViewed: "basic",
      neverShowModal: false,
    })
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("basic-tour-checkmark")).toBeInTheDocument()
    })
  })

  it("shows checkmark when advanced tour is completed", async () => {
    const guidedTour = await import("@/lib/guided-tour")
    vi.mocked(guidedTour.getTourState).mockReturnValue({
      basicCompleted: false,
      advancedCompleted: true,
      lastViewed: "advanced",
      neverShowModal: false,
    })
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("advanced-tour-checkmark")).toBeInTheDocument()
    })
  })

  it("shows both checkmarks when both tours are completed", async () => {
    const guidedTour = await import("@/lib/guided-tour")
    vi.mocked(guidedTour.getTourState).mockReturnValue({
      basicCompleted: true,
      advancedCompleted: true,
      lastViewed: "advanced",
      neverShowModal: false,
    })
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("basic-tour-checkmark")).toBeInTheDocument()
      expect(screen.getByTestId("advanced-tour-checkmark")).toBeInTheDocument()
    })
  })

  it("does not show checkmarks when no tours are completed", async () => {
    const guidedTour = await import("@/lib/guided-tour")
    vi.mocked(guidedTour.getTourState).mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: false,
    })
    const user = userEvent.setup()

    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-basic")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("basic-tour-checkmark")).not.toBeInTheDocument()
    expect(screen.queryByTestId("advanced-tour-checkmark")).not.toBeInTheDocument()
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

  it("has separator between tour options and reset option", async () => {
    const user = userEvent.setup()
    render(<GuidedTourButton />)

    await user.click(screen.getByTestId("start-tour-button"))

    await waitFor(() => {
      expect(screen.getByTestId("tour-option-reset")).toBeInTheDocument()
    })

    // Check that the separator element exists (role="separator")
    const separator = screen.getByRole("separator")
    expect(separator).toBeInTheDocument()
  })
})
