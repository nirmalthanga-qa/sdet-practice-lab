BEGIN;
CREATE TABLE "Category" (
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("name")
);
CREATE UNIQUE INDEX "Category_normalizedName_key" ON "Category"("normalizedName");
INSERT INTO "Category" ("name", "normalizedName") VALUES ('Workspace', 'workspace'), ('Audio', 'audio');
ALTER TABLE "Product" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_fkey"
  FOREIGN KEY ("category") REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
DROP TYPE "ProductCategory";
COMMIT;
