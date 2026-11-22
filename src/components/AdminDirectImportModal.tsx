// ============================================================
// CONCOURS MAROC — Admin Direct File Import (workflow principal)
//
// SELECT -> PARSE -> VALIDATE -> PREVIEW -> CONFIRM -> IMPORT -> REPORT
//
// Caractéristiques contractuelles :
//  - 100% local : File.text() / File.arrayBuffer() + xlsx déjà installé.
//  - AUCUN AI / LLM / agent : ni appel réseau d'analyse, ni import
//    de client IA. Le seul appel réseau est l'écriture confirmée
//    POST /api/masters/bulk.
//  - Le preview est strictement read-only (buildPreview ne reçoit
//    les référentiels que par arguments).
//  - Aucune écriture avant le clic « Confirmer l'import ».
//  - Un enregistrement existant => DUPLICATE, toujours ignoré.
//    Aucun auto-update en v1.
//  - v1 : CONCOURS et MASTERS uniquement.
// ============================================================

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileUp, ShieldCheck, UploadCloud } from 'lucide-react';
import { Alert, Button, Modal, Select, useToast } from './ui';
import { loadDB, adminBulkCreateConcours, BulkImportValidationError } from '../lib/db';
import { getCachedMasters } from '../lib/mastersAdapter';
import {
  buildPreview,
  readFileToTable,
  toCompetitionPayload,
  toMasterImportPayload,
  type ImportEntity,
  type ImportPreview,
  type ImportRow,
  type ImportSummary,
  type RowStatus,
} from '../lib/import';

type Step = 'SELECT' | 'MAPPING' | 'VALIDATION' | 'CONFIRM' | 'REPORT';

const STEPS: { id: Step; label: string }[] = [
  { id: 'SELECT', label: 'Fichier' },
  { id: 'MAPPING', label: 'Mapping' },
  { id: 'VALIDATION', label: 'Validation' },
  { id: 'CONFIRM', label: 'Confirmation' },
  { id: 'REPORT', label: 'Rapport' },
];

const STATUS_STYLE: Record<RowStatus, string> = {
  OK: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REVIEW: 'bg-amber-50 text-amber-800 ring-amber-200',
  ERROR: 'bg-red-50 text-red-700 ring-red-200',
  DUPLICATE: 'bg-slate-100 text-slate-600 ring-slate-200',
  DUPLICATE_IN_FILE: 'bg-orange-50 text-orange-800 ring-orange-200',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  OK: 'Prêt',
  REVIEW: 'À vérifier',
  ERROR: 'Erreur',
  DUPLICATE: 'Doublon existant',
  DUPLICATE_IN_FILE: 'Doublon dans le fichier',
};

export interface AdminDirectImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Entité présélectionnée lorsqu'on ouvre depuis une page dédiée. */
  defaultEntity?: ImportEntity;
  /** L'admin peut-il changer d'entité ? (false depuis /admin/concours) */
  allowEntitySwitch?: boolean;
  /** Rafraîchit la page hôte après un import réussi (ex: recharger /api/masters). */
  onCommitted?: () => void | Promise<void>;
}

