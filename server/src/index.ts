import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi.js';

const app = express();

const trustProxySetting = process.env.TRUST_PROXY_HOPS ?? '0';

if (trustProxySetting !== '0' && trustProxySetting !== '1') {
  throw new Error('TRUST_PROXY_HOPS must be 0 or 1.');
}

app.set('trust proxy', Number(trustProxySetting));

const port = Number(process.env.PORT ?? '3001');
const host = process.env.HOST ?? '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a whole number between 1 and 65535.');
}

const serveWebSetting = process.env.SERVE_WEB ?? 'false';

if (serveWebSetting !== 'true' && serveWebSetting !== 'false') {
  throw new Error('SERVE_WEB must be true or false.');
}

const serveWeb = serveWebSetting === 'true';

const productSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  pricePaise: true,
  stock: true,
  icon: true,
} as const;

app.disable('x-powered-by');
app.use(express.json());
app.use(cookieParser());

app.get('/api/openapi.json', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.status(200).json(openApiDocument);
});

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'SDET Practice Lab API',
    swaggerOptions: {
      validatorUrl: null,
      persistAuthorization: false,
      withCredentials: true,
      displayRequestDuration: true,
    },
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'sdet-practice-lab-api',
  });
});

app.get('/api/products', async (_request, response) => {
  try {
    const products = await prisma.product.findMany({
      select: productSelect,
      orderBy: [
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    response.status(200).json({
      products,
      total: products.length,
    });
  } catch {
    console.error('Failed to load products.');

    response.status(503).json({
      error: {
        code: 'CATALOGUE_UNAVAILABLE',
        message: 'Products are temporarily unavailable. Please try again.',
      },
    });
  }
});

app.get('/api/products/:productId', async (request, response) => {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: request.params.productId,
      },
      select: productSelect,
    });

    if (!product) {
      response.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'We couldn’t find a product with that ID.',
        },
      });

      return;
    }

    response.status(200).json({ product });
  } catch {
    console.error('Failed to load product.');

    response.status(503).json({
      error: {
        code: 'CATALOGUE_UNAVAILABLE',
        message: 'Products are temporarily unavailable. Please try again.',
      },
    });
  }
});

// Unknown API routes must return an API error,
// rather than the React application's HTML.
app.use('/api', (_request, response) => {
  response.status(404).json({
    error: {
      code: 'API_ROUTE_NOT_FOUND',
      message: 'This API endpoint does not exist.',
    },
  });
});

if (serveWeb) {
  // Start the application from the project root.
  const webDirectory = path.resolve(process.cwd(), 'dist');
  const indexFile = path.join(webDirectory, 'index.html');

  if (!existsSync(indexFile)) {
    throw new Error(
      'Frontend build is missing. Run npm run build before starting with SERVE_WEB=true.',
    );
  }

  // Missing assets should return 404, not index.html.
  app.use(
    '/assets',
    express.static(path.join(webDirectory, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
    }),
  );

  app.use('/assets', (_request, response) => {
    response.status(404).end();
  });

  // Includes files copied from public/, such as delivery-help.html.
  app.use(
    express.static(webDirectory, {
      index: false,
      maxAge: 0,
    }),
  );

  // Let React Router handle frontend routes, including direct visits
  // and refreshes on /shop, /checkout, and /orders/:orderId.
  app.get('/{*splat}', (request, response, next) => {
    if (!request.accepts('html')) {
      next();
      return;
    }

    response.set('Cache-Control', 'no-cache');

    response.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

app.listen(port, host, () => {
  console.log(`Application listening on ${host}:${port}`);
});