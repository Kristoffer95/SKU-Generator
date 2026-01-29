import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AppFrame } from "../components/AppFrame.js";
import { MockSidebar } from "../components/MockSidebar.js";
import { MockSpecCard, SpecValue } from "../components/MockSpecCard.js";
import { fadeIn, slideIn, typewriter } from "../utils/animations.js";
import { AnimatedText } from "../components/AnimatedText.js";

/**
 * SpreadsheetScene - Demonstrates spreadsheet interaction with dropdowns and SKU generation
 * Duration: ~10 seconds (300 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-30: Browser frame slides in from right
 * - Frame 30-50: First row cell selection (cell ring highlight)
 * - Frame 50-80: Dropdown opens with spring height animation
 * - Frame 80-110: Option highlight moves, then selection
 * - Frame 110-140: Dropdown closes, value appears
 * - Frame 140-170: Second cell selection and dropdown
 * - Frame 170-200: Second selection, SKU starts generating (R-)
 * - Frame 200-230: Third cell, complete first row SKU (R-S-COT)
 * - Frame 230-270: Second row with staggered effect
 * - Frame 270-300: Third row SKU generation, final state
 */

// Spec data for the demo
const colorSpec: SpecValue[] = [
  { displayValue: "Red", skuFragment: "R" },
  { displayValue: "Blue", skuFragment: "B" },
  { displayValue: "Green", skuFragment: "G" },
];

const sizeSpec: SpecValue[] = [
  { displayValue: "Small", skuFragment: "S" },
  { displayValue: "Medium", skuFragment: "M" },
  { displayValue: "Large", skuFragment: "L" },
];

const materialSpec: SpecValue[] = [
  { displayValue: "Cotton", skuFragment: "COT" },
  { displayValue: "Polyester", skuFragment: "PLY" },
  { displayValue: "Wool", skuFragment: "WOL" },
];

// Animation timing constants
const FRAME_START = 0;
const CELL_SELECT_1 = 30;
const DROPDOWN_OPEN_1 = 50;
const OPTION_HIGHLIGHT_1 = 70;
const OPTION_SELECT_1 = 90;
const DROPDOWN_CLOSE_1 = 110;
const CELL_SELECT_2 = 130;
const DROPDOWN_OPEN_2 = 145;
const OPTION_SELECT_2 = 165;
const DROPDOWN_CLOSE_2 = 180;
const CELL_SELECT_3 = 195;
const DROPDOWN_OPEN_3 = 205;
const OPTION_SELECT_3 = 220;
const SKU_GENERATE_1 = 230;
const ROW_2_START = 245;
const ROW_3_START = 270;
const FINAL_STATE = 290;

// Cell dimensions
const CELL_WIDTH = 110;
const CELL_HEIGHT = 32;
const SKU_CELL_WIDTH = 130;

interface SpreadsheetCellProps {
  value: string;
  isHeader?: boolean;
  isSKU?: boolean;
  isDuplicate?: boolean;
  isSelected?: boolean;
  width?: number;
  style?: React.CSSProperties;
}

const SpreadsheetCell: React.FC<SpreadsheetCellProps> = ({
  value,
  isHeader = false,
  isSKU = false,
  isDuplicate = false,
  isSelected = false,
  width = CELL_WIDTH,
  style = {},
}) => {
  let backgroundColor = "#ffffff";
  if (isHeader) {
    backgroundColor = "#f8fafc";
  } else if (isDuplicate) {
    backgroundColor = "#fef3c7";
  } else if (isSKU) {
    backgroundColor = "#f1f5f9";
  }

  return (
    <td
      className={`text-sm px-2 relative ${isHeader ? "font-semibold" : ""}`}
      style={{
        width,
        minWidth: width,
        height: CELL_HEIGHT,
        backgroundColor,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        color: isSKU && !isHeader ? "hsl(215.4 16.3% 46.9%)" : "hsl(222.2 84% 4.9%)",
        fontFamily: isSKU && !isHeader ? "monospace" : "inherit",
        fontSize: isSKU && !isHeader ? "13px" : "14px",
        boxShadow: isSelected ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)" : "none",
        ...style,
      }}
    >
      {value}
    </td>
  );
};

interface AnimatedDropdownProps {
  options: string[];
  isOpen: boolean;
  highlightedIndex: number;
  selectedIndex: number;
  openProgress: number;
}

