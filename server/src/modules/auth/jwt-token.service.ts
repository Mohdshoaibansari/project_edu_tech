import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as jose from 'jose';
import { PrismaService } from '@core/prisma/prisma.service';
import { RbacService } from './rbac.service';
import { SuperTokensService } from './supertokens/supertokens.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly supertokensService: SuperTokensService,
  ) {
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
    if (!user) throw new NotFoundException('User not found');

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
      throw new UnauthorizedException('Invalid or expired refresh token');
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
    if (!user) throw new NotFoundException('User not found');

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
  // Login — Exchange SuperTokens identity for backend JWT
  // ==========================================================================

  async login(email: string, supertokensToken: string): Promise<{ user: UserProfile; tokens: TokenPair }> {
    // Verify SuperTokens token if provided
    if (supertokensToken && supertokensToken.length > 10) {
      await this.verifySuperTokensAndLink(email, supertokensToken);
    }

    // Look up user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Issue backend tokens
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

  /**
   * Verify SuperTokens access token and link the SuperTokens user ID to our user record.
   */
  private async verifySuperTokensAndLink(email: string, supertokensToken: string): Promise<void> {
    const stResult = await this.supertokensService.verifyAccessToken(supertokensToken);

    // Link SuperTokens ID to user (first SuperTokens login)
    await this.prisma.user.updateMany({
      where: { email },
      data: { supertokens_id: stResult.userId },
    });
  }

  // ==========================================================================
  // Private
  // ==========================================================================

  private async getUserPermissions(userId: string, role: string): Promise<string[]> {
    return this.rbacService.getUserPermissions(userId, role as any);
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
