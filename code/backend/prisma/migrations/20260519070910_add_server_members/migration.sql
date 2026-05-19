-- CreateTable
CREATE TABLE "realm_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "realm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "custom_permissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joined_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "meta" TEXT,
    CONSTRAINT "realm_members_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "Realm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "server_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "server_members_server_id_idx" ON "server_members"("realm_id");

-- CreateIndex
CREATE INDEX "server_members_user_id_idx" ON "server_members"("user_id");

-- CreateIndex
CREATE INDEX "server_members_role_idx" ON "server_members"("role");

-- CreateIndex
CREATE INDEX "server_members_status_idx" ON "server_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "server_members_server_id_user_id_key" ON "server_members"("realm_id", "user_id");
