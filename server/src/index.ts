import { categoriesRouter, adminCategoriesRouter } from './routes/categories.js';
import { categoryName } from './validation/category.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { cartRouter } from './routes/cart.js';
import { adminProductsRouter } from './routes/adminProducts.js';
import { adminInventoryRouter } from './routes/adminInventory.js';
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
app.use('/api/admin/inventory', adminInventoryRouter);
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/admin/categories', adminCategoriesRouter);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'sdet-practice-lab-api',
  });
});

function positiveQueryInteger(maximum: number) {
  return z.string().regex(/^[1-9]\d*$/).transform(Number)
    .pipe(z.number().int().max(maximum)).optional();
}

const catalogueQuery = z.strictObject({
  page: positiveQueryInteger(1_000_000),
  pageSize: positiveQueryInteger(100),
  q: z.string().trim().optional(),
  category: categoryName.optional(),
  inStock: z.enum(['true', 'false']).optional(),
  maxPricePaise: z.string().regex(/^\d+$/).transform(Number)
    .pipe(z.number().int().min(0).max(2147483647)).optional(),
  sort: z.enum(['default', 'price-asc', 'price-desc']).optional(),
});

app.get('/api/products', async (request, response) => {
  const parsed = catalogueQuery.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      error: { code: 'INVALID_CATALOGUE_QUERY', message: 'Check the catalogue query parameters.' },
    });
    return;
  }

  const { q, category, inStock, maxPricePaise, sort } = parsed.data;
  try {
    const where = {
        name: q ? { contains: q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const } : undefined,
        category,
        stock: inStock === 'true' ? { gt: 0 } : undefined,
        pricePaise: maxPricePaise === undefined ? undefined : { lte: maxPricePaise },
      };
    const options = {
      where,
      select: productSelect,
      orderBy: [
        ...(sort === 'price-asc' ? [{ pricePaise: 'asc' as const }] : []),
        ...(sort === 'price-desc' ? [{ pricePaise: 'desc' as const }] : []),
        { displayOrder: 'asc' as const },
        { id: 'asc' as const },
      ],
    };

    if (parsed.data.page === undefined && parsed.data.pageSize === undefined) {
      const products = await prisma.product.findMany(options);
      response.status(200).json({ products, total: products.length });
      return;
    }

    const page = parsed.data.page ?? 1;
    const pageSize = parsed.data.pageSize ?? 6;
    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        ...options,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ], { isolationLevel: 'RepeatableRead' });

    response.status(200).json({
      products, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
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