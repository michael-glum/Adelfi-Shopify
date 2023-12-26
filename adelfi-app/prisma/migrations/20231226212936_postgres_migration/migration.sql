-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "discountId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER NOT NULL,
    "percentOff" DOUBLE PRECISION NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "commission" DOUBLE PRECISION NOT NULL,
    "codes" BYTEA,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "webhookId" TEXT,
    "lastUpdated" TEXT,
    "lastPayment" DOUBLE PRECISION,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);
