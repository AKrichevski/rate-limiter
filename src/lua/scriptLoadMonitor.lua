-- This script is for testing purpose only
-- It tracks when scripts are loaded into Redis

-- Increment a counter when this script is loaded
local count_key = "debug:script_load_count"
local current_count = redis.call("GET", count_key)

if current_count == false then
    current_count = 0
else
    current_count = tonumber(current_count)
end

redis.call("SET", count_key, current_count + 1)

-- Return the current count (after increment)
return current_count + 1
