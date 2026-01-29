import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { IntroScene } from "../scenes/IntroScene.js";
import { SpecManagementScene } from "../scenes/SpecManagementScene.js";
import { SpreadsheetScene } from "../scenes/SpreadsheetScene.js";
import { SettingsScene } from "../scenes/SettingsScene.js";
import { ValidationScene } from "../scenes/ValidationScene.js";
import { OutroScene } from "../scenes/OutroScene.js";

/**
 * SKUDemo - Main composition assembling all scenes
 * Total duration: ~35 seconds (1050 frames at 30fps)
 *
 * Scene durations (adjusted for total ~1050 frames with transition overlaps):
 * - IntroScene: 140 frames (~4.7s)
 * - SpecManagementScene: 230 frames (~7.7s)
 * - SpreadsheetScene: 320 frames (~10.7s)
 * - SettingsScene: 140 frames (~4.7s)
 * - ValidationScene: 170 frames (~5.7s)
 * - OutroScene: 95 frames (~3.2s)
 *
 * Transitions (5 total × 20 frames each = 100 frames overlap):
 * - Intro → SpecManagement: fade (20 frames)
 * - SpecManagement → Spreadsheet: slide from right (20 frames)
 * - Spreadsheet → Settings: fade (20 frames)
 * - Settings → Validation: slide from bottom (20 frames)
 * - Validation → Outro: fade (20 frames)
 *
 * Total: 140 + 230 + 320 + 140 + 170 + 95 - (5 × 20) = 1095 - 100 = 995 frames
 * Adjusting to hit ~1050: add 55 frames distributed across scenes
 *
 * Final durations:
 * - IntroScene: 150 frames (5s)
 * - SpecManagementScene: 240 frames (8s)
 * - SpreadsheetScene: 330 frames (11s)
 * - SettingsScene: 150 frames (5s)
 * - ValidationScene: 180 frames (6s)
 * - OutroScene: 100 frames (3.3s)
 *
 * Total: 150 + 240 + 330 + 150 + 180 + 100 - 100 = 1150 - 100 = 1050 frames ✓
 */

// Scene durations in frames
const SCENE_DURATIONS = {
  intro: 150,
  specManagement: 240,
  spreadsheet: 330,
  settings: 150,
  validation: 180,
  outro: 100,
} as const;

// Transition duration in frames
const TRANSITION_DURATION = 20;

export const SKUDemo: React.FC = () => {
  const fadeTransition = fade();
  const slideFromRight = slide({ direction: "from-right" });
  const slideFromBottom = slide({ direction: "from-bottom" });
  const transitionTiming = linearTiming({ durationInFrames: TRANSITION_DURATION });

  return (
    <AbsoluteFill className="bg-background">
      <TransitionSeries>
        {/* Scene 1: Intro - Logo, title, tagline */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
          <IntroScene />
        </TransitionSeries.Sequence>

        {/* Transition 1: Fade to spec management */}
        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={transitionTiming}
        />

        {/* Scene 2: Spec Management - Sidebar, cards, drag-reorder */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.specManagement}>
          <SpecManagementScene />
        </TransitionSeries.Sequence>

        {/* Transition 2: Slide from right to spreadsheet */}
        <TransitionSeries.Transition
          presentation={slideFromRight}
          timing={transitionTiming}
        />

        {/* Scene 3: Spreadsheet - Dropdowns, SKU generation, multiple rows */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.spreadsheet}>
          <SpreadsheetScene />
        </TransitionSeries.Sequence>

        {/* Transition 3: Fade to settings */}
        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={transitionTiming}
        />

        {/* Scene 4: Settings - Delimiter configuration, SKU cascade update */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.settings}>
          <SettingsScene />
        </TransitionSeries.Sequence>

        {/* Transition 4: Slide from bottom to validation */}
        <TransitionSeries.Transition
          presentation={slideFromBottom}
          timing={transitionTiming}
        />

        {/* Scene 5: Validation - Sheet tabs, error panel, click-to-navigate */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.validation}>
          <ValidationScene />
        </TransitionSeries.Sequence>

        {/* Transition 5: Fade to outro */}
        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={transitionTiming}
        />

        {/* Scene 6: Outro - Features, CTA, logo */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/**
 * Calculate total duration for reference:
 * Sum of all scene durations minus overlap from transitions
 *
 * Total = 150 + 240 + 330 + 150 + 180 + 100 - (5 × 20)
 *       = 1150 - 100
 *       = 1050 frames
 *       = 35 seconds at 30fps
 */
export const SKU_DEMO_DURATION = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - (5 * TRANSITION_DURATION);
