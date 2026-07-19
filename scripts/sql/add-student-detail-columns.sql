-- Run in Supabase SQL editor if these columns do not exist yet.
ALTER TABLE students
ADD COLUMN IF NOT EXISTS average_grade numeric(5, 2),
ADD COLUMN IF NOT EXISTS parent_name text,
ADD COLUMN IF NOT EXISTS parent_phone text,
ADD COLUMN IF NOT EXISTS parent_email text;
