/*
  Warnings:

  - A unique constraint covering the columns `[url,userId]` on the table `Domain` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Domain_url_key";

-- CreateIndex
CREATE INDEX "Domain_userId_idx" ON "Domain"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_url_userId_key" ON "Domain"("url", "userId");
