import express from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index.js';

const router = express.Router();

const MAROC_TIMEZONE = 'Africa/Casablanca';

function parseDateSafe(val: any, isDeadline = false): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
  const s = String(val).trim();
  if (!s || s === '—' || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function evaluateCompetitionStatus(competition: {
  registrationStart?: Date | string | null;
  registrationDeadline?: Date | string | null;
  openingDate?: Date | string | null;
  closingDate?: Date | string | null;
  applicationDeadline?: Date | string | null;
  competitionDate?: Date | string | null;
}): { status: 'OUVERT' | 'A_VENIR' | 'CLOTURE' | 'DATE_A_VERIFIER'; isOpen: boolean; daysRemainingToClose: number | null; closingDate: Date | null } {
  const open = parseDateSafe(competition.registrationStart ?? competition.openingDate, false);
  const close = parseDateSafe(competition.registrationDeadline ?? competition.closingDate ?? competition.applicationDeadline, true);
  const now = new Date();

  const hasOpeningDate = Boolean(open);
  const hasClosingDate = Boolean(close);

  let daysRemainingToClose: number | null = null;
  if (close) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfClose = new Date(close.getFullYear(), close.getMonth(), close.getDate());
    daysRemainingToClose = Math.ceil((startOfClose.getTime() - startOfToday.getTime()) / 86400000);
  }

  if (open && close && open.getTime() > close.getTime()) {
    return { status: 'DATE_A_VERIFIER', isOpen: false, daysRemainingToClose, closingDate: close };
  }

  if (open && close) {
    if (now.getTime() < open.getTime()) return { status: 'A_VENIR', isOpen: false, daysRemainingToClose, closingDate: close };
    if (now.getTime() > close.getTime()) return { status: 'CLOTURE', isOpen: false, daysRemainingToClose, closingDate: close };
    return { status: 'OUVERT', isOpen: true, daysRemainingToClose, closingDate: close };
  }

  if (close) {
    if (now.getTime() > close.getTime()) return { status: 'CLOTURE', isOpen: false, daysRemainingToClose, closingDate: close };
    return { status: 'OUVERT', isOpen: true, daysRemainingToClose, closingDate: close };
  }

  if (open) {
    if (now.getTime() < open.getTime()) return { status: 'A_VENIR', isOpen: false, daysRemainingToClose, closingDate: null };
    return { status: 'DATE_A_VERIFIER', isOpen: false, daysRemainingToClose, closingDate: null };
  }

  return { status: 'DATE_A_VERIFIER', isOpen: false, daysRemainingToClose, closingDate: null };
}

function requireCompetitionOpen(req: express.Request, res: express.Response, next: express.NextFunction) {
  // This middleware expects competition to be attached to req by a previous handler
  // or competitionId in body/params
  next();
}

// ==========================================
// DOCUMENT UPLOAD (Fallback & Direct Storage)
// ==========================================
router.post('/documents/upload', async (req, res) => {
  try {
    const { fileName, fileData, contentType } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Fichier manquant.' });
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const targetDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, sanitized);
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/uploads/documents/${sanitized}`;
    res.json({ success: true, fileUrl, filePath: `documents/${sanitized}` });
  } catch (error) {
    console.error('[Upload API Error]', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du fichier sur le serveur.' });
  }
});

// ==========================================
// COMPETITIONS
// ==========================================
router.get('/competitions', async (req, res) => {
  try {
    const includeExpired = req.query.includeExpired === 'true';
    let competitions = await prisma.competition.findMany();
    if (!includeExpired) {
      competitions = competitions.filter((comp) => evaluateCompetitionStatus(comp).status !== 'CLOTURE');
    }
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

router.post('/competitions', async (req, res) => {
  try {
    const data = req.body;
    const competition = await prisma.competition.create({ data });
    res.status(201).json(competition);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create competition' });
  }
});

// ==========================================
// APPLICATIONS (Candidatures)
// ==========================================
router.post('/applications', async (req, res) => {
  try {
    const { competitionId, userId, ...rest } = req.body;
    if (!competitionId || !userId) {
      return res.status(400).json({ error: 'competitionId et userId sont requis.' });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      return res.status(404).json({ error: 'Concours introuvable.' });
    }

    const evalResult = evaluateCompetitionStatus(competition);
    if (!evalResult.isOpen) {
      const messages: Record<string, string> = {
        CLOTURE: `Les inscriptions sont closes depuis le ${evalResult.closingDate?.toLocaleDateString('fr-MA') || 'cette date'}.`,
        A_VENIR: 'Les inscriptions ne sont pas encore ouvertes.',
        DATE_A_VERIFIER: "Les dates de ce concours ne sont pas confirmées. Impossible de candidater.",
      };
      return res.status(403).json({
        error: 'Candidature non autorisée.',
        reason: evalResult.status,
        message: messages[evalResult.status] || 'Ce concours n\'est pas ouvert aux inscriptions.',
        closingDate: evalResult.closingDate?.toISOString(),
      });
    }

    // Vérifier si l'utilisateur a déjà postulé
    const existing = await prisma.application.findFirst({
      where: { competitionId, userId }
    });
    if (existing) {
      return res.status(409).json({ error: 'Vous avez déjà postulé à ce concours.' });
    }

    const application = await prisma.application.create({
      data: { competitionId, userId, status: 'PENDING', ...rest }
    });
    res.status(201).json(application);
  } catch (error) {
    console.error('[Application API Error]', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de la candidature.' });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const { userId, competitionId } = req.query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (competitionId) where.competitionId = competitionId;
    const applications = await prisma.application.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ==========================================
// SCHOOLS
// ==========================================
router.get('/schools', async (req, res) => {
  try {
    const schools = await prisma.school.findMany();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.post('/schools', async (req, res) => {
  try {
    const data = req.body;
    const school = await prisma.school.create({ data });
    res.status(201).json(school);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create school' });
  }
});

// ==========================================
// UNIVERSITIES
// ==========================================
router.get('/universities', async (req, res) => {
  try {
    const universities = await prisma.university.findMany();
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

// ==========================================
// MINISTRIES
// ==========================================
router.get('/ministries', async (req, res) => {
  try {
    const ministries = await prisma.ministry.findMany();
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ministries' });
  }
});

// ==========================================
// EXAMS
// ==========================================
router.get('/exams', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany();
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ==========================================
// DOCUMENTS
// ==========================================
router.get('/documents', async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ==========================================
// USERS
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ==========================================
// STATISTICS
// ==========================================
router.get('/statistics', async (req, res) => {
  try {
    const [
      totalUsers,
      totalCompetitions,
      totalSchools,
      totalUniversities,
      totalMinistries,
      totalExams,
      totalDocuments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.competition.count(),
      prisma.school.count(),
      prisma.university.count(),
      prisma.ministry.count(),
      prisma.exam.count(),
      prisma.document.count()
    ]);

    res.json({
      totalUsers,
      totalCompetitions,
      totalSchools,
      totalUniversities,
      totalMinistries,
      totalExams,
      totalDocuments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==========================================
// COMPETITION STATUS CHECK (Server-side validation)
// ==========================================
router.get('/competitions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      return res.status(404).json({ error: 'Concours introuvable.' });
    }
    const evalResult = evaluateCompetitionStatus(competition);
    res.json({
      competitionId: id,
      status: evalResult.status,
      isOpen: evalResult.isOpen,
      daysRemainingToClose: evalResult.daysRemainingToClose,
      closingDate: evalResult.closingDate?.toISOString(),
      closingDateFR: evalResult.closingDate?.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch competition status' });
  }
});

export default router;
