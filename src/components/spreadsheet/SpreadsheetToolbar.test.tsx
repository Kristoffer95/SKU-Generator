import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpreadsheetToolbar, SpreadsheetToolbarProps } from "./SpreadsheetToolbar";

describe("SpreadsheetToolbar", () => {
  const mockOnUndo = vi.fn();
  const mockOnRedo = vi.fn();
  const mockOnImport = vi.fn();
  const mockOnExportExcel = vi.fn();
  const mockOnExportCSV = vi.fn();
  const mockOnAddRow = vi.fn();

  const defaultProps: SpreadsheetToolbarProps = {
    canUndo: true,
    canRedo: true,
    onUndo: mockOnUndo,
    onRedo: mockOnRedo,
    onImport: mockOnImport,
    onExportExcel: mockOnExportExcel,
    onExportCSV: mockOnExportCSV,
    onAddRow: mockOnAddRow,
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

    it("renders import button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-import")).toBeInTheDocument();
      expect(screen.getByText("Import")).toBeInTheDocument();
    });

    it("renders export button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-export")).toBeInTheDocument();
      expect(screen.getByText("Export")).toBeInTheDocument();
    });

    it("renders add row button", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByTestId("spreadsheet-toolbar-add-row")).toBeInTheDocument();
      expect(screen.getByText("Add Row")).toBeInTheDocument();
    });

    it("renders hidden file input for import", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input");
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("type", "file");
      expect(fileInput).toHaveAttribute("accept", ".xlsx,.xls,.csv");
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

  describe("import button", () => {
    it("triggers file input when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input") as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-import"));

      expect(clickSpy).toHaveBeenCalled();
    });

    it("calls onImport when file is selected", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input");
      const testFile = new File(["test"], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(mockOnImport).toHaveBeenCalledWith(testFile);
    });

    it("does not call onImport when no file is selected", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input");

      fireEvent.change(fileInput, { target: { files: [] } });

      expect(mockOnImport).not.toHaveBeenCalled();
    });

    it("resets file input value after selection", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input") as HTMLInputElement;
      const testFile = new File(["test"], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(fileInput.value).toBe("");
    });
  });

  describe("export dropdown", () => {
    it("export button has dropdown trigger behavior", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const exportButton = screen.getByTestId("spreadsheet-toolbar-export");

      // Verify button has dropdown attributes
      expect(exportButton).toHaveAttribute("aria-haspopup", "menu");
      expect(exportButton).toHaveAttribute("data-state", "closed");
    });

    it("export button has correct type", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const exportButton = screen.getByTestId("spreadsheet-toolbar-export");

      expect(exportButton).toHaveAttribute("type", "button");
    });

    it("export button displays correct text", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      expect(screen.getByText("Export")).toBeInTheDocument();
    });
  });

  describe("add row button", () => {
    it("calls onAddRow when clicked", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("spreadsheet-toolbar-add-row"));

      expect(mockOnAddRow).toHaveBeenCalledTimes(1);
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

    it("import still works with undefined files", () => {
      render(<SpreadsheetToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId("spreadsheet-toolbar-file-input");

      // Simulate change with undefined files
      fireEvent.change(fileInput, { target: { files: undefined } });

      expect(mockOnImport).not.toHaveBeenCalled();
    });
  });
});
