-- AlterTable: Add new fields to Channel table
-- Remove metadataPath and memberIds, add all content fields directly

-- Step 1: Add new columns with default values
ALTER TABLE "Channel" ADD COLUMN "description" TEXT;
ALTER TABLE "Channel" ADD COLUMN "icon" TEXT;
ALTER TABLE "Channel" ADD COLUMN "membersData" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Channel" ADD COLUMN "agentPool" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Channel" ADD COLUMN "taskPool" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Channel" ADD COLUMN "conversationPool" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Channel" ADD COLUMN "communicationRules" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Channel" ADD COLUMN "workspace" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Channel" ADD COLUMN "metaTags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Channel" ADD COLUMN "metaCategory" TEXT;
ALTER TABLE "Channel" ADD COLUMN "createdById" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "Channel" ADD COLUMN "createdByType" TEXT NOT NULL DEFAULT 'system';

-- Step 2: Drop old columns
-- Create a new table with the desired schema
CREATE TABLE "Channel_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "projectId" TEXT,
    "parentChannelId" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "membersData" TEXT NOT NULL DEFAULT '[]',
    "agentPool" TEXT NOT NULL DEFAULT '[]',
    "taskPool" TEXT NOT NULL DEFAULT '[]',
    "conversationPool" TEXT NOT NULL DEFAULT '[]',
    "communicationRules" TEXT NOT NULL DEFAULT '{}',
    "workspace" TEXT NOT NULL DEFAULT '{}',
    "metaTags" TEXT NOT NULL DEFAULT '[]',
    "metaCategory" TEXT,
    "createdById" TEXT NOT NULL DEFAULT 'system',
    "createdByType" TEXT NOT NULL DEFAULT 'system',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Channel_parentChannelId_fkey" FOREIGN KEY ("parentChannelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from old table to new table
INSERT INTO "Channel_new" (
    "id", "name", "displayName", "type", "status", "projectId", "parentChannelId",
    "description", "icon", "membersData", "agentPool", "taskPool", "conversationPool",
    "communicationRules", "workspace", "metaTags", "metaCategory", "createdById", "createdByType",
    "messageCount", "memberCount", "createdAt", "updatedAt"
)
SELECT
    "id", "name", "displayName", "type", "status", "projectId", "parentChannelId",
    "description", "icon", "membersData", "agentPool", "taskPool", "conversationPool",
    "communicationRules", "workspace", "metaTags", "metaCategory", "createdById", "createdByType",
    "messageCount", "memberCount", "createdAt", "updatedAt"
FROM "Channel";

-- Drop old table and rename new table
DROP TABLE "Channel";
ALTER TABLE "Channel_new" RENAME TO "Channel";

-- Recreate indexes
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");
CREATE INDEX "Channel_type_idx" ON "Channel"("type");
CREATE INDEX "Channel_status_idx" ON "Channel"("status");
CREATE INDEX "Channel_parentChannelId_idx" ON "Channel"("parentChannelId");
CREATE INDEX "Channel_projectId_status_idx" ON "Channel"("projectId", "status");
CREATE INDEX "Channel_type_status_idx" ON "Channel"("type", "status");
