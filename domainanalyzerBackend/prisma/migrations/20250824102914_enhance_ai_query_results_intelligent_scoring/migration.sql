-- AlterTable
ALTER TABLE "AIQueryResult" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "contextQualityScore" DOUBLE PRECISION,
ADD COLUMN     "domainSentiment" TEXT,
ADD COLUMN     "intelligentScore" DOUBLE PRECISION,
ADD COLUMN     "mentionTypeScore" DOUBLE PRECISION,
ADD COLUMN     "positionScore" DOUBLE PRECISION,
ADD COLUMN     "prominenceScore" DOUBLE PRECISION,
ADD COLUMN     "rankingFactors" JSONB;
