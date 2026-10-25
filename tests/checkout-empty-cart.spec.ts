import { test, expect } from './fixtures/test';

test('empty cart cannot access the checkout form', async ({ page }) => {
  await page.goto('/checkout');

  await expect(
    page.getByRole('heading', {
      name: 'Your cart is empty',
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('textbox', {
      name: 'Full name (required)',
      exact: true,
    }),
  ).toHaveCount(0);

  await expect(
    page.getByRole('button', {
      name: 'Validate delivery details',
      exact: true,
    }),
  ).toHaveCount(0);

  await page
    .getByRole('link', {
      name: 'Explore the shop',
      exact: true,
    })
    .click();

  await expect(page).toHaveURL(/\/shop$/);
});