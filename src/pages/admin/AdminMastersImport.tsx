import { useState, useEffect } from 'react';
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Search
} from 'lucide-react';
import { Button, Chip } from '../../components/ui';

interface MasterItem {
  id: string;
  uniqueKey: string;
  name: string;
  university: string;
  establishment: string;
  city: string;
  domain: string;
  academicYear: string;
  deadlineDate: string | null;
  status: 'OUVERT' | 'FERME' | 'A_VENIR' | 'CONCOURS_A_VENIR' | 'RESULTATS' | 'INFORMATION';
  sourceUrl: string;
  officialUrl: string | null;
}

interface SyncSummary {
  id: string;
  createdAt: string;
  totalFound: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  errorCount: number;
  openCount: number;
  upcomingCount: number;
  closedCount: number;
  examUpcomingCount: number;
  resultsCount: number;
  informationCount: number;
  details: string[];
}

export default function AdminMastersImport() {
  const [logs, setLogs] = useState<SyncSummary[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMasters();
    fetchLogs();
  }, []);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/masters');
      const data = await res.json();
      if (Array.isArray(data)) setMasters(data);
    } catch (error) {
      console.error('Erreur lors du chargement des masters', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/masters/sync-logs');
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des logs', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/masters/sync', { method: 'POST' });
      const data = await res.json();
      if (data.summary) {
        setLogs(prev => [data.summary, ...prev.filter(l => l.id !== data.summary.id)]);
        setSyncMessage(`Synchronisation terminée : ${data.summary.newCount} nouveaux, ${data.summary.updatedCount} mis à jour.`);
      }
      await fetchMasters();
      await fetchLogs();
    } catch (error: any) {
      console.error('Sync failed', error);
      setSyncMessage('Erreur lors de la synchronisation.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredMasters = masters.filter(m => {
    if (filter !== 'ALL' && m.status !== filter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(term) ||
        m.establishment.toLowerCase().includes(term) ||
        m.university.toLowerCase().includes(term) ||
        m.city.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const lastSync = logs.length > 0 ? logs[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0B63CE] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Veille AlMaster-Maroc
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Synchronisation des Masters 2026-2027</h1>
          <p className="text-slate-600 text-sm mt-1">
            Collecte et mise à jour automatique des concours et avis de masters publiés sur AlMaster-Maroc.
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#0B63CE] hover:bg-[#0952ab] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
        </Button>
      </div>

      {syncMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Statistiques de la dernière synchronisation */}
      {lastSync && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Dernière synchronisation :{' '}
              <span className="font-normal text-slate-600">
                {new Date(lastSync.createdAt).toLocaleString('fr-FR')}
              </span>
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
              {lastSync.totalFound || masters.length} annonces analysées
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Nouveaux</div>
              <div className="text-xl font-bold text-emerald-600">{lastSync.newCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Mis à jour</div>
              <div className="text-xl font-bold text-blue-600">{lastSync.updatedCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Doublons ignorés</div>
              <div className="text-xl font-bold text-slate-600">{lastSync.duplicateCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Ouverts</div>
              <div className="text-xl font-bold text-emerald-700">{lastSync.openCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">À venir</div>
              <div className="text-xl font-bold text-amber-600">{lastSync.upcomingCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Fermés</div>
              <div className="text-xl font-bold text-slate-500">{lastSync.closedCount}</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500">Erreurs</div>
              <div className="text-xl font-bold text-rose-600">{lastSync.errorCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau avec filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par master, établissement, ville..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]/20 focus:border-[#0B63CE]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'OUVERT', label: 'Ouverts' },
              { id: 'A_VENIR', label: 'À venir' },
              { id: 'CONCOURS_A_VENIR', label: 'Concours à venir' },
              { id: 'FERME', label: 'Fermés' },
              { id: 'RESULTATS', label: 'Résultats' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-[#0B63CE] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Master</th>
                <th className="px-5 py-3.5">Établissement</th>
                <th className="px-5 py-3.5">Ville</th>
                <th className="px-5 py-3.5">Date limite</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Chargement des données...
                  </td>
                </tr>
              ) : filteredMasters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Aucun master ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                filteredMasters.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 line-clamp-1">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.domain || 'Formation'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div className="font-medium">{m.establishment}</div>
                      <div className="text-xs text-slate-400">{m.university}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{m.city}</td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {m.deadlineDate ? (
                        <span className="font-medium text-slate-900">
                          {new Date(m.deadlineDate).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Chip
                        tone={
                          m.status === 'OUVERT' ? 'green' :
                          m.status === 'A_VENIR' ? 'orange' :
                          m.status === 'CONCOURS_A_VENIR' ? 'blue' :
                          m.status === 'FERME' ? 'slate' :
                          m.status === 'RESULTATS' ? 'blue' : 'slate'
                        }
                      >
                        {m.status === 'OUVERT' ? 'Ouvert' :
                         m.status === 'A_VENIR' ? 'À venir' :
                         m.status === 'CONCOURS_A_VENIR' ? 'Concours à venir' :
                         m.status === 'FERME' ? 'Fermé' :
                         m.status === 'RESULTATS' ? 'Résultats' : 'Information'}
                      </Chip>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {m.officialUrl && (
                          <a
                            href={m.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
                            title="Lien officiel de candidature"
                          >
                            Officiel <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {m.sourceUrl && (
                          <a
                            href={m.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#0B63CE] hover:text-[#0952ab] underline"
                            title="Source AlMaster-Maroc"
                          >
                            AlMaster <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
