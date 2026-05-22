ALTER TABLE "OrderItem"   ADD COLUMN IF NOT EXISTS "addedByUserId" INTEGER;
ALTER TABLE "AccountItem" ADD COLUMN IF NOT EXISTS "addedByUserId" INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_addedByUserId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_addedByUserId_fkey"
      FOREIGN KEY ("addedByUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountItem_addedByUserId_fkey') THEN
    ALTER TABLE "AccountItem" ADD CONSTRAINT "AccountItem_addedByUserId_fkey"
      FOREIGN KEY ("addedByUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
