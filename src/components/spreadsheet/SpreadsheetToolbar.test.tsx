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

    it("calls onCellColorPickerOpenChange when dropdown opens", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = vi.fn();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onCellColorChange={mockOnCellColorChange}
          onCellColorPickerOpenChange={mockOnOpenChange}
        />
      );

      await user.click(screen.getByTestId("cell-color-picker-trigger"));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(true);
      });
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

    it("calls onTextColorPickerOpenChange when dropdown opens", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = vi.fn();
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onTextColorChange={mockOnTextColorChange}
          onTextColorPickerOpenChange={mockOnOpenChange}
        />
      );

      await user.click(screen.getByTestId("cell-text-color-picker-trigger"));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe("bold button", () => {
    const mockOnBoldChange = vi.fn();

    beforeEach(() => {
      mockOnBoldChange.mockClear();
    });

    it("renders bold button when onBoldChange is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onBoldChange={mockOnBoldChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-bold")).toBeInTheDocument();
    });

    it("does not render bold button when onBoldChange is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-bold")).not.toBeInTheDocument();
    });

    it("bold button is disabled when hasSelection is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={false}
          onBoldChange={mockOnBoldChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-bold")).toBeDisabled();
    });

    it("bold button is enabled when hasSelection is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onBoldChange={mockOnBoldChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-bold")).not.toBeDisabled();
    });

    it("calls onBoldChange with true when clicked and isBold is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isBold={false}
          onBoldChange={mockOnBoldChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-bold"));

      expect(mockOnBoldChange).toHaveBeenCalledWith(true);
    });

    it("calls onBoldChange with false when clicked and isBold is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isBold={true}
          onBoldChange={mockOnBoldChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-bold"));

      expect(mockOnBoldChange).toHaveBeenCalledWith(false);
    });

    it("shows active state when isBold is true and hasSelection", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isBold={true}
          onBoldChange={mockOnBoldChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-bold")).toHaveClass("bg-accent");
    });
  });

  describe("italic button", () => {
    const mockOnItalicChange = vi.fn();

    beforeEach(() => {
      mockOnItalicChange.mockClear();
    });

    it("renders italic button when onItalicChange is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onItalicChange={mockOnItalicChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-italic")).toBeInTheDocument();
    });

    it("does not render italic button when onItalicChange is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-italic")).not.toBeInTheDocument();
    });

    it("italic button is disabled when hasSelection is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={false}
          onItalicChange={mockOnItalicChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-italic")).toBeDisabled();
    });

    it("calls onItalicChange with true when clicked and isItalic is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isItalic={false}
          onItalicChange={mockOnItalicChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-italic"));

      expect(mockOnItalicChange).toHaveBeenCalledWith(true);
    });

    it("calls onItalicChange with false when clicked and isItalic is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isItalic={true}
          onItalicChange={mockOnItalicChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-italic"));

      expect(mockOnItalicChange).toHaveBeenCalledWith(false);
    });

    it("shows active state when isItalic is true and hasSelection", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          isItalic={true}
          onItalicChange={mockOnItalicChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-italic")).toHaveClass("bg-accent");
    });
  });

  describe("alignment buttons", () => {
    const mockOnAlignChange = vi.fn();

    beforeEach(() => {
      mockOnAlignChange.mockClear();
    });

    it("renders alignment buttons when onAlignChange is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-align-left")).toBeInTheDocument();
      expect(screen.getByTestId("spreadsheet-toolbar-align-center")).toBeInTheDocument();
      expect(screen.getByTestId("spreadsheet-toolbar-align-right")).toBeInTheDocument();
    });

    it("does not render alignment buttons when onAlignChange is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-align-left")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spreadsheet-toolbar-align-center")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spreadsheet-toolbar-align-right")).not.toBeInTheDocument();
    });

    it("alignment buttons are disabled when hasSelection is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={false}
          onAlignChange={mockOnAlignChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-align-left")).toBeDisabled();
      expect(screen.getByTestId("spreadsheet-toolbar-align-center")).toBeDisabled();
      expect(screen.getByTestId("spreadsheet-toolbar-align-right")).toBeDisabled();
    });

    it("calls onAlignChange with 'left' when align left button is clicked", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-align-left"));

      expect(mockOnAlignChange).toHaveBeenCalledWith("left");
    });

    it("calls onAlignChange with 'center' when align center button is clicked", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-align-center"));

      expect(mockOnAlignChange).toHaveBeenCalledWith("center");
    });

    it("calls onAlignChange with 'right' when align right button is clicked", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-align-right"));

      expect(mockOnAlignChange).toHaveBeenCalledWith("right");
    });

    it("shows active state on align left when textAlign is 'left' and hasSelection", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          textAlign="left"
          onAlignChange={mockOnAlignChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-align-left")).toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-center")).not.toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-right")).not.toHaveClass("bg-accent");
    });

    it("shows active state on align center when textAlign is 'center' and hasSelection", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          textAlign="center"
          onAlignChange={mockOnAlignChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-align-left")).not.toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-center")).toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-right")).not.toHaveClass("bg-accent");
    });

    it("shows active state on align right when textAlign is 'right' and hasSelection", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          textAlign="right"
          onAlignChange={mockOnAlignChange}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-align-left")).not.toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-center")).not.toHaveClass("bg-accent");
      expect(screen.getByTestId("spreadsheet-toolbar-align-right")).toHaveClass("bg-accent");
    });
  });

  describe("auto populate button", () => {
    const mockOnAutoPopulate = vi.fn();

    beforeEach(() => {
      mockOnAutoPopulate.mockClear();
    });

    it("renders auto populate button when onAutoPopulate is provided", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          onAutoPopulate={mockOnAutoPopulate}
          canAutoPopulate={true}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-auto-populate")).toBeInTheDocument();
      expect(screen.getByText("Auto Populate")).toBeInTheDocument();
    });

    it("does not render auto populate button when onAutoPopulate is not provided", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.queryByTestId("spreadsheet-toolbar-auto-populate")).not.toBeInTheDocument();
    });

    it("auto populate button is disabled when canAutoPopulate is false", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          onAutoPopulate={mockOnAutoPopulate}
          canAutoPopulate={false}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-auto-populate")).toBeDisabled();
    });

    it("auto populate button is enabled when canAutoPopulate is true", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          onAutoPopulate={mockOnAutoPopulate}
          canAutoPopulate={true}
        />
      );

      expect(screen.getByTestId("spreadsheet-toolbar-auto-populate")).not.toBeDisabled();
    });

    it("calls onAutoPopulate when clicked", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          onAutoPopulate={mockOnAutoPopulate}
          canAutoPopulate={true}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-auto-populate"));

      expect(mockOnAutoPopulate).toHaveBeenCalledTimes(1);
    });

    it("does not call onAutoPopulate when disabled and clicked", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          onAutoPopulate={mockOnAutoPopulate}
          canAutoPopulate={false}
        />
      );

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-auto-populate"));

      expect(mockOnAutoPopulate).not.toHaveBeenCalled();
    });
  });

  describe("focus preservation (selection should be maintained after toolbar actions)", () => {
    const mockOnBoldChange = vi.fn();
    const mockOnItalicChange = vi.fn();
    const mockOnAlignChange = vi.fn();

    beforeEach(() => {
      mockOnBoldChange.mockClear();
      mockOnItalicChange.mockClear();
      mockOnAlignChange.mockClear();
    });

    it("bold button prevents focus change on mousedown", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onBoldChange={mockOnBoldChange}
        />
      );

      const button = screen.getByTestId("spreadsheet-toolbar-bold");
      const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");

      button.dispatchEvent(mouseDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("italic button prevents focus change on mousedown", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onItalicChange={mockOnItalicChange}
        />
      );

      const button = screen.getByTestId("spreadsheet-toolbar-italic");
      const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");

      button.dispatchEvent(mouseDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("align left button prevents focus change on mousedown", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      const button = screen.getByTestId("spreadsheet-toolbar-align-left");
      const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");

      button.dispatchEvent(mouseDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("align center button prevents focus change on mousedown", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      const button = screen.getByTestId("spreadsheet-toolbar-align-center");
      const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");

      button.dispatchEvent(mouseDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("align right button prevents focus change on mousedown", () => {
      render(
        <SpreadsheetToolbar
          {...defaultProps}
          hasSelection={true}
          onAlignChange={mockOnAlignChange}
        />
      );

      const button = screen.getByTestId("spreadsheet-toolbar-align-right");
      const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");

      button.dispatchEvent(mouseDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
