import { test, expect } from './fixtures/test';
import type { DeliveryDetails } from './pages/CheckoutPage';

const validDetails: DeliveryDetails = {
  fullName: 'Test Learner',
  email: 'learner@example.com',
  address: '123 Example Street',
  city: 'Bengaluru',
  postalCode: '560001',
};

test.beforeEach(async ({ shopPage, cartPage }) => {
  await shopPage.open();
  await shopPage.addProductToCart('Orbit Mechanical Keyboard');
  await shopPage.openCart();
  await cartPage.proceedToCheckout();
});

test('empty checkout shows field errors and focuses full name', async ({
  page,
  checkoutPage,
}) => {
  await expect(page).toHaveURL(/\/checkout$/);

  await checkoutPage.submitDeliveryDetails();

  await expect(checkoutPage.fullNameError).toHaveText(
    'Enter your full name.',
  );
  await expect(checkoutPage.emailError).toHaveText(
    'Enter your email address.',
  );
  await expect(checkoutPage.addressError).toHaveText(
    'Enter your delivery address.',
  );
  await expect(checkoutPage.cityError).toHaveText('Enter your city.');
  await expect(checkoutPage.postalCodeError).toHaveText(
    'Enter your PIN code.',
  );

  await expect(checkoutPage.fullNameInput).toBeFocused();
  await expect(checkoutPage.fullNameInput).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('valid delivery details show a success message', async ({
  checkoutPage,
}) => {
  await checkoutPage.fillDeliveryDetails(validDetails);
  await checkoutPage.submitDeliveryDetails();

  await expect(checkoutPage.successMessage).toBeVisible();

  for (const field of [
    'fullName',
    'email',
    'address',
    'city',
    'postalCode',
  ] as const) {
    await expect(checkoutPage.errorFor(field)).toHaveCount(0);
  }
});

type InvalidCase = {
  name: string;
  field: keyof DeliveryDetails;
  value: string;
  expectedError: string;
};

const invalidCases: InvalidCase[] = [
  {
    name: 'whitespace-only full name',
    field: 'fullName',
    value: '   ',
    expectedError: 'Enter your full name.',
  },
  {
    name: 'email without a domain',
    field: 'email',
    value: 'hello',
    expectedError: 'Enter an email address such as learner@example.com.',
  },
  {
    name: 'five-digit PIN',
    field: 'postalCode',
    value: '56001',
    expectedError: 'Enter six digits, starting with 1–9.',
  },
  {
    name: 'PIN starting with zero',
    field: 'postalCode',
    value: '012345',
    expectedError: 'Enter six digits, starting with 1–9.',
  },
];

for (const scenario of invalidCases) {
  test(`rejects ${scenario.name}`, async ({ checkoutPage }) => {
    await checkoutPage.fillDeliveryDetails({
      ...validDetails,
      [scenario.field]: scenario.value,
    });

    await checkoutPage.submitDeliveryDetails();

    await expect(
      checkoutPage.errorFor(scenario.field),
    ).toHaveText(scenario.expectedError);

    await expect(checkoutPage.successMessage).not.toBeVisible();
  });
}

test('user can correct an invalid email and validate delivery details', async ({
  checkoutPage,
}) => {
  await test.step('Submit an invalid email', async () => {
    await checkoutPage.fillDeliveryDetails({
      ...validDetails,
      email: 'hello',
    });

    await checkoutPage.submitDeliveryDetails();

    await expect(checkoutPage.emailError).toHaveText(
      'Enter an email address such as learner@example.com.',
    );

    await expect(checkoutPage.emailInput).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await expect(checkoutPage.emailInput).toBeFocused();
    await expect(checkoutPage.successMessage).not.toBeVisible();
  });

  await test.step('Correct the email', async () => {
    await checkoutPage.emailInput.fill(validDetails.email);

    await expect(checkoutPage.emailError).toHaveCount(0);

    await expect(checkoutPage.emailInput).toHaveAttribute(
      'aria-invalid',
      'false',
    );

    await expect(checkoutPage.emailInput).not.toHaveAttribute(
      'aria-describedby',
      'email-error',
    );

    // Correcting a field should not claim the form was submitted.
    await expect(checkoutPage.successMessage).not.toBeVisible();
  });

  await test.step('Submit the corrected details', async () => {
    await checkoutPage.submitDeliveryDetails();

    await expect(checkoutPage.successMessage).toBeVisible();
  });

  await test.step('Editing again clears the previous success message', async () => {
    await checkoutPage.emailInput.fill('invalid-again');

    await expect(checkoutPage.successMessage).not.toBeVisible();
    await expect(checkoutPage.emailError).toBeVisible();
  });
});