-- CreateEnum
CREATE TYPE "CampaignNodeSource" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "CampaignPageType" AS ENUM ('PILLAR', 'SUBPAGE');

-- CreateTable
CREATE TABLE "CampaignTopic" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" "CampaignNodeSource" NOT NULL DEFAULT 'MANUAL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPage" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "pageType" "CampaignPageType" NOT NULL DEFAULT 'PILLAR',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "aiSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" "CampaignNodeSource" NOT NULL DEFAULT 'MANUAL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignKeyword" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER,
    "pageId" INTEGER,
    "term" TEXT NOT NULL,
    "volume" INTEGER,
    "difficulty" TEXT,
    "intent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" "CampaignNodeSource" NOT NULL DEFAULT 'MANUAL',
    "aiMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignTopic_campaignId_idx" ON "CampaignTopic"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPage_topicId_idx" ON "CampaignPage"("topicId");

-- CreateIndex
CREATE INDEX "CampaignKeyword_topicId_idx" ON "CampaignKeyword"("topicId");

-- CreateIndex
CREATE INDEX "CampaignKeyword_pageId_idx" ON "CampaignKeyword"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignKeyword_term_topicId_pageId_key" ON "CampaignKeyword"("term", "topicId", "pageId");

-- AddForeignKey
ALTER TABLE "CampaignTopic" ADD CONSTRAINT "CampaignTopic_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPage" ADD CONSTRAINT "CampaignPage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CampaignTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignKeyword" ADD CONSTRAINT "CampaignKeyword_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CampaignTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignKeyword" ADD CONSTRAINT "CampaignKeyword_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CampaignPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
