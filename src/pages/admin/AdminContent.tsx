// ============================================================
// CONCOURS MAROC — Admin : examens, documents, cours (CRUD)
// ============================================================
import { useMemo, useState } from 'react';
import { adminCreate, adminDelete, adminUpdate, loadDB, pushNotification } from '../../lib/db';
import type { Chapter, Course, DocItem, Exam, Lesson } from '../../lib/types';
import { LEVELS, SUBJECTS, slugify, uid } from '../../lib/utils';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { AutoOrganismeField } from '../../components/AutoOrganismeField';
import { AdminHeader, AdminTableShell, AddButton, ConfirmDelete, PublishPill, RowActions, Td, Th, VerifyPill } from './shared';

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

function ExamForm({ initial, onClose }: { initial: Exam | null; onClose: () => void }) {
  const db = loadDB();
  const [f, setF] = useState<Partial<Exam>>(initial ?? { year: new Date().getFullYear(), level: 'Bac+0', subject: 'Mathématiques', type: 'Concours', verificationStatus: 'UNVERIFIED', publishStatus: 'DRAFT', hasCorrection: false, downloads: 0, isDemo: false });
  const [error, setError] = useState('');
  const set = (k: keyof Exam, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!f.title?.trim() || !f.schoolName?.trim()) { setError('Titre et école requis.'); return; }
    const now = new Date().toISOString();
    const base = { ...f, title: f.title!.trim(), schoolName: f.schoolName!.trim(), organizationName: f.schoolName!.trim(), slug: f.slug || slugify(`${f.title}-${f.year}`), updatedAt: now };
    if (initial) adminUpdate<Exam>('exams', initial.id, base);
    else {
      adminCreate<Exam>('exams', { ...(base as Exam), id: uid('ex'), downloads: 0, createdAt: now });
      if (base.publishStatus === 'PUBLISHED') pushNotification({ userId: 'all', title: 'Nouvel examen ajouté', message: `${base.title} — ${base.schoolName}`, type: 'success', link: `/examens/${base.slug}` });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Modifier l'examen" : 'Ajouter un examen'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre *"><Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Concours ENSA — Mathématiques" /></Field>
          <Field label="École / organisme *"><Input value={f.schoolName ?? ''} onChange={(e) => set('schoolName', e.target.value)} placeholder="ENSA Marrakech" /></Field>
          <Field label="École liée"><Select value={f.schoolId ?? ''} onChange={(e) => set('schoolId', e.target.value || undefined)}>
            <option value="">— Aucune —</option>{db.schools.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}
          </Select></Field>
          <Field label="Matière"><Select value={f.subject} onChange={(e) => set('subject', e.target.value)}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Année"><Input type="number" value={f.year ?? ''} onChange={(e) => set('year', parseInt(e.target.value) || new Date().getFullYear())} /></Field>
          <Field label="Niveau"><Select value={f.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
          <Field label="Type"><Select value={f.type} onChange={(e) => set('type', e.target.value)}><option>Concours</option><option>Examen</option><option>Recrutement</option><option>Partiel</option></Select></Field>
          <Field label="Durée"><Input value={f.duration ?? ''} onChange={(e) => set('duration', e.target.value)} placeholder="2h" /></Field>
          <Field label="Pages"><Input type="number" value={f.pages ?? ''} onChange={(e) => set('pages', parseInt(e.target.value) || undefined)} /></Field>
          <Field label="URL du PDF (stockage)"><Input value={f.pdfUrl ?? ''} onChange={(e) => set('pdfUrl', e.target.value || undefined)} placeholder="https://…" /></Field>
          <Field label="Vérification"><Select value={f.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value)}>
            <option value="UNVERIFIED">Non vérifié</option><option value="PENDING">En attente</option><option value="VERIFIED">Vérifié</option><option value="EXPIRED">Expiré</option>
          </Select></Field>
          <Field label="Publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
            <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
          </Select></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={!!f.hasCorrection} onChange={(e) => set('hasCorrection', e.target.checked)} className="h-4 w-4 accent-[#0B63CE]" /> Corrigé inclus</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={!!f.isDemo} onChange={(e) => set('isDemo', e.target.checked)} className="h-4 w-4 accent-violet-600" /> DEMO</label>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={save}>{initial ? 'Enregistrer' : 'Créer'}</Button></div>
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
          <thead><tr><Th>Titre</Th><Th>Catégorie</Th><Th>Organisme</Th><Th>Année</Th><Th>Téléchargements</Th><Th>Publication</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/60">
                <Td><strong className="max-w-60 block truncate">{d.title}</strong></Td>
                <Td>{d.category}</Td><Td className="max-w-44 truncate">{d.organizationName}</Td><Td>{d.year}</Td><Td>{d.downloads}</Td>
                <Td><PublishPill status={d.publishStatus} /></Td>
                <Td><RowActions onEdit={() => setEditing(d)} onDelete={() => setDeleting(d)} /></Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Aucun document trouvé.</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>
      {(creating || editing) && <DocForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
      <ConfirmDelete open={!!deleting} label={deleting?.title ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('documents', deleting.id); }} />
    </div>
  );
}

