-- ============================================================
-- CONCOURS MAROC — Schéma PostgreSQL Supabase
-- Compatible à 100% avec les types et données de l'application
-- Tables créées de manière non destructive (IF NOT EXISTS)
-- ============================================================

-- 1. Ministères
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

-- 2. Universités
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

-- 3. Écoles & Établissements
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

-- 4. Concours
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

-- 5. Examens & Annales
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  organization_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  year INT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
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

-- 6. Documents Officiels
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
  file_size TEXT,
  source_url TEXT,
  downloads INT DEFAULT 0,
  publish_status TEXT DEFAULT 'PUBLISHED',
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Cours & Préparation
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT,
  color TEXT,
  duration TEXT,
  difficulty TEXT,
  chapters JSONB DEFAULT '[]'::jsonb,
  publish_status TEXT DEFAULT 'PUBLISHED',
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Utilisateurs de l'application
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'ACTIVE',
  city TEXT,
  level TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 9. Favoris
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_favorite UNIQUE(user_id, target_type, target_id)
);

-- 10. Suivis de concours (Follows)
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_follow UNIQUE(user_id, competition_id)
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  read_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Progression des utilisateurs dans les cours
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons TEXT[] DEFAULT '{}',
  percent INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_course_progress UNIQUE(user_id, course_id)
);

-- 13. Signalements
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
  competition_title TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les performances de recherche
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON competitions(slug);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(publish_status);
CREATE INDEX IF NOT EXISTS idx_competitions_deadline ON competitions(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_universities_slug ON universities(slug);
CREATE INDEX IF NOT EXISTS idx_ministries_slug ON ministries(slug);
CREATE INDEX IF NOT EXISTS idx_exams_slug ON exams(slug);
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);

-- Activer Row Level Security (RLS)
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique (SELECT public)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select ministries') THEN
    CREATE POLICY "Public select ministries" ON ministries FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select universities') THEN
    CREATE POLICY "Public select universities" ON universities FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select schools') THEN
    CREATE POLICY "Public select schools" ON schools FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select competitions') THEN
    CREATE POLICY "Public select competitions" ON competitions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select exams') THEN
    CREATE POLICY "Public select exams" ON exams FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select documents') THEN
    CREATE POLICY "Public select documents" ON documents FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select courses') THEN
    CREATE POLICY "Public select courses" ON courses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select notifications') THEN
    CREATE POLICY "Public select notifications" ON notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select app_users') THEN
    CREATE POLICY "Public select app_users" ON app_users FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select favorites') THEN
    CREATE POLICY "Public select favorites" ON favorites FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select follows') THEN
    CREATE POLICY "Public select follows" ON follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select user_progress') THEN
    CREATE POLICY "Public select user_progress" ON user_progress FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select reports') THEN
    CREATE POLICY "Public select reports" ON reports FOR SELECT USING (true);
  END IF;

  -- Politiques d'écriture permissives pour l'application
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write ministries') THEN
    CREATE POLICY "Public write ministries" ON ministries FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write universities') THEN
    CREATE POLICY "Public write universities" ON universities FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write schools') THEN
    CREATE POLICY "Public write schools" ON schools FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write competitions') THEN
    CREATE POLICY "Public write competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write exams') THEN
    CREATE POLICY "Public write exams" ON exams FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write documents') THEN
    CREATE POLICY "Public write documents" ON documents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write courses') THEN
    CREATE POLICY "Public write courses" ON courses FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write app_users') THEN
    CREATE POLICY "Public write app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write favorites') THEN
    CREATE POLICY "Public write favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write follows') THEN
    CREATE POLICY "Public write follows" ON follows FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write notifications') THEN
    CREATE POLICY "Public write notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write user_progress') THEN
    CREATE POLICY "Public write user_progress" ON user_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public write reports') THEN
    CREATE POLICY "Public write reports" ON reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
