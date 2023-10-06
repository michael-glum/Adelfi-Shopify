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
    "uses" TEXT NOT NULL,
    "userId" BIGINT
);
INSERT INTO "new_Partnership" ("autoRenew", "codes", "commission", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", "usageLimit", "userId", "uses") SELECT "autoRenew", "codes", "commission", "discountId", "expires", "id", "isActive", "percentOff", "shop", "title", "usageLimit", "userId", "uses" FROM "Partnership";
DROP TABLE "Partnership";
ALTER TABLE "new_Partnership" RENAME TO "Partnership";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
