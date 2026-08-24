-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_2FA_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_2FA_FAIL';
ALTER TYPE "AuditAction" ADD VALUE 'TWOFA_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'TWOFA_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'TWOFA_ADMIN_DISABLED';
