import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettingsStore } from "@/store/settings"
import { useSheetsStore } from "@/store/sheets"
import { parseConfigSheet } from "@/lib/config-sheet"
import { updateRowSKU } from "@/lib/auto-sku"
import type { AppSettings } from "@/types"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DELIMITER_OPTIONS = [
  { value: "-", label: "Hyphen (-)" },
  { value: "_", label: "Underscore (_)" },
  { value: "", label: "None" },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { delimiter, prefix, suffix, updateSettings } = useSettingsStore()
  const { sheets, getConfigSheet, setSheetData } = useSheetsStore()

  // Track if current delimiter is a standard option
  const isInitiallyCustom = !DELIMITER_OPTIONS.some((o) => o.value === delimiter)

  const [formDelimiter, setFormDelimiter] = useState(delimiter)
  const [isCustomMode, setIsCustomMode] = useState(isInitiallyCustom)
  const [customDelimiter, setCustomDelimiter] = useState(
    isInitiallyCustom ? delimiter : ""
  )
  const [formPrefix, setFormPrefix] = useState(prefix)
  const [formSuffix, setFormSuffix] = useState(suffix)

  const handleDelimiterChange = (value: string) => {
    if (value === "custom") {
      setIsCustomMode(true)
      setFormDelimiter(customDelimiter)
    } else {
      setIsCustomMode(false)
      setFormDelimiter(value)
    }
  }

  const handleCustomDelimiterChange = (value: string) => {
    setCustomDelimiter(value)
    setFormDelimiter(value)
  }

  /**
   * Recalculate all SKUs in all data sheets with new settings
   */
  const recalculateAllSKUs = (newSettings: AppSettings) => {
    const configSheet = getConfigSheet()
    if (!configSheet) return

    const parsedSpecs = parseConfigSheet(configSheet.data)

    // Process each data sheet
    sheets.forEach((sheet) => {
      if (sheet.type !== "data" || sheet.data.length <= 1) return

      // Create a copy of the data to modify
      const newData = sheet.data.map((row) => [...row])

      // Update SKU for each data row (skip header row 0)
      for (let rowIndex = 1; rowIndex < newData.length; rowIndex++) {
        updateRowSKU(newData, rowIndex, parsedSpecs, newSettings)
      }

      // Update the sheet in the store
      setSheetData(sheet.id, newData)
    })
  }

  const handleSave = () => {
    const newSettings: AppSettings = {
      delimiter: formDelimiter,
      prefix: formPrefix,
      suffix: formSuffix,
    }

    // Update settings in store
    updateSettings(newSettings)

    // Recalculate all SKUs with new settings
    recalculateAllSKUs(newSettings)

    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form to current values when opening
      const isCurrentlyCustom = !DELIMITER_OPTIONS.some((o) => o.value === delimiter)
      setFormDelimiter(delimiter)
      setIsCustomMode(isCurrentlyCustom)
      setCustomDelimiter(isCurrentlyCustom ? delimiter : "")
      setFormPrefix(prefix)
      setFormSuffix(suffix)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure SKU generation options. Changes will recalculate all existing SKUs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="delimiter">SKU Delimiter</Label>
            <div className="flex gap-2">
              {DELIMITER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={!isCustomMode && formDelimiter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDelimiterChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={isCustomMode ? "default" : "outline"}
                size="sm"
                onClick={() => handleDelimiterChange("custom")}
              >
                Custom
              </Button>
            </div>
            {isCustomMode && (
              <Input
                id="custom-delimiter"
                value={customDelimiter}
                onChange={(e) => handleCustomDelimiterChange(e.target.value)}
                placeholder="Enter custom delimiter"
                className="mt-2"
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prefix">SKU Prefix</Label>
            <Input
              id="prefix"
              value={formPrefix}
              onChange={(e) => setFormPrefix(e.target.value)}
              placeholder="Optional prefix (e.g., SKU-)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="suffix">SKU Suffix</Label>
            <Input
              id="suffix"
              value={formSuffix}
              onChange={(e) => setFormSuffix(e.target.value)}
              placeholder="Optional suffix (e.g., -2024)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
