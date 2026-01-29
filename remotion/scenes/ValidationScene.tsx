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
import { fadeIn, slideIn } from "../utils/animations.js";
import { AnimatedText } from "../components/AnimatedText.js";

/**
 * ValidationScene - Demonstrates validation panel and click-to-navigate feature
 * Duration: ~5 seconds (150 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-20: App frame visible, zoom focus on sheet tabs area
 * - Frame 20-40: Tab click animation, switch to Sheet 2
 * - Frame 40-60: Validation panel slides up from bottom
 * - Frame 60-100: Error list items fade in sequentially (3 errors)
 * - Frame 100-130: Cursor moves to first error, click animation
 * - Frame 130-150: Navigate animation - highlight moves from error to cell
 */

// Animation timing constants
const FRAME_START = 0;
const ZOOM_FOCUS_START = 10;
const TAB_CLICK = 20;
const SHEET_SWITCH = 35;
const PANEL_SLIDE_START = 45;
const ERRORS_FADE_START = 65;
const ERROR_CLICK_START = 100;
const NAVIGATE_ANIMATION = 120;

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

// Validation errors for demo
const VALIDATION_ERRORS = [
  { type: "missing-value" as const, message: "Missing value in Size column", row: 2, column: 2 },
  { type: "duplicate-sku" as const, message: "Duplicate SKU: R-S-COT", row: 3, column: 0 },
  { type: "missing-value" as const, message: "Missing value in Material column", row: 4, column: 3 },
];

// Cell dimensions
const CELL_WIDTH = 110;
const CELL_HEIGHT = 32;
const SKU_CELL_WIDTH = 130;

interface SheetTabProps {
  name: string;
  isActive: boolean;
  isClicking: boolean;
  clickProgress: number;
  appearProgress: number;
}

const SheetTab: React.FC<SheetTabProps> = ({
  name,
  isActive,
  isClicking,
  clickProgress,
  appearProgress,
}) => {
  // Scale down when clicking
  const scale = isClicking ? interpolate(clickProgress, [0, 0.3, 1], [1, 0.95, 1]) : 1;

  return (
    <div
      className="px-3 py-1.5 text-xs rounded-t cursor-pointer flex items-center gap-1"
      style={{
        opacity: appearProgress,
        transform: `scale(${scale})`,
        backgroundColor: isActive ? "#ffffff" : "transparent",
        borderWidth: isActive ? 1 : 0,
        borderStyle: "solid",
        borderColor: isActive ? "hsl(214.3 31.8% 91.4%)" : "transparent",
        borderBottomColor: isActive ? "#ffffff" : "transparent",
        fontWeight: isActive ? 500 : 400,
        color: isActive ? "hsl(222.2 84% 4.9%)" : "hsl(215.4 16.3% 46.9%)",
        marginBottom: isActive ? -1 : 0,
      }}
    >
      {name}
      <span
        className="text-xs opacity-50"
        style={{ display: isActive ? "inline" : "none" }}
      >
        ×
      </span>
    </div>
  );
};

interface ValidationErrorItemProps {
  error: {
    type: "duplicate-sku" | "missing-value";
    message: string;
    row: number;
    column?: number;
  };
  index: number;
  isClicking: boolean;
  clickProgress: number;
  appearProgress: number;
  isNavigating: boolean;
  navigateProgress: number;
}

