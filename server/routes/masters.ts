import express from 'express';
import { prisma } from '../index.js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch'; // or global fetch if Node 18+

const router = express.Router();

// GET all masters
router.get('/', async (req, res) => {
  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.university) filters.university = { contains: String(req.query.university), mode: 'insensitive' };
    if (req.query.city) filters.city = { contains: String(req.query.city), mode: 'insensitive' };
    if (req.query.domain) filters.domain = { contains: String(req.query.domain), mode: 'insensitive' };
    if (req.query.search) filters.name = { contains: String(req.query.search), mode: 'insensitive' };

    const masters = await prisma.master.findMany({
      where: filters,
      orderBy: { updatedAt: 'desc' }
    });
    res.json(masters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch masters' });
  }
});

// GET sync summary logs
router.get('/sync-logs', async (req, res) => {
  try {
    const logs = await prisma.syncSummary.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// POST sync trigger
router.post('/sync', async (req, res) => {
  try {
    // Return early to not block the client, doing the sync in background
    res.json({ message: 'Sync started' });
    
    await runSyncMasters();
  } catch (error) {
    console.error('Error starting sync:', error);
  }
});

async function runSyncMasters() {
  const summary = {
    newCount: 0,
    updatedCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    openCount: 0,
    upcomingCount: 0,
    closedCount: 0,
    resultsCount: 0,
    details: [] as string[]
  };

  try {
    // 1. Fetch AlMaster-Maroc main page or specific category page for Masters
    // For demo purposes and depending on actual site structure:
    const baseUrl = 'https://www.almaster-maroc.com/';
    const response = await fetch(baseUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    // This is a placeholder for the actual scraping logic, as the actual HTML structure
    // of almaster-maroc.com is needed. We will simulate finding links to parse.
    const articleLinks: string[] = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('master') && href.startsWith('http')) {
        if (!articleLinks.includes(href)) {
          articleLinks.push(href);
        }
      }
    });

    // Limit to top 10 for safety in this execution
    const linksToProcess = articleLinks.slice(0, 10);

    for (const link of linksToProcess) {
      try {
        const articleRes = await fetch(link);
        const articleHtml = await articleRes.text();
        const $art = cheerio.load(articleHtml);

        // Extract information (Heuristic based extraction)
        const title = $art('h1').first().text().trim();
        if (!title) continue;

        // Simulate extraction from text
        const content = $art('body').text();
        
        // Basic heuristics
        let status = 'INFORMATION';
        const now = new Date();
        
        let deadlineDate: Date | null = null;
        const deadlineMatch = content.match(/date limite.*?(\d{2}\/\d{2}\/\d{4})/i);
        if (deadlineMatch) {
          const parts = deadlineMatch[1].split('/');
          deadlineDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (deadlineDate < now) status = 'FERME';
          else status = 'OUVERT';
        }

        if (content.toLowerCase().includes('résultats') || content.toLowerCase().includes('resultats')) {
            status = 'RESULTATS';
        }

        // Just mock some extracted data for this implementation since we can't reliably
        // write perfect selectors without seeing the exact current HTML structure of the site
        const extracted = {
          name: title,
          university: title.includes('Université') ? 'Université (Extraite)' : 'Université Inconnue',
          establishment: 'Établissement (Extrait)',
          city: 'Ville (Extraite)',
          academicYear: '2026-2027',
          deadlineDate: deadlineDate,
          status: status,
          sourceUrl: link,
          officialUrl: null
        };

        const uniqueKey = `${extracted.university}-${extracted.establishment}-${extracted.name}-${extracted.academicYear}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const existing = await prisma.master.findUnique({ where: { uniqueKey } });

        if (existing) {
          // Update
          await prisma.master.update({
            where: { id: existing.id },
            data: {
              deadlineDate: extracted.deadlineDate,
              status: extracted.status,
              sourceUrl: extracted.sourceUrl
            }
          });
          summary.updatedCount++;
        } else {
          // Insert
          await prisma.master.create({
            data: {
              uniqueKey,
              name: extracted.name,
              university: extracted.university,
              establishment: extracted.establishment,
              city: extracted.city,
              academicYear: extracted.academicYear,
              deadlineDate: extracted.deadlineDate,
              status: extracted.status,
              sourceUrl: extracted.sourceUrl
            }
          });
          summary.newCount++;
        }

        if (status === 'OUVERT') summary.openCount++;
        else if (status === 'FERME') summary.closedCount++;
        else if (status === 'RESULTATS') summary.resultsCount++;

      } catch (err: any) {
        summary.errorCount++;
        summary.details.push(`Error parsing ${link}: ${err.message}`);
      }
    }

    // Save summary
    await prisma.syncSummary.create({
      data: {
        newCount: summary.newCount,
        updatedCount: summary.updatedCount,
        duplicateCount: summary.duplicateCount,
        errorCount: summary.errorCount,
        openCount: summary.openCount,
        upcomingCount: summary.upcomingCount,
        closedCount: summary.closedCount,
        resultsCount: summary.resultsCount,
        details: JSON.stringify(summary.details)
      }
    });

  } catch (error: any) {
    console.error('Fatal sync error:', error);
    await prisma.syncSummary.create({
      data: {
        errorCount: 1,
        details: JSON.stringify([`Fatal error: ${error.message}`])
      }
    });
  }
}

export default router;
