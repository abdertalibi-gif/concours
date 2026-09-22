-- ============================================================
-- CONCOURS MAROC — Supabase Storage : Bucket & Policies Documents
-- ============================================================

-- 1. Création du bucket 'documents' en mode public (20 MB max, PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, 
  20971520, -- 20 MB (20 * 1024 * 1024)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Lecture publique pour afficher les PDF dans l'application
DROP POLICY IF EXISTS "Public Read Documents" ON storage.objects;
CREATE POLICY "Public Read Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- 3. Autoriser l'upload de fichiers PDF dans le bucket documents
DROP POLICY IF EXISTS "Allow Document Uploads" ON storage.objects;
CREATE POLICY "Allow Document Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

-- 4. Autoriser la mise à jour / remplacement
DROP POLICY IF EXISTS "Allow Document Updates" ON storage.objects;
CREATE POLICY "Allow Document Updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents');

-- 5. Autoriser la suppression
DROP POLICY IF EXISTS "Allow Document Deletes" ON storage.objects;
CREATE POLICY "Allow Document Deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');
