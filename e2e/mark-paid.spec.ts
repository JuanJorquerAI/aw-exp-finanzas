import { test, expect } from '@playwright/test';

test('marcar transacción como pagada la elimina de CxP', async ({ page }) => {
  await page.goto('/cxp?month=2026-06');

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  const initialCount = await rows.count();

  await rows.first().getByRole('button', { name: '✓ Pagar' }).click();

  await expect(rows).toHaveCount(initialCount - 1);
});

test('marcar transacción como pagada la elimina de CxC', async ({ page }) => {
  await page.goto('/cxc');

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  const initialCount = await rows.count();

  await rows.first().getByRole('button', { name: '✓ Pagar' }).click();

  await expect(rows).toHaveCount(initialCount - 1);
});
