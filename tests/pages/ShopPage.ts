import type { Page } from '@playwright/test';

export class ShopPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/shop');
  }

  async addProductToCart(productName: string) {
    await this.page
      .getByRole('button', {
        name: `Add to cart: ${productName}`,
        exact: true,
      })
      .click();
  }

  async openCart() {
    await this.page
      .getByRole('link', {
        name: /^Cart: \d+ items?$/,
      })
      .click();
  }
}