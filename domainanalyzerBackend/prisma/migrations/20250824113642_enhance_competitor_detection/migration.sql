-- AlterTable
ALTER TABLE "AIQueryResult" ADD COLUMN     "competitorCount" INTEGER,
ADD COLUMN     "competitorDomains" JSONB,
ADD COLUMN     "competitorMentions" JSONB,
ADD COLUMN     "competitorNames" JSONB;
