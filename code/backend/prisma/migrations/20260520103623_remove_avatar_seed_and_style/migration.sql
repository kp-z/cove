-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "projectIds" TEXT NOT NULL DEFAULT '[]',
    "configPath" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "avatarType" TEXT NOT NULL DEFAULT 'preset',
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("configPath", "createdAt", "createdBy", "displayName", "id", "name", "projectIds", "scope", "status") SELECT "configPath", "createdAt", "createdBy", "displayName", "id", "name", "projectIds", "scope", "status" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
CREATE INDEX "Agent_scope_idx" ON "Agent"("scope");
CREATE INDEX "Agent_name_idx" ON "Agent"("name");
CREATE INDEX "Agent_createdBy_idx" ON "Agent"("createdBy");
CREATE TABLE "new_Channel" (
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
    "avatarUrl" TEXT,
    "avatarType" TEXT NOT NULL DEFAULT 'preset',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Channel_parentChannelId_fkey" FOREIGN KEY ("parentChannelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("agentPool", "communicationRules", "conversationPool", "createdAt", "createdById", "createdByType", "description", "displayName", "icon", "id", "memberCount", "membersData", "messageCount", "metaCategory", "metaTags", "name", "parentChannelId", "projectId", "status", "taskPool", "type", "updatedAt", "workspace") SELECT "agentPool", "communicationRules", "conversationPool", "createdAt", "createdById", "createdByType", "description", "displayName", "icon", "id", "memberCount", "membersData", "messageCount", "metaCategory", "metaTags", "name", "parentChannelId", "projectId", "status", "taskPool", "type", "updatedAt", "workspace" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");
CREATE INDEX "Channel_type_idx" ON "Channel"("type");
CREATE INDEX "Channel_status_idx" ON "Channel"("status");
CREATE INDEX "Channel_parentChannelId_idx" ON "Channel"("parentChannelId");
CREATE INDEX "Channel_projectId_status_idx" ON "Channel"("projectId", "status");
CREATE INDEX "Channel_type_status_idx" ON "Channel"("type", "status");
CREATE TABLE "new_Realm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "limits" TEXT NOT NULL,
    "meta" TEXT,
    "avatarUrl" TEXT,
    "avatarType" TEXT NOT NULL DEFAULT 'preset',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Realm" ("createdAt", "description", "displayName", "id", "limits", "meta", "name", "ownerId", "settings", "status", "updatedAt", "visibility") SELECT "createdAt", "description", "displayName", "id", "limits", "meta", "name", "ownerId", "settings", "status", "updatedAt", "visibility" FROM "Realm";
DROP TABLE "Realm";
ALTER TABLE "new_Realm" RENAME TO "Realm";
CREATE UNIQUE INDEX "Realm_name_key" ON "Realm"("name");
CREATE INDEX "Realm_name_idx" ON "Realm"("name");
CREATE INDEX "Realm_ownerId_idx" ON "Realm"("ownerId");
CREATE INDEX "Realm_status_idx" ON "Realm"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "profilePath" TEXT NOT NULL,
    "passwordHash" TEXT,
    "lastLoginAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "avatarUrl" TEXT,
    "avatarType" TEXT NOT NULL DEFAULT 'preset',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "failedLoginAttempts", "id", "lastLoginAt", "lockedUntil", "passwordHash", "profilePath", "role", "status", "updatedAt", "username") SELECT "createdAt", "displayName", "email", "failedLoginAttempts", "id", "lastLoginAt", "lockedUntil", "passwordHash", "profilePath", "role", "status", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
