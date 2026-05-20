/*
  Warnings:

  - You are about to drop the column `category` on the `Agent` table. All the data in the column will be lost.

*/
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
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("configPath", "createdAt", "displayName", "id", "name", "status") SELECT "configPath", "createdAt", "displayName", "id", "name", "status" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
CREATE INDEX "Agent_scope_idx" ON "Agent"("scope");
CREATE INDEX "Agent_name_idx" ON "Agent"("name");
CREATE INDEX "Agent_createdBy_idx" ON "Agent"("createdBy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
