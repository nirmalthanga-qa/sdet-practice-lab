import type { Locator, Page } from '@playwright/test';

export type DeliveryDetails = {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
};

export class CheckoutPage {
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly postalCodeInput: Locator;
  readonly validateButton: Locator;

  readonly fullNameError: Locator;
  readonly emailError: Locator;
  readonly addressError: Locator;
  readonly cityError: Locator;
  readonly postalCodeError: Locator;
  readonly successMessage: Locator;
  readonly deliveryReview: Locator;

  constructor(page: Page) {
    this.fullNameInput = page.getByRole('textbox', {
      name: 'Full name (required)',
      exact: true,
    });

    this.emailInput = page.getByRole('textbox', {
      name: 'Email (required)',
      exact: true,
    });

    this.addressInput = page.getByRole('textbox', {
      name: 'Delivery address (required)',
      exact: true,
    });

    this.cityInput = page.getByRole('textbox', {
      name: 'City (required)',
      exact: true,
    });

    this.postalCodeInput = page.getByRole('textbox', {
      name: 'PIN code (required)',
      exact: true,
    });

    this.validateButton = page.getByRole('button', {
      name: 'Validate delivery details',
      exact: true,
    });

    this.fullNameError = page.locator('#full-name-error');
    this.emailError = page.locator('#email-error');
    this.addressError = page.locator('#address-error');
    this.cityError = page.locator('#city-error');
    this.postalCodeError = page.locator('#postal-code-error');

    this.successMessage = page.getByText(
      'Delivery details validated. No order has been placed yet.',
      { exact: true },
    );

    this.deliveryReview = page.getByRole('region', {
  name: 'Review your delivery details',
  exact: true,
});
  }

  async fillDeliveryDetails(details: DeliveryDetails) {
    await this.fullNameInput.fill(details.fullName);
    await this.emailInput.fill(details.email);
    await this.addressInput.fill(details.address);
    await this.cityInput.fill(details.city);
    await this.postalCodeInput.fill(details.postalCode);
  }

  async submitDeliveryDetails() {
    await this.validateButton.click();
  }

  errorFor(field: keyof DeliveryDetails): Locator {
    const errors = {
      fullName: this.fullNameError,
      email: this.emailError,
      address: this.addressError,
      city: this.cityError,
      postalCode: this.postalCodeError,
    };

    return errors[field];
  }
}