import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
} from '../lib/password.js';
import {
  createSession,
  hashSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../lib/session.js';

export const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many registration attempts. Please try again later.',
    },
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again later.',
    },
  },
});

const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Enter your full name.')
    .max(100, 'Full name must be 100 characters or fewer.'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'Email must be 254 characters or fewer.')
    .pipe(z.email('Enter a valid email address.')),

  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters.')
    .max(128, 'Password must contain 128 characters or fewer.'),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email()),

  password: z.string().min(1).max(128),
});

let dummyPasswordHash: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHash) {
    dummyPasswordHash = hashPassword(
      'This is an unused dummy login password.',
    ).catch((error: unknown) => {
      dummyPasswordHash = undefined;
      throw error;
    });
  }

  return dummyPasswordHash;
}

// Register a customer.
authRouter.post(
  '/register',
  registrationLimiter,
  async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Send the request body as application/json.',
        },
      });

      return;
    }

    const result = registrationSchema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please correct the registration details.',
          fields: z.flattenError(result.error).fieldErrors,
        },
      });

      return;
    }

    const { fullName, email, password } = result.data;

    try {
      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
        },
      });

      response.status(201).json({ user });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        response.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email already exists.',
          },
        });

        return;
      }

      console.error('Registration failed.');

      response.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'We couldn’t create your account. Please try again.',
        },
      });
    }
  },
);

// Sign in and issue a session cookie.
authRouter.post('/login', loginLimiter, async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Send the request body as application/json.',
      },
    });

    return;
  }

  const result = loginSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid email address and password.',
      },
    });

    return;
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
      },
    });

    const passwordHash =
      user?.passwordHash ?? (await getDummyPasswordHash());

    const passwordMatches = await verifyPassword(
      passwordHash,
      password,
    );

    if (!user || !passwordMatches) {
      response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        },
      });

      return;
    }

    const session = await createSession(user.id);

    response.cookie(SESSION_COOKIE_NAME, session.token, {
      ...sessionCookieOptions,
      expires: session.expiresAt,
    });

    response.status(200).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch {
    console.error('Login failed.');

    response.status(500).json({
      error: {
        code: 'LOGIN_FAILED',
        message: 'We couldn’t sign you in. Please try again.',
      },
    });
  }
});

// Return the customer associated with the current session.
authRouter.get('/me', async (request, response) => {
  const token = readSessionToken(request);

  if (!token) {
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions,
    );

    response.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      },
    });

    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) {
        await prisma.session.deleteMany({
          where: { id: session.id },
        });
      }

      response.clearCookie(
        SESSION_COOKIE_NAME,
        sessionCookieOptions,
      );

      response.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Please sign in to continue.',
        },
      });

      return;
    }

    response.status(200).json({
      user: session.user,
    });
  } catch {
    console.error('Session lookup failed.');

    response.status(503).json({
      error: {
        code: 'SESSION_UNAVAILABLE',
        message: 'We couldn’t check your session. Please try again.',
      },
    });
  }
});

// Revoke the current session and clear its cookie.
authRouter.post('/logout', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Send the request body as application/json.',
      },
    });

    return;
  }

  const token = readSessionToken(request);

  try {
    if (token) {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashSessionToken(token),
        },
      });
    }

    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions,
    );

    response.status(204).end();
  } catch {
    console.error('Logout failed.');

    response.status(503).json({
      error: {
        code: 'LOGOUT_FAILED',
        message: 'We couldn’t sign you out. Please try again.',
      },
    });
  }
});