-- AlterTable
ALTER TABLE "AIQueryResult" ADD COLUMN     "comprehensiveness" DOUBLE PRECISION,
ADD COLUMN     "context" TEXT,
ADD COLUMN     "detectionMethod" TEXT,
ADD COLUMN     "highlightContext" TEXT,
ADD COLUMN     "mentions" INTEGER;
