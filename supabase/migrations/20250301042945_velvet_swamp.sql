/*
  # Chess Game Schema Update

  This migration ensures the chess tables and policies exist without conflicts.
  It uses conditional checks to avoid errors when objects already exist.
*/

-- Check if tables already exist before creating them
DO $$ 
BEGIN
  -- Create chess_sessions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chess_sessions') THEN
    CREATE TABLE chess_sessions (
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
  END IF;

  -- Create chess_players table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chess_players') THEN
    CREATE TABLE chess_players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES chess_sessions(id) ON DELETE CASCADE,
      name text NOT NULL,
      color text,
      score float DEFAULT 0,
      is_winner boolean DEFAULT FALSE,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create chess_games table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chess_games') THEN
    CREATE TABLE chess_games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES chess_sessions(id) ON DELETE CASCADE,
      white_player_id uuid REFERENCES chess_players(id) ON DELETE CASCADE,
      black_player_id uuid REFERENCES chess_players(id) ON DELETE CASCADE,
      result text CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
      game_number integer NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add unique constraint for game number per session if it doesn't exist
DO $$ 
BEGIN
  -- Check if the constraint already exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_game_number'
  ) THEN
    ALTER TABLE chess_games 
    ADD CONSTRAINT unique_game_number 
    UNIQUE (session_id, game_number);
  END IF;
END $$;

-- Enable RLS on tables
DO $$ 
BEGIN
  -- Enable RLS on tables (these are idempotent operations)
  ALTER TABLE chess_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chess_players ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chess_games ENABLE ROW LEVEL SECURITY;
END $$;

-- Create policies for public access using DO block to handle errors gracefully
DO $$ 
BEGIN
  -- Only create policies if they don't already exist
  
  -- Policies for chess_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_sessions' AND policyname = 'Allow public read access to chess_sessions') THEN
    CREATE POLICY "Allow public read access to chess_sessions" 
      ON chess_sessions FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_sessions' AND policyname = 'Allow public insert access to chess_sessions') THEN
    CREATE POLICY "Allow public insert access to chess_sessions" 
      ON chess_sessions FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_sessions' AND policyname = 'Allow public update access to chess_sessions') THEN
    CREATE POLICY "Allow public update access to chess_sessions" 
      ON chess_sessions FOR UPDATE TO public USING (true);
  END IF;

  -- Policies for chess_players
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_players' AND policyname = 'Allow public read access to chess_players') THEN
    CREATE POLICY "Allow public read access to chess_players" 
      ON chess_players FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_players' AND policyname = 'Allow public insert access to chess_players') THEN
    CREATE POLICY "Allow public insert access to chess_players" 
      ON chess_players FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_players' AND policyname = 'Allow public update access to chess_players') THEN
    CREATE POLICY "Allow public update access to chess_players" 
      ON chess_players FOR UPDATE TO public USING (true);
  END IF;

  -- Policies for chess_games
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_games' AND policyname = 'Allow public read access to chess_games') THEN
    CREATE POLICY "Allow public read access to chess_games" 
      ON chess_games FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_games' AND policyname = 'Allow public insert access to chess_games') THEN
    CREATE POLICY "Allow public insert access to chess_games" 
      ON chess_games FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chess_games' AND policyname = 'Allow public update access to chess_games') THEN
    CREATE POLICY "Allow public update access to chess_games" 
      ON chess_games FOR UPDATE TO public USING (true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Create indexes (IF NOT EXISTS is already in the statements)
CREATE INDEX IF NOT EXISTS chess_players_session_id_idx ON chess_players(session_id);
CREATE INDEX IF NOT EXISTS chess_sessions_status_idx ON chess_sessions(status);
CREATE INDEX IF NOT EXISTS chess_sessions_deleted_at_idx ON chess_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS chess_games_session_id_idx ON chess_games(session_id);
CREATE INDEX IF NOT EXISTS chess_games_white_player_id_idx ON chess_games(white_player_id);
CREATE INDEX IF NOT EXISTS chess_games_black_player_id_idx ON chess_games(black_player_id);