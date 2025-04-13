-- KEYS[1]: User identifier key (e.g., "ratelimit:user123")
-- ARGV[1]: Current timestamp in seconds
-- ARGV[2]: Window size in seconds (e.g., 60 for a minute)
-- ARGV[3]: Max requests allowed for the user's tier

-- Parse arguments
local user_key = KEYS[1]
local timestamp = tonumber(ARGV[1])
local window_size = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])

-- Calculate window boundaries
local current_window = math.floor(timestamp / window_size) * window_size
local previous_window = current_window - window_size

-- Keys for the current and previous windows
local current_key = user_key .. ":" .. current_window
local previous_key = user_key .. ":" .. previous_window

-- Get the count for the current window
local current_count = redis.call("GET", current_key)
if current_count == false then
    current_count = 0
else
    current_count = tonumber(current_count)
end

-- Get the count for the previous window
local previous_count = redis.call("GET", previous_key)
if previous_count == false then
    previous_count = 0
else
    previous_count = tonumber(previous_count)
end

-- Calculate the position in the current window (0.0-1.0)
local window_position = (timestamp % window_size) / window_size

-- Calculate the weighted count based on the sliding window algorithm
local weighted_previous_count = previous_count * (1 - window_position)
local effective_count = current_count + weighted_previous_count

-- Check if the request is allowed under the rate limit
local allowed = 0
local remaining = 0

if effective_count < max_requests then
    -- Increment the counter for the current window
    redis.call("INCR", current_key)
    -- Set expiry on the counter (window size * 2 to ensure we keep the previous window)
    redis.call("EXPIRE", current_key, window_size * 2)
    allowed = 1
    remaining = math.floor(max_requests - effective_count - 1)
else
    remaining = 0
end

-- Calculate time until reset (seconds)
local reset_time = current_window + window_size - timestamp

-- Return results as a table: [allowed, remaining, reset_time, effective_count, max_requests]
-- Added max_requests to output to ensure client knows the tier limit
return {allowed, remaining, reset_time, math.floor(effective_count), max_requests}
