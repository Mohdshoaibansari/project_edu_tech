import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import SuperTokens from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import EmailPassword from 'supertokens-node/recipe/emailpassword';

/**
 * SuperTokens Service — Manages SuperTokens SDK initialization and provides
 * session verification for the token-exchange flow.
 *
 * Architecture:
 *   Frontend SDK → Auth Service (port 4000) → Core (port 3567)
 *   Our Backend   → Core (port 3567) via SDK for session verification
 */
@Injectable()
export class SuperTokensService implements OnModuleInit {
  private readonly connectionUri: string;
  private readonly apiKey: string;
  private initialized = false;

  constructor() {
    this.connectionUri = process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567';
    this.apiKey = process.env.SUPERTOKENS_API_KEY || '';
  }

  async onModuleInit() {
    this.initSDK();
  }

  private initSDK() {
    if (this.initialized) return;
    SuperTokens.init({
      supertokens: {
        connectionURI: this.connectionUri,
        apiKey: this.apiKey,
      },
      appInfo: {
        appName: 'EduTech',
        apiDomain: process.env.API_DOMAIN || 'http://localhost:3000',
        websiteDomain: process.env.WEBSITE_DOMAIN || 'http://localhost:3000',
        apiBasePath: '/api/v1/auth',
      },
      recipeList: [
        EmailPassword.init(),
        Session.init({
          cookieSecure: false,
          cookieSameSite: 'lax',
        }),
      ],
    });
    this.initialized = true;
  }

  /**
   * Verify a SuperTokens access token and return the user ID.
   * Uses the SuperTokens SDK which communicates with the core.
   */
  async verifyAccessToken(accessToken: string): Promise<{ userId: string; sessionHandle: string }> {
    try {
      const session = await Session.getSessionInformation(accessToken);
      if (!session) {
        throw new UnauthorizedException('Session not found');
      }
      return {
        userId: session.userId,
        sessionHandle: session.sessionHandle,
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        error?.message || 'Invalid or expired SuperTokens session',
      );
    }
  }

  /**
   * Check if SuperTokens core is reachable.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.connectionUri}/auth/hello`, {
        headers: { 'api-key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if the SDK was initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
