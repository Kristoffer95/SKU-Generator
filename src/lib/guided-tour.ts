import { driver, DriveStep } from "driver.js"
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

const tourSteps: DriveStep[] = [
  {
    popover: {
      title: "Welcome to SKU Generator!",
      description:
        "This tour will guide you through all the features of the app. You'll learn how to define specifications, create data sheets, and auto-generate SKU codes.",
      side: "over",
      align: "center",
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Specifications Sidebar",
      description:
        "This sidebar shows all specifications defined in your Config sheet. Each specification has a name and a list of values with their SKU codes.",
      side: "right",
      align: "start",
    },
  },
  {
    // Fortune-Sheet renders tabs with this class structure
    element: ".fortune-sheet-tab-container",
    popover: {
      title: "Sheet Tabs",
      description:
        "The orange Config tab is your single source of truth for specifications. Use the + button to create new data sheets. Each data sheet shares specs from Config.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="add-spec-button"]',
    popover: {
      title: "Add Specifications",
      description:
        "Click this button to add a new specification. You'll define the spec name and its values with corresponding SKU codes. These get added to the Config sheet.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="spreadsheet"]',
    popover: {
      title: "Spreadsheet Area",
      description:
        "In data sheets, column headers match specification names to enable dropdowns. The SKU column (Column A) auto-generates based on selected values.",
      side: "left",
      align: "start",
    },
  },
  {
    element: ".fortune-sheet-cell-area",
    popover: {
      title: "Dropdown Selection",
      description:
        "Click any cell under a spec column header to see a dropdown with values from Config. Select a value and watch the SKU auto-generate!",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="import-button"]',
    popover: {
      title: "Import Data",
      description:
        "Import Excel files (.xlsx) containing Config and data sheets. This replaces all current data with the imported workbook.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="export-button"]',
    popover: {
      title: "Export Data",
      description:
        "Export your work to Excel (.xlsx) with all sheets included, or export just the current sheet to CSV.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="settings-button"]',
    popover: {
      title: "SKU Settings",
      description:
        "Configure how SKUs are generated: change the delimiter (-, _, none, or custom), add a prefix or suffix to all SKUs.",
      side: "top",
      align: "start",
    },
  },
  {
    popover: {
      title: "You're Ready!",
      description:
        "You now know the basics of SKU Generator. Start by adding specifications in the Config sheet, then create data sheets with matching column headers. SKUs will auto-generate as you select values!",
      side: "over",
      align: "center",
    },
  },
]

export function startGuidedTour(onComplete?: () => void): void {
  const driverObj = driver({
    showProgress: true,
    steps: tourSteps,
    nextBtnText: "Next",
    prevBtnText: "Previous",
    doneBtnText: "Done",
    onDestroyed: () => {
      markTourCompleted()
      onComplete?.()
    },
    popoverClass: "sku-tour-popover",
  })

  driverObj.drive()
}
