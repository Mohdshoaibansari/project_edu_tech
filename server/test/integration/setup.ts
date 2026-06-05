// ============================================================================
// Integration Test Setup — Creates NestJS test app with all modules
// ============================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';

let app: INestApplication;

/**
 * Create a fully-configured NestJS test application.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', {
    exclude: ['admin', 'admin/(.*)'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.init();
  return app;
}

/**
 * Helper: create supertest agent from app.
 */
export function agent(app: INestApplication) {
  return supertest(app.getHttpServer());
}

/**
 * Login helper — returns access token and cookies.
 */
export async function loginAs(
  app: INestApplication,
  email: string,
  password = 'password',
): Promise<{ accessToken: string; cookies: string[] }> {
  const res = await supertest(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const accessToken = res.body.data.access_token;
  const cookies = res.headers['set-cookie'] || [];

  return { accessToken, cookies };
}

/**
 * Execute a GET request with Bearer token.
 */
export function authGet(app: INestApplication, token: string, url: string) {
  return supertest(app.getHttpServer())
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Execute a POST request with Bearer token.
 */
export function authPost(app: INestApplication, token: string, url: string, body?: any) {
  return supertest(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body || {});
}

/**
 * Execute a PUT request with Bearer token.
 */
export function authPut(app: INestApplication, token: string, url: string, body?: any) {
  return supertest(app.getHttpServer())
    .put(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body || {});
}

export { supertest };
