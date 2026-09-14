const fs = require('fs');

const content = fs.readFileSync('src/data/institutionsData.ts', 'utf8');

// I'll parse the file using regex or simple script to find the duplicated schools and remove the ones I just inserted.
