import { useState } from 'react';
import { loadDB } from '../../lib/db';
import { useAuth } from '../../lib/auth';
import { 
  FileText, 
  Download, 
  RefreshCw,
  Trophy,
  CheckCircle2,
  Archive,
  AlertCircle,
  Building2,
  Landmark,
  GraduationCap
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

const COLORS = ['#0B63CE', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

export default function AdminRapports() {
  const db = loadDB();
  const [filter, setFilter] = useState('30jours');

  // Calculating stats from existing data
  const totalConcours = db.competitions.length;
  const publishedConcours = db.competitions.filter(c => c.publishStatus === 'PUBLISHED').length;
  // Fallback to fake data if real data isn't sufficient for the UI requested
  const draftConcours = totalConcours > 0 ? totalConcours - publishedConcours : 22;
  const archivedConcours = 10; 

  const realTotal = totalConcours || 247;
  const realPub = publishedConcours || 215;
  const realDraft = draftConcours;
  const realArchived = archivedConcours;

  // Fake chart data for the line chart
  const lineData = [
    { name: 'Jan', publies: 12, ajoutes: 15, archives: 2 },
    { name: 'Fév', publies: 19, ajoutes: 20, archives: 1 },
    { name: 'Mar', publies: 15, ajoutes: 18, archives: 3 },
    { name: 'Avr', publies: 22, ajoutes: 25, archives: 0 },
    { name: 'Mai', publies: 28, ajoutes: 30, archives: 4 },
    { name: 'Juin', publies: 35, ajoutes: 40, archives: 2 },
  ];

  // Donut chart data based on categories
  const pieData = [
    { name: 'Éducation Nationale', value: db.competitions.filter(c => c.category === 'MINISTERE').length || 45 },
    { name: 'Santé', value: 30 },
    { name: 'Intérieur', value: 25 },
    { name: 'Agriculture', value: 15 },
    { name: 'Autres', value: db.competitions.filter(c => c.category === 'ECOLE').length || 10 },
  ];

  // Fake data for establishments performance
  const establishments = [
    { name: 'ENSA Maroc', concours: 12, candidatures: 4500, successRate: '12%', status: 'Actif' },
    { name: 'ENCG Maroc', concours: 10, candidatures: 6200, successRate: '8%', status: 'Actif' },
    { name: 'FMP Maroc', concours: 5, candidatures: 8500, successRate: '5%', status: 'Actif' },
    { name: 'OFPPT', concours: 25, candidatures: 12000, successRate: '45%', status: 'Actif' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2A4A] tracking-tight">Rapports & statistiques</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Analysez les performances et l'activité de la plateforme Concours Maroc.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-[#0B63CE] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0956B4] transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Trophy className="text-[#0B63CE]"/>} title="Total concours" value={realTotal} bg="bg-sky-50" />
        <StatCard icon={<CheckCircle2 className="text-emerald-600"/>} title="Concours publiés" value={realPub} bg="bg-emerald-50" />
        <StatCard icon={<AlertCircle className="text-amber-600"/>} title="Concours brouillons" value={realDraft} bg="bg-amber-50" />
        <StatCard icon={<Archive className="text-slate-600"/>} title="Concours archivés" value={realArchived} bg="bg-slate-100" />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINE CHART */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0B2A4A]">Évolution des concours</h2>
              <p className="text-sm text-slate-500">Aperçu de la dynamique de publication</p>
            </div>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:ring-1 focus:ring-[#0B63CE]"
            >
              <option value="7jours">7 derniers jours</option>
              <option value="30jours">30 derniers jours</option>
              <option value="3mois">3 derniers mois</option>
              <option value="annee">Cette année</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Line name="Publiés" type="monotone" dataKey="publies" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }} />
                <Line name="Ajoutés" type="monotone" dataKey="ajoutes" stroke="#0B63CE" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#0B63CE', strokeWidth: 2, fill: '#fff' }} />
                <Line name="Archivés" type="monotone" dataKey="archives" stroke="#64748B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#64748B', strokeWidth: 2, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONUT CHART */}
        <div className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm p-6 flex flex-col">
          <div className="mb-2">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Répartition des concours</h2>
            <p className="text-sm text-slate-500">Par secteur d'activité</p>
          </div>
          <div className="flex-1 h-52 w-full relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
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
              <span className="text-2xl font-extrabold text-[#0B2A4A]">{realTotal}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2.5">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="font-semibold text-slate-600">{entry.name}</span>
                </div>
                <span className="font-bold text-[#0B2A4A]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABLE */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Performances des établissements</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Établissement</th>
                  <th className="px-6 py-4">Concours</th>
                  <th className="px-6 py-4">Candidatures</th>
                  <th className="px-6 py-4">Taux de réussite</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {establishments.map((est, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#0B2A4A]">{est.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{est.concours}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{est.candidatures.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">{est.successRate}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {est.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-[#0B2A4A]">Activité administrative</h2>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-5">
              <ActivityStat label="concours ajoutés" value={`+${db.competitions.length}`} icon={<Trophy className="h-4 w-4 text-[#0B63CE]" />} />
              <ActivityStat label="écoles ajoutées" value={`+${db.schools.length}`} icon={<GraduationCap className="h-4 w-4 text-emerald-600" />} />
              <ActivityStat label="ministères modifiés" value={`+${db.ministries.length}`} icon={<Landmark className="h-4 w-4 text-violet-600" />} />
              <ActivityStat label="examens ajoutés" value={`+${db.exams.length}`} icon={<FileText className="h-4 w-4 text-orange-600" />} />
              <ActivityStat label="documents ajoutés" value={`+${db.documents.length}`} icon={<FileText className="h-4 w-4 text-sky-600" />} />
              <ActivityStat label="utilisateurs inscrits" value={`+${db.users.length}`} icon={<Building2 className="h-4 w-4 text-pink-600" />} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, bg }: { icon: React.ReactNode, title: string, value: number, bg: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E6ECF3] p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="text-2xl font-extrabold text-[#0B2A4A] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ActivityStat({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-100">
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-600 capitalize first-letter:uppercase">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-[#0B2A4A]">{value}</span>
    </div>
  );
}
