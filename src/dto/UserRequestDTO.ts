import { z } from 'zod';

export const UserRequestSchema = z.object({
    userId: z.string().min(1, 'userId is required'),
    tier: z.union([z.literal('high'), z.literal('standard')]),
});

export type UserRequestDTO = z.infer<typeof UserRequestSchema>;
