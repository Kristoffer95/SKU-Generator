import { driver, DriveStep, Driver } from "driver.js"
import "driver.js/dist/driver.css"

// ============ TOUR STATE MANAGEMENT ============

const TOUR_STATE_KEY = "sku-generator-tour-state"
const OLD_TOUR_COMPLETED_KEY = "sku-generator-tour-completed"

export type TourType = "basic" | "advanced"

export interface TourState {
  basicCompleted: boolean
  advancedCompleted: boolean
  lastViewed: TourType | null
  neverShowModal: boolean
}

const DEFAULT_TOUR_STATE: TourState = {
  basicCompleted: false,
  advancedCompleted: false,
  lastViewed: null,
  neverShowModal: false,
}

/**
 * Migrate from old single-tour storage key to new two-tour state.
 * If user completed the old tour, mark basic tour as completed.
 */
function migrateFromOldTourKey(): TourState | null {
  const oldValue = localStorage.getItem(OLD_TOUR_COMPLETED_KEY)
  if (oldValue === "true") {
    localStorage.removeItem(OLD_TOUR_COMPLETED_KEY)
    return {
      ...DEFAULT_TOUR_STATE,
      basicCompleted: true,
      lastViewed: "basic",
    }
  }
  // Clean up old key even if not "true"
  if (oldValue !== null) {
    localStorage.removeItem(OLD_TOUR_COMPLETED_KEY)
  }
  return null
}

export function getTourState(): TourState {
  // Check for migration from old key first
  const migratedState = migrateFromOldTourKey()
  if (migratedState) {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(migratedState))
    return migratedState
  }

  const stored = localStorage.getItem(TOUR_STATE_KEY)
  if (!stored) {
    return { ...DEFAULT_TOUR_STATE }
  }

  try {
    const parsed = JSON.parse(stored) as Partial<TourState>
    return {
      basicCompleted: parsed.basicCompleted ?? false,
      advancedCompleted: parsed.advancedCompleted ?? false,
      lastViewed: parsed.lastViewed ?? null,
      neverShowModal: parsed.neverShowModal ?? false,
    }
  } catch {
    return { ...DEFAULT_TOUR_STATE }
  }
}

export function updateTourState(updates: Partial<TourState>): void {
  const current = getTourState()
  const newState = { ...current, ...updates }
  localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(newState))
}

export function resetTourState(): void {
  localStorage.removeItem(TOUR_STATE_KEY)
  localStorage.removeItem(OLD_TOUR_COMPLETED_KEY)
}

export function hasTourCompleted(type: TourType): boolean {
  const state = getTourState()
  return type === "basic" ? state.basicCompleted : state.advancedCompleted
}

// Legacy function for backward compatibility - marks basic tour as completed
export function markTourCompleted(): void {
  updateTourState({ basicCompleted: true, lastViewed: "basic" })
}

// Legacy function for backward compatibility
export function resetTourStatus(): void {
  resetTourState()
}

// Dialog opener registry - allows components to register callbacks for opening dialogs
type DialogOpenerRegistry = {
  addSpec?: () => void
  settings?: () => void
  closeAll?: () => void
}

const dialogOpeners: DialogOpenerRegistry = {}

export function registerTourDialogOpeners(openers: Partial<DialogOpenerRegistry>): void {
  Object.assign(dialogOpeners, openers)
}

export function unregisterTourDialogOpeners(keys: (keyof DialogOpenerRegistry)[]): void {
  keys.forEach((key) => {
    delete dialogOpeners[key]
  })
}

// Steps where AddSpecDialog should be open for basic tour (5-8, 0-indexed: 4-7)
const BASIC_ADD_SPEC_DIALOG_STEPS = [4, 5, 6, 7]
// Steps where SettingsDialog should be open for basic tour (13-14, 0-indexed: 12-13)
const BASIC_SETTINGS_DIALOG_STEPS = [12, 13]

/**
 * 18-step Basic Tour organized into 3 phases:
 * - Phase 1: Foundation (Steps 1-4) - Welcome, Sidebar, Spreadsheet, Checkpoint
 * - Phase 2: Create SKU (Steps 5-12) - Add spec, Dialog, Name input, Values, Spec card, Add column, Spreadsheet usage, Checkpoint
 * - Phase 3: Core (Steps 13-18) - Settings button, Settings dialog, Sheet tabs, Add sheet, Import/Export, Completion
 */
