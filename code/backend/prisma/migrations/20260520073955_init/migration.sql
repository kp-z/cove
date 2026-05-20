-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
