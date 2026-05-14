/*
  Warnings:

  - Added the required column `participants` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "rootMessageId" TEXT NOT NULL,
    "participants" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "detailsPath" TEXT NOT NULL,
    "lastReplyAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Thread_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Thread" ("channelId", "createdAt", "detailsPath", "id", "lastReplyAt", "replyCount", "rootMessageId", "updatedAt") SELECT "channelId", "createdAt", "detailsPath", "id", "lastReplyAt", "replyCount", "rootMessageId", "updatedAt" FROM "Thread";
DROP TABLE "Thread";
ALTER TABLE "new_Thread" RENAME TO "Thread";
CREATE UNIQUE INDEX "Thread_rootMessageId_key" ON "Thread"("rootMessageId");
CREATE INDEX "Thread_channelId_idx" ON "Thread"("channelId");
CREATE INDEX "Thread_rootMessageId_idx" ON "Thread"("rootMessageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