const ValidationErrorItem: React.FC<ValidationErrorItemProps> = ({
  error,
  isClicking,
  clickProgress,
  appearProgress,
  isNavigating,
  navigateProgress,
}) => {
  const isDuplicate = error.type === "duplicate-sku";
  const iconColor = isDuplicate ? "#d97706" : "#dc2626";
  const hoverBg = isDuplicate ? "#fffbeb" : "#fef2f2";

  // Scale effect on click
  const scale = isClicking ? interpolate(clickProgress, [0, 0.2, 1], [1, 0.98, 1]) : 1;

  // Navigate arrow animation
  const arrowTranslate = isNavigating ? interpolate(navigateProgress, [0, 1], [0, 8]) : 0;
  const arrowOpacity = isClicking || isNavigating ? 1 : 0.5;

  return (
    <button
      className="w-full px-4 py-2 flex items-center gap-3 text-left text-sm cursor-pointer border-b"
      style={{
        opacity: appearProgress,
        transform: `translateX(${(1 - appearProgress) * -20}px) scale(${scale})`,
        backgroundColor: isClicking || isNavigating ? hoverBg : "transparent",
        borderColor: "hsl(214.3 31.8% 91.4%)",
      }}
    >
      {/* Error Icon */}
      <span
        className="flex-shrink-0"
        style={{
          color: iconColor,
          fontSize: "16px",
          transform: `scale(${1 + clickProgress * 0.1})`,
        }}
      >
        {isDuplicate ? "⚠" : "✕"}
      </span>

      {/* Error Message */}
      <span
        className="flex-1"
        style={{ color: "hsl(222.2 84% 4.9%)" }}
      >
        {error.message}
      </span>

      {/* Row/Column indicator */}
      <span
        className="text-xs font-mono"
        style={{ color: "hsl(215.4 16.3% 46.9%)" }}
      >
        Row {error.row + 1}
        {error.column !== undefined && `, Col ${error.column + 1}`}
      </span>

      {/* Navigate arrow */}
      <span
        style={{
          color: "hsl(215.4 16.3% 46.9%)",
          opacity: arrowOpacity,
          transform: `translateX(${arrowTranslate}px)`,
        }}
      >
        →
      </span>
    </button>
  );
};

interface SpreadsheetCellProps {
  value: string;
  isHeader?: boolean;
  isSKU?: boolean;
  isDuplicate?: boolean;
  isHighlighted?: boolean;
  highlightProgress?: number;
  width?: number;
}

const SpreadsheetCell: React.FC<SpreadsheetCellProps> = ({
  value,
  isHeader = false,
  isSKU = false,
  isDuplicate = false,
  isHighlighted = false,
  highlightProgress = 0,
  width = CELL_WIDTH,
}) => {
  let backgroundColor = "#ffffff";
  if (isHeader) {
    backgroundColor = "#f8fafc";
  } else if (isDuplicate) {
    backgroundColor = "#fef3c7";
  } else if (isSKU) {
    backgroundColor = "#f1f5f9";
  }

  // Highlight glow effect for navigation
  const glowOpacity = isHighlighted ? highlightProgress * 0.8 : 0;
  const ringWidth = isHighlighted ? interpolate(highlightProgress, [0, 1], [0, 3]) : 0;

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
        boxShadow: isHighlighted
          ? `inset 0 0 0 ${ringWidth}px hsl(222.2 47.4% 11.2%), 0 0 ${glowOpacity * 20}px rgba(59, 130, 246, ${glowOpacity})`
          : "none",
      }}
    >
      {value}
    </td>
  );
};

