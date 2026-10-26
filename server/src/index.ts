import express from 'express';
import { products } from '../../src/data/products.js';

const app = express();
const port = 3001;

app.disable('x-powered-by');
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'sdet-practice-lab-api',
  });
});

app.get('/api/products', (_request, response) => {
  response.status(200).json({
    products,
    total: products.length,
  });
});

app.get('/api/products/:productId', (request, response) => {
  const product = products.find(
    (item) => item.id === request.params.productId,
  );

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
});

app.listen(port, '127.0.0.1', () => {
  console.log(`API running at http://127.0.0.1:${port}`);
});