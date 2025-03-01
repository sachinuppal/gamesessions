/*
  # Create Sequence Game Tables

  1. New Tables
    - `sequence_sessions` - Stores sequence game sessions
    - `sequence_players` - Stores players in sequence games
    - `sequence_rounds` - Stores individual rounds in sequence games
  
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Create sequence_sessions table
CREATE TABLE IF NOT EXISTS sequence_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  deleted_at timestamptz,
  self_destructed boolean DEFAULT FALSE,
  game_type text CHECK (game_type IN ('standard', 'team')),
  player_count integer NOT NULL,
  entry_fee integer NOT NULL,
  current_round integer DEFAULT 0,
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create sequence_players table
CREATE TABLE IF NOT EXISTS sequence_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sequence_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  team text NOT NULL CHECK (team IN ('blue', 'green', 'red')),
  score integer DEFAULT 0,
  is_winner boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

-- Create sequence_rounds table
CREATE TABLE IF NOT EXISTS sequence_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sequence_sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  blue_score integer NOT NULL,
  green_score integer NOT NULL,
  red_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_round_number UNIQUE (session_id, round_number)
);

-- Enable RLS
ALTER TABLE sequence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to sequence_sessions" 
  ON sequence_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to sequence_sessions" 
  ON sequence_sessions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to sequence_sessions" 
  ON sequence_sessions FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to sequence_players" 
  ON sequence_players FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to sequence_players" 
  ON sequence_players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to sequence_players" 
  ON sequence_players FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to sequence_rounds" 
  ON sequence_rounds FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to sequence_rounds" 
  ON sequence_rounds FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to sequence_rounds" 
  ON sequence_rounds FOR UPDATE TO public USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS sequence_players_session_id_idx ON sequence_players(session_id);
CREATE INDEX IF NOT EXISTS sequence_sessions_status_idx ON sequence_sessions(status);
CREATE INDEX IF NOT EXISTS sequence_sessions_deleted_at_idx ON sequence_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS sequence_rounds_session_id_idx ON sequence_rounds(session_id);
CREATE INDEX IF NOT EXISTS sequence_rounds_round_number_idx ON sequence_rounds(round_number);