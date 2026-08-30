// enterprise-ai-agent-platform/apps/api/tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '../../src/db/client';
import { AuthService } from '../../src/auth/services/auth.service';

export interface UserFactoryParams {
  email ? : string;
  name ? : string;
  planId ? : 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  role ? : 'USER' | 'ADMIN' | 'SUPPORT';
  isActive ? : boolean;
  isEmailVerified ? : boolean;
  metadata ? : Record < string, any > ;
}

export class UserFactory {
  static async create(params: UserFactoryParams = {}) {
    const email = params.email || faker.internet.email();
    const name = params.name || faker.person.fullName();
    const planId = params.planId || 'FREE';
    const role = params.role || 'USER';
    const isActive = params.isActive ?? true;
    const isEmailVerified = params.isEmailVerified ?? true;
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        planId,
        role,
        isActive,
        isEmailVerified,
        metadata: params.metadata || {},
      },
    });
    
    const accessToken = AuthService.generateAccessToken(user.id, user.email, user.role, user.planId);
    const refreshToken = AuthService.generateRefreshToken(user.id, user.email, user.role, user.planId);
    
    return { user, accessToken, refreshToken };
  }
  
  static async createAdmin() {
    return this.create({
      role: 'ADMIN',
      planId: 'ENTERPRISE',
      name: 'Admin User',
    });
  }
  
  static async createFreeUser() {
    return this.create({
      planId: 'FREE',
      name: 'Free User',
    });
  }
  
  static async createStarterUser() {
    return this.create({
      planId: 'STARTER',
      name: 'Starter User',
    });
  }
  
  static async createProfessionalUser() {
    return this.create({
      planId: 'PROFESSIONAL',
      name: 'Professional User',
    });
  }
  
  static async createEnterpriseUser() {
    return this.create({
      planId: 'ENTERPRISE',
      name: 'Enterprise User',
    });
  }
  
  static async createInactiveUser() {
    return this.create({
      isActive: false,
      name: 'Inactive User',
    });
  }
  
  static async createUnverifiedUser() {
    return this.create({
      isEmailVerified: false,
      name: 'Unverified User',
    });
  }
  
  static async createMany(count: number, baseParams: UserFactoryParams = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(baseParams));
    }
    return users;
  }
  
  static async delete(userId: string) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }
  
  static async deleteMany(userIds: string[]) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  }
}