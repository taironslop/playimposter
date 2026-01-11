-- Migration to add spectator functionality
-- Run this in Supabase SQL Editor

-- Add is_spectator column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN DEFAULT FALSE;

-- Create index for spectator queries
CREATE INDEX IF NOT EXISTS idx_players_spectator ON players(is_spectator);
