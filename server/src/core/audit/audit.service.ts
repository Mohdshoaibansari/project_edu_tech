import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenant_id: entry.tenantId,
          user_id: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resource_id: entry.resourceId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          ...(entry.details && { details: entry.details }),
        },
      });
    } catch {
      // Audit logging should never break the main flow
    }
  }

  async getHistory(tenantId: string, filters?: { userId?: string; action?: string; from?: Date; to?: Date; limit?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters?.userId && { user_id: filters.userId }),
        ...(filters?.action && { action: filters.action }),
        ...(filters?.from && filters?.to && {
          created_at: { gte: filters.from, lte: filters.to },
        }),
      },
      orderBy: { created_at: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
