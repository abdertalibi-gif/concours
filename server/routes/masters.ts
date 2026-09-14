import express from 'express';
import {
  getMastersStore,
  getSyncLogs,
  syncMastersFromAlMaster,
  createMaster,
  updateMaster,
  deleteMaster,
  updateAllMastersStatus,
  MasterItem
} from '../services/mastersService.js';

const router = express.Router();

// GET all masters with filters
router.get('/', async (req, res) => {
  try {
    let masters = getMastersStore();

    const { status, university, city, domain, search, q } = req.query;

    if (status && typeof status === 'string' && status !== 'TOUS') {
      masters = masters.filter(m => m.status.toUpperCase() === status.toUpperCase());
    }

    if (university && typeof university === 'string') {
      const u = university.toLowerCase();
      masters = masters.filter(m => m.university.toLowerCase().includes(u));
    }

    if (city && typeof city === 'string') {
      const c = city.toLowerCase();
      masters = masters.filter(m => m.city.toLowerCase().includes(c));
    }

    if (domain && typeof domain === 'string') {
      const d = domain.toLowerCase();
      masters = masters.filter(m => m.domain.toLowerCase().includes(d));
    }

    const searchQuery = (search || q) as string | undefined;
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      masters = masters.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.establishment.toLowerCase().includes(term) ||
        m.university.toLowerCase().includes(term) ||
        m.city.toLowerCase().includes(term) ||
        m.domain.toLowerCase().includes(term)
      );
    }

    // Default sort: Open first, then upcoming, then by deadline
    masters.sort((a, b) => {
      const statusWeight: Record<string, number> = {
        'OUVERT': 1,
        'A_VENIR': 2,
        'CONCOURS_A_VENIR': 3,
        'RESULTATS': 4,
        'INFORMATION': 5,
        'FERME': 6
      };
      const diff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (diff !== 0) return diff;
      return (a.deadlineDate || '9').localeCompare(b.deadlineDate || '9');
    });

    res.json(masters);
  } catch (error: any) {
    console.error('Error fetching masters:', error);
    res.status(500).json({ error: 'Échec de la récupération des masters' });
  }
});

// GET sync logs
router.get('/sync-logs', async (req, res) => {
  try {
    const logs = getSyncLogs();
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Échec de la récupération des logs' });
  }
});

// POST sync trigger
router.post('/sync', async (req, res) => {
  try {
    const summary = await syncMastersFromAlMaster();
    res.json({
      success: true,
      message: 'Synchronisation effectuée avec succès',
      summary
    });
  } catch (error: any) {
    console.error('Error running masters sync:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la synchronisation'
    });
  }
});

// POST update-statuses: Exécute la fonction utilitaire de mise à jour automatique des statuts
router.post('/update-statuses', async (req, res) => {
  try {
    const referenceDate = req.body?.referenceDate ? new Date(req.body.referenceDate) : new Date();
    const result = updateAllMastersStatus(referenceDate);
    res.json(result);
  } catch (error: any) {
    console.error('Error updating masters statuses:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la mise à jour des statuts'
    });
  }
});

// GET update-statuses: Permet aussi de déclencher ou tester la mise à jour via un simple GET
router.get('/update-statuses', async (req, res) => {
  try {
    const refDate = req.query?.date ? new Date(String(req.query.date)) : new Date();
    const result = updateAllMastersStatus(refDate);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single master
router.get('/:id', async (req, res) => {
  try {
    const masters = getMastersStore();
    const item = masters.find(m => m.id === req.params.id || m.uniqueKey === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Master introuvable' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// POST create a new master (Admin)
router.post('/', async (req, res) => {
  try {
    const { name, establishment, university, city, domain, academicYear } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom de l’intitulé du master est obligatoire.' });
    }

    const created = createMaster(req.body);
    res.status(201).json({
      success: true,
      message: 'Master créé avec succès',
      item: created
    });
  } catch (error: any) {
    console.error('Error creating master:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la création du master' });
  }
});

// PUT update an existing master (Admin)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = updateMaster(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Master introuvable' });
    }
    res.json({
      success: true,
      message: 'Master mis à jour avec succès',
      item: updated
    });
  } catch (error: any) {
    console.error('Error updating master:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour du master' });
  }
});

// DELETE remove a master (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = deleteMaster(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Master introuvable ou déjà supprimé' });
    }
    res.json({
      success: true,
      message: 'Master supprimé avec succès'
    });
  } catch (error: any) {
    console.error('Error deleting master:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression du master' });
  }
});

export default router;
