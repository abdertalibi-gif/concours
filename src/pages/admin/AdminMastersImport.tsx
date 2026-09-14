// ============================================================
// CONCOURS MAROC — Administration : Gestion Complète des Masters
// CRUD (Ajout, Modification, Suppression, Duplication) & Synchronisation
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  GraduationCap,
  Calendar,
  Eye,
  X,
  MapPin
} from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui';
import { REAL_SCHOOLS, REAL_UNIVERSITIES } from '../../data/institutionsData';
import {
  MasterItem,
  setCachedMasters,
  addMasterToCache,
  updateMasterInCache,
  removeMasterFromCache
} from '../../lib/mastersAdapter';

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

const MOROCCAN_UNIVERSITIES = [
  'Université Mohammed V de Rabat',
  'Université Hassan II de Casablanca',
  'Université Cadi Ayyad de Marrakech',
  'Université Sidi Mohamed Ben Abdellah de Fès',
  'Université Abdelmalek Essaâdi',
  'Université Ibn Tofaïl de Kénitra',
  'Université Ibn Zohr d’Agadir',
  'Université Moulay Ismaïl de Meknès',
  'Université Mohammed Premier d’Oujda',
  'Université Chouaïb Doukkali d’El Jadida',
  'Université Sultan Moulay Slimane de Béni Mellal',
  'Université Hassan 1er de Settat'
];

const MOROCCAN_CITIES = [
  'Rabat',
  'Casablanca',
  'Marrakech',
  'Fès',
  'Tanger',
  'Tétouan',
  'Agadir',
  'Kénitra',
  'Meknès',
  'Oujda',
  'El Jadida',
  'Settat',
  'Béni Mellal',
  'Safi',
  'Nador',
  'Mohammedia'
];

const MASTER_DOMAINS = [
  'Informatique & Intelligence Artificielle',
  'Sciences & Technologies de l’Ingénieur',
  'Économie, Finance & Gestion',
  'Sciences Mathématiques & Données',
  'Droit, Sciences Juridiques & Politiques',
  'Lettres, Langues & Sciences Humaines',
  'Biologie, Chimie & Santé',
  'Management & Commerce International',
  'Sciences de l’Éducation'
];

const MASTER_LEVELS = [
  'Master Spécialisé (Bac+5)',
  'Master de Recherche (Bac+5)',
  'Master des Sciences et Techniques (MST)',
  'Master Professionnel (Bac+5)',
  'Master Fondamental (Bac+5)'
];

const INITIAL_FORM: Partial<MasterItem> = {
  name: '',
  establishment: '',
  university: MOROCCAN_UNIVERSITIES[0],
  city: 'Rabat',
  domain: '',
  level: MASTER_LEVELS[0],
  academicYear: '2026-2027',
  openingDate: '',
  deadlineDate: '',
  examDate: '',
  publicationDate: new Date().toISOString().split('T')[0],
  resultsDate: '',
  conditions: 'Licence requise dans le domaine d’études. Sélection sur dossier académique et épreuve de sélection.',
  documents: 'CV détaillé, Copie certifiée de la CIN, Relevés de notes S1-S6, Diplôme de Licence ou attestation de réussite, Lettre de motivation signée.',
  seats: 35,
  officialUrl: '',
  schoolWebsite: '',
  sourceUrl: '',
  status: 'OUVERT'
};

