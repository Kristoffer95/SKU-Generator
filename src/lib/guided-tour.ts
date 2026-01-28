import { driver, DriveStep, Driver } from "driver.js"
import "driver.js/dist/driver.css"

const TOUR_COMPLETED_KEY = "sku-generator-tour-completed"

export function hasTourCompleted(): boolean {
  return localStorage.getItem(TOUR_COMPLETED_KEY) === "true"
}

export function markTourCompleted(): void {
  localStorage.setItem(TOUR_COMPLETED_KEY, "true")
}

export function resetTourStatus(): void {
  localStorage.removeItem(TOUR_COMPLETED_KEY)
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

// Steps where AddSpecDialog should be open (5-8, 0-indexed: 4-7)
const ADD_SPEC_DIALOG_STEPS = [4, 5, 6, 7]
// Steps where SettingsDialog should be open (13-14, 0-indexed: 12-13)
const SETTINGS_DIALOG_STEPS = [12, 13]

/**
 * 16-step guided tutorial organized into 3 phases:
 * - Phase 1: Foundation (Steps 1-4) - Understanding the app structure
 * - Phase 2: Create SKU (Steps 5-12) - Creating specifications and generating SKUs
 * - Phase 3: Advanced (Steps 13-16) - Settings, import/export, and tips
 */
const tourSteps: DriveStep[] = [
  // ============ PHASE 1: FOUNDATION (Steps 1-4) ============
  {
    // Step 1: Welcome
    popover: {
      title: "Welcome to SKU Generator!",
      description:
        "This tutorial will teach you how to create product SKUs in 3 phases: Foundation, Create SKU, and Advanced Features. Let's start by understanding the app structure.",
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
        "This sidebar is where you manage specifications. Specifications define attributes like Color, Size, or Material - each with values that map to SKU codes. Let's explore how it works.",
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
        "This is your data entry area. Column A shows auto-generated SKUs (read-only). Add specification columns to create dropdowns for selecting values. SKUs update automatically as you select values.",
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
    // Step 5: Add spec button
    element: '[data-tour="add-spec-button"]',
    popover: {
      title: "Phase 2: Add a Specification",
      description:
        "Click this button to add a new specification. This opens a dialog where you can define the spec name and its values with SKU codes.",
      side: "right",
      align: "start",
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
        "After adding a spec, it appears as a card here. Click to expand and see values. Use the pencil icon to edit the name, or trash to delete. Drag cards to reorder (affects SKU fragment order).",
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
        "Click cells in spec columns to see dropdowns with your defined values. Select values and watch the SKU in Column A update automatically. The SKU combines codes based on spec order in the sidebar.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 12: Create SKU checkpoint
    popover: {
      title: "SKU Creation Complete!",
      description:
        "You've learned to add specs, create columns, and generate SKUs. The SKU updates automatically when you change any value. Now let's explore advanced features!",
      side: "over",
      align: "center",
    },
  },

  // ============ PHASE 3: ADVANCED (Steps 13-16) ============
  {
    // Step 13: Settings button
    element: '[data-tour="settings-button"]',
    popover: {
      title: "Phase 3: SKU Settings",
      description:
        "Click Settings to customize SKU generation. You can change the delimiter between codes, add a prefix (like 'SKU-'), or add a suffix (like '-2024').",
      side: "top",
      align: "start",
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
    // Step 16: Completion
    popover: {
      title: "You're Ready!",
      description:
        "Congratulations! You've completed the SKU Generator tutorial. Create specs in the sidebar, add columns, select values, and SKUs generate automatically. Use Import/Export in the header to save your work. Happy generating!",
      side: "over",
      align: "center",
    },
  },
]

let currentDriverInstance: Driver | null = null

export function startGuidedTour(onComplete?: () => void): void {
  // Close any existing tour
  if (currentDriverInstance) {
    currentDriverInstance.destroy()
  }

  const driverObj = driver({
    showProgress: true,
    steps: tourSteps,
    nextBtnText: "Next",
    prevBtnText: "Previous",
    doneBtnText: "Done",
    onHighlightStarted: (_element, _step, { state }) => {
      const stepIndex = state.activeIndex ?? 0

      // Open AddSpecDialog for steps 5-8 (0-indexed: 4-7)
      if (ADD_SPEC_DIALOG_STEPS.includes(stepIndex)) {
        dialogOpeners.addSpec?.()
      }
      // Open SettingsDialog for steps 13-14 (0-indexed: 12-13)
      else if (SETTINGS_DIALOG_STEPS.includes(stepIndex)) {
        dialogOpeners.settings?.()
      }
    },
    onDeselected: (_element, _step, { state }) => {
      const stepIndex = state.activeIndex ?? 0

      // Close dialogs when leaving dialog steps
      const wasInAddSpecSteps = ADD_SPEC_DIALOG_STEPS.includes(stepIndex)
      const wasInSettingsSteps = SETTINGS_DIALOG_STEPS.includes(stepIndex)

      if (wasInAddSpecSteps || wasInSettingsSteps) {
        // Check if next step is NOT in the same dialog group
        const nextIndex = stepIndex + 1
        const nextIsAddSpec = ADD_SPEC_DIALOG_STEPS.includes(nextIndex)
        const nextIsSettings = SETTINGS_DIALOG_STEPS.includes(nextIndex)

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
      markTourCompleted()
      onComplete?.()
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
