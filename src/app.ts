import express from 'express';
import { config } from './config';
import { RedisClient } from './services/redisClient';
import { ScriptManager } from './services/scriptManager';
import { createRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { RateLimiterService } from "./services/rateLimiter";
import http from 'http';

const app = express();
app.use(express.json());

const redisClient = new RedisClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
});

async function initializeApp() {
    try {
        const scriptManager = new ScriptManager(redisClient);
        await scriptManager.initialize();

        const rateLimiterService = new RateLimiterService(redisClient, scriptManager);

        app.use(createRoutes(rateLimiterService));
        app.use(errorHandler);

        const signals = ['SIGTERM', 'SIGINT'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`Received ${signal}. Shutting down gracefully...`);
                try {
                    await rateLimiterService.close();
                    process.exit(0);
                } catch (error) {
                    console.error('Error during graceful shutdown:', error);
                    process.exit(1);
                }
            });
        });

        if (require.main === module) {
            const PORT = config.app.port;
            const server = http.createServer(app);
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT} in ${config.app.env} mode`);
            });
        }

        return { rateLimiterService, app };
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

initializeApp().catch(err => {
    console.error('Fatal error during app initialization:', err);
    process.exit(1);
});

export default app;