const AnimatedDropdown: React.FC<AnimatedDropdownProps> = ({
  options,
  isOpen,
  highlightedIndex,
  openProgress,
}) => {
  if (!isOpen && openProgress <= 0) return null;

  const height = interpolate(openProgress, [0, 1], [0, options.length * 32 + 8]);
  const opacity = interpolate(openProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      className="absolute left-0 top-full z-20 min-w-full rounded-md shadow-lg border overflow-hidden"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "hsl(214.3 31.8% 91.4%)",
        height,
        opacity,
      }}
    >
      {options.map((option, index) => (
        <div
          key={index}
          className="px-3 py-1.5 text-sm"
          style={{
            backgroundColor:
              index === highlightedIndex
                ? "hsl(222.2 47.4% 11.2% / 0.1)"
                : "transparent",
            color: "hsl(222.2 84% 4.9%)",
            height: 32,
          }}
        >
          {option}
        </div>
      ))}
    </div>
  );
};

interface TypewriterSKUProps {
  sku: string;
  startFrame: number;
  framesPerChar?: number;
}

const TypewriterSKU: React.FC<TypewriterSKUProps> = ({
  sku,
  startFrame,
  framesPerChar = 3,
}) => {
  const frame = useCurrentFrame();
  const visibleChars = typewriter(frame, sku.length, { startFrame, framesPerChar });
  const visibleText = sku.slice(0, visibleChars);
  const isComplete = visibleChars >= sku.length;

  // Cursor blinks after typing
  const typingCompleteFrame = startFrame + sku.length * framesPerChar;
  const cursorVisible = frame >= startFrame && frame < typingCompleteFrame + 20;
  const cursorBlink = frame >= typingCompleteFrame
    ? Math.floor((frame - typingCompleteFrame) / 8) % 2 === 0
    : true;

  return (
    <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
      {visibleText}
      {cursorVisible && !isComplete && (
        <span style={{ opacity: cursorBlink ? 1 : 0, color: "hsl(222.2 47.4% 11.2%)" }}>|</span>
      )}
    </span>
  );
};

