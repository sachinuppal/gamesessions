/*
  # Codenames Game Schema

  1. Tables
    - codenames_sessions: Tracks game sessions
    - codenames_players: Tracks players in each session
    - codenames_rounds: Tracks rounds and scores

  2. Constraints
    - Unique round numbers per session
    - Team and role validation

  3. Security
    - Row Level Security enabled on all tables
    - Public access policies for read/write operations
*/

-- Check if tables already exist before creating them
DO $$ 
BEGIN
  -- Create codenames_sessions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'codenames_sessions') THEN
    CREATE TABLE codenames_sessions (
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
  END IF;

  -- Create codenames_players table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'codenames_players') THEN
    CREATE TABLE codenames_players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES codenames_sessions(id) ON DELETE CASCADE,
      name text NOT NULL,
      team text NOT NULL CHECK (team IN ('red', 'blue')),
      role text NOT NULL CHECK (role IN ('spymaster', 'operative')),
      score integer DEFAULT 0,
      is_winner boolean DEFAULT FALSE,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create codenames_rounds table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'codenames_rounds') THEN
    CREATE TABLE codenames_rounds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES codenames_sessions(id) ON DELETE CASCADE,
      round_number integer NOT NULL,
      red_score integer NOT NULL,
      blue_score integer NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add unique constraint for round number per session if it doesn't exist
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

-- Enable RLS on tables
DO $$ 
BEGIN
  -- Enable RLS on tables (these are idempotent operations)
  ALTER TABLE codenames_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE codenames_players ENABLE ROW LEVEL SECURITY;
  ALTER TABLE codenames_rounds ENABLE ROW LEVEL SECURITY;
END $$;

-- Create policies for public access using DO block to handle errors gracefully
DO $$ 
BEGIN
  -- Only create policies if they don't already exist
  
  -- Policies for codenames_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_sessions' AND policyname = 'Allow public read access to codenames_sessions') THEN
    CREATE POLICY "Allow public read access to codenames_sessions" 
      ON codenames_sessions FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_sessions' AND policyname = 'Allow public insert access to codenames_sessions') THEN
    CREATE POLICY "Allow public insert access to codenames_sessions" 
      ON codenames_sessions FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_sessions' AND policyname = 'Allow public update access to codenames_sessions') THEN
    CREATE POLICY "Allow public update access to codenames_sessions" 
      ON codenames_sessions FOR UPDATE TO public USING (true);
  END IF;

  -- Policies for codenames_players
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_players' AND policyname = 'Allow public read access to codenames_players') THEN
    CREATE POLICY "Allow public read access to codenames_players" 
      ON codenames_players FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_players' AND policyname = 'Allow public insert access to codenames_players') THEN
    CREATE POLICY "Allow public insert access to codenames_players" 
      ON codenames_players FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_players' AND policyname = 'Allow public update access to codenames_players') THEN
    CREATE POLICY "Allow public update access to codenames_players" 
      ON codenames_players FOR UPDATE TO public USING (true);
  END IF;

  -- Policies for codenames_rounds
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_rounds' AND policyname = 'Allow public read access to codenames_rounds') THEN
    CREATE POLICY "Allow public read access to codenames_rounds" 
      ON codenames_rounds FOR SELECT TO public USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_rounds' AND policyname = 'Allow public insert access to codenames_rounds') THEN
    CREATE POLICY "Allow public insert access to codenames_rounds" 
      ON codenames_rounds FOR INSERT TO public WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'codenames_rounds' AND policyname = 'Allow public update access to codenames_rounds') THEN
    CREATE POLICY "Allow public update access to codenames_rounds" 
      ON codenames_rounds FOR UPDATE TO public USING (true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Create indexes (IF NOT EXISTS is already in the statements)
CREATE INDEX IF NOT EXISTS codenames_players_session_id_idx ON codenames_players(session_id);
CREATE INDEX IF NOT EXISTS codenames_sessions_status_idx ON codenames_sessions(status);
CREATE INDEX IF NOT EXISTS codenames_sessions_deleted_at_idx ON codenames_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS codenames_rounds_session_id_idx ON codenames_rounds(session_id);
CREATE INDEX IF NOT EXISTS codenames_rounds_round_number_idx ON codenames_rounds(round_number);