import { useState, useMemo } from "react"
import { FileSpreadsheet, FileText, FileType } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { SheetConfig, CellData } from "@/types"

/** Maximum rows to show in preview (including header) */
const MAX_PREVIEW_ROWS = 50
/** Maximum columns to show in preview */
const MAX_PREVIEW_COLS = 15

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ExportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheets: SheetConfig[]
  activeSheetId: string | null
  onExport: (format: ExportFormat, allSheets: boolean) => void
}

interface PreviewCellProps {
  cell: CellData | null | undefined
  isHeader: boolean
}

function PreviewCell({ cell, isHeader }: PreviewCellProps) {
  const value = cell?.v != null ? String(cell.v) : ''

  // Build inline styles from cell data
  const style: React.CSSProperties = {}

  if (cell?.bg) {
    style.backgroundColor = cell.bg
  }
  if (cell?.fc) {
    style.color = cell.fc
  }
  if (cell?.bold) {
    style.fontWeight = 'bold'
  }
  if (cell?.italic) {
    style.fontStyle = 'italic'
  }
  if (cell?.align) {
    style.textAlign = cell.align
  }

  return (
    <td
      className={cn(
        "border border-gray-300 px-2 py-1 text-xs truncate max-w-[150px]",
        isHeader && "bg-gray-100 font-semibold"
      )}
      style={style}
      title={value}
    >
      {value}
    </td>
  )
}

interface SheetPreviewTableProps {
  sheet: SheetConfig
  maxRows: number
  maxCols: number
}

function SheetPreviewTable({ sheet, maxRows, maxCols }: SheetPreviewTableProps) {
  const { displayData, headers, isTruncatedRows, isTruncatedCols, totalRows, totalCols } = useMemo(() => {
    const data = sheet.data
    const columns = sheet.columns ?? []
    const totalRows = data.length
    const totalCols = columns.length > 0 ? columns.length : (data.length > 0 ? Math.max(...data.map(row => row.length)) : 0)

    // Headers come from columns[].header (no header row in data anymore)
    const headers = columns.slice(0, maxCols).map(col => col.header)

    // All rows in data are now data rows (no header row)
    const isTruncatedRows = totalRows > maxRows
    const isTruncatedCols = totalCols > maxCols

    // Slice the data to fit within limits
    const displayData = data.slice(0, maxRows).map(row => row.slice(0, maxCols))

    return { displayData, headers, isTruncatedRows, isTruncatedCols, totalRows, totalCols }
  }, [sheet.data, sheet.columns, maxRows, maxCols])

  if (displayData.length === 0 && headers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data to preview
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-[300px] border rounded-md">
        <table className="w-full border-collapse text-sm">
          {/* Header row from columns[].header */}
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="border border-gray-300 px-2 py-1 text-xs truncate max-w-[150px] bg-gray-100 font-semibold"
                    title={header}
                  >
                    {header}
                  </td>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <PreviewCell
                    key={colIndex}
                    cell={cell}
                    isHeader={false}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(isTruncatedRows || isTruncatedCols) && (
        <p className="text-xs text-muted-foreground text-center" data-testid="truncation-indicator">
          Preview truncated. Showing {Math.min(totalRows, maxRows)} of {totalRows} rows
          {isTruncatedCols && `, ${Math.min(totalCols, maxCols)} of ${totalCols} columns`}.
          Full data will be exported.
        </p>
      )}
    </div>
  )
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  sheets,
  activeSheetId,
  onExport,
}: ExportPreviewDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel')
  const [activePreviewSheetId, setActivePreviewSheetId] = useState<string | null>(null)

  // Initialize active preview sheet when dialog opens
  const effectivePreviewSheetId = activePreviewSheetId || activeSheetId || sheets[0]?.id || null
  const activePreviewSheet = sheets.find(s => s.id === effectivePreviewSheetId)

  // For CSV, we can only export the current sheet
  const canExportAllSheets = selectedFormat !== 'csv'

  const handleExport = (allSheets: boolean) => {
    onExport(selectedFormat, allSheets && canExportAllSheets)
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setActivePreviewSheetId(null)
    }
    onOpenChange(newOpen)
  }

  const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { value: 'csv', label: 'CSV', icon: <FileText className="h-4 w-4" /> },
    { value: 'pdf', label: 'PDF', icon: <FileType className="h-4 w-4" /> },
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col" data-testid="export-preview-dialog">
        <DialogHeader>
          <DialogTitle>Export Preview</DialogTitle>
          <DialogDescription>
            Preview your data before exporting. Select a format and choose whether to export the current sheet or all sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Format Selector */}
          <div className="grid gap-2">
            <Label>Export Format</Label>
            <div className="flex gap-2" data-testid="format-selector">
              {formatOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedFormat === option.value ? 'default' : 'outline'}
                  onClick={() => setSelectedFormat(option.value)}
                  className="flex-1"
                  data-testid={`format-${option.value}`}
                >
                  {option.icon}
                  <span className="ml-2">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Sheet Tabs (only if multiple sheets) */}
          {sheets.length > 1 && (
            <div className="grid gap-2">
              <Label>Sheet Preview</Label>
              <div className="flex gap-1 border-b overflow-x-auto" data-testid="sheet-tabs">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => setActivePreviewSheetId(sheet.id)}
                    className={cn(
                      "px-3 py-1.5 text-sm whitespace-nowrap border-b-2 transition-colors",
                      effectivePreviewSheetId === sheet.id
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    data-testid={`sheet-tab-${sheet.id}`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="flex-1 overflow-hidden">
            <Label className="mb-2 block">
              {activePreviewSheet ? `Preview: ${activePreviewSheet.name}` : 'Preview'}
            </Label>
            {activePreviewSheet ? (
              <SheetPreviewTable
                sheet={activePreviewSheet}
                maxRows={MAX_PREVIEW_ROWS}
                maxCols={MAX_PREVIEW_COLS}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No sheet selected
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} data-testid="cancel-button">
            Cancel
          </Button>
          {canExportAllSheets && sheets.length > 1 && (
            <Button variant="outline" onClick={() => handleExport(true)} data-testid="export-all-button">
              Export All Sheets
            </Button>
          )}
          <Button onClick={() => handleExport(false)} data-testid="export-button">
            Export {activePreviewSheet?.name || 'Sheet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
