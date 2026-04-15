-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum: AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_CLOSE';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_ADD_ITEMS';

-- AlterEnum: AuditEntity
ALTER TYPE "AuditEntity" ADD VALUE 'ACCOUNT';

-- CreateTable: Account
CREATE TABLE "Account" (
    "id"        SERIAL NOT NULL,
    "shiftId"   INTEGER NOT NULL,
    "name"      TEXT NOT NULL,
    "status"    "AccountStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt"  TIMESTAMP(3),
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AccountItem
CREATE TABLE "AccountItem" (
    "id"        SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity"  INTEGER NOT NULL,
    "price"     DECIMAL(10,2) NOT NULL,
    "addedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable: DispatchOrder add accountId
ALTER TABLE "DispatchOrder" ADD COLUMN "accountId" INTEGER;

-- AddForeignKey: Account → Shift
ALTER TABLE "Account" ADD CONSTRAINT "Account_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AccountItem → Account
ALTER TABLE "AccountItem" ADD CONSTRAINT "AccountItem_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AccountItem → Product
ALTER TABLE "AccountItem" ADD CONSTRAINT "AccountItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: DispatchOrder → Account
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Account_shiftId_idx" ON "Account"("shiftId");
CREATE INDEX "Account_status_idx"  ON "Account"("status");
CREATE INDEX "AccountItem_accountId_idx" ON "AccountItem"("accountId");
