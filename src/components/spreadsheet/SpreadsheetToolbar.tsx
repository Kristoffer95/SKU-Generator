import { useCallback, useRef, useState } from "react";
import { Undo2, Redo2, Upload, Download, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SpreadsheetToolbarProps {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Called when undo button is clicked */
  onUndo: () => void;
  /** Called when redo button is clicked */
  onRedo: () => void;
  /** Called when a file is selected for import */
  onImport: (file: File) => void;
  /** Called when export to Excel is clicked */
  onExportExcel: () => void;
  /** Called when export to CSV is clicked */
  onExportCSV: () => void;
  /** Called when add row button is clicked */
  onAddRow: () => void;
  /** Optional additional class name */
  className?: string;
}

/**
 * Toolbar component for spreadsheet actions
 * Includes: Undo/Redo, Import (Excel/CSV), Export (Excel/CSV dropdown), Add Row
 */
export function SpreadsheetToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onImport,
  onExportExcel,
  onExportCSV,
  onAddRow,
  className,
}: SpreadsheetToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Handle import button click - trigger file picker
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection from input
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onImport(file);
        // Reset input so same file can be selected again
        event.target.value = "";
      }
    },
    [onImport]
  );

  // Handle export Excel click
  const handleExportExcel = useCallback(() => {
    onExportExcel();
    setIsExportOpen(false);
  }, [onExportExcel]);

  // Handle export CSV click
  const handleExportCSV = useCallback(() => {
    onExportCSV();
    setIsExportOpen(false);
  }, [onExportCSV]);

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b bg-muted/30 px-2 py-1",
        className
      )}
      data-testid="spreadsheet-toolbar"
    >
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
        data-testid="spreadsheet-toolbar-file-input"
      />

      {/* Undo button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        data-testid="spreadsheet-toolbar-undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* Redo button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        data-testid="spreadsheet-toolbar-redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Import button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleImportClick}
        title="Import Excel/CSV"
        data-testid="spreadsheet-toolbar-import"
      >
        <Upload className="h-4 w-4" />
        <span className="ml-1">Import</span>
      </Button>

      {/* Export dropdown */}
      <DropdownMenu open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Export"
            data-testid="spreadsheet-toolbar-export"
          >
            <Download className="h-4 w-4" />
            <span className="ml-1">Export</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={handleExportExcel}
            data-testid="spreadsheet-toolbar-export-excel"
          >
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportCSV}
            data-testid="spreadsheet-toolbar-export-csv"
          >
            CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Add Row button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddRow}
        title="Add Row"
        data-testid="spreadsheet-toolbar-add-row"
      >
        <Plus className="h-4 w-4" />
        <span className="ml-1">Add Row</span>
      </Button>
    </div>
  );
}
