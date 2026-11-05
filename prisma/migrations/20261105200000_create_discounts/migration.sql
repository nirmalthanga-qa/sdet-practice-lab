BEGIN;
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TABLE "Discount" (
  "code" TEXT NOT NULL,
  "type" "DiscountType" NOT NULL,
  "percent" INTEGER,
  "amountPaise" INTEGER,
  "minimumSubtotalPaise" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Discount_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "Discount_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  CONSTRAINT "Discount_minimum_nonnegative" CHECK ("minimumSubtotalPaise" >= 0),
  CONSTRAINT "Discount_value_valid" CHECK (
    ("type" = 'PERCENTAGE' AND "percent" IS NOT NULL AND "percent" BETWEEN 1 AND 100 AND "amountPaise" IS NULL)
    OR ("type" = 'FIXED' AND "amountPaise" IS NOT NULL AND "amountPaise" > 0 AND "percent" IS NULL)
  )
);
COMMIT;
