-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('Workspace', 'Audio');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
