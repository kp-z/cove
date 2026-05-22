#!/usr/bin/env node

/**
 * Migration script: Add default avatar to existing users
 *
 * This script scans all user JSON files in ~/.cove/storage/users/
 * and adds a default avatar if one doesn't exist.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_DIR = path.join(process.env.HOME, '.cove', 'storage', 'users');
const DEFAULT_AVATAR = {
  url: 'storage/avatars/presets/default-user.svg',
  type: 'default'
};

function migrateUserAvatars() {
  console.log('🔄 Starting user avatar migration...\n');

  if (!fs.existsSync(USERS_DIR)) {
    console.error(`❌ Users directory not found: ${USERS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${files.length} user files\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(USERS_DIR, file);

    try {
      // Read user data
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Check if avatar exists
      if (data.avatar) {
        console.log(`⏭️  ${file}: Already has avatar, skipping`);
        skippedCount++;
        continue;
      }

      // Add default avatar
      data.avatar = DEFAULT_AVATAR;

      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      console.log(`✅ ${file}: Added default avatar`);
      updatedCount++;
    } catch (error) {
      console.error(`❌ ${file}: Error - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);
  console.log(`   📁 Total:   ${files.length}`);
  console.log('\n✨ Migration complete!');
}

// Run migration
migrateUserAvatars();
