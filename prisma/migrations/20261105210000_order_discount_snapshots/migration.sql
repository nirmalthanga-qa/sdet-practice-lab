BEGIN;
ALTER TABLE "Order" ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "discountType" "DiscountType",
  ADD COLUMN "discountValue" INTEGER,
  ADD COLUMN "discountPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_totals" CHECK (
  "discountPaise" >= 0 AND "discountPaise" <= "subtotalPaise"
  AND "totalPaise" = "subtotalPaise" - "discountPaise"
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_snapshot" CHECK (
  ("discountCode" IS NULL AND "discountType" IS NULL AND "discountValue" IS NULL AND "discountPaise" = 0)
  OR ("discountCode" IS NOT NULL AND "discountType" IS NOT NULL AND "discountValue" IS NOT NULL AND
    (("discountType" = 'PERCENTAGE' AND "discountValue" BETWEEN 1 AND 100)
      OR ("discountType" = 'FIXED' AND "discountValue" > 0)))
);
COMMIT;
