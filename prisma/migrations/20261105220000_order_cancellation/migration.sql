ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';
ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancellation_timestamp" CHECK (
  ("status"::text = 'CONFIRMED' AND "cancelledAt" IS NULL)
  OR ("status"::text = 'CANCELLED' AND "cancelledAt" IS NOT NULL)
);
