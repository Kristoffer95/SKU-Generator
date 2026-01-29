import { interpolate, spring, InterpolateOptions } from "remotion";

/**
 * Animation utility functions for Remotion compositions.
 * All functions use useCurrentFrame() values, not CSS transitions.
 */

export interface FadeInOptions {
  /** Frame when fade starts */
  startFrame?: number;
  /** Duration in frames */
  durationFrames?: number;
  /** Custom interpolate options */
  extrapolate?: InterpolateOptions["extrapolateLeft"];
}

/**
 * Calculate opacity for fade-in animation.
 * @param frame - Current frame from useCurrentFrame()
 * @param options - Animation options
 * @returns Opacity value between 0 and 1
 */
export function fadeIn(frame: number, options: FadeInOptions = {}): number {
  const { startFrame = 0, durationFrames = 20, extrapolate = "clamp" } = options;

  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: extrapolate, extrapolateRight: extrapolate }
  );
}

/**
 * Calculate opacity for fade-out animation.
 * @param frame - Current frame from useCurrentFrame()
 * @param options - Animation options
 * @returns Opacity value between 0 and 1
 */
export function fadeOut(frame: number, options: FadeInOptions = {}): number {
  const { startFrame = 0, durationFrames = 20, extrapolate = "clamp" } = options;

  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [1, 0],
    { extrapolateLeft: extrapolate, extrapolateRight: extrapolate }
  );
}

export type SlideDirection = "left" | "right" | "up" | "down";

export interface SlideInOptions {
  /** Frame when slide starts */
  startFrame?: number;
  /** Duration in frames */
  durationFrames?: number;
  /** Direction to slide from */
  direction?: SlideDirection;
  /** Distance to travel in pixels */
  distance?: number;
  /** Custom interpolate options */
  extrapolate?: InterpolateOptions["extrapolateLeft"];
}

/**
 * Calculate transform offset for slide-in animation.
 * @param frame - Current frame from useCurrentFrame()
 * @param options - Animation options
 * @returns Object with x and y translate values in pixels
 */
export function slideIn(
  frame: number,
  options: SlideInOptions = {}
): { x: number; y: number } {
  const {
    startFrame = 0,
    durationFrames = 20,
    direction = "left",
    distance = 100,
    extrapolate = "clamp",
  } = options;

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: extrapolate, extrapolateRight: extrapolate }
  );

  // Calculate starting offset based on direction
  const offset = distance * (1 - progress);

  switch (direction) {
    case "left":
      return { x: -offset, y: 0 };
    case "right":
      return { x: offset, y: 0 };
    case "up":
      return { x: 0, y: -offset };
    case "down":
      return { x: 0, y: offset };
    default:
      return { x: 0, y: 0 };
  }
}

export interface SpringScaleOptions {
  /** Frame when animation starts */
  startFrame?: number;
  /** Frames per second for spring calculation */
  fps: number;
  /** Spring damping (higher = less bounce, 15 recommended for subtle bounce) */
  damping?: number;
  /** Spring stiffness */
  stiffness?: number;
  /** Spring mass */
  mass?: number;
  /** Starting scale value */
  from?: number;
  /** Ending scale value */
  to?: number;
}

/**
 * Calculate scale value with spring physics.
 * @param frame - Current frame from useCurrentFrame()
 * @param options - Spring animation options (fps required)
 * @returns Scale value
 */
export function springScale(frame: number, options: SpringScaleOptions): number {
  const {
    startFrame = 0,
    fps,
    damping = 15,
    stiffness = 100,
    mass = 1,
    from = 0,
    to = 1,
  } = options;

  const adjustedFrame = Math.max(0, frame - startFrame);

  const springValue = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping,
      stiffness,
      mass,
    },
  });

  // Interpolate between from and to values using spring progress
  return from + (to - from) * springValue;
}

export interface TypewriterOptions {
  /** Frame when typing starts */
  startFrame?: number;
  /** Frames per character */
  framesPerChar?: number;
}

/**
 * Calculate number of visible characters for typewriter effect.
 * @param frame - Current frame from useCurrentFrame()
 * @param textLength - Total number of characters in text
 * @param options - Typewriter options
 * @returns Number of characters to display
 */
export function typewriter(
  frame: number,
  textLength: number,
  options: TypewriterOptions = {}
): number {
  const { startFrame = 0, framesPerChar = 2 } = options;

  const adjustedFrame = Math.max(0, frame - startFrame);
  const totalDuration = textLength * framesPerChar;

  const progress = interpolate(
    adjustedFrame,
    [0, totalDuration],
    [0, textLength],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return Math.floor(progress);
}

/**
 * Calculate typewriter progress as a 0-1 value.
 * @param frame - Current frame from useCurrentFrame()
 * @param textLength - Total number of characters in text
 * @param options - Typewriter options
 * @returns Progress value between 0 and 1
 */
export function typewriterProgress(
  frame: number,
  textLength: number,
  options: TypewriterOptions = {}
): number {
  const { startFrame = 0, framesPerChar = 2 } = options;

  const adjustedFrame = Math.max(0, frame - startFrame);
  const totalDuration = textLength * framesPerChar;

  return interpolate(adjustedFrame, [0, totalDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export interface StaggerOptions {
  /** Index of the item in the list */
  index: number;
  /** Delay between each item in frames */
  staggerDelay?: number;
  /** Base start frame */
  startFrame?: number;
}

/**
 * Calculate staggered start frame for list animations.
 * @param options - Stagger options
 * @returns Adjusted start frame for this item
 */
export function stagger(options: StaggerOptions): number {
  const { index, staggerDelay = 5, startFrame = 0 } = options;
  return startFrame + index * staggerDelay;
}

/**
 * Check if an animation should be visible (started).
 * @param frame - Current frame
 * @param startFrame - When the animation starts
 * @returns Whether the animation has started
 */
export function isVisible(frame: number, startFrame: number): boolean {
  return frame >= startFrame;
}

/**
 * Ease out cubic function for smoother animations.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in out cubic function for smoother animations.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
