import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AppFrame } from "../components/AppFrame.js";
import { fadeIn, slideIn } from "../utils/animations.js";
import { AnimatedText } from "../components/AnimatedText.js";

/**
 * SettingsScene - Demonstrates settings dialog with delimiter configuration
 * Duration: ~4 seconds (120 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-20: Background app visible, dialog scales in from center with spring
 * - Frame 20-45: Spotlight effect highlights delimiter options
 * - Frame 45-65: Cursor moves to underscore button, button highlights
 * - Frame 65-80: Button click animation, selection changes to underscore
 * - Frame 80-120: SKU cascade update - all SKUs flash and update simultaneously
 */

// Animation timing constants
const DIALOG_APPEAR = 0;
const SPOTLIGHT_START = 20;
const CURSOR_MOVE_START = 45;
const BUTTON_CLICK = 65;
const SKU_UPDATE_START = 80;

// Delimiter options
const DELIMITER_OPTIONS = ["-", "_", ".", "/", "none"];

// Sample SKU data for the cascade update
const SKUS_BEFORE = ["R-S-COT", "B-M-PLY", "G-L-WOL"];
const SKUS_AFTER = ["R_S_COT", "B_M_PLY", "G_L_WOL"];

interface SettingsDialogProps {
  startFrame: number;
  selectedDelimiter: string;
  highlightedIndex: number;
  spotlightActive: boolean;
  clickFrame?: number;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  startFrame,
  selectedDelimiter,
  highlightedIndex,
  spotlightActive,
  clickFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dialog scale-in animation from center
  const scaleProgress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 120,
    },
  });

  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(scaleProgress, [0, 1], [0, 1]);

  // Spotlight animation on delimiter section
  const spotlightOpacity = spotlightActive
    ? fadeIn(frame, { startFrame: SPOTLIGHT_START, durationFrames: 15 })
    : 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-30"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity * 0.5})` }}
    >
      <div
        className="rounded-lg shadow-xl border w-96"
        style={{
          opacity,
          transform: `scale(${scale})`,
          backgroundColor: "#ffffff",
          borderColor: "hsl(214.3 31.8% 91.4%)",
        }}
      >
        {/* Dialog Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "hsl(222.2 84% 4.9%)" }}
          >
            SKU Settings
          </h2>
          <button
            className="text-xl leading-none opacity-50 hover:opacity-100"
            style={{ color: "hsl(215.4 16.3% 46.9%)" }}
          >
            ×
          </button>
        </div>

        {/* Dialog Content */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Delimiter Section with spotlight */}
          <div
            className="flex flex-col gap-2 p-3 -m-3 rounded-lg relative"
            style={{
              backgroundColor: spotlightActive
                ? `rgba(59, 130, 246, ${spotlightOpacity * 0.08})`
                : "transparent",
              boxShadow: spotlightActive
                ? `0 0 0 ${spotlightOpacity * 2}px rgba(59, 130, 246, ${spotlightOpacity * 0.3})`
                : "none",
              transition: "none",
            }}
          >
            <label
              className="text-sm font-medium"
              style={{ color: "hsl(222.2 84% 4.9%)" }}
            >
              Delimiter
            </label>
            <p
              className="text-xs"
              style={{ color: "hsl(215.4 16.3% 46.9%)" }}
            >
              Character used between SKU fragments
            </p>
            <div className="flex gap-2 relative">
              {DELIMITER_OPTIONS.map((option, index) => {
                const isSelected = option === selectedDelimiter;
                const isHighlighted = index === highlightedIndex;

                // Click animation for the highlighted button
                const buttonClickScale = (() => {
                  if (!isHighlighted || clickFrame === undefined) return 1;
                  if (frame < clickFrame) return 1;
                  const clickProgress = spring({
                    frame: frame - clickFrame,
                    fps,
                    config: { damping: 10, stiffness: 400 },
                  });
                  // Scale down then back up
                  if (frame < clickFrame + 5) {
                    return interpolate(frame - clickFrame, [0, 5], [1, 0.9]);
                  }
                  return interpolate(clickProgress, [0, 1], [0.9, 1]);
                })();

                // Glow effect for highlighted button
                const glowOpacity =
                  isHighlighted && frame >= CURSOR_MOVE_START
                    ? fadeIn(frame, { startFrame: CURSOR_MOVE_START, durationFrames: 10 })
                    : 0;

                return (
                  <button
                    key={index}
                    className="px-3 py-1.5 text-sm rounded-md border font-mono min-w-10"
                    style={{
                      transform: `scale(${isHighlighted ? buttonClickScale : 1})`,
                      backgroundColor:
                        isSelected
                          ? "hsl(222.2 47.4% 11.2%)"
                          : isHighlighted
                            ? `rgba(34, 45, 77, ${glowOpacity * 0.1})`
                            : "transparent",
                      borderColor:
                        isSelected
                          ? "hsl(222.2 47.4% 11.2%)"
                          : "hsl(214.3 31.8% 91.4%)",
                      color: isSelected ? "#ffffff" : "hsl(222.2 84% 4.9%)",
                      boxShadow: isHighlighted
                        ? `0 0 0 ${glowOpacity * 3}px rgba(59, 130, 246, ${glowOpacity * 0.4})`
                        : "none",
                    }}
                  >
                    {option === "none" ? "none" : option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prefix Section */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              style={{ color: "hsl(222.2 84% 4.9%)" }}
            >
              Prefix
            </label>
            <p
              className="text-xs"
              style={{ color: "hsl(215.4 16.3% 46.9%)" }}
            >
              Text added before the SKU
            </p>
            <input
              type="text"
              readOnly
              className="px-3 py-1.5 text-sm rounded-md border font-mono"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "hsl(214.3 31.8% 91.4%)",
                color: "hsl(222.2 84% 4.9%)",
              }}
              placeholder="e.g., SKU-"
            />
          </div>

          {/* Suffix Section */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              style={{ color: "hsl(222.2 84% 4.9%)" }}
            >
              Suffix
            </label>
            <p
              className="text-xs"
              style={{ color: "hsl(215.4 16.3% 46.9%)" }}
            >
              Text added after the SKU
            </p>
            <input
              type="text"
              readOnly
              className="px-3 py-1.5 text-sm rounded-md border font-mono"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "hsl(214.3 31.8% 91.4%)",
                color: "hsl(222.2 84% 4.9%)",
              }}
              placeholder="e.g., -2024"
            />
          </div>

          {/* Preview Section */}
          <div
            className="flex flex-col gap-2 p-3 rounded-md"
            style={{ backgroundColor: "hsl(210 40% 96.1%)" }}
          >
            <label
              className="text-xs font-medium"
              style={{ color: "hsl(215.4 16.3% 46.9%)" }}
            >
              Preview
            </label>
            <div
              className="text-sm font-mono"
              style={{ color: "hsl(222.2 84% 4.9%)" }}
            >
              RED{selectedDelimiter === "none" ? "" : selectedDelimiter}SM
              {selectedDelimiter === "none" ? "" : selectedDelimiter}COT
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
        >
          <button
            className="px-4 py-2 text-sm rounded-md border"
            style={{
              backgroundColor: "transparent",
              borderColor: "hsl(214.3 31.8% 91.4%)",
              color: "hsl(222.2 84% 4.9%)",
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm rounded-md"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "#ffffff",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

interface SKUCellProps {
  sku: string;
  isFlashing: boolean;
  flashProgress: number;
}

const SKUCell: React.FC<SKUCellProps> = ({ sku, isFlashing, flashProgress }) => {
  // Flash effect: white flash then settle
  const flashOpacity = isFlashing ? interpolate(flashProgress, [0, 0.3, 1], [0, 1, 0]) : 0;
  const textOpacity = isFlashing ? interpolate(flashProgress, [0, 0.2, 0.5, 1], [1, 0.3, 1, 1]) : 1;

  return (
    <td
      className="text-sm px-2 relative"
      style={{
        width: 130,
        minWidth: 130,
        height: 32,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        color: "hsl(215.4 16.3% 46.9%)",
        fontFamily: "monospace",
        fontSize: "13px",
        overflow: "hidden",
      }}
    >
      {/* Flash overlay */}
      {isFlashing && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#fbbf24",
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      )}
      <span style={{ opacity: textOpacity, position: "relative", zIndex: 1 }}>{sku}</span>
    </td>
  );
};

export const SettingsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade in
  const titleOpacity = fadeIn(frame, { startFrame: 5, durationFrames: 20 });

  // Dialog state
  const selectedDelimiter = frame >= BUTTON_CLICK + 10 ? "_" : "-";

  // Spotlight active during highlight phase
  const spotlightActive = frame >= SPOTLIGHT_START && frame < BUTTON_CLICK + 10;

  // Highlighted delimiter button (underscore = index 1)
  const highlightedIndex = frame >= CURSOR_MOVE_START && frame < SKU_UPDATE_START ? 1 : -1;

  // SKU flash animation
  const skuFlashProgress = (() => {
    if (frame < SKU_UPDATE_START) return 0;
    return spring({
      frame: frame - SKU_UPDATE_START,
      fps,
      config: { damping: 15, stiffness: 80 },
    });
  })();

  const isFlashing = frame >= SKU_UPDATE_START && frame < SKU_UPDATE_START + 30;

  // SKU values based on delimiter change
  const currentSKUs = frame >= SKU_UPDATE_START + 10 ? SKUS_AFTER : SKUS_BEFORE;

  // App frame slide in
  const frameSlide = slideIn(frame, {
    startFrame: 0,
    durationFrames: 15,
    direction: "right",
    distance: 50,
  });
  const frameOpacity = fadeIn(frame, { startFrame: 0, durationFrames: 15 });

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
        className="absolute top-8 left-8 z-10"
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
          Configure SKU Format
        </AnimatedText>
      </div>

      {/* Browser frame with spreadsheet in background */}
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
          {/* Simple spreadsheet preview in background */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: "#ffffff" }}>
            {/* Toolbar placeholder */}
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
            </div>

            {/* Grid with SKUs */}
            <div className="flex-1 p-2 overflow-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-sm px-2 font-semibold text-left"
                      style={{
                        width: 130,
                        minWidth: 130,
                        height: 32,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      SKU
                    </th>
                    <th
                      className="text-sm px-2 font-semibold text-left"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Color
                    </th>
                    <th
                      className="text-sm px-2 font-semibold text-left"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Size
                    </th>
                    <th
                      className="text-sm px-2 font-semibold text-left"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Material
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <SKUCell
                      sku={currentSKUs[0]}
                      isFlashing={isFlashing}
                      flashProgress={skuFlashProgress}
                    />
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Red
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Small
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Cotton
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <SKUCell
                      sku={currentSKUs[1]}
                      isFlashing={isFlashing}
                      flashProgress={skuFlashProgress}
                    />
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Blue
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Medium
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Polyester
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <SKUCell
                      sku={currentSKUs[2]}
                      isFlashing={isFlashing}
                      flashProgress={skuFlashProgress}
                    />
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Green
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Large
                    </td>
                    <td
                      className="text-sm px-2"
                      style={{
                        width: 110,
                        minWidth: 110,
                        height: 32,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#e2e8f0",
                        color: "hsl(222.2 84% 4.9%)",
                      }}
                    >
                      Wool
                    </td>
                  </tr>

                  {/* Empty rows */}
                  {[4, 5, 6].map((rowNum) => (
                    <tr key={rowNum}>
                      <td
                        className="text-sm px-2"
                        style={{
                          width: 130,
                          minWidth: 130,
                          height: 32,
                          backgroundColor: "#f1f5f9",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "#e2e8f0",
                        }}
                      />
                      <td
                        className="text-sm px-2"
                        style={{
                          width: 110,
                          minWidth: 110,
                          height: 32,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "#e2e8f0",
                        }}
                      />
                      <td
                        className="text-sm px-2"
                        style={{
                          width: 110,
                          minWidth: 110,
                          height: 32,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "#e2e8f0",
                        }}
                      />
                      <td
                        className="text-sm px-2"
                        style={{
                          width: 110,
                          minWidth: 110,
                          height: 32,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "#e2e8f0",
                        }}
                      />
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
            </div>
          </div>
        </AppFrame>

        {/* Settings Dialog overlay */}
        <SettingsDialog
          startFrame={DIALOG_APPEAR}
          selectedDelimiter={selectedDelimiter}
          highlightedIndex={highlightedIndex}
          spotlightActive={spotlightActive}
          clickFrame={BUTTON_CLICK}
        />
      </div>

      {/* Feature callouts */}
      {spotlightActive && frame < CURSOR_MOVE_START && (
        <div
          className="absolute"
          style={{
            right: 550,
            top: 300,
            opacity: fadeIn(frame, { startFrame: SPOTLIGHT_START + 5, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Choose your delimiter</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {frame >= CURSOR_MOVE_START && frame < BUTTON_CLICK && (
        <div
          className="absolute"
          style={{
            right: 520,
            top: 340,
            opacity: fadeIn(frame, { startFrame: CURSOR_MOVE_START, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Click to select underscore</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {isFlashing && (
        <div
          className="absolute"
          style={{
            left: 280,
            top: 350,
            opacity: fadeIn(frame, { startFrame: SKU_UPDATE_START + 5, durationFrames: 10 }),
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
            <span className="text-sm">All SKUs update instantly!</span>
          </div>
        </div>
      )}

      {frame >= SKU_UPDATE_START + 30 && (
        <div
          className="absolute"
          style={{
            left: 280,
            bottom: 200,
            opacity: fadeIn(frame, { startFrame: SKU_UPDATE_START + 30, durationFrames: 10 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">R-S-COT → R_S_COT</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default SettingsScene;
