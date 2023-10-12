/*
  Warnings:

  - You are about to drop the column `currency` on the `Partnership` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Partnership` table. All the data in the column will be lost.

*/
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
    "totalSales" REAL,
    "currSales" REAL
);
INSERT INTO "new_Partnership" ("autoRenew", "codes", "commission", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", "totalSales", "usageLimit") SELECT "autoRenew", "codes", "commission", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", "totalSales", "usageLimit" FROM "Partnership";
DROP TABLE "Partnership";
ALTER TABLE "new_Partnership" RENAME TO "Partnership";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
