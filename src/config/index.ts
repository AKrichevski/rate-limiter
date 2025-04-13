import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
    app: z.object({
        port: z.coerce.number().default(3000),
        env: z.enum(['development', 'test', 'production']).default('development'),
    }),
    redis: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().default(6379),
        password: z.string().optional(),
    }),
    rateLimiter: z.object({
        windowSizeSeconds: z.coerce.number().default(60),
        limits: z.object({
            standard: z.coerce.number().default(500),
            high: z.coerce.number().default(1000),
        }),
    }),
});

export const config = ConfigSchema.parse({
    app: {
        port: process.env.PORT,
        env: process.env.NODE_ENV,
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },
    rateLimiter: {
        windowSizeSeconds: process.env.RATE_LIMIT_WINDOW_SIZE_SECONDS || 60,
        limits: {
            standard: process.env.RATE_LIMIT_STANDARD || 500,
            high: process.env.RATE_LIMIT_HIGH || 1000,
        },
    },
});
