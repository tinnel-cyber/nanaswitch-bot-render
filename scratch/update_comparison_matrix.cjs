const fs = require('fs');

// Normalise et met à jour comparisonMatrixData.ts
let code = fs.readFileSync('src/data/comparisonMatrixData.ts', 'utf8').replace(/\r\n/g, '\n');

// 1. Tunnels de vente : 10 tunnels & Option à l'usage sur le Plan Pro (et starter)
code = code.replace(
  /id: 'feat_funnels_limit',\n\s*name: 'Tunnels de Vente Haute Conversion',\n\s*category: 'ecommerce',\n\s*isVipCrown: true,\n\s*tooltip: 'Pages de capture, One-Click Upsell et Order Bump pour maximiser le panier moyen\.',\n\s*free: '1 tunnel',\n\s*starter: '[^']*',\n\s*pro: '[^']*',\n\s*elite: 'Illimité'/,
  "id: 'feat_funnels_limit',\n    name: 'Tunnels de Vente Haute Conversion',\n    category: 'ecommerce',\n    isVipCrown: true,\n    tooltip: 'Pages de capture, One-Click Upsell et Order Bump pour maximiser le panier moyen.',\n    free: '1 tunnel',\n    starter: '10 tunnels (Option à l\\'usage)',\n    pro: '10 tunnels (Option à l\\'usage)',\n    elite: 'Illimité'"
);

// 2. Multi-vendeurs & Caissiers : 5 caissiers sur le Plan Pro
code = code.replace(
  /id: 'feat_cashiers_pin',\n\s*name: 'Multi-Vendeurs & Caissiers avec Code PIN',\n\s*category: 'ecommerce',\n\s*isVipCrown: true,\n\s*tooltip: 'Comptes d\'accès dédiés avec verrouillage PIN individuel pour vos employés\.',\n\s*free: '1 caissier',\n\s*starter: '[^']*',\n\s*pro: '[^']*',\n\s*elite: 'Illimité'/,
  "id: 'feat_cashiers_pin',\n    name: 'Multi-Vendeurs & Caissiers avec Code PIN',\n    category: 'ecommerce',\n    isVipCrown: true,\n    tooltip: 'Comptes d\\'accès dédiés avec verrouillage PIN individuel pour vos employés.',\n    free: '1 caissier',\n    starter: '5 caissiers',\n    pro: '5 caissiers',\n    elite: 'Illimité'"
);

// 3. Formations hébergées : 50 cours sur le Plan Pro
code = code.replace(
  /id: 'feat_courses_limit',\n\s*name: 'Nombre de Formations Hébergées',\n\s*category: 'elearning',\n\s*isVipCrown: false,\n\s*tooltip: 'Nombre de cours en ligne complets avec vidéos, quiz et devoirs\.',\n\s*free: '1 cours',\n\s*starter: '[^']*',\n\s*pro: '[^']*',\n\s*elite: 'Illimité'/,
  "id: 'feat_courses_limit',\n    name: 'Nombre de Formations Hébergées',\n    category: 'elearning',\n    isVipCrown: false,\n    tooltip: 'Nombre de cours en ligne complets avec vidéos, quiz et devoirs.',\n    free: '1 cours',\n    starter: '50 cours',\n    pro: '50 cours',\n    elite: 'Illimité'"
);

fs.writeFileSync('src/data/comparisonMatrixData.ts', code, 'utf8');
console.log('src/data/comparisonMatrixData.ts updated successfully');