export default function AdminDirectImportModal({
  open,
  onClose,
  defaultEntity = 'CONCOURS',
  allowEntitySwitch = true,
  onCommitted,
}: AdminDirectImportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('SELECT');
  const [entity, setEntity] = useState<ImportEntity>(defaultEntity);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());
  const [filter, setFilter] = useState<RowStatus | 'ALL'>('ALL');

  const reset = useCallback(() => {
    setStep('SELECT');
    setPreview(null);
    setError(null);
    setBusy(false);
    setProgress(null);
    setSummary(null);
    setExcluded(new Set());
    setFilter('ALL');
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Références existantes, lues au moment du parsing uniquement.
  const collectRefs = useCallback(() => {
    const db = loadDB();
    return {
      competitions: db.competitions,
      masters: getCachedMasters(),
      schools: db.schools || [],
      ministries: db.ministries || [],
      universities: db.universities || [],
    };
  }, []);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setBusy(true);
      try {
        const { table, format } = await readFileToTable(file, entity);
        const built = buildPreview({
          entity,
          table,
          fileName: file.name,
          format,
          refs: collectRefs(),
        });
        setPreview(built);
        setExcluded(
          new Set(built.rows.filter((r) => !(r.status === 'OK' || r.status === 'REVIEW')).map((r) => r.index)),
        );
        setStep('MAPPING');
      } catch (err) {
        setError((err as Error).message);
        setPreview(null);
      } finally {
        setBusy(false);
      }
    },
    [entity, collectRefs],
  );

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => filter === 'ALL' || r.status === filter);
  }, [preview, filter]);

  const confirmedRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => r.status !== 'ERROR' && !excluded.has(r.index));
  }, [preview, excluded]);

  const toggleRow = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /**
   * Reconstruction du payload au moment du commit uniquement.
   * La résolution d'organisme est celle DÉJÀ validée lors du preview :
   * on ne re-résout rien et on n'invente jamais de valeur.
   */
  const buildPayloads = () => {
    if (!preview) return [];
    return confirmedRows.map((row) =>
      entity === 'CONCOURS'
        ? toCompetitionPayload(row.data, row.resolution ?? null)
        : toMasterImportPayload(row.data),
    );
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    setStep('CONFIRM');
    try {
      const payloads = buildPayloads();
      let imported = 0;
      let duplicates = 0;
      const details: string[] = [];

      if (entity === 'CONCOURS') {
        setProgress('Concours : écriture en cours…');
        const result = adminBulkCreateConcours(payloads as never);
        imported = result.imported;
        duplicates = result.duplicates;
        details.push(...result.details);
        setProgress('Concours : synchronisation Supabase…');
      } else {
        setProgress('Masters : envoi vers /api/masters/bulk…');
        const res = await fetch('/api/masters/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payloads }),
        });
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        if (!res.ok) {
          throw new Error(
            (data.error as string) ??
              `Le serveur a refusé l'import (HTTP ${res.status}). Aucune écriture effectuée.`,
          );
        }
        imported = Number(data.imported ?? 0);
        duplicates = Number(data.duplicates ?? 0);
        if (Array.isArray(data.details)) details.push(...(data.details as string[]));
        setProgress('Masters : cache local rafraîchi…');
      }

      setSummary({
        imported,
        duplicates,
        review: preview.counts.REVIEW,
        errors: preview.counts.ERROR,
        details,
      });
      setProgress(null);
      setStep('REPORT');
      toast(`Import terminé : ${imported} enregistrement(s) ajouté(s).`);
      if (onCommitted) await onCommitted();
    } catch (err) {
      setProgress(null);
      if (err instanceof BulkImportValidationError) {
        setError(`${err.message}\n${err.details.join('\n')}`);
      } else {
        setError((err as Error).message);
      }
      setStep('VALIDATION');
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <Modal open={open} onClose={close} title="Import direct de fichier" wide>
      <div className="space-y-4">
        {/* ---------- Étapes ---------- */}
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className={
                  i === stepIndex
                    ? 'rounded-full bg-[#0B2A4A] px-2.5 py-1 text-white'
                    : i < stepIndex
                      ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700'
                      : 'rounded-full bg-slate-100 px-2.5 py-1 text-slate-500'
                }
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="text-slate-300">›</span>}
            </li>
          ))}
        </ol>

        {error && (
          <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* ---------- 1. SELECT ---------- */}
        {step === 'SELECT' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Importez un fichier <code>.json</code>, <code>.csv</code>, <code>.xlsx</code> ou <code>.xls</code>.
              L’analyse est entièrement locale : aucun service externe, aucune IA. Rien n’est écrit avant votre confirmation.
            </p>

            {allowEntitySwitch && (
              <label className="block text-sm font-semibold text-slate-700">
                Type de données
                <Select
                  className="mt-1"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as ImportEntity)}
                >
                  <option value="CONCOURS">Concours</option>
                  <option value="MASTERS">Masters universitaires</option>
                </Select>
              </label>
            )}

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-[#0B63CE] hover:bg-sky-50/40">
              <FileUp className="h-7 w-7 text-[#0B63CE]" />
              <span className="text-sm font-bold text-[#0B2A4A]">Choisir un fichier</span>
              <span className="text-xs text-slate-500">JSON, CSV, XLSX ou XLS — analysé localement dans votre navigateur</span>
              <input
                type="file"
                accept=".json,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
            {busy && <p className="text-xs font-semibold text-slate-500">Lecture et analyse du fichier…</p>}
          </div>
        )}

        {/* ---------- 2. MAPPING ---------- */}
        {step === 'MAPPING' && preview && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0B2A4A]">
              <FileSpreadsheet className="h-4 w-4" />
              {preview.fileName} — {preview.headers.length} colonne(s), {preview.rows.length} ligne(s)
            </div>

            {preview.parserNotes.length > 0 && (
              <Alert tone="warning" title="Points de vigilance" message={preview.parserNotes.join(' · ')} />
            )}

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[#0B2A4A]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Colonne du fichier</th>
                    <th className="px-3 py-2 font-bold">Champ métier</th>
                    <th className="px-3 py-2 font-bold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.mapping.map((m) => (
                    <tr key={m.header}>
                      <td className="px-3 py-1.5 font-semibold text-slate-700">{m.header}</td>
                      <td className="px-3 py-1.5 text-slate-600">{m.spec?.field ?? '—'}</td>
                      <td className="px-3 py-1.5">
                        {m.spec ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">mappé</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-500">ignoré</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.unmappedHeaders.length > 0 && (
              <p className="text-xs text-slate-500">
                Colonnes ignorées (non reconnues) : {preview.unmappedHeaders.join(', ')}
              </p>
            )}

            <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={() => setStep('SELECT')}>Changer de fichier</Button>
              <Button onClick={() => setStep('VALIDATION')}>Analyser les lignes</Button>
            </div>
          </div>
        )}

        {/* ---------- 3. VALIDATION ---------- */}
        {step === 'VALIDATION' && preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABEL) as RowStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(filter === s ? 'ALL' : s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLE[s]} ${filter === s ? 'ring-2' : ''}`}
                >
                  {STATUS_LABEL[s]} : {preview.counts[s]}
                </button>
              ))}
            </div>

            <Alert
              tone="info"
              message="Les lignes « doublon » correspondent à un enregistrement existant : elles sont ignorées, jamais écrasées. Les lignes « à vérifier » conservent le nom d'organisme du fichier sans rattachement forcé : aucune référence n'est inventée."
            />

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[#0B2A4A]">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Titre</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Détail</th>
                    <th className="px-3 py-2">Importer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row: ImportRow) => (
                    <tr key={row.index} className="align-top">
                      <td className="px-3 py-1.5 text-slate-500">{row.index}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800">
                        {String(row.data.title ?? row.data.name ?? '—')}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 font-bold ring-1 ${STATUS_STYLE[row.status]}`}>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {row.status === 'REVIEW' && (
                          <div className="mb-1 rounded bg-amber-50 px-1.5 py-1 text-[11px] text-amber-900">
                            Organisme retenu : « {row.resolution?.organizationName || String(row.data.organizationName || '—')} »
                            {row.resolution?.schoolId || row.resolution?.ministryId || row.resolution?.universityId
                              ? ' (rattaché)'
                              : ' (sans rattachement)'}
                          </div>
                        )}
                        {row.messages.slice(0, 2).map((m, i) => (
                          <div key={i}>{m.message}</div>
                        ))}
                        {row.diff.length > 0 && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Différences (non appliquées) : {row.diff.map((d) => d.field).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.status === 'OK' || row.status === 'REVIEW' ? (
                          <input
                            type="checkbox"
                            checked={!excluded.has(row.index)}
                            onChange={() => toggleRow(row.index)}
                            aria-label={`Inclure la ligne ${row.index}`}
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-600">
                {confirmedRows.length} ligne(s) sélectionnée(s) pour l’import
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('MAPPING')}>Retour mapping</Button>
                <Button onClick={() => setStep('CONFIRM')} disabled={confirmedRows.length === 0}>
                  Continuer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 4. CONFIRM ---------- */}
        {step === 'CONFIRM' && preview && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4" />
                Confirmez l’écriture de {confirmedRows.length} enregistrement(s) {entity === 'CONCOURS' ? 'concours' : 'master(s)'}.
              </div>
              <p className="mt-1 text-xs">
                {entity === 'CONCOURS'
                  ? 'Une seule écriture de la base locale, puis une seule synchronisation Supabase.'
                  : 'Une seule lecture et une seule écriture atomique de masters.json.'}
                {' '}L’opération est atomique : en cas d’échec, rien n’est écrit.
              </p>
            </div>

            {progress && (
              <div className="flex items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm font-semibold text-sky-800">
                <AlertTriangle className="h-4 w-4 animate-pulse" />
                Import en cours… {progress}
              </div>
            )}

            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
              {confirmedRows.slice(0, 200).map((r) => (
                <li key={r.index}>
                  #{r.index} — {String(r.data.title ?? r.data.name ?? '—')}
                </li>
              ))}
              {confirmedRows.length > 200 && <li className="text-slate-500">… et {confirmedRows.length - 200} autres</li>}
            </ul>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={() => setStep('VALIDATION')} disabled={busy}>
                Annuler
              </Button>
              <Button onClick={() => void commit()} loading={busy} disabled={busy}>
                Confirmer l’import
              </Button>
            </div>
          </div>
        )}

        {/* ---------- 5. REPORT ---------- */}
        {step === 'REPORT' && summary && preview && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                Import terminé
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-white p-2 text-center">
                  <dt className="text-xs text-slate-500">Importés</dt>
                  <dd className="text-xl font-extrabold text-emerald-700">{summary.imported}</dd>
                </div>
                <div className="rounded-lg bg-white p-2 text-center">
                  <dt className="text-xs text-slate-500">Doublons ignorés</dt>
                  <dd className="text-xl font-extrabold text-slate-700">
                    {summary.duplicates + preview.counts.DUPLICATE + preview.counts.DUPLICATE_IN_FILE}
                  </dd>
                </div>
                <div className="rounded-lg bg-white p-2 text-center">
                  <dt className="text-xs text-slate-500">À vérifier</dt>
                  <dd className="text-xl font-extrabold text-amber-700">{summary.review}</dd>
                </div>
                <div className="rounded-lg bg-white p-2 text-center">
                  <dt className="text-xs text-slate-500">Erreurs</dt>
                  <dd className="text-xl font-extrabold text-red-700">{summary.errors}</dd>
                </div>
              </dl>
            </div>

            {summary.details.length > 0 && (
              <details className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                <summary className="cursor-pointer font-bold text-[#0B2A4A]">Détail de l’opération</summary>
                <ul className="mt-2 space-y-1">
                  {summary.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `import-report-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Télécharger le rapport
              </Button>
              <Button onClick={close}>Fermer</Button>
            </div>
          </div>
        )}

        {step === 'SELECT' && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <UploadCloud className="h-3.5 w-3.5" />
              Workflow recommandé. L’import JSON historique reste accessible depuis la page Concours.
            </p>
            <Button variant="outline" onClick={close}>Fermer</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
