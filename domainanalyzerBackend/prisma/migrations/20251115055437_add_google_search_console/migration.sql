-- CreateTable
CREATE TABLE "GoogleSearchConsoleConnection" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "googleEmail" TEXT,
    "googleUserId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "selectedProperty" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSearchConsoleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSearchConsoleConnection_userId_key" ON "GoogleSearchConsoleConnection"("userId");

-- CreateIndex
CREATE INDEX "GoogleSearchConsoleConnection_userId_idx" ON "GoogleSearchConsoleConnection"("userId");

-- AddForeignKey
ALTER TABLE "GoogleSearchConsoleConnection" ADD CONSTRAINT "GoogleSearchConsoleConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
