import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export type ValidationErrorType = "duplicate-sku" | "missing-value";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  row: number;
  column?: number;
}

export interface MockValidationPanelProps {
  /** Array of validation errors */
  errors: ValidationError[];
  /** Frame when panel appears (default: 0) */
  startFrame?: number;
  /** Whether to animate appearance (default: true) */
  animate?: boolean;
  /** Whether the panel is expanded (default: true) */
  expanded?: boolean;
  /** Error that is being "clicked" for navigation (for animation) */
  clickingErrorIndex?: number | null;
  /** Frame when click animation starts */
  clickFrame?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Validation panel mockup matching the SKU Generator app's ValidationPanel styling.
 * Shows error list with type-based icons and click-to-navigate animation.
 */
export const MockValidationPanel: React.FC<MockValidationPanelProps> = ({
  errors,
  startFrame = 0,
  animate = true,
  expanded = true,
  clickingErrorIndex = null,
  clickFrame = 0,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate slide-up animation
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

  const translateY = interpolate(appearProgress, [0, 1], [100, 0]);
  const opacity = interpolate(appearProgress, [0, 1], [0, 1]);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className={`border-t ${className}`}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
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
              backgroundColor:
                errors.some((e) => e.type === "missing-value")
                  ? "#fee2e2"
                  : "#fef3c7",
              color: errors.some((e) => e.type === "missing-value")
                ? "#dc2626"
                : "#d97706",
            }}
          >
            {errors.length}
          </span>
        </div>
        <div
          style={{
            transform: `rotate(${expanded ? 180 : 0}deg)`,
            color: "hsl(215.4 16.3% 46.9%)",
            fontSize: "12px",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </div>
      </div>

      {/* Error List */}
      {expanded && (
        <div
          className="overflow-y-auto divide-y"
          style={{
            maxHeight: 128,
            borderColor: "hsl(214.3 31.8% 91.4%)",
          }}
        >
          {errors.map((error, index) => {
            const isClicking =
              index === clickingErrorIndex && frame >= clickFrame;

            // Click animation
            const clickProgress =
              isClicking && clickFrame
                ? spring({
                    frame: frame - clickFrame,
                    fps,
                    config: {
                      damping: 15,
                      stiffness: 200,
                    },
                  })
                : 0;

            // Stagger error appearance
            const errorDelay = index * 5;
            const errorProgress = animate
              ? spring({
                  frame: frame - startFrame - 10 - errorDelay,
                  fps,
                  config: {
                    damping: 20,
                    stiffness: 150,
                  },
                })
              : 1;

            const isDuplicate = error.type === "duplicate-sku";
            const iconColor = isDuplicate ? "#d97706" : "#dc2626";
            const hoverBg = isDuplicate ? "#fffbeb" : "#fef2f2";

            return (
              <button
                key={index}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-sm cursor-pointer"
                style={{
                  opacity: errorProgress,
                  transform: `translateX(${(1 - errorProgress) * -20}px)`,
                  backgroundColor: isClicking ? hoverBg : "transparent",
                  borderColor: "hsl(214.3 31.8% 91.4%)",
                }}
              >
                {/* Error Icon */}
                <span
                  className="flex-shrink-0"
                  style={{
                    color: iconColor,
                    fontSize: "16px",
                    transform: `scale(${1 + clickProgress * 0.2})`,
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
                    opacity: isClicking ? 1 : 0.5,
                    transform: `translateX(${clickProgress * 5}px)`,
                  }}
                >
                  →
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MockValidationPanel;
