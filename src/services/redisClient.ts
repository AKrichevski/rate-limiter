import Redis, { RedisOptions } from 'ioredis';
import { IRedisClient } from "../interfaces/IRedisClient";

export class RedisClient implements IRedisClient {
    private redis: Redis;

    constructor(options: RedisOptions = {}) {
        this.redis = new Redis({
            ...options,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000) + Math.floor(Math.random() * 100);
                console.log(`Redis connection retry in ${delay}ms (attempt ${times})`);
                return delay;
            }
        });

        this.redis.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        this.redis.on('ready', () => {
            console.log('Redis connection established');
        });
    }

    async evalScript(sha: string, keys: string[], args: string[]): Promise<any> {
        try {
            return await this.redis.evalsha(sha, keys.length, ...keys, ...args);
        } catch (error: any) {
            if (error.message?.includes('NOSCRIPT')) {
                throw error;
            }

            if (error.message?.includes('connection')) {
                console.error('Redis connection error during script execution:', error.message);
            }

            throw error;
        }
    }

    async loadScript(script: string): Promise<string> {
        try {
            // This method will load the Lua script and return the SHA1 hash
            return this.redis.script('LOAD', script) as Promise<string>;
        } catch (error: any) {
            console.error('Error loading script to Redis:', error.message);
            throw error;
        }
    }

    async getKey(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async setKey(key: string, value: string, mode?: string, expiry?: number): Promise<boolean> {
        try {
            let result;

            if (mode === 'NX' && expiry) {
                result = await this.redis.set(key, value, 'EX', expiry, 'NX');
            } else if (mode === 'NX') {
                result = await this.redis.set(key, value, 'NX');
            } else if (expiry) {
                result = await this.redis.set(key, value, 'EX', expiry);
            } else {
                result = await this.redis.set(key, value);
            }

            return result === 'OK';
        } catch (error) {
            console.error('Error setting key in Redis:', error);
            return false;
        }
    }

    async deleteKey(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async quit(): Promise<void> {
        try {
            await this.redis.quit();
        } catch (err) {
            console.error('Error closing Redis connection:', err);
        }
    }

    disconnect(): void {
        try {
            this.redis.disconnect();
        } catch (err) {
            console.error('Error disconnecting Redis:', err);
        }
    }
}
