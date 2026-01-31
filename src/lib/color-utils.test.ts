import { describe, it, expect } from 'vitest';
import { COLOR_PALETTE, getAutoColor, isValidColor } from './color-utils';

describe('color-utils', () => {
  describe('COLOR_PALETTE', () => {
    it('contains 18 colors', () => {
      expect(COLOR_PALETTE).toHaveLength(18);
    });

    it('all colors are valid hex codes', () => {
      COLOR_PALETTE.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('getAutoColor', () => {
    it('returns first color for index 0', () => {
      expect(getAutoColor(0)).toBe(COLOR_PALETTE[0]);
    });

    it('returns colors in sequence for increasing indices', () => {
      expect(getAutoColor(0)).toBe(COLOR_PALETTE[0]);
      expect(getAutoColor(1)).toBe(COLOR_PALETTE[1]);
      expect(getAutoColor(2)).toBe(COLOR_PALETTE[2]);
    });

    it('wraps around after palette length (round-robin)', () => {
      expect(getAutoColor(18)).toBe(COLOR_PALETTE[0]); // 18 % 18 = 0
      expect(getAutoColor(19)).toBe(COLOR_PALETTE[1]); // 19 % 18 = 1
      expect(getAutoColor(36)).toBe(COLOR_PALETTE[0]); // 36 % 18 = 0
    });

    it('handles large indices correctly', () => {
      expect(getAutoColor(100)).toBe(COLOR_PALETTE[100 % 18]);
    });
  });

  describe('isValidColor', () => {
    it('returns true for valid hex color', () => {
      expect(isValidColor('#ff0000')).toBe(true);
      expect(isValidColor('#000')).toBe(true);
      expect(isValidColor('red')).toBe(true); // CSS color name
    });

    it('returns false for undefined', () => {
      expect(isValidColor(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidColor('')).toBe(false);
    });
  });
});
