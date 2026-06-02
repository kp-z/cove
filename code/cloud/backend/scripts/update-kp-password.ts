import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updatePassword() {
  try {
    console.log('🔍 Updating password for user kp...');

    const existing = await prisma.user.findFirst({
      where: { username: 'kp' }
    });

    if (!existing) {
      console.error('❌ User kp not found!');
      return;
    }

    const passwordHash = await bcrypt.hash('Kp0518!', 10);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        updatedAt: new Date()
      }
    });

    console.log('✅ Password updated successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Username: kp');
    console.log('   Password: Kp0518!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
