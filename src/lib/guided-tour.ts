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

// Steps where AddSpecDialog should be open (8-11, 0-indexed: 7-10)
const ADD_SPEC_DIALOG_STEPS = [7, 8, 9, 10]
// Steps where SettingsDialog should be open (18-19, 0-indexed: 17-18)
const SETTINGS_DIALOG_STEPS = [17, 18]

/**
 * 24-step guided tutorial organized into 3 phases:
 * - Phase 1: Foundation (Steps 1-7) - Understanding the app structure
 * - Phase 2: Create SKU (Steps 8-17) - Creating specifications and generating SKUs
 * - Phase 3: Advanced (Steps 18-24) - Settings, import/export, and tips
 */
const tourSteps: DriveStep[] = [
  // ============ PHASE 1: FOUNDATION (Steps 1-7) ============
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
    // Step 2: Config tab intro
    element: ".fortune-sheet-tab-container",
    popover: {
      title: "Phase 1: The Config Sheet",
      description:
        "The orange 'Config' tab is your single source of truth. It stores all specification definitions (like Color, Size) with their values and SKU codes. Click on it to view or edit specs.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 3: Config structure
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "Config Sheet Structure",
      description:
        "The Config sheet has 3 columns: Specification (name), Value (label shown to users), and SKU Code (code used in generated SKUs). Each row defines one value for a specification.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 4: Row mapping demo
    element: ".fortune-sheet-cell-area",
    popover: {
      title: "How Rows Map to SKUs",
      description:
        "Example: A row with 'Color', 'Red', 'R' means when a user selects 'Red' for Color, the letter 'R' appears in the generated SKU. Multiple rows with the same Specification name create dropdown options.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 5: Sidebar overview
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Specifications Sidebar",
      description:
        "This sidebar shows a summary of all specifications defined in Config. It updates automatically when you modify the Config sheet. Use it for quick reference without switching tabs.",
      side: "right",
      align: "start",
    },
  },
  {
    // Step 6: Spec cards explanation
    element: '[data-tour="spec-item"]',
    popover: {
      title: "Specification Cards",
      description:
        "Each card shows a specification name and value count. Click to expand and see all values with their SKU codes. Click 'Edit' to jump to the Config sheet for changes.",
      side: "right",
      align: "start",
    },
  },
  {
    // Step 7: Foundation checkpoint
    popover: {
      title: "Foundation Complete!",
      description:
        "You now understand the app structure: Config sheet defines specs, sidebar displays them. Next, let's create a new specification and generate your first SKU!",
      side: "over",
      align: "center",
    },
  },

  // ============ PHASE 2: CREATE SKU (Steps 8-17) ============
  {
    // Step 8: Add spec button
    element: '[data-tour="add-spec-button"]',
    popover: {
      title: "Phase 2: Add a Specification",
      description:
        "Click this button to add a new specification. This opens a dialog where you can define the spec name and its values. Let's see what happens when you click it.",
      side: "right",
      align: "start",
    },
  },
  {
    // Step 9: Add spec dialog overview
    element: '[data-tour="add-spec-dialog"]',
    popover: {
      title: "Add Specification Dialog",
      description:
        "This dialog lets you create a specification with multiple values at once. Fill in the fields and click 'Add Specification' to add rows to Config and a column to your data sheet.",
      side: "left",
      align: "center",
    },
  },
  {
    // Step 10: Spec name field
    element: '[data-tour="spec-name-input"]',
    popover: {
      title: "Specification Name",
      description:
        "Enter a descriptive name like 'Color', 'Size', or 'Material'. This name becomes a column header in data sheets and groups related values together in Config.",
      side: "bottom",
      align: "start",
    },
  },
  {
    // Step 11: Values section
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
    // Step 12: Create data sheet
    element: ".fortune-sheet-tab-container",
    popover: {
      title: "Create a Data Sheet",
      description:
        "Click the '+' button to create a new data sheet. Data sheets are where you enter product information and see auto-generated SKUs. Each sheet can have different products.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 13: Column headers setup
    element: ".fortune-sheet-cell-area",
    popover: {
      title: "Set Up Column Headers",
      description:
        "In row 1, type specification names as headers (e.g., 'Color', 'Size'). Column A is reserved for SKU. Headers must match Config specification names exactly to enable dropdowns.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 14: SKU column explanation
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "The SKU Column",
      description:
        "Column A automatically displays the generated SKU. You don't edit this column - it updates automatically when you select values in other columns. It combines SKU codes with a delimiter.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 15: Dropdown usage
    element: ".fortune-sheet-cell-area",
    popover: {
      title: "Using Dropdowns",
      description:
        "Click any cell below a header that matches a Config spec name. A dropdown appears with all values defined for that spec. Select a value to populate the cell.",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 16: SKU generation explanation
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "SKU Auto-Generation",
      description:
        "As you select values, the SKU in Column A updates instantly. It combines SKU codes from each column using the configured delimiter (default: hyphen). Example: R-L-BLK for Red-Large-Black.",
      side: "left",
      align: "start",
    },
  },
  {
    // Step 17: Create SKU checkpoint
    popover: {
      title: "SKU Creation Complete!",
      description:
        "You've learned to add specs, create data sheets, and generate SKUs. The SKU updates automatically when you change any value. Now let's explore advanced features!",
      side: "over",
      align: "center",
    },
  },

  // ============ PHASE 3: ADVANCED (Steps 18-24) ============
  {
    // Step 18: Settings button
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
    // Step 19: Settings dialog
    element: '[data-tour="settings-dialog"]',
    popover: {
      title: "Configure SKU Format",
      description:
        "Choose a delimiter (hyphen, underscore, none, or custom). Add prefix/suffix for branding. Changes apply to ALL existing SKUs immediately across all data sheets.",
      side: "left",
      align: "center",
    },
  },
  {
    // Step 20: Import button
    element: '[data-tour="import-button"]',
    popover: {
      title: "Import Data",
      description:
        "Import Excel files (.xlsx) with existing Config and data sheets. This replaces current data, so export first if needed. Great for loading templates or backups.",
      side: "bottom",
      align: "end",
    },
  },
  {
    // Step 21: Export button
    element: '[data-tour="export-button"]',
    popover: {
      title: "Export Your Work",
      description:
        "Export to Excel (.xlsx) to save all sheets including Config. Or export just the current sheet to CSV. Use exports for backups, sharing, or opening in other apps.",
      side: "bottom",
      align: "end",
    },
  },
  {
    // Step 22: Multi-sheet overview
    element: ".fortune-sheet-tab-container",
    popover: {
      title: "Working with Multiple Sheets",
      description:
        "Create multiple data sheets for different product lines or categories. All sheets share the same Config specs. Double-click a tab to rename it. Click X to delete (except Config).",
      side: "top",
      align: "center",
    },
  },
  {
    // Step 23: Tour restart button
    element: '[data-testid="start-tour-button"]',
    popover: {
      title: "Restart This Tour",
      description:
        "Click the Tour button anytime to revisit this tutorial. It's helpful when you need a refresher on any feature. The tour is always available from the header.",
      side: "bottom",
      align: "end",
    },
  },
  {
    // Step 24: Completion
    popover: {
      title: "You're Ready!",
      description:
        "Congratulations! You've completed the SKU Generator tutorial. Remember: Config defines specs, data sheets use them via matching column headers, and SKUs auto-generate. Happy generating!",
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

      // Open AddSpecDialog for steps 8-11 (0-indexed: 7-10)
      if (ADD_SPEC_DIALOG_STEPS.includes(stepIndex)) {
        dialogOpeners.addSpec?.()
      }
      // Open SettingsDialog for steps 18-19 (0-indexed: 17-18)
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
