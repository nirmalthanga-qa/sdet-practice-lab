import 'dotenv/config';
import process from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 5000,
});

export const prisma = new PrismaClient({ adapter });