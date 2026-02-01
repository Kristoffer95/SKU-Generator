import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckboxCell, createCheckboxCellViewer } from './CheckboxCell';
import type { SKUCell } from '@/types/spreadsheet';

describe('CheckboxCell', () => {
  describe('basic rendering', () => {
    it('renders text value when cell is not a checkbox', () => {
      const cell: SKUCell = {
        value: 'Hello',
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('renders number value when cell is not a checkbox', () => {
      const cell: SKUCell = {
        value: 42,
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders empty span for null value when not a checkbox', () => {
      const cell: SKUCell = {
        value: null,
      };

      const { container } = render(<CheckboxCell cell={cell} row={0} column={0} />);

      // The span should be present but empty
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('');
    });

    it('renders empty span for undefined cell', () => {
      const { container } = render(<CheckboxCell cell={undefined} row={0} column={0} />);

      // The span should be present but empty
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('');
    });

    it('renders unchecked checkbox when value is false', () => {
      const cell: SKUCell = {
        value: false,
        checkbox: true,
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-checkbox', 'true');
      expect(checkbox).toHaveAttribute('data-checked', 'false');
    });

    it('renders checked checkbox when value is true', () => {
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-checkbox', 'true');
      expect(checkbox).toHaveAttribute('data-checked', 'true');
    });
  });

  describe('createCheckboxCellViewer', () => {
    it('creates a component that renders text for non-checkbox cells', () => {
      const Component = createCheckboxCellViewer();
      const cell: SKUCell = {
        value: 'Test',
      };

      render(<Component cell={cell} row={0} column={0} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('creates a component that renders checkbox for checkbox cells', () => {
      const Component = createCheckboxCellViewer();
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      render(<Component cell={cell} row={0} column={0} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-checked', 'true');
    });

    it('calls onCheckboxClick when clicking a checkbox cell', () => {
      const onCheckboxClick = vi.fn();
      const Component = createCheckboxCellViewer(onCheckboxClick);
      const cell: SKUCell = {
        value: false,
        checkbox: true,
      };

      render(<Component cell={cell} row={2} column={3} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      fireEvent.click(checkbox);

      expect(onCheckboxClick).toHaveBeenCalledWith(2, 3, false);
    });

    it('calls onCheckboxClick with correct value when checkbox is checked', () => {
      const onCheckboxClick = vi.fn();
      const Component = createCheckboxCellViewer(onCheckboxClick);
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      render(<Component cell={cell} row={1} column={2} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      fireEvent.click(checkbox);

      expect(onCheckboxClick).toHaveBeenCalledWith(1, 2, true);
    });

    it('does not call onCheckboxClick for non-checkbox cells', () => {
      const onCheckboxClick = vi.fn();
      const Component = createCheckboxCellViewer(onCheckboxClick);
      const cell: SKUCell = {
        value: 'Text',
      };

      render(<Component cell={cell} row={0} column={0} />);

      const textElement = screen.getByText('Text');
      fireEvent.click(textElement);

      expect(onCheckboxClick).not.toHaveBeenCalled();
    });

    it('works without onCheckboxClick handler', () => {
      const Component = createCheckboxCellViewer();
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      render(<Component cell={cell} row={0} column={0} />);

      const checkbox = screen.getByTestId('checkbox-cell');
      // Should not throw when clicking without handler
      fireEvent.click(checkbox);

      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('valueColor rendering', () => {
    it('renders colored background when valueColor is set', () => {
      const cell: SKUCell = {
        value: 'Red',
        valueColor: '#FFB3BA', // Pink-ish color
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      const coloredDiv = screen.getByTestId('colored-cell-viewer');
      expect(coloredDiv).toBeInTheDocument();
      expect(coloredDiv).toHaveStyle({ backgroundColor: '#FFB3BA' });
      expect(screen.getByText('Red')).toBeInTheDocument();
    });

    it('does not render colored background when valueColor is not set', () => {
      const cell: SKUCell = {
        value: 'Blue',
      };

      render(<CheckboxCell cell={cell} row={0} column={0} />);

      expect(screen.queryByTestId('colored-cell-viewer')).not.toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
    });

    it('renders colored background with createCheckboxCellViewer', () => {
      const Component = createCheckboxCellViewer();
      const cell: SKUCell = {
        value: 'Green',
        valueColor: '#BAFFC9', // Light green
      };

      render(<Component cell={cell} row={0} column={0} />);

      const coloredDiv = screen.getByTestId('colored-cell-viewer');
      expect(coloredDiv).toBeInTheDocument();
      expect(coloredDiv).toHaveStyle({ backgroundColor: '#BAFFC9' });
    });
  });

  describe('styling', () => {
    it('applies checked styles when checkbox is true', () => {
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      const { container } = render(<CheckboxCell cell={cell} row={0} column={0} />);

      // The inner div should have bg-primary for checked state
      const checkboxVisual = container.querySelector('.bg-primary');
      expect(checkboxVisual).toBeInTheDocument();
    });

    it('applies unchecked styles when checkbox is false', () => {
      const cell: SKUCell = {
        value: false,
        checkbox: true,
      };

      const { container } = render(<CheckboxCell cell={cell} row={0} column={0} />);

      // The inner div should have bg-background for unchecked state
      const checkboxVisual = container.querySelector('.bg-background');
      expect(checkboxVisual).toBeInTheDocument();
    });

    it('renders Check icon when checked', () => {
      const cell: SKUCell = {
        value: true,
        checkbox: true,
      };

      const { container } = render(<CheckboxCell cell={cell} row={0} column={0} />);

      // Check icon should be present (it's an SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('does not render Check icon when unchecked', () => {
      const cell: SKUCell = {
        value: false,
        checkbox: true,
      };

      const { container } = render(<CheckboxCell cell={cell} row={0} column={0} />);

      // Check icon should not be present
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });
});
