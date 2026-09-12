import { DatabaseShape } from './db';
import * as XLSX from 'xlsx';

export interface Competition {
  id: string;
  title: string;
  organizationName: string;
  organizationType: string;
  city: string;
  publishStatus: string;
  registrationDeadline?: string;
  level: string;
  domaine?: string;
  year: number;
}

// Export all data from the database to an Excel file with multiple sheets
export function exportGlobalExcel(db: DatabaseShape, _user: any): number {
  const competitions = db.competitions.map((c: Competition) => ({
    'ID': c.id,
    'Titre': c.title,
    'Organisme': c.organizationName,
    'Type': c.organizationType,
    'Ville': c.city,
    'Statut': c.publishStatus,
    'Date limite': c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('fr-MA') : '',
    'Niveau': c.level,
    'Domaine': c.domaine,
    'Annee': c.year,
  }));

  const schools = db.schools.map((s: any) => ({
    'ID': s.id,
    'Nom': s.name,
    'Type': s.type,
    'Ville': s.city,
    'Region': s.region,
    'Domaine': s.domaine,
    'Niveau': s.level,
    'Effectif': s.places,
  }));

  const universities = db.universities.map((u: any) => ({
    'ID': u.id,
    'Nom': u.name,
    'Short Name': u.shortName,
    'Region': u.region,
    'Ville': u.city,
    'Ministere': u.ministryId,
  }));

  const ministries = db.ministries.map((m: any) => ({
    'ID': m.id,
    'Nom': m.name,
    'Short Name': m.shortName,
    'Type': m.type,
  }));

  const sheets = [['Concours', competitions], ['Ecoles', schools], ['Universites', universities], ['Ministeres', ministries]];
  const workbook = XLSX.utils.book_new();
  sheets.forEach(([name, data]) => {
    const worksheet = XLSX.utils.json_to_sheet(data as any);
    XLSX.utils.book_append_sheet(workbook, worksheet as any, name as string);
  });

  // Generate and download file
  const fileName = 'concours-complets-' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(workbook as any, fileName);

  // Return row count for logging
  let totalRows = 0;
  totalRows += competitions.length;
  totalRows += schools.length;
  totalRows += universities.length;
  totalRows += ministries.length;
  return totalRows;
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
    'Date limite': c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('fr-MA') : '',
    'Niveau': c.level,
    'Domaine': c.domaine,
    'Annee': c.year,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData as any);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet as any, 'Concours Filtres');

  const fileName = 'concours-filtres-' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(workbook as any, fileName);

  return worksheetData.length;
}