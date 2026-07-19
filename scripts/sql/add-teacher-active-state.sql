-- Run in Supabase SQL editor if active_state does not exist yet.
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS active_state boolean NOT NULL DEFAULT true;
