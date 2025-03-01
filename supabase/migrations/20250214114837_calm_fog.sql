/*
  # Add soft delete support for sessions

  1. Changes
    - Add `deleted_at` timestamp column to sessions table
    - Add index on deleted_at for better query performance
*/

-- Add deleted_at column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS sessions_deleted_at_idx ON sessions(deleted_at);