/*
  # Create Bridge Game Tables

  1. New Tables
    - `bridge_sessions` - Stores bridge game sessions
    - `bridge_players` - Stores players in bridge games
    - `bridge_deals` - Stores individual deals in bridge games
  
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Create bridge_sessions table
CREATE TABLE IF NOT EXISTS bridge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  deleted_at timestamptz,
  self_destructed boolean DEFAULT FALSE,
  game_type text CHECK (game_type IN ('rubber', 'duplicate')),
  player_count integer NOT NULL,
  entry_fee integer NOT NULL,
  current_deal integer DEFAULT 0,
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create bridge_players table
CREATE TABLE IF NOT EXISTS bridge_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES bridge_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  team text NOT NULL CHECK (team IN ('NS', 'EW')),
  score integer DEFAULT 0,
  is_winner boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

-- Create bridge_deals table
CREATE TABLE IF NOT EXISTS bridge_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES bridge_sessions(id) ON DELETE CASCADE,
  deal_number integer NOT NULL,
  ns_score integer NOT NULL,
  ew_score integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_deal_number UNIQUE (session_id, deal_number)
);

-- Enable RLS
ALTER TABLE bridge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_deals ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to bridge_sessions" 
  ON bridge_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to bridge_sessions" 
  ON bridge_sessions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to bridge_sessions" 
  ON bridge_sessions FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to bridge_players" 
  ON bridge_players FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to bridge_players" 
  ON bridge_players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to bridge_players" 
  ON bridge_players FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to bridge_deals" 
  ON bridge_deals FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to bridge_deals" 
  ON bridge_deals FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to bridge_deals" 
  ON bridge_deals FOR UPDATE TO public USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS bridge_players_session_id_idx ON bridge_players(session_id);
CREATE INDEX IF NOT EXISTS bridge_sessions_status_idx ON bridge_sessions(status);
CREATE INDEX IF NOT EXISTS bridge_sessions_deleted_at_idx ON bridge_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS bridge_deals_session_id_idx ON bridge_deals(session_id);
CREATE INDEX IF NOT EXISTS bridge_deals_deal_number_idx ON bridge_deals(deal_number);