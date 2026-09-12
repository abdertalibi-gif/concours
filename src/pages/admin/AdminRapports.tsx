import { AdminHeader } from './shared';
import { Card, Button } from '../../components/ui';
import { loadDB, adminStats } from '../../lib/db';
import { Download, FileText, Table } from 'lucide-react';
import { useToast } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function AdminRapports() {
  const db = loadDB();
  const s = adminStats();
  const toast = useToast();

  const handleExportCSV = () => {
    // Generate CSV for competitions
    const headers = ['ID', 'Titre', 'Organisme', 'Statut', 'Date Limite'];
    const rows = db.competitions.map(c => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.organizationName?.replace(/"/g, '""') || ''}"`,
      c.publishStatus,
      c.registrationDeadline || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `concours_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.toast('Le fichier a été téléchargé avec succès.', 'success');
  };

  const handleExportPDF = () => {
    // We just simulate the PDF generation since we don't have a PDF library installed, 
    // or we can just print the page
    window.print();
    toast.toast('Veuillez utiliser l\'imprimante virtuelle pour sauvegarder en PDF.', 'success');
  };

  const barData = [
    { name: 'Concours', count: s.totalConcours },
    { name: 'Écoles', count: s.ecoles },
    { name: 'Universités', count: s.universites },
    { name: 'Ministères', count: s.ministeres },
    { name: 'Examens', count: s.examens },
  ];

  return (
    <div>
      <AdminHeader
        title="Rapports et Analyses"
        subtitle="Exportez et analysez les données de la plateforme."
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B2A4A]">Export des Concours</h2>
              <p className="text-xs text-slate-500">Format CSV (Excel)</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Téléchargez l'intégralité des concours publiés et en brouillon pour analyse dans Excel.
          </p>
          <Button onClick={handleExportCSV} className="w-full justify-center">
            <Download className="mr-2 h-4 w-4" /> Télécharger CSV
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B2A4A]">Rapport d'activité</h2>
              <p className="text-xs text-slate-500">Format PDF</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Générez un rapport imprimable contenant les statistiques globales de la plateforme.
          </p>
          <Button onClick={handleExportPDF} variant="outline" className="w-full justify-center">
            <Download className="mr-2 h-4 w-4" /> Imprimer / Sauvegarder PDF
          </Button>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-bold text-[#0B2A4A] mb-6">Aperçu du contenu global</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#0B63CE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
