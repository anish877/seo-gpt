/*
  Warnings:

  - You are about to drop the `CompetitorAIQueryResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompetitorPhraseAnalysis` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CompetitorAIQueryResult" DROP CONSTRAINT "CompetitorAIQueryResult_competitorAnalysisId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitorAIQueryResult" DROP CONSTRAINT "CompetitorAIQueryResult_phraseId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitorPhraseAnalysis" DROP CONSTRAINT "CompetitorPhraseAnalysis_competitorAnalysisId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitorPhraseAnalysis" DROP CONSTRAINT "CompetitorPhraseAnalysis_phraseId_fkey";

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "isCompanyDomain" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "CompetitorAIQueryResult";

-- DropTable
DROP TABLE "CompetitorPhraseAnalysis";

-- CreateIndex
CREATE INDEX "Domain_userId_isCompanyDomain_idx" ON "Domain"("userId", "isCompanyDomain");
