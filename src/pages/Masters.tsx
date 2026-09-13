import { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Calendar, FileText, ChevronRight, GraduationCap } from 'lucide-react';
import { Button, Chip } from '../components/ui';
import { Link } from 'react-router-dom';

export default function Masters() {
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  useEffect(() => {
    fetchMasters();
  }, [filterStatus, searchTerm]);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const url = new URL(window.location.origin + '/api/masters');
      if (filterStatus !== 'ALL') url.searchParams.append('status', filterStatus);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      if (Array.isArray(data)) setMasters(data);
    } catch (error) {
      console.error('Erreur de chargement des masters', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'OUVERT', label: 'Candidatures Ouvertes' },
    { value: 'A_VENIR', label: 'À venir' },
    { value: 'CONCOURS_A_VENIR', label: 'Concours à venir' },
    { value: 'FERME', label: 'Clôturé' },
    { value: 'RESULTATS', label: 'Résultats publiés' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-4">
            <GraduationCap className="w-4 h-4" />
            Nouveau
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Masters 2026-2027
          </h1>
          <p className="text-lg text-gray-600">
            Trouvez les concours de Master ouverts, explorez les opportunités par université et suivez les délais de candidature au Maroc.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un Master, une ville ou une université..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 border border-gray-100 shadow-sm animate-pulse"></div>
            ))}
          </div>
        ) : masters.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun Master trouvé</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {masters.map(master => (
              <div key={master.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <Chip 
                      label={master.status}
                      variant={
                        master.status === 'OUVERT' ? 'success' :
                        master.status === 'FERME' ? 'error' :
                        master.status === 'A_VENIR' ? 'warning' :
                        master.status === 'RESULTATS' ? 'info' : 'default'
                      }
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      {master.academicYear || '2026-2027'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {master.name}
                  </h3>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {master.establishment && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                      <span className="text-sm">{master.establishment} - {master.university}</span>
                    </div>
                  )}
                  {master.city && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                      <span className="text-sm">{master.city}</span>
                    </div>
                  )}
                  {master.deadlineDate && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                      <span className="text-sm">
                        Date limite : <strong className="text-gray-900">{new Date(master.deadlineDate).toLocaleDateString('fr-FR')}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-auto flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700"
                    href={master.officialUrl || master.sourceUrl || '#'}
                    target="_blank"
                    disabled={!master.officialUrl && !master.sourceUrl}
                  >
                    Voir l'annonce
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
