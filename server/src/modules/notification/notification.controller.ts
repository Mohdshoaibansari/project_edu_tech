import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get('inbox') @RequirePermission('attendance:view')
  async getInbox(@Param('tenantId') tid: string, @Query('is_read') ir?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    return this.notifService.getInbox(tid, 'current-user', ir === 'true' ? true : ir === 'false' ? false : undefined, p ? parseInt(p) : 1, ps ? parseInt(ps) : 20);
  }

  @Post('inbox/:notificationId/read') @RequirePermission('attendance:view')
  async markRead(@Param('notificationId') nid: string) { return { data: await this.notifService.markRead(nid) }; }

  @Post('inbox/read-all') @RequirePermission('attendance:view')
  async markAllRead(@Param('tenantId') tid: string) { await this.notifService.markAllRead(tid, 'current-user'); return { data: { success: true } }; }
}
