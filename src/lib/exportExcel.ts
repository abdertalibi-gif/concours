import { DatabaseShape } from './db';
import type { Competition } from './types';
import * as XLSX from 'xlsx';

const formatDate = (isoStr?: string | null) => {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('fr-MA');
  } catch {
    return '';
  }
};

const formatArray = (arr?: string[] | null) => {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(' ; ');
};

// Export all data from the database to an Excel file with multiple sheets
export function exportGlobalExcel(db: DatabaseShape, _user: any): number {
  const getMinistryName = (id?: string) => {
    if (!id) return '';
    return db.ministries.find(m => m.id === id)?.name || id;
  };

  const competitions = db.competitions.map((c: Competition) => ({
    'ID': c.id,
    'Concours': c.title,
    'Organisme': c.organizationName,
    'Type organisme': c.organizationType,
    'Ministère': getMinistryName(c.ministryId),
    'Catégorie': c.category,
    'Année': c.year,
    'Places': c.places,
    'Niveau': c.level,
    'Domaine': c.domaine || '',
    'Ville': c.city,
    'Région': c.region || '',
    'Date publication': formatDate(c.publishedAt),
    'Date ouverture': formatDate(c.registrationStart),
    'Date clôture': formatDate(c.registrationDeadline),
    'Date concours': formatDate(c.competitionDate),
    'Date convocation': formatDate(c.convocationDate),
    'Date résultats': formatDate(c.resultsDate),
    'Conditions': formatArray(c.conditions),
    'Épreuves': formatArray(c.epreuves),
    'Matières': formatArray(c.matieres),
    'Documents demandés': formatArray(c.documentsDemandes),
    'Profil': c.profil || '',
    'Programme': c.programme || '',
    'Procédure': c.procedure || '',
    'Frais': c.frais || '',
    'Site officiel': c.officialWebsite || '',
    'Lien inscription': c.registrationUrl || '',
    'URL source': c.sourceUrl || '',
    'Statut': c.publishStatus,
    'Vérification': c.verificationStatus,
    'Dernière mise à jour': formatDate(c.updatedAt),
  }));

  const schools = db.schools.map((s: any) => ({
    'ID': s.id,
    'Nom': s.name,
    'Type': s.type,
    'Ville': s.city,
    'Region': s.region,
    'Ministere': getMinistryName(s.ministryId),
    'Effectif': s.students || '',
  }));

  const universities = db.universities.map((u: any) => ({
    'ID': u.id,
    'Nom': u.name,
    'Short Name': u.shortName,
    'Region': u.region,
    'Ville': u.city,
    'Ministere': getMinistryName(u.ministryId),
  }));

  const ministries = db.ministries.map((m: any) => ({
    'ID': m.id,
    'Nom': m.name,
    'Short Name': m.shortName,
    'Website': m.website || '',
  }));

  const statistics = [
    { 'Métrique': 'Total Concours', 'Valeur': db.competitions.length },
    { 'Métrique': 'Concours Publiés', 'Valeur': db.competitions.filter(c => c.publishStatus === 'PUBLISHED').length },
    { 'Métrique': 'Total Écoles', 'Valeur': db.schools.length },
    { 'Métrique': 'Total Universités', 'Valeur': db.universities.length },
    { 'Métrique': 'Total Ministères', 'Valeur': db.ministries.length },
  ];

  const sheets = [
    ['Concours', competitions], 
    ['Organismes', schools], 
    ['Universités', universities], 
    ['Ministères', ministries],
    ['Statistiques', statistics]
  ];
  
  const workbook = XLSX.utils.book_new();
  sheets.forEach(([name, data]) => {
    const worksheet = XLSX.utils.json_to_sheet(data as any);
    XLSX.utils.book_append_sheet(workbook, worksheet as any, name as string);
  });

  // Generate and download file
  const fileName = 'concours-complets-' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(workbook as any, fileName);

  // Return row count for logging
  return competitions.length + schools.length + universities.length + ministries.length;
}

// Export filtered competitions to an Excel file
export function exportFilteredExcel(filteredCompetitions: Competition[]): number {
  const worksheetData = filteredCompetitions.map((c: Competition) => ({
    'ID': c.id,
    'Titre': c.title,
    'Organisme': c.organizationName,
    'Type': c.organizationType,
    'Ville': c.city,
    'Statut': c.publishStatus,
    'Date limite': formatDate(c.registrationDeadline),
    'Niveau': c.level,
    'Domaine': c.domaine || '',
    'Annee': c.year,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData as any);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet as any, 'Concours Filtres');

  const fileName = 'concours-filtres-' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(workbook as any, fileName);

  return worksheetData.length;
}