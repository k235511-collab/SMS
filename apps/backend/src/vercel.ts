import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { validateDatabaseUrlsForServerless } from './config/database-url.utils';

// Use require for express to avoid pnpm resolution issues
const express = require('express');

let cachedServer: any;

function normalizeOrigin(value: string): string {
    const trimmed = value.trim()
    const unquoted = trimmed.replace(/^['"]|['"]$/g, '')
    return unquoted.endsWith('/') ? unquoted.slice(0, -1) : unquoted
}

function parseCorsOrigins(value: string | undefined): string[] {
    if (!value) return []

    const trimmed = value.trim()
    let rawOrigins: string[] = []

    // Allow JSON array input from env managers that store list values as JSON.
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
                rawOrigins = parsed.map((entry) => String(entry))
            }
        } catch {
            rawOrigins = []
        }
    }

    if (rawOrigins.length === 0) {
        rawOrigins = trimmed.split(',')
    }

    return rawOrigins.map(normalizeOrigin).filter(Boolean)
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.some((allowed) => {
        if (!allowed.includes('*')) {
            return allowed === origin
        }

        const pattern = allowed
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')

        return new RegExp(`^${pattern}$`).test(origin)
    })
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
        const configService = app.get(ConfigService);
        const dbValidation = validateDatabaseUrlsForServerless(
            process.env.DATABASE_URL,
            process.env.DIRECT_DATABASE_URL,
        )

        for (const warning of dbValidation.warnings) {
            logger.warn(`[database-config] ${warning}`)
        }

        // Keep serverless bootstrap behavior aligned with main.ts.
        const allowedOrigins = [
            ...parseCorsOrigins(
                configService.get<string>('CORS_ORIGINS', process.env.CORS_ORIGINS || 'http://localhost:3000'),
            ),
            ...[process.env.FRONTEND_URL, process.env.NEXT_PUBLIC_APP_URL]
                .filter(Boolean)
                .map((origin) => normalizeOrigin(origin as string)),
        ]
        const isDev = configService.get<string>('NODE_ENV', 'development') === 'development'
        logger.log(`CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(none)'}`)
        app.enableCors({
            origin: (origin: string | undefined, cb: (err: any, allow?: boolean) => void) => {
                if (!origin) return cb(null, true)
                const normalized = normalizeOrigin(origin)
                if (isDev) {
                    try {
                        const { hostname } = new URL(normalized)
                        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
                            return cb(null, true)
                        }
                    } catch {
                        return cb(null, false)
                    }
                }

                const allowed = isOriginAllowed(normalized, allowedOrigins)
                if (!allowed) {
                    logger.warn(`CORS blocked origin: ${normalized}`)
                }

                return cb(null, allowed)
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

        app.setGlobalPrefix(
            configService.get<string>('API_PREFIX', 'api/v1'),
            { exclude: ['health'] },
        );

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
