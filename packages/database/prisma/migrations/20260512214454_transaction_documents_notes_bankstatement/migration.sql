/*
  Warnings:

  - You are about to drop the column `documentId` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_documentId_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "documentId",
ADD COLUMN     "bankStatementId" TEXT;

-- CreateTable
CREATE TABLE "transaction_documents" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "note" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_notes" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT,
    "filename" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_documents_transactionId_documentId_key" ON "transaction_documents"("transactionId", "documentId");

-- CreateIndex
CREATE INDEX "transaction_notes_transactionId_idx" ON "transaction_notes"("transactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "bank_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_documents" ADD CONSTRAINT "transaction_documents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_documents" ADD CONSTRAINT "transaction_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_notes" ADD CONSTRAINT "transaction_notes_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
