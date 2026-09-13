import express from 'express';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

function getValidSupabaseUrl(): string {
    const candidates = [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL];
    for (const c of candidates) {
        if (typeof c === 'string' && (c.startsWith('http://') || c.startsWith('https://'))) {
            return c;
        }
    }
    return 'https://lixxittkqacsmjntebip.supabase.co';
}

function getValidSupabaseKey(): string {
    const candidates = [
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        process.env.VITE_SUPABASE_ANON_KEY,
        process.env.VITE_SUPABASE_URL // in case user placed key in VITE_SUPABASE_URL
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim().length > 10 && !c.startsWith('http')) {
            return c.trim();
        }
    }
    return 'placeholder-key';
}

const supabaseUrl = getValidSupabaseUrl();
const supabaseKey = getValidSupabaseKey();
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// GET /sources
router.get('/sources', async (req, res) => {
    try {
        const { data: sources, error } = await supabase.from('agent_sources').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        // Fetch latest 5 logs for each source
        const { data: logs, error: logsError } = await supabase.from('agent_logs').select('*').order('created_at', { ascending: false });
        if (!logsError && logs) {
            sources.forEach(s => {
                s.logs = logs.filter(l => l.sourceId === s.id).slice(0, 5);
            });
        }

        res.json(sources || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /sources
router.post('/sources', async (req, res) => {
    try {
        const { data, error } = await supabase.from('agent_sources').insert([req.body]).select();
        if (error) throw error;
        res.json(data?.[0]);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /sources/:id
router.put('/sources/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('agent_sources').update(req.body).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(data?.[0]);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /sources/:id/scan
router.post('/sources/:id/scan', async (req, res) => {
    const isDryRun = req.query.dryRun === 'true' || process.env.DRY_RUN === 'true';
    try {
        const sourceId = req.params.id;
        const { data: source, error: sourceError } = await supabase.from('agent_sources').select('*').eq('id', sourceId).single();
        if (sourceError || !source) return res.status(404).json({ error: 'Source not found' });

        await logAction(source.id, 'SCAN', `Démarrage du scan de ${source.name} (${source.url})`);

        // 1. Fetch source
        const fetchRes = await fetch(source.url);
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
        const html = await fetchRes.text();
        const $ = cheerio.load(html);

        // 2. Hash check (simple diff detection)
        const contentText = $('body').text().replace(/\s+/g, ' ').trim();
        const currentHash = crypto.createHash('md5').update(contentText).digest('hex');
        
        if (source.contentHash === currentHash) {
            await logAction(source.id, 'SCAN', `Aucun changement détecté sur la source.`);
            await supabase.from('agent_sources').update({ lastCheckAt: new Date(), status: 'OK' }).eq('id', source.id);
            return res.json({ status: 'UNCHANGED' });
        }

        // 3. Extract links and text
        const relevantLinks: string[] = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().toLowerCase();
            if (href && (text.includes('concours') || text.includes('inscription') || text.includes('avis') || text.includes('admission'))) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, source.url).toString();
                relevantLinks.push(`${$(el).text().trim()}: ${fullUrl}`);
            }
        });

        // 4. Send to Gemini for Extraction
        await logAction(source.id, 'DETECT', `Analyse IA en cours (${relevantLinks.length} liens suspects trouvés)...`);
        
        const extractedData = await extractWithGemini(contentText.substring(0, 50000), relevantLinks.join('\n'));

        if (!extractedData || !extractedData.isRelevant) {
             await supabase.from('agent_sources').update({ lastCheckAt: new Date(), contentHash: currentHash, status: 'OK' }).eq('id', source.id);
             await logAction(source.id, 'DETECT', `Aucun nouveau concours trouvé.`);
             return res.json({ status: 'NO_COMPETITION_FOUND' });
        }

        // 5. UPSERT Data
        if (isDryRun) {
            await logAction(source.id, 'UPSERT', `(DRY RUN) Mode simulation. Action évitée: UPSERT de "${extractedData.title}"`);
            return res.json({ status: 'DRY_RUN', data: extractedData });
        }

        const upsertResult = await processUpsert(extractedData, source.url);
        
        await supabase.from('agent_sources').update({
            lastCheckAt: new Date(), lastUpdateAt: new Date(), contentHash: currentHash, status: 'OK'
        }).eq('id', source.id);

        res.json({ status: upsertResult.action, data: extractedData });

    } catch (e: any) {
        await logAction(req.params.id, 'ERROR', e.message, 'ERROR');
        await supabase.from('agent_sources').update({ status: 'ERROR', lastError: e.message }).eq('id', req.params.id);
        res.status(500).json({ error: e.message });
    }
});

// POST /cron - Processes one outdated source at a time
router.post('/cron', async (req, res) => {
    try {
        // Find the oldest checked active source
        const { data: sources, error } = await supabase.from('agent_sources')
            .select('*')
            .eq('isActive', true)
            .order('lastCheckAt', { ascending: true, nullsFirst: true })
            .limit(1);

        if (error) throw error;
        if (!sources || sources.length === 0) {
            return res.json({ message: 'No active sources to scan.' });
        }

        const source = sources[0];
        
        // Ensure we don't scan if it was scanned less than 1 hour ago to avoid spam
        if (source.lastCheckAt) {
             const hoursSinceLastCheck = (new Date().getTime() - new Date(source.lastCheckAt).getTime()) / (1000 * 60 * 60);
             if (hoursSinceLastCheck < 1) {
                 return res.json({ message: 'All sources are recently scanned.' });
             }
        }

        // Redirect internally to the scan logic
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
        const { data: logs, error } = await supabase.from('agent_logs').select(`
            *,
            source:sourceId (name, url)
        `).order('createdAt', { ascending: false }).limit(50);
        
        if (error) throw error;
        res.json(logs);
    } catch(e: any) { res.status(500).json({error: e.message}); }
});

async function logAction(sourceId: string, action: string, message: string, level = 'INFO') {
    console.log(`[AI-AGENT] ${action} - ${message}`);
    await supabase.from('agent_logs').insert([{
        sourceId, action, message, level
    }]);
}

// Extraction logic with Gemini
async function extractWithGemini(pageText: string, linksText: string) {
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

    const result = await ai.models.generateContent({
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

// Check duplicates and Update/Create
async function processUpsert(data: any, rootSourceUrl: string) {
    const year = data.year || new Date().getFullYear();
    const sourceUrl = data.sourceUrl || data.officialUrl || rootSourceUrl;

    const { data: existingRecords } = await supabase.from('competitions')
        .select('id, title, year, source_url')
        .or(`source_url.eq.${sourceUrl},and(title.eq.${data.title},year.eq.${year})`);
    
    const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    let status = 'UNVERIFIED';
    if (data.confidence >= 90) status = 'VERIFIED';
    else if (data.confidence >= 70) status = 'A_VERIFIER';

    const payload = {
        title: data.title || "Concours Inconnu",
        description: data.description || "",
        organization_name: data.organisme || "",
        year,
        places: data.places || 0,
        level: data.level || "",
        domaine: data.domain || "",
        city: data.city || "",
        region: data.region || "",
        registration_start: data.openingDate ? new Date(data.openingDate) : null,
        registration_deadline: data.closingDate ? new Date(data.closingDate) : null,
        competition_date: data.competitionDate ? new Date(data.competitionDate) : null,
        convocation_date: data.convocationDate ? new Date(data.convocationDate) : null,
        results_date: data.resultsDate ? new Date(data.resultsDate) : null,
        published_at: data.publicationDate ? new Date(data.publicationDate) : new Date(),
        official_website: data.officialUrl,
        registration_url: data.registrationUrl,
        source_url: sourceUrl,
        verification_status: status,
        organization_type: 'INSTITUTION'
    };

    if (existing) {
        // UPDATE
        await supabase.from('competitions').update(payload).eq('id', existing.id);
        return { action: 'UPDATE' };
    } else {
        // CREATE
        const slug = `${data.organisme || 'org'}-${data.title || 'concours'}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await supabase.from('competitions').insert([{
            ...payload,
            slug,
            category: 'AUTRE',
            views: 0,
            is_demo: false
        }]);
        return { action: 'CREATE' };
    }
}

export default router;
