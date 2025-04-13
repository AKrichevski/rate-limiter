# Rate Limiter Service

A scalable rate limiter service built with Node.js, Express, TypeScript, and Redis. This service limits the number of requests a user can make based on their tier (standard or high) using a sliding window algorithm.

## Features

- HTTP API with rate limiting capabilities
- Multiple user tiers with distinct request limits (standard: 500/min, high: 1000/min)
- Distributed rate limiting using Redis
- Sliding window algorithm for accurate rate limiting
- Containerized with Docker and Docker Compose
- Comprehensive test suite (unit and e2e tests)

## Rate Limiting Algorithm

This service implements a **sliding window algorithm** for rate limiting. Here's why this approach was chosen:

- **Accuracy**: Unlike fixed window counters that can allow bursts of traffic at window boundaries, the sliding window provides a smoother rate limiting experience.
- **Fairness**: The algorithm considers requests over a continuous time window, preventing edge case abuse.
- **Efficiency**: Implemented using Redis and Lua scripting for atomic operations with minimal overhead.

### How it works

1. For each user, we maintain counters in two adjacent time windows (current and previous)
2. As time progresses, we calculate a weighted count using both windows
3. The weight of the previous window decreases as we move through the current window
4. This creates a smooth sliding effect that prevents traffic spikes at window boundaries

## Project Structure

```
rate-limiter/
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── app.ts                   # Main Express application
│   ├── config/                  # Application configuration
│   ├── controllers/             # Request handlers
│   ├── dto/                     # Data transfer objects
│   ├── interfaces/              # TypeScript interfaces
│   ├── lua/                     # Lua scripts for Redis
│   │   └── rateLimiter.lua      # Sliding window implementation
│   ├── middleware/              # Express middleware
│   ├── routes/                  # API routes
│   └── services/                # Core services
│       ├── rateLimiter.ts       # Rate limiter implementation
│       ├── redisClient.ts       # Redis client wrapper
│       └── scriptManager.ts     # Redis Lua script manager
└── tests/
    ├── unit/                    # Unit tests
    ├── e2e/                     # End-to-end tests
    └── helpers/                 # Test utilities
```

## Prerequisites

- Docker and Docker Compose
- Node.js v18+ (for local development)
- npm

## Getting Started

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rate-limiter.git
   cd rate-limiter
   ```

2. Build and run the service using Docker Compose:
   ```bash
   docker-compose up --build
   ```

   This will start both the Node.js application and Redis server.

3. Test the API:
   ```bash
   # In PowerShell:
   Invoke-WebRequest -Uri "http://localhost:3000/api/request" -Method POST -Headers @{"X-User-ID"="user123"; "X-User-Tier"="standard"}
   
   # Or with curl.exe:
   curl.exe -X POST "http://localhost:3000/api/request" -H "X-User-ID: user123" -H "X-User-Tier: standard"
   ```

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/AKrichevski/rate-limiter.git
   cd rate-limiter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make sure you have Redis running locally or update the .env file with your Redis connection details

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
NODE_ENV=development
RATE_LIMIT_WINDOW_SIZE_SECONDS=60
RATE_LIMIT_STANDARD=500
RATE_LIMIT_HIGH=1000
```

## API Documentation

### Rate Limited Endpoint

**POST /api/request**

Headers:
- `X-User-ID`: User identifier (required)
- `X-User-Tier`: User tier, either "standard" or "high" (required)

Responses:
- `200 OK`: Request was allowed and processed
- `400 Bad Request`: Missing or invalid headers
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Rate Limit Headers (included in all responses):
- `X-RateLimit-Limit`: Maximum requests allowed per minute
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Seconds until the rate limit resets

### Health Check

**GET /health**

Response:
- `200 OK`: Service is running properly

## Running Tests

### All Tests

Run the full test suite with:

```bash
npm test
```

### Unit Tests

Run only unit tests with:

```bash
npm run test:unit
```


### End-to-End Tests

Run only end-to-end tests with:

```bash
npm run test:e2e
```

## Design Decisions and Trade-offs

### Sliding Window Algorithm

The sliding window algorithm was selected for its balance between accuracy and performance. While more complex than a fixed window counter, it provides a much smoother rate limiting experience.

**Advantages:**
- Prevents traffic spikes at window boundaries
- More accurate representation of request rates over time
- Still relatively efficient in terms of Redis operations

**Trade-offs:**
- Slightly more complex implementation
- Uses more Redis memory (needs two counters per user)

### Redis Lua Script

Rate limiting operations are implemented as a Lua script executed directly in Redis, which provides:

**Advantages:**
- Atomic operations (no race conditions)
- Reduced network roundtrips
- Encapsulated logic that runs close to the data

**Trade-offs:**
- Less transparent debugging
- Requires Redis 2.6+

### TypeScript and Zod Validation

TypeScript combined with Zod validation ensures type safety and proper request validation:

**Advantages:**
- Compile-time type checking
- Runtime validation of input data
- Self-documenting code

**Trade-offs:**
- Slightly increased complexity
- Additional build step

## Scaling Considerations

The service is designed to scale horizontally:

- Multiple instances can run behind a load balancer
- Redis serves as the central source of truth for rate limiting data
- Lua scripting ensures atomic operations even under high concurrency

For very high scale:
- Redis can be deployed in a cluster configuration
- Consider sharding users across multiple Redis instances

