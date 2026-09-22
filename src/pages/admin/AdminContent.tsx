// ============================================================
// CONCOURS MAROC — Admin : examens, documents, cours (CRUD)
// ============================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminCreate, adminDelete, adminUpdate, loadDB, pushNotification } from '../../lib/db';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Chapter, Course, DocItem, Exam, Lesson } from '../../lib/types';
import { FileText, Eye, X } from 'lucide-react';
import { LEVELS, SUBJECTS, slugify, uid } from '../../lib/utils';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { AutoOrganismeField } from '../../components/AutoOrganismeField';
import { AdminHeader, AdminTableShell, AddButton, ConfirmDelete, PublishPill, RowActions, Td, Th, VerifyPill } from './shared';
import { uploadExamPdf } from '../../lib/services/examService';

// ==================== EXAMENS ====================
export function AdminExamens() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Exam | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...db.exams].sort((a, b) => b.year - a.year).filter((x) => !s || `${x.title} ${x.schoolName} ${x.subject}`.toLowerCase().includes(s));
  }, [db, q]);

  return (
    <div>
      <AdminHeader title="Examens" subtitle={`${db.exams.length} sujets.`} action={<AddButton label="Ajouter un examen" onClick={() => setCreating(true)} />} />
      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher un examen...">
        <table className="w-full min-w-[860px]">
          <thead><tr><Th>Titre</Th><Th>École</Th><Th>Matière</Th><Th>Année</Th><Th>Niveau</Th><Th>Vérifié</Th><Th>Publication</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60">
                <Td><strong className="max-w-56 block truncate">{e.title}</strong></Td>
                <Td>{e.schoolName}</Td><Td>{e.subject}</Td><Td>{e.year}</Td><Td>{e.level}</Td>
                <Td><VerifyPill status={e.verificationStatus} /></Td>
                <Td><PublishPill status={e.publishStatus} /></Td>
                <Td><RowActions onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} /></Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">Aucun examen trouvé.</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>
      {(creating || editing) && <ExamForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
      <ConfirmDelete open={!!deleting} label={deleting?.title ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('exams', deleting.id); }} />
    </div>
  );
}

// ==================== EXAM FORM AMÉLIORÉ ====================
interface ExamFormState extends Partial<Exam> {
  fileName?: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: string;
  filePath?: string;
  universityId?: string;
  organizationType?: string;
  logoUrl?: string;
  correctionFileName?: string;
  correctionPdfUrl?: string;
}

