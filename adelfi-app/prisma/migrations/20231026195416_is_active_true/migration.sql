/*
  Warnings:

  - Made the column `expires` on table `Partnership` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partnership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "discountId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER NOT NULL,
    "percentOff" REAL NOT NULL,
    "expires" DATETIME NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "commission" REAL NOT NULL,
    "codes" BLOB,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "currSales" REAL NOT NULL DEFAULT 0,
    "webhookId" TEXT,
    "lastUpdated" TEXT,
    "lastPayment" REAL
);
INSERT INTO "new_Partnership" ("autoRenew", "codes", "commission", "currSales", "discountId", "expires", "id", "isActive", "lastPayment", "lastUpdated", "percentOff", "shop", "title", "totalSales", "usageLimit", "webhookId") SELECT "autoRenew", "codes", "commission", "currSales", "discountId", "expires", "id", "isActive", "lastPayment", "lastUpdated", "percentOff", "shop", "title", "totalSales", "usageLimit", "webhookId" FROM "Partnership";
DROP TABLE "Partnership";
ALTER TABLE "new_Partnership" RENAME TO "Partnership";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
