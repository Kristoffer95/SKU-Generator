import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface SheetTab {
  id: string;
  name: string;
}

export interface MockSheetTabsProps {
  /** Array of sheet tabs */
  tabs: SheetTab[];
  /** ID of the active tab */
  activeTabId: string;
  /** Frame when tabs appear (default: 0) */
  startFrame?: number;
  /** Whether to animate appearance (default: true) */
  animate?: boolean;
  /** Tab that is being "clicked" (for animation) */
  clickingTabId?: string | null;
  /** Frame when click animation starts */
  clickFrame?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Sheet tabs mockup matching the SKU Generator app's SheetTabs styling.
 * Supports active tab highlighting and click animations.
 */
export const MockSheetTabs: React.FC<MockSheetTabsProps> = ({
  tabs,
  activeTabId,
  startFrame = 0,
  animate = true,
  clickingTabId = null,
  clickFrame = 0,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate fade-in animation
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

  const opacity = interpolate(appearProgress, [0, 1], [0, 1]);

  return (
    <div
      className={`flex items-center gap-1 border-t px-2 py-1 ${className}`}
      style={{
        opacity,
        backgroundColor: "hsl(210 40% 96.1% / 0.3)",
        borderColor: "hsl(214.3 31.8% 91.4%)",
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const isClicking = tab.id === clickingTabId && frame >= clickFrame;

        // Click animation scale
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

        const scale = isClicking ? 1 - clickProgress * 0.05 + clickProgress * 0.05 : 1;

        // Stagger tab appearance
        const tabDelay = index * 3;
        const tabProgress = animate
          ? spring({
              frame: frame - startFrame - tabDelay,
              fps,
              config: {
                damping: 20,
                stiffness: 150,
              },
            })
          : 1;

        return (
          <div
            key={tab.id}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-t-md cursor-pointer transition-colors"
            style={{
              opacity: tabProgress,
              transform: `translateY(${(1 - tabProgress) * 10}px) scale(${scale})`,
              backgroundColor: isActive ? "#ffffff" : "hsl(210 40% 96.1% / 0.5)",
              borderWidth: isActive ? 1 : 1,
              borderStyle: "solid",
              borderColor: isActive
                ? "hsl(214.3 31.8% 91.4%)"
                : "transparent",
              borderBottomColor: isActive ? "#ffffff" : "transparent",
              fontWeight: isActive ? 500 : 400,
              color: isActive
                ? "hsl(222.2 84% 4.9%)"
                : "hsl(215.4 16.3% 46.9%)",
            }}
          >
            {tab.name}
            {tabs.length > 1 && (
              <span
                className="ml-1 text-xs opacity-0 hover:opacity-100"
                style={{ color: "hsl(215.4 16.3% 46.9%)" }}
              >
                ×
              </span>
            )}
          </div>
        );
      })}

      {/* Add Tab Button */}
      <div
        className="flex items-center justify-center p-1.5 rounded-md cursor-pointer"
        style={{
          opacity: appearProgress,
          color: "hsl(215.4 16.3% 46.9%)",
        }}
      >
        <span className="text-lg leading-none">+</span>
      </div>
    </div>
  );
};

export default MockSheetTabs;
