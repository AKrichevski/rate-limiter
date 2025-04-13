import { Express } from 'express';
import request from 'supertest';
import { config } from '../../src/config';

async function importApp(): Promise<Express> {
    try {
        const module = await import('../../src/app');
        return module.default;
    } catch (error) {
        console.error('Failed to import app:', error);
        throw error;
    }
}

describe('Application Tests', () => {
    let app: Express;

    beforeAll(async () => {
        app = await importApp();
    });

    describe('Configuration', () => {
        it('should load configuration correctly', () => {
            expect(config).toBeDefined();
            expect(config.app).toBeDefined();
            expect(config.redis).toBeDefined();
            expect(config.rateLimiter).toBeDefined();
        });
    });

    describe('Application Startup', () => {
        it('should initialize the application', () => {
            expect(app).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should have an error handler', async () => {
            const response = await request(app)
                .post('/non-existent-route')
                .set('X-User-ID', 'test-user')
                .set('X-User-Tier', 'standard');

            expect(response.status).toBe(404);
        });
    });
});
