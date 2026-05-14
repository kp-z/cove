/*
  Warnings:

  - You are about to drop the column `projectId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `workspacePath` on the `Agent` table. All the data in the column will be lost.
  - Added the required column `category` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "rootMessageId" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "detailsPath" TEXT NOT NULL,
    "lastReplyAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "configPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("configPath", "createdAt", "id", "name", "status") SELECT "configPath", "createdAt", "id", "name", "status" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
CREATE INDEX "Agent_category_idx" ON "Agent"("category");
CREATE INDEX "Agent_name_idx" ON "Agent"("name");
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "projectId" TEXT,
    "parentChannelId" TEXT,
    "metadataPath" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Channel_parentChannelId_fkey" FOREIGN KEY ("parentChannelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("createdAt", "displayName", "id", "memberCount", "messageCount", "metadataPath", "name", "parentChannelId", "projectId", "status", "type", "updatedAt") SELECT "createdAt", "displayName", "id", "memberCount", "messageCount", "metadataPath", "name", "parentChannelId", "projectId", "status", "type", "updatedAt" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");
CREATE INDEX "Channel_type_idx" ON "Channel"("type");
CREATE INDEX "Channel_status_idx" ON "Channel"("status");
CREATE INDEX "Channel_parentChannelId_idx" ON "Channel"("parentChannelId");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "threadId" TEXT,
    "isThreadRoot" BOOLEAN NOT NULL DEFAULT false,
    "contentPath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "reactionCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("channelId", "contentPath", "contentType", "createdAt", "deletedAt", "id", "isEdited", "isThreadRoot", "reactionCount", "replyCount", "senderId", "senderType", "shortId", "status", "threadId", "updatedAt") SELECT "channelId", "contentPath", "contentType", "createdAt", "deletedAt", "id", "isEdited", "isThreadRoot", "reactionCount", "replyCount", "senderId", "senderType", "shortId", "status", "threadId", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_shortId_key" ON "Message"("shortId");
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt" DESC);
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");
CREATE INDEX "Message_status_idx" ON "Message"("status");
CREATE INDEX "Message_shortId_idx" ON "Message"("shortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Thread_rootMessageId_key" ON "Thread"("rootMessageId");

-- CreateIndex
CREATE INDEX "Thread_channelId_idx" ON "Thread"("channelId");

-- CreateIndex
CREATE INDEX "Thread_rootMessageId_idx" ON "Thread"("rootMessageId");
