BEGIN;

ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey",
  ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- The foreign key's SET NULL update runs this trigger in the same transaction
-- as account deletion, including deletion performed outside the API.
CREATE FUNCTION anonymize_detached_customer_order() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."fullName" := 'Deleted customer';
  NEW."email" := '';
  NEW."address" := '';
  NEW."city" := '';
  NEW."postalCode" := '';
  NEW."requestHash" := '';
  RETURN NEW;
END;
$$;

CREATE TRIGGER anonymize_detached_customer_order
  BEFORE UPDATE OF "userId" ON "Order"
  FOR EACH ROW WHEN (OLD."userId" IS NOT NULL AND NEW."userId" IS NULL)
  EXECUTE FUNCTION anonymize_detached_customer_order();

COMMIT;
