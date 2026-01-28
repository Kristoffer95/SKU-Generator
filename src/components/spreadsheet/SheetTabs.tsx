import { useCallback, useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetTab {
  id: string;
  name: string;
}

export interface SheetTabsProps {
  /** List of sheets to display as tabs */
  sheets: SheetTab[];
  /** ID of the currently active sheet */
  activeSheetId: string | null;
  /** Called when a tab is clicked to activate it */
  onActivate: (id: string) => void;
  /** Called when a tab name is changed */
  onRename: (id: string, newName: string) => void;
  /** Called when a tab delete button is clicked */
  onDelete: (id: string) => void;
  /** Called when the add sheet button is clicked */
  onAdd: () => void;
}

/**
 * Sheet tabs component for multi-sheet navigation
 * Supports: tab switching, inline renaming (double-click), deletion, and adding new sheets
 */
export function SheetTabs({
  sheets,
  activeSheetId,
  onActivate,
  onRename,
  onDelete,
  onAdd,
}: SheetTabsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // Handle tab click - single click activates
  const handleTabClick = useCallback(
    (id: string) => {
      if (editingTabId !== id) {
        onActivate(id);
      }
    },
    [editingTabId, onActivate]
  );

  // Handle double-click to enable rename mode
  const handleDoubleClick = useCallback((id: string, currentName: string) => {
    setEditingTabId(id);
    setEditValue(currentName);
  }, []);

  // Handle rename input changes
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditValue(event.target.value);
    },
    []
  );

  // Commit the rename
  const commitRename = useCallback(() => {
    if (editingTabId && editValue.trim()) {
      onRename(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue("");
  }, [editingTabId, editValue, onRename]);

  // Cancel the rename
  const cancelRename = useCallback(() => {
    setEditingTabId(null);
    setEditValue("");
  }, []);

  // Handle keyboard events in rename input
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitRename();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelRename();
      }
    },
    [commitRename, cancelRename]
  );

  // Handle input blur - commit rename
  const handleInputBlur = useCallback(() => {
    commitRename();
  }, [commitRename]);

  // Handle delete button click - show confirmation
  const handleDeleteClick = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.stopPropagation(); // Prevent tab activation
      if (pendingDeleteId === id) {
        // Second click - confirm deletion
        onDelete(id);
        setPendingDeleteId(null);
      } else {
        // First click - show confirmation state
        setPendingDeleteId(id);
        // Reset after 3 seconds if not confirmed
        setTimeout(() => {
          setPendingDeleteId((current) => (current === id ? null : current));
        }, 3000);
      }
    },
    [pendingDeleteId, onDelete]
  );

  // Handle add button click
  const handleAddClick = useCallback(() => {
    onAdd();
  }, [onAdd]);

  const canDelete = sheets.length > 1;

  return (
    <div
      className="flex items-center gap-1 border-t bg-muted/30 px-2 py-1"
      data-testid="sheet-tabs"
      data-tour="sheet-tabs"
    >
      {/* Sheet tabs */}
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        const isEditing = editingTabId === sheet.id;
        const isPendingDelete = pendingDeleteId === sheet.id;

        return (
          <div
            key={sheet.id}
            className={cn(
              "group relative flex items-center gap-1 px-3 py-1.5 text-sm rounded-t-md cursor-pointer transition-colors",
              isActive
                ? "bg-background border border-b-0 border-border font-medium"
                : "bg-muted/50 hover:bg-muted border border-transparent"
            )}
            onClick={() => handleTabClick(sheet.id)}
            onDoubleClick={() => handleDoubleClick(sheet.id, sheet.name)}
            data-testid={`sheet-tab-${sheet.id}`}
            data-active={isActive}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                className="w-20 px-1 py-0 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="sheet-tab-rename-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[120px]" title={sheet.name}>
                {sheet.name}
              </span>
            )}

            {/* Delete button - only show when multiple sheets exist */}
            {canDelete && !isEditing && (
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, sheet.id)}
                className={cn(
                  "ml-1 p-0.5 rounded-sm transition-colors",
                  isPendingDelete
                    ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={isPendingDelete ? "Click again to confirm" : "Delete sheet"}
                data-testid={`sheet-tab-delete-${sheet.id}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add sheet button */}
      <button
        type="button"
        onClick={handleAddClick}
        className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Add new sheet"
        data-testid="sheet-tab-add"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
