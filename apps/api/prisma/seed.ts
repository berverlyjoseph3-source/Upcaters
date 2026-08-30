// enterprise-ai-agent-platform/apps/api/prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Create default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@aiagentplatform.com';
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  
  if (!adminUser) {
    // Generate API key for admin
    const apiKey = `ak_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyPrefix = apiKey.substring(0, 8);
    
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        planId: 'ENTERPRISE',
        role: UserRole.ADMIN,
        isActive: true,
        apiKey: apiKeyHash,
        apiKeyPrefix: apiKeyPrefix,
        metadata: {
          createdVia: 'seed',
          isSystemAdmin: true,
        },
      },
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
    console.log(`🔑 Admin API Key (save this): ${apiKey}`);
  }
  
  // Create default notification preferences for admin
  const existingPrefs = await prisma.notificationPreference.findUnique({
    where: { userId: adminUser.id },
  });
  
  if (!existingPrefs) {
    await prisma.notificationPreference.create({
      data: {
        userId: adminUser.id,
        emailNotifications: true,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notifyOnLimit: true,
        dailyDigest: true,
        weeklyReport: true,
      },
    });
    console.log(`✅ Created notification preferences for admin`);
  }
  
  // Seed plan history for existing users
  const users = await prisma.user.findMany({
    where: {
      planHistory: {
        none: {},
      },
    },
  });
  
  for (const user of users) {
    await prisma.planHistory.create({
      data: {
        userId: user.id,
        oldPlan: 'FREE',
        newPlan: user.planId,
        changedBy: 'system',
        reason: 'Initial seed',
        changedAt: user.createdAt,
      },
    });
  }
  console.log(`✅ Seeded plan history for ${users.length} users`);
  
  // Create system webhook events table documentation
  await prisma.$executeRaw`
    COMMENT ON TABLE webhook_events IS 'Stores incoming webhook events for idempotent processing from Stripe, Google, LinkedIn, etc.';
    COMMENT ON TABLE rate_limits IS 'Tracks API rate limits per user/IP/endpoint with sliding windows';
    COMMENT ON TABLE agent_memory IS 'Vector-enabled memory storage for agent context using pgvector';
  `;
  
  console.log('✅ Seed completed successfully');
  console.log('📊 Database is ready for use');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });