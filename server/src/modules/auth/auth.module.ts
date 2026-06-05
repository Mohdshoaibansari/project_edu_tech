import { Module } from '@nestjs/common';
import { JwtTokenService } from './jwt-token.service';
import { RbacService } from './rbac.service';
import { SuperTokensService } from './supertokens/supertokens.service';
import { AuthController } from './auth.controller';
import { AuthGuard, TenantGuard, PermissionGuard } from './guards/auth.guards';

@Module({
  controllers: [AuthController],
  providers: [
    JwtTokenService,
    RbacService,
    SuperTokensService,
    AuthGuard,
    TenantGuard,
    PermissionGuard,
  ],
  exports: [JwtTokenService, RbacService, SuperTokensService, AuthGuard, TenantGuard, PermissionGuard],
})
export class AuthModule {}