export default function AdminMastersImport() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SyncSummary[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filter, setFilter] = useState('ALL');
  const [universityFilter, setUniversityFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MasterItem>>(INITIAL_FORM);
  const [deletingMaster, setDeletingMaster] = useState<MasterItem | null>(null);

  useEffect(() => {
    fetchMasters();
    fetchLogs();
  }, []);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/masters');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMasters(data);
          setCachedMasters(data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des masters', error);
      toast('Impossible de joindre le serveur pour les masters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/masters/sync-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLogs(data);
      }
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
        toast(`Synchronisation réussie (+${data.summary.newCount} nouveaux masters)`, 'success');
      }
      await fetchMasters();
      await fetchLogs();
    } catch (error: any) {
      console.error('Sync failed', error);
      setSyncMessage('Erreur lors de la synchronisation.');
      toast('Échec de la synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      ...INITIAL_FORM,
      publicationDate: new Date().toISOString().split('T')[0]
    });
    setModalMode('create');
    setCurrentEditId(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (m: MasterItem) => {
    setFormData({
      name: m.name || '',
      establishment: m.establishment || '',
      university: m.university || MOROCCAN_UNIVERSITIES[0],
      city: m.city || 'Rabat',
      domain: m.domain || '',
      level: m.level || MASTER_LEVELS[0],
      academicYear: m.academicYear || '2026-2027',
      openingDate: m.openingDate || '',
      deadlineDate: m.deadlineDate || '',
      examDate: m.examDate || '',
      publicationDate: m.publicationDate || '',
      resultsDate: m.resultsDate || '',
      conditions: m.conditions || '',
      documents: m.documents || '',
      seats: m.seats || 35,
      officialUrl: m.officialUrl || '',
      schoolWebsite: m.schoolWebsite || '',
      sourceUrl: m.sourceUrl || '',
      status: m.status || 'OUVERT'
    });
    setModalMode('edit');
    setCurrentEditId(m.id);
    setModalOpen(true);
  };

  // Duplicate Master
  const handleDuplicate = (m: MasterItem) => {
    setFormData({
      ...m,
      name: `${m.name} (Copie)`,
      status: 'A_VENIR',
      publicationDate: new Date().toISOString().split('T')[0]
    });
    setModalMode('create');
    setCurrentEditId(null);
    setModalOpen(true);
    toast(`Copie préparée : ${m.name}`, 'info');
  };

  // Quick toggle status
  const handleQuickStatusChange = async (masterId: string, newStatus: any) => {
    try {
      const res = await fetch(`/api/masters/${masterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.item;
        setMasters(prev => prev.map(m => m.id === masterId ? updated : m));
        updateMasterInCache(updated);
        toast(`Statut mis à jour : ${newStatus}`, 'success');
      } else {
        toast('Erreur lors du changement de statut', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Erreur de connexion', 'error');
    }
  };

  // Save (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast('Veuillez saisir l’intitulé du master', 'error');
      return;
    }
    if (!formData.establishment?.trim()) {
      toast('Veuillez préciser l’établissement ou faculté', 'error');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/masters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok && data.item) {
          setMasters(prev => [data.item, ...prev]);
          addMasterToCache(data.item);
          toast('Master ajouté avec succès !', 'success');
          setModalOpen(false);
        } else {
          toast(data.error || 'Erreur lors de la création', 'error');
        }
      } else if (modalMode === 'edit' && currentEditId) {
        const res = await fetch(`/api/masters/${currentEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok && data.item) {
          setMasters(prev => prev.map(m => m.id === currentEditId ? data.item : m));
          updateMasterInCache(data.item);
          toast('Master mis à jour avec succès !', 'success');
          setModalOpen(false);
        } else {
          toast(data.error || 'Erreur lors de la modification', 'error');
        }
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde master:', error);
      toast('Erreur lors de l’enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Master
  const confirmDelete = async () => {
    if (!deletingMaster) return;
    try {
      const res = await fetch(`/api/masters/${deletingMaster.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMasters(prev => prev.filter(m => m.id !== deletingMaster.id));
        removeMasterFromCache(deletingMaster.id);
        toast(`Master "${deletingMaster.name}" supprimé avec succès`, 'success');
        setDeletingMaster(null);
      } else {
        const err = await res.json();
        toast(err.error || 'Impossible de supprimer ce master', 'error');
      }
    } catch (error) {
      console.error(error);
      toast('Erreur réseau lors de la suppression', 'error');
    }
  };

  // Dynamic filter lists
  const availableUniversities = useMemo(() => {
    const set = new Set<string>();
    masters.forEach(m => { if (m.university) set.add(m.university); });
    return Array.from(set).sort();
  }, [masters]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    masters.forEach(m => { if (m.city) set.add(m.city); });
    return Array.from(set).sort();
  }, [masters]);

  const modalFilteredSchools = useMemo(() => {
    if (!formData.university) return REAL_SCHOOLS;
    const univ = REAL_UNIVERSITIES.find(u => u.name === formData.university);
    if (univ) {
      return REAL_SCHOOLS.filter(s => s.universityId === univ.id);
    }
    return REAL_SCHOOLS;
  }, [formData.university]);

  // Filtered Masters
  const filteredMasters = useMemo(() => {
    return masters.filter(m => {
      if (filter !== 'ALL' && m.status !== filter) return false;
      if (universityFilter !== 'ALL' && m.university !== universityFilter) return false;
      if (cityFilter !== 'ALL' && m.city !== cityFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(term) ||
          m.establishment.toLowerCase().includes(term) ||
          m.university.toLowerCase().includes(term) ||
          m.city.toLowerCase().includes(term) ||
          m.domain.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [masters, filter, universityFilter, cityFilter, search]);

  const counts = useMemo(() => {
    return {
      all: masters.length,
      open: masters.filter(m => m.status === 'OUVERT').length,
      upcoming: masters.filter(m => m.status === 'A_VENIR').length,
      examUpcoming: masters.filter(m => m.status === 'CONCOURS_A_VENIR').length,
      closed: masters.filter(m => m.status === 'FERME').length,
      results: masters.filter(m => m.status === 'RESULTATS').length
    };
  }, [masters]);

  const lastSync = logs.length > 0 ? logs[0] : null;

  return (
    <div className="space-y-6">
      {/* Header avec Actions principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0B63CE] mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Administration Universitaire
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Masters Universitaires (2026-2027)</h1>
          <p className="text-slate-600 text-sm mt-1">
            Ajoutez, éditez ou supprimez manuellement les fiches de masters marocains, ou lancez la veille automatisée.
          </p>
          {lastSync && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Dernière synchro : {new Date(lastSync.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#0B63CE] hover:bg-[#0952ab] text-white px-4 py-2.5 rounded-xl font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter un Master
          </Button>

          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium border-slate-200 shadow-sm"
            title="Mettre à jour les données depuis le système de veille"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#0B63CE]' : ''}`} />
            {syncing ? 'Veille...' : 'Synchroniser'}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats cards interactives */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'ALL'
              ? 'bg-blue-50/70 border-[#0B63CE] ring-2 ring-[#0B63CE]/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Masters</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.all}</div>
        </button>

        <button
          onClick={() => setFilter('OUVERT')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'OUVERT'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Candidatures Ouvertes</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{counts.open}</div>
        </button>

        <button
          onClick={() => setFilter('A_VENIR')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'A_VENIR'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">À Venir</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{counts.upcoming}</div>
        </button>

        <button
          onClick={() => setFilter('CONCOURS_A_VENIR')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'CONCOURS_A_VENIR'
              ? 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Épreuves à venir</div>
          <div className="text-2xl font-extrabold text-sky-600 mt-1">{counts.examUpcoming}</div>
        </button>

        <button
          onClick={() => setFilter('FERME')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'FERME'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clôturés</div>
          <div className="text-2xl font-extrabold text-slate-600 mt-1">{counts.closed}</div>
        </button>

        <button
          onClick={() => setFilter('RESULTATS')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'RESULTATS'
              ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Résultats</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{counts.results}</div>
        </button>
      </div>

      {/* Tableau et contrôles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barre d'outils et de filtres */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par intitulé, établissement, université, ville..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]/20 focus:border-[#0B63CE]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre Université */}
            <select
              value={universityFilter}
              onChange={e => setUniversityFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B63CE]/20"
            >
              <option value="ALL">Toutes les universités</option>
              {availableUniversities.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {/* Filtre Ville */}
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B63CE]/20"
            >
              <option value="ALL">Toutes les villes</option>
              {availableCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {(search || filter !== 'ALL' || universityFilter !== 'ALL' || cityFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                  setUniversityFilter('ALL');
                  setCityFilter('ALL');
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
              <tr>
                <th className="px-5 py-3.5">Master & Formation</th>
                <th className="px-5 py-3.5">Établissement & Université</th>
                <th className="px-5 py-3.5">Ville</th>
                <th className="px-5 py-3.5">Échéance & Concours</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5">Portail</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B63CE]" />
                    Chargement des masters...
                  </td>
                </tr>
              ) : filteredMasters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Aucun master trouvé pour cette recherche.
                  </td>
                </tr>
              ) : (
                filteredMasters.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5 max-w-sm">
                      <div className="font-bold text-slate-900 line-clamp-1 hover:line-clamp-none transition-all">
                        {m.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-[#0B63CE]">{m.domain || 'Formation'}</span>
                        <span>•</span>
                        <span>{m.level || 'Master'}</span>
                        {m.seats && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">{m.seats} places</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 max-w-xs">
                      <div className="font-medium line-clamp-1">{m.establishment}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{m.university}</div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {m.city}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                      {m.deadlineDate ? (
                        <div className="flex items-center gap-1 text-slate-900 font-medium">
                          <Calendar className="w-3 h-3 text-red-500" />
                          <span>Limite : {new Date(m.deadlineDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Date non définie</span>
                      )}
                      {m.examDate && (
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Écrit : {new Date(m.examDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select
                          value={m.status}
                          onChange={e => handleQuickStatusChange(m.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors ${
                            m.status === 'OUVERT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.status === 'A_VENIR'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : m.status === 'CONCOURS_A_VENIR'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : m.status === 'FERME'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : m.status === 'RESULTATS'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <option value="OUVERT">🟢 Ouvert</option>
                          <option value="A_VENIR">🟡 À venir</option>
                          <option value="CONCOURS_A_VENIR">🔵 Concours à venir</option>
                          <option value="RESULTATS">🟣 Résultats</option>
                          <option value="FERME">⚪ Fermé</option>
                          <option value="INFORMATION">ℹ️ Information</option>
                        </select>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                      {m.officialUrl ? (
                        <a
                          href={m.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium underline"
                          title="Lien officiel de préinscription"
                        >
                          Portail officiel <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Non renseigné</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-sky-50 hover:text-[#0B63CE] transition-colors"
                          title="Modifier le master"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="Dupliquer ce master"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <a
                          href={`/concours/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          title="Voir la fiche publique"
                        >
                          <Eye className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => setDeletingMaster(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Supprimer définitivement ce master"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création / Modification de Master */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Ajouter un nouveau Master' : 'Modifier le Master'}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Intitulé officiel du Master" required>
                <Input
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Master Intelligence Artificielle et Sciences des Données"
                  required
                />
              </Field>
            </div>

            <div>
              <Field label="Établissement / Faculté" required>
                <Input
                  value={formData.establishment || ''}
                  onChange={e => setFormData({ ...formData, establishment: e.target.value })}
                  placeholder="Ex: Faculté des Sciences de Rabat (FSR) ou ENCG Casablanca"
                  list="schools-list"
                  required
                />
                <datalist id="schools-list">
                  {modalFilteredSchools.map(s => (
                    <option key={s.id} value={s.shortName} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div>
              <Field label="Université de rattachement" required>
                <Select
                  value={formData.university || MOROCCAN_UNIVERSITIES[0]}
                  onChange={e => setFormData({ ...formData, university: e.target.value })}
                >
                  {MOROCCAN_UNIVERSITIES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="Autre université">Autre université</option>
                </Select>
              </Field>
            </div>

            <div>
              <Field label="Ville" required>
                <Select
                  value={formData.city || 'Rabat'}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                >
                  {MOROCCAN_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <Field label="Domaine / Filière">
                <Input
                  value={formData.domain || ''}
                  onChange={e => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="Ex: Informatique & IA"
                  list="domains-list"
                />
                <datalist id="domains-list">
                  {MASTER_DOMAINS.map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div>
              <Field label="Type de Diplôme / Niveau">
                <Select
                  value={formData.level || MASTER_LEVELS[0]}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                >
                  {MASTER_LEVELS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <Field label="Année Universitaire">
                <Input
                  value={formData.academicYear || '2026-2027'}
                  onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2026-2027"
                />
              </Field>
            </div>

            <div>
              <Field label="Statut du concours">
                <Select
                  value={formData.status || 'OUVERT'}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="OUVERT">Candidatures Ouvertes</option>
                  <option value="A_VENIR">À venir</option>
                  <option value="CONCOURS_A_VENIR">Concours / Épreuves à venir</option>
                  <option value="RESULTATS">Résultats affichés</option>
                  <option value="FERME">Fermé / Clôturé</option>
                  <option value="INFORMATION">Information indicative</option>
                </Select>
              </Field>
            </div>

            <div>
              <Field label="Nombre de places disponibles">
                <Input
                  type="number"
                  value={formData.seats ?? ''}
                  onChange={e => setFormData({ ...formData, seats: e.target.value ? parseInt(e.target.value, 10) : null })}
                  placeholder="Ex: 35"
                />
              </Field>
            </div>

            <div>
              <Field label="Date limite de candidature">
                <Input
                  type="date"
                  value={formData.deadlineDate || ''}
                  onChange={e => {
                    const newDate = e.target.value;
                    const newFormData = { ...formData, deadlineDate: newDate };
                    
                    // Auto-update status based on deadline
                    if (newDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const deadline = new Date(newDate);
                      
                      if (deadline < today && newFormData.status === 'OUVERT') {
                        newFormData.status = 'FERME';
                      } else if (deadline >= today && newFormData.status === 'FERME') {
                        newFormData.status = 'OUVERT';
                      }
                    }
                    
                    setFormData(newFormData);
                  }}
                />
              </Field>
            </div>

            <div>
              <Field label="Date du concours (écrit / oral)">
                <Input
                  type="date"
                  value={formData.examDate || ''}
                  onChange={e => {
                    const newDate = e.target.value;
                    const newFormData = { ...formData, examDate: newDate };
                    
                    if (newDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const examDate = new Date(newDate);
                      
                      if (examDate >= today && newFormData.status === 'FERME') {
                         newFormData.status = 'CONCOURS_A_VENIR';
                      }
                    }
                    setFormData(newFormData);
                  }}
                />
              </Field>
            </div>

            <div>
              <Field label="Lien officiel du portail de préinscription">
                <Input
                  type="url"
                  value={formData.officialUrl || ''}
                  onChange={e => setFormData({ ...formData, officialUrl: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div>
              <Field label="Site web de l'établissement">
                <Input
                  type="url"
                  value={formData.schoolWebsite || ''}
                  onChange={e => setFormData({ ...formData, schoolWebsite: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Conditions d'accès et critères de sélection">
                <Textarea
                  rows={3}
                  value={formData.conditions || ''}
                  onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                  placeholder="Critères de sélection, licence exigée, mentions nécessaires..."
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Dossier de candidature & Documents requis">
                <Textarea
                  rows={3}
                  value={formData.documents || ''}
                  onChange={e => setFormData({ ...formData, documents: e.target.value })}
                  placeholder="Pièces à fournir (CIN, relevés S1-S6, attestation de réussite...)"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0B63CE] hover:bg-[#0952ab] text-white"
            >
              {saving ? 'Enregistrement...' : modalMode === 'create' ? 'Créer le Master' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation de Suppression */}
      <Modal
        open={Boolean(deletingMaster)}
        onClose={() => setDeletingMaster(null)}
        title="Confirmer la suppression"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Attention : Cette action est irréversible.</p>
              <p className="mt-1 text-xs text-rose-700">
                Vous êtes sur le point de supprimer définitivement le master suivant du catalogue :
              </p>
              <p className="font-bold text-slate-900 mt-2">
                {deletingMaster?.name}
              </p>
              <p className="text-xs text-slate-500">
                {deletingMaster?.establishment} — {deletingMaster?.university}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingMaster(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
          {/* Modal Historique de Synchronisation */}
      <Modal
        open={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Historique de Synchronisation (Logs)"
        wide={true}
      >
        <div className="space-y-6">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              Aucune synchronisation n'a encore été effectuée.
            </div>
          ) : (
            <div className="space-y-8">
              {logs.map(log => (
                <div key={log.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-slate-900 text-lg">
                      Rapport du {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </div>
                    <div className="text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      ID: {log.id}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-sm text-slate-500">Masters trouvés</div>
                      <div className="text-2xl font-bold text-slate-800">{log.totalFound}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <div className="text-sm text-emerald-600">Nouveaux ajoutés</div>
                      <div className="text-2xl font-bold text-emerald-700">+{log.newCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-200">
                      <div className="text-sm text-blue-600">Mis à jour</div>
                      <div className="text-2xl font-bold text-blue-700">{log.updatedCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-rose-200">
                      <div className="text-sm text-rose-600">Erreurs</div>
                      <div className="text-2xl font-bold text-rose-700">{log.errorCount}</div>
                    </div>
                  </div>

                  {log.details && log.details.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Détails de l'exécution :</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {log.details.map((detail, idx) => (
                          <li key={idx} className="text-sm text-slate-600 font-mono text-xs">{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
</div>
  );
}
