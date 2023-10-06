-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "discountId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER NOT NULL,
    "percentOff" REAL NOT NULL,
    "expires" DATETIME,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "commission" REAL NOT NULL,
    "codes" BLOB NOT NULL,
    "uses" TEXT NOT NULL,
    "userId" BIGINT
);
