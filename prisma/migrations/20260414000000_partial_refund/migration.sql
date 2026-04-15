-- Add PARTIAL_REFUND to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIAL_REFUND';

-- Add refundedQty to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "refundedQty" INTEGER NOT NULL DEFAULT 0;

-- Add SALE_REFUND to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE 'SALE_REFUND';
