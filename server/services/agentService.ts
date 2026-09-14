import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const SOURCES_FILE = path.join(DATA_DIR, 'agent_sources.json');
const LOGS_FILE = path.join(DATA_DIR, 'agent_logs.json');
const COMPETITIONS_FILE = path.join(DATA_DIR, 'competitions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const INITIAL_SOURCES = [
  {
    id: "src-1",
    name: "Almaster Maroc",
    url: "https://www.almaster-maroc.com/",
    type: "HTML",
    isActive: true,
    status: "OK",
    createdAt: new Date().toISOString()
  },
  {
    id: "src-2",
    name: "Supmaroc",
    url: "https://www.supmaroc.com/",
    type: "HTML",
    isActive: true,
    status: "OK",
    createdAt: new Date().toISOString()
  },
  {
    id: "src-3",
    name: "Master Maroc",
    url: "https://master-maroc.com/",
    type: "HTML",
    isActive: true,
    status: "OK",
    createdAt: new Date().toISOString()
  },
  {
    id: "src-4",
    name: "9rayti",
    url: "https://www.9rayti.com/",
    type: "HTML",
    isActive: true,
    status: "OK",
    createdAt: new Date().toISOString()
  },
  {
    id: "src-5",
    name: "Orientation Chabab",
    url: "https://www.orientation-chabab.com/",
    type: "HTML",
    isActive: true,
    status: "OK",
    createdAt: new Date().toISOString()
  }
];

export function getSources() {
  ensureDataDir();
  try {
    if (fs.existsSync(SOURCES_FILE)) {
      const content = fs.readFileSync(SOURCES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading sources file:', err);
  }
  // Initialize with seed
  saveSources(INITIAL_SOURCES);
  return INITIAL_SOURCES;
}

export function saveSources(sources: any[]) {
  ensureDataDir();
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8');
}

export function getLogs() {
  ensureDataDir();
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const content = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {}
  return [];
}

export function saveLogs(logs: any[]) {
  ensureDataDir();
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
}

export function addLog(sourceId: string, action: string, message: string, level = 'INFO') {
  const logs = getLogs();
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sourceId,
    action,
    message,
    level,
    createdAt: new Date().toISOString()
  });
  saveLogs(logs);
}

export function getCompetitions() {
  ensureDataDir();
  try {
    if (fs.existsSync(COMPETITIONS_FILE)) {
      const content = fs.readFileSync(COMPETITIONS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {}
  return [];
}

export function saveCompetitions(comps: any[]) {
  ensureDataDir();
  fs.writeFileSync(COMPETITIONS_FILE, JSON.stringify(comps, null, 2), 'utf-8');
}

export function upsertCompetition(data: any, rootSourceUrl: string) {
  const comps = getCompetitions();
  const year = data.year || new Date().getFullYear();
  const sourceUrl = data.sourceUrl || data.officialUrl || rootSourceUrl;
  
  const existingIdx = comps.findIndex((c: any) => 
    c.source_url === sourceUrl || (c.title === data.title && c.year === year)
  );
  
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
    registration_start: data.openingDate || null,
    registration_deadline: data.closingDate || null,
    competition_date: data.competitionDate || null,
    convocation_date: data.convocationDate || null,
    results_date: data.resultsDate || null,
    published_at: data.publicationDate || new Date().toISOString(),
    official_website: data.officialUrl,
    registration_url: data.registrationUrl,
    source_url: sourceUrl,
    verification_status: status,
    organization_type: 'INSTITUTION'
  };

  if (existingIdx !== -1) {
    comps[existingIdx] = { ...comps[existingIdx], ...payload };
    saveCompetitions(comps);
    return { action: 'UPDATE' };
  } else {
    comps.unshift({
      ...payload,
      id: `comp-${Date.now()}`,
      slug: `${data.organisme || 'org'}-${data.title || 'concours'}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: 'AUTRE',
      views: 0,
      is_demo: false,
      createdAt: new Date().toISOString()
    });
    saveCompetitions(comps);
    return { action: 'CREATE' };
  }
}
