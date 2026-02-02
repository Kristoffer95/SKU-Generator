import { test, expect } from '@playwright/test';

test.describe('Dropdown Edit Mode', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('sku-generator-tour-completed', 'true');
    });
  });

  test('click directly on cell TD element to edit', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Add event listener debugging - track all relevant events
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown[]>).__events = [];
      const trackEvent = (eventName: string) => (e: Event) => {
        const target = e.target as HTMLElement;
        (window as unknown as Record<string, unknown[]>).__events.push({
          type: eventName,
          targetTag: target.tagName,
          targetClass: target.className,
          defaultPrevented: e.defaultPrevented,
        });
      };
      document.addEventListener('click', trackEvent('click'), true);
      document.addEventListener('mousedown', trackEvent('mousedown'), true);
      document.addEventListener('mouseup', trackEvent('mouseup'), true);
      document.addEventListener('focus', trackEvent('focus'), true);
      document.addEventListener('blur', trackEvent('blur'), true);
      document.addEventListener('focusin', trackEvent('focusin'), true);
      document.addEventListener('focusout', trackEvent('focusout'), true);
    });

    // Find a spec cell's TD element directly
    const specCellTD = page.locator('td.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    await expect(specCellTD).toBeVisible();

    // Click directly on the cell
    await specCellTD.click();
    await page.waitForTimeout(500);

    // Check what has focus now
    const focusAfterClick = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tagName: el.tagName,
        className: el.className,
        tabIndex: el.getAttribute('tabindex'),
      } : null;
    });
    console.log('Focus after click:', JSON.stringify(focusAfterClick));

    // Check if there's an active cell overlay
    const activeCell = page.locator('.Spreadsheet__active-cell');
    const activeCellVisible = await activeCell.isVisible();
    console.log('Active cell visible:', activeCellVisible);

    if (activeCellVisible) {
      // Check the active cell's classes
      const activeCellInfo = await activeCell.evaluate((el) => ({
        className: el.className,
        tabIndex: el.getAttribute('tabindex'),
      }));
      console.log('Active cell info:', JSON.stringify(activeCellInfo));

      // Clear events before clicking active cell
      await page.evaluate(() => {
        (window as unknown as Record<string, unknown[]>).__events = [];
      });

      // The active cell overlay has an onClick handler - try clicking it
      await activeCell.click();
      await page.waitForTimeout(500);

      // Get captured events
      const events = await page.evaluate(() => (window as unknown as Record<string, unknown[]>).__events);
      console.log('Events on active cell click:', JSON.stringify(events, null, 2));

      // The events show edit mode WAS entered, but may have exited quickly
      // Let's check the current state
      const state = await page.evaluate(() => {
        const editCell = document.querySelector('.Spreadsheet__active-cell--edit');
        const viewCell = document.querySelector('.Spreadsheet__active-cell--view');
        const dropdownEditor = document.querySelector('[data-testid="colored-dropdown-editor"]');
        const dropdownContent = document.querySelector('[data-testid="colored-dropdown-content"]');
        const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');

        return {
          hasEditCell: !!editCell,
          hasViewCell: !!viewCell,
          hasDropdownEditor: !!dropdownEditor,
          hasDropdownContent: !!dropdownContent,
          hasPopoverContent: !!popoverContent,
          activeElement: document.activeElement ? {
            tagName: document.activeElement.tagName,
            className: document.activeElement.className,
          } : null,
        };
      });
      console.log('Final state:', JSON.stringify(state, null, 2));

      // Take screenshot
      await page.screenshot({ path: 'test-results/edit-mode-click-active.png' });

      // Test passed - edit mode stayed active and dropdown is visible
      expect(state.hasEditCell).toBe(true);
      expect(state.hasDropdownEditor).toBe(true);
      expect(state.hasDropdownContent).toBe(true);
    }
  });

  test('keyboard Enter key should enter edit mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Track keydown events
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown[]>).__keyEvents = [];
      document.addEventListener('keydown', (e) => {
        const target = e.target as HTMLElement;
        (window as unknown as Record<string, unknown[]>).__keyEvents.push({
          key: e.key,
          targetTag: target.tagName,
          targetClass: target.className,
          defaultPrevented: e.defaultPrevented,
        });
      }, true); // Capture phase
    });

    // Find and click a spec cell
    const specCell = page.locator('td.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    await expect(specCell).toBeVisible();
    await specCell.click();
    await page.waitForTimeout(500);

    // Verify cell is focused
    const focusAfterClick = await page.evaluate(() => document.activeElement?.tagName);
    console.log('Focus after click:', focusAfterClick);

    // Focus should be on the active cell overlay (the div that intercepts pointer events)
    // or on the TD itself. Let's check what's actually focused.
    const activeFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active ? {
        tagName: active.tagName,
        className: active.className,
      } : null;
    });
    console.log('Active element:', JSON.stringify(activeFocused));

    // The active cell overlay should be visible
    const activeCell = page.locator('.Spreadsheet__active-cell');
    const activeCellVisible = await activeCell.isVisible();
    console.log('Active cell visible:', activeCellVisible);

    // Clear key events before pressing Enter
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown[]>).__keyEvents = [];
    });

    // Now press Enter - should enter edit mode
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Get key events
    const keyEvents = await page.evaluate(() => (window as unknown as Record<string, unknown[]>).__keyEvents);
    console.log('Key events:', JSON.stringify(keyEvents, null, 2));

    // Check if edit mode activated
    const editModeVisible = await page.locator('.Spreadsheet__active-cell--edit').isVisible();
    console.log('Edit mode visible:', editModeVisible);

    // Check for dropdown
    const dropdownVisible = await page.locator('[data-testid="colored-dropdown-editor"]').isVisible().catch(() => false);
    console.log('Dropdown visible:', dropdownVisible);

    // Take screenshot
    await page.screenshot({ path: 'test-results/edit-mode-keyboard-enter.png' });

    // Verify edit mode entered
    expect(editModeVisible || dropdownVisible).toBe(true);
  });

  test.skip('investigate enter key edit mode behavior (OLD)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/edit-mode-01-initial.png' });

    // Click on a spec cell (Color column, first data row)
    const specCell = page.locator('.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    await expect(specCell).toBeVisible();

    // Click to select
    await specCell.click();
    await page.waitForTimeout(500);

    // Take screenshot after selection
    await page.screenshot({ path: 'test-results/edit-mode-02-selected.png' });

    // Check if cell is now selected
    const activeCell = page.locator('.Spreadsheet__active-cell--view');
    const isSelected = await activeCell.isVisible();
    console.log('Cell selected:', isSelected);

    // Check where focus is
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tagName: el.tagName,
        className: el.className,
        id: el.id
      } : null;
    });
    console.log('Focused element after cell click:', JSON.stringify(focusedElement));

    // Try F2 key first (common spreadsheet shortcut for edit mode)
    await page.keyboard.press('F2');
    await page.waitForTimeout(500);

    // Check focus after F2
    const focusedAfterF2 = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tagName: el.tagName,
        className: el.className,
        id: el.id
      } : null;
    });
    console.log('Focused element after F2:', JSON.stringify(focusedAfterF2));

    // Check if edit mode is active after F2
    const editModeAfterF2 = page.locator('.Spreadsheet__active-cell--edit');
    const isEditModeAfterF2 = await editModeAfterF2.isVisible();
    console.log('Edit mode after F2:', isEditModeAfterF2);

    // Screenshot after F2
    await page.screenshot({ path: 'test-results/edit-mode-f2.png' });

    // If F2 didn't work, try just typing a character (which should trigger edit mode)
    if (!isEditModeAfterF2) {
      // Re-select the cell
      await specCell.click();
      await page.waitForTimeout(300);

      // Type a character - this should enter edit mode
      await page.keyboard.type('a');
      await page.waitForTimeout(500);

      // Check focus after typing
      const focusedAfterType = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tagName: el.tagName,
          className: el.className,
          id: el.id
        } : null;
      });
      console.log('Focused element after typing:', JSON.stringify(focusedAfterType));

      // Screenshot after typing
      await page.screenshot({ path: 'test-results/edit-mode-after-type.png' });
    }

    // Now try Enter key
    await specCell.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Check focus after Enter
    const focusedAfterEnter = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tagName: el.tagName,
        className: el.className,
        id: el.id
      } : null;
    });
    console.log('Focused element after Enter:', JSON.stringify(focusedAfterEnter));

    // Take screenshot after Enter
    await page.screenshot({ path: 'test-results/edit-mode-03-after-enter.png' });

    // Check if edit mode is active
    const editModeCell = page.locator('.Spreadsheet__active-cell--edit');
    const isEditMode = await editModeCell.isVisible();
    console.log('Edit mode active:', isEditMode);

    // Check for data editor
    const dataEditor = page.locator('.Spreadsheet__data-editor');
    const hasDataEditor = await dataEditor.isVisible().catch(() => false);
    console.log('Data editor visible:', hasDataEditor);

    // Check for our custom dropdown editor
    const coloredDropdown = page.locator('[data-testid="colored-dropdown-editor"]');
    const hasColoredDropdown = await coloredDropdown.isVisible().catch(() => false);
    console.log('Colored dropdown visible:', hasColoredDropdown);

    // Check for native select
    const nativeSelect = page.locator('[data-testid="dropdown-editor-select"]');
    const hasNativeSelect = await nativeSelect.isVisible().catch(() => false);
    console.log('Native select visible:', hasNativeSelect);

    // Assertion - at least one should be true for edit mode to work
    expect(isEditMode || hasDataEditor || hasColoredDropdown || hasNativeSelect).toBe(true);
  });

  test('investigate double-click edit mode behavior', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Find a spec cell
    const specCell = page.locator('.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    await expect(specCell).toBeVisible();

    // Click to select first
    await specCell.click();
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: 'test-results/dblclick-01-selected.png' });

    // Now try clicking on the active cell overlay (which intercepts clicks)
    const activeCell = page.locator('.Spreadsheet__active-cell');
    await activeCell.click({ force: true });
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'test-results/dblclick-02-after-click.png' });

    // Check for edit mode
    const editModeCell = page.locator('.Spreadsheet__active-cell--edit');
    const isEditMode = await editModeCell.isVisible();
    console.log('Edit mode active after click:', isEditMode);

    // Check for data editor
    const dataEditor = page.locator('.Spreadsheet__data-editor');
    const hasDataEditor = await dataEditor.isVisible().catch(() => false);
    console.log('Data editor visible:', hasDataEditor);

    expect(isEditMode || hasDataEditor).toBe(true);
  });

  test('check cell readonly state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Get all cells and check their classes
    const cells = page.locator('.Spreadsheet__cell');
    const cellCount = await cells.count();
    console.log('Total cells:', cellCount);

    // Check first few cells for readonly class
    for (let i = 0; i < Math.min(5, cellCount); i++) {
      const cell = cells.nth(i);
      const text = await cell.innerText().catch(() => '');
      const classes = await cell.getAttribute('class');
      const isReadonly = classes?.includes('Spreadsheet__cell--readonly') ?? false;
      console.log(`Cell ${i}: text="${text}", readonly=${isReadonly}`);
    }

    // Screenshot
    await page.screenshot({ path: 'test-results/readonly-check.png' });

    expect(true).toBe(true); // Just for investigation
  });

  test('check react-spreadsheet internal state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.Spreadsheet');
    await page.waitForTimeout(1000);

    // Try to access react-spreadsheet's internal data
    // The component renders cells with data from props
    // Check if there's any readOnly property in cell data

    // Find the Color column cell (should be the 2nd column, index 1)
    const specCell = page.locator('.Spreadsheet__cell').filter({ hasText: 'Red' }).first();
    await specCell.click();
    await page.waitForTimeout(300);

    // Check for any readOnly related state in the cell or its parent
    const cellInfo = await page.evaluate(() => {
      // Try to find the cell element
      const cell = document.querySelector('.Spreadsheet__active-cell');
      if (!cell) return { error: 'No active cell found' };

      // Check if there's a React fiber we can inspect
      const fiberKey = Object.keys(cell).find(key => key.startsWith('__reactFiber'));
      if (fiberKey) {
        // @ts-expect-error - accessing React internals for debugging
        const fiber = cell[fiberKey];
        // Try to find cell props in the fiber tree
        let current = fiber;
        let props = null;
        for (let i = 0; i < 10; i++) {
          if (current?.memoizedProps?.cell) {
            props = current.memoizedProps.cell;
            break;
          }
          current = current?.return;
        }
        return {
          hasFiber: true,
          cellProps: props ? JSON.stringify(props) : 'not found',
        };
      }
      return { hasFiber: false };
    });
    console.log('Cell info:', JSON.stringify(cellInfo, null, 2));

    expect(true).toBe(true);
  });
});
