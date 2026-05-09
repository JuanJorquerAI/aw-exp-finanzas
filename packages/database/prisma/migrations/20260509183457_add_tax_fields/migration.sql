-- CreateEnum
CREATE TYPE "TransactionDocType" AS ENUM ('FACTURA', 'BOLETA_HONORARIOS', 'OTRO');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "docType" "TransactionDocType" DEFAULT 'OTRO',
ADD COLUMN     "isAfecta" BOOLEAN NOT NULL DEFAULT true;
