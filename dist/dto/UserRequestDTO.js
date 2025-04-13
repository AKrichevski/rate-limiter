"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRequestSchema = void 0;
const zod_1 = require("zod");
exports.UserRequestSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'userId is required'),
    tier: zod_1.z.union([zod_1.z.literal('high'), zod_1.z.literal('standard')]),
});
