/**
 * ============================================================
 * CONCOURS MAROC — Crée / configure le bucket Storage 'documents'
 * ============================================================
 *
 * Utilise SUPABASE_SERVICE_ROLE_KEY (présente dans .env) côté Node UNIQUEMENT.
 * JAMAIS de service role dans le frontend.
 *
 * Usage :
 *   npm run db:bucket
 *   (ou) node scripts/setup-bucket.js
 *
 * Ensuite, appliquez les policies + colonnes via la migration :
 *   supabase/20260201_fix_documents_storage.sql   (Supabase → SQL Editor)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const env = { ...process.env };
  for (const f of ['.env', '.env.local']) {
    const fullPath = path.join(root, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
          if (!env[key]) env[key] = val;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('\n❌ ERREUR : variables manquantes dans .env');
  console.error('  VITE_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY  (Settings → API → Service role)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const BUCKET = 'documents';
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: 20 * 1024 * 1024, // 20 MB
  allowedMimeTypes: ['application/pdf'],
};

async function main() {
  console.log('🚀 Connexion à Supabase :', supabaseUrl);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('❌ Impossible de lister les buckets :', listErr.message);
    console.error('   (le service role key est-il valide ?)');
    process.exit(1);
  }

  const existing = (buckets || []).some((b) => b.name === BUCKET);

  if (existing) {
    console.log(`ℹ️  Le bucket '${BUCKET}' existe déjà — mise à jour de la configuration…`);
    const { error: updErr } = await supabase.storage.updateBucket(BUCKET, BUCKET_OPTIONS);
    if (updErr) {
      console.error('❌ Mise à jour impossible :', updErr.message);
      process.exit(1);
    }
    console.log('✔ Bucket mis à jour : public, 20 MB, application/pdf.');
  } else {
    console.log(`ℹ️  Création du bucket '${BUCKET}'…`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, BUCKET_OPTIONS);
    if (createErr) {
      console.error('❌ Création impossible :', createErr.message);
      process.exit(1);
    }
    console.log('✔ Bucket créé : public, 20 MB, application/pdf.');
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl('test-probe.txt');
  console.log('🌐 URL publique du bucket :', publicUrl.replace('test-probe.txt', '<fichier>'));

  console.log('\n➡️  Étape suivante (obligatoire) :');
  console.log('   Ouvrez supabase/20260201_fix_documents_storage.sql dans Supabase → SQL Editor');
  console.log('   et exécutez-le pour appliquer les policies Storage et les colonnes RLS.');
}

main();