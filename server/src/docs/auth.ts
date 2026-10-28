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

const jsonBody = (schema: object) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

const userResponseSchema = {
  type: 'object',
  required: ['user'],
  properties: {
    user: {
      $ref: '#/components/schemas/User',
    },
  },
};

const unsupportedMediaType = errorResponse(
  'The request must use application/json.',
  'UNSUPPORTED_MEDIA_TYPE',
  'Send the request body as application/json.',
);

const unauthenticated = errorResponse(
  'The session is missing, invalid or expired.',
  'UNAUTHENTICATED',
  'Please sign in to continue.',
);

export const authSchemas = {
  User: {
    type: 'object',
    required: ['id', 'fullName', 'email'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      fullName: {
        type: 'string',
        example: 'Practice Learner',
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'learner@example.com',
      },
    },
  },

  RegistrationRequest: {
    type: 'object',
    required: ['fullName', 'email', 'password'],
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
        description:
          'Trimmed and converted to lowercase before validation.',
        example: 'learner@example.com',
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        maxLength: 128,
        writeOnly: true,
        description:
          'Use a fictional demo password that you do not use elsewhere.',
      },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
        description:
          'Trimmed and converted to lowercase before validation.',
        example: 'learner@example.com',
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 1,
        maxLength: 128,
        writeOnly: true,
      },
    },
  },
};

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Authentication'],
      operationId: 'registerUser',
      summary: 'Create an account',
      description: [
        'Creates a customer account.',
        'Registration does not sign the customer in.',
        'Email addresses must be unique.',
        'Limited to 10 requests per 15 minutes per detected client IP.',
      ].join(' '),

      requestBody: jsonBody({
        $ref: '#/components/schemas/RegistrationRequest',
      }),

      responses: {
        '201': jsonResponse('Account created.', {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              allOf: [
                { $ref: '#/components/schemas/User' },
                {
                  type: 'object',
                  required: ['createdAt'],
                  properties: {
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              ],
            },
          },
        }),

        '400': jsonResponse('Registration validation failed.', {
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
                  example: 'Please correct the registration details.',
                },
                fields: {
                  type: 'object',
                  description:
                    'Field names mapped to arrays of validation messages.',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        }),

        '409': errorResponse(
          'The email is already registered.',
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists.',
        ),

        '415': unsupportedMediaType,

        '429': errorResponse(
          'Registration rate limit exceeded.',
          'TOO_MANY_REQUESTS',
          'Too many registration attempts. Please try again later.',
        ),

        '500': errorResponse(
          'Account creation failed.',
          'REGISTRATION_FAILED',
          'We couldn’t create your account. Please try again.',
        ),
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Authentication'],
      operationId: 'loginUser',
      summary: 'Sign in',
      description: [
        'Validates credentials and issues the sdet_session cookie.',
        'The browser stores the cookie automatically.',
        'Use the same hostname for documentation and API requests.',
        'Limited to 10 requests per 15 minutes per detected client IP.',
      ].join(' '),

      requestBody: jsonBody({
        $ref: '#/components/schemas/LoginRequest',
      }),

      responses: {
        '200': {
          ...jsonResponse('Signed in successfully.', userResponseSchema),
          headers: {
            'Set-Cookie': {
              description: [
                'Sets the HttpOnly sdet_session cookie.',
                'Uses SameSite=Lax and Path=/.',
                'Secure is enabled on the live HTTPS deployment.',
              ].join(' '),
              schema: { type: 'string' },
            },
          },
        },

        '400': errorResponse(
          'Login input is invalid.',
          'VALIDATION_ERROR',
          'Enter a valid email address and password.',
        ),

        '401': errorResponse(
          'Unknown email or incorrect password.',
          'INVALID_CREDENTIALS',
          'Email or password is incorrect.',
        ),

        '415': unsupportedMediaType,

        '429': errorResponse(
          'Login rate limit exceeded.',
          'TOO_MANY_REQUESTS',
          'Too many login attempts. Please try again later.',
        ),

        '500': errorResponse(
          'Login failed.',
          'LOGIN_FAILED',
          'We couldn’t sign you in. Please try again.',
        ),
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Authentication'],
      operationId: 'getCurrentUser',
      summary: 'Get the signed-in customer',
      description: [
        'Checks the current session and returns the customer.',
        'Sign in through /auth/login first.',
        'Swagger UI relies on the browser-managed cookie;',
        'do not paste a session token into the Authorize dialog.',
      ].join(' '),

      security: [{ sessionCookie: [] }],

      responses: {
        '200': jsonResponse(
          'The session is valid.',
          userResponseSchema,
        ),

        '401': unauthenticated,

        '503': errorResponse(
          'The session could not be checked. The cookie is retained.',
          'SESSION_UNAVAILABLE',
          'We couldn’t check your session. Please try again.',
        ),
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Authentication'],
      operationId: 'logoutUser',
      summary: 'Sign out',
      description: [
        'Revokes the current session, if present, and clears its cookie.',
        'Also succeeds when no session cookie is present.',
        'Send an application/json body such as {}.',
      ].join(' '),

      requestBody: jsonBody({
        type: 'object',
        example: {},
      }),

      responses: {
        '204': {
          description:
            'Signed out. The response has no body and clears the session cookie.',
        },

        '415': unsupportedMediaType,

        '503': errorResponse(
          'Logout failed. The session cookie is retained.',
          'LOGOUT_FAILED',
          'We couldn’t sign you out. Please try again.',
        ),
      },
    },
  },
};