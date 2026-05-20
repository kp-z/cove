-- AlterTable: Realm - Move from hybrid storage to database-only storage
-- Add new JSON columns for settings, limits, and meta
-- Remove configPath column

-- Step 1: Add new columns with default values
ALTER TABLE "Realm" ADD COLUMN "settings" TEXT NOT NULL DEFAULT '{"allow_invites":true,"require_approval":false,"default_channel_id":"channel-nexus-general"}';
ALTER TABLE "Realm" ADD COLUMN "limits" TEXT NOT NULL DEFAULT '{"max_members":1000,"max_channels":100,"max_agents":50}';
ALTER TABLE "Realm" ADD COLUMN "meta" TEXT DEFAULT '{"tags":["platform","default"],"icon":"🌐"}';

-- Step 2: Drop the configPath column
ALTER TABLE "Realm" DROP COLUMN "configPath";
