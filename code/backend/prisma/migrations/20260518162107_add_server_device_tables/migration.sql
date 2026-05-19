-- CreateTable
CREATE TABLE "Realm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "configPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "platform" TEXT,
    "configPath" TEXT NOT NULL,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Realm_name_key" ON "Server"("name");

-- CreateIndex
CREATE INDEX "Realm_name_idx" ON "Server"("name");

-- CreateIndex
CREATE INDEX "Realm_ownerId_idx" ON "Server"("ownerId");

-- CreateIndex
CREATE INDEX "Realm_status_idx" ON "Server"("status");

-- CreateIndex
CREATE INDEX "Device_serverId_idx" ON "Device"("serverId");

-- CreateIndex
CREATE INDEX "Device_name_idx" ON "Device"("name");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_type_idx" ON "Device"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serverId_name_key" ON "Device"("serverId", "name");
