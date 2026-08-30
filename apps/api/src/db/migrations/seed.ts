// apps/api/src/db/migrations/seed.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seed...');
  
  // Create default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@aiagentplatform.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  
  if (!existingAdmin) {
    // Note: Password should be hashed with bcrypt in actual implementation
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        planId: 'ENTERPRISE',
        role: 'ADMIN',
        isActive: true,
      },
    });
    logger.info(`✅ Created admin user: ${adminEmail}`);
  }
  
  // Seed plan history for analytics
  const plans = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  for (const plan of plans) {
    await prisma.$executeRaw`
      INSERT INTO plan_history (user_id, old_plan, new_plan, changed_by, changed_at)
      SELECT id, 'FREE', ${plan}, 'system', NOW()
      FROM users 
      WHERE plan_id = ${plan} AND NOT EXISTS (
        SELECT 1 FROM plan_history WHERE user_id = users.id AND new_plan = ${plan}
      )
    `;
  }
  
  logger.info('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    logger.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });