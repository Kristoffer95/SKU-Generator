import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpreadsheetToolbar, SpreadsheetToolbarProps } from "./SpreadsheetToolbar";

describe("SpreadsheetToolbar", () => {
  const mockOnUndo = vi.fn();
  const mockOnRedo = vi.fn();
  const mockOnAddRow = vi.fn();
  const mockOnAddColumn = vi.fn();

  const defaultProps: SpreadsheetToolbarProps = {
    canUndo: true,
    canRedo: true,
    onUndo: mockOnUndo,
    onRedo: mockOnRedo,
    onAddRow: mockOnAddRow,
    onAddColumn: mockOnAddColumn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the toolbar", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar")).toBeInTheDocument();
    });

    it("renders undo button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-undo")).toBeInTheDocument();
    });

    it("renders redo button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-redo")).toBeInTheDocument();
    });

    it("does not render import button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-import")).not.toBeInTheDocument();
    });

    it("does not render export button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-export")).not.toBeInTheDocument();
    });

    it("renders add row button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-add-row")).toBeInTheDocument();
      expect(screen.getByText("Add Row")).toBeInTheDocument();
    });

    it("renders add column button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-add-column")).toBeInTheDocument();
      expect(screen.getByText("Add Column")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<SpreadsheetToolbar {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("spreadsheet-toolbar")).toHaveClass("custom-class");
    });
  });

  describe("undo button", () => {
    it("calls onUndo when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-undo"));

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
    });

    it("is enabled when canUndo is true", () => {
      render(<SpreadsheetToolbar {...defaultProps} canUndo={true} />);

      expect(screen.getByTestId("spreadsheet-toolbar-undo")).not.toBeDisabled();
    });

    it("is disabled when canUndo is false", () => {
      render(<SpreadsheetToolbar {...defaultProps} canUndo={false} />);

      expect(screen.getByTestId("spreadsheet-toolbar-undo")).toBeDisabled();
    });

    it("does not call onUndo when disabled and clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} canUndo={false} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-undo"));

      expect(mockOnUndo).not.toHaveBeenCalled();
    });
  });

  describe("redo button", () => {
    it("calls onRedo when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-redo"));

      expect(mockOnRedo).toHaveBeenCalledTimes(1);
    });

    it("is enabled when canRedo is true", () => {
      render(<SpreadsheetToolbar {...defaultProps} canRedo={true} />);

      expect(screen.getByTestId("spreadsheet-toolbar-redo")).not.toBeDisabled();
    });

    it("is disabled when canRedo is false", () => {
      render(<SpreadsheetToolbar {...defaultProps} canRedo={false} />);

      expect(screen.getByTestId("spreadsheet-toolbar-redo")).toBeDisabled();
    });

    it("does not call onRedo when disabled and clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} canRedo={false} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-redo"));

      expect(mockOnRedo).not.toHaveBeenCalled();
    });
  });

  describe("add row button", () => {
    it("calls onAddRow when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-add-row"));

      expect(mockOnAddRow).toHaveBeenCalledTimes(1);
    });
  });

  describe("add column button", () => {
    it("calls onAddColumn when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-add-column"));

      expect(mockOnAddColumn).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("handles both canUndo and canRedo being false", () => {
      render(
        <SpreadsheetToolbar {...defaultProps} canUndo={false} canRedo={false} />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-undo")).toBeDisabled();
      expect(screen.getByTestId("spreadsheet-toolbar-redo")).toBeDisabled();
    });
  });

  describe("cell color picker", () => {
    const mockOnCellColorChange = vi.fn();

    beforeEach(() => {
      mockOnCellColorChange.mockClear();
    });

    it("renders color picker when onCellColorChange is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onCellColorChange={mockOnCellColorChange}
        />
      );

      expect(screen.getByTestId("cell-color-picker-trigger")).toBeInTheDocument();
    });

    it("does not render color picker when onCellColorChange is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("cell-color-picker-trigger")).not.toBeInTheDocument();
    });

    it("color picker is disabled when hasSelection is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={false}
          onCellColorChange={mockOnCellColorChange}
        />
      );

      expect(screen.getByTestId("cell-color-picker-trigger")).toBeDisabled();
    });

    it("color picker is enabled when hasSelection is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onCellColorChange={mockOnCellColorChange}
        />
      );

      expect(screen.getByTestId("cell-color-picker-trigger")).not.toBeDisabled();
    });

    it("opens dropdown when color picker trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onCellColorChange={mockOnCellColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-color-picker-dropdown")).toBeInTheDocument();
      });
    });

    it("calls onCellColorChange when a color is selected", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onCellColorChange={mockOnCellColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-color-swatch-fce4ec")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cell-color-swatch-fce4ec")); // Light pink

      expect(mockOnCellColorChange).toHaveBeenCalledWith("#fce4ec");
    });

    it("calls onCellColorChange with null when clear color is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          selectedCellColor="#fce4ec"
          onCellColorChange={mockOnCellColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-color-clear")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cell-color-clear"));

      expect(mockOnCellColorChange).toHaveBeenCalledWith(null);
    });
  });

  describe("cell text color picker", () => {
    const mockOnTextColorChange = vi.fn();

    beforeEach(() => {
      mockOnTextColorChange.mockClear();
    });

    it("renders text color picker when onTextColorChange is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onTextColorChange={mockOnTextColorChange}
        />
      );

      expect(screen.getByTestId("cell-text-color-picker-trigger")).toBeInTheDocument();
    });

    it("does not render text color picker when onTextColorChange is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("cell-text-color-picker-trigger")).not.toBeInTheDocument();
    });

    it("text color picker is disabled when hasSelection is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={false}
          onTextColorChange={mockOnTextColorChange}
        />
      );

      expect(screen.getByTestId("cell-text-color-picker-trigger")).toBeDisabled();
    });

    it("text color picker is enabled when hasSelection is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onTextColorChange={mockOnTextColorChange}
        />
      );

      expect(screen.getByTestId("cell-text-color-picker-trigger")).not.toBeDisabled();
    });

    it("opens dropdown when text color picker trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onTextColorChange={mockOnTextColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-text-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-text-color-picker-dropdown")).toBeInTheDocument();
      });
    });

    it("calls onTextColorChange when a color is selected", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onTextColorChange={mockOnTextColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-text-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-text-color-swatch-dc2626")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cell-text-color-swatch-dc2626")); // Red

      expect(mockOnTextColorChange).toHaveBeenCalledWith("#dc2626");
    });

    it("calls onTextColorChange with null when clear text color is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          selectedTextColor="#dc2626"
          onTextColorChange={mockOnTextColorChange}
        />
      );

      await user.click(screen.getByTestId("cell-text-color-picker-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("cell-text-color-clear")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cell-text-color-clear"));

      expect(mockOnTextColorChange).toHaveBeenCalledWith(null);
    });
  });
});
