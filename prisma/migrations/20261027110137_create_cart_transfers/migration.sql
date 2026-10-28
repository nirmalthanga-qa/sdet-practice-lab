-- CreateTable
CREATE TABLE "CartTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartTransfer_userId_transferId_key" ON "CartTransfer"("userId", "transferId");

-- AddForeignKey
ALTER TABLE "CartTransfer" ADD CONSTRAINT "CartTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
