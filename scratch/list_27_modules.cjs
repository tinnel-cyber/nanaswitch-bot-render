const fs = require('fs');
const txt = fs.readFileSync('src/config/appRegistry.ts', 'utf8');

// Extraction des blocs
const regex = /id:\s*'([^']+)',\s*slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*route:\s*'([^']*)',\s*category:\s*'([^']+)',[\s\S]*?type:\s*'([^']+)'/g;

let match;
let count = 0;
while ((match = regex.exec(txt)) !== null) {
  count++;
  console.log(`${count}. [${match[6]}] ID: ${match[1]} | Nom: "${match[3]}" | Catégorie: ${match[5]}`);
}
