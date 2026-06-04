# 17. Multi-Tenant Strategy — Deep Dive

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Evaluate isolation strategies and recommend a pragmatic hybrid approach for the EduTech SaaS platform.

---

## 17.1 Strategy Comparison

| Strategy | Isolation | Cost | Complexity | Customizability | Performance Isolation |
|----------|-----------|------|------------|-----------------|----------------------|
| **A: Shared DB + Shared Schema** | Low | $ | Low | Low (shared schema) | None |
| **B: Shared DB + Separate Schemas** | Medium | $$ | Medium | Medium (per-schema custom tables) | None |
| **C: Separate Databases** | High | $$$ | Medium-High | High (full schema control) | Partial |
| **D: Separate Instances** | Very High | $$$$ | High | Very High | Full |
| **Hybrid (Recommended)** | — | $$ | Medium | High | Optional for enterprise |

---

## 17.2 Recommended: Hybrid Multi-Tenant Strategy

### Tiered Approach

```
┌──────────────────────────────────────────────────────────────┐
│                    HYBRID MULTI-TENANT                         │
│                                                               │
│  Tier 1: Shared DB + Shared Schema (Default — 90% of tenants)│
│    - All standard schools share one PostgreSQL database       │
│    - tenant_id on every table                                 │
│    - PostgreSQL RLS                                           │
│    - Customization via Configuration Engine (no schema change)│
│    - Custom fields via Metadata Engine (JSONB)                │
│                                                               │
│  Tier 2: Shared DB + Separate Schema (5% of tenants)         │
│    - Large schools needing custom tables                      │
│    - Same PostgreSQL instance, different schema               │
│    - Schema migrations isolated to that tenant                │
│    - tenant_id still used for cross-schema queries            │
│                                                               │
│  Tier 3: Dedicated Database (3% of tenants)                  │
│    - Enterprise schools needing dedicated hosting             │
│    - Separate PostgreSQL instance                             │
│    - Data residency in specific region                        │
│    - Connection pool per tenant                               │
│                                                               │
│  Tier 4: Dedicated Instance (2% of tenants)                  │
│    - Very large chains (500+ schools under one tenant)        │
│    - Government contracts with compliance requirements        │
│    - Full infrastructure isolation                            │
└──────────────────────────────────────────────────────────────┘
```

### Why Not Separate Database For Everyone?

1. **Cost:** 1,000 databases × $50/month = $50,000/month vs 1 database at $500/month
2. **Operational Complexity:** 1,000 connection pools, 1,000 backup schedules, 1,000 migration runs
3. **Cross-Tenant Features:** Impossible to do aggregate analytics, global search, or platform-wide AI analysis
4. **Unnecessary for 90%:** Most schools (< 2,000 students) don't need dedicated infrastructure
5. **Over-engineering:** School variability is solved by Configuration, Rules, Workflow, and Metadata Engines — not by separate databases

---

## 17.3 Tenant Routing Architecture

```typescript
// Connection Pool Manager
@Injectable()
export class ConnectionManager {
  private defaultPool: Pool;                    // Shared pool for Tier 1 + Tier 2
  private dedicatedPools = new Map<string, Pool>(); // Tier 3: per-tenant pools
  
  async getConnection(tenantId: string): Promise<PoolClient> {
    const tenant = await this.tenantRepo.findById(tenantId);
    
    switch (tenant.tier) {
      case 'shared_schema':     // Tier 1
        return this.defaultPool.connect();
      
      case 'separate_schema':   // Tier 2
        const client = await this.defaultPool.connect();
        await client.query(`SET search_path TO tenant_${tenant.slug}, public`);
        return client;
      
      case 'dedicated_db':      // Tier 3
        if (!this.dedicatedPools.has(tenantId)) {
          this.dedicatedPools.set(tenantId, this.createPool(tenant.db_connection_string));
        }
        return this.dedicatedPools.get(tenantId).connect();
      
      case 'dedicated_instance': // Tier 4
        // Routed via API Gateway to a different backend instance
        throw new RedirectError(tenant.backend_url);
    }
  }
}
```

---

## 17.4 Migration Strategy Per Tier

| Tier | Migration Method | Downtime |
|------|-----------------|----------|
| **Tier 1 (Shared Schema)** | Run migrations once on shared DB with `IF NOT EXISTS` guards | None (backward-compatible migrations) |
| **Tier 2 (Separate Schema)** | Run migrations per-schema in sequence; skip if table exists | Per-schema (seconds) |
| **Tier 3 (Dedicated DB)** | Migration runner per DB; can run in parallel | Per-DB (seconds) |
| **Tier 4 (Dedicated Instance)** | Independent CI/CD pipeline | Per-instance |

### Backward-Compatible Migration Rules

```
1. NEVER rename a column — add new column, migrate data, deprecate old
2. NEVER drop a column in the same migration as adding
3. NEVER change a column type — add new column, migrate, drop old later
4. ALWAYS add new columns as nullable or with DEFAULT
5. ALWAYS use IF NOT EXISTS for indexes and constraints
6. NEVER backfill large tables in migration — use async job
```

---

