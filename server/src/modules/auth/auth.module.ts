import { Module } from '@nestjs/common';
import { JwtTokenService } from './jwt-token.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class AuthModule {}
