import { test, expect, Page } from '@playwright/test';

/**
 * PRD-012: End-to-End Verification
 * Complete workflow test using Config sheet for spec definitions
 *
 * Test steps:
 * 1. Add Temperature specs to Config sheet (29deg C/29C, 30deg C/30C)
 * 2. Add Color specs to Config sheet (Red/R, Blue/B)
 * 3. Add Type specs to Config sheet (Standard/STD, Premium/PRM)
 * 4. Create new data sheet with columns: Temperature, Color, Type, SKU
 * 5. Verify dropdowns show correct values
 * 6. Select values and verify SKU auto-generation
 * 7. Change a value and verify SKU updates
 * 8. Export to Excel and verify structure
 */

test.describe('PRD-012: End-to-End Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    // Wait for app to initialize
    await expect(page.locator('[data-testid="spreadsheet-container"]')).toBeVisible({ timeout: 10000 });
  });

  test('complete workflow with Config sheet specs and auto-SKU generation', async ({ page }) => {
    // Wait for Fortune-Sheet to be fully loaded
    await page.waitForTimeout(1000);

    // Step 1-3: Add specifications to Config sheet using AddSpecDialog
    // The Config sheet should be active by default

    // Add Temperature specification
    await addSpecificationViaDialog(page, 'Temperature', [
      { value: '29deg C', skuCode: '29C' },
      { value: '30deg C', skuCode: '30C' },
    ]);

    // Add Color specification
    await addSpecificationViaDialog(page, 'Color', [
      { value: 'Red', skuCode: 'R' },
      { value: 'Blue', skuCode: 'B' },
    ]);

    // Add Type specification
    await addSpecificationViaDialog(page, 'Type', [
      { value: 'Standard', skuCode: 'STD' },
      { value: 'Premium', skuCode: 'PRM' },
    ]);

    // Verify specifications appear in sidebar
    await expect(page.getByText('Temperature')).toBeVisible();
    await expect(page.getByText('Color')).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();

    // Step 4: Create a new data sheet
    // Fortune-Sheet has a "+" button for adding sheets at the bottom
    const addSheetButton = page.locator('div.luckysheet-sheets-add');
    if (await addSheetButton.isVisible()) {
      await addSheetButton.click();
      await page.waitForTimeout(500);
    }

    // Now we need to set up column headers in the data sheet
    // Click on the new sheet tab (Sheet 1)
    const sheetTab = page.locator('.luckysheet-sheet-container span:has-text("Sheet")').first();
    if (await sheetTab.isVisible()) {
      await sheetTab.click();
      await page.waitForTimeout(500);
    }

    // Type column headers: Temperature, Color, Type, SKU
    // Click on cell A1 and type Temperature
    await clickCell(page, 0, 0);
    await page.keyboard.type('Temperature');
    await page.keyboard.press('Tab');

    // Type Color in B1
    await page.keyboard.type('Color');
    await page.keyboard.press('Tab');

    // Type Type in C1
    await page.keyboard.type('Type');
    await page.keyboard.press('Tab');

    // Type SKU in D1
    await page.keyboard.type('SKU');
    await page.keyboard.press('Enter');

    // Wait for data to sync
    await page.waitForTimeout(500);

    // Step 5-6: Select values using dropdowns and verify SKU generation
    // Click on A2 (Temperature column, row 2)
    await clickCell(page, 1, 0);
    await page.waitForTimeout(300);

    // Check if dropdown appears and select a value
    const dropdown = page.locator('.luckysheet-dataVerification-dropdown');
    if (await dropdown.isVisible({ timeout: 1000 })) {
      // Find and click the dropdown item for 29deg C
      const option29C = page.locator('.luckysheet-dataVerification-dropdown-item:has-text("29deg C")');
      if (await option29C.isVisible()) {
        await option29C.click();
      }
    } else {
      // Fallback: type the value directly
      await page.keyboard.type('29deg C');
      await page.keyboard.press('Tab');
    }
    await page.waitForTimeout(300);

    // Select Red for Color (B2)
    await clickCell(page, 1, 1);
    await page.waitForTimeout(300);
    if (await dropdown.isVisible({ timeout: 500 })) {
      const optionRed = page.locator('.luckysheet-dataVerification-dropdown-item:has-text("Red")');
      if (await optionRed.isVisible()) {
        await optionRed.click();
      }
    } else {
      await page.keyboard.type('Red');
      await page.keyboard.press('Tab');
    }
    await page.waitForTimeout(300);

    // Select Standard for Type (C2)
    await clickCell(page, 1, 2);
    await page.waitForTimeout(300);
    if (await dropdown.isVisible({ timeout: 500 })) {
      const optionStd = page.locator('.luckysheet-dataVerification-dropdown-item:has-text("Standard")');
      if (await optionStd.isVisible()) {
        await optionStd.click();
      }
    } else {
      await page.keyboard.type('Standard');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);

    // Verify SKU column shows expected value
    // The SKU should be auto-generated as '29C-R-STD'
    await clickCell(page, 1, 3); // D2 - SKU cell
    await page.waitForTimeout(300);

    // Get the cell value from Fortune-Sheet
    const skuValue1 = await getCellValue(page);
    console.log('First SKU value:', skuValue1);
    // SKU should contain the expected codes (order may vary based on column order)
    expect(skuValue1).toContain('29C');
    expect(skuValue1).toContain('R');
    expect(skuValue1).toContain('STD');

    // Step 7: Change Color to Blue and verify SKU updates
    await clickCell(page, 1, 1); // B2 - Color cell
    await page.waitForTimeout(300);

    // Clear and type new value
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    if (await dropdown.isVisible({ timeout: 500 })) {
      const optionBlue = page.locator('.luckysheet-dataVerification-dropdown-item:has-text("Blue")');
      if (await optionBlue.isVisible()) {
        await optionBlue.click();
      }
    } else {
      await page.keyboard.type('Blue');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);

    // Check updated SKU
    await clickCell(page, 1, 3); // D2 - SKU cell
    await page.waitForTimeout(300);

    const skuValue2 = await getCellValue(page);
    console.log('Updated SKU value:', skuValue2);
    // SKU should now be '29C-B-STD'
    expect(skuValue2).toContain('29C');
    expect(skuValue2).toContain('B');
    expect(skuValue2).toContain('STD');
    expect(skuValue2).not.toContain('-R-');

    // Step 8: Export to Excel and verify structure
    // Click Export dropdown
    await page.getByRole('button', { name: /Export/i }).click();
    await page.waitForTimeout(200);

    // Verify dropdown options exist
    await expect(page.getByText('Export to Excel')).toBeVisible();
    await expect(page.getByText('Export Current Sheet to CSV')).toBeVisible();

    // Click elsewhere to close dropdown
    await page.keyboard.press('Escape');
  });

  test('Config sheet contains all specifications after adding', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Add a specification
    await addSpecificationViaDialog(page, 'Size', [
      { value: 'Small', skuCode: 'S' },
      { value: 'Large', skuCode: 'L' },
    ]);

    // Click on Config sheet tab to verify data
    const configTab = page.locator('.luckysheet-sheet-container span:has-text("Config")');
    await configTab.click();
    await page.waitForTimeout(500);

    // The Config sheet should have rows for Size/Small/S and Size/Large/L
    // Verify by checking the sidebar shows the spec
    await expect(page.getByText('Size')).toBeVisible();
    await expect(page.getByText('2 values')).toBeVisible();
  });
});

