/*
  # Rummy Game Tables

  1. New Tables
    - `rummy_sessions` - Stores rummy game sessions
    - `rummy_players` - Stores players participating in rummy games
    - `rummy_round_scores` - Stores scores for each round of a rummy game
  
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Check if tables already exist before creating them
DO $$ 
BEGIN
  -- Create rummy_sessions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_sessions') THEN
    CREATE TABLE rummy_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      ended_at timestamptz,
      status text DEFAULT 'active',
      deleted_at timestamptz,
      self_destructed boolean DEFAULT FALSE,
      game_type text,
      player_count integer NOT NULL,
      entry_fee integer NOT NULL,
      current_round integer DEFAULT 1,
      prize_split boolean DEFAULT FALSE
    );
    
    -- Add constraints
    ALTER TABLE rummy_sessions ADD CONSTRAINT valid_status CHECK (status IN ('active', 'completed'));
    ALTER TABLE rummy_sessions ADD CONSTRAINT valid_game_type CHECK (game_type IN ('pool_101', 'pool_201'));
    -- Don't add valid_dates constraint as it already exists
  END IF;

  -- Create rummy_players table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_players') THEN
    CREATE TABLE rummy_players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES rummy_sessions(id) ON DELETE CASCADE,
      name text NOT NULL,
      score integer DEFAULT 0,
      is_eliminated boolean DEFAULT FALSE,
      is_winner boolean DEFAULT FALSE,
      created_at timestamptz DEFAULT now()
    );
    
    -- Add constraint
    ALTER TABLE rummy_players ADD CONSTRAINT valid_score CHECK (score >= 0);
  END IF;

  -- Create rummy_round_scores table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_round_scores') THEN
    CREATE TABLE rummy_round_scores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES rummy_sessions(id) ON DELETE CASCADE,
      player_id uuid REFERENCES rummy_players(id) ON DELETE CASCADE,
      round integer NOT NULL,
      score integer NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Add constraints
    ALTER TABLE rummy_round_scores ADD CONSTRAINT valid_round CHECK (round > 0);
    ALTER TABLE rummy_round_scores ADD CONSTRAINT valid_score CHECK (score >= 0);
  END IF;
END $$;

-- Enable RLS (idempotent operations)
ALTER TABLE rummy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rummy_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rummy_round_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for public access using DO block to handle errors gracefully
DO $$ 
BEGIN
  -- Policies for rummy_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_sessions' AND policyname = 'Allow public read access to rummy_sessions') THEN
    EXECUTE 'CREATE POLICY "Allow public read access to rummy_sessions" ON rummy_sessions FOR SELECT TO public USING (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_sessions' AND policyname = 'Allow public insert access to rummy_sessions') THEN
    EXECUTE 'CREATE POLICY "Allow public insert access to rummy_sessions" ON rummy_sessions FOR INSERT TO public WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_sessions' AND policyname = 'Allow public update access to rummy_sessions') THEN
    EXECUTE 'CREATE POLICY "Allow public update access to rummy_sessions" ON rummy_sessions FOR UPDATE TO public USING (true)';
  END IF;

  -- Policies for rummy_players
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_players' AND policyname = 'Allow public read access to rummy_players') THEN
    EXECUTE 'CREATE POLICY "Allow public read access to rummy_players" ON rummy_players FOR SELECT TO public USING (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_players' AND policyname = 'Allow public insert access to rummy_players') THEN
    EXECUTE 'CREATE POLICY "Allow public insert access to rummy_players" ON rummy_players FOR INSERT TO public WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_players' AND policyname = 'Allow public update access to rummy_players') THEN
    EXECUTE 'CREATE POLICY "Allow public update access to rummy_players" ON rummy_players FOR UPDATE TO public USING (true)';
  END IF;

  -- Policies for rummy_round_scores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_round_scores' AND policyname = 'Allow public read access to rummy_round_scores') THEN
    EXECUTE 'CREATE POLICY "Allow public read access to rummy_round_scores " ON rummy_round_scores FOR SELECT TO public USING (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_round_scores' AND policyname = 'Allow public insert access to rummy_round_scores') THEN
    EXECUTE 'CREATE POLICY "Allow public insert access to rummy_round_scores" ON rummy_round_scores FOR INSERT TO public WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rummy_round_scores' AND policyname = 'Allow public update access to rummy_round_scores') THEN
    EXECUTE 'CREATE POLICY "Allow public update access to rummy_round_scores" ON rummy_round_scores FOR UPDATE TO public USING (true)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Create indexes (IF NOT EXISTS is already in the statements)
CREATE INDEX IF NOT EXISTS rummy_players_session_id_idx ON rummy_players(session_id);
CREATE INDEX IF NOT EXISTS rummy_sessions_status_idx ON rummy_sessions(status);
CREATE INDEX IF NOT EXISTS rummy_sessions_deleted_at_idx ON rummy_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS rummy_round_scores_session_id_idx ON rummy_round_scores(session_id);
CREATE INDEX IF NOT EXISTS rummy_round_scores_player_id_idx ON rummy_round_scores(player_id);
CREATE INDEX IF NOT EXISTS rummy_round_scores_round_idx ON rummy_round_scores(round);