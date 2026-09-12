// ============================================================
// CONCOURS MAROC — Admin : utilisateurs, notifications, signalements
// ============================================================
import { useMemo, useState } from 'react';
import { adminDelete, adminUpdate, loadDB, pushNotification } from '../../lib/db';
import type { AppNotification, Report, User } from '../../lib/types';
import { formatDateShort, timeAgo } from '../../lib/utils';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { AdminHeader, AdminTableShell, ConfirmDelete, RowActions, Td, Th } from './shared';
import { cn } from '../../utils/cn';

// ==================== UTILISATEURS ====================
export function AdminUsers() {
  const db = loadDB();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((u) => !s || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(s))
      .filter((u) => !roleFilter || u.role === roleFilter);
  }, [db, q, roleFilter]);

  return (
    <div>
      <AdminHeader title="Utilisateurs" subtitle={`${db.users.length} comptes inscrits.`} />
      <AdminTableShell search={q} onSearch={setQ} searchPh="Rechercher un utilisateur..."
        actions={
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filtrer par rôle"
            className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200">
            <option value="">Tous les rôles</option><option value="USER">USER</option><option value="ADMIN">ADMIN</option>
          </select>
        }>
        <table className="w-full min-w-[820px]">
          <thead><tr><Th>Nom</Th><Th>E-mail</Th><Th>Rôle</Th><Th>Statut</Th><Th>Inscription</Th><Th>Dernière activité</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <Td><strong>{u.firstName} {u.lastName}</strong></Td>
                <Td>{u.email}</Td>
                <Td>
                  <select value={u.role} onChange={(e) => adminUpdate<User>('users', u.id, { role: e.target.value as User['role'] })}
                    aria-label={`Rôle de ${u.email}`}
                    className={cn('h-8 rounded-lg px-2 text-xs font-bold ring-1 ring-inset', u.role === 'ADMIN' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}>
                    <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                  </select>
                </Td>
                <Td>
                  {u.status === 'ACTIVE'
                    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Actif</span>
                    : <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-inset ring-red-200">Suspendu</span>}
                </Td>
                <Td>{formatDateShort(u.createdAt)}</Td>
                <Td>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adminUpdate<User>('users', u.id, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset ring-slate-200 hover:bg-slate-50" title={u.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}>
                      {u.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                    </button>
                    <RowActions onEdit={() => setEditing(u)} onDelete={() => setDeleting(u)} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Détail utilisateur">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Nom</dt><dd className="font-bold">{editing.firstName} {editing.lastName}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">E-mail</dt><dd className="font-bold">{editing.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Rôle</dt><dd className="font-bold">{editing.role}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Ville</dt><dd className="font-bold">{editing.city ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Niveau</dt><dd className="font-bold">{editing.level ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Concours suivis</dt><dd className="font-bold">{db.follows.filter((f) => f.userId === editing.id).length}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Favoris</dt><dd className="font-bold">{db.favorites.filter((f) => f.userId === editing.id).length}</dd></div>
          </dl>
          <div className="mt-5 flex justify-end"><Button variant="outline" onClick={() => setEditing(null)}>Fermer</Button></div>
        </Modal>
      )}
      <ConfirmDelete open={!!deleting} label={deleting?.email ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('users', deleting.id); }} />
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
export function AdminNotifications() {
  const db = loadDB();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AppNotification | null>(null);
  const list = [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <AdminHeader title="Notifications" subtitle="Diffusez des alertes à tous les utilisateurs."
        action={<Button onClick={() => setCreating(true)}>+ Nouvelle notification</Button>} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead><tr><Th>Titre</Th><Th>Message</Th><Th>Cible</Th><Th>Type</Th><Th>Date</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50/60">
                <Td><strong className="max-w-44 block truncate">{n.title}</strong></Td>
                <Td className="!whitespace-normal max-w-72 truncate">{n.message}</Td>
                <Td>{n.userId === 'all' ? 'Tous' : 'Utilisateur'}</Td>
                <Td>{n.type}</Td>
                <Td>{timeAgo(n.createdAt)}</Td>
                <Td><RowActions onDelete={() => setDeleting(n)} /></Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Aucune notification.</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && <NotifForm onClose={() => setCreating(false)} />}
      <ConfirmDelete open={!!deleting} label={deleting?.title ?? ''} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('notifications', deleting.id); }} />
    </div>
  );
}

function NotifForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AppNotification['type']>('info');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    if (!title.trim() || !message.trim()) { setError('Titre et message requis.'); return; }
    pushNotification({ userId: 'all', title: title.trim(), message: message.trim(), type, link: link.trim() || undefined });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Nouvelle notification">
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <Field label="Titre *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Nouveau concours publié" /></Field>
        <Field label="Message *"><Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value as AppNotification['type'])}>
            <option value="info">Info</option><option value="success">Succès</option><option value="warning">Alerte</option><option value="deadline">Date limite</option><option value="result">Résultat</option>
          </Select></Field>
          <Field label="Lien (optionnel)"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/concours/…" /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={save}>Diffuser à tous</Button></div>
      </div>
    </Modal>
  );
}

// ==================== SIGNALEMENTS ====================
export function AdminSignalements() {
  const db = loadDB();
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState<Report | null>(null);

  const list = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((r) => !filter || r.status === filter);

  return (
    <div>
      <AdminHeader title="Signalements" subtitle="Erreurs signalées par les utilisateurs — traitez-les rapidement." />
      <AdminTableShell
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par statut"
            className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200">
            <option value="">Tous les statuts</option><option value="OPEN">Ouverts</option><option value="RESOLVED">Résolus</option><option value="REJECTED">Rejetés</option>
          </select>
        }>
        <table className="w-full min-w-[860px]">
          <thead><tr><Th>Type</Th><Th>Concours</Th><Th>Message</Th><Th>Par</Th><Th>Date</Th><Th>Statut</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td><strong>{r.type}</strong></Td>
                <Td className="max-w-44 truncate">{r.competitionTitle ?? '—'}</Td>
                <Td className="!whitespace-normal max-w-64">{r.message}</Td>
                <Td>{r.userName ?? 'Visiteur'}</Td>
                <Td>{timeAgo(r.createdAt)}</Td>
                <Td>
                  <select value={r.status} onChange={(e) => adminUpdate<Report>('reports', r.id, { status: e.target.value as Report['status'] })}
                    aria-label="Statut du signalement"
                    className={cn('h-8 rounded-lg px-2 text-xs font-bold ring-1 ring-inset',
                      r.status === 'OPEN' ? 'bg-amber-50 text-amber-700 ring-amber-200' : r.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200')}>
                    <option value="OPEN">Ouvert</option><option value="RESOLVED">Résolu</option><option value="REJECTED">Rejeté</option>
                  </select>
                </Td>
                <Td><RowActions onDelete={() => setDeleting(r)} /></Td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Aucun signalement. 🎉</td></tr>}
          </tbody>
        </table>
      </AdminTableShell>
      <ConfirmDelete open={!!deleting} label="ce signalement" onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) adminDelete('reports', deleting.id); }} />
    </div>
  );
}
