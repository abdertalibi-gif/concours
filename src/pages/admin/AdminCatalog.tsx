// ============================================================
// CONCOURS MAROC — Admin : Écoles, Universités & Ministères (CRUD + Archivage)
// Gestion complète du catalogue d'institutions marocaines
// ============================================================
import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Building2, ExternalLink, GraduationCap } from 'lucide-react';
import { adminArchiveItem, adminCreate, adminDelete, adminUpdate, loadDB } from '../../lib/db';
import type { Ministry, School, University } from '../../lib/types';
import { CITIES, REGIONS, slugify, uid } from '../../lib/utils';
import { Button, Field, Input, Modal, Select, Textarea, OrgAvatar } from '../../components/ui';
import { AdminHeader, AdminTableShell, AddButton, ConfirmDelete, RowActions, Td, Th } from './shared';

// ==================== ÉCOLES ====================
export function AdminEcoles() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<School | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<School | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.schools.filter((x) => !s || `${x.name} ${x.shortName} ${x.city} ${x.type}`.toLowerCase().includes(s));
  }, [db.schools, q]);

  const toggleArchive = (school: School) => {
    adminArchiveItem('schools', school.id, school.isActive !== false);
  };

  return (
    <div>
      <AdminHeader
        title="Écoles & Établissements"
        subtitle={`${db.schools.length} établissements répertoriés (${db.schools.filter(s => s.isActive !== false).length} actifs).`}
        action={<AddButton label="Ajouter un établissement" onClick={() => setCreating(true)} />}
      />

      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher par nom, acronyme, ville...">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              <Th>Logo</Th>
              <Th>Établissement</Th>
              <Th>Université affiliée</Th>
              <Th>Tutelle</Th>
              <Th>Ville / Région</Th>
              <Th>Type</Th>
              <Th>Statut</Th>
              <Th>Concours</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((s) => {
              const univ = s.universityId ? db.universities?.find((u) => u.id === s.universityId) : undefined;
              const min = s.ministryId ? db.ministries.find((m) => m.id === s.ministryId) : undefined;
              const isActive = s.isActive !== false;
              const concoursCount = db.competitions.filter((c) => c.schoolId === s.id).length;

              return (
                <tr key={s.id} className={`hover:bg-slate-50/60 ${!isActive ? 'bg-slate-50/80 opacity-75' : ''}`}>
                  <Td>
                    <OrgAvatar
                      name={s.shortName}
                      color={s.logoColor}
                      logoUrl={s.logoUrl}
                      
                      
                      size="sm"
                    />
                  </Td>
                  <Td>
                    <div className="font-extrabold text-[#0B2A4A]">{s.shortName}</div>
                    <div className="text-xs text-slate-500 max-w-xs truncate">{s.name}</div>
                  </Td>
                  <Td>
                    {univ ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B63CE]">
                        <Building2 className="h-3 w-3" /> {univ.shortName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">— Indépendant —</span>
                    )}
                  </Td>
                  <Td>
                    {min ? (
                      <span className="text-xs font-semibold text-slate-700" title={min.name}>
                        {min.shortName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="text-xs font-semibold text-slate-700">{s.city}</div>
                    <div className="text-[11px] text-slate-400">{s.region}</div>
                  </Td>
                  <Td>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {s.type}
                    </span>
                  </Td>
                  <Td>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-300">
                        Archivé
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="font-bold text-[#0B2A4A]">{concoursCount}</span>
                  </Td>
                  <Td>
                    <RowActions
                      onEdit={() => setEditing(s)}
                      onDelete={() => setDeleting(s)}
                      extra={
                        <button
                          onClick={() => toggleArchive(s)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isActive
                              ? 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Archiver l’école' : 'Restaurer l’école'}
                          aria-label={isActive ? 'Archiver' : 'Restaurer'}
                        >
                          {isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </Td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  Aucun établissement trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {(creating || editing) && (
        <SchoolForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}

      <ConfirmDelete
        open={!!deleting}
        label={deleting?.shortName ?? ''}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) adminDelete('schools', deleting.id); }}
      />
    </div>
  );
}

function SchoolForm({ initial, onClose }: { initial: School | null; onClose: () => void }) {
  const db = loadDB();
  const [f, setF] = useState<Partial<School>>(
    initial ?? {
      type: 'École d’ingénieurs',
      city: 'Rabat',
      region: 'Rabat-Salé-Kénitra',
      logoColor: '#0B63CE',
      domains: [],
      levels: ['Bac+0', 'Bac+2'],
      isActive: true,
      ministryId: 'min-enssup',
    }
  );
  const [domainsTxt, setDomainsTxt] = useState((initial?.domains ?? ['Ingénierie', 'Informatique']).join(', '));
  const [levelsTxt, setLevelsTxt] = useState((initial?.levels ?? ['Bac+0']).join(', '));
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logoUrl ?? null);

  const set = (k: keyof School, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Le logo ne doit pas dépasser 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setLogoPreview(url);
        set('logoUrl', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const save = () => {
    if (!f.name?.trim() || !f.shortName?.trim()) {
      setError('Le nom complet et le nom court sont obligatoires.');
      return;
    }
    const now = new Date().toISOString();
    const base: Partial<School> = {
      ...f,
      name: f.name!.trim(),
      shortName: f.shortName!.trim(),
      slug: f.slug || slugify(f.shortName!),
      description: f.description ?? '',
      domains: domainsTxt.split(',').map((s) => s.trim()).filter(Boolean),
      levels: levelsTxt.split(',').map((s) => s.trim()).filter(Boolean),
      isActive: f.isActive !== false,
      updatedAt: now,
      logoUrl: logoPreview || f.logoUrl,
    };

    if (initial) {
      adminUpdate<School>('schools', initial.id, base);
    } else {
      adminCreate<School>('schools', {
        ...(base as School),
        id: uid('ec'),
        createdAt: now,
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Modifier l'établissement" : 'Ajouter un établissement'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet *" required>
            <Input
              value={f.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="École Nationale des Sciences Appliquées"
            />
          </Field>
          <Field label="Nom court / Acronyme *" required>
            <Input
              value={f.shortName ?? ''}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="ENSA Marrakech"
            />
          </Field>

          <Field label="Université de rattachement">
            <select
              value={f.universityId ?? ''}
              onChange={(e) => set('universityId', e.target.value || undefined)}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="">— Aucune (Établissement autonome ou OFPPT) —</option>
              {(db.universities || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.shortName} — {u.name} ({u.city})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ministère de tutelle">
            <select
              value={f.ministryId ?? ''}
              onChange={(e) => set('ministryId', e.target.value || undefined)}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="">— Non rattaché —</option>
              {db.ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortName} — {m.name.slice(0, 45)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ville">
            <Select value={f.city} onChange={(e) => set('city', e.target.value)}>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>

          <Field label="Région">
            <Select value={f.region} onChange={(e) => set('region', e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>

          <Field label="Type d'école">
            <Input
              value={f.type ?? ''}
              onChange={(e) => set('type', e.target.value)}
              placeholder="École d'ingénieurs, École de commerce, Faculté, Institut..."
            />
          </Field>

          <Field label="Statut de publication">
            <select
              value={f.isActive !== false ? 'true' : 'false'}
              onChange={(e) => set('isActive', e.target.value === 'true')}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="true">Actif (visible dans l'annuaire)</option>
              <option value="false">Archivé (masqué du public)</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Domaines (séparés par des virgules)">
            <Input
              value={domainsTxt}
              onChange={(e) => setDomainsTxt(e.target.value)}
              placeholder="Ingénierie, Informatique, Génie Civil"
            />
          </Field>
          <Field label="Niveaux d'admission (séparés par des virgules)">
            <Input
              value={levelsTxt}
              onChange={(e) => setLevelsTxt(e.target.value)}
              placeholder="Bac+0, Bac+2, Licence"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Site web officiel">
            <Input value={f.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="E-mail">
            <Input value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="contact@..." />
          </Field>
          <Field label="Téléphone">
            <Input value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+212 5..." />
          </Field>
        </div>

        <Field label="Description générale">
          <Textarea
            rows={3}
            value={f.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Présentation des filières, accréditations et débouchés..."
          />
        </Field>

        {/* Logo de l'établissement */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Logo officiel
          </label>
          <div className="flex items-center gap-4">
            <OrgAvatar
              name={f.shortName || 'Logo'}
              color={f.logoColor}
              logoUrl={logoPreview || f.logoUrl}
              
              
              size="lg"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B63CE] file:text-white hover:file:bg-[#0956B4]"
              />
              <p className="mt-1 text-[11px] text-slate-400">PNG, SVG ou JPEG (max 2 Mo). Préservation du ratio sans étirement.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== UNIVERSITÉS DU MAROC ====================
export function AdminUniversites() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<University | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<University | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const universities = db.universities || [];
    return universities.filter((x) => !s || `${x.name} ${x.shortName} ${x.city}`.toLowerCase().includes(s));
  }, [db.universities, q]);

  const toggleArchive = (university: University) => {
    adminArchiveItem('universities', university.id, university.isActive !== false);
  };

  return (
    <div>
      <AdminHeader
        title="Universités du Royaume"
        subtitle={`${(db.universities || []).length} universités publiques répertoriées.`}
        action={<AddButton label="Ajouter une université" onClick={() => setCreating(true)} />}
      />

      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher par nom, acronyme (UM5, UCA, UH2C)...">
        <table className="w-full min-w-[850px]">
          <thead>
            <tr>
              <Th>Logo</Th>
              <Th>Acronyme</Th>
              <Th>Nom officiel</Th>
              <Th>Ville / Siège</Th>
              <Th>Écoles affiliées</Th>
              <Th>Site web</Th>
              <Th>Statut</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => {
              const affiliatedSchools = db.schools.filter((s) => s.universityId === u.id);
              const isActive = u.isActive !== false;

              return (
                <tr key={u.id} className={`hover:bg-slate-50/60 ${!isActive ? 'bg-slate-50/80 opacity-75' : ''}`}>
                  <Td>
                    <OrgAvatar
                      name={u.shortName}
                      color={u.logoColor}
                      logoUrl={u.logoUrl}
                      
                      
                      size="sm"
                    />
                  </Td>
                  <Td>
                    <strong className="text-base text-[#0B2A4A]">{u.shortName}</strong>
                    {u.nameAr && <div className="text-xs text-slate-400 font-arabic" dir="rtl">{u.nameAr}</div>}
                  </Td>
                  <Td className="max-w-xs truncate font-medium text-slate-800">
                    {u.name}
                  </Td>
                  <Td>
                    <span className="font-semibold text-slate-700">{u.city}</span>
                    <span className="block text-[11px] text-slate-400">{u.region}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      <GraduationCap className="h-3 w-3" />
                      {affiliatedSchools.length} établissements
                    </span>
                  </Td>
                  <Td>
                    {u.website ? (
                      <a
                        href={u.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0B63CE] hover:underline"
                      >
                        Visiter <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '—'}
                  </Td>
                  <Td>
                    {isActive ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-300">
                        Archivée
                      </span>
                    )}
                  </Td>
                  <Td>
                    <RowActions
                      onEdit={() => setEditing(u)}
                      onDelete={() => setDeleting(u)}
                      extra={
                        <button
                          onClick={() => toggleArchive(u)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isActive
                              ? 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Archiver l’université' : 'Restaurer l’université'}
                        >
                          {isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </Td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  Aucune université trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {(creating || editing) && (
        <UniversityForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}

      <ConfirmDelete
        open={!!deleting}
        label={deleting?.shortName ?? ''}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) adminDelete('universities', deleting.id); }}
      />
    </div>
  );
}

function UniversityForm({ initial, onClose }: { initial: University | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<University>>(
    initial ?? {
      city: 'Rabat',
      region: 'Rabat-Salé-Kénitra',
      logoColor: '#0B63CE',
      isActive: true,
      ministryId: 'min-enssup',
    }
  );
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logoUrl ?? null);

  const set = (k: keyof University, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Le logo ne doit pas dépasser 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setLogoPreview(url);
        set('logoUrl', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const save = () => {
    if (!f.name?.trim() || !f.shortName?.trim()) {
      setError('Le nom complet et l’acronyme sont obligatoires.');
      return;
    }
    const now = new Date().toISOString();
    const base: Partial<University> = {
      ...f,
      name: f.name!.trim(),
      shortName: f.shortName!.trim(),
      slug: f.slug || slugify(f.shortName!),
      description: f.description ?? '',
      isActive: f.isActive !== false,
      updatedAt: now,
      logoUrl: logoPreview || f.logoUrl,
    };

    if (initial) {
      adminUpdate<University>('universities', initial.id, base);
    } else {
      adminCreate<University>('universities', {
        ...(base as University),
        id: uid('univ'),
        createdAt: now,
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Modifier l'université" : 'Ajouter une université'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet en français *" required>
            <Input
              value={f.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Université Mohammed V de Rabat"
            />
          </Field>
          <Field label="Acronyme officiel *" required>
            <Input
              value={f.shortName ?? ''}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="UM5"
            />
          </Field>
          <Field label="Nom en arabe (Optionnel)">
            <Input
              value={f.nameAr ?? ''}
              onChange={(e) => set('nameAr', e.target.value)}
              placeholder="جامعة محمد الخامس بالرباط"
              dir="rtl"
            />
          </Field>
          <Field label="Ville du siège">
            <Select value={f.city} onChange={(e) => set('city', e.target.value)}>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Région administrative">
            <Select value={f.region} onChange={(e) => set('region', e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Site officiel">
            <Input
              value={f.website ?? ''}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>

        <Field label="Description historique & filières d'excellence">
          <Textarea
            rows={3}
            value={f.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Historique, facultés, écoles d'ingénieurs et instituts doctoraux rattachés..."
          />
        </Field>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Logo officiel de l'université
          </label>
          <div className="flex items-center gap-4">
            <OrgAvatar
              name={f.shortName || 'Univ'}
              color={f.logoColor}
              logoUrl={logoPreview || f.logoUrl}
              
              
              size="lg"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B63CE] file:text-white hover:file:bg-[#0956B4]"
              />
              <p className="mt-1 text-[11px] text-slate-400">PNG, SVG ou JPEG (max 2 Mo). Préservation stricte du ratio d'aspect.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== MINISTÈRES & ORGANISMES ====================
export function AdminMinisteres() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Ministry | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.ministries.filter((x) => !s || `${x.name} ${x.shortName}`.toLowerCase().includes(s));
  }, [db.ministries, q]);

  const toggleArchive = (ministry: Ministry) => {
    adminArchiveItem('ministries', ministry.id, ministry.isActive !== false);
  };

  return (
    <div>
      <AdminHeader
        title="Ministères & Organismes Publics"
        subtitle={`${db.ministries.length} ministères et offices d'État répertoriés.`}
        action={<AddButton label="Ajouter un ministère" onClick={() => setCreating(true)} />}
      />

      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher par nom, acronyme...">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <Th>Logo</Th>
              <Th>Acronyme</Th>
              <Th>Intitulé officiel</Th>
              <Th>Site web</Th>
              <Th>Écoles sous tutelle</Th>
              <Th>Concours</Th>
              <Th>Statut</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((m) => {
              const affiliatedSchools = db.schools.filter((s) => s.ministryId === m.id);
              const competitionsCount = db.competitions.filter((c) => c.ministryId === m.id).length;
              const isActive = m.isActive !== false;

              return (
                <tr key={m.id} className={`hover:bg-slate-50/60 ${!isActive ? 'bg-slate-50/80 opacity-75' : ''}`}>
                  <Td>
                    <OrgAvatar
                      name={m.shortName}
                      color={m.logoColor}
                      logoUrl={m.logoUrl}
                      
                      
                      size="sm"
                    />
                  </Td>
                  <Td>
                    <strong className="text-base text-[#0B2A4A]">{m.shortName}</strong>
                  </Td>
                  <Td className="max-w-md truncate font-medium text-slate-800">
                    {m.name}
                  </Td>
                  <Td>
                    {m.website ? (
                      <a
                        href={m.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0B63CE] hover:underline"
                      >
                        Portail officiel <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '—'}
                  </Td>
                  <Td>
                    <span className="font-bold text-[#0B2A4A]">{affiliatedSchools.length}</span>
                  </Td>
                  <Td>
                    <span className="font-bold text-[#0B2A4A]">{competitionsCount}</span>
                  </Td>
                  <Td>
                    {isActive ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-300">
                        Archivé
                      </span>
                    )}
                  </Td>
                  <Td>
                    <RowActions
                      onEdit={() => setEditing(m)}
                      onDelete={() => setDeleting(m)}
                      extra={
                        <button
                          onClick={() => toggleArchive(m)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isActive
                              ? 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Archiver le ministère' : 'Restaurer le ministère'}
                        >
                          {isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </Td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  Aucun ministère trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {(creating || editing) && (
        <MinistryForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}

      <ConfirmDelete
        open={!!deleting}
        label={deleting?.shortName ?? ''}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) adminDelete('ministries', deleting.id); }}
      />
    </div>
  );
}

function MinistryForm({ initial, onClose }: { initial: Ministry | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Ministry>>(
    initial ?? {
      logoColor: '#0B63CE',
      isActive: true,
    }
  );
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logoUrl ?? null);

  const set = (k: keyof Ministry, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Le logo ne doit pas dépasser 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setLogoPreview(url);
        set('logoUrl', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const save = () => {
    if (!f.name?.trim() || !f.shortName?.trim()) {
      setError('Le nom officiel et l’acronyme sont obligatoires.');
      return;
    }
    const now = new Date().toISOString();
    const base: Partial<Ministry> = {
      ...f,
      name: f.name!.trim(),
      shortName: f.shortName!.trim(),
      slug: f.slug || slugify(f.shortName!),
      description: f.description ?? '',
      isActive: f.isActive !== false,
      updatedAt: now,
      logoUrl: logoPreview || f.logoUrl,
    };

    if (initial) {
      adminUpdate<Ministry>('ministries', initial.id, base);
    } else {
      adminCreate<Ministry>('ministries', {
        ...(base as Ministry),
        id: uid('min'),
        createdAt: now,
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Modifier le ministère" : 'Ajouter un ministère'} wide>
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom officiel complet *" required>
            <Input
              value={f.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ministère de l'Éducation Nationale..."
            />
          </Field>
          <Field label="Acronyme / Sigle *" required>
            <Input
              value={f.shortName ?? ''}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="MENPS"
            />
          </Field>
          <Field label="Portail web officiel">
            <Input
              value={f.website ?? ''}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Statut">
            <select
              value={f.isActive !== false ? 'true' : 'false'}
              onChange={(e) => set('isActive', e.target.value === 'true')}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="true">Actif</option>
              <option value="false">Archivé</option>
            </select>
          </Field>
        </div>

        <Field label="Description des compétences et attributions">
          <Textarea
            rows={3}
            value={f.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Compétences, corps de fonctionnaires recrutés, concours périodiques..."
          />
        </Field>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Logo officiel du ministère
          </label>
          <div className="flex items-center gap-4">
            <OrgAvatar
              name={f.shortName || 'Min'}
              color={f.logoColor}
              logoUrl={logoPreview || f.logoUrl}
              
              
              size="lg"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B63CE] file:text-white hover:file:bg-[#0956B4]"
              />
              <p className="mt-1 text-[11px] text-slate-400">PNG, SVG ou JPEG (max 2 Mo).</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}
