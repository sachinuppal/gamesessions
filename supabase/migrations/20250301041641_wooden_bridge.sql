/*
  # Chess Game Tables

  1. New Tables
    - `chess_sessions`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `ended_at` (timestamp)
      - `status` (text)
      - `deleted_at` (timestamp)
      - `self_destructed` (boolean)
      - `game_type` (text)
      - `player_count` (integer)
      - `entry_fee` (integer)
      - `time_control` (text)
    - `chess_players`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `name` (text)
      - `color` (text)
      - `score` (float)
      - `is_winner` (boolean)
      - `created_at` (timestamp)
    - `chess_games`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `white_player_id` (uuid, foreign key)
      - `black_player_id` (uuid, foreign key)
      - `result` (text)
      - `game_number` (integer)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Create chess_sessions table
CREATE TABLE IF NOT EXISTS chess_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  deleted_at timestamptz,
  self_destructed boolean DEFAULT FALSE,
  game_type text CHECK (game_type IN ('standard', 'rapid', 'blitz')),
  player_count integer NOT NULL,
  entry_fee integer NOT NULL,
  time_control text,
  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
);

-- Create chess_players table
CREATE TABLE IF NOT EXISTS chess_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chess_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  score float DEFAULT 0,
  is_winner boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

-- Create chess_games table
CREATE TABLE IF NOT EXISTS chess_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chess_sessions(id) ON DELETE CASCADE,
  white_player_id uuid REFERENCES chess_players(id) ON DELETE CASCADE,
  black_player_id uuid REFERENCES chess_players(id) ON DELETE CASCADE,
  result text CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  game_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_game_number UNIQUE (session_id, game_number)
);

-- Enable RLS
ALTER TABLE chess_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_games ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to chess_sessions" 
  ON chess_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to chess_sessions" 
  ON chess_sessions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to chess_sessions" 
  ON chess_sessions FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to chess_players" 
  ON chess_players FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to chess_players" 
  ON chess_players FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to chess_players" 
  ON chess_players FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public read access to chess_games" 
  ON chess_games FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access to chess_games" 
  ON chess_games FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access to chess_games" 
  ON chess_games FOR UPDATE TO public USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS chess_players_session_id_idx ON chess_players(session_id);
CREATE INDEX IF NOT EXISTS chess_sessions_status_idx ON chess_sessions(status);
CREATE INDEX IF NOT EXISTS chess_sessions_deleted_at_idx ON chess_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS chess_games_session_id_idx ON chess_games(session_id);
CREATE INDEX IF NOT EXISTS chess_games_white_player_id_idx ON chess_games(white_player_id);
CREATE INDEX IF NOT EXISTS chess_games_black_player_id_idx ON chess_games(black_player_id);