// ============================================================================
// Integration Tests — Auth Module
// ============================================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, loginAs, authGet, supertest } from './setup';

describe('Auth — Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // Login
  // ==========================================================================
  describe('POST /auth/login', () => {
    it('should login with valid email and return access token + user profile', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-a.edu', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('expires_in');
      expect(res.body.data.user).toMatchObject({
        email: 'admin@school-a.edu',
        first_name: 'Amit',
        last_name: 'Sharma',
        role: 'ADMIN',
        tenant_id: 'tenant-school-a-0000000000000001',
      });
      expect(res.body.data.user.permissions).toBeInstanceOf(Array);
      expect(res.body.data.user.permissions.length).toBeGreaterThan(0);
      expect(res.body.data.user.permissions).toContain('attendance:view');
      expect(res.body.data.user.permissions).toContain('config:read');
      expect(res.body.data.user.permissions).toContain('admin:users');
    });

    it('should login as School B admin with correct tenant', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-b.edu', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        email: 'admin@school-b.edu',
        first_name: 'Priya',
        role: 'ADMIN',
      });
      expect(res.body.data.user.tenant_id).toBe('tenant-school-b-0000000000000002');
    });

    it('should set refresh_token as HttpOnly cookie', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-a.edu', password: 'password' });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
    });
  });

  // ==========================================================================
  // Me
  // ==========================================================================
  describe('GET /auth/me', () => {
    it('should return current user profile from JWT', async () => {
      const { accessToken } = await loginAs(app, 'admin@school-a.edu');

      const res = await authGet(app, accessToken, '/api/v1/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        email: 'admin@school-a.edu',
        role: 'ADMIN',
        tenant_id: 'tenant-school-a-0000000000000001',
      });
      expect(res.body.data.permissions).toContain('attendance:view');
    });

    it('should return 401 without token', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // Refresh
  // ==========================================================================
  describe('POST /auth/refresh', () => {
    it('should issue new tokens with valid refresh cookie', async () => {
      const loginRes = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-a.edu', password: 'password' });

      const cookies = loginRes.headers['set-cookie'];
      const oldAccessToken = loginRes.body.data.access_token;

      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data.access_token).not.toBe(oldAccessToken);
    });

    it('should return 401 without refresh cookie', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // Logout
  // ==========================================================================
  describe('POST /auth/logout', () => {
    it('should clear refresh cookie on logout', async () => {
      const loginRes = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-a.edu', password: 'password' });

      const cookies = loginRes.headers['set-cookie'];

      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Logged out');
    });
  });

  // ==========================================================================
  // Permission Enforcement
  // ==========================================================================
  describe('Permission enforcement', () => {
    it('should reject unauthenticated request', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/tenant-school-a-0000000000000001/attendance/statuses');

      expect(res.status).toBe(401);
    });

    it('should allow authenticated admin access', async () => {
      const { accessToken } = await loginAs(app, 'admin@school-a.edu');

      const res = await authGet(
        app, accessToken,
        '/api/v1/tenant-school-a-0000000000000001/attendance/statuses',
      );

      expect(res.status).toBe(200);
    });
  });
});
