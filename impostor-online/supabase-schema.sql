-- =============================================
-- IMPOSTOR ONLINE - Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ROOMS TABLE
-- =============================================
CREATE TABLE rooms (
    code TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'PLAYING', 'VOTING', 'FINISHED')),
    category TEXT,
    secret_word TEXT,
    impostor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PLAYERS TABLE
-- =============================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_alive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ADD FOREIGN KEY FOR IMPOSTOR
-- =============================================
ALTER TABLE rooms 
ADD CONSTRAINT fk_impostor 
FOREIGN KEY (impostor_id) REFERENCES players(id) ON DELETE SET NULL;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_players_room_code ON players(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);

-- =============================================
-- ENABLE REALTIME FOR BOTH TABLES
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- =============================================
-- ENABLE REPLICA IDENTITY FULL FOR DELETE EVENTS
-- This allows Supabase Realtime to send the old row data on DELETE
-- =============================================
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE rooms REPLICA IDENTITY FULL;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations on rooms" ON rooms
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on players" ON players
    FOR ALL USING (true) WITH CHECK (true);
