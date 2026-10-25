import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly checkoutLink: Locator;

  constructor(page: Page) {
    this.checkoutLink = page.getByRole('link', {
      name: 'Proceed to checkout',
      exact: true,
    });
  }

  async proceedToCheckout() {
    await this.checkoutLink.click();
  }
}