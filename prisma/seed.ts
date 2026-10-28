import 'dotenv/config';
import process from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../server/src/generated/prisma/client.js';
import { products } from '../server/src/data/products.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 5000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.product.createMany({
    data: products.map((product, index) => ({
      ...product,
      displayOrder: index + 1,
    })),
    skipDuplicates: true,
  });

  console.log(`Inserted ${result.count} new products.`);

  const savedProducts = await prisma.product.findMany({
    orderBy: [
      { displayOrder: 'asc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      pricePaise: true,
      stock: true,
      displayOrder: true,
    },
  });

  console.table(savedProducts);
}

try {
  await main();
} catch (error) {
  console.error('Product seeding failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}