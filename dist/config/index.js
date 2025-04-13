"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const ConfigSchema = zod_1.z.object({
    app: zod_1.z.object({
        port: zod_1.z.coerce.number().default(3000),
        env: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    }),
    redis: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.coerce.number().default(6379),
        password: zod_1.z.string().optional(),
    }),
    rateLimiter: zod_1.z.object({
        windowSizeSeconds: zod_1.z.coerce.number().default(60),
        limits: zod_1.z.object({
            standard: zod_1.z.coerce.number().default(500),
            high: zod_1.z.coerce.number().default(1000),
        }),
    }),
});
exports.config = ConfigSchema.parse({
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
