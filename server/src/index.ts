import express from 'express';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import cookieParser from 'cookie-parser';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import process from 'node:process';

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
  } catch (error) {
    console.error('Failed to load products:', error);

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
  } catch (error) {
    console.error('Failed to load product:', error);

    response.status(503).json({
      error: {
        code: 'CATALOGUE_UNAVAILABLE',
        message: 'Products are temporarily unavailable. Please try again.',
      },
    });
  }
});

app.listen(port, host, () => {
  console.log(`API listening on ${host}:${port}`);
});