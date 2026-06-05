import { Injectable } from '@nestjs/common';
import * as jose from 'jose';
import { PrismaService } from '@core/prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  tenant: string;
  role: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  permissions: string[];
}

@Injectable()
export class JwtTokenService {
  private readonly secret: Uint8Array;

  constructor(private readonly prisma: PrismaService) {
    const secretStr = process.env.JWT_SECRET || 'edutech-dev-secret-change-in-production';
    this.secret = new TextEncoder().encode(secretStr);
  }

  // ==========================================================================
  // Issue Tokens
  // ==========================================================================

  async issueTokens(userId: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new Error('User not found');

    const permissions = await this.getUserPermissions(user.id, user.role);

    const payload: TokenPayload = {
      sub: user.id,
      tenant: user.tenant_id,
      role: user.role,
      permissions,
    };

    const accessToken = await new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m')
      .sign(this.secret);

    // Refresh token — opaque, stored in DB
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
    };
  }

  // ==========================================================================
  // Verify
  // ==========================================================================

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jose.jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  }

  // ==========================================================================
  // Refresh
  // ==========================================================================

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Validate refresh token in DB
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!stored || stored.expires_at < new Date() || stored.revoked_at) {
      throw new Error('Invalid or expired refresh token');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    // Issue new pair
    return this.issueTokens(stored.user_id);
  }

  // ==========================================================================
  // Logout
  // ==========================================================================

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked_at: new Date() },
    });
  }

  // ==========================================================================
  // User Profile
  // ==========================================================================

  async getUserProfile(userId: string): Promise<Omit<UserProfile, 'permissions'> & { permissions: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new Error('User not found');

    const permissions = await this.getUserPermissions(user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant.name,
      permissions,
    };
  }

  // ==========================================================================
  // Login (for direct JWT auth — bypasses SuperTokens)
  // ==========================================================================

  async login(email: string, password: string): Promise<{ user: UserProfile; tokens: TokenPair }> {
    // Simple email lookup — in production, SuperTokens handles password verification
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });
    if (!user) throw new Error('Invalid credentials');

    // In production, password is verified by SuperTokens
    // For dev, we just issue tokens for the user
    const permissions = await this.getUserPermissions(user.id, user.role);
    const tokens = await this.issueTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: user.tenant.name,
        permissions,
      },
      tokens,
    };
  }

  // ==========================================================================
  // Private
  // ==========================================================================

  private async getUserPermissions(userId: string, role: UserRole): Promise<string[]> {
    // Get role-based permissions
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    // Get user-specific overrides
    const userPerms = await this.prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { permission: true },
    });

    const allPerms = new Set<string>();
    for (const rp of rolePerms) allPerms.add(rp.permission.code);
    for (const up of userPerms) allPerms.add(up.permission.code);

    return Array.from(allPerms).sort();
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
      },
    });

    return token;
  }
}
