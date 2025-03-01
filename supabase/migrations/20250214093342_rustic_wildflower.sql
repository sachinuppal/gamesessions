/*
  # Poker Session Management Schema

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `ended_at` (timestamp, nullable)
      - `status` (enum: 'active', 'completed')
    
    - `players`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `name` (text)
      - `initial_buy_in` (integer)
      - `total_buy_in` (integer)
      - `final_chips` (integer, nullable)
      - `net_amount` (integer, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (no auth required for MVP)
*/

-- Create session status enum
CREATE TYPE session_status AS ENUM ('active', 'completed');

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status session_status DEFAULT 'active',
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  initial_buy_in integer NOT NULL DEFAULT 2000,
  total_buy_in integer NOT NULL DEFAULT 2000,
  final_chips integer,
  net_amount integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_buy_in CHECK (total_buy_in >= initial_buy_in),
  CONSTRAINT valid_chips CHECK (final_chips IS NULL OR final_chips >= 0)
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to sessions"
  ON sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to sessions"
  ON sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sessions"
  ON sessions
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to players"
  ON players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to players"
  ON players
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to players"
  ON players
  FOR UPDATE
  TO public
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS players_session_id_idx ON players(session_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);