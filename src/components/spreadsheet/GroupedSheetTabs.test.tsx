import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupedSheetTabs, GroupedSheetTabsProps } from './GroupedSheetTabs';
import type { SheetGroup } from '@/types';

describe('GroupedSheetTabs', () => {
  const defaultSheets = [
    { id: 'sheet-1', name: 'Sheet 1' },
    { id: 'sheet-2', name: 'Sheet 2' },
    { id: 'sheet-3', name: 'Sheet 3' },
  ];

  const defaultGroups: SheetGroup[] = [];

  const defaultProps: GroupedSheetTabsProps = {
    sheets: defaultSheets,
    groups: defaultGroups,
    activeSheetId: 'sheet-1',
    onActivate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onAdd: vi.fn(),
    onAddGroup: vi.fn(),
    onRenameGroup: vi.fn(),
    onDeleteGroup: vi.fn(),
    onToggleGroup: vi.fn(),
    onMoveSheetToGroup: vi.fn(),
    ungroupedSheetIds: ['sheet-1', 'sheet-2', 'sheet-3'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all ungrouped sheets as tabs', () => {
      render(<GroupedSheetTabs {...defaultProps} />);

      expect(screen.getByTestId('sheet-tab-sheet-1')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-tab-sheet-2')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-tab-sheet-3')).toBeInTheDocument();
    });

    it('should render add sheet button', () => {
      render(<GroupedSheetTabs {...defaultProps} />);

      expect(screen.getByTestId('sheet-tab-add')).toBeInTheDocument();
    });

    it('should render add group button', () => {
      render(<GroupedSheetTabs {...defaultProps} />);

      expect(screen.getByTestId('add-group-button')).toBeInTheDocument();
    });

    it('should highlight active sheet', () => {
      render(<GroupedSheetTabs {...defaultProps} />);

      const activeTab = screen.getByTestId('sheet-tab-sheet-1');
      expect(activeTab).toHaveAttribute('data-active', 'true');
    });
  });

  describe('group rendering', () => {
    it('should render groups with their headers', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-1'] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-2', 'sheet-3']}
        />
      );

      expect(screen.getByTestId('sheet-group-group-1')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-group-header-group-1')).toHaveTextContent('Group 1');
    });

    it('should show sheet count in group header', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-1', 'sheet-2'] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-3']}
        />
      );

      expect(screen.getByTestId('sheet-group-header-group-1')).toHaveTextContent('(2)');
    });

    it('should render sheets inside their group', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-1'] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-2', 'sheet-3']}
        />
      );

      const groupSheets = screen.getByTestId('sheet-group-sheets-group-1');
      expect(groupSheets).toContainElement(screen.getByTestId('sheet-tab-sheet-1'));
    });

    it('should hide sheets when group is collapsed', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: true, sheetIds: ['sheet-1'] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-2', 'sheet-3']}
        />
      );

      expect(screen.queryByTestId('sheet-group-sheets-group-1')).not.toBeInTheDocument();
    });

    it('should apply group color as border and background tint', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#ff0000' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      const header = screen.getByTestId('sheet-group-header-group-1');
      expect(header).toHaveStyle({ borderLeftColor: '#ff0000' });
    });
  });

  describe('sheet interactions', () => {
    it('should call onActivate when clicking a sheet tab', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('sheet-tab-sheet-2'));

      expect(defaultProps.onActivate).toHaveBeenCalledWith('sheet-2');
    });

    it('should enter rename mode on double-click', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.dblClick(screen.getByTestId('sheet-tab-sheet-1'));

      expect(screen.getByTestId('sheet-tab-rename-input')).toBeInTheDocument();
    });

    it('should commit rename on Enter', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.dblClick(screen.getByTestId('sheet-tab-sheet-1'));
      const input = screen.getByTestId('sheet-tab-rename-input');
      await user.clear(input);
      await user.type(input, 'New Name{Enter}');

      expect(defaultProps.onRename).toHaveBeenCalledWith('sheet-1', 'New Name');
    });

    it('should cancel rename on Escape', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.dblClick(screen.getByTestId('sheet-tab-sheet-1'));
      const input = screen.getByTestId('sheet-tab-rename-input');
      await user.type(input, 'New Name{Escape}');

      expect(defaultProps.onRename).not.toHaveBeenCalled();
      expect(screen.queryByTestId('sheet-tab-rename-input')).not.toBeInTheDocument();
    });

    it('should call onAdd when clicking add button', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('sheet-tab-add'));

      expect(defaultProps.onAdd).toHaveBeenCalled();
    });

    it('should call onDuplicate when clicking duplicate button', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      const tab = screen.getByTestId('sheet-tab-sheet-1');
      await user.hover(tab);
      await user.click(screen.getByTestId('sheet-tab-duplicate-sheet-1'));

      expect(defaultProps.onDuplicate).toHaveBeenCalledWith('sheet-1');
    });

    it('should require double-click to delete a sheet', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      const tab = screen.getByTestId('sheet-tab-sheet-1');
      await user.hover(tab);

      // First click shows confirmation state
      await user.click(screen.getByTestId('sheet-tab-delete-sheet-1'));
      expect(defaultProps.onDelete).not.toHaveBeenCalled();

      // Second click confirms deletion
      await user.click(screen.getByTestId('sheet-tab-delete-sheet-1'));
      expect(defaultProps.onDelete).toHaveBeenCalledWith('sheet-1');
    });
  });

  describe('group interactions', () => {
    it('should call onToggleGroup when clicking group header', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.click(screen.getByTestId('sheet-group-header-group-1'));

      expect(defaultProps.onToggleGroup).toHaveBeenCalledWith('group-1');
    });

    it('should enter rename mode on group double-click', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.dblClick(screen.getByTestId('sheet-group-header-group-1'));

      expect(screen.getByTestId('group-rename-input')).toBeInTheDocument();
    });

    it('should commit group rename on Enter', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.dblClick(screen.getByTestId('sheet-group-header-group-1'));
      const input = screen.getByTestId('group-rename-input');
      await user.clear(input);
      await user.type(input, 'New Group Name{Enter}');

      expect(defaultProps.onRenameGroup).toHaveBeenCalledWith('group-1', 'New Group Name');
    });
  });

  describe('group creation', () => {
    it('should show input when clicking add group button', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('add-group-button'));

      expect(screen.getByTestId('new-group-input')).toBeInTheDocument();
    });

    it('should create group on Enter', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('add-group-button'));
      const input = screen.getByTestId('new-group-input');
      await user.type(input, 'My New Group{Enter}');

      expect(defaultProps.onAddGroup).toHaveBeenCalledWith('My New Group');
    });

    it('should create group on submit button click', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('add-group-button'));
      const input = screen.getByTestId('new-group-input');
      await user.type(input, 'My New Group');
      await user.click(screen.getByTestId('new-group-submit'));

      expect(defaultProps.onAddGroup).toHaveBeenCalledWith('My New Group');
    });

    it('should cancel group creation on Escape', async () => {
      const user = userEvent.setup();
      render(<GroupedSheetTabs {...defaultProps} />);

      await user.click(screen.getByTestId('add-group-button'));
      const input = screen.getByTestId('new-group-input');
      await user.type(input, 'My New Group{Escape}');

      expect(defaultProps.onAddGroup).not.toHaveBeenCalled();
      expect(screen.queryByTestId('new-group-input')).not.toBeInTheDocument();
    });
  });

  describe('group context menu', () => {
    it('should show rename option in group menu', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      // Hover to make menu visible
      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Rename group')).toBeInTheDocument();
      });
    });

    it('should show delete options in group menu', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Delete group (keep sheets)')).toBeInTheDocument();
        expect(screen.getByText('Delete group and sheets')).toBeInTheDocument();
      });
    });

    it('should call onDeleteGroup with deleteSheets=false', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Delete group (keep sheets)')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Delete group (keep sheets)'));

      expect(defaultProps.onDeleteGroup).toHaveBeenCalledWith('group-1', false);
    });

    it('should call onDeleteGroup with deleteSheets=true', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Delete group and sheets')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Delete group and sheets'));

      expect(defaultProps.onDeleteGroup).toHaveBeenCalledWith('group-1', true);
    });

    it('should show "Group color" submenu when onUpdateGroupColor is provided', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });
    });

    it('should not show "Group color" submenu when onUpdateGroupColor is not provided', async () => {
      const user = userEvent.setup();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Rename group')).toBeInTheDocument();
      });
      expect(screen.queryByText('Group color')).not.toBeInTheDocument();
    });

    it('should show color palette when hovering over "Group color" submenu', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        expect(screen.getByTestId('group-color-menu-group-1')).toBeInTheDocument();
        expect(screen.getByTestId('group-color-red')).toBeInTheDocument();
        expect(screen.getByTestId('group-color-blue')).toBeInTheDocument();
      });
    });

    it('should call onUpdateGroupColor when clicking a color swatch', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        expect(screen.getByTestId('group-color-blue')).toBeInTheDocument();
      });

      // Use fireEvent for the color swatch click to avoid timing issues with the submenu
      fireEvent.click(screen.getByTestId('group-color-blue'));

      expect(onUpdateGroupColor).toHaveBeenCalledWith('group-1', '#3b82f6');
    });

    it('should show "Clear color" button when group has a color', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#ef4444' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        expect(screen.getByTestId('group-color-clear')).toBeInTheDocument();
      });
    });

    it('should call onUpdateGroupColor with undefined when clicking "Clear color"', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#ef4444' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        expect(screen.getByTestId('group-color-clear')).toBeInTheDocument();
      });

      // Use fireEvent for the clear button click to avoid timing issues with the submenu
      fireEvent.click(screen.getByTestId('group-color-clear'));

      expect(onUpdateGroupColor).toHaveBeenCalledWith('group-1', undefined);
    });

    it('should not show "Clear color" button when group has no color', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        expect(screen.getByTestId('group-color-menu-group-1')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('group-color-clear')).not.toBeInTheDocument();
    });

    it('should highlight currently selected color in palette', async () => {
      const user = userEvent.setup();
      const onUpdateGroupColor = vi.fn();
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#3b82f6' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          onUpdateGroupColor={onUpdateGroupColor}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      await user.hover(screen.getByTestId('sheet-group-header-group-1'));
      await user.click(screen.getByTestId('sheet-group-menu-group-1'));

      await waitFor(() => {
        expect(screen.getByText('Group color')).toBeInTheDocument();
      });

      await user.hover(screen.getByText('Group color'));

      await waitFor(() => {
        const blueButton = screen.getByTestId('group-color-blue');
        expect(blueButton).toHaveClass('ring-2');
        expect(blueButton).toHaveClass('ring-primary');
      });
    });
  });

  describe('group color styling', () => {
    it('should apply border-left color to group header when group has color', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#ef4444' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      const header = screen.getByTestId('sheet-group-header-group-1');
      expect(header).toHaveStyle({ borderLeftColor: '#ef4444' });
    });

    it('should apply subtle background tint to group header when group has color', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [], color: '#ef4444' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      const header = screen.getByTestId('sheet-group-header-group-1');
      expect(header).toHaveStyle({ backgroundColor: '#ef444410' });
    });

    it('should apply subtle tint to non-active tabs within colored group', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-2'], color: '#3b82f6' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          activeSheetId="sheet-1"
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-3']}
        />
      );

      // sheet-2 is in the colored group and is not active
      const tabInGroup = screen.getByTestId('sheet-tab-sheet-2');
      expect(tabInGroup).toHaveStyle({ backgroundColor: '#3b82f615' });
    });

    it('should not apply tint to active tab within colored group', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-1'], color: '#3b82f6' },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          activeSheetId="sheet-1"
          groups={groups}
          ungroupedSheetIds={['sheet-2', 'sheet-3']}
        />
      );

      // sheet-1 is active, so it should not have the group color tint
      const activeTab = screen.getByTestId('sheet-tab-sheet-1');
      expect(activeTab).not.toHaveStyle({ backgroundColor: '#3b82f615' });
    });
  });

  describe('drag and drop', () => {
    it('should set dragging state when dragging a sheet', () => {
      render(<GroupedSheetTabs {...defaultProps} />);

      const tab = screen.getByTestId('sheet-tab-sheet-1');
      fireEvent.dragStart(tab, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });

      expect(tab).toHaveClass('opacity-50');
    });

    it('should show drop indicator when dragging over a group', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      const tab = screen.getByTestId('sheet-tab-sheet-1');
      const group = screen.getByTestId('sheet-group-group-1');

      fireEvent.dragStart(tab, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      fireEvent.dragOver(group, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() });

      expect(group).toHaveClass('ring-2');
    });

    it('should call onMoveSheetToGroup when dropping on a group', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: [] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-1', 'sheet-2', 'sheet-3']}
        />
      );

      const tab = screen.getByTestId('sheet-tab-sheet-1');
      const group = screen.getByTestId('sheet-group-group-1');

      fireEvent.dragStart(tab, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      fireEvent.drop(group, {
        dataTransfer: { getData: () => 'sheet-1' },
        preventDefault: vi.fn()
      });

      expect(defaultProps.onMoveSheetToGroup).toHaveBeenCalledWith('sheet-1', 'group-1');
    });

    it('should call onMoveSheetToGroup with null when dropping on ungrouped area', () => {
      const groups: SheetGroup[] = [
        { id: 'group-1', name: 'Group 1', collapsed: false, sheetIds: ['sheet-1'] },
      ];

      render(
        <GroupedSheetTabs
          {...defaultProps}
          groups={groups}
          ungroupedSheetIds={['sheet-2', 'sheet-3']}
        />
      );

      const ungroupedArea = screen.getByTestId('ungrouped-sheets-area');

      fireEvent.drop(ungroupedArea, {
        dataTransfer: { getData: () => 'sheet-1' },
        preventDefault: vi.fn()
      });

      expect(defaultProps.onMoveSheetToGroup).toHaveBeenCalledWith('sheet-1', null);
    });
  });
});