export const basicTourSteps: DriveStep[] = [
  // ============ PHASE 1: FOUNDATION (Steps 1-4) ============
  {
    // Step 1: Welcome
    popover: {
      title: "Welcome to SKU Generator!",
      description:
        "This tutorial will teach you how to create product SKUs in 3 phases: Foundation, Create SKU, and Core Features. Let's start by understanding the app structure.",
      side: "over",
      align: "center",
    },
  },
  {
    // Step 2: Sidebar overview
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Specifications Sidebar",
      description:
        "This sidebar is where you manage specifications. Specifications define attributes like Color, Size, or Material - each with values that map to SKU codes.",
      side: "right",
      align: "start",
    },
  },
  {
    // Step 3: Spreadsheet overview
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "The Spreadsheet",
      description:
        "This is your data entry area. Column A shows auto-generated SKUs (read-only). Add specification columns to create dropdowns for selecting values.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 4: Foundation checkpoint
    popover: {
      title: "Foundation Complete!",
      description:
        "You now understand the app structure: sidebar for specifications, spreadsheet for data. Next, let's create a specification and see SKU generation in action!",
      side: "over",
      align: "center",
    },
  },

  // ============ PHASE 2: CREATE SKU (Steps 5-12) ============
  {
    // Step 5: Add spec button - INTERACTIVE
    element: '[data-tour="add-spec-button"]',
    popover: {
      title: "Phase 2: Add a Specification",
      description:
        "Click this button to add a new specification. This opens a dialog where you can define the spec name and its values with SKU codes.",
      side: "right",
      align: "start",
      onNextClick: (_element, _step, { driver }) => {
        // Verify the add spec dialog is open before proceeding
        const dialog = document.querySelector('[data-tour="add-spec-dialog"]')
        if (dialog) {
          driver.moveNext()
        }
        // Dialog will be opened by orchestration, so proceed anyway
        driver.moveNext()
      },
    },
  },
  {
    // Step 6: Add spec dialog overview
    element: '[data-tour="add-spec-dialog"]',
    popover: {
      title: "Add Specification Dialog",
      description:
        "This dialog lets you create a specification with multiple values at once. Each value has a display name (like 'Red') and a SKU code (like 'R').",
      side: "left",
      align: "center",
    },
  },
  {
    // Step 7: Spec name field
    element: '[data-tour="spec-name-input"]',
    popover: {
      title: "Specification Name",
      description:
        "Enter a descriptive name like 'Color', 'Size', or 'Material'. This name appears in the sidebar and as column headers when you add spec columns.",
      side: "bottom",
      align: "start",
    },
  },
  {
    // Step 8: Values section
    element: '[data-tour="spec-values-section"]',
    popover: {
      title: "Define Values",
      description:
        "Add label/SKU code pairs here. Example: 'Red'/'R', 'Blue'/'B'. Click 'Add Value' for more options. SKU codes should be short (1-3 characters) for readable SKUs.",
      side: "bottom",
      align: "start",
    },
  },
  {
    // Step 9: Spec cards explanation
    element: '[data-tour="spec-item"]',
    popover: {
      title: "Specification Cards",
      description:
        "After adding a spec, it appears as a card here. Click to expand and see values. Use the pencil icon to edit the name, or trash to delete. Drag cards to reorder.",
      side: "right",
      align: "start",
    },
  },
  {
    // Step 10: Add Column button in toolbar
    element: '[data-tour="add-column-button"]',
    popover: {
      title: "Add Columns",
      description:
        "Use 'Add Column' to add specification columns to your spreadsheet. You can also right-click column headers for a context menu with insert/delete options.",
      side: "bottom",
      align: "start",
    },
  },
  {
    // Step 11: Spreadsheet usage
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "Using Dropdowns & SKU Generation",
      description:
        "Click cells in spec columns to see dropdowns with your defined values. Select values and watch the SKU in Column A update automatically.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 12: Create SKU checkpoint
    popover: {
      title: "SKU Creation Complete!",
      description:
        "You've learned to add specs, create columns, and generate SKUs. The SKU updates automatically when you change any value. Now let's explore core features!",
      side: "over",
      align: "center",
    },
  },

  // ============ PHASE 3: CORE (Steps 13-18) ============
  {
    // Step 13: Settings button - INTERACTIVE
    element: '[data-tour="settings-button"]',
    popover: {
      title: "Phase 3: SKU Settings",
      description:
        "Click Settings to customize SKU generation. You can change the delimiter between codes, add a prefix (like 'SKU-'), or add a suffix (like '-2024').",
      side: "top",
      align: "start",
      onNextClick: (_element, _step, { driver }) => {
        // Verify settings dialog is open before proceeding
        const dialog = document.querySelector('[data-tour="settings-dialog"]')
        if (dialog) {
          driver.moveNext()
        }
        // Dialog will be opened by orchestration, so proceed anyway
        driver.moveNext()
      },
    },
  },
  {
    // Step 14: Settings dialog
    element: '[data-tour="settings-dialog"]',
    popover: {
      title: "Configure SKU Format",
      description:
        "Choose a delimiter (hyphen, underscore, none, or custom). Add prefix/suffix for branding. Changes apply to ALL existing SKUs immediately across all sheets.",
      side: "left",
      align: "center",
    },
  },
  {
    // Step 15: Sheet tabs
    element: '[data-tour="sheet-tabs"]',
    popover: {
      title: "Multiple Sheets",
      description:
        "Each sheet has its own specifications and data. Click + to add sheets, double-click to rename, click X to delete. Useful for organizing different product categories.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 16: Add sheet button - INTERACTIVE
    element: '[data-tour="add-sheet-button"]',
    popover: {
      title: "Add New Sheets",
      description:
        "Click this button to add a new sheet. Each sheet maintains its own specifications and data, allowing you to organize different product lines or categories.",
      side: "top",
      align: "start",
      onNextClick: (_element, _step, { driver }) => {
        // Proceed to next step
        driver.moveNext()
      },
    },
  },
  {
    // Step 17: Import/Export buttons
    element: '[data-tour="import-button"]',
    popover: {
      title: "Import & Export",
      description:
        "Use Import to load data from CSV or Excel files. Use Export to save your work. Your data is also automatically saved in your browser's local storage.",
      side: "bottom",
      align: "start",
    },
  },
  {
    // Step 18: Completion
    popover: {
      title: "Basic Tour Complete!",
      description:
        "You've learned the core workflow: create specs, add columns, and generate SKUs. For advanced features like toolbar controls, row/column operations, and validation, try the Advanced Tour from the tour menu.",
      side: "over",
      align: "center",
    },
  },
]

