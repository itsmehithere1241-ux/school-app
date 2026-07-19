-- Run in Supabase SQL editor if this column does not exist yet.
ALTER TABLE students
ADD COLUMN IF NOT EXISTS avatar_url text;
