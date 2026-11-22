// ============================================================
// CONCOURS MAROC — Admin : page « Import direct de fichier »
//
// Point d'entrée neutre pour importer des CONCOURS ou des MASTERS
// depuis un fichier local (JSON / CSV / XLSX / XLS).
// Aucun AI / LLM / agent n'est impliqué.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, GraduationCap, ShieldCheck, Trophy } from 'lucide-react';
import AdminDirectImportModal from '../../components/AdminDirectImportModal';
import { Button } from '../../components/ui';
import { AdminHeader } from './shared';
import type { ImportEntity } from '../../lib/import';

const CARDS: {
  entity: ImportEntity;
  title: string;
  description: string;
  icon: typeof Trophy;
  accent: string;
}[] = [
  {
    entity: 'CONCOURS',
    title: 'Concours',
    description:
      'Importez des concours depuis un fichier. L’organisme est résolu automatiquement ; les références non résolues sont signalées pour vérification, jamais inventées.',
    icon: Trophy,
    accent: 'bg-sky-50 text-[#0B63CE]',
  },
  {
    entity: 'MASTERS',
    title: 'Masters universitaires',
    description:
      'Importez des masters universitaires. Les identifiants sont dérivés de l’université, l’établissement, l’intitulé et l’année : réimporter le même fichier ne crée aucun doublon.',
    icon: GraduationCap,
    accent: 'bg-violet-50 text-violet-700',
  },
];

export default function AdminDirectImport() {
  const [entity, setEntity] = useState<ImportEntity | null>(null);

  return (
    <div>
      <AdminHeader
        title="Import direct de fichier"
        subtitle="Workflow recommandé : analyse locale, aperçu détaillé, puis confirmation. Aucune intelligence artificielle, aucun service externe."
      />

      <div className="mb-6 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          L’analyse du fichier se fait entièrement dans votre navigateur. Aucune donnée n’est envoyée avant votre
          confirmation. Un enregistrement déjà présent est toujours marqué <strong>doublon</strong> et ignoré : en v1,
          aucun import ne modifie une fiche existante.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.entity}
              onClick={() => setEntity(card.entity)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#0B63CE] hover:shadow-md"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-base font-extrabold text-[#0B2A4A]">{card.title}</span>
              <span className="text-sm text-slate-600">{card.description}</span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-[#0B63CE]">
                <FileSpreadsheet className="h-4 w-4" />
                Choisir un fichier
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-[#0B2A4A]">Ancien import JSON</h2>
        <p className="mt-1 text-sm text-slate-600">
          L’import par collage de JSON historique reste disponible depuis la page Concours. Il est conservé tel quel
          comme workflow secondaire.
        </p>
        <div className="mt-3">
          <Link to="/admin/concours">
            <Button variant="outline">Ouvrir la gestion des concours</Button>
          </Link>
        </div>
      </div>

      {entity && (
        <AdminDirectImportModal
          open
          onClose={() => setEntity(null)}
          defaultEntity={entity}
          allowEntitySwitch={false}
        />
      )}
    </div>
  );
}