function DocForm({ initial, onClose }: { initial: DocItem | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<DocItem>>(initial ?? { year: new Date().getFullYear(), category: 'Avis de concours', publishStatus: 'DRAFT', downloads: 0, isDemo: false });
  const [error, setError] = useState('');
  const set = (k: keyof DocItem, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!f.title?.trim() || !f.organizationName?.trim()) { setError('Titre et organisme requis.'); return; }
    const now = new Date().toISOString();
    const base = { ...f, title: f.title!.trim(), organizationName: f.organizationName!.trim(), slug: f.slug || slugify(`${f.title}-${Date.now()}`), updatedAt: now };
    if (initial) adminUpdate<DocItem>('documents', initial.id, base);
    else {
      adminCreate<DocItem>('documents', { ...(base as DocItem), id: uid('d'), downloads: 0, createdAt: now });
      if (base.publishStatus === 'PUBLISHED') pushNotification({ userId: 'all', title: 'Nouveau document', message: `${base.title}`, type: 'info', link: '/documents' });
    }
    onClose();
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
          <Field label="Titre *"><Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Nom de l'organisme *"><Input value={f.organizationName ?? ''} onChange={(e) => set('organizationName', e.target.value)} /></Field>
          <Field label="Catégorie"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{DOC_CATS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Année"><Input type="number" value={f.year ?? ''} onChange={(e) => set('year', parseInt(e.target.value) || new Date().getFullYear())} /></Field>
          <Field label="URL du fichier (stockage)"><Input value={f.fileUrl ?? ''} onChange={(e) => set('fileUrl', e.target.value || undefined)} placeholder="https://…" /></Field>
          <Field label="Taille"><Input value={f.fileSize ?? ''} onChange={(e) => set('fileSize', e.target.value || undefined)} placeholder="1,2 Mo" /></Field>
          <Field label="URL source"><Input value={f.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value || undefined)} placeholder="https://…" /></Field>
          <Field label="Publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
            <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
          </Select></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={!!f.isDemo} onChange={(e) => set('isDemo', e.target.checked)} className="h-4 w-4 accent-violet-600" /> Données de démonstration (DEMO)</label>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={save}>{initial ? 'Enregistrer' : 'Créer'}</Button></div>
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
  const [f, setF] = useState<Partial<Course>>(initial ?? { level: 'Bac+0', subject: 'Mathématiques', difficulty: 'Intermédiaire', color: '#0B63CE', duration: '10h', chapters: [], publishStatus: 'DRAFT', isDemo: false });
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
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={!!f.isDemo} onChange={(e) => set('isDemo', e.target.checked)} className="h-4 w-4 accent-violet-600" /> DEMO</label>
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
