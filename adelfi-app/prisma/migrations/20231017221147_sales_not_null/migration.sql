-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partnership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "discountId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER NOT NULL,
    "percentOff" REAL NOT NULL,
    "expires" DATETIME,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "commission" REAL NOT NULL,
    "codes" BLOB,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "currSales" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Partnership" ("autoRenew", "codes", "commission", "currSales", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", "totalSales", "usageLimit") SELECT "autoRenew", "codes", "commission", coalesce("currSales", 0) AS "currSales", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", coalesce("totalSales", 0) AS "totalSales", "usageLimit" FROM "Partnership";
DROP TABLE "Partnership";
ALTER TABLE "new_Partnership" RENAME TO "Partnership";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
