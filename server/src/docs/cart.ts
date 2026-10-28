const jsonResponse = (
  description: string,
  schema: object,
) => ({
  description,
  content: {
    'application/json': { schema },
  },
});

const errorResponse = (
  description: string,
  code: string,
  message: string,
) => ({
  description,
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/ApiError',
      },
      example: {
        error: { code, message },
      },
    },
  },
});

const unavailableResponse = (
  code: string,
  message: string,
) => ({
  description:
    'The session could not be checked, or the cart operation could not be completed.',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/ApiError',
      },
      examples: {
        sessionUnavailable: {
          value: {
            error: {
              code: 'SESSION_UNAVAILABLE',
              message:
                'We couldn’t check your session. Please try again.',
            },
          },
        },
        operationFailed: {
          value: {
            error: { code, message },
          },
        },
      },
    },
  },
});

const jsonBody = (schema: object) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

const security = [{ sessionCookie: [] }];

const unauthenticated = errorResponse(
  'The session is missing, invalid or expired.',
  'UNAUTHENTICATED',
  'Please sign in to continue.',
);

const unsupportedMediaType = errorResponse(
  'The request must use application/json.',
  'UNSUPPORTED_MEDIA_TYPE',
  'Send the request body as application/json.',
);

const productIdParameter = {
  name: 'productId',
  in: 'path',
  required: true,
  description: 'Product ID from the catalogue.',
  schema: {
    type: 'string',
  },
  example: 'keyboard',
};

const quantitySchema = {
  type: 'integer',
  minimum: 1,
  maximum: 2147483647,
  example: 1,
};

export const cartSchemas = {
  CartItem: {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
      productId: {
        type: 'string',
        example: 'keyboard',
      },
      quantity: quantitySchema,
    },
  },

  CartQuantityRequest: {
    type: 'object',
    required: ['quantity'],
    properties: {
      quantity: {
        ...quantitySchema,
        description:
          'The desired total quantity, not an amount to add.',
      },
    },
  },

  CartTransferRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['transferId', 'items'],
    properties: {
      transferId: {
        type: 'string',
        format: 'uuid',
        description: [
          'Generate a new UUID for a new transfer.',
          'Reuse the same UUID and items when retrying that transfer.',
        ].join(' '),
      },

      items: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        description:
          'Each productId must appear only once in the array.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['productId', 'quantity'],
          properties: {
            productId: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'keyboard',
            },
            quantity: quantitySchema,
          },
        },
      },
    },
  },

  CartTransferResult: {
    type: 'object',
    required: ['transferId', 'transferredProductCount'],
    properties: {
      transferId: {
        type: 'string',
        format: 'uuid',
      },
      transferredProductCount: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description:
          'Number of distinct products in the transfer, not the total quantity of units.',
        example: 1,
      },
    },
  },
};