## 17.5 Tenant Schema Registry

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Tier configuration
  tier VARCHAR(20) DEFAULT 'shared_schema',
  -- 'shared_schema', 'separate_schema', 'dedicated_db', 'dedicated_instance'
  
  -- Connection details (nullable for Tier 1)
  db_schema VARCHAR(100),              -- For Tier 2: schema name
  db_connection_string TEXT,           -- For Tier 3: connection string
  backend_url VARCHAR(500),            -- For Tier 4: dedicated backend URL
  
  -- Billing & Limits
  plan VARCHAR(20) DEFAULT 'free',
  max_users INTEGER,
  max_storage_gb INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  
  -- Onboarding
  config_template_id UUID REFERENCES config_templates(id),
  onboarded_at TIMESTAMPTZ,
  
  -- Regional
  region VARCHAR(20) DEFAULT 'ap-south-1',
  data_residency_required BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

---

## 17.6 Cross-Tenant Operations

### Platform-Wide Analytics (Tier 1 only)

```sql
-- Aggregate across tenants (Tier 1 — shared DB)
SELECT 
  COUNT(*) as total_attendance_marked,
  COUNT(DISTINCT tenant_id) as active_schools
FROM attendance 
WHERE date = CURRENT_DATE;
```

### For Tier 2/3/4:

```typescript
// Federation: Query all tenants in parallel
async getPlatformStats(): Promise<PlatformStats> {
  const tenants = await this.getActiveTenants();
  
  const results = await Promise.all(
    tenants.map(async tenant => {
      const conn = await this.connectionManager.getConnection(tenant.id);
      const stats = await conn.query(`SELECT COUNT(*) FROM attendance WHERE date = $1`, [today]);
      return { tenantId: tenant.id, stats };
    })
  );
  
  return this.aggregate(results);
}
```

---

## 17.7 Tenant Onboarding Flow (Updated)

```
1. Sales/Admin creates Tenant in Super Admin dashboard
   - Assigns plan (free/basic/premium/enterprise)
   - Selects config template (CBSE, ICSE, State Board, International)
   - Chooses tier based on size requirements
   
2. System provisions:
   Tier 1: Creates tenant record + copies config template
   Tier 2: Creates schema + runs migrations + copies config
   Tier 3: Provisions RDS instance + runs migrations + copies config
   Tier 4: Provisions full infrastructure (EKS/VMs) via Terraform
   
3. Admin user created with credentials
4. Admin logs in, runs setup wizard:
   - School branding (logo, colors)
   - Academic calendar (semester/trimester/quarterly dates)
   - Attendance statuses (choose from template or customize)
   - Grading scale (choose from template or customize)
   - Workflow customization (if needed)
   - Custom fields (if needed)
   - Import students, teachers, parents (CSV)
   
5. Frontend deployment provisioned
6. School goes live
```

---

## 17.8 Data Residency & Compliance

```
Region: ap-south-1 (Mumbai)    → Indian schools (default)
Region: eu-west-1 (Ireland)     → European schools (GDPR)
Region: us-east-1 (Virginia)    → American schools
Region: me-south-1 (Bahrain)   → Middle East schools

Tier 3 (Dedicated DB) can be placed in any region.
```

### Export/Deletion Compliance

```typescript
// Full tenant data export (GDPR Art. 20)
POST /api/v1/admin/tenants/{id}/export
→ Generates complete JSON/CSV dump of all tenant data
→ Available for 7 days via signed URL

// Tenant deletion (GDPR Art. 17)
POST /api/v1/admin/tenants/{id}/delete
→ 30-day soft-delete grace period
→ Notifies tenant admin
→ After 30 days: hard delete all data + files + backups
```

---

## 17.9 Operational Impact Summary

| Concern | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---------|--------|--------|--------|--------|
| **Backup** | Single DB backup | Single DB (all schemas) | Per-DB backup | Per-instance backup |
| **Migration** | Run once | Run per schema | Run per DB | Per pipeline |
| **Monitoring** | Single set of metrics | Per-schema metrics | Per-DB metrics | Full isolation |
| **Scaling** | Scale DB vertically | Scale DB vertically | Per-DB scaling | Independent scaling |
| **Cost (100 tenants)** | $500/mo | $500/mo | $5,000/mo | $20,000/mo |
| **Onboarding Time** | < 1 min | < 5 min | < 30 min | < 4 hours |

---

## 17.10 Decision Matrix

| If Tenant... | Use Tier | Because |
|-------------|---------|---------|
| < 2,000 students, standard features | **Tier 1** | Cost-effective, sufficient isolation |
| Needs custom database tables | **Tier 2** | Schema isolation without DB overhead |
| Requires data residency in specific country | **Tier 3** | Dedicated DB in required region |
| > 10,000 students OR government contract | **Tier 3+** | Performance isolation, compliance |
| 500+ school chain with shared admin | **Tier 3+** | Scale, shared reporting across chain |
| Requires on-premise deployment | **Tier 4** | Full infrastructure isolation |

---

> **Next:** See [`18-domain-driven-design.md`](./18-domain-driven-design.md) for DDD Bounded Contexts.
