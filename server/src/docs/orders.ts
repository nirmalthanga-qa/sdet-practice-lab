const security = [{ sessionCookie: [] }];
const maxInteger = 2147483647;

const moneySchema = {
  type: 'integer',
  minimum: 0,
  maximum: maxInteger,
  description: 'Amount in integer paise.',
};

const quantitySchema = {
  type: 'integer',
  minimum: 1,
  maximum: maxInteger,
};

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
    'The session could not be checked, or the order operation failed.',
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

const unauthenticated = errorResponse(
  'The session is missing, invalid or expired.',
  'UNAUTHENTICATED',
  'Please sign in to continue.',
);

const orderResponseSchema = {
  type: 'object',
  required: ['order'],
  properties: {
    order: {
      $ref: '#/components/schemas/Order',
    },
  },
};

const orderProperties = {
  id: {
    type: 'string',
    format: 'uuid',
  },
  status: {
    type: 'string',
    enum: ['CONFIRMED'],
  },
  paymentStatus: {
    type: 'string',
    enum: ['SIMULATED_PAID'],
  },
  currency: {
    type: 'string',
    enum: ['INR'],
  },
  totalPaise: moneySchema,
  createdAt: {
    type: 'string',
    format: 'date-time',
  },
};

export const orderSchemas = {
  DeliveryDetails: {
    type: 'object',
    additionalProperties: false,
    required: [
      'fullName',
      'email',
      'address',
      'city',
      'postalCode',
    ],
    properties: {
      fullName: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Trimmed before validation.',
        example: 'Practice Learner',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
        description: [
          'Trimmed and converted to lowercase.',
          'May differ from the account email.',
          'Does not determine order ownership.',
        ].join(' '),
        example: 'learner@example.com',
      },
      address: {
        type: 'string',
        minLength: 1,
        maxLength: 300,
        description: 'Trimmed before validation.',
        example: '123 Demo Street',
      },
      city: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Trimmed before validation.',
        example: 'Bengaluru',
      },
      postalCode: {
        type: 'string',
        pattern: '^[1-9][0-9]{5}$',
        description:
          'Trimmed before validation. Six-digit Indian PIN format; delivery availability is not checked.',
        example: '560001',
      },
    },
  },

  CheckoutItem: {
    type: 'object',
    additionalProperties: false,
    required: ['productId', 'quantity', 'unitPricePaise'],
    properties: {
      productId: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        example: 'keyboard',
      },
      quantity: {
        ...quantitySchema,
        example: 1,
      },
      unitPricePaise: {
        ...moneySchema,
        description:
          'Expected unit price. Must match the current catalogue price.',
        example: 649900,
      },
    },
  },

  CheckoutRequest: {
    type: 'object',
    additionalProperties: false,
    required: [
      'checkoutId',
      'paymentMethod',
      'delivery',
      'items',
    ],
    properties: {
      checkoutId: {
        type: 'string',
        format: 'uuid',
        description: [
          'Generate a new UUID for a new checkout.',
          'Reuse the same ID and details when retrying an uncertain request.',
        ].join(' '),
      },
      paymentMethod: {
        type: 'string',
        enum: ['simulated'],
        description: 'No real payment is processed.',
      },
      delivery: {
        $ref: '#/components/schemas/DeliveryDetails',
      },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        description: [
          'Must match every item and quantity in the account cart.',
          'Each productId must appear only once.',
        ].join(' '),
        items: {
          $ref: '#/components/schemas/CheckoutItem',
        },
      },
    },
  },

  OrderItem: {
    type: 'object',
    required: [
      'productId',
      'productName',
      'unitPricePaise',
      'quantity',
      'lineTotalPaise',
    ],
    properties: {
      productId: {
        type: 'string',
        example: 'keyboard',
      },
      productName: {
        type: 'string',
        description: 'Product name saved at purchase time.',
        example: 'Orbit Mechanical Keyboard',
      },
      unitPricePaise: moneySchema,
      quantity: quantitySchema,
      lineTotalPaise: {
        ...moneySchema,
        description: 'Saved unit price multiplied by quantity.',
      },
    },
  },

  Order: {
    type: 'object',
    required: [
      'id',
      'status',
      'paymentStatus',
      'currency',
      'subtotalPaise',
      'totalPaise',
      'createdAt',
      'delivery',
      'items',
    ],
    properties: {
      ...orderProperties,
      subtotalPaise: moneySchema,
      delivery: {
        $ref: '#/components/schemas/DeliveryDetails',
      },
      items: {
        type: 'array',
        description: 'Purchased snapshots, sorted by product ID.',
        items: {
          $ref: '#/components/schemas/OrderItem',
        },
      },
    },
  },

  OrderSummary: {
    type: 'object',
    required: [
      'id',
      'status',
      'paymentStatus',
      'currency',
      'totalPaise',
      'createdAt',
      'itemCount',
    ],
    properties: {
      ...orderProperties,
      itemCount: {
        type: 'integer',
        minimum: 1,
        description:
          'Sum of purchased quantities, not the number of distinct products.',
      },
    },
  },

  CheckoutValidationError: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message', 'fields'],
        properties: {
          code: {
            type: 'string',
            enum: ['VALIDATION_ERROR'],
          },
          message: {
            type: 'string',
          },
          fields: {
            type: 'object',
            description:
              'Top-level field names mapped to validation messages. May be empty for root-level validation errors.',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export const orderPaths = {
  '/orders': {
    post: {
      tags: ['Orders'],
      operationId: 'createOrder',
      summary: 'Place a simulated order',
      description: [
        'Places an order from the authenticated customer’s account cart.',
        'The items and quantities must match the entire current cart.',
        'Expected prices must match current catalogue prices.',
        'Stock is reduced, the order is saved and purchased cart items',
        'are removed in one transaction.',
        'No real payment, delivery fee or additional tax is charged.',
        'Total equals subtotal.',
        'A matching retry returns the existing order before checking the cart.',
        'Reusing a completed checkout ID with different normalized details',
        'returns a conflict. Item array order does not affect matching.',
        'After an uncertain failure, retry the same ID and details.',
      ].join(' '),

      security,

      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CheckoutRequest',
            },
          },
        },
      },

      responses: {
        '201': jsonResponse(
          'A new order was created.',
          orderResponseSchema,
        ),

        '200': jsonResponse(
          'A previous matching order was returned. Stock is not reduced again.',
          orderResponseSchema,
        ),

        '400': {
          description:
            'Checkout validation failed or the order value exceeds the supported integer limit.',
          content: {
            'application/json': {
              schema: {
                anyOf: [
                  {
                    $ref:
                      '#/components/schemas/CheckoutValidationError',
                  },
                  {
                    $ref: '#/components/schemas/ApiError',
                  },
                ],
              },
              examples: {
                validationError: {
                  value: {
                    error: {
                      code: 'VALIDATION_ERROR',
                      message:
                        'Please correct your checkout details.',
                      fields: {
                        checkoutId: ['Invalid UUID'],
                      },
                    },
                  },
                },
                orderLimitExceeded: {
                  value: {
                    error: {
                      code: 'ORDER_LIMIT_EXCEEDED',
                      message:
                        'The order value exceeds the supported limit.',
                    },
                  },
                },
              },
            },
          },
        },

        '401': unauthenticated,

        '409': {
          description:
            'Checkout conflicts with saved request details or current cart, price or stock state.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError',
              },
              examples: {
                checkoutIdReused: {
                  value: {
                    error: {
                      code: 'CHECKOUT_ID_REUSED',
                      message:
                        'This checkout ID was already used with different details.',
                    },
                  },
                },
                cartEmpty: {
                  value: {
                    error: {
                      code: 'CART_EMPTY',
                      message:
                        'Your cart is empty. Add a product before placing an order.',
                    },
                  },
                },
                cartChanged: {
                  value: {
                    error: {
                      code: 'CART_CHANGED',
                      message:
                        'Your cart has changed. Review it before placing your order.',
                    },
                  },
                },
                priceChanged: {
                  value: {
                    error: {
                      code: 'PRICE_CHANGED',
                      message:
                        'A product price has changed. Review your cart before continuing.',
                    },
                  },
                },
                itemUnavailable: {
                  value: {
                    error: {
                      code: 'ITEM_UNAVAILABLE',
                      message:
                        'Orbit Mechanical Keyboard is no longer available in the requested quantity.',
                    },
                  },
                },
                insufficientStock: {
                  value: {
                    error: {
                      code: 'INSUFFICIENT_STOCK',
                      message:
                        'A product no longer has enough stock. Review your cart.',
                    },
                  },
                },
              },
            },
          },
        },

        '415': errorResponse(
          'The request must use application/json.',
          'UNSUPPORTED_MEDIA_TYPE',
          'Send the request body as application/json.',
        ),

        '503': unavailableResponse(
          'CHECKOUT_UNAVAILABLE',
          'We couldn’t confirm your order. Retry with the same checkout ID and details.',
        ),
      },
    },

    get: {
      tags: ['Orders'],
      operationId: 'getOrders',
      summary: 'Get your latest 50 orders',
      description: [
        'Returns only the signed-in customer’s orders.',
        'Ordered by creation time descending, then ID descending.',
        'Returns at most 50 summaries.',
        'There are no pagination query parameters.',
        'An account with no orders receives an empty orders array.',
      ].join(' '),

      security,

      responses: {
        '200': jsonResponse('Order history retrieved.', {
          type: 'object',
          required: ['orders'],
          properties: {
            orders: {
              type: 'array',
              maxItems: 50,
              items: {
                $ref: '#/components/schemas/OrderSummary',
              },
            },
          },
        }),

        '401': unauthenticated,

        '503': unavailableResponse(
          'ORDER_HISTORY_UNAVAILABLE',
          'We couldn’t load your orders. Please try again.',
        ),
      },
    },
  },

  '/orders/{orderId}': {
    get: {
      tags: ['Orders'],
      operationId: 'getOrder',
      summary: 'Get your saved order',
      description: [
        'Returns a saved receipt owned by the signed-in customer.',
        'A missing order or an order owned by another customer returns 404.',
        'Product names and prices are snapshots saved at purchase time.',
      ].join(' '),

      security,

      parameters: [
        {
          name: 'orderId',
          in: 'path',
          required: true,
          description:
            'Order ID returned by checkout or order history.',
          schema: {
            type: 'string',
          },
        },
      ],

      responses: {
        '200': jsonResponse(
          'Order retrieved.',
          orderResponseSchema,
        ),

        '401': unauthenticated,

        '404': errorResponse(
          'No order with this ID belongs to the signed-in customer.',
          'ORDER_NOT_FOUND',
          'We couldn’t find that order.',
        ),

        '503': unavailableResponse(
          'ORDER_UNAVAILABLE',
          'We couldn’t load your order. Please try again.',
        ),
      },
    },
  },
};