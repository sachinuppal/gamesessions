/*
  # Add session auto-termination and settlement tracking

  1. New Columns
    - `sessions` table:
      - `self_destructed` (boolean) - Indicates if a session was auto-terminated
    - `settlements` table:
      - New table to track settlements between players
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `from_player_id` (uuid, references players)
      - `to_player_id` (uuid, references players)
      - `amount` (integer)
      - `settled` (boolean)
      - `settled_at` (timestamptz)
      - `settled_by_goons` (boolean)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `settlements` table
    - Add policies for public access to settlements
*/

-- Add self_destructed column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS self_destructed BOOLEAN DEFAULT FALSE;

-- Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  from_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  to_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  settled boolean DEFAULT FALSE,
  settled_at timestamptz,
  settled_by_goons boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_settlement CHECK (from_player_id != to_player_id)
);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to settlements"
  ON settlements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to settlements"
  ON settlements
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to settlements"
  ON settlements
  FOR UPDATE
  TO public
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS settlements_session_id_idx ON settlements(session_id);
CREATE INDEX IF NOT EXISTS settlements_from_player_id_idx ON settlements(from_player_id);
CREATE INDEX IF NOT EXISTS settlements_to_player_id_idx ON settlements(to_player_id);
CREATE INDEX IF NOT EXISTS settlements_settled_idx ON settlements(settled);