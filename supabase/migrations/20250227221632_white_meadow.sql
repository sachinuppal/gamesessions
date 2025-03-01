/*
  # Rummy Game Tables Migration

  1. Tables
    - Checks if tables already exist before attempting to create them
    - Adds constraints only if tables are being created
    - Ensures no duplicate policies are created
  
  2. Indexes
    - Creates indexes for better query performance
*/

-- Check if tables exist before creating them
DO $$ 
BEGIN
  -- Create rummy_sessions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_sessions') THEN
    CREATE TABLE rummy_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      ended_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      deleted_at timestamptz,
      self_destructed boolean DEFAULT FALSE,
      game_type text CHECK (game_type IN ('pool_101', 'pool_201')),
      player_count integer NOT NULL,
      entry_fee integer NOT NULL,
      current_round integer DEFAULT 1,
      prize_split boolean DEFAULT FALSE,
      CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at > created_at)
    );
    
    -- Enable RLS only if table was just created
    ALTER TABLE rummy_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Create policies only if table was just created
    CREATE POLICY "Allow public read access to rummy_sessions" 
      ON rummy_sessions FOR SELECT TO public USING (true);
    
    CREATE POLICY "Allow public insert access to rummy_sessions" 
      ON rummy_sessions FOR INSERT TO public WITH CHECK (true);
    
    CREATE POLICY "Allow public update access to rummy_sessions" 
      ON rummy_sessions FOR UPDATE TO public USING (true);
  END IF;

  -- Create rummy_players table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_players') THEN
    CREATE TABLE rummy_players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES rummy_sessions(id) ON DELETE CASCADE,
      name text NOT NULL,
      score integer DEFAULT 0 CHECK (score >= 0),
      is_eliminated boolean DEFAULT FALSE,
      is_winner boolean DEFAULT FALSE,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS only if table was just created
    ALTER TABLE rummy_players ENABLE ROW LEVEL SECURITY;
    
    -- Create policies only if table was just created
    CREATE POLICY "Allow public read access to rummy_players" 
      ON rummy_players FOR SELECT TO public USING (true);
    
    CREATE POLICY "Allow public insert access to rummy_players" 
      ON rummy_players FOR INSERT TO public WITH CHECK (true);
    
    CREATE POLICY "Allow public update access to rummy_players" 
      ON rummy_players FOR UPDATE TO public USING (true);
  END IF;

  -- Create rummy_round_scores table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rummy_round_scores') THEN
    CREATE TABLE rummy_round_scores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES rummy_sessions(id) ON DELETE CASCADE,
      player_id uuid REFERENCES rummy_players(id) ON DELETE CASCADE,
      round integer NOT NULL CHECK (round > 0),
      score integer NOT NULL CHECK (score >= 0),
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS only if table was just created
    ALTER TABLE rummy_round_scores ENABLE ROW LEVEL SECURITY;
    
    -- Create policies only if table was just created
    CREATE POLICY "Allow public read access to rummy_round_scores" 
      ON rummy_round_scores FOR SELECT TO public USING (true);
    
    CREATE POLICY "Allow public insert access to rummy_round_scores" 
      ON rummy_round_scores FOR INSERT TO public WITH CHECK (true);
    
    CREATE POLICY "Allow public update access to rummy_round_scores" 
      ON rummy_round_scores FOR UPDATE TO public USING (true);
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS ensures they won't be duplicated)
CREATE INDEX IF NOT EXISTS rummy_players_session_id_idx ON rummy_players(session_id);
CREATE INDEX IF NOT EXISTS rummy_sessions_status_idx ON rummy_sessions(status);
CREATE INDEX IF NOT EXISTS rummy_sessions_deleted_at_idx ON rummy_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS rummy_round_scores_session_id_idx ON rummy_round_scores(session_id);
CREATE INDEX IF NOT EXISTS rummy_round_scores_player_id_idx ON rummy_round_scores(player_id);
CREATE INDEX IF NOT EXISTS rummy_round_scores_round_idx ON rummy_round_scores(round);