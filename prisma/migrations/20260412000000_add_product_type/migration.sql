-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'SERVICE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'PHYSICAL';
