CREATE TABLE "Wishlist" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" >= 0),
  CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WishlistItem" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "position" INTEGER NOT NULL CHECK ("position" >= 0),
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("userId", "productId"),
  CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Wishlist"("userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");
CREATE INDEX "WishlistItem_userId_position_idx" ON "WishlistItem"("userId", "position");
