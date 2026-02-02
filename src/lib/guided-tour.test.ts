import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  hasTourCompleted,
  markTourCompleted,
  resetTourStatus,
  startGuidedTour,
  stopGuidedTour,
  registerTourDialogOpeners,
  unregisterTourDialogOpeners,
  getTourState,
  updateTourState,
  resetTourState,
  basicTourSteps,
  type TourState,
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

  // ============ NEW TOUR STATE MANAGEMENT TESTS ============

  describe("getTourState", () => {
    it("returns default state when no state exists", () => {
      const state = getTourState()
      expect(state).toEqual({
        basicCompleted: false,
        advancedCompleted: false,
        lastViewed: null,
        neverShowModal: false,
      })
    })

    it("returns stored state from localStorage", () => {
      const storedState: TourState = {
        basicCompleted: true,
        advancedCompleted: false,
        lastViewed: "basic",
        neverShowModal: true,
      }
      localStorage.setItem("sku-generator-tour-state", JSON.stringify(storedState))

      const state = getTourState()
      expect(state).toEqual(storedState)
    })

    it("handles partial stored state with defaults", () => {
      localStorage.setItem("sku-generator-tour-state", JSON.stringify({ basicCompleted: true }))

      const state = getTourState()
      expect(state).toEqual({
        basicCompleted: true,
        advancedCompleted: false,
        lastViewed: null,
        neverShowModal: false,
      })
    })

    it("returns default state for invalid JSON", () => {
      localStorage.setItem("sku-generator-tour-state", "invalid-json")

      const state = getTourState()
      expect(state).toEqual({
        basicCompleted: false,
        advancedCompleted: false,
        lastViewed: null,
        neverShowModal: false,
      })
    })
  })

  describe("updateTourState", () => {
    it("updates specific fields while preserving others", () => {
      updateTourState({ basicCompleted: true })

      let state = getTourState()
      expect(state.basicCompleted).toBe(true)
      expect(state.advancedCompleted).toBe(false)

      updateTourState({ advancedCompleted: true, lastViewed: "advanced" })

      state = getTourState()
      expect(state.basicCompleted).toBe(true)
      expect(state.advancedCompleted).toBe(true)
      expect(state.lastViewed).toBe("advanced")
    })

    it("can set neverShowModal flag", () => {
      updateTourState({ neverShowModal: true })

      const state = getTourState()
      expect(state.neverShowModal).toBe(true)
    })
  })

  describe("resetTourState", () => {
    it("removes tour state from localStorage", () => {
      updateTourState({ basicCompleted: true, advancedCompleted: true })

      resetTourState()

      expect(localStorage.getItem("sku-generator-tour-state")).toBeNull()
      const state = getTourState()
      expect(state).toEqual({
        basicCompleted: false,
        advancedCompleted: false,
        lastViewed: null,
        neverShowModal: false,
      })
    })

    it("also removes old tour completed key", () => {
      localStorage.setItem("sku-generator-tour-completed", "true")

      resetTourState()

      expect(localStorage.getItem("sku-generator-tour-completed")).toBeNull()
    })
  })

  describe("hasTourCompleted (with type parameter)", () => {
    it("returns false when basic tour has not been completed", () => {
      expect(hasTourCompleted("basic")).toBe(false)
    })

    it("returns true when basic tour has been completed", () => {
      updateTourState({ basicCompleted: true })
      expect(hasTourCompleted("basic")).toBe(true)
    })

    it("returns false when advanced tour has not been completed", () => {
      expect(hasTourCompleted("advanced")).toBe(false)
    })

    it("returns true when advanced tour has been completed", () => {
      updateTourState({ advancedCompleted: true })
      expect(hasTourCompleted("advanced")).toBe(true)
    })

    it("returns correct values when both tours have different completion states", () => {
      updateTourState({ basicCompleted: true, advancedCompleted: false })
      expect(hasTourCompleted("basic")).toBe(true)
      expect(hasTourCompleted("advanced")).toBe(false)
    })
  })

  describe("migration from old storage key", () => {
    it("migrates old tour-completed key to new state with basicCompleted=true", () => {
      localStorage.setItem("sku-generator-tour-completed", "true")

      const state = getTourState()

      expect(state.basicCompleted).toBe(true)
      expect(state.lastViewed).toBe("basic")
      expect(localStorage.getItem("sku-generator-tour-completed")).toBeNull()
      expect(localStorage.getItem("sku-generator-tour-state")).not.toBeNull()
    })

    it("removes old key even if value is not 'true'", () => {
      localStorage.setItem("sku-generator-tour-completed", "false")

      const state = getTourState()

      expect(state.basicCompleted).toBe(false)
      expect(localStorage.getItem("sku-generator-tour-completed")).toBeNull()
    })

    it("does not migrate if new state already exists", () => {
      const newState: TourState = {
        basicCompleted: false,
        advancedCompleted: true,
        lastViewed: "advanced",
        neverShowModal: false,
      }
      localStorage.setItem("sku-generator-tour-state", JSON.stringify(newState))
      localStorage.setItem("sku-generator-tour-completed", "true")

      // Trigger potential migration by calling getTourState
      getTourState()

      // Old key should be removed but new state should be preserved
      // Note: Migration happens before checking new state, so old key is removed
      // but since newState already exists, it's used instead
      expect(localStorage.getItem("sku-generator-tour-completed")).toBeNull()
    })
  })

  // ============ LEGACY COMPATIBILITY TESTS ============

  describe("markTourCompleted (legacy)", () => {
    it("sets basicCompleted to true in new state format", () => {
      markTourCompleted()

      const state = getTourState()
      expect(state.basicCompleted).toBe(true)
      expect(state.lastViewed).toBe("basic")
    })
  })

  describe("resetTourStatus (legacy)", () => {
    it("resets all tour state", () => {
      updateTourState({ basicCompleted: true, advancedCompleted: true })

      resetTourStatus()

      const state = getTourState()
      expect(state.basicCompleted).toBe(false)
      expect(state.advancedCompleted).toBe(false)
    })
  })

  describe("startGuidedTour", () => {
    it("creates driver instance and starts basic tour with 18 steps by default", async () => {
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

      // Verify 18 steps for basic tour
      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      expect(calledConfig?.steps).toHaveLength(18)

      expect(mockDrive).toHaveBeenCalled()
    })

    it("starts basic tour when type is 'basic'", async () => {
      const { driver } = await import("driver.js")

      startGuidedTour("basic")

      const calledConfig = vi.mocked(driver).mock.calls[0]?.[0]
      expect(calledConfig?.steps).toHaveLength(18)
    })

    it("calls onComplete callback when tour is destroyed", () => {
      const onComplete = vi.fn()
      startGuidedTour(onComplete)

      // Simulate tour being destroyed
      capturedOnDestroyed?.()

      expect(onComplete).toHaveBeenCalled()
      // markTourCompleted is called, which updates the new state format
      const state = getTourState()
      expect(state.basicCompleted).toBe(true)
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

    it("includes Phase 3 Core steps (13-18)", async () => {
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

      // Step 16: Add sheet button
      expect(steps[15].popover?.title).toBe("Add New Sheets")
      expect(steps[15].element).toBe('[data-tour="add-sheet-button"]')

      // Step 17: Import/Export
      expect(steps[16].popover?.title).toBe("Import & Export")
      expect(steps[16].element).toBe('[data-tour="import-button"]')

      // Step 18: Completion
      expect(steps[17].popover?.title).toBe("Basic Tour Complete!")
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

  describe("basicTourSteps export", () => {
    it("exports basicTourSteps array with exactly 18 steps", () => {
      expect(basicTourSteps).toHaveLength(18)
    })

    it("Phase 1 Foundation has 4 steps (1-4)", () => {
      // Steps 0-3 are Foundation
      expect(basicTourSteps[0].popover?.title).toBe("Welcome to SKU Generator!")
      expect(basicTourSteps[1].popover?.title).toBe("Specifications Sidebar")
      expect(basicTourSteps[2].popover?.title).toBe("The Spreadsheet")
      expect(basicTourSteps[3].popover?.title).toBe("Foundation Complete!")
    })

    it("Phase 2 Create SKU has 8 steps (5-12)", () => {
      // Steps 4-11 are Create SKU
      expect(basicTourSteps[4].popover?.title).toBe("Phase 2: Add a Specification")
      expect(basicTourSteps[5].popover?.title).toBe("Add Specification Dialog")
      expect(basicTourSteps[6].popover?.title).toBe("Specification Name")
      expect(basicTourSteps[7].popover?.title).toBe("Define Values")
      expect(basicTourSteps[8].popover?.title).toBe("Specification Cards")
      expect(basicTourSteps[9].popover?.title).toBe("Add Columns")
      expect(basicTourSteps[10].popover?.title).toBe("Using Dropdowns & SKU Generation")
      expect(basicTourSteps[11].popover?.title).toBe("SKU Creation Complete!")
    })

    it("Phase 3 Core has 6 steps (13-18)", () => {
      // Steps 12-17 are Core
      expect(basicTourSteps[12].popover?.title).toBe("Phase 3: SKU Settings")
      expect(basicTourSteps[13].popover?.title).toBe("Configure SKU Format")
      expect(basicTourSteps[14].popover?.title).toBe("Multiple Sheets")
      expect(basicTourSteps[15].popover?.title).toBe("Add New Sheets")
      expect(basicTourSteps[16].popover?.title).toBe("Import & Export")
      expect(basicTourSteps[17].popover?.title).toBe("Basic Tour Complete!")
    })

    it("has interactive onNextClick callbacks on appropriate steps", () => {
      // Step 5: Add spec button has onNextClick
      expect(basicTourSteps[4].popover?.onNextClick).toBeDefined()

      // Step 13: Settings button has onNextClick
      expect(basicTourSteps[12].popover?.onNextClick).toBeDefined()

      // Step 16: Add sheet button has onNextClick
      expect(basicTourSteps[15].popover?.onNextClick).toBeDefined()
    })
  })
})
