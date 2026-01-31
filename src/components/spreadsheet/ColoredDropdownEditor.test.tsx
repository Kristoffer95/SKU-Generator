import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColoredDropdownEditor } from './ColoredDropdownEditor';
import type { SKUCell } from '@/types/spreadsheet';

describe('ColoredDropdownEditor', () => {
  const mockOptions = ['Red', 'Blue', 'Green'];
  const mockColors: Record<string, string> = {
    Red: '#fce4ec',
    Blue: '#e3f2fd',
    Green: '#e8f5e9',
  };

  const mockCell: SKUCell = {
    value: 'Red',
    dropdownOptions: mockOptions,
    dropdownColors: mockColors,
  };

  const mockOnChange = vi.fn();
  const mockExitEditMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEditor = (cell: SKUCell = mockCell) => {
    return render(
      <ColoredDropdownEditor
        cell={cell}
        options={mockOptions}
        colors={mockColors}
        onChange={mockOnChange}
        exitEditMode={mockExitEditMode}
      />
    );
  };

  it('renders with the correct test id', () => {
    renderEditor();
    expect(screen.getByTestId('colored-dropdown-editor')).toBeInTheDocument();
  });

  it('renders dropdown trigger with current value', () => {
    renderEditor();
    expect(screen.getByTestId('colored-dropdown-trigger')).toHaveTextContent('Red');
  });

  it('renders "Select..." when no value is set', () => {
    const emptyCell: SKUCell = { value: null };
    renderEditor(emptyCell);
    expect(screen.getByTestId('colored-dropdown-trigger')).toHaveTextContent('Select...');
  });

  it('applies current value color to trigger background', () => {
    renderEditor();
    const trigger = screen.getByTestId('colored-dropdown-trigger');
    expect(trigger).toHaveStyle({ backgroundColor: '#fce4ec' });
  });

  it('renders dropdown content when opened', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTestId('colored-dropdown-content')).toBeInTheDocument();
    });
  });

  it('renders all dropdown options', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTestId('colored-dropdown-option-Red')).toBeInTheDocument();
      expect(screen.getByTestId('colored-dropdown-option-Blue')).toBeInTheDocument();
      expect(screen.getByTestId('colored-dropdown-option-Green')).toBeInTheDocument();
    });
  });

  it('applies background colors to dropdown options', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTestId('colored-dropdown-option-Red')).toHaveStyle({ backgroundColor: '#fce4ec' });
      expect(screen.getByTestId('colored-dropdown-option-Blue')).toHaveStyle({ backgroundColor: '#e3f2fd' });
      expect(screen.getByTestId('colored-dropdown-option-Green')).toHaveStyle({ backgroundColor: '#e8f5e9' });
    });
  });

  it('renders clear selection option', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTestId('colored-dropdown-clear')).toBeInTheDocument();
    });
  });

  it('calls onChange with selected value when option is clicked', async () => {
    renderEditor();
    await waitFor(() => {
      const blueOption = screen.getByTestId('colored-dropdown-option-Blue');
      fireEvent.click(blueOption);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ ...mockCell, value: 'Blue' });
    });
  });

  it('calls onChange with null when clear option is clicked', async () => {
    renderEditor();
    await waitFor(() => {
      const clearOption = screen.getByTestId('colored-dropdown-clear');
      fireEvent.click(clearOption);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ ...mockCell, value: null });
    });
  });

  it('shows checkmark on currently selected option', async () => {
    renderEditor();
    await waitFor(() => {
      const redOption = screen.getByTestId('colored-dropdown-option-Red');
      // The selected option should have a Check icon (via lucide-react)
      expect(redOption.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('handles keyboard escape to close and exit edit mode', async () => {
    renderEditor();
    const editor = screen.getByTestId('colored-dropdown-editor');

    fireEvent.keyDown(editor, { key: 'Escape' });

    await waitFor(() => {
      expect(mockExitEditMode).toHaveBeenCalled();
    });
  });

  it('handles keyboard tab to close and exit edit mode', async () => {
    renderEditor();
    const editor = screen.getByTestId('colored-dropdown-editor');

    fireEvent.keyDown(editor, { key: 'Tab' });

    await waitFor(() => {
      expect(mockExitEditMode).toHaveBeenCalled();
    });
  });

  it('handles options without colors', async () => {
    const partialColors: Record<string, string> = {
      Red: '#fce4ec',
      // Blue and Green have no colors
    };

    render(
      <ColoredDropdownEditor
        cell={mockCell}
        options={mockOptions}
        colors={partialColors}
        onChange={mockOnChange}
        exitEditMode={mockExitEditMode}
      />
    );

    await waitFor(() => {
      const blueOption = screen.getByTestId('colored-dropdown-option-Blue');
      // Options without colors should not have the color style from mockColors
      expect(blueOption).not.toHaveStyle({ backgroundColor: '#e3f2fd' });
    });
  });
});
