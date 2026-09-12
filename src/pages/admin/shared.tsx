// ============================================================
// CONCOURS MAROC — Composants partagés de l'admin
// ============================================================
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Modal, SearchInput } from '../../components/ui';
import { cn } from '../../utils/cn';

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminTableShell({ search, onSearch, searchPh, children, actions }: { search?: string; onSearch?: (v: string) => void; searchPh?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E6ECF3] bg-white shadow-[0_1px_3px_rgba(11,42,74,0.06)]">
      {(onSearch || actions) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          {onSearch && (
            <div className="min-w-56 flex-1">
              <SearchInput value={search ?? ''} onChange={onSearch} placeholder={searchPh ?? 'Rechercher...'} label={searchPh ?? 'Rechercher'} />
            </div>
          )}
          {actions}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500', className)}>{children}</th>;
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('whitespace-nowrap px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
}

export function RowActions({ onEdit, onDelete, extra }: { onEdit?: () => void; onDelete?: () => void; extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      {extra}
      {onEdit && <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-sky-50 hover:text-[#0B63CE]" aria-label="Modifier" title="Modifier"><Pencil className="h-4 w-4" /></button>}
      {onDelete && <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer" title="Supprimer"><Trash2 className="h-4 w-4" /></button>}
    </div>
  );
}

export function ConfirmDelete({ open, label, onConfirm, onClose }: { open: boolean; label: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmer la suppression">
      <p className="text-sm text-slate-600">Voulez-vous vraiment supprimer <strong className="text-[#0B2A4A]">{label}</strong> ? Cette action est irréversible.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>Supprimer</Button>
      </div>
    </Modal>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button onClick={onClick}><Plus className="h-4 w-4" /> {label}</Button>;
}

export function PublishPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DRAFT: 'bg-slate-100 text-slate-600 ring-slate-200',
    PENDING_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
    ARCHIVED: 'bg-slate-100 text-slate-500 ring-slate-200',
  };
  const labels: Record<string, string> = { PUBLISHED: 'Publié', DRAFT: 'Brouillon', PENDING_REVIEW: 'En relecture', ARCHIVED: 'Archivé' };
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', map[status] ?? map.DRAFT)}>{labels[status] ?? status}</span>;
}

export function VerifyPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    VERIFIED: 'bg-sky-50 text-sky-700 ring-sky-200',
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    UNVERIFIED: 'bg-slate-100 text-slate-600 ring-slate-200',
    EXPIRED: 'bg-red-50 text-red-700 ring-red-200',
  };
  const labels: Record<string, string> = { VERIFIED: '✓ Vérifié', PENDING: 'En attente', UNVERIFIED: 'Non vérifié', EXPIRED: 'Expiré' };
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', map[status] ?? map.UNVERIFIED)}>{labels[status] ?? status}</span>;
}

export function useDeleteConfirm<T extends { id: string }>(onDelete: (id: string) => void) {
  const [target, setTarget] = useState<T | null>(null);
  return { target, setTarget, onDelete };
}