function ExamForm({ initial, onClose }: { initial: Exam | null; onClose: () => void }) {
  const db = loadDB();
  const [f, setF] = useState<ExamFormState>(initial ?? { year: new Date().getFullYear(), level: 'Bac+0', subject: 'Mathématiques', type: 'Concours', verificationStatus: 'UNVERIFIED', publishStatus: 'DRAFT', hasCorrection: false, downloads: 0 });
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof ExamFormState, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fData = e.target.files?.[0];
    if (!fData) return;
    const isExtensionValid = /\.pdf$/i.test(fData.name);
    const isMimeValid = !fData.type || fData.type === 'application/pdf';
    if (!isExtensionValid || !isMimeValid) { setError('Fichier PDF uniquement.'); e.target.value = ''; return; }
    if (fData.size > 20 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 20 MB.'); e.target.value = ''; return; }
    setError('');
    setFile(fData);
    set('fileName', fData.name);
    set('fileType', 'PDF');
    set('mimeType', fData.type || 'application/pdf');
    set('fileSize', formatBytes(fData.size));
  };

  const handleCorrectionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fData = e.target.files?.[0];
    if (!fData) return;
    const isExtensionValid = /\.pdf$/i.test(fData.name);
    const isMimeValid = !fData.type || fData.type === 'application/pdf';
    if (!isExtensionValid || !isMimeValid) { setError('Fichier PDF uniquement pour le corrigé.'); e.target.value = ''; return; }
    if (fData.size > 20 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 20 MB.'); e.target.value = ''; return; }
    setError('');
    setCorrectionFile(fData);
  };

  const removeFile = () => { setFile(null); set('fileName', undefined); set('fileType', undefined); set('mimeType', undefined); set('fileSize', undefined); set('pdfUrl', undefined); };
  const removeCorrectionFile = () => { setCorrectionFile(null); };

  const save = async () => {
    if (!f.title?.trim() || !f.organizationName?.trim()) { setError('Titre et organisme requis.'); return; }
    let schoolId = f.schoolId;
    let ministryId = f.ministryId;
    let universityId = f.universityId;
    if (!schoolId && !ministryId && !universityId) {
      const name = (f.organizationName || f.schoolName || '').trim().toLowerCase();
      const hit =
        db.schools.find((s) => s.shortName?.toLowerCase() === name || s.name?.toLowerCase() === name) ||
        db.schools.find((s) => `${s.shortName} ${s.name}`.toLowerCase().includes(name));
      if (hit) schoolId = hit.id;
      else { setError('Veuillez sélectionner un organisme (école, université ou ministère).'); return; }
    }

    setUploading(true);
    let finalPdfUrl = f.pdfUrl;
    let finalCorrectionUrl = f.correctionPdfUrl;

    try {
      if (file) {
        if (!isSupabaseConfigured) { setError("Supabase n'est pas configuré côté frontend."); return; }
        const result = await uploadExamPdf(file);
        finalPdfUrl = result.fileUrl;
        set('pdfUrl', finalPdfUrl);
        set('filePath', result.filePath);
      }
      if (correctionFile) {
        if (!isSupabaseConfigured) { setError("Supabase n'est pas configuré côté frontend."); return; }
        const result = await uploadExamPdf(correctionFile, 'examens/corrections');
        finalCorrectionUrl = result.fileUrl;
        set('correctionPdfUrl', finalCorrectionUrl);
      }

      const now = new Date().toISOString();
      const base: Exam = {
        id: initial ? initial.id : uid('ex'),
        slug: f.slug || slugify(`${f.title}-${f.year}`),
        title: f.title!.trim(),
        schoolId: schoolId || undefined,
        schoolName: f.schoolName?.trim() || f.organizationName?.trim(),
        ministryId: ministryId || undefined,
        organizationName: f.organizationName!.trim(),
        subject: f.subject || 'Autre',
        year: f.year ?? new Date().getFullYear(),
        level: f.level || 'Tous niveaux',
        type: f.type || 'Concours',
        description: f.description?.trim() || undefined,
        pdfUrl: finalPdfUrl,
        pages: f.pages,
        duration: f.duration,
        downloads: initial ? (f.downloads ?? 0) : 0,
        hasCorrection: !!f.hasCorrection,
        source: f.source?.trim() || undefined,
        verificationStatus: f.verificationStatus || 'UNVERIFIED',
        publishStatus: f.publishStatus || 'DRAFT',
        createdAt: initial ? (f.createdAt ?? now) : now,
        updatedAt: now,
      } as Exam & { correctionPdfUrl?: string };
      (base as any).correctionPdfUrl = finalCorrectionUrl;
      if (initial) {
        adminUpdate<Exam>('exams', initial.id, base);
        onClose();
      } else {
        adminCreate<Exam>('exams', base);
        if (base.publishStatus === 'PUBLISHED') pushNotification({ userId: 'all', title: 'Nouvel examen ajouté', message: `${base.title} — ${base.organizationName}`, type: 'success', link: `/examens/${base.slug}` });
        onClose();
      }
    } catch (err: any) {
      console.error('[Exam Upload Error]', err);
      const raw = `${err?.message ?? ''} ${err?.error ?? ''}`.trim();
      if (/bucket not found/i.test(raw)) setError("Le bucket Storage 'documents' n'existe pas. Exécutez la migration supabase/20260201_fix_documents_storage.sql.");
      else if (/duplicate/i.test(raw)) setError('Un fichier du même nom existe déjà. Renommez le PDF.');
      else if (/invalid api key|apikey/i.test(raw)) setError('Clé Supabase invalide (VITE_SUPABASE_ANON_KEY).');
      else setError(`Impossible d'envoyer le fichier : ${raw || 'erreur inconnue'}`);
    } finally {
      setUploading(false);
    }
  };

  // AutoOrganismeField onChange handler
  const handleOrganismeChange = (org: { organismeId?: string; schoolId?: string; ministryId?: string; universityId?: string; organizationName: string; organizationType: string; logoUrl?: string }) => {
    set('organizationName', org.organizationName);
    set('schoolName', org.organizationName);
    set('schoolId', org.schoolId);
    set('ministryId', org.ministryId);
    set('universityId', org.universityId);
    if (org.logoUrl) set('logoUrl', org.logoUrl);
  };

  // Filter linked schools based on selected organism
  const filteredSchools = useMemo(() => {
    if (!f.schoolId && !f.universityId && !f.ministryId) return db.schools;
    if (f.schoolId) return db.schools.filter(s => s.id === f.schoolId);
    if (f.universityId) return db.schools.filter(s => s.universityId === f.universityId);
    if (f.ministryId) return db.schools.filter(s => s.ministryId === f.ministryId);
    return db.schools;
  }, [db, f.schoolId, f.universityId, f.ministryId]);

  return (
    <Modal open onClose={onClose} title={initial ? "Modifier l'examen" : 'Ajouter un examen'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        {/* --- ORGANISME --- */}
        <AutoOrganismeField
          title={f.title}
          description={f.description}
          sourceUrl={f.source}
          selectedId={f.schoolId || f.ministryId || f.universityId}
          onChange={handleOrganismeChange}
        />

        {/* --- ÉCOLE LIÉE --- */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#0B63CE]" />
              École liée (optionnelle)
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type d'organisme">
              <Select value={f.organizationType ?? ''} onChange={(e) => set('organizationType', e.target.value || undefined)}>
                <option value="">— Automatique —</option>
                <option value="ECOLE">École / Faculté</option>
                <option value="UNIVERSITE">Université</option>
                <option value="MINISTERE">Ministère</option>
              </Select>
            </Field>
            <Field label="École liée">
              <Select value={f.schoolId ?? ''} onChange={(e) => set('schoolId', e.target.value || undefined)}>
                <option value="">— Aucune —</option>
                {filteredSchools.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}
              </Select>
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {f.schoolId ? `École liée : ${db.schools.find(s => s.id === f.schoolId)?.shortName}` : f.universityId ? `Filtré par université (${db.universities.find(u => u.id === f.universityId)?.name})` : f.ministryId ? `Filtré par ministère (${db.ministries.find(m => m.id === f.ministryId)?.name})` : 'Aucun organisme sélectionné — liste complète'}
          </p>
        </div>

        {/* --- INFORMATIONS GÉNÉRALES --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre *"><Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Concours ENSA — Mathématiques" /></Field>
          <Field label="Matière"><Select value={f.subject} onChange={(e) => set('subject', e.target.value)}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Année"><Input type="number" value={f.year ?? ''} onChange={(e) => set('year', parseInt(e.target.value) || new Date().getFullYear())} /></Field>
          <Field label="Niveau"><Select value={f.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
          <Field label="Type"><Select value={f.type} onChange={(e) => set('type', e.target.value)}><option>Concours</option><option>Examen</option><option>Recrutement</option><option>Partiel</option></Select></Field>
          <Field label="Durée"><Input value={f.duration ?? ''} onChange={(e) => set('duration', e.target.value)} placeholder="2h" /></Field>
          <Field label="Pages"><Input type="number" value={f.pages ?? ''} onChange={(e) => set('pages', parseInt(e.target.value) || undefined)} /></Field>
          <Field label="Vérification"><Select value={f.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value)}>
            <option value="UNVERIFIED">Non vérifié</option><option value="PENDING">En attente</option><option value="VERIFIED">Vérifié</option><option value="EXPIRED">Expiré</option>
          </Select></Field>
          <Field label="Publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
            <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
          </Select></Field>
        </div>

        {/* --- DOCUMENT PDF --- */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#0B63CE]" />
              Document PDF principal
            </span>
          </div>
          <Field label="PDF de l'examen" hint="Format PDF obligatoire (max 20 MB)">
            {!f.fileName && !f.pdfUrl ? (
              <div className="flex items-center gap-4">
                <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#0B63CE]/10 file:text-[#0B63CE] hover:file:bg-[#0B63CE]/20 cursor-pointer" disabled={uploading} />
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-inset ring-red-100 font-bold text-xs">PDF</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0B2A4A] truncate">{f.fileName || (initial ? `PDF actuel — ${initial.pdfUrl?.split('/').pop() || ''}` : 'Nouveau PDF')}</p>
                    <p className="text-slate-500 mt-0.5">{f.fileType || 'PDF'}{f.fileSize ? ` • ${f.fileSize}` : initial?.pdfUrl ? ' • déjà téléversé' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {f.pdfUrl && (
                    <a href={f.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition-colors">
                      <Eye className="h-3 w-3" /> Voir
                    </a>
                  )}
                  <button type="button" onClick={removeFile} className="ml-2 shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50" disabled={uploading}>
                    <X className="h-3 w-3" /> Changer
                  </button>
                </div>
              </div>
            )}
          </Field>
        </div>

        {/* --- CORRIGÉ PDF --- */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={!!f.hasCorrection} onChange={(e) => set('hasCorrection', e.target.checked)} className="h-4 w-4 accent-[#0B63CE]" />
              Corrigé inclus (PDF séparé)
            </label>
          </div>
          {f.hasCorrection && (
            <Field label="PDF du corrigé" hint="Format PDF obligatoire (max 20 MB)">
              {!correctionFile && !f.correctionPdfUrl ? (
                <input type="file" accept=".pdf,application/pdf" onChange={handleCorrectionFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#0B63CE]/10 file:text-[#0B63CE] hover:file:bg-[#0B63CE]/20 cursor-pointer" disabled={uploading} />
              ) : (
                <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 ring-1 ring-inset ring-green-100 font-bold text-xs">PDF</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0B2A4A] truncate">{correctionFile?.name || f.correctionFileName || 'Corrigé'}</p>
                      <p className="text-slate-500 mt-0.5">{correctionFile ? formatBytes(correctionFile.size) : 'Déjà uploadé'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {f.correctionPdfUrl && (
                      <a href={f.correctionPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100">
                        <Eye className="h-3 w-3" /> Voir
                      </a>
                    )}
                    <button type="button" onClick={removeCorrectionFile} className="ml-2 shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50" disabled={uploading}>
                      <X className="h-3 w-3" /> Changer
                    </button>
                  </div>
                </div>
              )}
            </Field>
          )}
        </div>

        {/* --- DESCRIPTION --- */}
        <Field label="Description"><Textarea rows={2} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Description, consignes, remarques..." /></Field>

        {/* --- FOOTER --- */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button onClick={save} loading={uploading}>{initial ? 'Enregistrer les modifications' : 'Créer l\'examen'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== DOCUMENTS ====================
const DOC_CATS = ['Avis de concours', 'Convocation', 'Résultats', 'Liste des candidats', 'Programme', 'Guide', 'Cours', 'Fiche de révision', 'Ancien examen', 'Autre'] as const;

export function AdminDocuments() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DocItem | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((x) => !s || `${x.title} ${x.organizationName}`.toLowerCase().includes(s));
  }, [db, q]);

  return (
    <div>
      <AdminHeader title="Documents" subtitle={`${db.documents.length} documents.`} action={<AddButton label="Ajouter un document" onClick={() => setCreating(true)} />} />
      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher un document...">
        <table className="w-full min-w-[820px]">
          <thead><tr><Th>Fichier</Th><Th>Titre</Th><Th>Catégorie</Th><Th>Organisme</Th><Th>Année</Th><Th>Téléchargements</Th><Th>Publication</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/60">
                <Td>
                  {d.fileName ? (
                    <div className="flex flex-col text-xs">
                      <span className="font-bold flex items-center gap-1"><FileText className="h-3 w-3" /> <span className="max-w-32 truncate">{d.fileName}</span></span>
                      <span className="text-slate-500">{d.fileType?.includes('pdf') ? 'PDF' : d.fileType?.includes('word') ? 'Word' : d.fileType?.includes('powerpoint') || d.fileType?.includes('presentation') ? 'PowerPoint' : 'Fichier'} — {d.fileSize}</span>
                    </div>
                  ) : <span className="text-slate-400 italic">Aucun fichier</span>}
                </Td>
                <Td><strong className="max-w-60 block truncate">{d.title}</strong></Td>
                <Td>{d.category}</Td><Td className="max-w-44 truncate">{d.organizationName}</Td><Td>{d.year}</Td><Td>{d.downloads}</Td>
                <Td><PublishPill status={d.publishStatus} /></Td>
                <Td>
                  <RowActions 
                    extra={
                      <Link 
                        to={`/documents/viewer/${d.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" 
                        aria-label="Voir le document" 
                        title="Voir le document (PDF Viewer)"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    }
                    onEdit={() => setEditing(d)} 
                    onDelete={() => setDeleting(d)} 
                  />
                </Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">Aucun document trouvé.</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>
      {(creating || editing) && <DocForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
      <ConfirmDelete open={!!deleting} label={deleting?.title ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('documents', deleting.id); }} />
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function DocForm({ initial, onClose }: { initial: DocItem | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<DocItem>>(initial ?? { year: new Date().getFullYear(), category: 'Avis de concours', publishStatus: 'DRAFT', downloads: 0 });
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof DocItem, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fData = e.target.files?.[0];
    if (!fData) return;
    
    // Validation extension et MIME : PDF uniquement
    const isExtensionValid = /\.pdf$/i.test(fData.name);
    const isMimeValid = !fData.type || fData.type === 'application/pdf';

    if (!isExtensionValid || !isMimeValid) {
      setError("Fichier PDF uniquement.");
      e.target.value = '';
      return;
    }
    
    // Taille maximale : 20 MB
    if (fData.size > 20 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 20 MB.");
      e.target.value = '';
      return;
    }
    
    setError('');
    setFile(fData);
    
    const ext = fData.name.split('.').pop()?.toUpperCase() || 'PDF';
    set('fileName', fData.name);
    set('fileType', ext === 'PDF' ? 'PDF' : ext);
    set('mimeType', fData.type || 'application/pdf');
    set('fileSize', formatBytes(fData.size));
  };

  const removeSelectedFile = () => {
    setFile(null);
    set('fileName', undefined);
    set('fileType', undefined);
    set('mimeType', undefined);
    set('fileSize', undefined);
    set('fileUrl', undefined);
    set('filePath', undefined);
  };

  const save = async () => {
    if (!f.title?.trim() || !f.organizationName?.trim()) { setError('Titre et organisme requis.'); return; }

    setUploading(true);
    let finalFileUrl = f.fileUrl;
    let finalFilePath = f.filePath;

    try {
      if (file) {
        if (!isSupabaseConfigured) {
          setError("Supabase n'est pas configuré côté frontend : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le fichier .env, puis redémarrez le serveur.");
          return;
        }

        // Chemin unique dans le bucket "documents" : ex. documents/1790078861845_GINF-5.pdf
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${Date.now()}_${sanitized}`;

        // Upload vers Supabase Storage (bucket public "documents", PDF uniquement)
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        finalFileUrl = publicUrl;
        finalFilePath = filePath;
      }
  
      const now = new Date().toISOString();
      const base: DocItem = {
        ...(f as DocItem),
        fileUrl: finalFileUrl,
        filePath: finalFilePath,
        fileName: f.fileName,
        fileType: f.fileType || 'PDF',
        mimeType: f.mimeType || 'application/pdf',
        fileSize: f.fileSize,
        title: f.title!.trim(),
        organizationName: f.organizationName!.trim(),
        slug: f.slug || slugify(`${f.title}-${Date.now()}`),
        updatedAt: now
      };
      
      if (initial) {
        adminUpdate<DocItem>('documents', initial.id, base);
      } else {
        adminCreate<DocItem>('documents', { ...base, id: uid('d'), downloads: 0, createdAt: now });
        if (base.publishStatus === 'PUBLISHED') {
          pushNotification({ userId: 'all', title: 'Nouveau document', message: `${base.title}`, type: 'info', link: '/documents' });
        }
      }
      onClose();
    } catch (err: any) {
      console.error('[Supabase Storage Upload Error]', err);
      const raw = `${err?.message ?? ''} ${err?.error ?? ''}`.trim();
      if (/bucket not found/i.test(raw)) {
        setError("Le bucket Storage 'documents' n'existe pas encore dans votre projet Supabase. Aucun fichier n'a été envoyé. Créez-le : ouvrez la migration supabase/20260201_fix_documents_storage.sql dans Supabase → SQL Editor puis exécutez-la (elle crée le bucket public 'documents', ses policies et les colonnes manquantes). Vous pouvez aussi le créer dans Dashboard → Storage → New bucket, nom et zone : 'documents', Public.");
      } else if (/duplicate/i.test(raw)) {
        setError("Un fichier portant le même nom existe déjà dans le bucket. Renommez votre PDF puis réessayez.");
      } else if (/invalid api key|apikey/i.test(raw)) {
        setError("La clé Supabase (VITE_SUPABASE_ANON_KEY) semble invalide. Vérifiez le fichier .env.");
      } else {
        setError(`Impossible d'envoyer le fichier vers Supabase Storage : ${raw || 'erreur inconnue'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Modifier le document' : 'Ajouter un document'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <AutoOrganismeField
          title={f.title}
          description={f.description}
          sourceUrl={f.sourceUrl}
          selectedId={f.schoolId || f.ministryId}
          onChange={(org) => {
            set('organizationName', org.organizationName);
            set('schoolId', org.schoolId);
            set('ministryId', org.ministryId);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre *"><Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Avis de concours ENSA 2026" /></Field>
          <Field label="Nom de l'organisme *"><Input value={f.organizationName ?? ''} onChange={(e) => set('organizationName', e.target.value)} placeholder="ENSA Marrakech" /></Field>
          <Field label="Catégorie"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{DOC_CATS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Année"><Input type="number" value={f.year ?? ''} onChange={(e) => set('year', parseInt(e.target.value) || new Date().getFullYear())} /></Field>
          
          <div className="sm:col-span-2">
            <Field label="Fichier PDF du document" hint="Format PDF obligatoire (max 20 MB)">
              {!f.fileName ? (
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf" 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#0B63CE]/10 file:text-[#0B63CE] hover:file:bg-[#0B63CE]/20 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-inset ring-red-100 font-bold text-xs">PDF</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0B2A4A] truncate">{f.fileName}</p>
                      <p className="text-slate-500 mt-0.5">{f.fileType || 'PDF'} • {f.fileSize || 'Taille inconnue'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="ml-3 shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Changer
                  </button>
                </div>
              )}
            </Field>
          </div>
          
          <Field label="URL source (optionnelle)"><Input value={f.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value || undefined)} placeholder="https://…" /></Field>
          <Field label="Publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
            <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
          </Select></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Description ou remarques concernant le document..." /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button onClick={save} disabled={uploading}>{uploading ? 'Publication en cours...' : initial ? 'Enregistrer les modifications' : 'Publier le document'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== COURS ====================
export function AdminCours() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.courses.filter((x) => !s || `${x.title} ${x.subject}`.toLowerCase().includes(s));
  }, [db, q]);

  return (
    <div>
      <AdminHeader title="Cours" subtitle={`${db.courses.length} parcours de préparation.`} action={<AddButton label="Ajouter un cours" onClick={() => setCreating(true)} />} />
      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher un cours...">
        <table className="w-full min-w-[820px]">
          <thead><tr><Th>Titre</Th><Th>Matière</Th><Th>Niveau</Th><Th>Chapitres</Th><Th>Leçons</Th><Th>Publication</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <Td><strong className="max-w-60 block truncate">{c.title}</strong></Td>
                <Td>{c.subject}</Td><Td>{c.level}</Td><Td>{c.chapters.length}</Td>
                <Td>{c.chapters.reduce((n, ch) => n + ch.lessons.length, 0)}</Td>
                <Td><PublishPill status={c.publishStatus} /></Td>
                <Td><RowActions onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} /></Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Aucun cours trouvé.</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>
      {(creating || editing) && <CourseForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
      <ConfirmDelete open={!!deleting} label={deleting?.title ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('courses', deleting.id); }} />
    </div>
  );
}

function CourseForm({ initial, onClose }: { initial: Course | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Course>>(initial ?? { level: 'Bac+0', subject: 'Mathématiques', difficulty: 'Intermédiaire', color: '#0B63CE', duration: '10h', chapters: [], publishStatus: 'DRAFT' });
  const [error, setError] = useState('');
  const set = (k: keyof Course, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const addChapter = () => {
    const ch: Chapter = { id: uid('ch'), title: `Chapitre ${(f.chapters ?? []).length + 1}`, order: (f.chapters ?? []).length + 1, lessons: [] };
    set('chapters', [...(f.chapters ?? []), ch]);
  };
  const updateChapter = (id: string, title: string) => {
    set('chapters', (f.chapters ?? []).map((ch) => (ch.id === id ? { ...ch, title } : ch)));
  };
  const removeChapter = (id: string) => set('chapters', (f.chapters ?? []).filter((ch) => ch.id !== id));
  const addLesson = (chId: string) => {
    set('chapters', (f.chapters ?? []).map((ch) => {
      if (ch.id !== chId) return ch;
      const l: Lesson = { id: uid('l'), title: `Leçon ${ch.lessons.length + 1}`, type: 'TEXT', duration: '20 min', content: 'Contenu de la leçon…', order: ch.lessons.length + 1 };
      return { ...ch, lessons: [...ch.lessons, l] };
    }));
  };
  const updateLesson = (chId: string, lId: string, patch: Partial<Lesson>) => {
    set('chapters', (f.chapters ?? []).map((ch) => (ch.id === chId ? { ...ch, lessons: ch.lessons.map((l) => (l.id === lId ? { ...l, ...patch } : l)) } : ch)));
  };
  const removeLesson = (chId: string, lId: string) => {
    set('chapters', (f.chapters ?? []).map((ch) => (ch.id === chId ? { ...ch, lessons: ch.lessons.filter((l) => l.id !== lId) } : ch)));
  };

  const save = () => {
    if (!f.title?.trim()) { setError('Le titre est requis.'); return; }
    const now = new Date().toISOString();
    const base = { ...f, title: f.title!.trim(), slug: f.slug || slugify(f.title!), description: f.description ?? '', updatedAt: now };
    if (initial) adminUpdate<Course>('courses', initial.id, base);
    else {
      adminCreate<Course>('courses', { ...(base as Course), id: uid('course'), createdAt: now });
      if (base.publishStatus === 'PUBLISHED') pushNotification({ userId: 'all', title: 'Nouveau cours', message: `${base.title}`, type: 'info', link: `/preparation/cours/${base.slug}` });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Modifier le cours' : 'Ajouter un cours'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre *"><Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Matière"><Select value={f.subject} onChange={(e) => set('subject', e.target.value)}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Niveau"><Select value={f.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
          <Field label="Difficulté"><Select value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option></Select></Field>
          <Field label="Durée"><Input value={f.duration ?? ''} onChange={(e) => set('duration', e.target.value)} placeholder="10h" /></Field>
          <Field label="Couleur"><Input type="color" value={f.color ?? '#0B63CE'} onChange={(e) => set('color', e.target.value)} className="!h-10 !px-1.5" /></Field>
          <Field label="Publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
            <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
          </Select></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-[#0B2A4A]">Chapitres & leçons ({(f.chapters ?? []).length} chapitres)</p>
            <Button size="sm" variant="outline" onClick={addChapter}>+ Chapitre</Button>
          </div>
          <div className="mt-3 space-y-3">
            {(f.chapters ?? []).map((ch, ci) => (
              <div key={ch.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-400">#{ci + 1}</span>
                  <Input value={ch.title} onChange={(e) => updateChapter(ch.id, e.target.value)} className="!h-9" />
                  <Button size="sm" variant="outline" onClick={() => addLesson(ch.id)}>+ Leçon</Button>
                  <button onClick={() => removeChapter(ch.id)} className="text-xs font-bold text-red-500 hover:underline">Suppr.</button>
                </div>
                <div className="mt-2 space-y-2 pl-6">
                  {ch.lessons.map((l) => (
                    <div key={l.id} className="grid gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200 sm:grid-cols-[1fr_110px_90px_auto]">
                      <Input value={l.title} onChange={(e) => updateLesson(ch.id, l.id, { title: e.target.value })} className="!h-9" placeholder="Titre de la leçon" />
                      <select value={l.type} onChange={(e) => updateLesson(ch.id, l.id, { type: e.target.value as Lesson['type'] })} className="h-9 rounded-lg bg-white px-2 text-[13px] ring-1 ring-inset ring-slate-200">
                        <option value="VIDEO">Vidéo</option><option value="TEXT">Texte</option><option value="PDF">PDF</option><option value="QUIZ">Quiz</option><option value="EXERCISE">Exercice</option>
                      </select>
                      <Input value={l.duration} onChange={(e) => updateLesson(ch.id, l.id, { duration: e.target.value })} className="!h-9" placeholder="20 min" />
                      <button onClick={() => removeLesson(ch.id, l.id)} className="text-xs font-bold text-red-500 hover:underline">✕</button>
                      <Textarea rows={2} value={l.content} onChange={(e) => updateLesson(ch.id, l.id, { content: e.target.value })} className="sm:col-span-4" placeholder="Contenu de la leçon..." />
                    </div>
                  ))}
                  {ch.lessons.length === 0 && <p className="text-xs text-slate-400">Aucune leçon — ajoutez-en une.</p>}
                </div>
              </div>
            ))}
            {(f.chapters ?? []).length === 0 && <p className="text-sm text-slate-400">Aucun chapitre — ajoutez le premier chapitre.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={save}>{initial ? 'Enregistrer' : 'Créer'}</Button></div>
      </div>
    </Modal>
  );
}
