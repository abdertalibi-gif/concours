const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminMastersImport.tsx', 'utf8');

// Add state
const statePattern = /const \[modalMode, setModalMode\] = useState<'create' \| 'edit'>\('create'\);/;
if (content.match(statePattern)) {
  content = content.replace(statePattern, `const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');\n  const [logsModalOpen, setLogsModalOpen] = useState(false);`);
}

// Add button next to Synchroniser
const syncButtonPattern = /onClick={handleSync}\s*disabled={syncing}\s*className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium border-slate-200 shadow-sm"\s*title="Mettre à jour les données depuis le système de veille"\s*>\s*<RefreshCw className=\{`w-4 h-4 \$\{syncing \? 'animate-spin text-\\[#0B63CE\\]' : ''\}`\} \/>\s*\{syncing \? 'Veille\.\.\.' : 'Synchroniser'\}\s*<\/Button>/m;
const replaceWith = `onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium border-slate-200 shadow-sm"
            title="Mettre à jour les données depuis le système de veille"
          >
            <RefreshCw className={\`w-4 h-4 \${syncing ? 'animate-spin text-[#0B63CE]' : ''}\`} />
            {syncing ? 'Veille...' : 'Synchroniser'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLogsModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium border-slate-200 shadow-sm"
            title="Consulter les logs de synchronisation"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            Logs
          </Button>`;

content = content.replace(syncButtonPattern, replaceWith);

// Add the modal component at the end before final </div>
const modalContent = `      {/* Modal Historique de Synchronisation */}
      <Modal
        open={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Historique de Synchronisation (Logs)"
        size="lg"
      >
        <div className="space-y-6">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              Aucune synchronisation n'a encore été effectuée.
            </div>
          ) : (
            <div className="space-y-8">
              {logs.map(log => (
                <div key={log.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-slate-900 text-lg">
                      Rapport du {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </div>
                    <div className="text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      ID: {log.id}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-sm text-slate-500">Masters trouvés</div>
                      <div className="text-2xl font-bold text-slate-800">{log.totalFound}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <div className="text-sm text-emerald-600">Nouveaux ajoutés</div>
                      <div className="text-2xl font-bold text-emerald-700">+{log.newCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-200">
                      <div className="text-sm text-blue-600">Mis à jour</div>
                      <div className="text-2xl font-bold text-blue-700">{log.updatedCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-rose-200">
                      <div className="text-sm text-rose-600">Erreurs</div>
                      <div className="text-2xl font-bold text-rose-700">{log.errorCount}</div>
                    </div>
                  </div>

                  {log.details && log.details.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Détails de l'exécution :</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {log.details.map((detail, idx) => (
                          <li key={idx} className="text-sm text-slate-600 font-mono text-xs">{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
`;

const lastDivIndex = content.lastIndexOf('</div>');
content = content.substring(0, lastDivIndex) + modalContent + content.substring(lastDivIndex);

fs.writeFileSync('src/pages/admin/AdminMastersImport.tsx', content);
console.log('Logs modal added successfully');