export const cartPaths = {
  '/cart': {
    get: {
      tags: ['Cart'],
      operationId: 'getCustomerCart',
      summary: 'Get your account cart',
      description: [
        'Returns the signed-in customer’s saved cart items.',
        'Guest browser carts are not returned by this endpoint.',
        'Prices and product details come from the catalogue.',
        'An empty cart returns an empty items array.',
      ].join(' '),

      security,

      responses: {
        '200': jsonResponse('Cart retrieved.', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CartItem',
              },
            },
          },
        }),

        '401': unauthenticated,

        '503': unavailableResponse(
          'CART_UNAVAILABLE',
          'We couldn’t load your cart. Please try again.',
        ),
      },
    },

    delete: {
      tags: ['Cart'],
      operationId: 'clearCustomerCart',
      summary: 'Clear your account cart',
      description: [
        'Removes all items from the signed-in customer’s cart.',
        'Also succeeds if the cart is already empty.',
        'Does not change product stock or saved orders.',
      ].join(' '),

      security,

      responses: {
        '204': {
          description: 'Cart cleared. No response body.',
        },

        '401': unauthenticated,

        '503': unavailableResponse(
          'CART_CLEAR_FAILED',
          'We couldn’t clear your cart. Please try again.',
        ),
      },
    },
  },

  '/cart/items/{productId}': {
    put: {
      tags: ['Cart'],
      operationId: 'setCustomerCartQuantity',
      summary: 'Add a product or set its quantity',
      description: [
        'Creates a cart item or replaces its existing quantity.',
        'Sending quantity 2 sets the total to 2; it does not add 2.',
        'The requested quantity must not exceed current stock.',
        'Adding items to a cart does not reserve inventory.',
      ].join(' '),

      security,
      parameters: [productIdParameter],

      requestBody: jsonBody({
        $ref: '#/components/schemas/CartQuantityRequest',
      }),

      responses: {
        '200': jsonResponse('Cart quantity saved.', {
          type: 'object',
          required: ['item'],
          properties: {
            item: {
              $ref: '#/components/schemas/CartItem',
            },
          },
        }),

        '400': errorResponse(
          'Quantity is invalid.',
          'VALIDATION_ERROR',
          'Quantity must be a positive whole number.',
        ),

        '401': unauthenticated,

        '404': errorResponse(
          'The product does not exist.',
          'PRODUCT_NOT_FOUND',
          'This product is no longer available.',
        ),

        '409': {
          description:
            'The requested quantity exceeds available stock.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['error'],
                properties: {
                  error: {
                    type: 'object',
                    required: [
                      'code',
                      'message',
                      'availableStock',
                    ],
                    properties: {
                      code: {
                        type: 'string',
                        enum: ['INSUFFICIENT_STOCK'],
                      },
                      message: {
                        type: 'string',
                      },
                      availableStock: {
                        type: 'integer',
                        description:
                          'Stock available when the request was checked.',
                      },
                    },
                  },
                },
              },
              examples: {
                stockLimit: {
                  value: {
                    error: {
                      code: 'INSUFFICIENT_STOCK',
                      message: 'Only 2 units are available.',
                      availableStock: 2,
                    },
                  },
                },
                outOfStock: {
                  value: {
                    error: {
                      code: 'INSUFFICIENT_STOCK',
                      message: 'This product is out of stock.',
                      availableStock: 0,
                    },
                  },
                },
              },
            },
          },
        },

        '415': unsupportedMediaType,

        '503': unavailableResponse(
          'CART_UPDATE_FAILED',
          'We couldn’t update your cart. Please try again.',
        ),
      },
    },

    delete: {
      tags: ['Cart'],
      operationId: 'removeCustomerCartItem',
      summary: 'Remove a product from your cart',
      description: [
        'Removes the matching item from the signed-in customer’s cart.',
        'Also succeeds if the item is not in the cart.',
        'Does not change product stock.',
      ].join(' '),

      security,
      parameters: [productIdParameter],

      responses: {
        '204': {
          description:
            'The item is absent from the cart. No response body.',
        },

        '401': unauthenticated,

        '503': unavailableResponse(
          'CART_REMOVE_FAILED',
          'We couldn’t remove this item. Please try again.',
        ),
      },
    },
  },

  '/cart/transfer': {
    post: {
      tags: ['Cart'],
      operationId: 'transferGuestCart',
      summary: 'Transfer guest items into your account cart',
      description: [
        'Adds the supplied quantities to existing account quantities.',
        'The combined quantities must fit within current stock.',
        'All items and the transfer receipt are saved in one transaction.',
        'A successful retry with the same transferId and items returns',
        'the recorded result without adding the quantities again.',
        'Item array order does not affect payload matching.',
        'A completed transferId cannot be reused with different items.',
        'This endpoint does not clear browser storage or reduce stock.',
      ].join(' '),

      security,

      requestBody: jsonBody({
        $ref: '#/components/schemas/CartTransferRequest',
      }),

      responses: {
        '200': jsonResponse(
          'Transfer completed, or a previous matching result was replayed.',
          {
            $ref: '#/components/schemas/CartTransferResult',
          },
        ),

        '400': errorResponse(
          'The transfer request is invalid.',
          'VALIDATION_ERROR',
          'Provide a valid transfer ID and 1–100 unique products with positive whole-number quantities.',
        ),

        '401': unauthenticated,

        '409': {
          description: [
            'The transfer conflicts with a previous transfer',
            'or current product availability.',
          ].join(' '),

          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError',
              },
              examples: {
                transferIdReused: {
                  value: {
                    error: {
                      code: 'TRANSFER_ID_REUSED',
                      message:
                        'This transfer ID was already used with different items.',
                    },
                  },
                },
                productUnavailable: {
                  value: {
                    error: {
                      code: 'PRODUCT_UNAVAILABLE',
                      message:
                        'Product missing-product is no longer available.',
                    },
                  },
                },
                insufficientStock: {
                  value: {
                    error: {
                      code: 'INSUFFICIENT_STOCK',
                      message:
                        'Orbit Mechanical Keyboard: only 2 available, but the combined quantity is 3.',
                    },
                  },
                },
              },
            },
          },
        },

        '415': unsupportedMediaType,

        '503': unavailableResponse(
          'TRANSFER_FAILED',
          'We couldn’t confirm the transfer. Retry with the same transfer ID and items.',
        ),
      },
    },
  },
};