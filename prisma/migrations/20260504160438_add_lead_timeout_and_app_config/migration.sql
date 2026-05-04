-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "redirectedAt" TIMESTAMP(3),
ADD COLUMN     "uazapiToken" TEXT;

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);
