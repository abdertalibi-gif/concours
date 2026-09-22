import { useState, useEffect } from 'react';
import {
  Play,
  Search,
  Plus,
  RefreshCw,
  StopCircle,
  Bot,
  Send,
} from 'lucide-react';
import { Button, Chip, Modal, Input, Field } from '../../components/ui';
import { askGemini } from '../../services/gemini';

export default function AdminAIAgent() {
  const [sources, setSources] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);

  // ============================================================
  // Gemini
  // ============================================================
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ============================================================
  // Modal source
  // ============================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================
  // Ajouter une source
  // ============================================================
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSourceName || !newSourceUrl) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/agent/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSourceName,
          url: newSourceUrl,
          type: 'HTML',
          isActive: true,
          status: 'OK',
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewSourceName('');
        setNewSourceUrl('');
        await fetchSources();
      }
    } catch (err) {
      console.error('Erreur ajout source:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Initialisation
  // ============================================================
  useEffect(() => {
    fetchSources();
    fetchLogs();

    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // Récupérer les sources
  // ============================================================
  const fetchSources = async () => {
    try {
      const res = await fetch('/api/agent/sources');

      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error('Erreur récupération sources:', e);
    }
  };

  // ============================================================
  // Récupérer les logs
  // ============================================================
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/agent/logs');

      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Erreur récupération logs:', e);
    }
  };

  // ============================================================
  // Scanner une source
  // ============================================================
  const scanSource = async (id: string) => {
    setLoading(true);

    try {
      await fetch(
        `/api/agent/sources/${id}/scan?dryRun=${isDryRun}`,
        {
          method: 'POST',
        }
      );

      await fetchSources();
      await fetchLogs();
    } catch (e) {
      console.error('Erreur scan:', e);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Scanner toutes les sources
  // ============================================================
  const scanAll = async () => {
    setLoading(true);

    try {
      for (const source of sources) {
        if (source.isActive) {
          await scanSource(source.id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Demander à Gemini
  // ============================================================
  const handleAskGemini = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiResponse('');

    try {
      const result = await askGemini(aiPrompt);

      setAiResponse(
        result || 'Aucune réponse reçue de Gemini.'
      );
    } catch (error) {
      console.error('Gemini error:', error);

      setAiResponse(
        'Erreur lors de la connexion à Google Gemini. Vérifiez votre clé API et votre configuration.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ============================================================
  // Entrée clavier Gemini
  // ============================================================
  const handleGeminiKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAskGemini();
    }
  };

  return (
    <div className="space-y-6">

      {/* ========================================================
          HEADER
      ======================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Agent Source Manager
          </h1>

          <p className="text-slate-500">
            Surveillance et importation automatique des concours via IA.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">

          {/* Dry Run */}
          <div className="flex items-center gap-2 mr-4">
            <input
              type="checkbox"
              id="dryRun"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />

            <label
              htmlFor="dryRun"
              className="text-sm font-medium text-slate-700"
            >
              Mode DRY RUN (Simulation)
            </label>
          </div>

          {/* Scanner tout */}
          <Button
            variant="outline"
            onClick={scanAll}
            disabled={loading}
          >
            <Play className="mr-2 h-4 w-4" />
            Lancer tout
          </Button>

          {/* Ajouter source */}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter source
          </Button>

        </div>
      </div>

      {/* ========================================================
          GEMINI AI
      ======================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header Gemini */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Google Gemini AI
              </h2>

              <p className="text-sm text-slate-500">
                Assistant IA pour analyser les concours et les sources.
              </p>
            </div>

          </div>

        </div>

        {/* Contenu Gemini */}
        <div className="p-6">

          <div className="space-y-4">

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={handleGeminiKeyDown}
              placeholder="Posez une question à Gemini... Exemple : Analyse cette source et explique-moi quels concours peuvent être importés."
              className="w-full min-h-[120px] rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              disabled={aiLoading}
            />

            <div className="flex items-center justify-between gap-3">

              <p className="text-xs text-slate-400">
                Ctrl + Entrée pour envoyer
              </p>

              <Button
                onClick={handleAskGemini}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                <Send className="mr-2 h-4 w-4" />

                {aiLoading
                  ? 'Gemini réfléchit...'
                  : 'Demander à Gemini'}
              </Button>

            </div>

            {/* Réponse */}
            {aiResponse && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-5">

                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-blue-600" />

                  <span className="font-semibold text-sm text-slate-800">
                    Réponse Gemini
                  </span>
                </div>

                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-6">
                  {aiResponse}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* ========================================================
          CONTENT
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ======================================================
            SOURCES
        ====================================================== */}
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">

              <h3 className="font-semibold text-slate-800">
                Sources Surveillées ({sources.length})
              </h3>

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSources}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

            </div>

            {/* Liste */}
            <div className="divide-y divide-slate-100">

              {sources.map((source) => (

                <div
                  key={source.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4"
                >

                  <div className="flex-1">

                    <div className="flex items-center gap-2 mb-1">

                      <span className="font-medium text-slate-900">
                        {source.name}
                      </span>

                      <Chip
                        tone={
                          source.status === 'OK'
                            ? 'green'
                            : source.status === 'ERROR'
                              ? 'orange'
                              : 'slate'
                        }
                      >
                        {source.status}
                      </Chip>

                      {!source.isActive && (
                        <Chip tone="slate">
                          Inactif
                        </Chip>
                      )}

                    </div>

                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline block mb-1"
                    >
                      {source.url}
                    </a>

                    <div className="flex items-center gap-4 text-xs text-slate-500">

                      <span>
                        Type: {source.type}
                      </span>

                      {source.lastCheckAt ? (
                        <span>
                          Dernier scan:{' '}
                          {new Date(
                            source.lastCheckAt
                          ).toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span>
                          Jamais scanné
                        </span>
                      )}

                    </div>

                  </div>

                  {/* Scanner */}
                  <div className="flex items-center gap-2">

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        loading ||
                        !source.isActive
                      }
                      onClick={() =>
                        scanSource(source.id)
                      }
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Scanner
                    </Button>

                  </div>

                </div>

              ))}

              {/* Aucun résultat */}
              {sources.length === 0 && (

                <div className="p-8 text-center text-slate-500">

                  Aucune source configurée.
                  Ajoutez 5 sources de test.

                </div>

              )}

            </div>

          </div>

        </div>

        {/* ======================================================
            ACTIVITY LOG
        ====================================================== */}
        <div className="space-y-4">

          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex flex-col h-[600px]">

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">

              <h3 className="font-semibold text-white flex items-center gap-2">

                <StopCircle
                  size={16}
                  className="text-green-400"
                />

                Activity Log

              </h3>

            </div>

            {/* Logs */}
            <div className="p-4 flex-1 overflow-y-auto font-mono text-sm space-y-3">

              {logs.map((log) => (

                <div
                  key={log.id}
                  className="border-l-2 border-slate-700 pl-3"
                >

                  <div className="text-slate-500 text-xs mb-1">

                    {new Date(
                      log.createdAt
                    ).toLocaleTimeString('fr-FR')}

                    {' - '}

                    {log.source?.name}

                  </div>

                  <div
                    className={
                      log.level === 'ERROR'
                        ? 'text-red-400'
                        : log.level === 'SUCCESS'
                          ? 'text-green-400'
                          : log.action === 'UPSERT'
                            ? 'text-blue-400'
                            : 'text-slate-300'
                    }
                  >

                    {log.action === 'UPSERT'
                      ? '✓ '
                      : log.level === 'ERROR'
                        ? '⚠ '
                        : '▶ '}

                    {log.message}

                  </div>

                </div>

              ))}

              {logs.length === 0 && (
                <div className="text-slate-600 italic">
                  En attente d'activité...
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          MODAL AJOUT SOURCE
      ======================================================== */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter une nouvelle source"
      >

        <form
          onSubmit={handleAddSource}
          className="space-y-4"
        >

          <Field
            label="Nom de la source"
            required
          >
            <Input
              value={newSourceName}
              onChange={(e) =>
                setNewSourceName(e.target.value)
              }
              placeholder="ex: FSJES Agdal"
              required
            />
          </Field>

          <Field
            label="URL (Page des annonces/concours)"
            required
          >
            <Input
              type="url"
              value={newSourceUrl}
              onChange={(e) =>
                setNewSourceUrl(e.target.value)
              }
              placeholder="https://..."
              required
            />
          </Field>

          <div className="flex justify-end gap-3 mt-6">

            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setIsModalOpen(false)
              }
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Ajout...'
                : 'Enregistrer'}
            </Button>

          </div>

        </form>

      </Modal>

    </div>
  );
}