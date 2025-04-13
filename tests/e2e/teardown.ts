import { execSync } from 'child_process';
import { ChildProcess } from 'child_process';

export default async function globalTeardown(): Promise<void> {
    if (process.env.START_SERVICES !== 'true') {
        return;
    }

    console.log('Tearing down E2E test environment...');

    // Kill all child processes started during setup
    const childProcesses: ChildProcess[] = (global as any).__E2E_CHILD_PROCESSES__ || [];

    for (const process of childProcesses) {
        try {
            if (process.pid) {
                console.log(`Stopping process with PID ${process.pid}...`);
                process.kill();
            }
        } catch (err) {
            console.error('Failed to kill process:', err);
        }
    }

    // Ensure Redis container is stopped and removed
    if (process.env.START_REDIS === 'true') {
        try {
            console.log('Stopping Redis container...');
            execSync('docker stop rate-limiter-test-redis || true', { stdio: 'inherit' });
        } catch (err) {
            // Container might already be stopped, ignore errors
            console.log('Note: Redis container might already be stopped');
        }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('E2E test environment teardown complete');
}
