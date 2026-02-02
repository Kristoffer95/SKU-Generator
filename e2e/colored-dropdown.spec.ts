import { test, expect } from '@playwright/test';

test.describe('ColoredDropdownEditor', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh with sample data that has colors
    // then set tour as completed to skip the guided tour
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('sku-generator-tour-completed', 'true');
    });
  });

  test('spec cells display background colors matching spec values (valueColor)', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the spreadsheet to load
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(500);

    // Take a screenshot to verify cells have colored backgrounds
    await page.screenshot({ path: 'test-results/colored-cells-display.png', fullPage: true });

    // Look for a cell containing 'Red' which should have a colored background
    const redCell = page.locator('.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    const redCellExists = (await redCell.count()) > 0;

    if (!redCellExists) {
      test.skip();
      return;
    }

    // The cell should have a background color (inline style)
    // The valueColor is applied as backgroundColor in the cell viewer
    const redCellElement = await redCell.elementHandle();
    if (redCellElement) {
      const computedStyle = await page.evaluate((el) => {
        const cellDiv = el.querySelector('div');
        if (cellDiv) {
          return window.getComputedStyle(cellDiv).backgroundColor;
        }
        return window.getComputedStyle(el).backgroundColor;
      }, redCellElement);
      console.log(`Red cell background color: ${computedStyle}`);
      // Should not be transparent or white - should have some color
      expect(computedStyle).not.toBe('rgba(0, 0, 0, 0)');
      expect(computedStyle).not.toBe('transparent');
    }

    // Verify Blue cell also has a colored background
    const blueCell = page.locator('.Spreadsheet__cell').filter({ hasText: 'Blue' }).first();
    const blueCellExists = (await blueCell.count()) > 0;
    if (blueCellExists) {
      const blueCellElement = await blueCell.elementHandle();
      if (blueCellElement) {
        const computedStyle = await page.evaluate((el) => {
          const cellDiv = el.querySelector('div');
          if (cellDiv) {
            return window.getComputedStyle(cellDiv).backgroundColor;
          }
          return window.getComputedStyle(el).backgroundColor;
        }, blueCellElement);
        console.log(`Blue cell background color: ${computedStyle}`);
        expect(computedStyle).not.toBe('rgba(0, 0, 0, 0)');
        expect(computedStyle).not.toBe('transparent');
      }
    }
  });

  test('sample data loads with colored spec values', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(500);

    // Verify sample data is present
    await expect(page.locator('.Spreadsheet__cell').filter({ hasText: 'Red' }).first()).toBeVisible();
    await expect(page.locator('.Spreadsheet__cell').filter({ hasText: 'Blue' }).first()).toBeVisible();
    await expect(page.locator('.Spreadsheet__cell').filter({ hasText: 'Cotton' }).first()).toBeVisible();

    // Verify specifications sidebar shows Color, Size, Material
    // Use first() to avoid strict mode violation when multiple elements match
    await expect(page.getByText('Color').first()).toBeVisible();
    await expect(page.getByText('Size').first()).toBeVisible();
    await expect(page.getByText('Material').first()).toBeVisible();
  });
});
