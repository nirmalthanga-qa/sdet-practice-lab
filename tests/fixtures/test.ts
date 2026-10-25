import { test as base, expect } from '@playwright/test';
import { ShopPage } from '../pages/ShopPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

type PageFixtures = {
  shopPage: ShopPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
};

export const test = base.extend<PageFixtures>({
  shopPage: async ({ page }, provide) => {
    await provide(new ShopPage(page));
  },

  cartPage: async ({ page }, provide) => {
    await provide(new CartPage(page));
  },

  checkoutPage: async ({ page }, provide) => {
    await provide(new CheckoutPage(page));
  },
});

export { expect };