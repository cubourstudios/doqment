-- Private storage buckets and their access policies.
--
-- Both buckets are private. Files are served exclusively through short-lived
-- signed URLs (60 minutes) — a freelancer's contracts and their client's
-- details must never sit behind a guessable public URL.
--
-- Path convention: <user_id>/<filename>. The policies below lean on that first
-- path segment, so code that writes to storage must follow it.

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false), ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only access, enforced by matching the first folder segment against the
-- caller's user id.
CREATE POLICY "own files" ON storage.objects
  FOR ALL
  USING (
    bucket_id IN ('logos', 'uploads')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('logos', 'uploads')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
