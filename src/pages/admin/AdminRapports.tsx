import { useState, useEffect } from 'react';
import { AdminHeader } from './shared';
import { Card, Button, Input, Select } from '../../components/ui';
import { loadDB, adminStats } from '../../lib/db';

import { Download, FileText, Filter, RefreshCw, Clock, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../components/ui';
import { Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../lib/auth';

interface ExportLog {
  id: string;
  type: string;
  format: string;
  date: string;
  rows: number;
  user: string;
  filters: string;
}

export default function AdminRapports() {
  const db = loadDB();
  const s = adminStats();
  const toast = useToast();
  const { user } = useAuth();

  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const saved = localStorage.getItem('cm_export_logs');
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const addLog = (type: string, format: string, rows: number, filters: string) => {
    const newLog: ExportLog = {
      id: Date.now().toString(),
      type,
      format,
      date: new Date().toISOString(),
      rows,
      user: user ? `${user.firstName} ${user.lastName}` : 'Admin',
      filters
    };
    const newLogs = [newLog, ...logs].slice(0, 50); // Keep last 50
    setLogs(newLogs);
    localStorage.setItem('cm_export_logs', JSON.stringify(newLogs));
  };

  const getFilteredCompetitions = () => {
    return db.competitions.filter(c => {
      const matchSearch = !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.organizationName && c.organizationName.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === 'ALL' || c.organizationType === typeFilter;
      const matchStatus = statusFilter === 'ALL' || c.publishStatus === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  };

  const filteredCompetitions = getFilteredCompetitions();

  const handleExportGlobalExcel = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();

        // --- SHEET 1: Résumé ---
        const summaryData = [
          ['CONCOURS MAROC - RAPPORT GLOBAL'],
          ['Date de génération', new Date().toLocaleDateString('fr-FR')],
          ['Généré par', user ? `${user.firstName} ${user.lastName}` : 'Admin'],
          [],
          ['STATISTIQUES GLOBALES'],
          ['Total Concours', db.competitions.length],
          ['Concours Publiés', db.competitions.filter(c => c.publishStatus === 'PUBLISHED').length],
          ['Total Écoles', db.schools.length],
          ['Total Universités', db.universities.length],
          ['Total Ministères', db.ministries.length],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

        // --- SHEET 2: Concours ---
        const wsConcoursData = db.competitions.map(c => ({
          ID: c.id,
          Titre: c.title,
          Description: c.description || '',
          Organisme: c.organizationName,
          Institution_ID: c.schoolId || c.universityId || '',
          Ministère_ID: c.ministryId || '',
          Type: c.organizationType,
          Catégorie: c.category,
          Niveau: c.level || '',
          Places: c.places || 0,
          Statut: c.publishStatus,
          Ville: c.city,
          Région: c.region,
          'Année': c.year || '',
          'Date de limite': c.registrationDeadline || '',
          'Date du concours': c.competitionDate || '',
          'Date de publication': c.publishedAt ? new Date(c.publishedAt).toLocaleDateString('fr-FR') : '',
          'Date de création': new Date(c.createdAt).toLocaleDateString('fr-FR'),
          'Date de mise à jour': new Date(c.updatedAt).toLocaleDateString('fr-FR'),
          Lien_Officiel: c.officialWebsite || '',
          Conditions: c.conditions?.join(' ; ') || '',
          Documents: c.documentsDemandes?.join(' ; ') || '',
          Épreuves: c.epreuves?.join(' ; ') || ''
        }));
        const wsConcours = XLSX.utils.json_to_sheet(wsConcoursData);
        XLSX.utils.book_append_sheet(wb, wsConcours, 'Concours');

        // --- SHEET 3: Institutions ---
        const wsInstitutionsData = [
          ...db.schools.map(s => ({
            ID: s.id,
            Nom: s.name,
            'Nom court': s.shortName,
            Type: 'École',
            Ministère_ID: s.ministryId || '',
            Université_ID: s.universityId || '',
            Description: s.description || '',
            Ville: s.city,
            Région: s.region,
            Adresse: s.address || '',
            Site_Web: s.website || '',
            Email: s.email || '',
            Téléphone: s.phone || '',
            Actif: s.isActive !== false ? 'Oui' : 'Non',
            'Date de création': s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : '',
            'Date de mise à jour': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('fr-FR') : ''
          })),
          ...db.universities.map(u => ({
            ID: u.id,
            Nom: u.name,
            'Nom court': u.shortName,
            Type: 'Université',
            Ministère_ID: u.ministryId || '',
            Université_ID: '',
            Description: u.description || '',
            Ville: u.city,
            Région: u.region,
            Adresse: '',
            Site_Web: u.website || '',
            Email: '',
            Téléphone: '',
            Actif: u.isActive !== false ? 'Oui' : 'Non',
            'Date de création': u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '',
            'Date de mise à jour': u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('fr-FR') : ''
          }))
        ];
        const wsInstitutions = XLSX.utils.json_to_sheet(wsInstitutionsData);
        XLSX.utils.book_append_sheet(wb, wsInstitutions, 'Institutions');

        // --- SHEET 4: Ministères ---
        const wsMinistriesData = db.ministries.map(m => ({
          ID: m.id,
          Nom: m.name,
          'Nom court': m.shortName,
          Description: m.description || '',
          Statut: m.status,
          Site_Web: m.website || '',
          Téléphone: '',
          Email: '',
          Actif: m.isActive !== false ? 'Oui' : 'Non',
          'Date de création': m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '',
          'Date de mise à jour': m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('fr-FR') : ''
        }));
        const wsMinistries = XLSX.utils.json_to_sheet(wsMinistriesData);
        XLSX.utils.book_append_sheet(wb, wsMinistries, 'Ministères');


        // --- SHEET 5: Statistiques ---
        const wsStatsData = [
          ['STATISTIQUES DES CONCOURS'],
          ['Par Statut'],
          ['Publiés', db.competitions.filter(c => c.publishStatus === 'PUBLISHED').length],
          ['Brouillons', db.competitions.filter(c => c.publishStatus === 'DRAFT').length],
          [],
          ['Par Type d\'organisation'],
          ['Écoles', db.competitions.filter(c => c.organizationType === 'ECOLE').length],
          ['Institutions', db.competitions.filter(c => c.organizationType === 'INSTITUTION').length],
          ['Ministères', db.competitions.filter(c => c.organizationType === 'MINISTERE').length]
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(wsStatsData);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiques');

        // --- SHEET 6: Liens ---
        const wsLinksData = db.competitions
          .filter(c => c.officialWebsite || c.sourceUrl)
          .map(c => ({
            ID: c.id,
            Titre: c.title,
            Lien_Officiel: c.officialWebsite || '',
            Lien_Source: c.sourceUrl || ''
          }));
        const wsLinks = XLSX.utils.json_to_sheet(wsLinksData);
        XLSX.utils.book_append_sheet(wb, wsLinks, 'Liens');

        // Export
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `concours-maroc-rapport-global-${dateStr}.xlsx`);

        addLog('Global complet', 'Excel', db.competitions.length + db.schools.length + db.universities.length + db.ministries.length, 'Aucun');
        toast.toast('Export Excel généré avec succès', 'success');
      } catch (err) {
        console.error(err);
        toast.toast('Erreur lors de la génération de l\'export', 'error');
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleExportFilteredPDF = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF('landscape');

        // Cover Page
        doc.setFontSize(22);
        doc.setTextColor(11, 42, 74);
        doc.text("CONCOURS MAROC", 148, 80, { align: 'center' });
        doc.setFontSize(16);
        doc.text("Rapport Administrateur Filtré", 148, 95, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Date de génération : ${new Date().toLocaleDateString('fr-FR')}`, 148, 115, { align: 'center' });
        doc.text(`Filtres : Recherche="${search}", Type="${typeFilter}", Statut="${statusFilter}"`, 148, 125, { align: 'center' });
        doc.text(`Total : ${filteredCompetitions.length} concours`, 148, 135, { align: 'center' });

        doc.addPage();

        // Table
        doc.setFontSize(14);
        doc.setTextColor(11, 42, 74);
        doc.text("Liste des Concours", 14, 20);

        const tableColumn = ["ID", "Titre", "Organisme", "Type", "Ville", "Statut", "Date limite"];
        const tableRows = filteredCompetitions.map(c => [
          c.id.substring(0, 8),
          c.title.replace(/œ/g, "oe").replace(/Œ/g, "OE"),
          (c.organizationName || 'N/A').replace(/œ/g, "oe").replace(/Œ/g, "OE"),
          c.organizationType,
          c.city || 'N/A',
          c.publishStatus,
          c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('fr-FR') : 'N/A'
        ]);

        autoTable(doc, {
          startY: 30,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [11, 99, 206] },
          styles: { fontSize: 8 }
        });

        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`concours-filtres-${dateStr}.pdf`);

        addLog('Concours Filtrés', 'PDF', filteredCompetitions.length, `Type:${typeFilter}, Statut:${statusFilter}`);
        toast.toast('Export PDF généré avec succès', 'success');
      } catch (err) {
        console.error(err);
        toast.toast('Erreur lors de la génération du PDF', 'error');
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleExportFilteredExcel = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        const wsData = filteredCompetitions.map(c => ({
          ID: c.id,
          Titre: c.title,
          Organisme: c.organizationName,
          Type: c.organizationType,
          Catégorie: c.category,
          Statut: c.publishStatus,
          Ville: c.city,
          Région: c.region,
          'Date de limite': c.registrationDeadline || '',
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Concours Filtrés');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `concours-filtres-${dateStr}.xlsx`);

        addLog('Concours Filtrés', 'Excel', filteredCompetitions.length, `Type:${typeFilter}, Statut:${statusFilter}`);
        toast.toast('Export Excel généré avec succès', 'success');
      } catch (err) {
        console.error(err);
        toast.toast('Erreur lors de la génération', 'error');
      } finally {
        setLoading(false);
      }
    }, 500);
  };


  const COLORS = ['#0B63CE', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];
  const pieData = [
    { name: 'Publiés', value: db.competitions.filter(c => c.publishStatus === 'PUBLISHED').length },
    { name: 'Brouillons', value: db.competitions.filter(c => c.publishStatus === 'DRAFT').length },
  ];

  return (
    <div className="pb-10">
      <AdminHeader
        title="Rapports & Exports"
        subtitle="Générez des rapports complets sur les concours, établissements et ministères."
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Concours" value={s.totalConcours.toString()} icon={<TrophyIcon className="text-sky-600" />} />
        <StatCard title="Institutions" value={(s.ecoles + s.universites).toString()} icon={<BuildingIcon className="text-emerald-600" />} />
        <StatCard title="Ministères" value={s.ministeres.toString()} icon={<LandmarkIcon className="text-violet-600" />} />
        <StatCard title="Filtres Actifs" value={filteredCompetitions.length.toString()} icon={<Filter className="text-amber-600" />} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="lg:w-2/3 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-base font-bold text-[#0B2A4A]">Filtres et Génération de rapport</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter('ALL'); setStatusFilter('ALL'); }}>
                  Réinitialiser
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[13px] font-bold text-slate-700 mb-1 block">Recherche</label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titre, organisme..." />
              </div>
              <div>
                <label className="text-[13px] font-bold text-slate-700 mb-1 block">Type d'organisme</label>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="ALL">Tous les types</option>
                  <option value="ECOLE">École</option>
                  <option value="INSTITUTION">Institution/Université</option>
                  <option value="MINISTERE">Ministère</option>

                </Select>
              </div>
              <div>
                <label className="text-[13px] font-bold text-slate-700 mb-1 block">Statut</label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">Tous les statuts</option>
                  <option value="PUBLISHED">Publié</option>
                  <option value="DRAFT">Brouillon</option>
                </Select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Aperçu : {filteredCompetitions.length} concours correspondants
                  </p>
                  <p className="text-xs text-slate-500">
                    Exportez ces résultats spécifiques ou téléchargez toutes les données.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportFilteredExcel} disabled={loading || filteredCompetitions.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                  </Button>
                  <Button variant="outline" onClick={handleExportFilteredPDF} disabled={loading || filteredCompetitions.length === 0}>
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="mt-4 border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date limite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompetitions.slice(0, 5).map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.id.substring(0, 6)}</td>
                        <td className="px-4 py-2 font-semibold text-[#0B2A4A] max-w-[200px] truncate">{c.title}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.publishStatus === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {c.publishStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('fr-FR') : '-'}</td>
                      </tr>
                    ))}
                    {filteredCompetitions.length > 5 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-center text-xs text-slate-500 font-medium bg-slate-50/50">
                          + {filteredCompetitions.length - 5} autres concours masqués dans l'aperçu
                        </td>
                      </tr>
                    )}
                    {filteredCompetitions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun résultat.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:w-1/3 space-y-6">
          <Card className="p-6 bg-gradient-to-br from-[#0B2A4A] to-[#0B63CE] text-white border-none shadow-lg">
            <h2 className="text-lg font-extrabold mb-2">Export Base de données</h2>
            <p className="text-sky-100 text-sm mb-6 leading-relaxed">
              Téléchargez l'intégralité des données de la plateforme (Concours, Écoles, Universités, Ministères) dans un fichier Excel multi-feuilles propre.
            </p>
            <Button onClick={handleExportGlobalExcel} disabled={loading} className="w-full justify-center bg-white text-[#0B63CE] hover:bg-sky-50">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              EXPORTER TOUTES LES DONNÉES
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-[#0B2A4A] mb-4">Statuts Globaux</h2>
            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-bold text-[#0B2A4A] mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-400" />
          Historique des exports
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Lignes</th>
                <th className="px-4 py-3">Filtres</th>
                <th className="px-4 py-3">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">{new Date(l.date).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 font-semibold text-[#0B2A4A]">{l.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.format === 'Excel' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {l.format}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.rows}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{l.filters}</td>
                  <td className="px-4 py-3 text-slate-600">{l.user}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Aucun export n'a été généré récemment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#0B2A4A] leading-none mb-1">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      </div>
    </Card>
  );
}

// Simple icons
function TrophyIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
}
function BuildingIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
}
function LandmarkIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg>;
}
