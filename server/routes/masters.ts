import express from 'express';
import {
  getMastersStore,
  getSyncLogs,
  syncMastersFromAlMaster,
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

export default router;
