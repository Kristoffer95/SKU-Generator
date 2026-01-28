import { useMemo, useCallback, useRef, useEffect } from "react"
import { Workbook } from "@fortune-sheet/react"
import type { Sheet, Cell, CellMatrix } from "@fortune-sheet/core"
import "@fortune-sheet/react/dist/index.css"
import { useSheetsStore } from "@/store/sheets"
import { useSettingsStore } from "@/store/settings"
import { processAutoSKU } from "@/lib/auto-sku"
import type { CellData } from "@/types"

/**
 * Deep comparison of CellData[][] arrays to detect actual changes
 */
function isDataEqual(a: CellData[][], b: CellData[][]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const rowA = a[i]
    const rowB = b[i]
    if (!rowA && !rowB) continue
    if (!rowA || !rowB) return false
    if (rowA.length !== rowB.length) return false
    for (let j = 0; j < rowA.length; j++) {
      const cellA = rowA[j]
      const cellB = rowB[j]
      if (!cellA && !cellB) continue
      if (!cellA || !cellB) return false
      if (cellA.v !== cellB.v || cellA.m !== cellB.m) return false
    }
  }
  return true
}


/**
 * Convert our CellData[][] to Fortune-Sheet CellMatrix format
 */
function convertToFortuneSheetData(data: CellData[][]): CellMatrix {
  return data.map(row =>
    row.map(cell => {
      if (!cell || (cell.v === undefined && cell.m === undefined)) {
        return null
      }
      return {
        v: cell.v,
        m: cell.m ?? String(cell.v ?? ""),
        ct: cell.ct,
      } as Cell
    })
  )
}

/**
 * Convert Fortune-Sheet data back to our CellData[][] format
 */
function convertFromFortuneSheetData(data: CellMatrix | undefined): CellData[][] {
  if (!data) return []
  return data.map(row =>
    row.map(cell => {
      if (!cell) return {}
      // Handle boolean values by converting to string
      const value = typeof cell.v === "boolean" ? String(cell.v) : cell.v
      return {
        v: value,
        m: cell.m !== undefined ? String(cell.m) : undefined,
        ct: cell.ct,
      }
    })
  )
}

export function SpreadsheetContainer() {
  const { sheets, activeSheetId, setActiveSheet, setSheetData, addSheetWithId, removeSheet, updateSheet } = useSheetsStore()
  const delimiter = useSettingsStore((state) => state.delimiter)
  const prefix = useSettingsStore((state) => state.prefix)
  const suffix = useSettingsStore((state) => state.suffix)
  const settings = useMemo(() => ({ delimiter, prefix, suffix }), [delimiter, prefix, suffix])

  // Use ref for previous sheet data to avoid triggering re-renders
  const previousDataRef = useRef<Map<string, CellData[][]>>(new Map())

  // Update previous data ref when sheets change
  useEffect(() => {
    const map = new Map<string, CellData[][]>()
    sheets.forEach(sheet => {
      map.set(sheet.id, sheet.data)
    })
    previousDataRef.current = map
  }, [sheets])

  // Handle when user clicks a sheet tab in Fortune-Sheet
  const handleSheetActivate = useCallback((sheetId: string) => {
    setActiveSheet(sheetId)
  }, [setActiveSheet])

  // Sync sheet deletion to Zustand store
  const handleAfterDeleteSheet = useCallback((id: string) => {
    removeSheet(id)
  }, [removeSheet])

  // Sync sheet rename to Zustand store
  // Fortune-Sheet hook signature: (id: string, oldName: string, newName: string)
  const handleAfterUpdateSheetName = useCallback((id: string, oldName: string, newName: string) => {
    void oldName // Unused but required by Fortune-Sheet hook signature
    updateSheet(id, { name: newName })
  }, [updateSheet])

  // Handle new sheet added via Fortune-Sheet UI
  const handleAfterAddSheet = useCallback((sheet: Sheet) => {
    // Fortune-Sheet generates its own ID; we need to sync to our store
    if (sheet.id) {
      addSheetWithId(sheet.id, sheet.name ?? "Sheet")
    }
  }, [addSheetWithId])

  // Handle sheet data changes from Fortune-Sheet
  const handleChange = useCallback((data: Sheet[]) => {
    // Find changed sheets and update our store
    data.forEach(sheet => {
      if (!sheet.id) return

      const newData = convertFromFortuneSheetData(sheet.data)
      const oldData = previousDataRef.current.get(sheet.id) ?? []

      // Skip if data hasn't actually changed (prevents infinite loop)
      if (isDataEqual(oldData, newData)) {
        return
      }

      // Auto-generate SKUs for changed rows
      // TODO: processAutoSKU needs to be updated to use specifications store (remove-config-3/sku-gen-2)
      processAutoSKU(oldData, newData, [], settings)

      setSheetData(sheet.id, newData)
    })
  }, [setSheetData, settings])

  // Convert sheets to Fortune-Sheet format with hooks
  const fortuneSheetData: Sheet[] = useMemo(() => {
    return sheets.map((sheet, index) => {
      const sheetData: Sheet = {
        id: sheet.id,
        name: sheet.name,
        order: index,
        status: sheet.id === activeSheetId ? 1 : 0,
        data: convertToFortuneSheetData(sheet.data),
      }

      // TODO: Add dropdowns for data sheets based on specifications store (remove-config-3)

      return sheetData
    })
  }, [sheets, activeSheetId])

  // Hooks for Fortune-Sheet events
  const hooks = useMemo(() => ({
    afterActivateSheet: handleSheetActivate,
    afterDeleteSheet: handleAfterDeleteSheet,
    afterUpdateSheetName: handleAfterUpdateSheetName,
    afterAddSheet: handleAfterAddSheet,
  }), [handleSheetActivate, handleAfterDeleteSheet, handleAfterUpdateSheetName, handleAfterAddSheet])

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sheets available
      </div>
    )
  }

  return (
    <div className="h-full w-full" data-testid="spreadsheet-container" data-tour="spreadsheet">
      <Workbook
        data={fortuneSheetData}
        onChange={handleChange}
        hooks={hooks}
        showSheetTabs={true}
        showToolbar={true}
        showFormulaBar={true}
        allowEdit={true}
        row={100}
        column={26}
      />
    </div>
  )
}
