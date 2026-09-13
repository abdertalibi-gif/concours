import { useState, useEffect } from 'react';
import { RefreshCw, DownloadCloud, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button, Chip } from '../../components/ui';

export default function AdminMastersImport() {
  const [logs, setLogs] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('ALL');

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
    try {
      await fetch('/api/masters/sync', { method: 'POST' });
      // Attendre un peu puis rafraîchir
      setTimeout(() => {
        fetchMasters();
        fetchLogs();
        setSyncing(false);
      }, 3000);
    } catch (error) {
      console.error('Sync failed', error);
      setSyncing(false);
    }
  };

  const filteredMasters = masters.filter(m => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  const lastSync = logs.length > 0 ? logs[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import des Masters</h1>
          <p className="text-gray-500">Synchronisez les masters et concours depuis AlMaster-Maroc.</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
        </Button>
      </div>

      {lastSync && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Dernière synchronisation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Nouveaux</div>
              <div className="text-2xl font-bold text-green-600">{lastSync.newCount}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Mis à jour</div>
              <div className="text-2xl font-bold text-blue-600">{lastSync.updatedCount}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Doublons ignorés</div>
              <div className="text-2xl font-bold text-gray-600">{lastSync.duplicateCount}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Erreurs</div>
              <div className="text-2xl font-bold text-red-600">{lastSync.errorCount}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Fait le {new Date(lastSync.createdAt).toLocaleString('fr-FR')}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium">Liste des Masters ({filteredMasters.length})</h3>
          
          <div className="flex gap-2">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'OUVERT', label: 'Ouverts' },
              { id: 'A_VENIR', label: 'À venir' },
              { id: 'FERME', label: 'Fermés' },
              { id: 'CONCOURS_A_VENIR', label: 'Concours à venir' },
              { id: 'RESULTATS', label: 'Résultats' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === f.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Master</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Établissement</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date limite</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                </tr>
              ) : filteredMasters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Aucun master trouvé</td>
                </tr>
              ) : (
                filteredMasters.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-600">{m.establishment}</td>
                    <td className="px-6 py-4 text-gray-600">{m.city}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {m.deadlineDate ? new Date(m.deadlineDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Chip
                        label={m.status}
                        variant={
                          m.status === 'OUVERT' ? 'success' :
                          m.status === 'FERME' ? 'error' :
                          m.status === 'A_VENIR' ? 'warning' :
                          m.status === 'RESULTATS' ? 'info' : 'default'
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      {m.sourceUrl ? (
                        <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                          AlMaster <DownloadCloud className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
