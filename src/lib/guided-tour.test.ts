import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  hasTourCompleted,
  markTourCompleted,
  resetTourStatus,
  startGuidedTour,
  stopGuidedTour,
  registerTourDialogOpeners,
  unregisterTourDialogOpeners,
} from "./guided-tour"

// Mock driver.js
const mockDrive = vi.fn()
const mockDestroy = vi.fn()
let capturedOnDestroyed: (() => void) | undefined
let capturedOnHighlightStarted: ((element: unknown, step: unknown, opts: { state: { activeIndex?: number } }) => void) | undefined
let capturedOnDeselected: ((element: unknown, step: unknown, opts: { state: { activeIndex?: number } }) => void) | undefined

vi.mock("driver.js", () => ({
  driver: vi.fn((config: {
    onDestroyed?: () => void
    onHighlightStarted?: (element: unknown, step: unknown, opts: { state: { activeIndex?: number } }) => void
    onDeselected?: (element: unknown, step: unknown, opts: { state: { activeIndex?: number } }) => void
  }) => {
    capturedOnDestroyed = config?.onDestroyed
    capturedOnHighlightStarted = config?.onHighlightStarted
    capturedOnDeselected = config?.onDeselected
    return {
      drive: mockDrive,
      destroy: mockDestroy,
    }
  }),
}))

