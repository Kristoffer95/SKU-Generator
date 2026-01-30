import { useCallback, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Copy, FolderPlus, MoreHorizontal, Palette, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Predefined color palette for group colors */
export const GROUP_COLOR_PALETTE = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
] as const;
import type { SheetGroup } from "@/types";

export interface SheetTab {
  id: string;
  name: string;
}

export interface GroupedSheetTabsProps {
  /** List of sheets to display as tabs */
  sheets: SheetTab[];
  /** List of groups */
  groups: SheetGroup[];
  /** ID of the currently active sheet */
  activeSheetId: string | null;
  /** Called when a tab is clicked to activate it */
  onActivate: (id: string) => void;
  /** Called when a tab name is changed */
  onRename: (id: string, newName: string) => void;
  /** Called when a tab delete button is clicked */
  onDelete: (id: string) => void;
  /** Called when a tab duplicate button is clicked */
  onDuplicate?: (id: string) => void;
  /** Called when the add sheet button is clicked */
  onAdd: () => void;
  /** Called when a group is created */
  onAddGroup: (name: string) => void;
  /** Called when a group name is changed */
  onRenameGroup: (groupId: string, newName: string) => void;
  /** Called when a group is deleted */
  onDeleteGroup: (groupId: string, deleteSheets: boolean) => void;
  /** Called when a group is toggled collapsed/expanded */
  onToggleGroup: (groupId: string) => void;
  /** Called when a sheet is moved to a group */
  onMoveSheetToGroup: (sheetId: string, groupId: string | null) => void;
  /** Called when a group color is changed */
  onUpdateGroupColor?: (groupId: string, color: string | undefined) => void;
  /** IDs of sheets not in any group */
  ungroupedSheetIds: string[];
}

/**
 * Grouped sheet tabs component for multi-sheet navigation with folder organization
 * Supports: tab switching, inline renaming, deletion, duplication, drag-to-group, and collapsible groups
 */
