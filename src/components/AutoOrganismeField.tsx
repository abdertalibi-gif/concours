// ============================================================
// CONCOURS MAROC — Composant AutoOrganismeField (Auto-Select / Auto Organisme)
// ============================================================
import { useState, useMemo } from 'react';
import { loadDB } from '../lib/db';
import { resolveOrganisme } from '../lib/organismeResolver';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { Button, Modal } from './ui';

interface AutoOrganismeFieldProps {
  title?: string;
  description?: string;
  sourceUrl?: string;
  selectedId?: string;
  onChange: (org: { organismeId?: string; schoolId?: string; ministryId?: string; organizationName: string; organizationType: string; logoUrl?: string }) => void;
}

export function AutoOrganismeField({ title, description, sourceUrl, selectedId, onChange }: AutoOrganismeFieldProps) {
  const db = loadDB();
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const resolved = useMemo(() => {
    return resolveOrganisme({
      schoolId: selectedId,
      ministryId: selectedId,
      title,
      description,
      sourceUrl,
    });
  }, [selectedId, title, description, sourceUrl]);

  const allOrgs = useMemo(() => {
    const list: Array<{ id: string; name: string; type: string; category: string; logoUrl?: string; ministryId?: string }> = [];
    (db.schools || []).forEach((s: { id: string; name: string; logoUrl?: string; ministryId?: string }) => list.push({ id: s.id, name: s.name, type: 'École / Établissement', category: 'ECOLE', logoUrl: s.logoUrl, ministryId: s.ministryId }));
    (db.universities || []).forEach((u: { id: string; name: string; logoUrl?: string; ministryId?: string }) => list.push({ id: u.id, name: u.name, type: 'Université', category: 'ECOLE', logoUrl: u.logoUrl, ministryId: u.ministryId }));
    (db.ministries || []).forEach((m: { id: string; name: string; logoUrl?: string }) => list.push({ id: m.id, name: m.name, type: 'Ministère', category: 'MINISTERE', logoUrl: m.logoUrl }));
    return list;
  }, [db]);

  const filteredOrgs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOrgs.slice(0, 20);
    return allOrgs.filter((o: { name: string; type: string }) => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q)).slice(0, 30);
  }, [allOrgs, searchQuery]);

  const handleSelectOrg = (org: typeof allOrgs[0]) => {
    onChange({
      organismeId: org.id,
      schoolId: org.category === 'ECOLE' ? org.id : undefined,
      ministryId: org.category === 'MINISTERE' ? org.id : org.ministryId,
      organizationName: org.name,
      organizationType: org.category === 'MINISTERE' ? 'MINISTERE' : 'ECOLE',
      logoUrl: org.logoUrl,
    });
    setManualModalOpen(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-[#0B63CE]" />
          Organisme associé (Auto-détecté)
        </span>
        <Button variant="outline" size="sm" type="button" onClick={() => setManualModalOpen(true)}>
          {resolved.isDetected ? 'Modifier / Sélectionner' : 'Sélectionner manuellement'}
        </Button>
      </div>

      {resolved.isDetected && !resolved.requiresManualSelection ? (
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          {resolved.logoUrl ? (
            <img src={resolved.logoUrl} alt="" className="h-10 w-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-sky-50 text-[#0B63CE] flex items-center justify-center font-bold">
              {resolved.organizationName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-[#0B2A4A] truncate text-sm">{resolved.organizationName}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Détecté automatiquement
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {resolved.organizationType === 'MINISTERE' ? 'Ministère' : 'École / Établissement'}
              {resolved.ministryName ? ` • ${resolved.ministryName}` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-amber-800">
            ⚠️ Organisme non détecté automatiquement. Veuillez le sélectionner.
          </p>
          <Button variant="secondary" size="sm" type="button" onClick={() => setManualModalOpen(true)}>
            Sélectionner
          </Button>
        </div>
      )}

      {/* Manual selection modal */}
      {manualModalOpen && (
        <Modal open={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Sélectionner un organisme">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher une école, université, ministère..."
                className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100">
              {filteredOrgs.map(o => (
                <div
                  key={o.id}
                  onClick={() => handleSelectOrg(o)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sky-50 cursor-pointer transition-colors"
                >
                  {o.logoUrl ? (
                    <img src={o.logoUrl} alt="" className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-slate-100" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-sky-100 text-[#0B63CE] flex items-center justify-center text-xs font-bold">
                      {o.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-[#0B2A4A]">{o.name}</p>
                    <p className="text-xs text-slate-500">{o.type}</p>
                  </div>
                </div>
              ))}
              {filteredOrgs.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-6">Aucun organisme trouvé.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
