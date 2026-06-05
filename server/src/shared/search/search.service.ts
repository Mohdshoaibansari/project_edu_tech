import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

/**
 * Shared SearchService — tenant-scoped fuzzy search across all searchable entities.
 * Uses PostgreSQL trigram indexes (pg_trgm) for fast ILIKE queries.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search across all searchable entities for a given tenant.
   *
   * @param tenantId - Tenant scope (required — never cross-tenant)
   * @param query - Search query string
   * @param options.entity - Optional entity filter
   * @param options.limit - Max results per entity type (default 20)
   */
  async search(
    tenantId: string,
    query: string,
    options?: { entity?: string; limit?: number },
  ): Promise<SearchResults> {
    const limit = Math.min(options?.limit || 20, 100);
    const results: SearchResults = {};

    const searches: Promise<void>[] = [];

    if (!options?.entity || options.entity === 'students') {
      searches.push(
        this.searchStudents(tenantId, query, limit).then((r) => {
          if (r.length > 0) results.students = r;
        }),
      );
    }

    if (!options?.entity || options.entity === 'staff') {
      searches.push(
        this.searchStaff(tenantId, query, limit).then((r) => {
          if (r.length > 0) results.staff = r;
        }),
      );
    }

    if (!options?.entity || options.entity === 'homework') {
      searches.push(
        this.searchHomework(tenantId, query, limit).then((r) => {
          if (r.length > 0) results.homework = r;
        }),
      );
    }

    if (!options?.entity || options.entity === 'exams') {
      searches.push(
        this.searchExams(tenantId, query, limit).then((r) => {
          if (r.length > 0) results.exams = r;
        }),
      );
    }

    await Promise.all(searches);

    return results;
  }

  // ==========================================================================
  // Entity-specific searches
  // ==========================================================================

  private async searchStudents(tenantId: string, query: string, limit: number) {
    return this.prisma.student.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        OR: [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { student_id_card: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, first_name: true, last_name: true, grade_level: true, student_id_card: true },
    });
  }

  private async searchStaff(tenantId: string, query: string, limit: number) {
    return this.prisma.staff.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        OR: [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { designation: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, first_name: true, last_name: true, designation: true },
    });
  }

  private async searchHomework(tenantId: string, query: string, limit: number) {
    return this.prisma.homework.findMany({
      where: {
        tenant_id: tenantId,
        title: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, status: true, due_date: true, class_id: true },
    });
  }

  private async searchExams(tenantId: string, query: string, limit: number) {
    return this.prisma.exam.findMany({
      where: {
        tenant_id: tenantId,
        title: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { date: 'desc' },
      select: { id: true, title: true, type_code: true, date: true, class_id: true },
    });
  }
}

export interface SearchResults {
  students?: Array<{ id: string; first_name: string; last_name: string; grade_level: string; student_id_card: string }>;
  staff?: Array<{ id: string; first_name: string; last_name: string; designation: string | null }>;
  homework?: Array<{ id: string; title: string; status: string; due_date: Date | null; class_id: string }>;
  exams?: Array<{ id: string; title: string; type_code: string; date: Date; class_id: string }>;
}
