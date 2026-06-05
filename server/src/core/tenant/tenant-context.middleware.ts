import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Context Middleware — extracts tenant from JWT or URL param.
 * Tenant isolation is enforced via AsyncLocalStorage pattern.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Tenant from URL param (e.g., /api/v1/:tenantId/...)
    const tenantId = req.params?.tenantId;
    if (tenantId) {
      (req as any).tenantId = tenantId;
    }

    // If JWT is present, tenant can also come from token claims
    if ((req as any).user?.tenant) {
      (req as any).tenantId = (req as any).user.tenant;
    }

    next();
  }
}