export const ValidationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame slide-in animation
  const frameSlide = slideIn(frame, {
    startFrame: FRAME_START,
    durationFrames: 15,
    direction: "right",
    distance: 50,
  });
  const frameOpacity = fadeIn(frame, { startFrame: FRAME_START, durationFrames: 15 });

  // Zoom focus effect on sheet tabs area
  const zoomProgress = (() => {
    if (frame < ZOOM_FOCUS_START) return 0;
    if (frame >= PANEL_SLIDE_START) {
      // Zoom out after panel starts sliding
      return spring({
        frame: frame - PANEL_SLIDE_START,
        fps,
        config: { damping: 20, stiffness: 80 },
        from: 1,
        to: 0,
      });
    }
    return spring({
      frame: frame - ZOOM_FOCUS_START,
      fps,
      config: { damping: 20, stiffness: 100 },
    });
  })();

  // Tab click animation
  const isSheet2Clicking = frame >= TAB_CLICK && frame < SHEET_SWITCH;
  const tabClickProgress = isSheet2Clicking
    ? spring({
        frame: frame - TAB_CLICK,
        fps,
        config: { damping: 15, stiffness: 200 },
      })
    : 0;

  // Active sheet state
  const activeSheet = frame >= SHEET_SWITCH ? "sheet2" : "sheet1";

  // Validation panel slide-up
  const panelProgress = (() => {
    if (frame < PANEL_SLIDE_START) return 0;
    return spring({
      frame: frame - PANEL_SLIDE_START,
      fps,
      config: { damping: 20, stiffness: 100 },
    });
  })();

  // Error item appearances (staggered)
  const getErrorProgress = (index: number) => {
    const errorStartFrame = ERRORS_FADE_START + index * 8;
    if (frame < errorStartFrame) return 0;
    return spring({
      frame: frame - errorStartFrame,
      fps,
      config: { damping: 20, stiffness: 150 },
    });
  };

  // Error click state (clicking on first error)
  const isErrorClicking = frame >= ERROR_CLICK_START && frame < NAVIGATE_ANIMATION;
  const errorClickProgress = isErrorClicking
    ? spring({
        frame: frame - ERROR_CLICK_START,
        fps,
        config: { damping: 15, stiffness: 200 },
      })
    : 0;

  // Navigate animation (from error to cell)
  const isNavigating = frame >= NAVIGATE_ANIMATION;
  const navigateProgress = isNavigating
    ? spring({
        frame: frame - NAVIGATE_ANIMATION,
        fps,
        config: { damping: 15, stiffness: 120 },
      })
    : 0;

  // Cell highlight state (for row 2, col 2 - the first error's target)
  const isCellHighlighted = frame >= NAVIGATE_ANIMATION + 5;
  const cellHighlightProgress = isCellHighlighted
    ? spring({
        frame: frame - NAVIGATE_ANIMATION - 5,
        fps,
        config: { damping: 12, stiffness: 150 },
      })
    : 0;

  // Title fade in
  const titleOpacity = fadeIn(frame, { startFrame: 5, durationFrames: 20 });

  // Cursor animation for clicking
  const cursorVisible = (frame >= TAB_CLICK - 5 && frame < SHEET_SWITCH + 5) ||
                        (frame >= ERROR_CLICK_START - 5 && frame < NAVIGATE_ANIMATION + 10);

  const cursorPosition = (() => {
    if (frame >= TAB_CLICK - 5 && frame < SHEET_SWITCH + 5) {
      // Moving to Sheet 2 tab - positioned at bottom of screen near tabs
      return { x: 950, y: 770 };
    }
    if (frame >= ERROR_CLICK_START - 5 && frame < NAVIGATE_ANIMATION + 10) {
      // Moving from error to cell
      const errorY = 835;
      const cellY = 340;
      const cellX = 560;
      const errorX = 420;

      if (frame < NAVIGATE_ANIMATION) {
        // At error position
        return { x: errorX, y: errorY };
      }
      // Animate to cell position
      const moveProgress = navigateProgress;
      return {
        x: interpolate(moveProgress, [0, 1], [errorX, cellX]),
        y: interpolate(moveProgress, [0, 1], [errorY, cellY]),
      };
    }
    return { x: 0, y: 0 };
  })();

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
          startFrame={5}
          fadeDuration={20}
          slideDuration={20}
          slideDirection="down"
          slideDistance={20}
          className="text-3xl font-bold text-white/90"
        >
          Validate & Navigate
        </AnimatedText>
      </div>

      {/* Browser frame with zoom effect */}
      <div
        style={{
          transform: `translateX(${frameSlide.x}px) scale(${1 + zoomProgress * 0.05})`,
          transformOrigin: "center bottom",
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
                  {/* Row 1 - Complete */}
                  <tr>
                    <SpreadsheetCell value="R-S-COT" isSKU width={SKU_CELL_WIDTH} />
                    <SpreadsheetCell value="Red" />
                    <SpreadsheetCell value="Small" />
                    <SpreadsheetCell value="Cotton" />
                  </tr>

                  {/* Row 2 - Missing Size (highlighted on navigate) */}
                  <tr>
                    <SpreadsheetCell value="B--PLY" isSKU width={SKU_CELL_WIDTH} />
                    <SpreadsheetCell value="Blue" />
                    <SpreadsheetCell
                      value=""
                      isHighlighted={isCellHighlighted}
                      highlightProgress={cellHighlightProgress}
                    />
                    <SpreadsheetCell value="Polyester" />
                  </tr>

                  {/* Row 3 - Duplicate SKU */}
                  <tr>
                    <SpreadsheetCell value="R-S-COT" isSKU isDuplicate width={SKU_CELL_WIDTH} />
                    <SpreadsheetCell value="Red" />
                    <SpreadsheetCell value="Small" />
                    <SpreadsheetCell value="Cotton" />
                  </tr>

                  {/* Row 4 - Missing Material */}
                  <tr>
                    <SpreadsheetCell value="G-L-" isSKU width={SKU_CELL_WIDTH} />
                    <SpreadsheetCell value="Green" />
                    <SpreadsheetCell value="Large" />
                    <SpreadsheetCell value="" />
                  </tr>

                  {/* Empty rows */}
                  {[5, 6, 7].map((rowNum) => (
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

            {/* Sheet tabs with zoom highlight */}
            <div
              className="flex items-center gap-1 px-2 py-1.5 border-t relative"
              style={{
                borderColor: "hsl(214.3 31.8% 91.4%)",
                backgroundColor: "#fafafa",
                boxShadow: zoomProgress > 0.3
                  ? `0 0 0 ${zoomProgress * 3}px rgba(59, 130, 246, ${zoomProgress * 0.3})`
                  : "none",
              }}
            >
              <SheetTab
                name="Sheet 1"
                isActive={activeSheet === "sheet1"}
                isClicking={false}
                clickProgress={0}
                appearProgress={1}
              />
              <SheetTab
                name="Sheet 2"
                isActive={activeSheet === "sheet2"}
                isClicking={isSheet2Clicking}
                clickProgress={tabClickProgress}
                appearProgress={1}
              />
              <div
                className="w-6 h-6 flex items-center justify-center text-xs rounded"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                +
              </div>
            </div>

            {/* Validation Panel */}
            {panelProgress > 0 && (
              <div
                className="border-t"
                style={{
                  transform: `translateY(${(1 - panelProgress) * 100}%)`,
                  opacity: panelProgress,
                  backgroundColor: "hsl(210 40% 96.1% / 0.3)",
                  borderColor: "hsl(214.3 31.8% 91.4%)",
                }}
              >
                {/* Panel Header */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-b cursor-pointer"
                  style={{
                    backgroundColor: "hsl(210 40% 96.1% / 0.5)",
                    borderColor: "hsl(214.3 31.8% 91.4%)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "hsl(222.2 84% 4.9%)" }}
                    >
                      Validation Issues
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                      }}
                    >
                      {VALIDATION_ERRORS.length}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "hsl(215.4 16.3% 46.9%)",
                      fontSize: "12px",
                      transform: "rotate(180deg)",
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Error List */}
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: 128 }}
                >
                  {VALIDATION_ERRORS.map((error, index) => (
                    <ValidationErrorItem
                      key={index}
                      error={error}
                      index={index}
                      isClicking={index === 0 && isErrorClicking}
                      clickProgress={index === 0 ? errorClickProgress : 0}
                      appearProgress={getErrorProgress(index)}
                      isNavigating={index === 0 && isNavigating}
                      navigateProgress={index === 0 ? navigateProgress : 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AppFrame>
      </div>

      {/* Animated cursor */}
      {cursorVisible && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
            opacity: fadeIn(frame, {
              startFrame: frame >= ERROR_CLICK_START - 5 ? ERROR_CLICK_START - 5 : TAB_CLICK - 5,
              durationFrames: 5,
            }),
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.76a.5.5 0 0 0-.85.45Z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Feature callouts */}
      {frame >= ZOOM_FOCUS_START + 5 && frame < SHEET_SWITCH + 10 && (
        <div
          className="absolute"
          style={{
            right: 200,
            bottom: 200,
            opacity: fadeIn(frame, { startFrame: ZOOM_FOCUS_START + 5, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Switch between sheets</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {frame >= PANEL_SLIDE_START + 15 && frame < ERROR_CLICK_START && (
        <div
          className="absolute"
          style={{
            left: 280,
            bottom: 250,
            opacity: fadeIn(frame, { startFrame: PANEL_SLIDE_START + 15, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-lg">↑</span>
            <span className="text-sm">See validation issues</span>
          </div>
        </div>
      )}

      {frame >= ERROR_CLICK_START + 5 && frame < NAVIGATE_ANIMATION + 5 && (
        <div
          className="absolute"
          style={{
            right: 300,
            bottom: 180,
            opacity: fadeIn(frame, { startFrame: ERROR_CLICK_START + 5, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Click error to navigate</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {frame >= NAVIGATE_ANIMATION + 10 && (
        <div
          className="absolute"
          style={{
            left: 380,
            top: 280,
            opacity: fadeIn(frame, { startFrame: NAVIGATE_ANIMATION + 10, durationFrames: 10 }),
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
            <span className="text-sm">Jumps to the affected cell!</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default ValidationScene;
