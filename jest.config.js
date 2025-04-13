module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    globalTeardown: '<rootDir>/tests/teardown.js',
    forceExit: true,
    testTimeout: 10000,

    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'html', 'lcov']
};
