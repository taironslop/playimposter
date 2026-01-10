-- =============================================
-- IMPOSTOR ONLINE - Voting System Migration
-- =============================================
-- Run this SQL in Supabase SQL Editor to add voting functionality

-- Add voted_for column to players table
ALTER TABLE players 
ADD COLUMN voted_for UUID REFERENCES players(id) ON DELETE SET NULL;

-- Create index for faster vote counting
CREATE INDEX idx_players_voted_for ON players(voted_for);
