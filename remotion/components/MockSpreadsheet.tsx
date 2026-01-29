import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface CellData {
  value: string;
  /** Whether this is a header cell */
  isHeader?: boolean;
  /** Whether this cell is read-only (SKU column) */
  readOnly?: boolean;
  /** Whether this cell has a duplicate SKU warning */
  isDuplicate?: boolean;
  /** Whether this cell is currently selected */
  isSelected?: boolean;
  /** Whether this cell is being edited */
  isEditing?: boolean;
}

export interface MockSpreadsheetProps {
  /** 2D array of cell data */
  data: CellData[][];
  /** Column headers */
  headers: string[];
  /** Frame when spreadsheet appears (default: 0) */
  startFrame?: number;
  /** Whether to animate appearance (default: true) */
  animate?: boolean;
  /** Currently selected cell [row, col] or null */
  selectedCell?: [number, number] | null;
  /** Cell currently showing dropdown [row, col] or null */
  dropdownCell?: [number, number] | null;
  /** Dropdown options to show */
  dropdownOptions?: string[];
  /** Currently highlighted dropdown option index */
  highlightedOption?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Spreadsheet mockup matching the SKU Generator app's grid styling.
 * Supports cell selection, dropdown visualization, and duplicate highlighting.
 */
export const MockSpreadsheet: React.FC<MockSpreadsheetProps> = ({
  data,
  headers,
  startFrame = 0,
  animate = true,
  selectedCell = null,
  dropdownCell = null,
  dropdownOptions = [],
  highlightedOption = -1,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate fade-in animation
  const appearProgress = animate
    ? spring({
        frame: frame - startFrame,
        fps,
        config: {
          damping: 20,
          stiffness: 100,
        },
      })
    : 1;

  const opacity = interpolate(appearProgress, [0, 1], [0, 1]);

  // Cell dimensions
  const cellWidth = 120;
  const cellHeight = 32;
  const skuCellWidth = 140;

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        opacity,
        backgroundColor: "#ffffff",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-2 py-1 border-b"
        style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
      >
        <button
          className="px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: "transparent",
            color: "hsl(215.4 16.3% 46.9%)",
          }}
        >
          ↶ Undo
        </button>
        <button
          className="px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: "transparent",
            color: "hsl(215.4 16.3% 46.9%)",
          }}
        >
          ↷ Redo
        </button>
        <div
          className="w-px h-4 mx-1"
          style={{ backgroundColor: "hsl(214.3 31.8% 91.4%)" }}
        />
        <button
          className="px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: "transparent",
            color: "hsl(215.4 16.3% 46.9%)",
          }}
        >
          + Add Row
        </button>
        <button
          className="px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: "transparent",
            color: "hsl(215.4 16.3% 46.9%)",
          }}
        >
          + Add Column
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto relative">
        <table
          className="border-collapse"
          style={{ borderColor: "#e2e8f0" }}
        >
          {/* Header Row */}
          <thead>
            <tr>
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="text-left text-sm font-semibold px-2"
                  style={{
                    width: colIndex === 0 ? skuCellWidth : cellWidth,
                    minWidth: colIndex === 0 ? skuCellWidth : cellWidth,
                    height: cellHeight,
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "#e2e8f0",
                    color: "hsl(222.2 84% 4.9%)",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const isSelected =
                    selectedCell &&
                    selectedCell[0] === rowIndex &&
                    selectedCell[1] === colIndex;
                  const showDropdown =
                    dropdownCell &&
                    dropdownCell[0] === rowIndex &&
                    dropdownCell[1] === colIndex;
                  const isSKUColumn = colIndex === 0;

                  // Calculate cell background
                  let backgroundColor = "#ffffff";
                  if (cell.isDuplicate) {
                    backgroundColor = "#fef3c7"; // Amber for duplicates
                  } else if (isSKUColumn) {
                    backgroundColor = "#f1f5f9"; // Gray-blue for read-only
                  }

                  return (
                    <td
                      key={colIndex}
                      className="text-sm px-2 relative"
                      style={{
                        width: colIndex === 0 ? skuCellWidth : cellWidth,
                        minWidth: colIndex === 0 ? skuCellWidth : cellWidth,
                        height: cellHeight,
                        backgroundColor,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: isSKUColumn
                          ? "hsl(215.4 16.3% 46.9%)"
                          : "hsl(222.2 84% 4.9%)",
                        fontFamily: isSKUColumn ? "monospace" : "inherit",
                        boxShadow: isSelected
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {cell.value}

                      {/* Dropdown overlay */}
                      {showDropdown && dropdownOptions.length > 0 && (
                        <DropdownOverlay
                          options={dropdownOptions}
                          highlightedIndex={highlightedOption}
                          startFrame={frame}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface DropdownOverlayProps {
  options: string[];
  highlightedIndex: number;
  startFrame: number;
}

const DropdownOverlay: React.FC<DropdownOverlayProps> = ({
  options,
  highlightedIndex,
}) => {
  return (
    <div
      className="absolute left-0 top-full z-10 min-w-full rounded-md shadow-lg border"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "hsl(214.3 31.8% 91.4%)",
      }}
    >
      {options.map((option, index) => (
        <div
          key={index}
          className="px-3 py-1.5 text-sm cursor-pointer"
          style={{
            backgroundColor:
              index === highlightedIndex
                ? "hsl(222.2 47.4% 11.2% / 0.1)"
                : "transparent",
            color: "hsl(222.2 84% 4.9%)",
          }}
        >
          {option}
        </div>
      ))}
    </div>
  );
};

export default MockSpreadsheet;
