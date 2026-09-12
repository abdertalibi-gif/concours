-- ============================================================
-- CONCOURS MAROC — Script d'insertion SQL IDEMPOTENT
-- Copie directe des données réelles du projet dans Supabase
-- Exécutable directement dans le SQL Editor de Supabase
-- ============================================================

-- 1. MINISTÈRES
INSERT INTO ministries (id, name, short_name, slug, aliases, logo_url, official_logo, logo_color, description, website, status, is_active, is_demo)
VALUES
('min-education', 'Ministère de l''Éducation Nationale, du Préscolaire et des Sports', 'MENPS', 'ministere-education-nationale', ARRAY['MEN', 'Éducation Nationale'], '/assets/logos/ministries/education.png', '/assets/logos/ministries/education.png', '#1B5E20', 'Ministère chargé de l''enseignement préscolaire, primaire, secondaire et des sports.', 'https://www.men.gov.ma', 'ACTIVE', true, false),
('min-sup', 'Ministère de l''Enseignement Supérieur, de la Recherche Scientifique et de l''Innovation', 'MESRSFC', 'ministere-enseignement-superieur', ARRAY['MESRSI', 'Enssup'], '/assets/logos/ministries/enssup.png', '/assets/logos/ministries/enssup.png', '#0B2A4A', 'Ministère de tutelle des universités publiques marocaines et grandes écoles.', 'https://www.enssup.gov.ma', 'ACTIVE', true, false),
('min-interieur', 'Ministère de l''Intérieur', 'MI', 'ministere-interieur', ARRAY['Intérieur'], '/assets/logos/ministries/interieur.svg', '/assets/logos/ministries/interieur.svg', '#B71C1C', 'Administration territoriale, sûreté nationale et concours territoriaux.', 'https://www.interieur.gov.ma', 'ACTIVE', true, false),
('min-sante', 'Ministère de la Santé et de la Protection Sociale', 'MSPS', 'ministere-sante', ARRAY['Santé'], '/assets/logos/ministries/sante.png', '/assets/logos/ministries/sante.png', '#0277BD', 'Santé publique, hôpitaux régionaux, CHU et concours ISPITS.', 'https://www.sante.gov.ma', 'ACTIVE', true, false),
('min-finances', 'Ministère de l''Économie et des Finances', 'MEF', 'ministere-economie-finances', ARRAY['Finances', 'Douanes'], '/assets/logos/ministries/finances.png', '/assets/logos/ministries/finances.png', '#0D47A1', 'Finances publiques, Direction Générale des Impôts et Douanes.', 'https://www.finances.gov.ma', 'ACTIVE', true, false),
('min-justice', 'Ministère de la Justice', 'MJ', 'ministere-justice', ARRAY['Justice'], '/assets/logos/ministries/justice.png', '/assets/logos/ministries/justice.png', '#2E7D32', 'Gestion judiciaire, tribunaux du Royaume et concours du greffe.', 'https://www.justice.gov.ma', 'ACTIVE', true, false),
('min-agri', 'Ministère de l''Agriculture, de la Pêche Maritime, du Développement Rural et des Eaux et Forêts', 'MAPMDREF', 'ministere-agriculture', ARRAY['Agriculture'], '/assets/logos/ministries/agriculture.svg', '/assets/logos/ministries/agriculture.svg', '#33691E', 'Développement agricole, agro-industrie et pêche maritime.', 'https://www.agriculture.gov.ma', 'ACTIVE', true, false),
('min-equipement', 'Ministère de l''Équipement et de l''Eau', 'MEW', 'ministere-equipement-eau', ARRAY['Équipement'], '/assets/logos/ministries/equipement.svg', '/assets/logos/ministries/equipement.svg', '#006064', 'Infrastructures autoroutières, barrages et ports.', 'https://www.equipement.gov.ma', 'ACTIVE', true, false),
('min-industrie', 'Ministère de l''Industrie et du Commerce', 'MICI', 'ministere-industrie-commerce', ARRAY['Industrie'], '/assets/logos/ministries/industrie.png', '/assets/logos/ministries/industrie.png', '#1A237E', 'Stratégie industrielle nationale et commerce.', 'https://www.mcinet.gov.ma', 'ACTIVE', true, false),
('min-energie', 'Ministère de la Transition Énergétique et du Développement Durable', 'MTEDD', 'ministere-transition-energetique', ARRAY['Énergie'], '/assets/logos/ministries/energie.png', '/assets/logos/ministries/energie.png', '#E65100', 'Énergies renouvelables et mines.', 'https://www.mtedd.gov.ma', 'ACTIVE', true, false),
('min-tourisme', 'Ministère du Tourisme, de l''Artisanat et de l''Économie Sociale et Solidaire', 'MTAESPS', 'ministere-tourisme-artisanat', ARRAY['Tourisme'], '/assets/logos/ministries/culture.png', '/assets/logos/ministries/culture.png', '#880E4F', 'Développement touristique et artisanat.', 'https://www.tourisme.gov.ma', 'ACTIVE', true, false),
('min-numerique', 'Ministère de la Transition Numérique et de la Réforme de l’Administration', 'MNTDRA', 'ministere-transition-numerique', ARRAY['Numérique'], '/assets/logos/ministries/numerique.svg', '/assets/logos/ministries/numerique.svg', '#00838F', 'Chantier Maroc Numérique et e-gouvernement.', 'https://www.mmsp.gov.ma', 'ACTIVE', true, false),
('min-jeunesse', 'Ministère de la Jeunesse, de la Culture et de la Communication', 'MJCC', 'ministere-jeunesse-culture', ARRAY['Culture'], '/assets/logos/ministries/culture.png', '/assets/logos/ministries/culture.png', '#4A148C', 'Patrimoine culturel marocain et maisons de jeunes.', 'https://www.mjcc.gov.ma', 'ACTIVE', true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  logo_url = EXCLUDED.logo_url,
  website = EXCLUDED.website;

-- 2. UNIVERSITÉS
INSERT INTO universities (id, name, short_name, name_ar, slug, aliases, logo_url, official_logo, ministry_id, city, region, website, is_active, is_demo)
VALUES
('univ-um5', 'Université Mohammed V de Rabat', 'UM5', 'جامعة محمد الخامس بالرباط', 'universite-mohammed-v-rabat', ARRAY['UM5R'], '/assets/logos/universities/um5.png', '/assets/logos/universities/um5.png', 'min-sup', 'Rabat', 'Rabat-Salé-Kénitra', 'http://www.um5.ac.ma', true, false),
('univ-uh2c', 'Université Hassan II de Casablanca', 'UH2C', 'جامعة الحسن الثاني بالدار البيضاء', 'universite-hassan-ii-casablanca', ARRAY['UH2'], '/assets/logos/universities/uh2c.png', '/assets/logos/universities/uh2c.png', 'min-sup', 'Casablanca', 'Casablanca-Settat', 'http://www.univh2c.ma', true, false),
('univ-uca', 'Université Cadi Ayyad de Marrakech', 'UCA', 'جامعة القاضي عياض بمراكش', 'universite-cadi-ayyad-marrakech', ARRAY['Université de Marrakech'], '/assets/logos/universities/uca.webp', '/assets/logos/universities/uca.webp', 'min-sup', 'Marrakech', 'Marrakech-Safi', 'http://www.uca.ma', true, false),
('univ-usmba', 'Université Sidi Mohamed Ben Abdellah de Fès', 'USMBA', 'جامعة سيدي محمد بن عبد الله بفاس', 'universite-sidi-mohamed-ben-abdellah-fes', ARRAY['Université de Fès'], '/assets/logos/universities/usmba.jpg', '/assets/logos/universities/usmba.jpg', 'min-sup', 'Fès', 'Fès-Meknès', 'http://www.usmba.ac.ma', true, false),
('univ-uae', 'Université Abdelmalek Essaâdi', 'UAE', 'جامعة عبد المالك السعدي', 'universite-abdelmalek-essaadi-tetouan-tanger', ARRAY['Université de Tétouan'], '/assets/logos/universities/uae.png', '/assets/logos/universities/uae.png', 'min-sup', 'Tétouan', 'Tanger-Tétouan-Al Hoceïma', 'http://www.uae.ma', true, false),
('univ-ump', 'Université Mohammed Premier d’Oujda', 'UMP', 'جامعة محمد الأول بوجدة', 'universite-mohammed-premier-oujda', ARRAY['Université d’Oujda'], '/assets/logos/universities/ump.svg', '/assets/logos/universities/ump.svg', 'min-sup', 'Oujda', 'Oriental', 'http://www.ump.ma', true, false),
('univ-uiz', 'Université Ibn Zohr d’Agadir', 'UIZ', 'جامعة ابن زهر بأكادير', 'universite-ibn-zohr-agadir', ARRAY['Université d’Agadir'], '/assets/logos/universities/uiz.jpg', '/assets/logos/universities/uiz.jpg', 'min-sup', 'Agadir', 'Souss-Massa', 'http://www.uiz.ac.ma', true, false),
('univ-uit', 'Université Ibn Tofail de Kénitra', 'UIT', 'جامعة ابن طفيل بالقنيطرة', 'universite-ibn-tofail-kenitra', ARRAY['Université de Kénitra'], '/assets/logos/universities/uit.svg', '/assets/logos/universities/uit.svg', 'min-sup', 'Kénitra', 'Rabat-Salé-Kénitra', 'http://www.uit.ac.ma', true, false),
('univ-umi', 'Université Moulay Ismaïl de Meknès', 'UMI', 'جامعة مولاي إسماعيل بمكناس', 'universite-moulay-ismail-meknes', ARRAY['Université de Meknès'], '/assets/logos/universities/umi.png', '/assets/logos/universities/umi.png', 'min-sup', 'Meknès', 'Fès-Meknès', 'http://www.umi.ac.ma', true, false),
('univ-ucd', 'Université Chouaïb Doukkali d’El Jadida', 'UCD', 'جامعة شعيب الدكالي بالجديدة', 'universite-chouaib-doukkali-el-jadida', ARRAY['Université d’El Jadida'], '/assets/logos/universities/ucd.jpg', '/assets/logos/universities/ucd.jpg', 'min-sup', 'El Jadida', 'Casablanca-Settat', 'http://www.ucd.ac.ma', true, false),
('univ-uh1', 'Université Hassan 1er de Settat', 'UH1', 'جامعة الحسن الأول بسطات', 'universite-hassan-1er-settat', ARRAY['Université de Settat'], '/assets/logos/universities/uh1.png', '/assets/logos/universities/uh1.png', 'min-sup', 'Settat', 'Casablanca-Settat', 'http://www.uh1.ac.ma', true, false),
('univ-usms', 'Université Sultan Moulay Slimane', 'USMS', 'جامعة السلطان مولاي سليمان ببني ملال', 'universite-sultan-moulay-slimane-beni-mellal', ARRAY['Université de Béni Mellal'], '/assets/logos/universities/usms.png', '/assets/logos/universities/usms.png', 'min-sup', 'Béni Mellal', 'Béni Mellal-Khénifra', 'http://www.usms.ac.ma', true, false),
('univ-aui', 'Université Al Akhawayn d’Ifrane', 'AUI', 'جامعة الأخوين بإفران', 'universite-al-akhawayn-ifrane', ARRAY['Al Akhawayn'], '/assets/logos/universities/aui.jpg', '/assets/logos/universities/aui.jpg', NULL, 'Ifrane', 'Fès-Meknès', 'http://www.aui.ma', true, false),
('univ-um6p', 'Université Mohammed VI Polytechnique', 'UM6P', 'جامعة محمد السادس متعددة التخصصات التقنية', 'universite-mohammed-vi-polytechnique-benguerir', ARRAY['UM6P'], '/assets/logos/universities/um6p.png', '/assets/logos/universities/um6p.png', NULL, 'Benguerir', 'Marrakech-Safi', 'http://www.um6p.ma', true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  logo_url = EXCLUDED.logo_url;

-- 3. ÉCOLES ET INSTITUTS (EXTRAIT CLÉ)
INSERT INTO schools (id, name, short_name, slug, university_id, city, region, type, domains, levels, logo_url, website, is_active, is_demo)
VALUES
('ec-emi', 'École Mohammadia d’Ingénieurs', 'EMI', 'ecole-mohammadia-ingenieurs-rabat', 'univ-um5', 'Rabat', 'Rabat-Salé-Kénitra', 'Grande École d''Ingénieurs', ARRAY['Génie Civil', 'Génie Informatique', 'Génie Électrique'], ARRAY['Bac+2 (CNC)'], '/assets/logos/schools/emi-rabat.png', 'http://www.emi.ac.ma', true, false),
('ec-ensias', 'École Nationale Supérieure d’Informatique et d’Analyse des Systèmes', 'ENSIAS', 'ensias-rabat', 'univ-um5', 'Rabat', 'Rabat-Salé-Kénitra', 'Grande École d''Ingénieurs', ARRAY['Informatique', 'Intelligence Artificielle'], ARRAY['Bac+2 (CNC)'], '/assets/logos/schools/ensias-rabat.png', 'http://ensias.um5.ac.ma', true, false),
('ec-inpt', 'Institut National des Postes et Télécommunications', 'INPT', 'inpt-rabat', NULL, 'Rabat', 'Rabat-Salé-Kénitra', 'Grande École d''Ingénieurs', ARRAY['Télécoms', 'Informatique'], ARRAY['Bac+2 (CNC)'], '/assets/logos/schools/inpt-rabat.jpg', 'http://www.inpt.ac.ma', true, false),
('ec-ehtp', 'École Hassania des Travaux Publics', 'EHTP', 'ehtp-casablanca', NULL, 'Casablanca', 'Casablanca-Settat', 'Grande École d''Ingénieurs', ARRAY['Génie Civil', 'Météorologie'], ARRAY['Bac+2 (CNC)'], '/assets/logos/schools/ehtp-casablanca.png', 'http://www.ehtp.ac.ma', true, false),
('ec-iscae', 'Institut Supérieur de Commerce et d’Administration des Entreprises', 'ISCAE', 'iscae-casablanca', NULL, 'Casablanca', 'Casablanca-Settat', 'Grande École de Commerce', ARRAY['Finance', 'Management'], ARRAY['Bac+2', 'Licence'], '/assets/logos/schools/iscae.jpg', 'http://www.groupeiscae.ma', true, false),
('ec-ensa-marrakech', 'École Nationale des Sciences Appliquées de Marrakech', 'ENSA Marrakech', 'ensa-marrakech', 'univ-uca', 'Marrakech', 'Marrakech-Safi', 'École d''Ingénieurs', ARRAY['Ingénierie', 'Informatique'], ARRAY['Bac+0', 'Bac+2'], '/assets/logos/schools/ensa-marrakech.png', 'http://www.ensa.uca.ma', true, false),
('ec-encg-settat', 'École Nationale de Commerce et de Gestion de Settat', 'ENCG Settat', 'encg-settat', 'univ-uh1', 'Settat', 'Casablanca-Settat', 'École de Commerce', ARRAY['Commerce', 'Gestion'], ARRAY['Bac+0 (TAFEM)'], '/assets/logos/schools/encg-settat.png', 'http://www.encg-settat.ac.ma', true, false),
('ec-ofppt', 'Office de la Formation Professionnelle et de la Promotion du Travail', 'OFPPT', 'ofppt-maroc', NULL, 'Casablanca', 'Toutes les régions', 'Formation Professionnelle', ARRAY['Technicien Spécialisé', 'Digital'], ARRAY['Niveau Bac', 'Bacheliers'], '/assets/logos/institutes/ofppt.png', 'https://www.ofppt.ma', true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  logo_url = EXCLUDED.logo_url;

-- 4. CONCOURS
INSERT INTO competitions (id, slug, title, organization_name, organization_type, ministry_id, school_id, category, year, level, city, region, places, registration_deadline, published_at, verification_status, publish_status, logo_url, views, description)
VALUES
('c1', 'concours-recrutement-enseignants-2026', 'Concours de recrutement des cadres enseignants (AREF)', 'Ministère de l''Éducation Nationale, du Préscolaire et des Sports', 'MINISTERE', 'min-education', NULL, 'MINISTERE', 2026, 'Bac+3 (Licence)', 'Rabat', 'Toutes les régions', 20000, NOW() + INTERVAL '22 days', NOW() - INTERVAL '8 days', 'VERIFIED', 'PUBLISHED', '/assets/logos/ministries/education.png', 12450, 'Recrutement des cadres enseignants du cycle primaire et secondaire au titre de l''année 2026.'),
('c13', 'concours-ensa-maroc-1ere-annee-2026', 'Concours commun des 12 ENSA du Maroc — 1ère année', 'Réseau des ENSA du Maroc', 'ECOLE', NULL, 'ec-ensa-marrakech', 'ECOLE', 2026, 'Bacheliers scientifiques', 'Marrakech', 'Toutes les régions (12 campus)', 3800, NOW() + INTERVAL '25 days', NOW() - INTERVAL '5 days', 'VERIFIED', 'PUBLISHED', '/assets/logos/schools/ensa-marrakech.png', 28940, 'Concours commun d''accès en première année des 12 Écoles Nationales des Sciences Appliquées du Maroc.'),
('c17', 'concours-tafem-encg-maroc-2026', 'Concours TAFEM — Accès aux 12 ENCG du Maroc', 'Réseau des ENCG du Maroc', 'ECOLE', NULL, 'ec-encg-settat', 'ECOLE', 2026, 'Bacheliers (Économie & Sciences)', 'Settat', 'Toutes les régions (12 campus)', 4200, NOW() + INTERVAL '32 days', NOW() - INTERVAL '3 days', 'VERIFIED', 'PUBLISHED', '/assets/logos/schools/encg-settat.png', 21300, 'Test d''Admissibilité à la Formation En Management (TAFEM) commun aux 12 campus ENCG.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  views = EXCLUDED.views,
  registration_deadline = EXCLUDED.registration_deadline;
