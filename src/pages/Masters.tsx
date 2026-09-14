import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building2,
  Calendar,
  GraduationCap,
  ExternalLink,
  Clock,
  Sparkles,
  Users,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button, Chip } from '../components/ui';
import {
  resolveSchoolMeta,
  normalizeMasters,
  getCachedMasters,
  setCachedMasters,
  MasterItem
} from '../lib/mastersAdapter';

const STATUS_TABS = [
  { id: 'ALL', label: 'Tous' },
  { id: 'OUVERT', label: 'Ouverts' },
  { id: 'A_VENIR', label: 'À venir' },
  { id: 'CONCOURS_A_VENIR', label: 'Concours à venir' },
  { id: 'RESULTATS', label: 'Résultats' },
  { id: 'FERME', label: 'Clôturés' }
];

export default function Masters() {
  // 1. API fetch raw data
  const [rawMasters, setRawMasters] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [universityFilter, setUniversityFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      let fetched: MasterItem[] | null = null;
      try {
        const res = await fetch('/api/masters');
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              fetched = data as MasterItem[];
            }
          }
        }
      } catch (error) {
        console.warn('[Masters] API indisponible, utilisation du cache local:', error);
      }

      if (fetched && fetched.length > 0) {
        setRawMasters(fetched);
        setCachedMasters(fetched);
      } else {
        // Fallback : cache localStorage / seed canonique (161 masters)
        const cached = getCachedMasters();
        setRawMasters(cached);
      }
    } catch (error) {
      console.error('Erreur de chargement des masters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Single source of truth: Unified normalization and status refresh
  const allMasters = useMemo(() => {
    const source = rawMasters.length > 0 ? rawMasters : getCachedMasters();
    return normalizeMasters(source);
  }, [rawMasters]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('[MASTERS]', {
      total: allMasters.length,
      ouverts: allMasters.filter((m) => m.status === 'OUVERT').length,
      aVenir: allMasters.filter((m) => m.status === 'A_VENIR').length,
      concoursAVenir: allMasters.filter((m) => m.status === 'CONCOURS_A_VENIR').length,
      resultats: allMasters.filter((m) => m.status === 'RESULTATS').length,
      clotures: allMasters.filter((m) => m.status === 'FERME').length,
      aVerifier: allMasters.filter((m) => m.status === 'INFORMATION').length
    });
  }, [allMasters]);

  // 3. Extract unique filter options from the normalized master collection
  const universities = useMemo(() => {
    const set = new Set<string>();
    allMasters.forEach(m => { if (m.university) set.add(m.university); });
    return Array.from(set).sort();
  }, [allMasters]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    allMasters.forEach(m => { if (m.city) set.add(m.city); });
    return Array.from(set).sort();
  }, [allMasters]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    allMasters.forEach(m => { if (m.domain) set.add(m.domain); });
    return Array.from(set).sort();
  }, [allMasters]);

  // 4. Filter pipeline: search & attribute filters applied directly on allMasters
  const filteredMasters = useMemo(() => {
    return allMasters.filter(m => {
      // Status filter
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      // University filter
      if (universityFilter !== 'ALL' && m.university !== universityFilter) return false;

      // City filter
      if (cityFilter !== 'ALL' && m.city !== cityFilter) return false;

      // Domain filter
      if (domainFilter !== 'ALL' && m.domain !== domainFilter) return false;

      // Search query
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matches =
          m.name.toLowerCase().includes(term) ||
          m.establishment.toLowerCase().includes(term) ||
          m.university.toLowerCase().includes(term) ||
          m.city.toLowerCase().includes(term) ||
          m.domain.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [allMasters, search, statusFilter, universityFilter, cityFilter, domainFilter]);

  // 5. Sorting: Priority to open candidatures, upcoming dates, then alphabetical
  const sortedMasters = useMemo(() => {
    return [...filteredMasters].sort((a, b) => {
      const statusWeight: Record<string, number> = {
        OUVERT: 1,
        A_VENIR: 2,
        CONCOURS_A_VENIR: 3,
        RESULTATS: 4,
        INFORMATION: 5,
        FERME: 6
      };
      const diff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (diff !== 0) return diff;
      return (a.deadlineDate || '9').localeCompare(b.deadlineDate || '9');
    });
  }, [filteredMasters]);

  // Reset pagination to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, universityFilter, cityFilter, domainFilter]);

  // 6. Pagination strictly AFTER filtering and sorting
  const totalPages = Math.max(1, Math.ceil(sortedMasters.length / pageSize));
  const paginatedMasters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMasters.slice(start, start + pageSize);
  }, [sortedMasters, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setUniversityFilter('ALL');
    setCityFilter('ALL');
    setDomainFilter('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#0B2A4A] to-[#0B63CE] text-white rounded-3xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-blue-100">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              Veille Officielle Universitaire
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Masters Universitaires 2026-2027
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              Consultez tous les concours de Master (recherche, spécialisé, MST) ouverts dans les universités publiques marocaines avec dates de candidature et conditions d'admission.
            </p>
            {/* Badges d'information sans compteurs artificiels */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-sm text-blue-100">
              <div className="flex items-center gap-1.5 font-medium bg-white/10 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Mise à jour en temps réel
              </div>
              <div className="flex items-center gap-1.5 font-medium bg-white/10 px-3 py-1.5 rounded-xl">
                <GraduationCap className="w-4 h-4 text-amber-300" />
                Grandes universités et facultés du Maroc
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Top Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par intitulé du Master, faculté, université, domaine..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]/20 focus:border-[#0B63CE] text-sm text-slate-800 placeholder-slate-400 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Status Buttons sans compteurs arbitraires */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-[#0B63CE] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {/* Université */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Université</label>
              <select
                value={universityFilter}
                onChange={(e) => setUniversityFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0B63CE]"
              >
                <option value="ALL">Toutes les universités</option>
                {universities.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ville</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0B63CE]"
              >
                <option value="ALL">Toutes les villes</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Domaine */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Domaine d'études</label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0B63CE]"
              >
                <option value="ALL">Tous les domaines</option>
                {domains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between text-sm text-slate-500 px-1">
          <span>
            {loading ? 'Chargement des masters...' : `${filteredMasters.length} formation${filteredMasters.length > 1 ? 's' : ''} trouvée${filteredMasters.length > 1 ? 's' : ''}`}
          </span>
          {(statusFilter !== 'ALL' || universityFilter !== 'ALL' || cityFilter !== 'ALL' || domainFilter !== 'ALL' || search) && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#0B63CE] hover:underline font-semibold"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Grid of Masters */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-72 border border-slate-100 shadow-sm animate-pulse p-6 space-y-4">
                <div className="h-6 bg-slate-100 rounded w-1/3"></div>
                <div className="h-8 bg-slate-100 rounded w-4/5"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                <div className="h-10 bg-slate-100 rounded mt-8"></div>
              </div>
            ))}
          </div>
        ) : filteredMasters.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun Master correspondant</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Essayez d'ajuster vos filtres de recherche ou sélectionnez une autre ville / université.
            </p>
            <Button
              onClick={resetFilters}
              className="bg-[#0B63CE] text-white hover:bg-[#0952ab]"
            >
              Effacer les critères
            </Button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedMasters.map(m => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header: Status & Year */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Chip
                        tone={
                          m.status === 'OUVERT' ? 'green' :
                          m.status === 'A_VENIR' ? 'orange' :
                          m.status === 'CONCOURS_A_VENIR' ? 'blue' :
                          m.status === 'FERME' ? 'slate' :
                          m.status === 'RESULTATS' ? 'blue' : 'slate'
                        }
                      >
                        {m.status === 'OUVERT' ? 'Candidatures Ouvertes' :
                         m.status === 'A_VENIR' ? 'À venir' :
                         m.status === 'CONCOURS_A_VENIR' ? 'Concours à venir' :
                         m.status === 'FERME' ? 'Fermé' :
                         m.status === 'RESULTATS' ? 'Résultats affichés' : 'Information'}
                      </Chip>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {m.academicYear || '2026-2027'}
                      </span>
                    </div>

                    {/* Title */}
                    <Link
                      to={`/concours/${m.id}`}
                      className="text-lg font-bold text-slate-900 leading-snug hover:text-[#0B63CE] transition-colors mb-2 block"
                    >
                      {m.name}
                    </Link>

                    {/* Institution Details & School Website */}
                    {(() => {
                      const schoolMeta = resolveSchoolMeta(m.establishment, m.university);
                      const schoolWebsite = m.schoolWebsite || schoolMeta.schoolWebsite;
                      const schoolSlug = m.schoolSlug || schoolMeta.schoolSlug;

                      return (
                        <div className="space-y-2 text-xs text-slate-600 mb-4">
                          <div className="flex items-start gap-2.5">
                            <Building2 className="w-4 h-4 text-[#0B63CE] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {schoolSlug ? (
                                  <Link
                                    to={`/ecoles/${schoolSlug}`}
                                    className="font-bold text-slate-900 hover:text-[#0B63CE] hover:underline"
                                    title="Consulter la fiche de l'école"
                                  >
                                    {m.establishment}
                                  </Link>
                                ) : (
                                  <strong className="text-slate-800">{m.establishment}</strong>
                                )}

                                {schoolWebsite && (
                                  <a
                                    href={schoolWebsite}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Site officiel de l'école qui poste le concours"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-200 transition-colors"
                                  >
                                    <Globe className="w-3 h-3 text-emerald-600" />
                                    Site de l'école
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>

                              {m.university && (
                                <span className="block text-slate-500 text-[11px] mt-0.5">
                                  {m.university}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{m.city}</span>
                            {m.domain && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">{m.domain}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Dates Banner */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100 mb-4">
                      {m.deadlineDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Date limite :
                          </span>
                          <span className="font-bold text-slate-900">
                            {new Date(m.deadlineDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {m.examDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Date concours :
                          </span>
                          <span className="font-semibold text-slate-800">
                            {new Date(m.examDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {m.seats && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Nombre de places :
                          </span>
                          <span className="font-semibold text-slate-800">
                            {m.seats} places
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Conditions snippet */}
                    {m.conditions && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 italic">
                        Conditions : {m.conditions}
                      </p>
                    )}
                  </div>

                  {/* Actions: School Website, Official Portal & Source */}
                  {(() => {
                    const schoolMeta = resolveSchoolMeta(m.establishment, m.university);
                    const schoolWebsite = m.schoolWebsite || schoolMeta.schoolWebsite;

                    return (
                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {schoolWebsite && (
                          <a
                            href={schoolWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-200 transition-colors"
                            title="Accéder au site officiel de l'école qui poste le concours"
                          >
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                            Site École
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                          </a>
                        )}

                        {m.officialUrl ? (
                          <a
                            href={m.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            Candidater
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <a
                            href={schoolWebsite || m.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0B63CE] hover:bg-[#0952ab] shadow-sm transition-colors"
                          >
                            Consulter l'annonce
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium">
                  Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, sortedMasters.length)} sur {sortedMasters.length} formations
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                            <button
                              onClick={() => handlePageChange(p)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                                currentPage === p
                                  ? 'bg-[#0B63CE] text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
