import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  hasTourCompleted,
  markTourCompleted,
  resetTourStatus,
  startGuidedTour,
} from "./guided-tour"

// Mock driver.js
const mockDrive = vi.fn()
let capturedOnDestroyed: (() => void) | undefined

vi.mock("driver.js", () => ({
  driver: vi.fn((config: { onDestroyed?: () => void }) => {
    capturedOnDestroyed = config?.onDestroyed
    return {
      drive: mockDrive,
    }
  }),
}))

describe("guided-tour", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    capturedOnDestroyed = undefined
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
    it("creates driver instance and starts tour", async () => {
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
  })
})
