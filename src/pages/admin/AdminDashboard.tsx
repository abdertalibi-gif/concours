import { Link } from 'react-router-dom';
import { 
   
  FileText, 
  GraduationCap, 
  Landmark, 
   
  Trophy, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { adminStats, competitionsByMonth, loadDB } from '../../lib/db';

const COLORS = ['#0B63CE', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

export default function AdminDashboard() {
  const db = loadDB();
  const s = adminStats();
  
  const recentConcours = [...db.competitions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  
  // Évolution réelle : concours par mois de publication (depuis les vraies données)
  const monthStats = competitionsByMonth();
  const lineData = monthStats.map((m) => ({ name: m.label, concours: m.count }));

  // Donut chart data based on categories (vraies données, sans fallback fictif)
  const pieData = [
    { name: 'Ministères', value: db.competitions.filter(c => c.category === 'MINISTERE').length },
    { name: 'Écoles', value: db.competitions.filter(c => c.category === 'ECOLE').length },
    { name: 'Universités', value: db.competitions.filter(c => c.category === 'UNIVERSITE').length },
    { name: 'Autres', value: db.competitions.filter(c => c.category === 'RECRUTEMENT' || c.category === 'AUTRE' || c.category === 'FORMATION' || c.category === 'INSTITUTION').length },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      
      {/* 1. HERO ADMIN & CARTE ROYAUME */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* HERO */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#0B2A4A] text-white shadow-lg">
          <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
            <img 
              src="/images/hero-morocco.jpg" 
              alt="Maroc" 
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative z-10 p-8 sm:p-10 flex flex-col h-full justify-center">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 mb-4 w-max border border-white/20 backdrop-blur-md">
              <span className="text-[13px] font-semibold text-white">Bonjour Admin 👋</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Bienvenue sur l’administration<br/>de Concours Maroc
            </h1>
            <p className="mt-4 max-w-xl text-[15px] text-sky-100 leading-relaxed">
              Gérez les concours, écoles, ministères, examens et tous les contenus de la plateforme en toute simplicité. Suivez l'évolution et validez les nouvelles publications.
            </p>
          </div>
        </div>

        {/* CARTE INSTITUTIONNELLE */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E6ECF3] p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-transparent pointer-events-none"></div>
          <img 
            src="/assets/logos/ministries/royaume-maroc.svg" 
            alt="Royaume du Maroc" 
            className="h-20 w-auto mb-4 relative z-10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h2 className="text-lg font-extrabold text-[#0B2A4A] relative z-10 uppercase tracking-wide">Royaume du Maroc</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1 relative z-10">Éducation · Formation · Avenir</p>
          
          <div className="mt-6 pt-6 border-t border-slate-100 relative z-10 w-full">
            <p className="text-[14px] italic text-slate-600 leading-relaxed font-medium">
              « Les concours sont des passerelles<br/>vers un avenir meilleur »
            </p>
          </div>
        </div>
      </div>

      {/* 2. CARTES STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget icon={<Trophy className="text-[#0B63CE]"/>} title="Concours" value={s.totalConcours} trend="+12%" bg="bg-sky-50" />
        <StatWidget icon={<GraduationCap className="text-emerald-600"/>} title="Écoles" value={s.ecoles} trend="+8%" bg="bg-emerald-50" />
        <StatWidget icon={<Landmark className="text-violet-600"/>} title="Ministères" value={s.ministeres} trend="+6%" bg="bg-violet-50" />
        <StatWidget icon={<FileText className="text-orange-600"/>} title="Examens" value={s.examens} trend="+15%" bg="bg-orange-50" />
      </div>

      {/* 3. GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINE CHART */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Évolution des concours</h2>
            <p className="text-sm text-slate-500">Nouveaux concours sur les 7 derniers jours</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#0B2A4A', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="concours" stroke="#0B63CE" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#0B63CE', strokeWidth: 2, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONUT CHART */}
        <div className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6 flex flex-col">
          <div className="mb-2">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Répartition par ministère</h2>
            <p className="text-sm text-slate-500">Volume de concours par entité</p>
          </div>
          <div className="flex-1 h-48 w-full relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-[#0B2A4A]">{db.competitions.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. ACTIONS RAPIDES & STATS GLOBALES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ACTIONS RAPIDES */}
        <div className="lg:col-span-3 rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6">
          <h2 className="text-base font-extrabold text-[#0B2A4A] mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction to="/admin/concours" icon={<Trophy className="h-5 w-5"/>} label="Ajouter un concours" color="bg-sky-50 text-[#0B63CE] hover:bg-[#0B63CE] hover:text-white border-sky-100" />
            <QuickAction to="/admin/ecoles" icon={<GraduationCap className="h-5 w-5"/>} label="Ajouter une école" color="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100" />
            <QuickAction to="/admin/ministeres" icon={<Landmark className="h-5 w-5"/>} label="Ajouter un ministère" color="bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white border-violet-100" />
            <QuickAction to="/admin/examens" icon={<FileText className="h-5 w-5"/>} label="Ajouter un examen" color="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border-orange-100" />
          </div>
        </div>

        {/* STATISTIQUES GLOBALES */}
        <div className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6">
          <h2 className="text-base font-extrabold text-[#0B2A4A] mb-4">Statistiques globales</h2>
          <div className="space-y-4">
            <GlobalStatRow label="Total utilisateurs" value={s.users} trend="+18%" />
            <GlobalStatRow label="Concours publiés" value={s.totalConcours} trend="+12%" />
            <GlobalStatRow label="Écoles enregistrées" value={s.ecoles} trend="+8%" />
            <GlobalStatRow label="Ministères" value={s.ministeres} trend="+6%" />
          </div>
        </div>
      </div>

      {/* 5. DERNIERS CONCOURS & ACTIVITÉ RÉCENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DERNIERS CONCOURS TABLE */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Derniers concours ajoutés</h2>
            <Link to="/admin/concours" className="text-sm font-bold text-[#0B63CE] hover:underline">
              Voir tous &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Titre</th>
                  <th className="px-6 py-4">Organisme</th>
                  <th className="px-6 py-4">Date limite</th>
                  <th className="px-6 py-4 rounded-tr-lg">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentConcours.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#0B2A4A] max-w-[200px] truncate" title={c.title}>
                      {c.title}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[150px] truncate">
                      {c.organizationName || 'Non spécifié'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('fr-MA') : 'Aucune'}
                    </td>
                    <td className="px-6 py-4">
                      {c.publishStatus === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <CheckCircle2 className="h-3 w-3" /> Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          <AlertCircle className="h-3 w-3" /> Brouillon
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentConcours.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Aucun concours récent.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITÉ RÉCENTE */}
        <div className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Activité récente</h2>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-slate-100">
              
              <ActivityItem 
                icon={<Trophy className="h-3.5 w-3.5 text-[#0B63CE]" />} 
                bg="bg-sky-100 ring-white"
                title="Nouveau concours ajouté"
                desc="Ministère de l'Éducation Nationale"
                time="Il y a 2 min"
              />
              <ActivityItem 
                icon={<GraduationCap className="h-3.5 w-3.5 text-emerald-600" />} 
                bg="bg-emerald-100 ring-white"
                title="École ajoutée"
                desc="ENSA Oujda"
                time="Il y a 12 min"
              />
              <ActivityItem 
                icon={<Landmark className="h-3.5 w-3.5 text-violet-600" />} 
                bg="bg-violet-100 ring-white"
                title="Ministère modifié"
                desc="Ministère de la Santé"
                time="Il y a 25 min"
              />
              <ActivityItem 
                icon={<FileText className="h-3.5 w-3.5 text-orange-600" />} 
                bg="bg-orange-100 ring-white"
                title="Document ajouté"
                desc="Règlement du concours"
                time="Il y a 1 h"
              />
              <ActivityItem 
                icon={<Users className="h-3.5 w-3.5 text-slate-600" />} 
                bg="bg-slate-100 ring-white"
                title="Utilisateur inscrit"
                desc="Nouvel administrateur"
                time="Il y a 2 h"
              />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composants de sous-interface
function StatWidget({ icon, title, value, trend, bg }: { icon: React.ReactNode, title: string, value: number, trend: string, bg: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E6ECF3] p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-5-5-5 5-5-5"/><path d="m21 21v-5h-5"/></svg>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-[#0B2A4A]">{value}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <span className="text-[10px] font-bold uppercase text-slate-400">Ce mois</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label, color }: { to: string, icon: React.ReactNode, label: string, color: string }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-all ${color}`}>
      <div className="rounded-full bg-white/40 p-2 backdrop-blur-sm">
        {icon}
      </div>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}

function GlobalStatRow({ label, value, trend }: { label: string, value: number, trend: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold text-[#0B2A4A]">{value}</span>
        <span className="text-xs font-bold text-emerald-600">{trend}</span>
      </div>
    </div>
  );
}

function ActivityItem({ icon, bg, title, desc, time }: { icon: React.ReactNode, bg: string, title: string, desc: string, time: string }) {
  return (
    <div className="relative pl-8">
      <div className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 z-10 ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-bold text-[#0B2A4A]">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-600">{desc}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <Clock className="h-3 w-3" />
          {time}
        </p>
      </div>
    </div>
  );
}
