import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface MockSettingsDialogProps {
  /** Frame when dialog appears (default: 0) */
  startFrame?: number;
  /** Whether to animate appearance (default: true) */
  animate?: boolean;
  /** Currently selected delimiter */
  delimiter?: string;
  /** Currently selected prefix */
  prefix?: string;
  /** Currently selected suffix */
  suffix?: string;
  /** Available delimiter options */
  delimiterOptions?: string[];
  /** Index of the highlighted delimiter option (for animation) */
  highlightedDelimiter?: number;
  /** Frame when a delimiter is being selected */
  selectFrame?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Settings dialog mockup matching the SKU Generator app's settings modal.
 * Shows delimiter, prefix, and suffix configuration options.
 */
export const MockSettingsDialog: React.FC<MockSettingsDialogProps> = ({
  startFrame = 0,
  animate = true,
  delimiter = "-",
  prefix = "",
  suffix = "",
  delimiterOptions = ["-", "_", ".", "/", ""],
  highlightedDelimiter = -1,
  selectFrame,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate scale and fade for dialog appearance
  const appearProgress = animate
    ? spring({
        frame: frame - startFrame,
        fps,
        config: {
          damping: 15,
          stiffness: 120,
        },
      })
    : 1;

  const opacity = interpolate(appearProgress, [0, 1], [0, 1]);
  const scale = interpolate(appearProgress, [0, 1], [0.9, 1]);

  // Selection animation
  const selectProgress =
    selectFrame !== undefined && frame >= selectFrame
      ? spring({
          frame: frame - selectFrame,
          fps,
          config: {
            damping: 20,
            stiffness: 200,
          },
        })
      : 0;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${className}`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
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
          {/* Delimiter Section */}
          <div className="flex flex-col gap-2">
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
            <div className="flex gap-2">
              {delimiterOptions.map((option, index) => {
                const isSelected = option === delimiter;
                const isHighlighted = index === highlightedDelimiter;

                // Highlight animation
                const highlightScale =
                  isHighlighted && selectProgress > 0
                    ? 1 + selectProgress * 0.1 - selectProgress * 0.1
                    : 1;

                return (
                  <button
                    key={index}
                    className="px-3 py-1.5 text-sm rounded-md border font-mono min-w-10"
                    style={{
                      transform: `scale(${highlightScale})`,
                      backgroundColor: isSelected
                        ? "hsl(222.2 47.4% 11.2%)"
                        : isHighlighted
                          ? "hsl(222.2 47.4% 11.2% / 0.1)"
                          : "transparent",
                      borderColor: isSelected
                        ? "hsl(222.2 47.4% 11.2%)"
                        : "hsl(214.3 31.8% 91.4%)",
                      color: isSelected
                        ? "#ffffff"
                        : "hsl(222.2 84% 4.9%)",
                      boxShadow: isHighlighted
                        ? "0 0 0 2px hsl(222.2 47.4% 11.2% / 0.3)"
                        : "none",
                    }}
                  >
                    {option || "none"}
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
              value={prefix}
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
              value={suffix}
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
              {prefix}RED{delimiter}SM{delimiter}COT{suffix}
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

export default MockSettingsDialog;
