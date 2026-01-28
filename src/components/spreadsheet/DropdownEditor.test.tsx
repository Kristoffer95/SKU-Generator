import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownEditor, DropdownEditorProps } from "./DropdownEditor";
import type { SKUCell } from "@/types/spreadsheet";

describe("DropdownEditor", () => {
  const mockOnChange = vi.fn();
  const mockExitEditMode = vi.fn();

  const defaultProps: DropdownEditorProps = {
    row: 1,
    column: 1,
    cell: { value: "" },
    onChange: mockOnChange,
    exitEditMode: mockExitEditMode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dropdown rendering", () => {
    it("renders <select> when cell has dropdownOptions", () => {
      const cellWithDropdown: SKUCell = {
        value: "Option A",
        dropdownOptions: ["Option A", "Option B", "Option C"],
      };

      render(
        <DropdownEditor {...defaultProps} cell={cellWithDropdown} />
      );

      expect(screen.getByTestId("dropdown-editor-select")).toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-editor-input")).not.toBeInTheDocument();
    });

    it("renders dropdown options from cell.dropdownOptions", () => {
      const options = ["Red", "Green", "Blue"];
      const cell: SKUCell = {
        value: "Red",
        dropdownOptions: options,
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      // Include the empty "Select..." option
      expect(select.querySelectorAll("option")).toHaveLength(options.length + 1);

      options.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it("shows empty placeholder option", () => {
      const cell: SKUCell = {
        value: "",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      expect(screen.getByText("Select...")).toBeInTheDocument();
    });

    it("selects current value in dropdown", () => {
      const cell: SKUCell = {
        value: "B",
        dropdownOptions: ["A", "B", "C"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select") as HTMLSelectElement;
      expect(select.value).toBe("B");
    });
  });

  describe("text input rendering", () => {
    it("renders <input> when cell has no dropdownOptions", () => {
      const cellWithoutDropdown: SKUCell = {
        value: "some text",
      };

      render(
        <DropdownEditor {...defaultProps} cell={cellWithoutDropdown} />
      );

      expect(screen.getByTestId("dropdown-editor-input")).toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-editor-select")).not.toBeInTheDocument();
    });

    it("renders <input> when dropdownOptions is empty array", () => {
      const cell: SKUCell = {
        value: "text",
        dropdownOptions: [],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      expect(screen.getByTestId("dropdown-editor-input")).toBeInTheDocument();
    });

    it("renders <input> when cell is undefined", () => {
      render(<DropdownEditor {...defaultProps} cell={undefined} />);

      expect(screen.getByTestId("dropdown-editor-input")).toBeInTheDocument();
    });

    it("displays current value in input", () => {
      const cell: SKUCell = {
        value: "hello world",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input") as HTMLInputElement;
      expect(input.value).toBe("hello world");
    });
  });

  describe("onChange behavior", () => {
    it("calls onChange with new value when select changes", async () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B", "C"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      fireEvent.change(select, { target: { value: "B" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...cell,
        value: "B",
      });
    });

    it("calls onChange with new value when input changes", async () => {
      const user = userEvent.setup();
      const cell: SKUCell = {
        value: "",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input");
      await user.type(input, "x");

      expect(mockOnChange).toHaveBeenCalledWith({
        ...cell,
        value: "x",
      });
    });
  });

  describe("keyboard handling", () => {
    it("calls exitEditMode on Enter key in select", () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      fireEvent.keyDown(select, { key: "Enter" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("calls exitEditMode on Tab key in select", () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      fireEvent.keyDown(select, { key: "Tab" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("calls exitEditMode on Escape key in select", () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      fireEvent.keyDown(select, { key: "Escape" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("calls exitEditMode on Enter key in input", () => {
      const cell: SKUCell = {
        value: "text",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("calls exitEditMode on Tab key in input", () => {
      const cell: SKUCell = {
        value: "text",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input");
      fireEvent.keyDown(input, { key: "Tab" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("calls exitEditMode on Escape key in input", () => {
      const cell: SKUCell = {
        value: "text",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(mockExitEditMode).toHaveBeenCalled();
    });

    it("does not exit on other keys", () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      fireEvent.keyDown(select, { key: "ArrowDown" });

      expect(mockExitEditMode).not.toHaveBeenCalled();
    });
  });

  describe("auto-focus behavior", () => {
    it("auto-focuses select element on mount", () => {
      const cell: SKUCell = {
        value: "A",
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select");
      expect(document.activeElement).toBe(select);
    });

    it("auto-focuses input element on mount", () => {
      const cell: SKUCell = {
        value: "text",
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input");
      expect(document.activeElement).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("handles null cell value", () => {
      const cell: SKUCell = {
        value: null,
        dropdownOptions: ["A", "B"],
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const select = screen.getByTestId("dropdown-editor-select") as HTMLSelectElement;
      expect(select.value).toBe("");
    });

    it("handles numeric cell value", () => {
      const cell: SKUCell = {
        value: 42,
      };

      render(<DropdownEditor {...defaultProps} cell={cell} />);

      const input = screen.getByTestId("dropdown-editor-input") as HTMLInputElement;
      expect(input.value).toBe("42");
    });
  });
});
