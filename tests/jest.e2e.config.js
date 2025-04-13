/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/e2e/**/*.e2e.test.ts'],
    verbose: true,
    testTimeout: 120000,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: true
};
