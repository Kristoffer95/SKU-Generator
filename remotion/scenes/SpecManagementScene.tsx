import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { MockSidebar } from "../components/MockSidebar.js";
import { MockSpecCard, SpecValue } from "../components/MockSpecCard.js";
import { stagger, fadeIn } from "../utils/animations.js";
import { AnimatedText } from "../components/AnimatedText.js";

/**
 * SpecManagementScene - Demonstrates specification management in the sidebar
 * Duration: ~7 seconds (210 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-30: Sidebar slides in from left with spring animation
 * - Frame 30-90: Spec cards appear with staggered fade-in (Color, Size, Material)
 * - Frame 90-130: Material card expands to show values
 * - Frame 130-200: Drag-to-reorder simulation (Material moves up, others shift)
 * - Frame 200-210: Final settled state
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
const SIDEBAR_START = 0;
const CARDS_START = 30;
const CARD_STAGGER = 15; // frames between each card
const EXPAND_START = 90;
const DRAG_START = 130;
const DRAG_DURATION = 50;
const SETTLE_START = 180;

export const SpecManagementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate card start frames with stagger
  const colorCardStart = stagger({ index: 0, staggerDelay: CARD_STAGGER, startFrame: CARDS_START });
  const sizeCardStart = stagger({ index: 1, staggerDelay: CARD_STAGGER, startFrame: CARDS_START });
  const materialCardStart = stagger({ index: 2, staggerDelay: CARD_STAGGER, startFrame: CARDS_START });

  // Drag animation: Material card (index 2) moves to top (index 0)
  // Calculate positions for drag animation
  const isDragging = frame >= DRAG_START && frame < SETTLE_START;
  const dragProgress =
    frame >= DRAG_START
      ? spring({
          frame: frame - DRAG_START,
          fps,
          config: {
            damping: 20,
            stiffness: 80,
          },
        })
      : 0;

  // After settle, cards are in new order: Material, Color, Size
  const isSettled = frame >= SETTLE_START;

  // Calculate Y offsets for drag animation
  // Card height ~48px + gap 8px = 56px per card position
  const CARD_HEIGHT = 56;

  // During drag, Material moves up 2 positions (index 2 to 0)
  // Color and Size move down 1 position each
  const materialDragOffset = interpolate(dragProgress, [0, 1], [0, -2 * CARD_HEIGHT]);
  const colorDragOffset = interpolate(dragProgress, [0, 1], [0, CARD_HEIGHT]);
  const sizeDragOffset = interpolate(dragProgress, [0, 1], [0, CARD_HEIGHT]);

  // Ghost card opacity during drag
  const ghostOpacity = isDragging
    ? interpolate(
        frame - DRAG_START,
        [0, 10, DRAG_DURATION - 10, DRAG_DURATION],
        [0, 0.4, 0.4, 0],
        { extrapolateRight: "clamp" }
      )
    : 0;

  // Title fade in
  const titleOpacity = fadeIn(frame, { startFrame: 10, durationFrames: 25 });

  // Helper to get card order based on animation phase
  const renderCards = () => {
    if (isSettled) {
      // After reorder: Material, Color, Size
      return (
        <>
          <MockSpecCard
            name="Material"
            values={materialSpec}
            startFrame={materialCardStart}
            expanded={true}
            expandFrame={EXPAND_START}
            animate={true}
          />
          <MockSpecCard
            name="Color"
            values={colorSpec}
            startFrame={colorCardStart}
            expanded={false}
            animate={true}
          />
          <MockSpecCard
            name="Size"
            values={sizeSpec}
            startFrame={sizeCardStart}
            expanded={false}
            animate={true}
          />
        </>
      );
    }

    // During animation: Original order with transforms
    return (
      <>
        {/* Color card - shifts down during drag */}
        <div
          style={{
            transform: `translateY(${isDragging || isSettled ? colorDragOffset : 0}px)`,
            transition: isSettled ? "transform 0.3s ease" : "none",
          }}
        >
          <MockSpecCard
            name="Color"
            values={colorSpec}
            startFrame={colorCardStart}
            expanded={false}
            animate={true}
          />
        </div>

        {/* Size card - shifts down during drag */}
        <div
          style={{
            transform: `translateY(${isDragging || isSettled ? sizeDragOffset : 0}px)`,
            transition: isSettled ? "transform 0.3s ease" : "none",
          }}
        >
          <MockSpecCard
            name="Size"
            values={sizeSpec}
            startFrame={sizeCardStart}
            expanded={false}
            animate={true}
          />
        </div>

        {/* Material card - dragging card, moves up */}
        <div
          style={{
            transform: `translateY(${materialDragOffset}px)`,
            zIndex: isDragging ? 10 : 1,
            position: "relative",
          }}
        >
          <MockSpecCard
            name="Material"
            values={materialSpec}
            startFrame={materialCardStart}
            expanded={frame >= EXPAND_START}
            expandFrame={EXPAND_START}
            animate={true}
            isDragging={isDragging}
          />
        </div>

        {/* Ghost card showing original position during drag */}
        {ghostOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 8, // positioned where Material was
              left: 8,
              right: 8,
              opacity: ghostOpacity,
            }}
          >
            <div
              className="rounded-md border border-dashed p-2"
              style={{
                borderColor: "hsl(214.3 31.8% 91.4%)",
                backgroundColor: "hsl(210 40% 98%)",
                height: 48,
              }}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <AbsoluteFill
      className="flex flex-row"
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
          Manage Specifications
        </AnimatedText>
      </div>

      {/* Browser frame container */}
      <div
        className="flex-1 flex m-16 mt-24 rounded-lg overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "hsl(0 0% 100%)",
          border: "1px solid hsl(220 13% 91%)",
        }}
      >
        {/* Sidebar with spec cards */}
        <MockSidebar startFrame={SIDEBAR_START} animate={true} width={280}>
          <div className="relative flex flex-col gap-2" style={{ minHeight: 200 }}>
            {renderCards()}
          </div>
        </MockSidebar>

        {/* Main content area (placeholder) */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{ backgroundColor: "hsl(0 0% 98%)" }}
        >
          <div className="text-center">
            <div
              className="text-6xl mb-4"
              style={{ opacity: 0.2 }}
            >
              📊
            </div>
            <div
              className="text-lg font-medium"
              style={{ color: "hsl(215.4 16.3% 46.9%)", opacity: 0.6 }}
            >
              Spreadsheet Area
            </div>
          </div>
        </div>
      </div>

      {/* Feature highlight callouts */}
      {frame >= CARDS_START + 20 && frame < EXPAND_START && (
        <div
          className="absolute"
          style={{
            left: 320,
            top: 200,
            opacity: fadeIn(frame, { startFrame: CARDS_START + 20, durationFrames: 15 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Click to expand and see values</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {frame >= EXPAND_START + 20 && frame < DRAG_START && (
        <div
          className="absolute"
          style={{
            left: 320,
            top: 280,
            opacity: fadeIn(frame, { startFrame: EXPAND_START + 20, durationFrames: 15 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">SKU fragments shown inline</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {isDragging && (
        <div
          className="absolute"
          style={{
            left: 320,
            top: 180,
            opacity: fadeIn(frame, { startFrame: DRAG_START, durationFrames: 15 }),
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              backgroundColor: "hsl(222.2 47.4% 11.2%)",
              color: "white",
            }}
          >
            <span className="text-sm">Drag to reorder specifications</span>
            <span className="text-lg">↕</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default SpecManagementScene;
