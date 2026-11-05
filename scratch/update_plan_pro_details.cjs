const fs = require('fs');

// 1. types.ts
let types = fs.readFileSync('src/types.ts', 'utf8').replace(/\r\n/g, '\n');
types = types.replace(
  /"Gestion jusqu'à 10 caissiers \(PIN\)"/,
  '"Gestion jusqu\'à 5 caissiers avec code PIN"'
);
types = types.replace(
  /"Étudiants & Formations illimités"/,
  '"Jusqu\'à 50 cours hébergés & élèves illimités"'
);
types = types.replace(
  /"Caisse POS & Produits illimités",\n\s*"Jusqu'à 50 cours hébergés & élèves illimités",\n\s*"Module CV Pro inclus en illimité",\n\s*"Gestion jusqu'à 5 caissiers avec code PIN"/,
  '"Caisse POS & Produits illimités",\n          "10 Tunnels de vente (Option à l\'usage)",\n          "Jusqu\'à 50 cours hébergés & élèves illimités",\n          "Gestion jusqu\'à 5 caissiers (PIN)",\n          "Module CV Pro inclus en illimité"'
);
fs.writeFileSync('src/types.ts', types, 'utf8');

// 2. firestoreService.ts
let firestore = fs.readFileSync('src/utils/firestoreService.ts', 'utf8').replace(/\r\n/g, '\n');
firestore = firestore.replace(
  /'Gestion jusqu\'à 10 caissiers \(PIN\)'/,
  "'Gestion jusqu\\'à 5 caissiers (PIN)'"
);
firestore = firestore.replace(
  /'Étudiants & Formations illimités'/,
  "'Jusqu\\'à 50 cours hébergés & élèves illimités'"
);
firestore = firestore.replace(
  /'Caisse POS & Produits illimités',\n\s*'Jusqu\\'à 50 cours hébergés & élèves illimités',\n\s*'Module CV Pro inclus en illimité',\n\s*'Gestion jusqu\\'à 5 caissiers \(PIN\)'/,
  "'Caisse POS & Produits illimités',\n        '10 Tunnels de vente (Option à l\\'usage)',\n        'Jusqu\\'à 50 cours hébergés & élèves illimités',\n        'Gestion jusqu\\'à 5 caissiers (PIN)',\n        'Module CV Pro inclus en illimité'"
);

// Mettre à jour les limits du Plan Pro dans firestoreService
firestore = firestore.replace(
  /id: 'starter'[\s\S]*?limits: \{\n\s*maxProducts: -1,\n\s*maxFunnels: \d+,\n\s*maxCourses: -?\d+,\n\s*maxLiveShoppingSessions: \d+,\n\s*customDomainAllowed: true,\n\s*aiAssistanceQueries: \d+,\n\s*docusignInvoices: \d+,\n\s*maxCashiers: \d+/,
  (match) => {
    return match
      .replace(/maxFunnels: \d+/, 'maxFunnels: 10')
      .replace(/maxCourses: -?\d+/, 'maxCourses: 50')
      .replace(/maxCashiers: \d+/, 'maxCashiers: 5');
  }
);
fs.writeFileSync('src/utils/firestoreService.ts', firestore, 'utf8');

console.log('types.ts and firestoreService.ts updated successfully');
