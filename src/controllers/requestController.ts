import { Request, Response } from 'express';
import { UserRequestDTO } from '../dto/UserRequestDTO';
import { Tier } from '../interfaces/IRateLimiter';
import {RateLimiterService} from "../services/rateLimiter";

export class RequestController {
    constructor(private rateLimiterService: RateLimiterService) {}

    public async handleRequest(req: Request, res: Response): Promise<void> {
        const userInfo = (req as any).userInfo as UserRequestDTO;

        try {
            const rateLimitResult = await this.rateLimiterService.processRequest(
                userInfo.userId,
                userInfo.tier as Tier
            );

            res.set({
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            });

            if (!rateLimitResult.allowed) {
                res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Try again in ${rateLimitResult.resetTime} seconds.`
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Request processed successfully',
            });
        } catch (error) {
            console.error('Rate limit error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to process rate limit',
            });
        }
    }
}