export function GroupedSheetTabs({
  sheets,
  groups,
  activeSheetId,
  onActivate,
  onRename,
  onDelete,
  onDuplicate,
  onAdd,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onToggleGroup,
  onMoveSheetToGroup,
  onUpdateGroupColor,
  ungroupedSheetIds,
}: GroupedSheetTabsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [draggedSheetId, setDraggedSheetId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverUngrouped, setDragOverUngrouped] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  useEffect(() => {
    if (editingGroupId && groupInputRef.current) {
      groupInputRef.current.focus();
      groupInputRef.current.select();
    }
  }, [editingGroupId]);

  useEffect(() => {
    if (showNewGroupInput && newGroupInputRef.current) {
      newGroupInputRef.current.focus();
    }
  }, [showNewGroupInput]);

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

  // Handle double-click on group to enable rename mode
  const handleGroupDoubleClick = useCallback((groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
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

  // Commit the group rename
  const commitGroupRename = useCallback(() => {
    if (editingGroupId && editValue.trim()) {
      onRenameGroup(editingGroupId, editValue.trim());
    }
    setEditingGroupId(null);
    setEditValue("");
  }, [editingGroupId, editValue, onRenameGroup]);

  // Cancel the rename
  const cancelRename = useCallback(() => {
    setEditingTabId(null);
    setEditingGroupId(null);
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

  // Handle keyboard events in group rename input
  const handleGroupInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitGroupRename();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelRename();
      }
    },
    [commitGroupRename, cancelRename]
  );

  // Handle input blur - commit rename
  const handleInputBlur = useCallback(() => {
    commitRename();
  }, [commitRename]);

  // Handle group input blur
  const handleGroupInputBlur = useCallback(() => {
    commitGroupRename();
  }, [commitGroupRename]);

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

  // Handle duplicate button click
  const handleDuplicateClick = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.stopPropagation(); // Prevent tab activation
      onDuplicate?.(id);
    },
    [onDuplicate]
  );

  // Handle add button click
  const handleAddClick = useCallback(() => {
    onAdd();
  }, [onAdd]);

  // Handle new group creation
  const handleCreateGroup = useCallback(() => {
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim());
      setNewGroupName("");
      setShowNewGroupInput(false);
    }
  }, [newGroupName, onAddGroup]);

  const handleNewGroupKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleCreateGroup();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setShowNewGroupInput(false);
        setNewGroupName("");
      }
    },
    [handleCreateGroup]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((event: React.DragEvent, sheetId: string) => {
    event.dataTransfer.setData("text/plain", sheetId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedSheetId(sheetId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSheetId(null);
    setDragOverGroupId(null);
    setDragOverUngrouped(false);
  }, []);

  const handleDragOverGroup = useCallback((event: React.DragEvent, groupId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverGroupId(groupId);
    setDragOverUngrouped(false);
  }, []);

  const handleDragOverUngrouped = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverGroupId(null);
    setDragOverUngrouped(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverGroupId(null);
    setDragOverUngrouped(false);
  }, []);

  const handleDropOnGroup = useCallback((event: React.DragEvent, groupId: string) => {
    event.preventDefault();
    const sheetId = event.dataTransfer.getData("text/plain");
    if (sheetId) {
      onMoveSheetToGroup(sheetId, groupId);
    }
    setDragOverGroupId(null);
    setDraggedSheetId(null);
  }, [onMoveSheetToGroup]);

  const handleDropOnUngrouped = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const sheetId = event.dataTransfer.getData("text/plain");
    if (sheetId) {
      onMoveSheetToGroup(sheetId, null);
    }
    setDragOverUngrouped(false);
    setDraggedSheetId(null);
  }, [onMoveSheetToGroup]);

  const canDelete = sheets.length > 1;

  // Render a sheet tab
  const renderSheetTab = (sheet: SheetTab, groupColor?: string) => {
    const isActive = sheet.id === activeSheetId;
    const isEditing = editingTabId === sheet.id;
    const isPendingDelete = pendingDeleteId === sheet.id;
    const isDragging = draggedSheetId === sheet.id;

    // Apply subtle tint from group color to non-active tabs
    const tabStyle = !isActive && groupColor ? {
      backgroundColor: `${groupColor}15`, // Very subtle tint (15 = ~6% opacity in hex)
    } : undefined;

    return (
      <div
        key={sheet.id}
        className={cn(
          "group relative flex items-center gap-1 px-3 py-1.5 text-sm rounded-t-md cursor-pointer transition-colors",
          isActive
            ? "bg-background border border-b-0 border-border font-medium"
            : "bg-muted/50 hover:bg-muted border border-transparent",
          isDragging && "opacity-50"
        )}
        style={tabStyle}
        onClick={() => handleTabClick(sheet.id)}
        onDoubleClick={() => handleDoubleClick(sheet.id, sheet.name)}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, sheet.id)}
        onDragEnd={handleDragEnd}
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

        {/* Duplicate button */}
        {!isEditing && onDuplicate && (
          <button
            type="button"
            onClick={(e) => handleDuplicateClick(e, sheet.id)}
            className="p-0.5 rounded-sm transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Duplicate sheet"
            data-testid={`sheet-tab-duplicate-${sheet.id}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Delete button - only show when multiple sheets exist */}
        {canDelete && !isEditing && (
          <button
            type="button"
            onClick={(e) => handleDeleteClick(e, sheet.id)}
            className={cn(
              "p-0.5 rounded-sm transition-colors",
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
  };

  // Render a group with its sheets
  const renderGroup = (group: SheetGroup) => {
    const groupSheets = group.sheetIds
      .map((id) => sheets.find((s) => s.id === id))
      .filter((s): s is SheetTab => s !== undefined);
    const isEditingGroup = editingGroupId === group.id;
    const isDragOver = dragOverGroupId === group.id;

    // Get tint color from group color
    const tintStyle = group.color ? {
      borderLeftColor: group.color,
      backgroundColor: `${group.color}10`,
    } : {};

    return (
      <div
        key={group.id}
        className={cn(
          "flex flex-col",
          isDragOver && "ring-2 ring-primary ring-offset-1 rounded"
        )}
        onDragOver={(e) => handleDragOverGroup(e, group.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnGroup(e, group.id)}
        data-testid={`sheet-group-${group.id}`}
      >
        {/* Group header */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer rounded-t hover:bg-muted/50 border-l-2 border-transparent",
            group.color && "border-l-2"
          )}
          style={tintStyle}
          onClick={() => onToggleGroup(group.id)}
          onDoubleClick={() => handleGroupDoubleClick(group.id, group.name)}
          data-testid={`sheet-group-header-${group.id}`}
        >
          {group.collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}

          {isEditingGroup ? (
            <input
              ref={groupInputRef}
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleGroupInputKeyDown}
              onBlur={handleGroupInputBlur}
              className="w-20 px-1 py-0 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="group-rename-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate max-w-[100px] font-medium text-muted-foreground" title={group.name}>
              {group.name}
            </span>
          )}

          <span className="text-xs text-muted-foreground ml-1">({groupSheets.length})</span>

          {/* Group context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-0.5 ml-auto rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
                data-testid={`sheet-group-menu-${group.id}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleGroupDoubleClick(group.id, group.name);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename group
              </DropdownMenuItem>
              {onUpdateGroupColor && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="h-4 w-4 mr-2" />
                    Group color
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-2" data-testid={`group-color-menu-${group.id}`}>
                    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Color palette">
                      {GROUP_COLOR_PALETTE.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={cn(
                            "w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                            group.color === color.value && "ring-2 ring-primary ring-offset-1"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                          aria-label={color.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateGroupColor(group.id, color.value);
                          }}
                          data-testid={`group-color-${color.name.toLowerCase()}`}
                        />
                      ))}
                    </div>
                    {group.color && (
                      <button
                        type="button"
                        className="w-full mt-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateGroupColor(group.id, undefined);
                        }}
                        data-testid="group-color-clear"
                      >
                        Clear color
                      </button>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group.id, false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete group (keep sheets)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group.id, true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete group and sheets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Group sheets */}
        {!group.collapsed && (
          <div className="flex items-center gap-1 pl-4" data-testid={`sheet-group-sheets-${group.id}`}>
            {groupSheets.map((sheet) => renderSheetTab(sheet, group.color))}
          </div>
        )}
      </div>
    );
  };

  // Get ungrouped sheets
  const ungroupedSheets = ungroupedSheetIds
    .map((id) => sheets.find((s) => s.id === id))
    .filter((s): s is SheetTab => s !== undefined);

  return (
    <div
      className="flex flex-col border-t bg-muted/30 px-2 py-1"
      data-testid="grouped-sheet-tabs"
      data-tour="sheet-tabs"
    >
      {/* Groups */}
      {groups.map(renderGroup)}

      {/* Ungrouped sheets area */}
      <div
        className={cn(
          "flex items-center gap-1",
          dragOverUngrouped && "ring-2 ring-primary ring-offset-1 rounded",
          groups.length > 0 && "mt-1 pt-1 border-t border-border/50"
        )}
        onDragOver={handleDragOverUngrouped}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnUngrouped}
        data-testid="ungrouped-sheets-area"
      >
        {ungroupedSheets.map((sheet) => renderSheetTab(sheet))}

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

        {/* Add group button / input */}
        {showNewGroupInput ? (
          <div className="flex items-center gap-1">
            <input
              ref={newGroupInputRef}
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleNewGroupKeyDown}
              onBlur={() => {
                if (!newGroupName.trim()) {
                  setShowNewGroupInput(false);
                }
              }}
              placeholder="Group name..."
              className="w-24 px-2 py-1 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="new-group-input"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="new-group-submit"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewGroupInput(true)}
            className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Create new group"
            data-testid="add-group-button"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
