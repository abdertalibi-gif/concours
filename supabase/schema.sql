-- ============================================================
-- CONCOURS MAROC — Supabase Schema Unifié
-- Fusionne schema.sql, 20250101_initial_schema.sql, 20250102_rls.sql,
-- 20250103_agent.sql, 20260101_storage_documents.sql,
-- 20260201_fix_documents_storage.sql, 20260202_add_correction_pdf_url.sql
-- en un seul fichier cohérent et non destructif.
-- ============================================================

-- 1. Profils (lié à auth.users via Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  city TEXT,
  level TEXT,
  phone TEXT,
  bio TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table app_users (compatibilité backend/serveur)
-- Ne stocke PAS le password_hash (géré par Supabase Auth)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'ACTIVE',
  city TEXT,
  level TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 3. Ministères
CREATE TABLE IF NOT EXISTS ministries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  description TEXT,
  website TEXT,
  source_url TEXT,
  address TEXT,
  status TEXT DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT TRUE,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Universités
CREATE TABLE IF NOT EXISTS universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  description TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  website TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Écoles
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  university_id TEXT REFERENCES universities(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  long_description TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL,
  domains TEXT[] DEFAULT '{}',
  levels TEXT[] DEFAULT '{}',
  founded TEXT,
  students TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Concours
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  university_id TEXT REFERENCES universities(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  category TEXT NOT NULL,
  year INT NOT NULL,
  level TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  domaine TEXT,
  places INT DEFAULT 0,
  description TEXT,
  conditions TEXT[] DEFAULT '{}',
  profil TEXT,
  programme TEXT,
  matieres TEXT[] DEFAULT '{}',
  epreuves TEXT[] DEFAULT '{}',
  documents_demandes TEXT[] DEFAULT '{}',
  procedure TEXT,
  frais TEXT,
  resultats TEXT,
  registration_start TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  competition_date TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  official_website TEXT,
  registration_url TEXT,
  source_url TEXT,
  source_organization TEXT,
  verification_status TEXT DEFAULT 'UNVERIFIED',
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  publish_status TEXT DEFAULT 'PUBLISHED',
  manual_status TEXT,
  views INT DEFAULT 0,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Examens
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL DEFAULT '',
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  organization_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  year INT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  correction_pdf_url TEXT,
  pages INT,
  duration TEXT,
  downloads INT DEFAULT 0,
  has_correction BOOLEAN DEFAULT FALSE,
  source TEXT,
  verification_status TEXT DEFAULT 'VERIFIED',
  publish_status TEXT DEFAULT 'PUBLISHED',
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
  year INT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  mime_type TEXT,
  file_size TEXT,
  source_url TEXT,
  downloads INT DEFAULT 0,
  publish_status TEXT DEFAULT 'PUBLISHED',
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Cours
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#0B63CE',
  duration TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'Intermédiaire',
  chapters JSONB NOT NULL DEFAULT '[]',
  publish_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Favoris
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('CONCOURS', 'EXAMEN', 'DOCUMENT', 'COURS', 'ECOLE')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

-- 11. Suivis
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, competition_id)
);

-- 12. Candidatures
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_legacy_id TEXT,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Progression
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons TEXT[] DEFAULT '{}',
  percent INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 15. Signalements
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
  competition_title TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Activité admin
CREATE TABLE IF NOT EXISTS admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Agent Sources & Logs (IA Agent)
CREATE TABLE IF NOT EXISTS agent_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  "organizationName" TEXT,
  "schoolId" UUID REFERENCES schools(id),
  "ministryId" UUID REFERENCES ministries(id),
  "isActive" BOOLEAN DEFAULT true,
  "lastCheckAt" TIMESTAMPTZ,
  "lastUpdateAt" TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  "lastError" TEXT,
  "contentHash" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sourceId" UUID NOT NULL REFERENCES agent_sources(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'INFO',
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Masters (pour les concours d'accès aux masters universitaires)
CREATE TABLE IF NOT EXISTS masters (
  id TEXT PRIMARY KEY,
  unique_key TEXT UNIQUE,
  name TEXT NOT NULL,
  university TEXT,
  establishment TEXT,
  city TEXT,
  domain TEXT,
  level TEXT,
  academic_year TEXT,
  opening_date TIMESTAMPTZ,
  deadline_date TIMESTAMPTZ,
  exam_date TIMESTAMPTZ,
  publication_date TIMESTAMPTZ,
  results_date TIMESTAMPTZ,
  conditions TEXT,
  documents TEXT,
  seats INT,
  official_url TEXT,
  source_url TEXT,
  status TEXT DEFAULT 'INFORMATION',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_summaries (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  new_count INT DEFAULT 0,
  updated_count INT DEFAULT 0,
  duplicate_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  upcoming_count INT DEFAULT 0,
  closed_count INT DEFAULT 0,
  results_count INT DEFAULT 0,
  details TEXT
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON competitions(slug);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(publish_status);
CREATE INDEX IF NOT EXISTS idx_competitions_deadline ON competitions(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_universities_slug ON universities(slug);
CREATE INDEX IF NOT EXISTS idx_ministries_slug ON ministries(slug);
CREATE INDEX IF NOT EXISTS idx_exams_slug ON exams(slug);
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_applications_competition ON applications(competition_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW Level SECURITY;
ALTER TABLE reports ENABLE ROW Level SECURITY;
ALTER TABLE admin_activity ENABLE ROW Level SECURITY;
ALTER TABLE agent_sources ENABLE ROW Level SECURITY;
ALTER TABLE agent_logs ENABLE ROW Level SECURITY;
ALTER TABLE masters ENABLE ROW Level SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- ---------- LECTURE PUBLIQUE ----------
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ministries" ON ministries;
CREATE POLICY "Public read ministries" ON ministries FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "Public read universities" ON universities;
CREATE POLICY "Public read universities" ON universities FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "Public read schools" ON schools;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "Public read competitions" ON competitions;
CREATE POLICY "Public read competitions" ON competitions FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "Public read exams" ON exams;
CREATE POLICY "Public read exams" ON exams FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "Public read documents" ON documents;
CREATE POLICY "Public read documents" ON documents FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "Public read courses" ON courses;
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (publish_status = 'PUBLISHED');

-- ---------- ÉCRITURE ADMIN ----------
DROP POLICY IF EXISTS "Admin write ministries" ON ministries;
CREATE POLICY "Admin write ministries" ON ministries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write universities" ON universities;
CREATE POLICY "Admin write universities" ON universities FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write schools" ON schools;
CREATE POLICY "Admin write schools" ON schools FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write competitions" ON competitions;
CREATE POLICY "Admin write competitions" ON competitions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write exams" ON exams;
CREATE POLICY "Admin write exams" ON exams FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write documents" ON documents;
CREATE POLICY "Admin write documents" ON documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write courses" ON courses;
CREATE POLICY "Admin write courses" ON courses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- PROFILS ----------
DROP POLICY IF EXISTS "User read own profile" ON profiles;
CREATE POLICY "User read own profile" ON profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "User update own profile" ON profiles;
CREATE POLICY "User update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin read profiles" ON profiles;
CREATE POLICY "Admin read profiles" ON profiles FOR SELECT USING (public.is_admin());

-- ---------- DONNÉES UTILISATEUR ----------
DROP POLICY IF EXISTS "User own favorites" ON favorites;
CREATE POLICY "User own favorites" ON favorites FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "User own follows" ON follows;
CREATE POLICY "User own follows" ON follows FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "User own applications" ON applications;
CREATE POLICY "User own applications" ON applications FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "User own notifications" ON notifications;
CREATE POLICY "User own notifications" ON notifications FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'all');
DROP POLICY IF EXISTS "Admin write notifications" ON notifications;
CREATE POLICY "Admin write notifications" ON notifications FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update notifications" ON notifications FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "User own progress" ON user_progress;
CREATE POLICY "User own progress" ON user_progress FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- ---------- REPORTS ----------
DROP POLICY IF EXISTS "User insert reports" ON reports;
CREATE POLICY "User insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin manage reports" ON reports;
CREATE POLICY "Admin manage reports" ON reports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- ADMIN ACTIVITY ----------
DROP POLICY IF EXISTS "Admin read activity" ON admin_activity;
CREATE POLICY "Admin read activity" ON admin_activity FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin insert activity" ON admin_activity;
CREATE POLICY "Admin insert activity" ON admin_activity FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', true, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520, allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "Public Read Documents" ON storage.objects;
CREATE POLICY "Public Read Documents" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Uploads" ON storage.objects;
CREATE POLICY "Allow Document Uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Updates" ON storage.objects;
CREATE POLICY "Allow Document Updates" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow Document Deletes" ON storage.objects;
CREATE POLICY "Allow Document Deletes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documents');

-- ============================================================
-- SEED (données réelles)
-- ============================================================
-- Voir supabase/seed.sql pour les données d'initialisation.
