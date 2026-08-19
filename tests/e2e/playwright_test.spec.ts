import { test, expect } from '@playwright/test';

test('MedSIEM Login and SOC Dashboard Navigation', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await expect(page).toHaveTitle(/MedSIEM/);

  await page.fill('input[type="email"]', 'admin@medsiem.org');
  await page.fill('input[type="password"]', 'SuperAdmin123!');
  await page.click('button[type="submit"]');

  await expect(page.locator('h2')).toContainText('Security Operations Command Center');
});
