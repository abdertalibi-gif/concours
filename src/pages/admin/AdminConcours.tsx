// ============================================================
// CONCOURS MAROC — Admin : gestion des concours (CRUD complet)
// ============================================================
import { useMemo, useState } from 'react';
import { BadgeCheck, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { adminCreate, adminDelete, adminUpdate, loadDB, pushNotification } from '../../lib/db';
import type { Competition } from '../../lib/types';
import { CITIES, DOMAINS, LEVELS, formatDateShort, slugify, statusFromCompetition, uid } from '../../lib/utils';
import { Button, Field, Input, Modal, OrgAvatar, Select, StatusBadge, Textarea } from '../../components/ui';
import { AdminHeader, AdminTableShell, AddButton, ConfirmDelete, PublishPill, RowActions, Td, Th, VerifyPill } from './shared';

const COLORS = ['#0D47A1', '#C62828', '#2E7D32', '#4A148C', '#E65100', '#00695C', '#B71C1C', '#01579B', '#5D4037', '#37474F'];

function emptyForm(): Partial<Competition> {
  return {
    title: '', organizationName: '', organizationType: 'MINISTERE', category: 'MINISTERE',
    year: new Date().getFullYear(), level: 'Bac+3', city: 'Rabat', region: 'Rabat-Salé-Kénitra',
    places: 100, description: '', conditions: [], matieres: [], epreuves: [], documentsDemandes: [],
    verificationStatus: 'UNVERIFIED', publishStatus: 'DRAFT', logoColor: COLORS[0], isDemo: false,
  };
}

export default function AdminConcours() {
  const { user } = useAuth();
  const db = loadDB();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Competition | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Competition | null>(null);

  const list = useMemo(() => {
    let arr = [...db.competitions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const s = q.trim().toLowerCase();
    if (s) arr = arr.filter((c) => `${c.title} ${c.organizationName} ${c.city}`.toLowerCase().includes(s));
    if (statusFilter) arr = arr.filter((c) => statusFromCompetition(c) === statusFilter);
    return arr;
  }, [db, q, statusFilter]);

  const duplicate = (c: Competition) => {
    const copy: Competition = {
      ...JSON.parse(JSON.stringify(c)) as Competition,
      id: uid('c'), slug: `${c.slug}-copie-${Date.now().toString(36)}`,
      title: `${c.title} (copie)`, publishStatus: 'DRAFT', verificationStatus: 'UNVERIFIED',
      verifiedAt: undefined, verifiedBy: undefined, views: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    adminCreate('competitions', copy);
  };

  const togglePublish = (c: Competition) => {
    const toPublish = c.publishStatus !== 'PUBLISHED';
    adminUpdate<Competition>('competitions', c.id, {
      publishStatus: toPublish ? 'PUBLISHED' : 'DRAFT',
      publishedAt: toPublish ? new Date().toISOString() : c.publishedAt,
      updatedAt: new Date().toISOString(),
    });
    if (toPublish) {
      pushNotification({ userId: 'all', title: 'Nouveau concours publié', message: `${c.title} — ${c.organizationName}`, type: 'info', link: `/concours/${c.slug}` });
    }
  };

  const verify = (c: Competition) => {
    adminUpdate<Competition>('competitions', c.id, {
      verificationStatus: 'VERIFIED', verifiedAt: new Date().toISOString(),
      verifiedBy: user ? `${user.firstName} ${user.lastName}` : 'Admin',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div>
      <AdminHeader title="Concours" subtitle={`${db.competitions.length} concours au total — ajoutez les nouveaux concours sans toucher au code.`}
        action={<AddButton label="Ajouter un concours" onClick={() => setCreating(true)} />} />

      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher un concours, un organisme..."
        actions={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrer par statut"
            className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200">
            <option value="">Tous les statuts</option>
            <option value="Ouvert">Ouvert</option>
            <option value="Bientot">Bientôt</option>
            <option value="Ferme">Fermé</option>
          </select>
        }>
        <table className="w-full min-w-[1000px]">
          <thead><tr>
            <Th>Organisme / Titre</Th><Th>Catégorie</Th><Th>Année</Th><Th>Niveau</Th><Th>Ville</Th>
            <Th>Clôture</Th><Th>Statut</Th><Th>Vérifié</Th><Th>Publication</Th><Th>Actions</Th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <Td className="!whitespace-normal min-w-56">
                  <p className="text-xs font-bold text-slate-500">{c.organizationName}</p>
                  <p className="max-w-64 truncate font-bold text-[#0B2A4A]">{c.title}</p>
                </Td>
                <Td>{c.category}</Td>
                <Td>{c.year}</Td>
                <Td>{c.level}</Td>
                <Td>{c.city}</Td>
                <Td>{formatDateShort(c.registrationDeadline)}</Td>
                <Td><StatusBadge status={statusFromCompetition(c)} /></Td>
                <Td><VerifyPill status={c.verificationStatus} /></Td>
                <Td><PublishPill status={c.publishStatus} /></Td>
                <Td>
                  <RowActions onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)}
                    extra={
                      <>
                        <IconBtn title={c.verificationStatus === 'VERIFIED' ? 'Vérifié' : 'Vérifier'} onClick={() => verify(c)} active={c.verificationStatus === 'VERIFIED'}><BadgeCheck className="h-4 w-4" /></IconBtn>
                        <IconBtn title={c.publishStatus === 'PUBLISHED' ? 'Dépublier' : 'Publier'} onClick={() => togglePublish(c)}>{c.publishStatus === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconBtn>
                        <IconBtn title="Dupliquer" onClick={() => duplicate(c)}><Copy className="h-4 w-4" /></IconBtn>
                      </>
                    } />
                </Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">Aucun concours trouvé.</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>

      {(creating || editing) && (
        <ConcoursForm
          initial={editing ?? emptyForm()}
          isEdit={!!editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
      <ConfirmDelete open={!!deleting} label={deleting ? `${deleting.title}` : ''} onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) adminDelete('competitions', deleting.id); }} />
    </div>
  );
}

function IconBtn({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-sky-50 hover:text-[#0B63CE]'}`}>
      {children}
    </button>
  );
}

// ==================== FORMULAIRE ====================
function ConcoursForm({ initial, isEdit, onClose }: { initial: Partial<Competition>; isEdit: boolean; onClose: () => void }) {
  const db = loadDB();
  const [f, setF] = useState<Partial<Competition>>({ ...initial });
  const [conditionsTxt, setConditionsTxt] = useState((initial.conditions ?? []).join('\n'));
  const [matieresTxt, setMatieresTxt] = useState((initial.matieres ?? []).join(', '));
  const [epreuvesTxt, setEpreuvesTxt] = useState((initial.epreuves ?? []).join('\n'));
  const [docsTxt, setDocsTxt] = useState((initial.documentsDemandes ?? []).join('\n'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Competition, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.title?.trim()) e.title = 'Le titre est requis.';
    if (!f.organizationName?.trim()) e.organizationName = "Le nom de l'organisme est requis.";
    if (!f.description?.trim()) e.description = 'La description est requise.';
    if (!f.places || f.places < 1) e.places = 'Nombre de places invalide.';
    if (f.registrationDeadline && f.registrationStart && new Date(f.registrationDeadline) < new Date(f.registrationStart)) e.registrationDeadline = 'La clôture doit être après l\u2019ouverture.';
    if (f.registrationUrl && !/^https?:\/\/.+/.test(f.registrationUrl)) e.registrationUrl = 'URL invalide (https://...).';
    if (f.officialWebsite && !/^https?:\/\/.+/.test(f.officialWebsite)) e.officialWebsite = 'URL invalide (https://...).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const now = new Date().toISOString();
    const base = {
      ...f,
      title: f.title!.trim(),
      organizationName: f.organizationName!.trim(),
      slug: (f as Competition).slug || slugify(`${f.organizationName}-${f.title}-${f.year}`),
      conditions: conditionsTxt.split('\n').map((s) => s.trim()).filter(Boolean),
      matieres: matieresTxt.split(',').map((s) => s.trim()).filter(Boolean),
      epreuves: epreuvesTxt.split('\n').map((s) => s.trim()).filter(Boolean),
      documentsDemandes: docsTxt.split('\n').map((s) => s.trim()).filter(Boolean),
      updatedAt: now,
    };
    if (isEdit && (f as Competition).id) {
      adminUpdate<Competition>('competitions', (f as Competition).id, base);
    } else {
      adminCreate<Competition>('competitions', {
        ...(base as Competition),
        id: uid('c'),
        publishedAt: base.publishStatus === 'PUBLISHED' ? now : (base.publishedAt as string) ?? now,
        views: 0,
        createdAt: now,
      });
      if (base.publishStatus === 'PUBLISHED') {
        pushNotification({ userId: 'all', title: 'Nouveau concours publi\u00e9', message: `${base.title} \u2014 ${base.organizationName}`, type: 'info', link: `/concours/${base.slug}` });
      }
    }
    setSaving(false);
    onClose();
  };

  const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

  const school = f.schoolId ? db.schools.find(s => s.id === f.schoolId) : null;
  const ministry = f.ministryId ? db.ministries.find(m => m.id === f.ministryId) : (school ? db.ministries.find(m => m.id === school.ministryId) : null);
  const showLogos = (f.organizationType === 'ECOLE' && f.schoolId) || (f.organizationType === 'MINISTERE' && f.ministryId);

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Modifier le concours' : 'Ajouter un concours'} wide>
      <div className="space-y-5">
        <div className="rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900 ring-1 ring-inset ring-sky-100">
          Les champs marqu\u00e9s <span className="font-bold text-red-500">*</span> sont obligatoires. Ne saisissez que des informations v\u00e9rifiables \u2014 ne jamais inventer d\u2019URL officielle.
        </div>

        <Group title="Organisme">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type d\u2019organisme" required>
              <Select value={f.organizationType} onChange={(e) => set('organizationType', e.target.value)}>
                <option value="MINISTERE">Minist\u00e8re</option>
                <option value="ECOLE">\u00c9cole</option>
                <option value="INSTITUTION">Institution</option>
              </Select>
            </Field>
            <Field label="Nom de l\u2019organisme" required error={errors.organizationName}>
              <Input value={f.organizationName ?? ''} onChange={(e) => set('organizationName', e.target.value)} placeholder="Ex : ENSA Marrakech" error={!!errors.organizationName} />
            </Field>
            {f.organizationType === 'ECOLE' && (
              <Field label="\u00c9cole li\u00e9e">
                <Select value={f.schoolId ?? ''} onChange={(e) => set('schoolId', e.target.value || undefined)}>
                  <option value="">\u2014 Aucune \u2014</option>
                  {db.schools.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}
                </Select>
              </Field>
            )}
            {f.organizationType === 'MINISTERE' && (
              <Field label="Minist\u00e8re li\u00e9">
                <Select value={f.ministryId ?? ''} onChange={(e) => set('ministryId', e.target.value || undefined)}>
                  <option value="">\u2014 Aucune \u2014</option>
                  {db.ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Couleur du logo">
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set('logoColor', c)} aria-label={`Couleur ${c}`}
                    className={`h-8 w-8 rounded-lg ring-2 ring-offset-1 ${f.logoColor === c ? 'ring-[#0B63CE]' : 'ring-transparent'}`} style={{ background: c }} />
                ))}
              </div>
            </Field>
          </div>

          {showLogos && (school || ministry) && (
            <div className="mt-4 p-4 rounded-xl bg-sky-50 ring-1 ring-inset ring-sky-100">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Logos affich\u00e9s sur la fiche concours</p>
              <div className="mt-2 flex flex-wrap items-center gap-6">
                {school && (
                  <div className="flex items-center gap-3">
                    <OrgAvatar name={school.shortName} color={school.logoColor} logoUrl={school.logoUrl} size="md" />
                    <div>
                      <p className="text-xs font-bold text-slate-500">\u00c9cole</p>
                      <p className="text-sm font-semibold text-[#0B2A4A]">{school.shortName}</p>
                    </div>
                  </div>
                )}
                {ministry && (
                  <div className="flex items-center gap-3">
                    <OrgAvatar name={ministry.name} color={ministry.logoColor} logoUrl={ministry.logoUrl} size="md" />
                    <div>
                      <p className="text-xs font-bold text-slate-500">Minist\u00e8re</p>
                      <p className="text-sm font-semibold text-[#0B2A4A]">{ministry.shortName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Group>

        <Group title="Informations g\u00e9n\u00e9rales">
          <div className="space-y-4">
            <Field label="Titre du concours" required error={errors.title}>
              <Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Ex : Concours d'accès en 1ère année" error={!!errors.title} />
            </Field>
            <Field label="Description" required error={errors.description}>
              <Textarea rows={3} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Présentation du concours..." error={!!errors.description} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Catégorie"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="MINISTERE">Ministère</option><option value="ECOLE">École</option>
                <option value="UNIVERSITE">Université</option><option value="INSTITUTION">Institution</option>
                <option value="RECRUTEMENT">Recrutement</option><option value="AUTRE">Autre</option>
              </Select></Field>
              <Field label="Année"><Input type="number" value={f.year ?? ''} onChange={(e) => set('year', parseInt(e.target.value) || new Date().getFullYear())} /></Field>
              <Field label="Places" required error={errors.places}><Input type="number" min={1} value={f.places ?? ''} onChange={(e) => set('places', parseInt(e.target.value) || 0)} error={!!errors.places} /></Field>
              <Field label="Niveau"><Select value={f.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
              <Field label="Ville"><Select value={f.city} onChange={(e) => set('city', e.target.value)}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
              <Field label="Domaine"><Select value={f.domaine ?? ''} onChange={(e) => set('domaine', e.target.value || undefined)}>
                <option value="">—</option>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select></Field>
            </div>
            <Field label="Région"><Input value={f.region ?? ''} onChange={(e) => set('region', e.target.value)} /></Field>
          </div>
        </Group>

        <Group title="Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ouverture des inscriptions"><Input type="date" value={toDateInput(f.registrationStart)} onChange={(e) => set('registrationStart', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
            <Field label="Clôture des inscriptions" error={errors.registrationDeadline}><Input type="date" value={toDateInput(f.registrationDeadline)} onChange={(e) => set('registrationDeadline', e.target.value ? new Date(e.target.value).toISOString() : undefined)} error={!!errors.registrationDeadline} /></Field>
            <Field label="Date du concours"><Input type="date" value={toDateInput(f.competitionDate)} onChange={(e) => set('competitionDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
          </div>
        </Group>

        <Group title="Détails">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Conditions d'accès (une par ligne)"><Textarea rows={3} value={conditionsTxt} onChange={(e) => setConditionsTxt(e.target.value)} /></Field>
            <Field label="Épreuves (une par ligne)"><Textarea rows={3} value={epreuvesTxt} onChange={(e) => setEpreuvesTxt(e.target.value)} /></Field>
            <Field label="Matières (séparées par des virgules)"><Input value={matieresTxt} onChange={(e) => setMatieresTxt(e.target.value)} placeholder="Mathématiques, Physique" /></Field>
            <Field label="Documents demandés (un par ligne)"><Textarea rows={3} value={docsTxt} onChange={(e) => setDocsTxt(e.target.value)} /></Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Profil demandé"><Textarea rows={2} value={f.profil ?? ''} onChange={(e) => set('profil', e.target.value)} /></Field>
            <Field label="Programme"><Textarea rows={2} value={f.programme ?? ''} onChange={(e) => set('programme', e.target.value)} /></Field>
            <Field label="Procédure d'inscription"><Textarea rows={2} value={f.procedure ?? ''} onChange={(e) => set('procedure', e.target.value)} /></Field>
            <Field label="Frais éventuels"><Input value={f.frais ?? ''} onChange={(e) => set('frais', e.target.value)} /></Field>
          </div>
          <div className="mt-4"><Field label="Résultats"><Textarea rows={2} value={f.resultats ?? ''} onChange={(e) => set('resultats', e.target.value)} /></Field></div>
        </Group>

        <Group title="Liens officiels (ne jamais inventer)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site officiel" error={errors.officialWebsite}><Input value={f.officialWebsite ?? ''} onChange={(e) => set('officialWebsite', e.target.value || undefined)} placeholder="https://…" error={!!errors.officialWebsite} /></Field>
            <Field label="Inscription officielle" error={errors.registrationUrl}><Input value={f.registrationUrl ?? ''} onChange={(e) => set('registrationUrl', e.target.value || undefined)} placeholder="https://…" error={!!errors.registrationUrl} /></Field>
            <Field label="URL source"><Input value={f.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value || undefined)} placeholder="https://…" /></Field>
            <Field label="Organisme source"><Input value={f.sourceOrganization ?? ''} onChange={(e) => set('sourceOrganization', e.target.value || undefined)} /></Field>
          </div>
        </Group>

        <Group title="Workflow">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Statut de publication"><Select value={f.publishStatus} onChange={(e) => set('publishStatus', e.target.value)}>
              <option value="DRAFT">Brouillon</option><option value="PENDING_REVIEW">En relecture</option>
              <option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
            </Select></Field>
            <Field label="Vérification"><Select value={f.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value)}>
              <option value="UNVERIFIED">Non vérifié</option><option value="PENDING">En attente</option>
              <option value="VERIFIED">Vérifié</option><option value="EXPIRED">Expiré</option>
            </Select></Field>
            <Field label="Forcer le statut"><Select value={f.manualStatus ?? ''} onChange={(e) => set('manualStatus', e.target.value || undefined)}>
              <option value="">Automatique</option><option value="Ouvert">Ouvert</option>
              <option value="Bientot">Bientôt</option><option value="Ferme">Fermé</option>
              <option value="Suspendu">Suspendu</option><option value="Archive">Archivé</option>
            </Select></Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={!!f.isDemo} onChange={(e) => set('isDemo', e.target.checked)} className="h-4 w-4 accent-violet-600" />
            Marquer comme données de démonstration (DEMO)
          </label>
        </Group>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} loading={saving}>{isEdit ? 'Enregistrer' : 'Créer le concours'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="px-2 text-[13px] font-extrabold uppercase tracking-wide text-[#0B2A4A]">{title}</legend>
      {children}
    </fieldset>
  );
}
