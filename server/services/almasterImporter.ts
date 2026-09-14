import * as cheerio from 'cheerio';
import { 
  MasterItem, 
  SyncSummaryData, 
  getMastersStore, 
  saveMastersStore, 
  saveSyncLog, 
  generateUniqueKey,
  computeMasterStatus,
  enrichMasterWithSchoolInfo
} from './mastersService.js';
import { REAL_SCHOOLS, REAL_UNIVERSITIES } from '../../src/data/institutionsData.js';

// Convert month names in French to numbers
const MONTHS: Record<string, string> = {
  'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
  'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
  'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
};

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function extractInstitution(title: string, tags: string[]) {
  const searchStr = normalizeStr(tags.join(' ') + ' ' + title);
  
  let bestSchool = null;
  let maxScore = 0;

  for (const school of REAL_SCHOOLS) {
    let score = 0;
    const aliases = [school.name, school.shortName, ...(school.aliases || [])].map(normalizeStr);
    for (const alias of aliases) {
      if (alias.length > 2 && searchStr.includes(alias)) {
        score += alias.length;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestSchool = school;
    }
  }

  let univ = 'Université Marocaine';
  let estab = 'Établissement Universitaire';
  let city = 'Maroc';

  if (bestSchool) {
    estab = bestSchool.name;
    city = bestSchool.city || 'Maroc';
    const foundUniv = REAL_UNIVERSITIES.find(u => u.id === bestSchool.universityId);
    if (foundUniv) {
      univ = foundUniv.name;
    }
  } else {
    for (const tag of tags) {
      const cities = ['Rabat', 'Casablanca', 'Fès', 'Marrakech', 'Oujda', 'Tanger', 'Agadir', 'Meknès', 'Kénitra', 'Tétouan', 'Settat', 'Mohammedia'];
      const cMatch = cities.find(c => normalizeStr(tag) === normalizeStr(c));
      if (cMatch) city = cMatch;
    }
  }

  return { univ, estab, city, bestSchool };
}

function extractDates(text: string) {
  // Look for DD/MM/YYYY or DD Mois YYYY
  const dateRegex = /([0-9]{1,2})[\s\/-]+([a-zA-Zéû]+|[0-9]{1,2})[\s\/-]+(202[4-9])/gi;
  let deadlineDate = null;
  let examDate = null;
  
  let match;
  const datesFound = [];
  while ((match = dateRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0');
    let month = match[2].toLowerCase();
    if (MONTHS[month]) month = MONTHS[month];
    else month = month.padStart(2, '0');
    const year = match[3];
    
    // Check if valid month
    if (parseInt(month) >= 1 && parseInt(month) <= 12) {
      datesFound.push({
        date: `${year}-${month}-${day}T23:59:59.000Z`,
        index: match.index
      });
    }
  }

  // Very naive extraction: just take the dates and see context
  for (const d of datesFound) {
    const context = normalizeStr(text.substring(Math.max(0, d.index - 50), d.index + 50));
    if (context.includes('limite') || context.includes('delai') || context.includes('jusqu') || context.includes('avant')) {
      deadlineDate = d.date;
    } else if (context.includes('concours') || context.includes('ecrit') || context.includes('epreuve')) {
      examDate = d.date;
    }
  }
  
  // If we only found one date and no deadline is set, set it as deadline
  if (datesFound.length === 1 && !deadlineDate) {
    deadlineDate = datesFound[0].date;
  }

  return { deadlineDate, examDate };
}

function cleanTitle(title: string) {
  return title
    .replace(/Résultats Définitifs/gi, '')
    .replace(/Résultats/gi, '')
    .replace(/Avis de concours/gi, '')
    .replace(/Concours d'accès/gi, '')
    .replace(/Concours/gi, '')
    .replace(/202[0-9]-202[0-9]/g, '')
    .replace(/202[0-9]\/202[0-9]/g, '')
    .replace(/202[0-9]/g, '')
    .replace(/au Cycle Master et Master Spécialisé/gi, '')
    .replace(/au Cycle Master/gi, '')
    .trim()
    .replace(/^[-:/]+|[-:/]+$/g, '')
    .trim();
}

export async function runAlmasterImport(): Promise<SyncSummaryData> {
  const currentMasters = getMastersStore();
  const mastersMap = new Map<string, MasterItem>();
  for (const m of currentMasters) {
    mastersMap.set(m.uniqueKey, m);
  }

  const summary: SyncSummaryData = {
    id: `sync-${Date.now()}`,
    createdAt: new Date().toISOString(),
    totalFound: 0,
    newCount: 0,
    updatedCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    openCount: 0,
    upcomingCount: 0,
    closedCount: 0,
    examUpcomingCount: 0,
    resultsCount: 0,
    informationCount: 0,
    details: []
  };

  const API_URL = 'https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=150';
  
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    const entries = data.feed?.entry || [];
    summary.totalFound = entries.length;

    for (const entry of entries) {
      try {
        const title = entry.title.$t;
        const html = entry.content.$t;
        const tags = entry.category ? entry.category.map((c: any) => c.term) : [];
        const sourceUrl = entry.link.find((l: any) => l.rel === 'alternate')?.href || 'https://www.almaster-maroc.com/';
        const publishedDate = entry.published.$t;
        
        // Skip irrelevant posts
        if (!normalizeStr(title).includes('master')) continue;
        
        const $ = cheerio.load(html);
        const text = $.text();
        
        const { univ, estab, city, bestSchool } = extractInstitution(title, tags);
        const name = cleanTitle(title) || 'Master Universitaire';
        const { deadlineDate, examDate } = extractDates(text);
        
        // Find official URL
        let officialUrl = null;
        $('a').each((_, a) => {
          const href = $(a).attr('href');
          if (href && (href.includes('.ac.ma') || href.includes('.ma')) && !href.includes('almaster-maroc.com')) {
            officialUrl = href;
          }
        });

        const year = '2026-2027';
        const key = generateUniqueKey(univ, estab, name, year);

        // Determine Status
        let forcedStatus = null;
        if (normalizeStr(title).includes('resultat')) forcedStatus = 'RESULTATS';
        
        const computedStatus = forcedStatus || computeMasterStatus({
          openingDate: null,
          deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
          examDate: examDate ? new Date(examDate) : null,
          resultsDate: null
        });

        if (mastersMap.has(key)) {
          const existing = mastersMap.get(key)!;
          existing.status = computedStatus;
          if (deadlineDate) existing.deadlineDate = deadlineDate;
          if (examDate) existing.examDate = examDate;
          if (officialUrl) existing.officialUrl = officialUrl;
          existing.sourceUrl = sourceUrl;
          existing.updatedAt = new Date().toISOString();
          
          summary.updatedCount++;
          summary.duplicateCount++;
        } else {
          const newMaster: MasterItem = {
            id: `mst-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            uniqueKey: key,
            name: name,
            university: univ,
            establishment: estab,
            city: city,
            domain: 'Sciences & Technologies', // Default, difficult to guess purely from Almaster title
            level: normalizeStr(title).includes('specialis') ? 'Master Spécialisé' : 'Master',
            academicYear: year,
            openingDate: null,
            deadlineDate: deadlineDate,
            examDate: examDate,
            publicationDate: publishedDate,
            resultsDate: null,
            conditions: 'Voir l\'annonce officielle pour les conditions détaillées.',
            documents: 'Consultez la plateforme de candidature pour la liste des pièces.',
            seats: null,
            officialUrl: officialUrl,
            sourceUrl: sourceUrl,
            status: computedStatus,
            schoolId: bestSchool?.id,
            schoolSlug: bestSchool?.slug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          mastersMap.set(key, enrichMasterWithSchoolInfo(newMaster));
          summary.newCount++;
        }
      } catch (err: any) {
        summary.errorCount++;
        summary.details.push(`Erreur sur "${entry.title?.$t}": ${err.message}`);
      }
    }

  } catch (err: any) {
    summary.errorCount++;
    summary.details.push(`Erreur fatale lors de la synchronisation: ${err.message}`);
  }

  // Count statuses
  const allFinalMasters = Array.from(mastersMap.values());
  for (const m of allFinalMasters) {
    if (m.status === 'OUVERT') summary.openCount++;
    else if (m.status === 'A_VENIR') summary.upcomingCount++;
    else if (m.status === 'FERME') summary.closedCount++;
    else if (m.status === 'CONCOURS_A_VENIR') summary.examUpcomingCount++;
    else if (m.status === 'RESULTATS') summary.resultsCount++;
    else summary.informationCount++;
  }

  saveMastersStore(allFinalMasters);
  saveSyncLog(summary);
  return summary;
}
