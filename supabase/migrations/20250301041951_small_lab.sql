/*
  # Codenames Game Tables

  1. New Tables
    - `codenames_sessions`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `ended_at` (timestamp)
      - `status` (text)
      - `deleted_at` (timestamp)
      - `self_destructed` (boolean)
      - `entry_fee` (integer)
      - `player_count` (integer)
      - `current_round` (integer)
    - `codenames_players`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `name` (text)
      - `team` (text)
      - `role` (text)
      - `score` (integer)
      - `is_winner` (boolean)
      - `created_at` (timestamp)
    - `codenames_rounds`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `round_number` (integer)
      - `red_score` (integer)
      - `blue_score` (integer)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Create codenames_sessions table
CREATE TABLE IF NOT EXISTS codenames_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  deleted_at timestamptz,
  self_destructed boolean DEFAULT FALSE,
  entry_fee integer NOT NULL,
  player_count integer NOT NULL,
  current_round integer DEFAULT 0,
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create codenames_players table
CREATE TABLE IF NOT EXISTS codenames_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES codenames_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  team text NOT NULL CHECK (team IN ('red', 'blue')),
  role text NOT NULL CHECK (role IN ('spymaster', 'operative')),
  score integer DEFAULT 0,
  is_winner boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

-- Create codenames_rounds table
CREATE TABLE IF NOT EXISTS codenames_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES codenames_sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  red_score integer NOT NULL,
  blue_score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for round number per session
DO $$ 
BEGIN
  -- Check if the constraint already exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'codenames_rounds_session_id_round_number_key'
  ) THEN
    ALTER TABLE codenames_rounds 
    ADD CONSTRAINT codenames_rounds_session_id_round_number_key 
    UNIQUE (session_id, round_number);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE codenames_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE codenames_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE codenames_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to codenames_sessions" 
  ON codenames_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to codenames_sessions" 
  ON codenames_sessions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to codenames_sessions" 
  ON codenames_sessions FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to codenames_players" 
  ON codenames_players FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to codenames_players" 
  ON codenames_players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to codenames_players" 
  ON codenames_players FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to codenames_rounds" 
  ON codenames_rounds FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to codenames_rounds" 
  ON codenames_rounds FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to codenames_rounds" 
  ON codenames_rounds FOR UPDATE TO public USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS codenames_players_session_id_idx ON codenames_players(session_id);
CREATE INDEX IF NOT EXISTS codenames_sessions_status_idx ON codenames_sessions(status);
CREATE INDEX IF NOT EXISTS codenames_sessions_deleted_at_idx ON codenames_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS codenames_rounds_session_id_idx ON codenames_rounds(session_id);
CREATE INDEX IF NOT EXISTS codenames_rounds_round_number_idx ON codenames_rounds(round_number);