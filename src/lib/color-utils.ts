/**
 * Color utilities for dropdown value color assignment
 */

/**
 * Color palette for dropdown values (same as CellColorPicker)
 * 18 colors organized by intensity (light, medium, strong)
 */
export const COLOR_PALETTE = [
  // Row 1: Light pastels
  "#fce4ec", // Light pink
  "#fff3e0", // Light orange
  "#fffde7", // Light yellow
  "#e8f5e9", // Light green
  "#e3f2fd", // Light blue
  "#f3e5f5", // Light purple
  // Row 2: Medium pastels
  "#f8bbd0", // Pink
  "#ffcc80", // Orange
  "#fff59d", // Yellow
  "#a5d6a7", // Green
  "#90caf9", // Blue
  "#ce93d8", // Purple
  // Row 3: Stronger colors
  "#f48fb1", // Strong pink
  "#ffb74d", // Strong orange
  "#fff176", // Strong yellow
  "#81c784", // Strong green
  "#64b5f6", // Strong blue
  "#ba68c8", // Strong purple
]

/**
 * Get an auto-assigned color for a dropdown value based on its index.
 * Uses round-robin assignment from the color palette.
 *
 * @param index - The index of the value (0-based)
 * @returns Hex color code from the palette
 */
export function getAutoColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

/**
 * Check if a color is valid (non-empty hex color)
 * @param color - Color string to check
 * @returns true if color is a valid non-empty string
 */
export function isValidColor(color: string | undefined): color is string {
  return typeof color === 'string' && color.length > 0
}
