import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  fadeIn,
  slideIn,
  SlideDirection,
  springScale,
} from "../utils/animations.js";

export interface AnimatedTextProps {
  /** Text content to display */
  children: React.ReactNode;
  /** Frame when animation starts (default: 0) */
  startFrame?: number;
  /** Duration of fade animation in frames (default: 20) */
  fadeDuration?: number;
  /** Duration of slide animation in frames (default: 20) */
  slideDuration?: number;
  /** Direction to slide from (default: "up") */
  slideDirection?: SlideDirection;
  /** Distance to slide in pixels (default: 50) */
  slideDistance?: number;
  /** Whether to apply fade animation (default: true) */
  fade?: boolean;
  /** Whether to apply slide animation (default: true) */
  slide?: boolean;
  /** Whether to apply spring scale animation (default: false) */
  useSpring?: boolean;
  /** Spring damping for scale animation (default: 15) */
  springDamping?: number;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Animated text component with fade and slide effects.
 * Uses useCurrentFrame() for animations, not CSS transitions.
 */
export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  startFrame = 0,
  fadeDuration = 20,
  slideDuration = 20,
  slideDirection = "up",
  slideDistance = 50,
  fade = true,
  slide = true,
  useSpring = false,
  springDamping = 15,
  className = "",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate opacity
  const opacity = fade
    ? fadeIn(frame, { startFrame, durationFrames: fadeDuration })
    : 1;

  // Calculate slide offset
  const { x, y } = slide
    ? slideIn(frame, {
        startFrame,
        durationFrames: slideDuration,
        direction: slideDirection,
        distance: slideDistance,
      })
    : { x: 0, y: 0 };

  // Calculate scale for spring animation
  const scale = useSpring
    ? springScale(frame, {
        startFrame,
        fps,
        damping: springDamping,
        from: 0.8,
        to: 1,
      })
    : 1;

  const transform = `translate(${x}px, ${y}px) scale(${scale})`;

  return (
    <div
      className={className}
      style={{
        opacity,
        transform,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedText;
