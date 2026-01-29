import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fadeIn, springScale, slideIn } from "../utils/animations.js";

export interface FeatureHighlightProps {
  /** Content to highlight */
  children: React.ReactNode;
  /** Frame when highlight animation starts (default: 0) */
  startFrame?: number;
  /** Style variant: "spotlight", "callout", "pulse", "glow" (default: "spotlight") */
  variant?: "spotlight" | "callout" | "pulse" | "glow";
  /** Highlight color (default: "hsl(var(--primary))") */
  color?: string;
  /** Border radius in pixels (default: 8) */
  borderRadius?: number;
  /** Padding in pixels (default: 16) */
  padding?: number;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Feature highlight component for spotlight and callout effects.
 * Uses useCurrentFrame() for animations, not CSS transitions.
 */
export const FeatureHighlight: React.FC<FeatureHighlightProps> = ({
  children,
  startFrame = 0,
  variant = "spotlight",
  color = "hsl(var(--primary))",
  borderRadius = 8,
  padding = 16,
  className = "",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVisible = frame >= startFrame;
  if (!isVisible) {
    return <div style={{ opacity: 0 }}>{children}</div>;
  }

  const opacity = fadeIn(frame, { startFrame, durationFrames: 15 });

  switch (variant) {
    case "spotlight": {
      // Ring/border highlight that scales in
      const scale = springScale(frame, {
        startFrame,
        fps,
        damping: 15,
        from: 0.9,
        to: 1,
      });

      const ringOpacity = fadeIn(frame, { startFrame, durationFrames: 20 });

      return (
        <div
          className={className}
          style={{
            position: "relative",
            display: "inline-block",
            transform: `scale(${scale})`,
            ...style,
          }}
        >
          {/* Spotlight ring */}
          <div
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: borderRadius + 4,
              border: `3px solid ${color}`,
              opacity: ringOpacity,
              boxShadow: `0 0 20px ${color}40`,
              pointerEvents: "none",
            }}
          />
          {children}
        </div>
      );
    }

    case "callout": {
      // Callout box with slide-in animation
      const { y } = slideIn(frame, {
        startFrame,
        durationFrames: 20,
        direction: "down",
        distance: 20,
      });

      const scale = springScale(frame, {
        startFrame,
        fps,
        damping: 12,
        from: 0.95,
        to: 1,
      });

      return (
        <div
          className={className}
          style={{
            opacity,
            transform: `translateY(${y}px) scale(${scale})`,
            backgroundColor: `${color}15`,
            border: `2px solid ${color}`,
            borderRadius,
            padding,
            boxShadow: `0 4px 12px ${color}20`,
            ...style,
          }}
        >
          {children}
        </div>
      );
    }

    case "pulse": {
      // Pulsing glow effect
      const adjustedFrame = frame - startFrame;
      const pulsePhase = (adjustedFrame % 30) / 30; // 30 frame cycle (1 second at 30fps)
      const pulseScale = 1 + 0.05 * Math.sin(pulsePhase * Math.PI * 2);
      const pulseOpacity = 0.5 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);

      const baseOpacity = fadeIn(frame, { startFrame, durationFrames: 15 });

      return (
        <div
          className={className}
          style={{
            position: "relative",
            display: "inline-block",
            opacity: baseOpacity,
            ...style,
          }}
        >
          {/* Pulsing background */}
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: borderRadius + 8,
              backgroundColor: color,
              opacity: pulseOpacity * 0.2,
              transform: `scale(${pulseScale})`,
              pointerEvents: "none",
            }}
          />
          {children}
        </div>
      );
    }

    case "glow": {
      // Soft glow effect that intensifies
      const glowIntensity = fadeIn(frame, {
        startFrame,
        durationFrames: 30,
      });

      const scale = springScale(frame, {
        startFrame,
        fps,
        damping: 20,
        from: 0.98,
        to: 1,
      });

      return (
        <div
          className={className}
          style={{
            transform: `scale(${scale})`,
            boxShadow: `0 0 ${30 * glowIntensity}px ${color}${Math.round(
              glowIntensity * 60
            )
              .toString(16)
              .padStart(2, "0")}`,
            borderRadius,
            ...style,
          }}
        >
          {children}
        </div>
      );
    }

    default:
      return <div className={className} style={style}>{children}</div>;
  }
};

export interface CalloutArrowProps {
  /** Direction the arrow points (where content is) */
  direction?: "up" | "down" | "left" | "right";
  /** Label text for the callout */
  label: string;
  /** Frame when callout appears (default: 0) */
  startFrame?: number;
  /** Arrow/label color (default: "hsl(var(--primary))") */
  color?: string;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Callout arrow component for pointing to features.
 */
export const CalloutArrow: React.FC<CalloutArrowProps> = ({
  direction = "down",
  label,
  startFrame = 0,
  color = "hsl(var(--primary))",
  className = "",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = fadeIn(frame, { startFrame, durationFrames: 15 });
  const scale = springScale(frame, {
    startFrame,
    fps,
    damping: 12,
    from: 0.8,
    to: 1,
  });

  // Arrow SVG based on direction
  const getArrowPath = () => {
    switch (direction) {
      case "up":
        return "M12 4l-8 8h5v8h6v-8h5z";
      case "down":
        return "M12 20l8-8h-5V4h-6v8H4z";
      case "left":
        return "M4 12l8-8v5h8v6h-8v5z";
      case "right":
        return "M20 12l-8 8v-5H4v-6h8V4z";
      default:
        return "";
    }
  };

  const flexDirection =
    direction === "up" || direction === "down" ? "column" : "row";
  const arrowFirst = direction === "down" || direction === "right";

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: flexDirection as "column" | "row",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {arrowFirst && (
        <svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
          <path d={getArrowPath()} />
        </svg>
      )}
      <span
        style={{
          color,
          fontWeight: 600,
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {!arrowFirst && (
        <svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
          <path d={getArrowPath()} />
        </svg>
      )}
    </div>
  );
};

export default FeatureHighlight;
