import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { springScale } from "../utils/animations.js";

export interface AppFrameProps {
  /** Title to display in the browser title bar */
  title?: string;
  /** Children to render inside the browser content area */
  children: React.ReactNode;
  /** Frame when slide-in animation starts (default: 0) */
  startFrame?: number;
  /** Whether to animate the frame sliding in (default: true) */
  animate?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Width of the frame (default: 1600) */
  width?: number;
  /** Height of the frame (default: 900) */
  height?: number;
}

/**
 * Browser window frame mockup with title bar, traffic lights, and URL bar.
 * Renders a macOS-style browser chrome around children content.
 */
export const AppFrame: React.FC<AppFrameProps> = ({
  title = "SKU Generator",
  children,
  startFrame = 0,
  animate = true,
  className = "",
  width = 1600,
  height = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate scale for spring animation
  const scale = animate
    ? springScale(frame, {
        startFrame,
        fps,
        damping: 20,
        from: 0.9,
        to: 1,
      })
    : 1;

  // Calculate opacity for fade-in
  const opacity = animate
    ? Math.min(1, Math.max(0, (frame - startFrame) / 15))
    : 1;

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden shadow-2xl ${className}`}
      style={{
        width,
        height,
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: "#ffffff",
        border: "1px solid hsl(214.3 31.8% 91.4%)",
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center h-10 px-4 gap-4 border-b"
        style={{
          backgroundColor: "#f8f8f8",
          borderColor: "hsl(214.3 31.8% 91.4%)",
        }}
      >
        {/* Traffic Lights */}
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#ff5f57" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#febc2e" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#28c840" }}
          />
        </div>

        {/* URL Bar */}
        <div
          className="flex-1 flex items-center justify-center h-6 px-4 rounded-md text-xs"
          style={{
            backgroundColor: "#ffffff",
            color: "hsl(215.4 16.3% 46.9%)",
            border: "1px solid hsl(214.3 31.8% 91.4%)",
          }}
        >
          <span className="mr-1">🔒</span>
          sku-generator.app
        </div>

        {/* Spacer for symmetry */}
        <div className="w-14" />
      </div>

      {/* App Header */}
      <div
        className="flex items-center h-14 px-4 gap-2 border-b"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "hsl(214.3 31.8% 91.4%)",
        }}
      >
        <div
          className="text-lg font-semibold"
          style={{ color: "hsl(222.2 84% 4.9%)" }}
        >
          {title}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {/* Import/Export buttons placeholder */}
          <div
            className="px-3 py-1.5 text-sm rounded-md border"
            style={{
              color: "hsl(222.2 84% 4.9%)",
              borderColor: "hsl(214.3 31.8% 91.4%)",
            }}
          >
            Import
          </div>
          <div
            className="px-3 py-1.5 text-sm rounded-md border"
            style={{
              color: "hsl(222.2 84% 4.9%)",
              borderColor: "hsl(214.3 31.8% 91.4%)",
            }}
          >
            Export
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">{children}</div>
    </div>
  );
};

export default AppFrame;
