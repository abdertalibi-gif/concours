-- ====================================================================
-- CONCOURS MAROC — FIX « Bucket not found » : bucket 'documents' + policies + colonnes
-- Complète : 20250101_initial_schema.sql / 20250102_rls.sql / 20260101_storage_documents.sql
--
-- 100% idempotent et NON destructif : aucune donnée supprimée.
-- À exécuter depuis Supabase → SQL Editor.
-- ====================================================================

-- 1) Créer le bucket Storage 'documents' (public, 20 Mo max, PDF uniquement)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', TRUE, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Ré-applique la config même si le bucket existait déjà (ne supprime rien).
UPDATE storage.buckets
SET public = TRUE,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'documents';

-- 2) Policies Storage : lecture publique + upload / remplacement / suppression
-- L'application se connecte à Supabase avec la clé anon (auth locale, pas Supabase Auth).
DROP POLICY IF EXISTS "Public Read Documents" ON storage.objects;
CREATE POLICY "Public Read Documents"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Uploads" ON storage.objects;
CREATE POLICY "Allow Document Uploads"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Updates" ON storage.objects;
CREATE POLICY "Allow Document Updates"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Deletes" ON storage.objects;
CREATE POLICY "Allow Document Deletes"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'documents');

-- 3) Colonnes manquantes sur public.documents (requises par le push du frontend)
-- DocItem → fileUrl, filePath, fileName, fileType, mimeType, fileSize, sourceUrl, ...
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 4) RLS : autoriser l'écriture depuis l'application (clé anon, sans Supabase Auth)
-- NB : lecture publique limitée aux documents PUBLISHED (policy "public read documents").
--      Cette policy d'écriture concerne UNIQUEMENT la table documents.
DROP POLICY IF EXISTS "app write documents" ON public.documents;
CREATE POLICY "app write documents" ON public.documents
FOR ALL USING (TRUE) WITH CHECK (TRUE);