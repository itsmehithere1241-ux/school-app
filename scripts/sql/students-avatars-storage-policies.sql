-- Optional storage policies for the students_avatars bucket.
-- The app uploads avatars through the API using the service role key, so these
-- policies are not required for uploads to work.
-- Paths used by the app: {studentId}/avatar.{ext}  e.g. 12/avatar.jpg

DROP POLICY IF EXISTS "Authenticated upload student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update student avatars" ON storage.objects;

CREATE POLICY "Authenticated upload student avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'students_avatars'
  AND (select auth.role()) = 'authenticated'
);

CREATE POLICY "Authenticated update student avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'students_avatars'
  AND (select auth.role()) = 'authenticated'
)
WITH CHECK (
  bucket_id = 'students_avatars'
  AND (select auth.role()) = 'authenticated'
);
