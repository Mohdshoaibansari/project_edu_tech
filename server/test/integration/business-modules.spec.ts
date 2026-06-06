// ============================================================================
// Business Module Integration Tests — Cross-tenant isolation, auth, CRUD flows
// Spec ref: 04-backend-spec.md §4.9
// ============================================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, loginAs, authGet, authPost, authPut, supertest } from './setup';

const SCHOOL_A = 'tenant-school-a-0000000000000001';
const SCHOOL_B = 'tenant-school-b-0000000000000002';

let app: INestApplication;
let tokenA: string; // School A admin token
let tokenB: string; // School B admin token

beforeAll(async () => {
  try {
    app = await createTestApp();
    const a = await loginAs(app, 'admin@school-a.edu');
    tokenA = a.accessToken;
    const b = await loginAs(app, 'admin@school-b.edu');
    tokenB = b.accessToken;
  } catch (e: any) {
    console.warn(`⚠ Skipping business-modules integration tests: DB may not be available`);
    app = null as any;
  }
}, 30_000);

afterAll(async () => {
  if (app) await app.close();
});

// ============================================================================
// CROSS-TENANT ISOLATION
// ============================================================================
describe('Cross-Tenant Isolation', () => {
  beforeEach(function () {
    if (!app) this.skip?.();
  });

  describe('Attendance', () => {
    it('School A admin CANNOT access School B attendance data', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_B}/attendance/statuses`);
      expect(res.status).toBe(403);
    });

    it('School B admin CANNOT access School A attendance data', async () => {
      const res = await authGet(app, tokenB, `/api/v1/${SCHOOL_A}/attendance/statuses`);
      expect(res.status).toBe(403);
    });

    it('School A admin CAN access own attendance statuses', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/attendance/statuses`);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Exams', () => {
    it('School A admin CANNOT access School B exams', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_B}/exams`);
      expect(res.status).toBe(403);
    });

    it('School B admin CANNOT access School A exams', async () => {
      const res = await authGet(app, tokenB, `/api/v1/${SCHOOL_A}/exams`);
      expect(res.status).toBe(403);
    });
  });

  describe('Leave', () => {
    it('School A admin CANNOT access School B leave requests', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_B}/leaves`);
      expect(res.status).toBe(403);
    });
  });

  describe('Config', () => {
    it('School A admin CANNOT read School B config', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_B}/config/attendance.statuses`);
      expect(res.status).toBe(403);
    });
  });
});

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================
describe('Authentication', () => {
  it('should return 401 for missing Authorization header', async () => {
    const res = await supertest(app.getHttpServer())
      .get(`/api/v1/${SCHOOL_A}/attendance/statuses`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for invalid/expired token', async () => {
    const res = await supertest(app.getHttpServer())
      .get(`/api/v1/${SCHOOL_A}/attendance/statuses`)
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('should return 401 for malformed Authorization header', async () => {
    const res = await supertest(app.getHttpServer())
      .get(`/api/v1/${SCHOOL_A}/attendance/statuses`)
      .set('Authorization', 'NotBearer token');
    expect(res.status).toBe(401);
  });

  it('should return 200 for login with valid credentials', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@school-a.edu', password: 'password' });
    expect(res.status).toBe(200);
  });

  it('should return 401 for login with wrong password', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@school-a.edu', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should return 401 for login with non-existent email', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'noone@nowhere.edu', password: 'password' });
    expect(res.status).toBe(401);
  });

  describe('Token Refresh', () => {
    it('should have refresh_token cookie on login', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@school-a.edu', password: 'password' });
      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeTruthy();
    });
  });

  describe('GET /me', () => {
    it('should return current user profile', async () => {
      const res = await authGet(app, tokenA, '/api/v1/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data.email).toBe('admin@school-a.edu');
      expect(res.body.data).toHaveProperty('role');
      expect(res.body.data).toHaveProperty('tenant_id');
    });
  });
});

// ============================================================================
// ATTENDANCE CRUD
// ============================================================================
describe('Attendance — CRUD', () => {
  let classId: string;

  beforeAll(async () => {
    // Get a valid class ID for School A
    const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/classes`);
    if (res.status === 200 && res.body.data?.length > 0) {
      classId = res.body.data[0].id;
    }
  });

  describe('GET /attendance/statuses', () => {
    it('should return attendance statuses for tenant', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/attendance/statuses`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Each status should have required fields
      const status = res.body.data[0];
      expect(status).toHaveProperty('code');
      expect(status).toHaveProperty('label');
      expect(status).toHaveProperty('weight');
      expect(status).toHaveProperty('is_present');
    });
  });

  describe('Reporting', () => {
    it('should return dashboard for School A', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/reports/dashboard`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('students_count');
      expect(res.body.data).toHaveProperty('attendance_today');
      expect(res.body.data).toHaveProperty('pending_leaves');
    });

    it('should return dashboard for School B', async () => {
      const res = await authGet(app, tokenB, `/api/v1/${SCHOOL_B}/reports/dashboard`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('students_count');
    });
  });
});

// ============================================================================
// CONFIG ENGINE API
// ============================================================================
describe('Config Engine — API', () => {
  describe('GET /config', () => {
    it('should return all active configs for tenant', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/config`);
      // May be empty or return configs
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /config/schemas', () => {
    it('should list available config schemas', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/config/schemas`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /config/statuses/attendance', () => {
    it('should return attendance statuses via convenience endpoint', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/config/statuses/attendance`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});

// ============================================================================
// ACADEMIC STRUCTURE
// ============================================================================
describe('Academic Structure — CRUD', () => {
  describe('GET /grades', () => {
    it('should return grades for tenant', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/grades`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /subjects', () => {
    it('should return subjects for tenant', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/subjects`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /students', () => {
    it('should return paginated student list', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/students`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });
});

// ============================================================================
// HOMEWORK
// ============================================================================
describe('Homework — CRUD', () => {
  describe('GET /homework', () => {
    it('should return homework list for tenant', async () => {
      const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/homework`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });
});

// ============================================================================
// SEARCH
// ============================================================================
describe('Search', () => {
  it('should search within tenant scope', async () => {
    const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/search?q=a`);
    expect(res.status).toBe(200);
  });
});

// ============================================================================
// NOTIFICATION
// ============================================================================
describe('Notification — Inbox', () => {
  it('should return notification inbox', async () => {
    const res = await authGet(app, tokenA, `/api/v1/${SCHOOL_A}/notifications`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});
