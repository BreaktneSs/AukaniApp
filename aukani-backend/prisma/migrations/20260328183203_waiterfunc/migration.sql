-- CreateEnum
CREATE TYPE "SubShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'DISPATCHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SubShift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "parentShiftId" INTEGER NOT NULL,
    "status" "SubShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SubShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOrder" (
    "id" SERIAL NOT NULL,
    "subShiftId" INTEGER NOT NULL,
    "cashReceived" DECIMAL(10,2) NOT NULL,
    "change" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),

    CONSTRAINT "DispatchOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchItem" (
    "id" SERIAL NOT NULL,
    "dispatchOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "DispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubShift_userId_idx" ON "SubShift"("userId");

-- CreateIndex
CREATE INDEX "SubShift_parentShiftId_idx" ON "SubShift"("parentShiftId");

-- CreateIndex
CREATE INDEX "SubShift_status_idx" ON "SubShift"("status");

-- CreateIndex
CREATE INDEX "DispatchOrder_subShiftId_idx" ON "DispatchOrder"("subShiftId");

-- CreateIndex
CREATE INDEX "DispatchOrder_status_idx" ON "DispatchOrder"("status");

-- CreateIndex
CREATE INDEX "DispatchOrder_createdAt_idx" ON "DispatchOrder"("createdAt");

-- CreateIndex
CREATE INDEX "DispatchItem_dispatchOrderId_idx" ON "DispatchItem"("dispatchOrderId");

-- AddForeignKey
ALTER TABLE "SubShift" ADD CONSTRAINT "SubShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubShift" ADD CONSTRAINT "SubShift_parentShiftId_fkey" FOREIGN KEY ("parentShiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_subShiftId_fkey" FOREIGN KEY ("subShiftId") REFERENCES "SubShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_dispatchOrderId_fkey" FOREIGN KEY ("dispatchOrderId") REFERENCES "DispatchOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
