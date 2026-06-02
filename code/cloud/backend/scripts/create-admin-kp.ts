import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔍 Checking for user kp...');

    const existing = await prisma.user.findFirst({
      where: { username: 'kp' }
    });

    if (existing) {
      console.log('✏️  User kp exists, updating password...');
      const passwordHash = await bcrypt.hash('Kp05181!', 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: 'owner',
          status: 'active',
          updatedAt: new Date()
        }
      });
      console.log('✅ Password updated successfully!');
    } else {
      console.log('➕ Creating new admin user kp...');
      const passwordHash = await bcrypt.hash('Kp05181!', 10);
      const userId = `user-kp-${Date.now()}`;

      await prisma.user.create({
        data: {
          id: userId,
          username: 'kp',
          email: 'kp@cove.local',
          displayName: 'KP',
          role: 'owner',
          status: 'active',
          profilePath: `storage/users/${userId}.json`,
          passwordHash,
          failedLoginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Login credentials:');
    console.log('   Username: kp');
    console.log('   Password: Kp05181!');
    console.log('\n⚠️  Please change this password after first login!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
