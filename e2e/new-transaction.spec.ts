import { test, expect } from '@playwright/test';

test('nueva transacción aparece en la lista de transacciones', async ({ page }) => {
  await page.goto('/transactions');

  const rows = page.locator('tbody tr');
  await page.waitForLoadState('networkidle');
  const initialCount = await rows.count();

  await page.getByRole('button', { name: 'Nueva Transacción' }).click();

  const drawer = page.getByRole('dialog', { name: 'Nueva Transacción' });
  await expect(drawer).toBeVisible();

  // Esperar que las empresas carguen en el select antes de interactuar
  await expect(drawer.locator('select#nt-company option[value="AW"]')).toBeAttached({ timeout: 10000 });

  await drawer.getByLabel('Descripción').fill('Test E2E Playwright');
  await drawer.getByLabel('Monto').fill('50000');
  await drawer.getByLabel('Fecha').fill(new Date().toISOString().split('T')[0]);

  await drawer.getByRole('button', { name: 'Guardar Transacción' }).click();

  await expect(drawer).not.toBeVisible({ timeout: 10000 });
  await expect(rows).toHaveCount(initialCount + 1);
  await expect(page.getByText('Test E2E Playwright')).toBeVisible();
});
