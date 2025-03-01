/*
  # Housie Game Tables

  1. New Tables
    - `housie_sessions`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `ended_at` (timestamp)
      - `status` (text)
      - `deleted_at` (timestamp)
      - `self_destructed` (boolean)
      - `ticket_price` (integer)
      - `player_count` (integer)
      - `current_number` (integer)
    - `housie_players`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `name` (text)
      - `ticket_count` (integer)
      - `total_winnings` (integer)
      - `created_at` (timestamp)
    - `housie_numbers`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `number` (integer)
      - `sequence` (integer)
      - `created_at` (timestamp)
    - `housie_prizes`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `player_id` (uuid, foreign key)
      - `prize_type` (text)
      - `amount` (integer)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Create housie_sessions table
CREATE TABLE IF NOT EXISTS housie_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  deleted_at timestamptz,
  self_destructed boolean DEFAULT FALSE,
  ticket_price integer NOT NULL,
  player_count integer NOT NULL,
  current_number integer DEFAULT 0,
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create housie_players table
CREATE TABLE IF NOT EXISTS housie_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES housie_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  ticket_count integer NOT NULL DEFAULT 1,
  total_winnings integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create housie_numbers table
CREATE TABLE IF NOT EXISTS housie_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES housie_sessions(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK (number >= 1 AND number <= 90),
  sequence integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_number_per_session UNIQUE (session_id, number),
  CONSTRAINT unique_sequence_per_session UNIQUE (session_id, sequence)
);

-- Create housie_prizes table
CREATE TABLE IF NOT EXISTS housie_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES housie_sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES housie_players(id) ON DELETE CASCADE,
  prize_type text NOT NULL CHECK (prize_type IN ('early_five', 'top_line', 'middle_line', 'bottom_line', 'full_house')),
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_prize_type_per_session UNIQUE (session_id, prize_type)
);

-- Enable RLS
ALTER TABLE housie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE housie_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE housie_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE housie_prizes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to housie_sessions" 
  ON housie_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to housie_sessions" 
  ON housie_sessions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to housie_sessions" 
  ON housie_sessions FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to housie_players" 
  ON housie_players FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to housie_players" 
  ON housie_players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to housie_players" 
  ON housie_players FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to housie_numbers" 
  ON housie_numbers FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to housie_numbers" 
  ON housie_numbers FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to housie_numbers" 
  ON housie_numbers FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to housie_prizes" 
  ON housie_prizes FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to housie_prizes" 
  ON housie_prizes FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to housie_prizes" 
  ON housie_prizes FOR UPDATE TO public USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS housie_players_session_id_idx ON housie_players(session_id);
CREATE INDEX IF NOT EXISTS housie_sessions_status_idx ON housie_sessions(status);
CREATE INDEX IF NOT EXISTS housie_sessions_deleted_at_idx ON housie_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS housie_numbers_session_id_idx ON housie_numbers(session_id);
CREATE INDEX IF NOT EXISTS housie_numbers_sequence_idx ON housie_numbers(sequence);
CREATE INDEX IF NOT EXISTS housie_prizes_session_id_idx ON housie_prizes(session_id);
CREATE INDEX IF NOT EXISTS housie_prizes_player_id_idx ON housie_prizes(player_id);