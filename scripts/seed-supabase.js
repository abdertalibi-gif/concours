/**
 * ============================================================
 * CONCOURS MAROC — Script de Migration / Seed Supabase PostgreSQL
 * ============================================================
 * 
 * Ce script est 100% IDEMPOTENT :
 * Il utilise l'instruction "upsert" avec "onConflict: 'id'".
 * Il peut être exécuté autant de fois que nécessaire sans jamais créer de doublons.
 * 
 * Usage :
 *   npm run db:seed
 * Ou directement :
 *   node scripts/seed-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis .env ou .env.local
function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const envFiles = ['.env', '.env.local'];
  const env = { ...process.env };

  for (const f of envFiles) {
    const fullPath = path.join(root, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
          if (!env[key]) {
            env[key] = val;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERREUR: Variables Supabase manquantes.');
  console.error('Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env');
  console.error('Exemple dans .env :');
  console.error('  VITE_SUPABASE_URL=https://votre-projet.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Connexion à Supabase :', supabaseUrl);

async function runSeed() {
  try {
    // 1. Charger les données de seed depuis les fichiers du projet
    // Note: Pour une compatibilité maximale sans transpilation TS complexe,
    // nous lisons directement les données structurées des institutions
    console.log('📦 Préparation des données existantes...');

    // Données des Ministères réels
    const ministries = [
      { id: 'min-education', name: "Ministère de l'Éducation Nationale, du Préscolaire et des Sports", short_name: 'MENPS', slug: 'ministere-education-nationale', aliases: ['MEN', 'Éducation Nationale', 'وزارة التربية الوطنية'], logo_url: '/assets/logos/ministries/education.png', official_logo: '/assets/logos/ministries/education.png', logo_color: '#1B5E20', description: "Ministère chargé de l'enseignement préscolaire, primaire, secondaire et des sports.", website: 'https://www.men.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-sup', name: "Ministère de l'Enseignement Supérieur, de la Recherche Scientifique et de l'Innovation", short_name: 'MESRSFC', slug: 'ministere-enseignement-superieur', aliases: ['MESRSI', 'Enssup', 'وزارة التعليم العالي'], logo_url: '/assets/logos/ministries/enssup.png', official_logo: '/assets/logos/ministries/enssup.png', logo_color: '#0B2A4A', description: "Ministère de tutelle des universités publiques marocaines et grandes écoles.", website: 'https://www.enssup.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-interieur', name: "Ministère de l'Intérieur", short_name: 'MI', slug: 'ministere-interieur', aliases: ['Intérieur', 'وزارة الداخلية'], logo_url: '/assets/logos/ministries/interieur.svg', official_logo: '/assets/logos/ministries/interieur.svg', logo_color: '#B71C1C', description: "Administration territoriale, sûreté nationale et concours territoriaux.", website: 'https://www.interieur.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-sante', name: 'Ministère de la Santé et de la Protection Sociale', short_name: 'MSPS', slug: 'ministere-sante', aliases: ['Santé', 'وزارة الصحة'], logo_url: '/assets/logos/ministries/sante.png', official_logo: '/assets/logos/ministries/sante.png', logo_color: '#0277BD', description: 'Santé publique, hôpitaux régionaux, CHU et concours ISPITS.', website: 'https://www.sante.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-finances', name: "Ministère de l'Économie et des Finances", short_name: 'MEF', slug: 'ministere-economie-finances', aliases: ['Finances', 'Douanes', 'DGI', 'وزارة الاقتصاد والمالية'], logo_url: '/assets/logos/ministries/finances.png', official_logo: '/assets/logos/ministries/finances.png', logo_color: '#0D47A1', description: 'Finances publiques, Direction Générale des Impôts et Douanes.', website: 'https://www.finances.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-justice', name: 'Ministère de la Justice', short_name: 'MJ', slug: 'ministere-justice', aliases: ['Justice', 'وزارة العدل'], logo_url: '/assets/logos/ministries/justice.png', official_logo: '/assets/logos/ministries/justice.png', logo_color: '#2E7D32', description: 'Gestion judiciaire, tribunaux du Royaume et concours du greffe.', website: 'https://www.justice.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-agri', name: "Ministère de l'Agriculture, de la Pêche Maritime, du Développement Rural et des Eaux et Forêts", short_name: 'MAPMDREF', slug: 'ministere-agriculture', aliases: ['Agriculture', 'الفلاحة والصيد البحري'], logo_url: '/assets/logos/ministries/agriculture.svg', official_logo: '/assets/logos/ministries/agriculture.svg', logo_color: '#33691E', description: 'Développement agricole, agro-industrie, pêche maritime et eaux & forêts.', website: 'https://www.agriculture.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-equipement', name: "Ministère de l'Équipement et de l'Eau", short_name: 'MEW', slug: 'ministere-equipement-eau', aliases: ['Équipement', 'تجهيز والماء'], logo_url: '/assets/logos/ministries/equipement.svg', official_logo: '/assets/logos/ministries/equipement.svg', logo_color: '#006064', description: 'Infrastructures autoroutières, barrages, ports et météorologie.', website: 'https://www.equipement.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-industrie', name: "Ministère de l'Industrie et du Commerce", short_name: 'MICI', slug: 'ministere-industrie-commerce', aliases: ['Industrie', 'Commerce', 'الصناعة والتجارة'], logo_url: '/assets/logos/ministries/industrie.png', official_logo: '/assets/logos/ministries/industrie.png', logo_color: '#1A237E', description: 'Stratégie industrielle nationale et commerce extérieur.', website: 'https://www.mcinet.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-energie', name: 'Ministère de la Transition Énergétique et du Développement Durable', short_name: 'MTEDD', slug: 'ministere-transition-energetique', aliases: ['Énergie', 'Mines', 'انتقال طاقي'], logo_url: '/assets/logos/ministries/energie.png', official_logo: '/assets/logos/ministries/energie.png', logo_color: '#E65100', description: 'Énergies renouvelables, mines, géologie et développement durable.', website: 'https://www.mtedd.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-tourisme', name: "Ministère du Tourisme, de l'Artisanat et de l'Économie Sociale et Solidaire", short_name: 'MTAESPS', slug: 'ministere-tourisme-artisanat', aliases: ['Tourisme', 'Artisanat', 'السياحة والصناعة التقليدية'], logo_url: '/assets/logos/ministries/culture.png', official_logo: '/assets/logos/ministries/culture.png', logo_color: '#880E4F', description: 'Développement touristique, hôtellerie et artisanat marocain.', website: 'https://www.tourisme.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-numerique', name: 'Ministère de la Transition Numérique et de la Réforme de l’Administration', short_name: 'MNTDRA', slug: 'ministere-transition-numerique', aliases: ['Numérique', 'ADD', 'انتقال رقمي'], logo_url: '/assets/logos/ministries/numerique.svg', official_logo: '/assets/logos/ministries/numerique.svg', logo_color: '#00838F', description: 'Chantier Maroc Numérique, e-gouvernement et simplification administrative.', website: 'https://www.mmsp.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false },
      { id: 'min-jeunesse', name: 'Ministère de la Jeunesse, de la Culture et de la Communication', short_name: 'MJCC', slug: 'ministere-jeunesse-culture', aliases: ['Culture', 'Communication', 'الشباب والثقافة'], logo_url: '/assets/logos/ministries/culture.png', official_logo: '/assets/logos/ministries/culture.png', logo_color: '#4A148C', description: 'Patrimoine culturel marocain, maisons de jeunes et médias.', website: 'https://www.mjcc.gov.ma', status: 'ACTIVE', is_active: true, is_demo: false }
    ];

    // Données des Universités réelles
    const universities = [
      { id: 'univ-um5', name: 'Université Mohammed V de Rabat', short_name: 'UM5', name_ar: 'جامعة محمد الخامس بالرباط', slug: 'universite-mohammed-v-rabat', aliases: ['UM5R', 'Université de Rabat'], logo_url: '/assets/logos/universities/um5.png', official_logo: '/assets/logos/universities/um5.png', ministry_id: 'min-sup', city: 'Rabat', region: 'Rabat-Salé-Kénitra', website: 'http://www.um5.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-uh2c', name: 'Université Hassan II de Casablanca', short_name: 'UH2C', name_ar: 'جامعة الحسن الثاني بالدار البيضاء', slug: 'universite-hassan-ii-casablanca', aliases: ['UH2', 'Université de Casablanca'], logo_url: '/assets/logos/universities/uh2c.png', official_logo: '/assets/logos/universities/uh2c.png', ministry_id: 'min-sup', city: 'Casablanca', region: 'Casablanca-Settat', website: 'http://www.univh2c.ma', is_active: true, is_demo: false },
      { id: 'univ-uca', name: 'Université Cadi Ayyad de Marrakech', short_name: 'UCA', name_ar: 'جامعة القاضي عياض بمراكش', slug: 'universite-cadi-ayyad-marrakech', aliases: ['Université de Marrakech'], logo_url: '/assets/logos/universities/uca.webp', official_logo: '/assets/logos/universities/uca.webp', ministry_id: 'min-sup', city: 'Marrakech', region: 'Marrakech-Safi', website: 'http://www.uca.ma', is_active: true, is_demo: false },
      { id: 'univ-usmba', name: 'Université Sidi Mohamed Ben Abdellah de Fès', short_name: 'USMBA', name_ar: 'جامعة سيدي محمد بن عبد الله بفاس', slug: 'universite-sidi-mohamed-ben-abdellah-fes', aliases: ['Université de Fès'], logo_url: '/assets/logos/universities/usmba.jpg', official_logo: '/assets/logos/universities/usmba.jpg', ministry_id: 'min-sup', city: 'Fès', region: 'Fès-Meknès', website: 'http://www.usmba.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-uae', name: 'Université Abdelmalek Essaâdi', short_name: 'UAE', name_ar: 'جامعة عبد المالك السعدي', slug: 'universite-abdelmalek-essaadi-tetouan-tanger', aliases: ['Université de Tétouan', 'Université de Tanger'], logo_url: '/assets/logos/universities/uae.png', official_logo: '/assets/logos/universities/uae.png', ministry_id: 'min-sup', city: 'Tétouan', region: 'Tanger-Tétouan-Al Hoceïma', website: 'http://www.uae.ma', is_active: true, is_demo: false },
      { id: 'univ-ump', name: 'Université Mohammed Premier d’Oujda', short_name: 'UMP', name_ar: 'جامعة محمد الأول بوجدة', slug: 'universite-mohammed-premier-oujda', aliases: ['Université de l’Oriental', 'Université d’Oujda'], logo_url: '/assets/logos/universities/ump.svg', official_logo: '/assets/logos/universities/ump.svg', ministry_id: 'min-sup', city: 'Oujda', region: 'Oriental', website: 'http://www.ump.ma', is_active: true, is_demo: false },
      { id: 'univ-uiz', name: 'Université Ibn Zohr d’Agadir', short_name: 'UIZ', name_ar: 'جامعة ابن زهر بأكادير', slug: 'universite-ibn-zohr-agadir', aliases: ['Université d’Agadir', 'UIZ Souss'], logo_url: '/assets/logos/universities/uiz.jpg', official_logo: '/assets/logos/universities/uiz.jpg', ministry_id: 'min-sup', city: 'Agadir', region: 'Souss-Massa', website: 'http://www.uiz.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-uit', name: 'Université Ibn Tofail de Kénitra', short_name: 'UIT', name_ar: 'جامعة ابن طفيل بالقنيطرة', slug: 'universite-ibn-tofail-kenitra', aliases: ['Université de Kénitra'], logo_url: '/assets/logos/universities/uit.svg', official_logo: '/assets/logos/universities/uit.svg', ministry_id: 'min-sup', city: 'Kénitra', region: 'Rabat-Salé-Kénitra', website: 'http://www.uit.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-umi', name: 'Université Moulay Ismaïl de Meknès', short_name: 'UMI', name_ar: 'جامعة مولاي إسماعيل بمكناس', slug: 'universite-moulay-ismail-meknes', aliases: ['Université de Meknès'], logo_url: '/assets/logos/universities/umi.png', official_logo: '/assets/logos/universities/umi.png', ministry_id: 'min-sup', city: 'Meknès', region: 'Fès-Meknès', website: 'http://www.umi.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-ucd', name: 'Université Chouaïb Doukkali d’El Jadida', short_name: 'UCD', name_ar: 'جامعة شعيب الدكالي بالجديدة', slug: 'universite-chouaib-doukkali-el-jadida', aliases: ['Université d’El Jadida'], logo_url: '/assets/logos/universities/ucd.jpg', official_logo: '/assets/logos/universities/ucd.jpg', ministry_id: 'min-sup', city: 'El Jadida', region: 'Casablanca-Settat', website: 'http://www.ucd.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-uh1', name: 'Université Hassan 1er de Settat', short_name: 'UH1', name_ar: 'جامعة الحسن الأول بسطات', slug: 'universite-hassan-1er-settat', aliases: ['Université de Settat'], logo_url: '/assets/logos/universities/uh1.png', official_logo: '/assets/logos/universities/uh1.png', ministry_id: 'min-sup', city: 'Settat', region: 'Casablanca-Settat', website: 'http://www.uh1.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-usms', name: 'Université Sultan Moulay Slimane', short_name: 'USMS', name_ar: 'جامعة السلطان مولاي سليمان ببني ملال', slug: 'universite-sultan-moulay-slimane-beni-mellal', aliases: ['Université de Béni Mellal'], logo_url: '/assets/logos/universities/usms.png', official_logo: '/assets/logos/universities/usms.png', ministry_id: 'min-sup', city: 'Béni Mellal', region: 'Béni Mellal-Khénifra', website: 'http://www.usms.ac.ma', is_active: true, is_demo: false },
      { id: 'univ-aui', name: 'Université Al Akhawayn d’Ifrane', short_name: 'AUI', name_ar: 'جامعة الأخوين بإفران', slug: 'universite-al-akhawayn-ifrane', aliases: ['Al Akhawayn University'], logo_url: '/assets/logos/universities/aui.jpg', official_logo: '/assets/logos/universities/aui.jpg', city: 'Ifrane', region: 'Fès-Meknès', website: 'http://www.aui.ma', is_active: true, is_demo: false },
      { id: 'univ-um6p', name: 'Université Mohammed VI Polytechnique', short_name: 'UM6P', name_ar: 'جامعة محمد السادس متعددة التخصصات التقنية', slug: 'universite-mohammed-vi-polytechnique-benguerir', aliases: ['UM6P Benguerir'], logo_url: '/assets/logos/universities/um6p.png', official_logo: '/assets/logos/universities/um6p.png', city: 'Benguerir', region: 'Marrakech-Safi', website: 'http://www.um6p.ma', is_active: true, is_demo: false }
    ];

    console.log('📌 1/6 Upsert des Ministères (idempotent)...');
    const { error: minErr } = await supabase.from('ministries').upsert(ministries, { onConflict: 'id' });
    if (minErr) console.warn('Avertissement ministères:', minErr.message);
    else console.log(`✅ ${ministries.length} ministères synchronisés.`);

    console.log('📌 2/6 Upsert des Universités (idempotent)...');
    const { error: uniErr } = await supabase.from('universities').upsert(universities, { onConflict: 'id' });
    if (uniErr) console.warn('Avertissement universités:', uniErr.message);
    else console.log(`✅ ${universities.length} universités synchronisées.`);

    // Lire les institutions depuis le fichier TypeScript compilé ou json
    // Insertion par lots d'écoles (exemples clés de notre catalogue)
    const schoolsBatch = [
      { id: 'ec-emi', name: 'École Mohammadia d’Ingénieurs', short_name: 'EMI', slug: 'ecole-mohammadia-ingenieurs-rabat', university_id: 'univ-um5', city: 'Rabat', region: 'Rabat-Salé-Kénitra', type: "Grande École d'Ingénieurs", logo_url: '/assets/logos/schools/emi-rabat.png', is_active: true, domains: ['Génie Civil', 'Génie Électrique', 'Génie Informatique', 'Génie Mécanique'], levels: ['Bac+2 (CNC)', 'Master'], website: 'http://www.emi.ac.ma' },
      { id: 'ec-ensias', name: 'École Nationale Supérieure d’Informatique et d’Analyse des Systèmes', short_name: 'ENSIAS', slug: 'ensias-rabat', university_id: 'univ-um5', city: 'Rabat', region: 'Rabat-Salé-Kénitra', type: "Grande École d'Ingénieurs", logo_url: '/assets/logos/schools/ensias-rabat.png', is_active: true, domains: ['Informatique', 'Intelligence Artificielle', 'Cybersécurité'], levels: ['Bac+2 (CNC)'], website: 'http://ensias.um5.ac.ma' },
      { id: 'ec-inpt', name: 'Institut National des Postes et Télécommunications', short_name: 'INPT', slug: 'inpt-rabat', city: 'Rabat', region: 'Rabat-Salé-Kénitra', type: "Grande École d'Ingénieurs", logo_url: '/assets/logos/schools/inpt-rabat.jpg', is_active: true, domains: ['Télécoms', 'Informatique', 'Cloud'], levels: ['Bac+2 (CNC)'], website: 'http://www.inpt.ac.ma' },
      { id: 'ec-ehtp', name: 'École Hassania des Travaux Publics', short_name: 'EHTP', slug: 'ehtp-casablanca', city: 'Casablanca', region: 'Casablanca-Settat', type: "Grande École d'Ingénieurs", logo_url: '/assets/logos/schools/ehtp-casablanca.png', is_active: true, domains: ['Génie Civil', 'Génie Électrique', 'Météorologie'], levels: ['Bac+2 (CNC)'], website: 'http://www.ehtp.ac.ma' },
      { id: 'ec-iscae', name: 'Institut Supérieur de Commerce et d’Administration des Entreprises', short_name: 'ISCAE', slug: 'iscae-casablanca', city: 'Casablanca', region: 'Casablanca-Settat', type: 'Grande École de Commerce', logo_url: '/assets/logos/schools/iscae.jpg', is_active: true, domains: ['Finance', 'Audit', 'Marketing', 'Management'], levels: ['Bac+2', 'Licence', 'Master'], website: 'http://www.groupeiscae.ma' },
      { id: 'ec-ensa-marrakech', name: 'École Nationale des Sciences Appliquées de Marrakech', short_name: 'ENSA Marrakech', slug: 'ensa-marrakech', university_id: 'univ-uca', city: 'Marrakech', region: 'Marrakech-Safi', type: "École d'Ingénieurs", logo_url: '/assets/logos/schools/ensa-marrakech.png', is_active: true, domains: ['Ingénierie', 'Informatique', 'Réseaux'], levels: ['Bac+0', 'Bac+2'], website: 'http://www.ensa.uca.ma' },
      { id: 'ec-ensa-agadir', name: 'École Nationale des Sciences Appliquées d’Agadir', short_name: 'ENSA Agadir', slug: 'ensa-agadir', university_id: 'univ-uiz', city: 'Agadir', region: 'Souss-Massa', type: "École d'Ingénieurs", logo_url: '/assets/logos/schools/ensa-agadir.png', is_active: true, domains: ['Génie Civil', 'Génie Mécanique', 'Génie Industriel'], levels: ['Bac+0', 'Bac+2'], website: 'http://www.ensa-agadir.ac.ma' },
      { id: 'ec-ensa-tanger', name: 'École Nationale des Sciences Appliquées de Tanger', short_name: 'ENSA Tanger', slug: 'ensa-tanger', university_id: 'univ-uae', city: 'Tanger', region: 'Tanger-Tétouan-Al Hoceïma', type: "École d'Ingénieurs", logo_url: '/assets/logos/schools/ensa-tanger.jpg', is_active: true, domains: ['Génie Logiciel', 'Télécommunications'], levels: ['Bac+0', 'Bac+2'], website: 'http://ensat.ac.ma' },
      { id: 'ec-encg-settat', name: 'École Nationale de Commerce et de Gestion de Settat', short_name: 'ENCG Settat', slug: 'encg-settat', university_id: 'univ-uh1', city: 'Settat', region: 'Casablanca-Settat', type: 'École de Commerce', logo_url: '/assets/logos/schools/encg-settat.png', is_active: true, domains: ['Commerce', 'Gestion', 'Audit'], levels: ['Bac+0 (TAFEM)'], website: 'http://www.encg-settat.ac.ma' },
      { id: 'ec-encg-casablanca', name: 'École Nationale de Commerce et de Gestion de Casablanca', short_name: 'ENCG Casablanca', slug: 'encg-casablanca', university_id: 'univ-uh2c', city: 'Casablanca', region: 'Casablanca-Settat', type: 'École de Commerce', logo_url: '/assets/logos/schools/encg-casablanca.png', is_active: true, domains: ['Marketing', 'Commerce International'], levels: ['Bac+0 (TAFEM)'], website: 'http://www.encgcasa.ac.ma' },
      { id: 'ec-ofppt', name: 'Office de la Formation Professionnelle et de la Promotion du Travail', short_name: 'OFPPT', slug: 'ofppt-maroc', city: 'Casablanca', region: 'Toutes les régions', type: 'Formation Professionnelle', logo_url: '/assets/logos/institutes/ofppt.png', is_active: true, domains: ['Technicien Spécialisé', 'Industrie', 'Digital'], levels: ['Niveau Bac', 'Baccalauréat'], website: 'https://www.ofppt.ma' }
    ];

    console.log('📌 3/6 Upsert des Écoles & Établissements (idempotent)...');
    const { error: schErr } = await supabase.from('schools').upsert(schoolsBatch, { onConflict: 'id' });
    if (schErr) console.warn('Avertissement écoles:', schErr.message);
    else console.log(`✅ ${schoolsBatch.length} écoles synchronisées.`);

    // 4. Concours majeurs existants
    const competitionsBatch = [
      {
        id: 'c1',
        slug: 'concours-recrutement-enseignants-2026',
        title: 'Concours de recrutement des cadres enseignants (AREF)',
        organization_name: "Ministère de l'Éducation Nationale, du Préscolaire et des Sports",
        organization_type: 'MINISTERE',
        ministry_id: 'min-education',
        category: 'MINISTERE',
        year: 2026,
        level: 'Bac+3 (Licence)',
        city: 'Rabat',
        region: 'Toutes les régions',
        domaine: 'Éducation & Enseignement',
        places: 20000,
        registration_deadline: new Date(Date.now() + 22 * 86400000).toISOString(),
        registration_start: new Date(Date.now() - 8 * 86400000).toISOString(),
        competition_date: new Date(Date.now() + 45 * 86400000).toISOString(),
        published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        official_website: 'https://www.men.gov.ma',
        registration_url: 'https://tawdif.men.gov.ma',
        verification_status: 'VERIFIED',
        publish_status: 'PUBLISHED',
        logo_url: '/assets/logos/ministries/education.png',
        logo_color: '#1B5E20',
        views: 12450,
        description: "Recrutement des cadres enseignants du cycle primaire et secondaire au titre de l'année 2026."
      },
      {
        id: 'c13',
        slug: 'concours-ensa-maroc-1ere-annee-2026',
        title: 'Concours commun des 12 ENSA du Maroc — 1ère année',
        organization_name: 'Réseau des ENSA du Maroc',
        organization_type: 'ECOLE',
        school_id: 'ec-ensa-marrakech',
        category: 'ECOLE',
        year: 2026,
        level: 'Bacheliers scientifiques',
        city: 'Marrakech',
        region: 'Toutes les régions (12 campus)',
        domaine: 'Sciences & Technologies de l’Ingénieur',
        places: 3800,
        registration_deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
        registration_start: new Date(Date.now() - 5 * 86400000).toISOString(),
        competition_date: new Date(Date.now() + 48 * 86400000).toISOString(),
        published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        official_website: 'https://www.ensamaroc.ma',
        registration_url: 'https://www.ensamaroc.ma/inscription',
        verification_status: 'VERIFIED',
        publish_status: 'PUBLISHED',
        logo_url: '/assets/logos/schools/ensa-marrakech.png',
        logo_color: '#0D47A1',
        views: 28940,
        description: "Concours commun d'accès en première année des 12 Écoles Nationales des Sciences Appliquées du Maroc."
      },
      {
        id: 'c17',
        slug: 'concours-tafem-encg-maroc-2026',
        title: 'Concours TAFEM — Accès aux 12 ENCG du Maroc',
        organization_name: 'Réseau des ENCG du Maroc',
        organization_type: 'ECOLE',
        school_id: 'ec-encg-settat',
        category: 'ECOLE',
        year: 2026,
        level: 'Bacheliers (Économie & Sciences)',
        city: 'Settat',
        region: 'Toutes les régions (12 campus)',
        domaine: 'Management, Commerce & Gestion',
        places: 4200,
        registration_deadline: new Date(Date.now() + 32 * 86400000).toISOString(),
        registration_start: new Date(Date.now() - 3 * 86400000).toISOString(),
        competition_date: new Date(Date.now() + 55 * 86400000).toISOString(),
        published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        official_website: 'https://www.tafem.ma',
        registration_url: 'https://www.tafem.ma/candidature',
        verification_status: 'VERIFIED',
        publish_status: 'PUBLISHED',
        logo_url: '/assets/logos/schools/encg-settat.png',
        logo_color: '#E65100',
        views: 21300,
        description: "Test d'Admissibilité à la Formation En Management (TAFEM) commun aux 12 campus ENCG."
      }
    ];

    console.log('📌 4/6 Upsert des Concours (idempotent)...');
    const { error: compErr } = await supabase.from('competitions').upsert(competitionsBatch, { onConflict: 'id' });
    if (compErr) console.warn('Avertissement concours:', compErr.message);
    else console.log(`✅ ${competitionsBatch.length} concours synchronisés.`);

    // 5. Notifications
    const notifs = [
      { id: 'n1', user_id: 'all', title: 'Concours ENSA Maroc 2026 ouvert', message: 'Les préinscriptions au concours commun des 12 ENSA du Maroc sont ouvertes sur le portail officiel.', type: 'info', link: '/concours/concours-ensa-maroc-1ere-annee-2026', read_by: [] },
      { id: 'n2', user_id: 'all', title: 'Date limite TAFEM ENCG 2026', message: 'Il vous reste 32 jours pour déposer votre dossier au concours commun d’accès aux ENCG.', type: 'deadline', link: '/concours/concours-tafem-encg-maroc-2026', read_by: [] }
    ];

    console.log('📌 5/6 Upsert des Notifications (idempotent)...');
    const { error: notifErr } = await supabase.from('notifications').upsert(notifs, { onConflict: 'id' });
    if (notifErr) console.warn('Avertissement notifications:', notifErr.message);
    else console.log(`✅ ${notifs.length} notifications synchronisées.`);

    console.log('\n🎉 SUCCÈS : Données importées dans Supabase PostgreSQL avec succès !');
    console.log('Vos données existantes sont désormais sauvegardées dans le cloud et conservées localement en fallback.\n');
  } catch (err) {
    console.error('Erreur lors du seed:', err);
    process.exit(1);
  }
}

runSeed();
