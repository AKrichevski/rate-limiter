// tests/e2e/setup.ts
import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';

// Load environment variables for testing
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Use environment to determine if we need to start services
const SHOULD_START_SERVICES = process.env.START_SERVICES === 'true';
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Child processes array for cleanup
const childProcesses: ChildProcess[] = [];

// Helper function to check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const tester = net.createServer()
            .once('error', () => resolve(true))
            .once('listening', () => {
                tester.close(() => resolve(false));
            })
            .listen(port);
    });
}

// Helper function to wait for a port to be available
async function waitForPort(port: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const inUse = await isPortInUse(port);
        if (inUse) {
            console.log(`Port ${port} is now available`);
            return;
        }
        // Wait 500ms before next check
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for port ${port} to be available`);
}

// Helper function to wait for HTTP endpoint
async function waitForEndpoint(url: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log(`Endpoint ${url} is now available`);
                return;
            }
        } catch (error) {
            // Ignore errors, just retry
        }

        // Wait 500ms before next check
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for endpoint ${url} to be available`);
}

export default async function globalSetup(): Promise<void> {
    // Skip starting services if not required (e.g., running against existing deployment)
    if (!SHOULD_START_SERVICES) {
        console.log('Using existing services, not starting local instances');
        return;
    }

    console.log('Setting up E2E test environment...');

    // Start Redis using docker if needed
    if (process.env.START_REDIS === 'true') {
        console.log('Starting Redis container...');

        // First check if Redis is already running
        const redisRunning = await isPortInUse(6379);

        if (redisRunning) {
            console.log('Redis is already running on port 6379');
        } else {
            const redis = spawn('docker', [
                'run',
                '--name', 'rate-limiter-test-redis',
                '-p', '6379:6379',
                '--rm',
                'redis:7-alpine'
            ]);

            childProcesses.push(redis);

            // Log Redis output
            redis.stdout?.on('data', (data) => {
                console.log(`[Redis]: ${data.toString().trim()}`);
            });

            redis.stderr?.on('data', (data) => {
                console.error(`[Redis Error]: ${data.toString().trim()}`);
            });

            // Wait for Redis to be available
            try {
                await waitForPort(6379);
                console.log('Redis is ready');
            } catch (error) {
                console.error('Failed to start Redis:', error);
                throw error;
            }
        }
    }

    // Start the application if needed
    if (process.env.START_APP === 'true') {
        console.log('Starting application server...');

        // Extract port from API_URL
        const url = new URL(API_URL);
        const port = parseInt(url.port || '3000', 10);

        // First check if app is already running
        const appRunning = await isPortInUse(port);

        if (appRunning) {
            console.log(`Application is already running on port ${port}`);
        } else {
            const app = spawn('npm', ['run', 'dev'], {
                env: {
                    ...process.env,
                    PORT: port.toString(),
                    REDIS_HOST: 'localhost',
                    REDIS_PORT: '6379',
                    NODE_ENV: 'test',
                },
            });

            childProcesses.push(app);

            // Log application output
            app.stdout?.on('data', (data) => {
                console.log(`[App]: ${data.toString().trim()}`);
            });

            app.stderr?.on('data', (data) => {
                console.error(`[App Error]: ${data.toString().trim()}`);
            });

            // Wait for the app to be available
            try {
                await waitForEndpoint(`${API_URL}/health`);
                console.log('Application is ready');
            } catch (error) {
                console.error('Failed to start application:', error);
                throw error;
            }
        }
    }

    // Wait a bit more to ensure everything is fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('E2E test environment is ready');

    // Add an event listener to kill child processes if the main process crashes
    process.on('uncaughtException', () => {
        console.log('Uncaught exception, cleaning up child processes...');
        childProcesses.forEach(proc => {
            try {
                if (proc.pid) proc.kill();
            } catch (err) {
                console.error('Failed to kill child process:', err);
            }
        });
    });

    // Store child processes for teardown
    (global as any).__E2E_CHILD_PROCESSES__ = childProcesses;
}
