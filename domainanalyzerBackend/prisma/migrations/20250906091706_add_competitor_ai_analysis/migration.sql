-- CreateTable
CREATE TABLE "CompetitorAIQueryResult" (
    "id" SERIAL NOT NULL,
    "competitorDomain" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "phraseText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "presence" INTEGER NOT NULL DEFAULT 0,
    "relevance" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "domainRank" INTEGER,
    "foundDomains" JSONB,
    "sources" JSONB,
    "competitorUrls" JSONB,
    "competitorMatchScore" DOUBLE PRECISION,
    "comprehensiveness" DOUBLE PRECISION,
    "context" TEXT,
    "mentions" INTEGER,
    "highlightContext" TEXT,
    "detectionMethod" TEXT,
    "domainSentiment" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "rankingFactors" JSONB,
    "competitors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitorAnalysisId" INTEGER,
    "phraseId" INTEGER,

    CONSTRAINT "CompetitorAIQueryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorPhraseAnalysis" (
    "id" SERIAL NOT NULL,
    "competitorDomain" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "phraseText" TEXT NOT NULL,
    "phraseId" INTEGER,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    "totalMentions" INTEGER NOT NULL DEFAULT 0,
    "avgRelevance" DOUBLE PRECISION NOT NULL,
    "avgAccuracy" DOUBLE PRECISION NOT NULL,
    "avgSentiment" DOUBLE PRECISION NOT NULL,
    "avgOverall" DOUBLE PRECISION NOT NULL,
    "visibilityScore" DOUBLE PRECISION NOT NULL,
    "mentionRate" DOUBLE PRECISION NOT NULL,
    "topModels" JSONB,
    "competitorComparison" JSONB,
    "insights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitorAnalysisId" INTEGER,

    CONSTRAINT "CompetitorPhraseAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorAIQueryResult_competitorAnalysisId_idx" ON "CompetitorAIQueryResult"("competitorAnalysisId");

-- CreateIndex
CREATE INDEX "CompetitorAIQueryResult_phraseId_idx" ON "CompetitorAIQueryResult"("phraseId");

-- CreateIndex
CREATE INDEX "CompetitorAIQueryResult_competitorDomain_idx" ON "CompetitorAIQueryResult"("competitorDomain");

-- CreateIndex
CREATE INDEX "CompetitorAIQueryResult_targetDomain_idx" ON "CompetitorAIQueryResult"("targetDomain");

-- CreateIndex
CREATE INDEX "CompetitorPhraseAnalysis_competitorAnalysisId_idx" ON "CompetitorPhraseAnalysis"("competitorAnalysisId");

-- CreateIndex
CREATE INDEX "CompetitorPhraseAnalysis_phraseId_idx" ON "CompetitorPhraseAnalysis"("phraseId");

-- CreateIndex
CREATE INDEX "CompetitorPhraseAnalysis_competitorDomain_idx" ON "CompetitorPhraseAnalysis"("competitorDomain");

-- CreateIndex
CREATE INDEX "CompetitorPhraseAnalysis_targetDomain_idx" ON "CompetitorPhraseAnalysis"("targetDomain");

-- AddForeignKey
ALTER TABLE "CompetitorAIQueryResult" ADD CONSTRAINT "CompetitorAIQueryResult_competitorAnalysisId_fkey" FOREIGN KEY ("competitorAnalysisId") REFERENCES "CompetitorAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAIQueryResult" ADD CONSTRAINT "CompetitorAIQueryResult_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "Phrase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPhraseAnalysis" ADD CONSTRAINT "CompetitorPhraseAnalysis_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "Phrase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPhraseAnalysis" ADD CONSTRAINT "CompetitorPhraseAnalysis_competitorAnalysisId_fkey" FOREIGN KEY ("competitorAnalysisId") REFERENCES "CompetitorAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
