import { useState, useEffect } from 'react';
import { Play, Search, Plus, RefreshCw, StopCircle } from 'lucide-react';
import { Button, Chip, Modal, Input, Field } from '../../components/ui';

export default function AdminAIAgent() {
  const [sources, setSources] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/agent/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          url: newSourceUrl,
          type: 'HTML',
          isActive: true,
          status: 'OK'
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewSourceName('');
        setNewSourceUrl('');
        fetchSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  useEffect(() => {
    fetchSources();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/agent/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/agent/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scanSource = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/agent/sources/${id}/scan?dryRun=${isDryRun}`, { method: 'POST' });
      await fetchSources();
      await fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const scanAll = async () => {
    setLoading(true);
    try {
      for (const s of sources) {
        if (s.isActive) await scanSource(s.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">🤖</span> AI Agent Source Manager
          </h1>
          <p className="text-slate-500">Surveillance et importation automatique des concours via IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <input 
               type="checkbox" 
               id="dryRun" 
               checked={isDryRun} 
               onChange={(e) => setIsDryRun(e.target.checked)} 
               className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="dryRun" className="text-sm font-medium text-slate-700">Mode DRY RUN (Simulation)</label>
          </div>
          <Button variant="outline" onClick={scanAll} disabled={loading}>
             <Play className="mr-2 h-4 w-4" /> Lancer tout
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
             <Plus className="mr-2 h-4 w-4" /> Ajouter source
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-semibold text-slate-800">Sources Surveillées ({sources.length})</h3>
               <Button variant="ghost" size="sm" onClick={fetchSources}>
                  <RefreshCw className="h-4 w-4" />
               </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {sources.map(s => (
                <div key={s.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{s.name}</span>
                      <Chip tone={s.status === 'OK' ? 'green' : s.status === 'ERROR' ? 'orange' : 'slate'}>{s.status}</Chip>
                      {!s.isActive && <Chip tone="slate">Inactif</Chip>}
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline block mb-1">
                      {s.url}
                    </a>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Type: {s.type}</span>
                      {s.lastCheckAt ? <span>Dernier scan: {new Date(s.lastCheckAt).toLocaleString('fr-FR')}</span> : <span>Jamais scanné</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={loading || !s.isActive} onClick={() => scanSource(s.id)}>
                      <Search className="mr-2 h-4 w-4" /> Scanner
                    </Button>
                  </div>
                </div>
              ))}
              {sources.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                   Aucune source configurée. Ajoutez 5 sources de test.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex flex-col h-[600px]">
             <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
               <h3 className="font-semibold text-white flex items-center gap-2"><StopCircle size={16} className="text-green-400" /> Activity Log</h3>
             </div>
             <div className="p-4 flex-1 overflow-y-auto font-mono text-sm space-y-3">
               {logs.map(log => (
                 <div key={log.id} className="border-l-2 border-slate-700 pl-3">
                   <div className="text-slate-500 text-xs mb-1">
                     {new Date(log.createdAt).toLocaleTimeString('fr-FR')} - {log.source?.name}
                   </div>
                   <div className={
                     log.level === 'ERROR' ? 'text-red-400' : 
                     log.level === 'SUCCESS' ? 'text-green-400' : 
                     log.action === 'UPSERT' ? 'text-blue-400' : 'text-slate-300'
                   }>
                     {log.action === 'UPSERT' ? '✓ ' : log.level === 'ERROR' ? '⚠ ' : '▶ '} 
                     {log.message}
                   </div>
                 </div>
               ))}
               {logs.length === 0 && <div className="text-slate-600 italic">En attente d'activité...</div>}
             </div>
          </div>
        </div>
      </div>
    
      {/* Modal Ajout Source */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter une nouvelle source"
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <Field label="Nom de la source" required>
            <Input 
              value={newSourceName} 
              onChange={e => setNewSourceName(e.target.value)} 
              placeholder="ex: FSJES Agdal" 
              required
            />
          </Field>
          <Field label="URL (Page des annonces/concours)" required>
            <Input 
              type="url"
              value={newSourceUrl} 
              onChange={e => setNewSourceUrl(e.target.value)} 
              placeholder="https://..." 
              required
            />
          </Field>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ajout...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
</div>
  );
}