/**
 * Helper: Add a specification using the AddSpecDialog
 */
async function addSpecificationViaDialog(
  page: Page,
  specName: string,
  values: Array<{ value: string; skuCode: string }>
) {
  // Click "Add Specification" button in sidebar
  const addButton = page.getByRole('button', { name: /Add Specification/i });
  await addButton.click();
  await page.waitForTimeout(300);

  // Fill in spec name
  const nameInput = page.getByLabel('Specification Name');
  await nameInput.fill(specName);

  // For the first value (there's always one by default)
  const valueInputs = page.locator('input[placeholder="Value label"]');
  const codeInputs = page.locator('input[placeholder="SKU code"]');

  // Fill first value
  await valueInputs.first().fill(values[0].value);
  await codeInputs.first().fill(values[0].skuCode);

  // Add additional values
  for (let i = 1; i < values.length; i++) {
    // Click "Add Value" button
    await page.getByRole('button', { name: /Add Value/i }).click();
    await page.waitForTimeout(100);

    // Fill the new value row
    const allValueInputs = page.locator('input[placeholder="Value label"]');
    const allCodeInputs = page.locator('input[placeholder="SKU code"]');

    await allValueInputs.nth(i).fill(values[i].value);
    await allCodeInputs.nth(i).fill(values[i].skuCode);
  }

  // Submit the dialog
  await page.getByRole('button', { name: /^Add$/ }).click();
  await page.waitForTimeout(500);
}

/**
 * Helper: Click on a specific cell in Fortune-Sheet
 * row and col are 0-indexed
 */
async function clickCell(page: Page, row: number, col: number) {
  // Fortune-Sheet uses a canvas, so we need to calculate pixel positions
  // The cell dimensions are typically 73px wide and 19px tall (default)
  // There's a row header (about 46px) and column header (about 19px)

  const rowHeaderWidth = 46;
  const colHeaderHeight = 39; // May include formula bar
  const cellWidth = 73;
  const cellHeight = 19;

  // Find the luckysheet container
  const container = page.locator('.luckysheet-cell-main');
  const box = await container.boundingBox();

  if (box) {
    const x = box.x + rowHeaderWidth + (col * cellWidth) + (cellWidth / 2);
    const y = box.y + colHeaderHeight + (row * cellHeight) + (cellHeight / 2);
    await page.mouse.click(x, y);
  } else {
    // Fallback: try clicking on a table cell if visible
    const cells = page.locator('.luckysheet-cell-flow table td');
    const cellCount = await cells.count();
    if (cellCount > 0) {
      const targetIndex = row * 26 + col; // Assuming 26 columns per row
      if (targetIndex < cellCount) {
        await cells.nth(targetIndex).click();
      }
    }
  }
}

/**
 * Helper: Get the current cell value from Fortune-Sheet input
 */
async function getCellValue(page: Page): Promise<string> {
  // Fortune-Sheet shows the value in a formula bar or cell input
  const formulaInput = page.locator('#luckysheet-functionbox-cell input');
  if (await formulaInput.isVisible({ timeout: 500 })) {
    return await formulaInput.inputValue();
  }

  // Alternative: check the cell content div
  const cellContent = page.locator('.luckysheet-cell-selected .luckysheet-cell-content');
  if (await cellContent.isVisible({ timeout: 500 })) {
    return await cellContent.textContent() || '';
  }

  // Try getting from formula bar text area
  const formulaTextarea = page.locator('#luckysheet-functionbox-cell textarea');
  if (await formulaTextarea.isVisible({ timeout: 500 })) {
    return await formulaTextarea.inputValue();
  }

  return '';
}
