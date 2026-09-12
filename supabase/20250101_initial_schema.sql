-- ============================================================
-- CONCOURS MAROC — Schéma Supabase initial
-- Compatible avec src/lib/types.ts + src/lib/supabase-db.ts (TABLE_MAP)
-- Ordre de création : parents avant enfants (FK)
-- Convention : snake_case côté SQL, camelCase côté app (converti)
-- ============================================================

-- 1. Profils (lié à auth.users). Pas de passwordHash ici (Supabase Auth).
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

-- 2. Ministères
CREATE TABLE IF NOT EXISTS ministries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  description TEXT DEFAULT '',
  website TEXT,
  source_url TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Universités
CREATE TABLE IF NOT EXISTS universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  name_ar TEXT,
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Écoles
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  university_id TEXT REFERENCES universities(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT DEFAULT '',
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
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Concours
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('MINISTERE', 'ECOLE', 'INSTITUTION')),
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  university_id TEXT REFERENCES universities(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  logo_url TEXT,
  official_logo TEXT,
  custom_logo TEXT,
  logo_color TEXT,
  category TEXT NOT NULL CHECK (category IN ('ECOLE', 'MINISTERE', 'UNIVERSITE', 'INSTITUTION', 'RECRUTEMENT', 'FORMATION', 'AUTRE')),
  year INTEGER NOT NULL,
  level TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  domaine TEXT,
  places INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
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
  published_at TIMESTAMPTZ,
  official_website TEXT,
  registration_url TEXT,
  source_url TEXT,
  source_organization TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'EXPIRED')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  publish_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (publish_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED')),
  manual_status TEXT CHECK (manual_status IN ('Ouvert', 'Bientot', 'Ferme', 'Suspendu', 'Archive')),
  views INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Examens
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL DEFAULT '',
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  organization_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  pages INTEGER,
  duration TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  has_correction BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  publish_status TEXT NOT NULL DEFAULT 'DRAFT',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  organization_name TEXT NOT NULL DEFAULT '',
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  description TEXT,
  file_url TEXT,
  file_size TEXT,
  source_url TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  publish_status TEXT NOT NULL DEFAULT 'DRAFT',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Cours (chapitres/leçons en JSONB, fidèle au type Course)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#0B63CE',
  duration TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'Intermédiaire',
  chapters JSONB NOT NULL DEFAULT '[]',
  publish_status TEXT NOT NULL DEFAULT 'DRAFT',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Favoris (user_id + target_type + target_id unique)
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('CONCOURS', 'EXAMEN', 'DOCUMENT', 'COURS', 'ECOLE')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

-- 10. Suivis (follows)
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, competition_id)
);

-- 11. Candidatures (applications)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_legacy_id TEXT,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Notifications
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

-- 13. Progression cours
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons TEXT[] DEFAULT '{}',
  percent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 14. Signalements (reports)
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

-- 15. Activité admin
CREATE TABLE IF NOT EXISTS admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index performance
CREATE INDEX IF NOT EXISTS idx_competitions_publish ON competitions(publish_status);
CREATE INDEX IF NOT EXISTS idx_competitions_deadline ON competitions(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_competitions_school ON competitions(school_id);
CREATE INDEX IF NOT EXISTS idx_competitions_ministry ON competitions(ministry_id);
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_univ ON schools(university_id);
CREATE INDEX IF NOT EXISTS idx_exams_publish ON exams(publish_status);
CREATE INDEX IF NOT EXISTS idx_documents_publish ON documents(publish_status);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
