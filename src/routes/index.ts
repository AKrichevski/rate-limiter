import { Router } from 'express';
import { createApiRouter } from './api.routes';
import { RateLimiterService } from "../services/rateLimiter";

export const createRoutes = (rateLimiterService: RateLimiterService): Router => {
    const router = Router();

    router.use('/api', createApiRouter(rateLimiterService));

    router.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    return router;
};
