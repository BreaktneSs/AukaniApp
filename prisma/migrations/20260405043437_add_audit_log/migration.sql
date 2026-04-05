-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE', 'USER_PASSWORD_CHANGE', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'SALE_CREATE', 'SALE_CANCEL', 'SHIFT_OPEN', 'SHIFT_CLOSE', 'SUBSHIFT_OPEN', 'SUBSHIFT_CLOSE', 'DISPATCH_CREATE', 'DISPATCH_CONFIRM', 'DISPATCH_CANCEL', 'INVENTORY_ENTRY', 'INVENTORY_EXIT');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('AUTH', 'USER', 'PRODUCT', 'ORDER', 'SHIFT', 'SUBSHIFT', 'DISPATCH', 'INVENTORY');

-- CreateTable
CREATE TABLE "DispatchPayment" (
    "id" SERIAL NOT NULL,
    "dispatchOrderId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "DispatchPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" INTEGER,
    "entityLabel" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchPayment_dispatchOrderId_idx" ON "DispatchPayment"("dispatchOrderId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DispatchPayment" ADD CONSTRAINT "DispatchPayment_dispatchOrderId_fkey" FOREIGN KEY ("dispatchOrderId") REFERENCES "DispatchOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPayment" ADD CONSTRAINT "DispatchPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
