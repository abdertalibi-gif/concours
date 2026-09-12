// ============================================================
// CONCOURS MAROC — Écoles, Universités et Ministères (Annuaire & Explorateur)
// Système de filtre en cascade : Ministère -> Université -> Établissement
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, ChevronRight, ExternalLink, GraduationCap,
  Landmark, Mail, MapPin, Phone, X
} from 'lucide-react';
import {
  getMinistryById, getSchoolBySlug, getUniversityById,
  loadDB, queryCompetitions, queryDocuments,
  queryExams, querySchools, queryUniversities, schoolStats, universityStats
} from '../lib/db';
import { CITIES } from '../lib/utils';
import { CompetitionCard, DocumentCard, ExamCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { Chip, EmptyState, OrgAvatar, Pagination, SearchInput } from '../components/ui';

type ExplorerTab = 'ecoles' | 'universites' | 'ministeres';

export function EcolesList() {
  const [params, setParams] = useSearchParams();
  const currentTab = (params.get('section') as ExplorerTab) || 'ecoles';

  const [q, setQ] = useState(params.get('q') ?? '');
  const db = loadDB();

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get('q') ?? '')) {
        const next = new URLSearchParams(params);
        if (q.trim()) next.set('q', q.trim()); else next.delete('q');
        next.delete('page');
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, params, setParams]);

  // Filtres en cascade
  const selectedMinistryId = params.get('ministere') ?? '';
  const selectedUniversityId = params.get('universite') ?? '';
  const selectedType = params.get('type') ?? '';
  const selectedCity = params.get('ville') ?? '';
  const selectedRegion = params.get('region') ?? '';
  const selectedDomaine = params.get('domaine') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    // Si on change de ministère, réinitialiser l'université si elle n'appartient plus à ce ministère
    if (key === 'ministere') {
      next.delete('universite');
    }
    next.delete('page');
    setParams(next);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (currentTab !== 'ecoles') next.set('section', currentTab);
    setQ('');
    setParams(next);
  };

  const setTab = (tab: ExplorerTab) => {
    const next = new URLSearchParams();
    if (tab !== 'ecoles') next.set('section', tab);
    setQ('');
    setParams(next);
  };

  // Listes dépendantes pour cascade
  const availableMinistries = useMemo(() => {
    return db.ministries.filter(m => m.isActive !== false);
  }, [db.ministries]);

  const availableUniversities = useMemo(() => {
    let list = (db.universities || []).filter(u => u.isActive !== false);
    if (selectedMinistryId) {
      list = list.filter(u => u.ministryId === selectedMinistryId);
    }
    return list;
  }, [db.universities, selectedMinistryId]);

  const availableTypes = useMemo(() => {
    const types = new Set(db.schools.filter(s => s.isActive !== false).map(s => s.type));
    return Array.from(types).sort();
  }, [db.schools]);

  // Requêtes selon l'onglet actif
  const schoolsResult = useMemo(() => {
    if (currentTab !== 'ecoles') return { items: [], total: 0, page: 1, totalPages: 1 };
    return querySchools({
      q: params.get('q') ?? '',
      ministryId: selectedMinistryId || undefined,
      universityId: selectedUniversityId || undefined,
      type: selectedType || undefined,
      city: selectedCity || undefined,
      region: selectedRegion || undefined,
      domaine: selectedDomaine || undefined,
    }, page, 12);
  }, [currentTab, params, selectedMinistryId, selectedUniversityId, selectedType, selectedCity, selectedRegion, selectedDomaine, page]);

  const universitiesResult = useMemo(() => {
    if (currentTab !== 'universites') return { items: [], total: 0, page: 1, totalPages: 1 };
    return queryUniversities({
      q: params.get('q') ?? '',
      city: selectedCity || undefined,
      region: selectedRegion || undefined,
      ministryId: selectedMinistryId || undefined,
    }, page, 12);
  }, [currentTab, params, selectedCity, selectedRegion, selectedMinistryId, page]);

  const ministriesResult = useMemo(() => {
    if (currentTab !== 'ministeres') return [];
    let list = db.ministries.filter(m => m.isActive !== false);
    const search = (params.get('q') ?? '').trim().toLowerCase();
    if (search) {
      list = list.filter(m => [m.name, m.shortName, ...(m.aliases || [])].join(' ').toLowerCase().includes(search));
    }
    return list;
  }, [currentTab, db.ministries, params]);

  const hasActiveFilters = Boolean(
    q || selectedMinistryId || selectedUniversityId || selectedType || selectedCity || selectedRegion || selectedDomaine
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <PageHero
        badge="Annuaire National"
        title="Établissements, Universités & Ministères du Maroc"
        compact
        subtitle="Explorez l’ensemble des institutions marocaines d’enseignement supérieur et de formation professionnelle avec leurs logos officiels et concours rattachés."
      />

      <Container>
        {/* Navigation par catégories principales */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 p-1 bg-white rounded-xl shadow-xs ring-1 ring-slate-200">
            <button
              onClick={() => setTab('ecoles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                currentTab === 'ecoles'
                  ? 'bg-[#0B63CE] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Écoles & Instituts
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${currentTab === 'ecoles' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {db.schools.filter(s => s.isActive !== false).length}
              </span>
            </button>

            <button
              onClick={() => setTab('universites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                currentTab === 'universites'
                  ? 'bg-[#0B63CE] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-50'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Universités du Maroc
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${currentTab === 'universites' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {(db.universities || []).filter(u => u.isActive !== false).length}
              </span>
            </button>

            <button
              onClick={() => setTab('ministeres')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                currentTab === 'ministeres'
                  ? 'bg-[#0B63CE] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-50'
              }`}
            >
              <Landmark className="h-4 w-4" />
              Ministères & Organismes
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${currentTab === 'ministeres' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {db.ministries.filter(m => m.isActive !== false).length}
              </span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Panneau de filtres en cascade */}
        <div className="mb-8 rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-xs">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Recherche */}
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Recherche rapide</label>
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder={currentTab === 'universites' ? 'Nom, acronyme (UM5, UCA)...' : 'ENSA, ENCG, EMI, FMP, IAV...'}
                label="Rechercher"
              />
            </div>

            {/* 2. Ministère (Niveau 1 de la cascade) */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Ministère de tutelle
              </label>
              <select
                value={selectedMinistryId}
                onChange={(e) => setFilter('ministere', e.target.value)}
                className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
              >
                <option value="">Tous les ministères</option>
                {availableMinistries.map((m) => (
                  <option key={m.id} value={m.id}>{m.shortName} — {m.name.slice(0, 42)}</option>
                ))}
              </select>
            </div>

            {/* 3. Université (Niveau 2 de la cascade) */}
            {currentTab === 'ecoles' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Université affiliée
                </label>
                <select
                  value={selectedUniversityId}
                  onChange={(e) => setFilter('universite', e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
                >
                  <option value="">Toutes les universités</option>
                  {availableUniversities.map((u) => (
                    <option key={u.id} value={u.id}>{u.shortName} ({u.city})</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Type d'établissement */}
            {currentTab === 'ecoles' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Type d'école
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setFilter('type', e.target.value)}
                  className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
                >
                  <option value="">Tous les types</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 5. Région / Ville */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                {currentTab === 'ecoles' ? '4. Ville' : 'Ville'}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setFilter('ville', e.target.value)}
                className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
              >
                <option value="">Toutes les villes</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 1: ÉCOLES & INSTITUTS */}
        {currentTab === 'ecoles' && (
          <div>
            {schoolsResult.items.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-6 w-6" />}
                title="Aucun établissement trouvé"
                message="Essayez d'ajuster les filtres de ministère, d'université ou de ville."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {schoolsResult.items.map((s) => {
                  const univ = s.universityId ? getUniversityById(s.universityId) : undefined;
                  const stats = schoolStats(s.id);
                  return (
                    <article
                      key={s.id}
                      className="group flex flex-col justify-between rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#0B63CE]/30"
                    >
                      <div>
                        <div className="flex items-start gap-3">
                          <OrgAvatar
                            name={s.shortName}
                            color={s.logoColor}
                            logoUrl={s.logoUrl}
                            
                            
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-extrabold text-[#0B2A4A] group-hover:text-[#0B63CE] transition-colors truncate">
                              {s.shortName}
                            </h3>
                            <p className="line-clamp-1 text-xs text-slate-500 font-medium">{s.name}</p>
                            <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {s.type}
                            </span>
                          </div>
                        </div>

                        {/* Rattachement Université */}
                        {univ && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 bg-sky-50/70 p-2 rounded-xl ring-1 ring-sky-100">
                            <Building2 className="h-3.5 w-3.5 text-[#0B63CE] shrink-0" />
                            <span className="truncate font-semibold text-[#0B2A4A]">{univ.shortName} ({univ.city})</span>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Chip tone="blue">{s.city}</Chip>
                          {s.domains.slice(0, 2).map((d) => (
                            <Chip key={d}>{d}</Chip>
                          ))}
                        </div>

                        <p className="mt-3 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                          {s.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-1 mb-3 text-center bg-slate-50/80 rounded-xl p-2 text-xs">
                          <div>
                            <span className="block font-black text-[#0B63CE] text-sm">{stats.concours}</span>
                            <span className="text-[10px] text-slate-500 uppercase">Concours</span>
                          </div>
                          <div>
                            <span className="block font-black text-[#0B2A4A] text-sm">{stats.examens}</span>
                            <span className="text-[10px] text-slate-500 uppercase">Examens</span>
                          </div>
                          <div>
                            <span className="block font-black text-slate-700 text-sm">{stats.documents}</span>
                            <span className="text-[10px] text-slate-500 uppercase">Docs</span>
                          </div>
                        </div>

                        <Link
                          to={`/ecoles/${s.slug}`}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0B63CE] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0956B4]"
                        >
                          Découvrir l'établissement
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <Pagination
              page={schoolsResult.page}
              totalPages={schoolsResult.totalPages}
              total={schoolsResult.total}
              label="établissements"
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', String(p));
                setParams(next);
              }}
            />
          </div>
        )}

        {/* SECTION 2: UNIVERSITÉS DU MAROC */}
        {currentTab === 'universites' && (
          <div>
            {universitiesResult.items.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="Aucune université trouvée"
                message="Essayez d'ajuster votre recherche."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {universitiesResult.items.map((u) => {
                  const stats = universityStats(u.id);
                  return (
                    <article
                      key={u.id}
                      className="group flex flex-col justify-between rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#0B63CE]/30"
                    >
                      <div>
                        <div className="flex items-start gap-4">
                          <OrgAvatar
                            name={u.shortName}
                            color={u.logoColor}
                            logoUrl={u.logoUrl}
                            
                            
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-black text-[#0B2A4A] group-hover:text-[#0B63CE] transition-colors">
                              {u.shortName}
                            </h3>
                            <p className="text-xs font-semibold text-slate-700">{u.name}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>{u.city} ({u.region})</span>
                            </div>
                          </div>
                        </div>

                        {u.nameAr && (
                          <p className="mt-2.5 text-right font-arabic text-sm text-slate-500" dir="rtl">
                            {u.nameAr}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {u.description}
                        </p>

                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                          <div>
                            <span className="block text-sm font-black text-[#0B63CE]">{stats.ecolesCount}</span>
                            <span className="text-[10px] text-slate-500">Écoles & Facs</span>
                          </div>
                          <div>
                            <span className="block text-sm font-black text-[#0B2A4A]">{stats.concoursCount}</span>
                            <span className="text-[10px] text-slate-500">Concours</span>
                          </div>
                          <div>
                            <span className="block text-sm font-black text-slate-700">{stats.examensCount}</span>
                            <span className="text-[10px] text-slate-500">Examens</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2 pt-4 border-t border-slate-100">
                        {u.website && (
                          <a
                            href={u.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Site web
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setTab('ecoles');
                            setFilter('universite', u.id);
                          }}
                          className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0B63CE] px-3 text-xs font-bold text-white hover:bg-[#0956B4]"
                        >
                          Voir les {stats.ecolesCount} écoles
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <Pagination
              page={universitiesResult.page}
              totalPages={universitiesResult.totalPages}
              total={universitiesResult.total}
              label="universités"
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', String(p));
                setParams(next);
              }}
            />
          </div>
        )}

        {/* SECTION 3: MINISTÈRES & ORGANISMES */}
        {currentTab === 'ministeres' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ministriesResult.map((m) => {
              const concoursCount = db.competitions.filter(c => c.ministryId === m.id && c.publishStatus === 'PUBLISHED').length;
              const affiliatedSchools = db.schools.filter(s => s.ministryId === m.id);

              return (
                <article
                  key={m.id}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#0B63CE]/30"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <OrgAvatar
                        name={m.shortName}
                        color={m.logoColor}
                        logoUrl={m.logoUrl}
                        
                        
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-[#0B2A4A] group-hover:text-[#0B63CE] transition-colors">
                          {m.shortName}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{m.name}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {m.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                        {concoursCount} concours officiels
                      </span>
                      {affiliatedSchools.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                          {affiliatedSchools.length} écoles sous tutelle
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 pt-4 border-t border-slate-100">
                    {m.website && (
                      <a
                        href={m.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Portail officiel
                      </a>
                    )}
                    <Link
                      to={`/concours?ministere=${m.id}`}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0B63CE] px-3 text-xs font-bold text-white hover:bg-[#0956B4]"
                    >
                      Concours ouverts
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>
      <InfoBar />
    </div>
  );
}

// ==================== DÉTAIL D'UN ÉTABLISSEMENT ====================
const DETAIL_TABS = ['Présentation', 'Concours', 'Examens & Annales', 'Documents'] as const;

export function EcoleDetail() {
  const { slug } = useParams();
  const [tab, setTab] = useState<(typeof DETAIL_TABS)[number]>('Présentation');
  const s = slug ? getSchoolBySlug(slug) : undefined;

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useEffect(() => {
    if (s) document.title = `${s.shortName} — Concours, examens & formations | Concours Maroc`;
    return () => { document.title = 'Concours Maroc — Tous les concours et examens du Maroc'; };
  }, [s]);

  if (!s) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-[#0B2A4A]">Établissement introuvable</h1>
        <p className="mt-2 text-slate-500 text-sm">L’école demandée n'existe pas ou a été archivée.</p>
        <Link to="/ecoles" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" /> Retour à l’annuaire
        </Link>
      </div>
    );
  }

  const stats = schoolStats(s.id);
  const concours = queryCompetitions({ school: s.id }, 1, 50).items;
  const examens = queryExams({ school: s.id }, 1, 50).items;
  const docs = queryDocuments({}, 1, 50).items.filter((d) => d.schoolId === s.id);
  const university = s.universityId ? getUniversityById(s.universityId) : undefined;
  const ministry = s.ministryId ? getMinistryById(s.ministryId) : undefined;

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="hover:text-[#0B63CE]">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/ecoles" className="hover:text-[#0B63CE]">Établissements</Link>
          {university && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to={`/ecoles?section=ecoles&universite=${university.id}`} className="hover:text-[#0B63CE]">
                {university.shortName}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-bold text-[#0B2A4A]">{s.shortName}</span>
        </nav>

        {/* Fiche d'en-tête */}
        <div className="mt-4 rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <OrgAvatar
              name={s.shortName}
              color={s.logoColor}
              logoUrl={s.logoUrl}
              
              
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-[#0B2A4A] sm:text-3xl">
                  {s.name}
                </h1>
              </div>

              {/* Badges de rattachement */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {university && (
                  <Link
                    to={`/ecoles?section=ecoles&universite=${university.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 font-bold text-[#0B63CE] ring-1 ring-inset ring-sky-200 hover:bg-sky-100 transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Université : {university.name}
                  </Link>
                )}
                {ministry && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    <Landmark className="h-3.5 w-3.5" />
                    Tutelle : {ministry.shortName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {s.type}
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {s.city} — {s.region}
                </span>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                {s.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {s.website && (
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0B2A4A] px-4 text-xs font-bold text-white hover:bg-[#12365e] transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Portail officiel de l'école
                  </a>
                )}
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {s.email}
                  </a>
                )}
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {s.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Statistiques clés */}
            <div className="grid shrink-0 grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-inset ring-slate-100 sm:grid-cols-1 lg:grid-cols-3">
              <div>
                <p className="text-2xl font-black text-[#0B63CE]">{stats.concours}</p>
                <p className="text-xs font-semibold text-slate-500">Concours</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#0B2A4A]">{stats.examens}</p>
                <p className="text-xs font-semibold text-slate-500">Examens</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-700">{stats.documents}</p>
                <p className="text-xs font-semibold text-slate-500">Documents</p>
              </div>
            </div>
          </div>

          {/* Onglets de contenu */}
          <div className="mt-8 flex gap-2 border-b border-slate-200">
            {DETAIL_TABS.map((t) => {
              const count = t === 'Concours' ? concours.length : t === 'Examens & Annales' ? examens.length : t === 'Documents' ? docs.length : undefined;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                    tab === t
                      ? 'border-[#0B63CE] text-[#0B63CE]'
                      : 'border-transparent text-slate-500 hover:text-[#0B2A4A]'
                  }`}
                >
                  {t}
                  {count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tab === t ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corps des onglets */}
        <div className="mt-6">
          {tab === 'Présentation' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-black text-[#0B2A4A]">Présentation générale</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    {s.longDescription || s.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-black text-[#0B2A4A]">Filières & Domaines de formation</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.domains.map((d) => (
                      <span key={d} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-100">
                        {d}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-6 text-sm font-bold text-slate-700">Niveaux d'admission préparés</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.levels.map((l) => (
                      <span key={l} className="rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-100">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-base font-black text-[#0B2A4A]">Informations pratiques</h2>
                  <dl className="mt-4 divide-y divide-slate-100 text-xs">
                    {s.founded && (
                      <div className="py-2.5 flex justify-between">
                        <dt className="text-slate-500">Année de création</dt>
                        <dd className="font-bold text-[#0B2A4A]">{s.founded}</dd>
                      </div>
                    )}
                    {s.students && (
                      <div className="py-2.5 flex justify-between">
                        <dt className="text-slate-500">Nombre d'étudiants</dt>
                        <dd className="font-bold text-[#0B2A4A]">{s.students}</dd>
                      </div>
                    )}
                    {s.city && (
                      <div className="py-2.5 flex justify-between">
                        <dt className="text-slate-500">Campus principal</dt>
                        <dd className="font-bold text-[#0B2A4A]">{s.city}</dd>
                      </div>
                    )}
                    {s.address && (
                      <div className="py-2.5 flex justify-between gap-2">
                        <dt className="text-slate-500 shrink-0">Adresse</dt>
                        <dd className="font-medium text-right text-[#0B2A4A]">{s.address}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-6">
                  <h3 className="text-sm font-extrabold text-[#0B2A4A]">Préparation aux concours</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Accédez aux annales corrigées des années précédentes et aux cours de révision conformes au programme d’accès à cette école.
                  </p>
                  <Link
                    to="/preparation"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-4 py-2 text-xs font-bold text-white hover:bg-[#0956B4]"
                  >
                    Accéder à l'espace préparation
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {tab === 'Concours' && (
            concours.length === 0 ? (
              <EmptyState
                title="Aucun concours actuellement répertorié"
                message="Les avis d'ouverture officiels pour cet établissement seront publiés dès parution par le ministère."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {concours.map((c) => (
                  <CompetitionCard key={c.id} c={c} />
                ))}
              </div>
            )
          )}

          {tab === 'Examens & Annales' && (
            examens.length === 0 ? (
              <EmptyState
                title="Aucune épreuve archivée pour cet établissement"
                message="Consultez l'espace général des examens pour les épreuves communes (CNC, ENSA, TAFEM)."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {examens.map((e) => (
                  <ExamCard key={e.id} e={e} />
                ))}
              </div>
            )
          )}

          {tab === 'Documents' && (
            docs.length === 0 ? (
              <EmptyState
                title="Aucun document officiel rattaché"
                message="Les guides du candidat et circulaires d'affectation seront disponibles prochainement."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {docs.map((d) => (
                  <DocumentCard key={d.id} d={d} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
