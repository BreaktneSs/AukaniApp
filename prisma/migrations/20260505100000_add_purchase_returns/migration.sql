-- Add PURCHASE_RETURN to MovementType enum
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';

-- Add PURCHASE_RETURN_CREATE to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN_CREATE';

-- Add PURCHASE_RETURN to AuditEntity enum
ALTER TYPE "AuditEntity" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';

-- CreateTable PurchaseReturn
CREATE TABLE "PurchaseReturn" (
    "id"         SERIAL          NOT NULL,
    "purchaseId" INTEGER         NOT NULL,
    "userId"     INTEGER         NOT NULL,
    "notes"      TEXT,
    "total"      DECIMAL(10,2)   NOT NULL,
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable PurchaseReturnItem
CREATE TABLE "PurchaseReturnItem" (
    "id"        SERIAL          NOT NULL,
    "returnId"  INTEGER         NOT NULL,
    "productId" INTEGER         NOT NULL,
    "quantity"  INTEGER         NOT NULL,
    "unitCost"  DECIMAL(10,2)   NOT NULL,
    CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseReturn_purchaseId_idx" ON "PurchaseReturn"("purchaseId");
CREATE INDEX "PurchaseReturn_userId_idx"     ON "PurchaseReturn"("userId");
CREATE INDEX "PurchaseReturn_createdAt_idx"  ON "PurchaseReturn"("createdAt");

CREATE INDEX "PurchaseReturnItem_returnId_idx"  ON "PurchaseReturnItem"("returnId");
CREATE INDEX "PurchaseReturnItem_productId_idx" ON "PurchaseReturnItem"("productId");

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "PurchaseReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
