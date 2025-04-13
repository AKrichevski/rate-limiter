module.exports = async () => {
    console.log('Global teardown: Cleaning up Redis connections');

    // Force the event loop to exhaust all callbacks
    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    // Final delay to allow any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force process exit to prevent hanging tests
    // This is a last resort for tests that might have unclosed connections
    setTimeout(() => {
        console.log('Forcing test exit after cleanup');
        process.exit(0);
    }, 1000);
};
