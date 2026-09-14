const fs = require('fs');

let content = fs.readFileSync('server/services/mastersService.ts', 'utf8');

// Insert import at the top
if (!content.includes('import { runAlmasterImport }')) {
  content = `import { runAlmasterImport } from './almasterImporter.js';\n` + content;
}

// Replace syncMastersFromAlMaster
const startStr = 'export async function syncMastersFromAlMaster(): Promise<SyncSummaryData> {';
const endStr = 'export function createMaster(data: Partial<MasterItem>): MasterItem {';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newFunction = `export async function syncMastersFromAlMaster(): Promise<SyncSummaryData> {
  return await runAlmasterImport();
}

`;
  const newContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
  fs.writeFileSync('server/services/mastersService.ts', newContent);
  console.log('Replaced successfully');
} else {
  console.log('Could not find boundaries');
}
