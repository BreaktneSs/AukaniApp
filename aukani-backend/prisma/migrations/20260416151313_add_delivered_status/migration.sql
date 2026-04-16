-- AlterEnum
ALTER TYPE "DispatchStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "DispatchOrder" ADD COLUMN     "deliveredAt" TIMESTAMP(3);
