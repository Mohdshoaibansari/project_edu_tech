import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LeaveService } from './services/leave.service';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post() @HttpCode(HttpStatus.CREATED) @RequirePermission('leave:apply')
  async applyLeave(@Param('tenantId') tid: string, @Body() b: any) { return { data: await this.leaveService.applyLeave(tid, b) }; }

  @Get() @RequirePermission('leave:view')
  async getLeaves(@Param('tenantId') tid: string, @Query('student_id') sid?: string, @Query('status') s?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    return this.leaveService.getLeaves(tid, { student_id: sid, status: s, page: p ? parseInt(p) : 1, pageSize: ps ? parseInt(ps) : 20 });
  }

  @Get(':leaveId') @RequirePermission('leave:view')
  async getLeave(@Param('tenantId') tid: string, @Param('leaveId') lid: string) { return { data: await this.leaveService.getLeave(tid, lid) }; }

  @Post(':leaveId/action') @RequirePermission('leave:approve')
  async actionLeave(@Param('tenantId') tid: string, @Param('leaveId') lid: string, @Body() b: { transition: string; comment?: string; actor_role?: string }) {
    return { data: await this.leaveService.actionLeave(tid, lid, b.transition, undefined, b.comment, b.actor_role) };
  }
}