export const SpreadsheetScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame slide-in animation
  const frameSlide = slideIn(frame, {
    startFrame: FRAME_START,
    durationFrames: 25,
    direction: "right",
    distance: 100,
  });
  const frameOpacity = fadeIn(frame, { startFrame: FRAME_START, durationFrames: 20 });

  // Cell selections
  const selectedCell = (() => {
    if (frame >= CELL_SELECT_1 && frame < CELL_SELECT_2) return { row: 1, col: 1 };
    if (frame >= CELL_SELECT_2 && frame < CELL_SELECT_3) return { row: 1, col: 2 };
    if (frame >= CELL_SELECT_3 && frame < ROW_2_START) return { row: 1, col: 3 };
    if (frame >= ROW_2_START && frame < ROW_2_START + 30) return { row: 2, col: 1 };
    if (frame >= ROW_3_START && frame < ROW_3_START + 20) return { row: 3, col: 1 };
    return null;
  })();

  // Dropdown states
  const dropdown1Progress = (() => {
    if (frame < DROPDOWN_OPEN_1) return 0;
    if (frame >= DROPDOWN_CLOSE_1) return 0;
    const openProgress = spring({
      frame: frame - DROPDOWN_OPEN_1,
      fps,
      config: { damping: 20, stiffness: 120 },
    });
    if (frame >= OPTION_SELECT_1) {
      const closeProgress = spring({
        frame: frame - OPTION_SELECT_1,
        fps,
        config: { damping: 25, stiffness: 150 },
      });
      return openProgress * (1 - closeProgress);
    }
    return openProgress;
  })();

  const dropdown2Progress = (() => {
    if (frame < DROPDOWN_OPEN_2) return 0;
    if (frame >= DROPDOWN_CLOSE_2) return 0;
    const openProgress = spring({
      frame: frame - DROPDOWN_OPEN_2,
      fps,
      config: { damping: 20, stiffness: 120 },
    });
    if (frame >= OPTION_SELECT_2) {
      const closeProgress = spring({
        frame: frame - OPTION_SELECT_2,
        fps,
        config: { damping: 25, stiffness: 150 },
      });
      return openProgress * (1 - closeProgress);
    }
    return openProgress;
  })();

  const dropdown3Progress = (() => {
    if (frame < DROPDOWN_OPEN_3) return 0;
    if (frame >= OPTION_SELECT_3 + 15) return 0;
    const openProgress = spring({
      frame: frame - DROPDOWN_OPEN_3,
      fps,
      config: { damping: 20, stiffness: 120 },
    });
    if (frame >= OPTION_SELECT_3) {
      const closeProgress = spring({
        frame: frame - OPTION_SELECT_3,
        fps,
        config: { damping: 25, stiffness: 150 },
      });
      return openProgress * (1 - closeProgress);
    }
    return openProgress;
  })();

  // Highlighted option indices
  const highlighted1 = frame >= OPTION_HIGHLIGHT_1 && frame < OPTION_SELECT_1 ? 0 : -1;
  const highlighted2 = frame >= OPTION_SELECT_2 - 10 && frame < OPTION_SELECT_2 ? 0 : -1;
  const highlighted3 = frame >= OPTION_SELECT_3 - 10 && frame < OPTION_SELECT_3 ? 0 : -1;

  // Cell values (updated as selections happen)
  const row1Values = {
    color: frame >= OPTION_SELECT_1 ? "Red" : "",
    size: frame >= OPTION_SELECT_2 ? "Small" : "",
    material: frame >= OPTION_SELECT_3 ? "Cotton" : "",
  };

  const row2Values = {
    color: frame >= ROW_2_START + 25 ? "Blue" : "",
    size: frame >= ROW_2_START + 35 ? "Medium" : "",
    material: frame >= ROW_2_START + 45 ? "Polyester" : "",
  };

  const row3Values = {
    color: frame >= ROW_3_START + 15 ? "Green" : "",
    size: frame >= ROW_3_START + 22 ? "Large" : "",
    material: frame >= ROW_3_START + 28 ? "Wool" : "",
  };

  // SKU generation timing
  const sku1Start = SKU_GENERATE_1;
  const sku2Start = ROW_2_START + 50;
  const sku3Start = FINAL_STATE - 5;

  // Title fade in
  const titleOpacity = fadeIn(frame, { startFrame: 10, durationFrames: 25 });

  return (
    <AbsoluteFill
      className="flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, hsl(222.2 84% 4.9%) 0%, hsl(217.2 32.6% 17.5%) 50%, hsl(222.2 84% 4.9%) 100%)",
      }}
    >
      {/* Scene title overlay */}
      <div
        className="absolute top-8 left-8 z-20"
        style={{ opacity: titleOpacity }}
      >
        <AnimatedText
          startFrame={10}
          fadeDuration={25}
          slideDuration={25}
          slideDirection="down"
          slideDistance={20}
          className="text-3xl font-bold text-white/90"
        >
          Edit Spreadsheet Data
        </AnimatedText>
      </div>

      {/* Browser frame */}
      <div
        style={{
          transform: `translateX(${frameSlide.x}px)`,
          opacity: frameOpacity,
        }}
      >
        <AppFrame
          title="SKU Generator"
          width={1600}
          height={850}
          startFrame={0}
          animate={false}
        >
          {/* Sidebar with collapsed specs */}
          <MockSidebar startFrame={0} animate={false} width={240}>
            <div className="flex flex-col gap-2">
              <MockSpecCard
                name="Color"
                values={colorSpec}
                startFrame={0}
                expanded={false}
                animate={false}
              />
              <MockSpecCard
                name="Size"
                values={sizeSpec}
                startFrame={0}
                expanded={false}
                animate={false}
              />
              <MockSpecCard
                name="Material"
                values={materialSpec}
                startFrame={0}
                expanded={false}
                animate={false}
              />
            </div>
          </MockSidebar>

          {/* Spreadsheet area */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: "#ffffff" }}>
            {/* Toolbar */}
            <div
              className="flex items-center gap-2 px-3 py-2 border-b"
              style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
            >
              <button
                className="px-2 py-1 text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                ↶ Undo
              </button>
              <button
                className="px-2 py-1 text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                ↷ Redo
              </button>
              <div className="w-px h-4 mx-1" style={{ backgroundColor: "hsl(214.3 31.8% 91.4%)" }} />
              <button
                className="px-2 py-1 text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                + Add Row
              </button>
              <button
                className="px-2 py-1 text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                + Add Column
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 p-2 overflow-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <SpreadsheetCell value="SKU" isHeader isSKU width={SKU_CELL_WIDTH} />
                    <SpreadsheetCell value="Color" isHeader />
                    <SpreadsheetCell value="Size" isHeader />
                    <SpreadsheetCell value="Material" isHeader />
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: SKU_CELL_WIDTH,
                        minWidth: SKU_CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#f1f5f9",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(215.4 16.3% 46.9%)",
                      }}
                    >
                      {frame >= sku1Start ? (
                        <TypewriterSKU sku="R-S-COT" startFrame={sku1Start} />
                      ) : null}
                    </td>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                        boxShadow: selectedCell?.row === 1 && selectedCell?.col === 1
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {row1Values.color}
                      <AnimatedDropdown
                        options={colorSpec.map(v => v.displayValue)}
                        isOpen={dropdown1Progress > 0}
                        highlightedIndex={highlighted1}
                        selectedIndex={-1}
                        openProgress={dropdown1Progress}
                      />
                    </td>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                        boxShadow: selectedCell?.row === 1 && selectedCell?.col === 2
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {row1Values.size}
                      <AnimatedDropdown
                        options={sizeSpec.map(v => v.displayValue)}
                        isOpen={dropdown2Progress > 0}
                        highlightedIndex={highlighted2}
                        selectedIndex={-1}
                        openProgress={dropdown2Progress}
                      />
                    </td>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                        boxShadow: selectedCell?.row === 1 && selectedCell?.col === 3
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {row1Values.material}
                      <AnimatedDropdown
                        options={materialSpec.map(v => v.displayValue)}
                        isOpen={dropdown3Progress > 0}
                        highlightedIndex={highlighted3}
                        selectedIndex={-1}
                        openProgress={dropdown3Progress}
                      />
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: SKU_CELL_WIDTH,
                        minWidth: SKU_CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#f1f5f9",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(215.4 16.3% 46.9%)",
                      }}
                    >
                      {frame >= sku2Start ? (
                        <TypewriterSKU sku="B-M-PLY" startFrame={sku2Start} />
                      ) : null}
                    </td>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                        boxShadow: selectedCell?.row === 2 && selectedCell?.col === 1
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {row2Values.color}
                    </td>
                    <SpreadsheetCell value={row2Values.size} />
                    <SpreadsheetCell value={row2Values.material} />
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: SKU_CELL_WIDTH,
                        minWidth: SKU_CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#f1f5f9",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(215.4 16.3% 46.9%)",
                      }}
                    >
                      {frame >= sku3Start ? (
                        <TypewriterSKU sku="G-L-WOL" startFrame={sku3Start} />
                      ) : null}
                    </td>
                    <td
                      className="text-sm px-2 relative"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                        boxShadow: selectedCell?.row === 3 && selectedCell?.col === 1
                          ? "inset 0 0 0 2px hsl(222.2 47.4% 11.2%)"
                          : "none",
                      }}
                    >
                      {row3Values.color}
                    </td>
                    <SpreadsheetCell value={row3Values.size} />
                    <SpreadsheetCell value={row3Values.material} />
                  </tr>

                  {/* Empty rows for visual padding */}
                  {[4, 5, 6, 7, 8].map((rowNum) => (
                    <tr key={rowNum}>
                      <SpreadsheetCell value="" isSKU width={SKU_CELL_WIDTH} />
                      <SpreadsheetCell value="" />
                      <SpreadsheetCell value="" />
                      <SpreadsheetCell value="" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sheet tabs */}
            <div
              className="flex items-center gap-1 px-2 py-1.5 border-t"
              style={{ borderColor: "hsl(214.3 31.8% 91.4%)", backgroundColor: "#fafafa" }}
            >
              <div
                className="px-3 py-1 text-xs rounded-t border border-b-0"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "hsl(214.3 31.8% 91.4%)",
                  color: "hsl(222.2 84% 4.9%)",
                }}
              >
                Sheet 1
              </div>
              <div
                className="px-3 py-1 text-xs rounded"
                style={{
                  backgroundColor: "transparent",
                  color: "hsl(215.4 16.3% 46.9%)",
                }}
              >
                Sheet 2
              </div>
              <div
                className="w-6 h-6 flex items-center justify-center text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                +
              </div>
            </div>
          </div>
        </AppFrame>
      </div>

      {/* Feature callouts */}
      {frame >= DROPDOWN_OPEN_1 + 10 && frame < OPTION_SELECT_1 && (
        <div
          className="absolute"
          style={{
            right: 200,
            top: 280,
            opacity: fadeIn(frame, { startFrame: DROPDOWN_OPEN_1 + 10, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-lg">←</span>
            <span className="text-sm">Select from dropdown</span>
          </div>
        </div>
      )}

      {frame >= SKU_GENERATE_1 && frame < SKU_GENERATE_1 + 40 && (
        <div
          className="absolute"
          style={{
            left: 280,
            top: 320,
            opacity: fadeIn(frame, { startFrame: SKU_GENERATE_1, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">SKU auto-generates!</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {frame >= FINAL_STATE && (
        <div
          className="absolute"
          style={{
            left: 280,
            bottom: 150,
            opacity: fadeIn(frame, { startFrame: FINAL_STATE, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(142.1 76.2% 36.3%)",
              color: "white",
            }}
          >
            <span className="text-lg">✓</span>
            <span className="text-sm">Multiple rows with unique SKUs</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default SpreadsheetScene;
