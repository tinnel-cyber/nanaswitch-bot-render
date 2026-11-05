const fs = require('fs');
let f = fs.readFileSync('src/utils/firestoreService.ts', 'utf8').replace(/\r\n/g, '\n');
f = f.replace(
  /'Caisse POS & Produits illimités',\n\s*'Jusqu\\'à 50 cours hébergés & élèves illimités',\n\s*'Module CV Pro inclus en illimité',\n\s*'Gestion jusqu\\'à 10 caissiers \(PIN\)'/,
  "'Caisse POS & Produits illimités',\n        '10 Tunnels de vente (Option à l\\'usage)',\n        'Jusqu\\'à 50 cours hébergés & élèves illimités',\n        'Gestion jusqu\\'à 5 caissiers (PIN)',\n        'Module CV Pro inclus en illimité'"
);
fs.writeFileSync('src/utils/firestoreService.ts', f, 'utf8');
console.log('Fixed firestoreService.ts list successfully');
