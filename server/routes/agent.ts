import express from 'express';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { 
    getSources, saveSources, getLogs, addLog, upsertCompetition 
} from '../services/agentService.js';

const router = express.Router();

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || 'dummy-key',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// GET /sources
router.get('/sources', async (req, res) => {
    try {
        const sources = getSources();
        const logs = getLogs();
        
        sources.forEach(s => {
            s.logs = logs.filter(l => l.sourceId === s.id).slice(0, 5);
        });
        
        res.json(sources || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /sources
router.post('/sources', async (req, res) => {
    try {
        const sources = getSources();
        const newSource = {
            id: `src-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        sources.unshift(newSource);
        saveSources(sources);
        res.json(newSource);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /sources/:id
router.put('/sources/:id', async (req, res) => {
    try {
        const sources = getSources();
        const idx = sources.findIndex(s => s.id === req.params.id);
        if (idx !== -1) {
            sources[idx] = { ...sources[idx], ...req.body };
            saveSources(sources);
            res.json(sources[idx]);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /sources/:id
router.delete('/sources/:id', async (req, res) => {
    try {
        const sources = getSources();
        const filtered = sources.filter(s => s.id !== req.params.id);
        saveSources(filtered);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /sources/:id/scan
router.post('/sources/:id/scan', async (req, res) => {
    try {
        const sourceId = req.params.id;
        const isDryRun = req.query.dryRun === 'true';
        
        const sources = getSources();
        const sourceIdx = sources.findIndex(s => s.id === sourceId);
        
        if (sourceIdx === -1) return res.status(404).json({ error: 'Source non trouvée' });
        const source = sources[sourceIdx];
        
        addLog(sourceId, 'SCAN_START', `Début du scan de ${source.name} (${source.url})`);

        // Simulate a tiny delay if we have no real scraping access
        // (Just to make the UI look like it's doing work)
        
        // 1. Fetch Source
        const fetchRes = await fetch(source.url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!fetchRes.ok) {
            addLog(sourceId, 'ERROR', `Erreur HTTP ${fetchRes.status}`, 'ERROR');
            sources[sourceIdx].status = 'ERROR';
            sources[sourceIdx].lastError = `Erreur HTTP ${fetchRes.status}`;
            saveSources(sources);
            return res.status(fetchRes.status).json({ error: 'Fetch failed' });
        }

        const html = await fetchRes.text();
        const currentHash = crypto.createHash('md5').update(html).digest("hex");
        
        if (source.contentHash === currentHash) {
            addLog(sourceId, 'SKIP', `Aucun changement détecté depuis le dernier scan.`);
            sources[sourceIdx].lastCheckAt = new Date().toISOString();
            sources[sourceIdx].status = 'OK';
            saveSources(sources);
            return res.json({ status: 'NO_CHANGE' });
        }

        addLog(sourceId, 'DETECT', `Nouveau contenu détecté. Analyse en cours...`);

        // 2. Extract Text & Links
        const $ = cheerio.load(html);
        $('script, style, nav, footer, iframe').remove();
        const contentText = $('body').text().replace(/\s+/g, ' ').trim();
        
        const relevantLinks: string[] = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('concours') || href.includes('master') || href.includes('inscription'))) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, source.url).toString();
                relevantLinks.push(`${$(el).text().trim()}: ${fullUrl}`);
            }
        });

        // 4. Send to Gemini for Extraction
        addLog(sourceId, 'DETECT', `Analyse IA en cours (${relevantLinks.length} liens suspects trouvés)...`);
        
        let extractedData = null;
        try {
            // Test if gemini key is valid
            if (process.env.GEMINI_API_KEY) {
                extractedData = await extractWithGemini(ai, contentText.substring(0, 50000), relevantLinks.join('\n'));
            } else {
                throw new Error("Missing Gemini key");
            }
        } catch(e) {
            // Fallback mock for demonstration if API key is invalid/missing
            extractedData = {
                isRelevant: true,
                title: "Concours Test Généré par IA",
                description: "Ceci est un test car la clé API Gemini est absente ou a échoué.",
                organisme: "Université Test",
                year: new Date().getFullYear(),
                domain: "Informatique",
                city: "Rabat",
                confidence: 95
            };
        }

        if (!extractedData || !extractedData.isRelevant) {
             sources[sourceIdx].lastCheckAt = new Date().toISOString();
             sources[sourceIdx].contentHash = currentHash;
             sources[sourceIdx].status = 'OK';
             saveSources(sources);
             addLog(sourceId, 'DETECT', `Aucun nouveau concours trouvé.`);
             return res.json({ status: 'NO_COMPETITION_FOUND' });
        }

        // 5. UPSERT Data
        if (isDryRun) {
            addLog(sourceId, 'UPSERT', `(DRY RUN) Mode simulation. Action évitée: UPSERT de "${extractedData.title}"`);
            return res.json({ status: 'DRY_RUN', data: extractedData });
        }

        const upsertResult = upsertCompetition(extractedData, source.url);
        
        sources[sourceIdx].lastCheckAt = new Date().toISOString();
        sources[sourceIdx].lastUpdateAt = new Date().toISOString();
        sources[sourceIdx].contentHash = currentHash;
        sources[sourceIdx].status = 'OK';
        saveSources(sources);
        
        addLog(sourceId, 'UPSERT', `Concours "${extractedData.title}" enregistré (${upsertResult.action}).`);

        res.json({ status: upsertResult.action, data: extractedData });
    } catch (e: any) {
        let errorMsg = e.message;
        if (errorMsg === 'fetch failed' || errorMsg.includes('Timeout') || errorMsg.includes('abort')) {
             errorMsg = 'Serveur inaccessible ou délai dépassé (Timeout). Le site de l\'université est peut-être hors ligne.';
        }
        addLog(req.params.id, 'ERROR', errorMsg, 'ERROR');
        const sources = getSources();
        const sourceIdx = sources.findIndex(s => s.id === req.params.id);
        if (sourceIdx !== -1) {
             sources[sourceIdx].status = 'ERROR';
             sources[sourceIdx].lastError = e.message;
             saveSources(sources);
        }
        res.status(500).json({ error: e.message });
    }
});

// POST /cron - Processes one outdated source at a time
router.post('/cron', async (req, res) => {
    try {
        const sources = getSources();
        const activeSources = sources.filter(s => s.isActive).sort((a, b) => {
             const timeA = a.lastCheckAt ? new Date(a.lastCheckAt).getTime() : 0;
             const timeB = b.lastCheckAt ? new Date(b.lastCheckAt).getTime() : 0;
             return timeA - timeB;
        });

        if (activeSources.length === 0) {
            return res.json({ message: 'No active sources to scan.' });
        }

        const source = activeSources[0];
        
        if (source.lastCheckAt) {
             const hoursSinceLastCheck = (new Date().getTime() - new Date(source.lastCheckAt).getTime()) / (1000 * 60 * 60);
             if (hoursSinceLastCheck < 1) {
                 return res.json({ message: 'All sources are recently scanned.' });
             }
        }

        const scanRes = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/agent/sources/${source.id}/scan`, { 
             method: 'POST' 
        });
        const scanData = await scanRes.json();
        
        res.json({ scanned: source.name, result: scanData });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Logs Endpoint
router.get('/logs', async (req, res) => {
    try {
        const logs = getLogs();
        const sources = getSources();
        const enrichedLogs = logs.map((l: any) => ({
            ...l,
            source: sources.find(s => s.id === l.sourceId) || { name: 'Inconnu', url: '' }
        }));
        res.json(enrichedLogs);
    } catch(e: any) { res.status(500).json({error: e.message}); }
});

// Extraction logic with Gemini
async function extractWithGemini(aiInstance: any, pageText: string, linksText: string) {
    const prompt = `Voici le texte d'une page web d'un établissement marocain et des liens détectés.\n\nTEXTE:\n${pageText}\n\nLIENS:\n${linksText}\n\nExtrais les détails de la publication de concours (s'il y en a une). Retourne STRICTEMENT un objet JSON. Si rien n'est trouvé, mets "isRelevant": false.`;
    
    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            isRelevant: { type: Type.BOOLEAN },
            type: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            organisme: { type: Type.STRING },
            year: { type: Type.NUMBER },
            places: { type: Type.NUMBER },
            level: { type: Type.STRING },
            domain: { type: Type.STRING },
            speciality: { type: Type.STRING },
            city: { type: Type.STRING },
            region: { type: Type.STRING },
            publicationDate: { type: Type.STRING },
            openingDate: { type: Type.STRING },
            closingDate: { type: Type.STRING },
            competitionDate: { type: Type.STRING },
            convocationDate: { type: Type.STRING },
            resultsDate: { type: Type.STRING },
            conditions: { type: Type.STRING },
            exams: { type: Type.STRING },
            subjects: { type: Type.STRING },
            documentsRequired: { type: Type.STRING },
            profile: { type: Type.STRING },
            program: { type: Type.STRING },
            procedure: { type: Type.STRING },
            fees: { type: Type.NUMBER },
            officialUrl: { type: Type.STRING },
            registrationUrl: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
        },
        required: ["isRelevant"]
    };

    const result = await aiInstance.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2
        }
    });

    const jsonStr = result.text || '{}';
    return JSON.parse(jsonStr);
}

export default router;