let currentDriverInstance: Driver | null = null
let currentTourType: TourType = "basic"

export function startGuidedTour(
  tourTypeOrCallback?: TourType | (() => void),
  onComplete?: () => void
): void {
  // Handle overloaded signature for backward compatibility
  let tourType: TourType = "basic"
  let callback: (() => void) | undefined

  if (typeof tourTypeOrCallback === "function") {
    callback = tourTypeOrCallback
  } else if (tourTypeOrCallback) {
    tourType = tourTypeOrCallback
    callback = onComplete
  } else {
    callback = onComplete
  }

  currentTourType = tourType

  // Close any existing tour
  if (currentDriverInstance) {
    currentDriverInstance.destroy()
  }

  // Select the appropriate steps and dialog step indices
  const steps = tourType === "basic" ? basicTourSteps : basicTourSteps // TODO: advancedTourSteps when defined
  const addSpecDialogSteps =
    tourType === "basic" ? BASIC_ADD_SPEC_DIALOG_STEPS : [] // TODO: ADVANCED_ADD_SPEC_DIALOG_STEPS
  const settingsDialogSteps =
    tourType === "basic" ? BASIC_SETTINGS_DIALOG_STEPS : [] // TODO: ADVANCED_SETTINGS_DIALOG_STEPS

  const driverObj = driver({
    showProgress: true,
    steps: steps,
    nextBtnText: "Next",
    prevBtnText: "Previous",
    doneBtnText: "Done",
    onHighlightStarted: (_element, _step, { state }) => {
      const stepIndex = state.activeIndex ?? 0

      // Open AddSpecDialog for dialog steps
      if (addSpecDialogSteps.includes(stepIndex)) {
        dialogOpeners.addSpec?.()
      }
      // Open SettingsDialog for settings steps
      else if (settingsDialogSteps.includes(stepIndex)) {
        dialogOpeners.settings?.()
      }
    },
    onDeselected: (_element, _step, { state }) => {
      const stepIndex = state.activeIndex ?? 0

      // Close dialogs when leaving dialog steps
      const wasInAddSpecSteps = addSpecDialogSteps.includes(stepIndex)
      const wasInSettingsSteps = settingsDialogSteps.includes(stepIndex)

      if (wasInAddSpecSteps || wasInSettingsSteps) {
        // Check if next step is NOT in the same dialog group
        const nextIndex = stepIndex + 1
        const nextIsAddSpec = addSpecDialogSteps.includes(nextIndex)
        const nextIsSettings = settingsDialogSteps.includes(nextIndex)

        if (wasInAddSpecSteps && !nextIsAddSpec) {
          dialogOpeners.closeAll?.()
        }
        if (wasInSettingsSteps && !nextIsSettings) {
          dialogOpeners.closeAll?.()
        }
      }
    },
    onDestroyed: () => {
      // Close all dialogs when tour ends
      dialogOpeners.closeAll?.()
      // Mark the appropriate tour as completed
      if (currentTourType === "basic") {
        updateTourState({ basicCompleted: true, lastViewed: "basic" })
      } else {
        updateTourState({ advancedCompleted: true, lastViewed: "advanced" })
      }
      callback?.()
      currentDriverInstance = null
    },
    popoverClass: "sku-tour-popover",
  })

  currentDriverInstance = driverObj
  driverObj.drive()
}

export function stopGuidedTour(): void {
  if (currentDriverInstance) {
    currentDriverInstance.destroy()
    currentDriverInstance = null
  }
}
