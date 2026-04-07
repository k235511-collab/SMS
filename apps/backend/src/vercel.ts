import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';

// Use require for express to avoid pnpm resolution issues
const express = require('express');

let cachedServer: any;

function parseCorsOrigins(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .map((s) => (s.endsWith('/') ? s.slice(0, -1) : s))
        .filter(Boolean)
}

async function bootstrap() {
    if (!cachedServer) {
        const logger = new Logger('Serverless-Bootstrap');
        const expressApp = express();
        const app = await NestFactory.create(
            AppModule,
            new ExpressAdapter(expressApp),
            { logger: ['error', 'warn', 'log'] }
        );

        // Apply the exact same middlewares from main.ts
        const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS)
        logger.log(`CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(none)'}`)
        app.enableCors({
            origin: (origin: string | undefined, cb: (err: any, allow?: boolean) => void) => {
                if (!origin) return cb(null, true)
                const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin
                return cb(null, allowedOrigins.includes(normalized))
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'x-campus-id'],
        });

        app.use(helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            crossOriginOpenerPolicy: { policy: 'unsafe-none' },
            contentSecurityPolicy: false,
        }));

        app.use(compression());

        app.setGlobalPrefix(process.env.API_PREFIX || '/api/v1', { exclude: ['health'] });

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: { enableImplicitConversion: true },
            })
        );

        await app.init();
        cachedServer = expressApp;
        logger.log('NestJS Serverless Instance Initialized');
    }
    return cachedServer;
}

// Vercel Serverless Function Handler
export default async (req: any, res: any) => {
    const server = await bootstrap();
    server(req, res);
};
