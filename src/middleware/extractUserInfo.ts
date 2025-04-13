import { Request, Response, NextFunction } from 'express';
import { UserRequestSchema, UserRequestDTO } from '../dto/UserRequestDTO';

export function extractUserInfo(
    userId: string | undefined,
    userTier: string | undefined
): {
    isValid: boolean;
    data?: UserRequestDTO;
    error?: {
        status: number;
        message: string;
        details?: any
    }
} {
    if (!userId || !userTier) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Missing required headers',
                details: 'X-User-ID and X-User-Tier headers are required'
            }
        };
    }

    const normalizedTier = String(userTier).toLowerCase();
    if (normalizedTier !== 'standard' && normalizedTier !== 'high') {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Invalid tier',
                details: 'X-User-Tier must be either "standard" or "high"'
            }
        };
    }

    try {
        const parsed: UserRequestDTO = UserRequestSchema.parse({
            userId: String(userId),
            tier: normalizedTier,
        });

        return {
            isValid: true,
            data: parsed
        };
    } catch (err: any) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Validation failed',
                details: err.errors ?? err.message
            }
        };
    }
}

/**
 * Creates a middleware function using the extractUserInfo utility
 * This allows the utility to be used in Express middleware chains
 */
export function createExtractUserInfoMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
        const userId = req.headers['x-user-id'];
        const userTier = req.headers['x-user-tier'];

        const result = extractUserInfo(
            userId as string | undefined,
            userTier as string | undefined
        );

        if (!result.isValid) {
            res.status(result.error!.status).json({
                error: result.error!.message,
                details: result.error!.details
            });
            return;
        }

        (req as any).userInfo = result.data;
        next();
    };
}
