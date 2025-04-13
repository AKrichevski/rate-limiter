export type Tier = 'high' | 'standard';

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    effectiveCount: number;
    limit: number;
}
