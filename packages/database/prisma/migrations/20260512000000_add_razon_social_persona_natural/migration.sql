-- AlterTable
ALTER TABLE "counterparties" ADD COLUMN "razonSocial" TEXT,
                             ADD COLUMN "isPersonaNatural" BOOLEAN NOT NULL DEFAULT false;
