import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

export interface MockSidebarProps {
  /** Children to render inside the sidebar content area */
  children: React.ReactNode;
  /** Frame when slide-in animation starts (default: 0) */
  startFrame?: number;
  /** Whether to animate the sidebar sliding in (default: true) */
  animate?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Width of the sidebar (default: 256) */
  width?: number;
}

/**
 * Sidebar mockup matching the SKU Generator app's sidebar styling.
 * Slides in from the left with spring animation.
 */
export const MockSidebar: React.FC<MockSidebarProps> = ({
  children,
  startFrame = 0,
  animate = true,
  className = "",
  width = 256,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate slide offset for spring animation
  const slideProgress = animate
    ? spring({
        frame: frame - startFrame,
        fps,
        config: {
          damping: 20,
          stiffness: 100,
        },
      })
    : 1;

  const translateX = (1 - slideProgress) * -width;

  return (
    <div
      className={`flex flex-col border-r ${className}`}
      style={{
        width,
        minWidth: width,
        backgroundColor: "#f8f8f8",
        borderColor: "hsl(220 13% 91%)",
        transform: `translateX(${translateX}px)`,
      }}
    >
      {/* Sidebar Header */}
      <div
        className="flex items-center h-14 px-4 border-b"
        style={{ borderColor: "hsl(220 13% 91%)" }}
      >
        <div
          className="text-sm font-semibold"
          style={{ color: "hsl(240 5.9% 10%)" }}
        >
          Specifications
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-auto">
        {children}
      </div>

      {/* Add Specification Button */}
      <div className="p-2 border-t" style={{ borderColor: "hsl(220 13% 91%)" }}>
        <div
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm rounded-md border border-dashed cursor-pointer"
          style={{
            color: "hsl(215.4 16.3% 46.9%)",
            borderColor: "hsl(214.3 31.8% 91.4%)",
          }}
        >
          <span className="text-lg">+</span>
          Add Specification
        </div>
      </div>
    </div>
  );
};

export default MockSidebar;
