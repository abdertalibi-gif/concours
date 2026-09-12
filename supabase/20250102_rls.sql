-- ============================================================
-- CONCOURS MAROC — RLS (Row Level Security)
-- PUBLIC : lecture des contenus PUBLISHED / actifs
-- USER : ses favoris, candidatures, notifications, follows, progress
-- ADMIN/SUPER_ADMIN : écriture via rôle dans profiles.role
-- Jamais de USING(true) sur les écritures sensibles.
-- ============================================================

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;

-- Helper : est-ce un admin ? (évite la récursion via security definer)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- ---------- LECTURE PUBLIQUE ----------
DROP POLICY IF EXISTS "public read ministries" ON ministries;
CREATE POLICY "public read ministries" ON ministries FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "public read universities" ON universities;
CREATE POLICY "public read universities" ON universities FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "public read schools" ON schools;
CREATE POLICY "public read schools" ON schools FOR SELECT USING (is_active IS DISTINCT FROM FALSE);

DROP POLICY IF EXISTS "public read competitions" ON competitions;
CREATE POLICY "public read competitions" ON competitions FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "public read exams" ON exams;
CREATE POLICY "public read exams" ON exams FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "public read documents" ON documents;
CREATE POLICY "public read documents" ON documents FOR SELECT USING (publish_status = 'PUBLISHED');

DROP POLICY IF EXISTS "public read courses" ON courses;
CREATE POLICY "public read courses" ON courses FOR SELECT USING (publish_status = 'PUBLISHED');

-- ---------- ÉCRITURE ADMIN ----------
DROP POLICY IF EXISTS "admin write ministries" ON ministries;
CREATE POLICY "admin write ministries" ON ministries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write universities" ON universities;
CREATE POLICY "admin write universities" ON universities FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write schools" ON schools;
CREATE POLICY "admin write schools" ON schools FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write competitions" ON competitions;
CREATE POLICY "admin write competitions" ON competitions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write exams" ON exams;
CREATE POLICY "admin write exams" ON exams FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write documents" ON documents;
CREATE POLICY "admin write documents" ON documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin write courses" ON courses;
CREATE POLICY "admin write courses" ON courses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- PROFILS ----------
DROP POLICY IF EXISTS "user read own profile" ON profiles;
CREATE POLICY "user read own profile" ON profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user update own profile" ON profiles;
CREATE POLICY "user update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin read profiles" ON profiles;
CREATE POLICY "admin read profiles" ON profiles FOR SELECT USING (public.is_admin());

-- ---------- DONNÉES UTILISATEUR (isolées par user_id) ----------
DROP POLICY IF EXISTS "user own favorites" ON favorites;
CREATE POLICY "user own favorites" ON favorites FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "user own follows" ON follows;
CREATE POLICY "user own follows" ON follows FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "user own applications" ON applications;
CREATE POLICY "user own applications" ON applications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user own notifications" ON notifications;
CREATE POLICY "user own notifications" ON notifications FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'all');

DROP POLICY IF EXISTS "user own progress" ON user_progress;
CREATE POLICY "user own progress" ON user_progress FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- Notifications globales lisibles, écriture admin uniquement
DROP POLICY IF EXISTS "admin write notifications" ON notifications;
CREATE POLICY "admin write notifications" ON notifications FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin update notifications" ON notifications;
CREATE POLICY "admin update notifications" ON notifications FOR UPDATE USING (public.is_admin());

-- ---------- REPORTS ----------
DROP POLICY IF EXISTS "user insert reports" ON reports;
CREATE POLICY "user insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin manage reports" ON reports;
CREATE POLICY "admin manage reports" ON reports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- ADMIN ACTIVITY ----------
DROP POLICY IF EXISTS "admin read activity" ON admin_activity;
CREATE POLICY "admin read activity" ON admin_activity FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin insert activity" ON admin_activity;
CREATE POLICY "admin insert activity" ON admin_activity FOR INSERT WITH CHECK (public.is_admin());
