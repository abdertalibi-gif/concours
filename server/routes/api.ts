import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// ==========================================
// COMPETITIONS
// ==========================================
router.get('/competitions', async (req, res) => {
  try {
    const competitions = await prisma.competition.findMany();
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

export default router;