describe("guided-tour", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    capturedOnDestroyed = undefined
    capturedOnHighlightStarted = undefined
    capturedOnDeselected = undefined
  })

  describe("hasTourCompleted", () => {
    it("returns false when tour has not been completed", () => {
      expect(hasTourCompleted()).toBe(false)
    })

    it("returns true when tour has been completed", () => {
      localStorage.setItem("sku-generator-tour-completed", "true")
      expect(hasTourCompleted()).toBe(true)
    })

    it("returns false for invalid localStorage value", () => {
      localStorage.setItem("sku-generator-tour-completed", "false")
      expect(hasTourCompleted()).toBe(false)
    })
  })

  describe("markTourCompleted", () => {
    it("sets localStorage flag to true", () => {
      markTourCompleted()
      expect(localStorage.getItem("sku-generator-tour-completed")).toBe("true")
    })
  })

  describe("resetTourStatus", () => {
    it("removes localStorage flag", () => {
      localStorage.setItem("sku-generator-tour-completed", "true")
      resetTourStatus()
      expect(localStorage.getItem("sku-generator-tour-completed")).toBeNull()
    })
  })

  describe("startGuidedTour", () => {
    it("creates driver instance and starts tour with 16 steps", async () => {
      const { driver } = await import("driver.js")

      startGuidedTour()

      expect(driver).toHaveBeenCalledWith(
        expect.objectContaining({
          showProgress: true,
          steps: expect.any(Array),
          nextBtnText: "Next",
          prevBtnText: "Previous",
          doneBtnText: "Done",
          popoverClass: "sku-tour-popover",
        })
      )

      // Verify 16 steps
      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      expect(calledConfig?.steps).toHaveLength(16)

      expect(mockDrive).toHaveBeenCalled()
    })

    it("calls onComplete callback when tour is destroyed", () => {
      const onComplete = vi.fn()
      startGuidedTour(onComplete)

      // Simulate tour being destroyed
      capturedOnDestroyed?.()

      expect(onComplete).toHaveBeenCalled()
      expect(localStorage.getItem("sku-generator-tour-completed")).toBe("true")
    })

    it("closes dialogs when tour is destroyed", () => {
      const closeAll = vi.fn()
      registerTourDialogOpeners({ closeAll })

      startGuidedTour()
      capturedOnDestroyed?.()

      expect(closeAll).toHaveBeenCalled()
    })
  })

  describe("stopGuidedTour", () => {
    it("destroys active tour instance", () => {
      startGuidedTour()
      stopGuidedTour()

      expect(mockDestroy).toHaveBeenCalled()
    })

    it("does nothing if no tour is active", () => {
      stopGuidedTour()
      // Should not throw
      expect(mockDestroy).not.toHaveBeenCalled()
    })
  })

  describe("dialog opener registry", () => {
    it("registerTourDialogOpeners registers callbacks", () => {
      const addSpec = vi.fn()
      const settings = vi.fn()
      const closeAll = vi.fn()

      registerTourDialogOpeners({ addSpec, settings, closeAll })

      // Start tour and trigger step 4 (0-indexed) to open AddSpec dialog
      startGuidedTour()
      capturedOnHighlightStarted?.(null, null, { state: { activeIndex: 4 } })

      expect(addSpec).toHaveBeenCalled()
    })

    it("unregisterTourDialogOpeners removes callbacks", () => {
      const addSpec = vi.fn()
      registerTourDialogOpeners({ addSpec })
      unregisterTourDialogOpeners(["addSpec"])

      startGuidedTour()
      capturedOnHighlightStarted?.(null, null, { state: { activeIndex: 4 } })

      expect(addSpec).not.toHaveBeenCalled()
    })

    it("opens AddSpecDialog on steps 5-8 (0-indexed: 4-7)", () => {
      const addSpec = vi.fn()
      registerTourDialogOpeners({ addSpec })

      startGuidedTour()

      // Test all AddSpec dialog steps
      const addSpecSteps = [4, 5, 6, 7]
      addSpecSteps.forEach((stepIndex) => {
        capturedOnHighlightStarted?.(null, null, { state: { activeIndex: stepIndex } })
      })

      expect(addSpec).toHaveBeenCalledTimes(4)
    })

    it("opens SettingsDialog on steps 13-14 (0-indexed: 12-13)", () => {
      const settings = vi.fn()
      registerTourDialogOpeners({ settings })

      startGuidedTour()

      // Test Settings dialog steps
      const settingsSteps = [12, 13]
      settingsSteps.forEach((stepIndex) => {
        capturedOnHighlightStarted?.(null, null, { state: { activeIndex: stepIndex } })
      })

      expect(settings).toHaveBeenCalledTimes(2)
    })

    it("closes dialogs when leaving dialog step groups", () => {
      const closeAll = vi.fn()
      registerTourDialogOpeners({ closeAll })

      startGuidedTour()

      // Leave last AddSpec step (7) to step 8
      capturedOnDeselected?.(null, null, { state: { activeIndex: 7 } })

      expect(closeAll).toHaveBeenCalled()
    })

    it("does not close dialogs when moving within same dialog group", () => {
      const closeAll = vi.fn()
      registerTourDialogOpeners({ closeAll })

      startGuidedTour()

      // Move from step 4 to step 5 (both AddSpec)
      capturedOnDeselected?.(null, null, { state: { activeIndex: 4 } })

      expect(closeAll).not.toHaveBeenCalled()
    })
  })

  describe("tour step content", () => {
    it("includes Phase 1 Foundation steps (1-4)", async () => {
      const { driver } = await import("driver.js")
      startGuidedTour()

      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      const steps = calledConfig?.steps ?? []

      // Step 1: Welcome
      expect(steps[0].popover?.title).toBe("Welcome to SKU Generator!")

      // Step 2: Sidebar overview
      expect(steps[1].popover?.title).toBe("Specifications Sidebar")
      expect(steps[1].element).toBe('[data-tour="sidebar"]')

      // Step 3: Spreadsheet overview
      expect(steps[2].popover?.title).toBe("The Spreadsheet")
      expect(steps[2].element).toBe('[data-tour="spreadsheet"]')

      // Step 4: Foundation checkpoint
      expect(steps[3].popover?.title).toBe("Foundation Complete!")
    })

    it("includes Phase 2 Create SKU steps (5-12)", async () => {
      const { driver } = await import("driver.js")
      startGuidedTour()

      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      const steps = calledConfig?.steps ?? []

      // Step 5: Add spec button
      expect(steps[4].popover?.title).toBe("Phase 2: Add a Specification")
      expect(steps[4].element).toBe('[data-tour="add-spec-button"]')

      // Step 6: Dialog overview
      expect(steps[5].element).toBe('[data-tour="add-spec-dialog"]')

      // Step 9: Spec item
      expect(steps[8].element).toBe('[data-tour="spec-item"]')

      // Step 10: Add Column button
      expect(steps[9].popover?.title).toBe("Add Columns")
      expect(steps[9].element).toBe('[data-tour="add-column-button"]')

      // Step 12: Checkpoint
      expect(steps[11].popover?.title).toBe("SKU Creation Complete!")
    })

    it("includes Phase 3 Advanced steps (13-16)", async () => {
      const { driver } = await import("driver.js")
      startGuidedTour()

      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      const steps = calledConfig?.steps ?? []

      // Step 13: Settings button
      expect(steps[12].popover?.title).toBe("Phase 3: SKU Settings")
      expect(steps[12].element).toBe('[data-tour="settings-button"]')

      // Step 14: Settings dialog
      expect(steps[13].element).toBe('[data-tour="settings-dialog"]')

      // Step 15: Sheet tabs
      expect(steps[14].popover?.title).toBe("Multiple Sheets")
      expect(steps[14].element).toBe('[data-tour="sheet-tabs"]')

      // Step 16: Completion
      expect(steps[15].popover?.title).toBe("You're Ready!")
    })

    it("uses only data-tour selectors (no .fortune-sheet-* selectors)", async () => {
      const { driver } = await import("driver.js")
      startGuidedTour()

      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      const steps = calledConfig?.steps ?? []

      steps.forEach((step) => {
        if (step.element) {
          expect(step.element).not.toMatch(/fortune-sheet/i)
          expect(step.element).toMatch(/^\[data-tour=|^\[data-testid=/)
        }
      })
    })
  })
})
