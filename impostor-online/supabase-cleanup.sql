-- Cleanup job for old rooms and inactive players
-- This SQL creates a function and trigger to automatically clean up old data

-- Function to clean up old rooms
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS void AS $$
BEGIN
    -- Delete rooms that are older than 24 hours and are in LOBBY or FINISHED state
    DELETE FROM rooms 
    WHERE status IN ('LOBBY', 'FINISHED') 
    AND updated_at < NOW() - INTERVAL '24 hours';
    
    -- Delete rooms that are older than 24 hours regardless of status
    -- This catches abandoned PLAYING or VOTING rooms
    DELETE FROM rooms 
    WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up orphaned players (players whose rooms were deleted)
CREATE OR REPLACE FUNCTION cleanup_orphaned_players()
RETURNS void AS $$
BEGIN
    DELETE FROM players 
    WHERE room_code NOT IN (SELECT code FROM rooms);
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job using pg_cron (if available)
-- First, enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every 6 hours
SELECT cron.schedule(
    'cleanup-old-rooms',
    '0 */6 * * *',  -- Every 6 hours at minute 0
    'SELECT cleanup_old_rooms(); SELECT cleanup_orphaned_players();'
);

-- Alternative: If pg_cron is not available, you can run this manually:
-- SELECT cleanup_old_rooms();
-- SELECT cleanup_orphaned_players();

-- You can also create a trigger to clean up immediately when a room is deleted
CREATE OR REPLACE FUNCTION cleanup_players_on_room_delete()
RETURNS trigger AS $$
BEGIN
    DELETE FROM players WHERE room_code = OLD.code;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS cleanup_players_trigger ON rooms;
CREATE TRIGGER cleanup_players_trigger
    AFTER DELETE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_players_on_room_delete();

-- View to check old rooms before cleanup
CREATE OR REPLACE VIEW old_rooms_view AS
SELECT 
    code,
    status,
    updated_at,
    NOW() - updated_at AS age,
    CASE 
        WHEN NOW() - updated_at > INTERVAL '24 hours' THEN 'DELETE'
        ELSE 'KEEP'
    END as action
FROM rooms
ORDER BY updated_at;

-- View to check orphaned players
CREATE OR REPLACE VIEW orphaned_players_view AS
SELECT 
    p.id,
    p.name,
    p.room_code,
    p.created_at
FROM players p
LEFT JOIN rooms r ON p.room_code = r.code
WHERE r.code IS NULL;
