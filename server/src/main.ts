import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());

  // CORS — parametrized via CORS_ORIGINS env var (comma-separated origins).
  // Default allows both frontend (3001) and backend (3000) for local dev.
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // Redirect root to admin dashboard
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/') {
      return res.redirect('/admin');
    }
    next();
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['admin', 'admin/(.*)'],
  });

  // Views point from dist/src → src/admin/views (hbs files aren't compiled by tsc)
  app.setBaseViewsDir(join(__dirname, '..', '..', 'src', 'admin', 'views'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`EduTech server running on http://localhost:${process.env.PORT ?? 3000}`);
}

bootstrap();
