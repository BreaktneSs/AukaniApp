-- Add device tracking fields to Shift
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "deviceIp" TEXT;

-- Partial unique index: only one OPEN shift per deviceId (NULL deviceId is excluded)
CREATE UNIQUE INDEX IF NOT EXISTS "Shift_deviceId_open_unique"
  ON "Shift" ("deviceId")
  WHERE status = 'OPEN' AND "deviceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Shift_deviceId_idx" ON "Shift" ("deviceId");
