-- AlterTable
ALTER TABLE "AIQueryResult" ADD COLUMN     "competitorMatchScore" DOUBLE PRECISION,
ADD COLUMN     "competitorUrls" JSONB,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "domainRank" INTEGER,
ADD COLUMN     "foundDomains" JSONB,
ADD COLUMN     "sources" JSONB;

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "modelPerformance" JSONB NOT NULL,
    "competitorAnalysis" JSONB NOT NULL,
    "performanceInsights" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "analysisMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPerformance" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER,
    "model" TEXT NOT NULL,
    "totalQueries" INTEGER NOT NULL,
    "rankedQueries" INTEGER NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "avgLatency" DOUBLE PRECISION NOT NULL,
    "avgCost" DOUBLE PRECISION NOT NULL,
    "presenceRate" DOUBLE PRECISION NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorTracking" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER,
    "competitorDomain" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "threatLevel" TEXT NOT NULL,
    "marketShare" DOUBLE PRECISION NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceInsight" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER,
    "insightType" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "potential" TEXT,
    "action" TEXT,
    "risk" TEXT,
    "mitigation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisReport_domainId_idx" ON "AnalysisReport"("domainId");

-- CreateIndex
CREATE INDEX "ModelPerformance_domainId_idx" ON "ModelPerformance"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPerformance_domainId_model_key" ON "ModelPerformance"("domainId", "model");

-- CreateIndex
CREATE INDEX "CompetitorTracking_domainId_idx" ON "CompetitorTracking"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorTracking_domainId_competitorDomain_key" ON "CompetitorTracking"("domainId", "competitorDomain");

-- CreateIndex
CREATE INDEX "PerformanceInsight_domainId_insightType_idx" ON "PerformanceInsight"("domainId", "insightType");

-- AddForeignKey
ALTER TABLE "AnalysisReport" ADD CONSTRAINT "AnalysisReport_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPerformance" ADD CONSTRAINT "ModelPerformance_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorTracking" ADD CONSTRAINT "CompetitorTracking_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceInsight" ADD CONSTRAINT "PerformanceInsight_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
