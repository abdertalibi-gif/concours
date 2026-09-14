const fs = require('fs');

const file = 'src/data/institutionsData.ts';
const content = fs.readFileSync(file, 'utf8');

const duplicates = [
  "ec-ensam-casablanca",
  "ec-ensam-meknes",
  "ec-enset-mohammedia",
  "ec-ens-rabat",
  "ec-est-casablanca",
  "ec-est-fes",
  "ec-est-sale",
  "ec-fst-fes",
  "ec-fst-marrakech",
  "ec-fst-mohammedia"
];

let updatedContent = content;

// In the newly inserted block, these have a specific shape (no officialLogo, simple structure).
// We can find them by searching for: id: 'DUPLICATE_ID'
// Let's just remove the first occurrence of each duplicate (which is the one I generated)
duplicates.forEach(dupId => {
  const regex = new RegExp(`\\{\\s*id:\\s*'${dupId}'.*?\\},`, 's');
  updatedContent = updatedContent.replace(regex, '');
});

fs.writeFileSync(file, updatedContent);
console.log('Fixed duplicates');
