import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface SpecValue {
  displayValue: string;
  skuFragment: string;
}

export interface MockSpecCardProps {
  /** Name of the specification */
  name: string;
  /** Array of spec values */
  values: SpecValue[];
  /** Frame when card appears (default: 0) */
  startFrame?: number;
  /** Whether the card is expanded (shows values) */
  expanded?: boolean;
  /** Frame when expansion starts (for animated expansion) */
  expandFrame?: number;
  /** Whether to animate appearance (default: true) */
  animate?: boolean;
  /** Whether this card is being "dragged" (visual state) */
  isDragging?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Specification card mockup matching the SKU Generator app's SpecItem styling.
 * Supports expandable animation and drag state visualization.
 */
export const MockSpecCard: React.FC<MockSpecCardProps> = ({
  name,
  values,
  startFrame = 0,
  expanded = false,
  expandFrame,
  animate = true,
  isDragging = false,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate fade-in and slide animation
  const appearProgress = animate
    ? spring({
        frame: frame - startFrame,
        fps,
        config: {
          damping: 20,
          stiffness: 120,
        },
      })
    : 1;

  const opacity = interpolate(appearProgress, [0, 1], [0, 1]);
  const translateX = interpolate(appearProgress, [0, 1], [-20, 0]);

  // Calculate expand animation
  const effectiveExpandFrame = expandFrame ?? startFrame;
  const expandProgress =
    expanded && frame >= effectiveExpandFrame
      ? spring({
          frame: frame - effectiveExpandFrame,
          fps,
          config: {
            damping: 15,
            stiffness: 100,
          },
        })
      : expanded
        ? 1
        : 0;

  // Chevron rotation
  const chevronRotation = interpolate(expandProgress, [0, 1], [0, 180]);

  return (
    <div
      className={`rounded-md border ${className}`}
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        backgroundColor: isDragging ? "hsl(222.2 47.4% 11.2% / 0.05)" : "white",
        borderColor: isDragging
          ? "hsl(222.2 47.4% 11.2% / 0.3)"
          : "hsl(214.3 31.8% 91.4%)",
        boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
      }}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-2 p-2 cursor-pointer"
        style={{ color: "hsl(222.2 84% 4.9%)" }}
      >
        {/* Drag Handle */}
        <div
          className="flex flex-col gap-0.5 opacity-40"
          style={{ color: "hsl(215.4 16.3% 46.9%)" }}
        >
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>

        {/* Chevron */}
        <div
          style={{
            transform: `rotate(${chevronRotation}deg)`,
            color: "hsl(215.4 16.3% 46.9%)",
            fontSize: "12px",
          }}
        >
          ▼
        </div>

        {/* Spec Name */}
        <span className="text-sm font-medium flex-1">{name}</span>

        {/* Value Count Badge */}
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "hsl(210 40% 96.1%)",
            color: "hsl(215.4 16.3% 46.9%)",
          }}
        >
          {values.length}
        </span>
      </div>

      {/* Expanded Content */}
      {expandProgress > 0 && (
        <div
          className="border-t overflow-hidden"
          style={{
            borderColor: "hsl(214.3 31.8% 91.4%)",
            maxHeight: `${expandProgress * (values.length * 40 + 16)}px`,
            opacity: expandProgress,
          }}
        >
          <div className="p-2 flex flex-col gap-1">
            {values.map((value, index) => {
              // Stagger each value's appearance
              const valueDelay = index * 3;
              const valueProgress =
                expandProgress > 0.3
                  ? spring({
                      frame: frame - effectiveExpandFrame - valueDelay,
                      fps,
                      config: {
                        damping: 20,
                        stiffness: 150,
                      },
                    })
                  : 0;

              return (
                <div
                  key={index}
                  className="flex items-center gap-2 py-1 px-2 rounded"
                  style={{
                    opacity: valueProgress,
                    transform: `translateX(${(1 - valueProgress) * -10}px)`,
                    backgroundColor:
                      valueProgress > 0.5 ? "transparent" : "transparent",
                  }}
                >
                  <span
                    className="text-sm flex-1"
                    style={{ color: "hsl(222.2 84% 4.9%)" }}
                  >
                    {value.displayValue}
                  </span>
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "hsl(210 40% 96.1%)",
                      color: "hsl(215.4 16.3% 46.9%)",
                    }}
                  >
                    {value.skuFragment}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MockSpecCard;
