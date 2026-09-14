const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminAIAgent.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { Button, Chip } from '../../components/ui';",
  "import { Button, Chip, Modal, Input, Field } from '../../components/ui';"
);

// 2. Add state and handler
const statePattern = /const \[isDryRun, setIsDryRun\] = useState\(true\);/;
const statesToAdd = `
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/agent/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          url: newSourceUrl,
          type: 'HTML',
          isActive: true,
          status: 'OK'
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewSourceName('');
        setNewSourceUrl('');
        fetchSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
`;

content = content.replace(statePattern, `const [isDryRun, setIsDryRun] = useState(true);\n${statesToAdd}`);

// 3. Update button
const buttonPattern = /<Button>\s*<Plus className="mr-2 h-4 w-4" \/> Ajouter source\s*<\/Button>/;
content = content.replace(buttonPattern, `<Button onClick={() => setIsModalOpen(true)}>\n             <Plus className="mr-2 h-4 w-4" /> Ajouter source\n          </Button>`);

// 4. Add modal markup before final </div>
const modalMarkup = `
      {/* Modal Ajout Source */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter une nouvelle source"
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <Field label="Nom de la source" required>
            <Input 
              value={newSourceName} 
              onChange={e => setNewSourceName(e.target.value)} 
              placeholder="ex: FSJES Agdal" 
              required
            />
          </Field>
          <Field label="URL (Page des annonces/concours)" required>
            <Input 
              type="url"
              value={newSourceUrl} 
              onChange={e => setNewSourceUrl(e.target.value)} 
              placeholder="https://..." 
              required
            />
          </Field>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ajout...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
`;

const lastDivIndex = content.lastIndexOf('</div>');
content = content.substring(0, lastDivIndex) + modalMarkup + content.substring(lastDivIndex);

fs.writeFileSync('src/pages/admin/AdminAIAgent.tsx', content);
console.log('Fixed Add Source functionality');
