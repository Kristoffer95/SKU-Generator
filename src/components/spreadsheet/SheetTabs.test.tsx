import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SheetTabs, SheetTabsProps, SheetTab } from "./SheetTabs";

describe("SheetTabs", () => {
  const mockOnActivate = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAdd = vi.fn();

  const defaultSheets: SheetTab[] = [
    { id: "sheet-1", name: "Sheet 1" },
    { id: "sheet-2", name: "Sheet 2" },
    { id: "sheet-3", name: "Sheet 3" },
  ];

  const defaultProps: SheetTabsProps = {
    sheets: defaultSheets,
    activeSheetId: "sheet-1",
    onActivate: mockOnActivate,
    onRename: mockOnRename,
    onDelete: mockOnDelete,
    onAdd: mockOnAdd,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all sheet tabs", () => {
      render(<SheetTabs {...defaultProps} />);

      expect(screen.getByTestId("sheet-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-tab-sheet-1")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-tab-sheet-2")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-tab-sheet-3")).toBeInTheDocument();
    });

    it("displays sheet names", () => {
      render(<SheetTabs {...defaultProps} />);

      expect(screen.getByText("Sheet 1")).toBeInTheDocument();
      expect(screen.getByText("Sheet 2")).toBeInTheDocument();
      expect(screen.getByText("Sheet 3")).toBeInTheDocument();
    });

    it("renders add button", () => {
      render(<SheetTabs {...defaultProps} />);

      expect(screen.getByTestId("sheet-tab-add")).toBeInTheDocument();
    });

    it("marks active tab with data-active attribute", () => {
      render(<SheetTabs {...defaultProps} />);

      expect(screen.getByTestId("sheet-tab-sheet-1")).toHaveAttribute(
        "data-active",
        "true"
      );
      expect(screen.getByTestId("sheet-tab-sheet-2")).toHaveAttribute(
        "data-active",
        "false"
      );
    });
  });

  describe("tab switching (click)", () => {
    it("calls onActivate when clicking a tab", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.click(screen.getByTestId("sheet-tab-sheet-2"));

      expect(mockOnActivate).toHaveBeenCalledWith("sheet-2");
    });

    it("calls onActivate when clicking inactive tab", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.click(screen.getByTestId("sheet-tab-sheet-3"));

      expect(mockOnActivate).toHaveBeenCalledWith("sheet-3");
    });
  });

  describe("tab renaming (double-click)", () => {
    it("shows input on double-click", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      expect(screen.getByTestId("sheet-tab-rename-input")).toBeInTheDocument();
    });

    it("pre-fills input with current name", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input") as HTMLInputElement;
      expect(input.value).toBe("Sheet 1");
    });

    it("calls onRename on Enter key", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input");
      fireEvent.change(input, { target: { value: "New Name" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnRename).toHaveBeenCalledWith("sheet-1", "New Name");
    });

    it("calls onRename on blur", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input");
      fireEvent.change(input, { target: { value: "Blurred Name" } });
      fireEvent.blur(input);

      expect(mockOnRename).toHaveBeenCalledWith("sheet-1", "Blurred Name");
    });

    it("cancels rename on Escape key", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input");
      fireEvent.change(input, { target: { value: "Should not save" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Should not call onRename (escape cancels)
      expect(mockOnRename).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("sheet-tab-rename-input")
      ).not.toBeInTheDocument();
    });

    it("trims whitespace from renamed value", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input");
      fireEvent.change(input, { target: { value: "  Trimmed Name  " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnRename).toHaveBeenCalledWith("sheet-1", "Trimmed Name");
    });

    it("does not call onRename if name is empty after trim", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.doubleClick(screen.getByTestId("sheet-tab-sheet-1"));

      const input = screen.getByTestId("sheet-tab-rename-input");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnRename).not.toHaveBeenCalled();
    });
  });

  describe("tab deletion (X button)", () => {
    it("shows delete button on hover when multiple sheets exist", () => {
      render(<SheetTabs {...defaultProps} />);

      // Delete buttons should exist in DOM (visibility controlled by CSS)
      expect(screen.getByTestId("sheet-tab-delete-sheet-1")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-tab-delete-sheet-2")).toBeInTheDocument();
    });

    it("hides delete button when only one sheet exists", () => {
      const singleSheet: SheetTab[] = [{ id: "only", name: "Only Sheet" }];
      render(
        <SheetTabs
          {...defaultProps}
          sheets={singleSheet}
          activeSheetId="only"
        />
      );

      expect(
        screen.queryByTestId("sheet-tab-delete-only")
      ).not.toBeInTheDocument();
    });

    it("requires confirmation (two clicks) to delete", () => {
      render(<SheetTabs {...defaultProps} />);

      const deleteBtn = screen.getByTestId("sheet-tab-delete-sheet-2");

      // First click - should not delete yet
      fireEvent.click(deleteBtn);
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Second click - should delete
      fireEvent.click(deleteBtn);
      expect(mockOnDelete).toHaveBeenCalledWith("sheet-2");
    });

    it("resets confirmation state after timeout", async () => {
      vi.useFakeTimers();
      render(<SheetTabs {...defaultProps} />);

      const deleteBtn = screen.getByTestId("sheet-tab-delete-sheet-2");

      // First click
      fireEvent.click(deleteBtn);
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Wait for confirmation timeout (3 seconds)
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      // Click again - should be first click again, not confirm
      fireEvent.click(deleteBtn);
      expect(mockOnDelete).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("does not activate tab when clicking delete button", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.click(screen.getByTestId("sheet-tab-delete-sheet-2"));

      expect(mockOnActivate).not.toHaveBeenCalled();
    });
  });

  describe("add new sheet (+ button)", () => {
    it("calls onAdd when clicking add button", () => {
      render(<SheetTabs {...defaultProps} />);

      fireEvent.click(screen.getByTestId("sheet-tab-add"));

      expect(mockOnAdd).toHaveBeenCalled();
    });
  });

  describe("active tab styling", () => {
    it("active tab has distinct styling via data-active", () => {
      render(<SheetTabs {...defaultProps} activeSheetId="sheet-2" />);

      const activeTab = screen.getByTestId("sheet-tab-sheet-2");
      const inactiveTab = screen.getByTestId("sheet-tab-sheet-1");

      expect(activeTab).toHaveAttribute("data-active", "true");
      expect(inactiveTab).toHaveAttribute("data-active", "false");
    });
  });

  describe("edge cases", () => {
    it("handles empty sheets array", () => {
      render(<SheetTabs {...defaultProps} sheets={[]} />);

      expect(screen.getByTestId("sheet-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-tab-add")).toBeInTheDocument();
    });

    it("handles null activeSheetId", () => {
      render(<SheetTabs {...defaultProps} activeSheetId={null} />);

      // All tabs should be inactive
      expect(screen.getByTestId("sheet-tab-sheet-1")).toHaveAttribute(
        "data-active",
        "false"
      );
    });

    it("truncates long sheet names", () => {
      const longNameSheet: SheetTab[] = [
        { id: "long", name: "This is a very long sheet name that should be truncated" },
      ];
      render(
        <SheetTabs {...defaultProps} sheets={longNameSheet} activeSheetId="long" />
      );

      const nameElement = screen.getByText("This is a very long sheet name that should be truncated");
      expect(nameElement).toHaveClass("truncate");
    });
  });
});
