const fs = require('fs');
const path = require('path');

// 1. Patch src/components/common/AppSidebar.tsx
const sidebarPath = path.resolve('src/components/common/AppSidebar.tsx');
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

// Remplacer Sparkles dans le bouton solutions
sidebarContent = sidebarContent.replace(
  /<Sparkles className="w-3\.5 h-3\.5 text-cyan-300 animate-pulse" \/>/g,
  '<LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />'
);

// Remplacer 36 Solutions par 27 Solutions
sidebarContent = sidebarContent.replace(
  /36 Solutions • Cliquez pour déballer/g,
  '27 Solutions • Cliquez pour déballer'
);

// Remplacer fallback Sparkles ligne 964
sidebarContent = sidebarContent.replace(
  /<Sparkles className="w-3 h-3 text-cyan-400" \/>/g,
  '<Box className="w-3 h-3 text-cyan-400" />'
);

fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
console.log('✓ AppSidebar.tsx mis à jour avec succès');

// 2. Patch src/components/dashboard/HybridAnalyticsCardsGrid.tsx
const gridPath = path.resolve('src/components/dashboard/HybridAnalyticsCardsGrid.tsx');
let gridContent = fs.readFileSync(gridPath, 'utf8');

// Nettoyer Math.max(customers.length, 128)
gridContent = gridContent.replace(
  /value:\s*`\$\{Math\.max\(customers\.length,\s*128\)\}\s*élèves`,/g,
  "value: `${customers.length} élève${customers.length > 1 ? 's' : ''}`,"
);

gridContent = gridContent.replace(
  /subtext:\s*'3 cohortes • 14 devoirs PDF',/g,
  "subtext: customers.length > 0 ? `${customers.length} apprenant(s) actif(s)` : 'Cohortes & cours en ligne',"
);

gridContent = gridContent.replace(
  /badge:\s*\{\s*text:\s*'14 à corriger',\s*bg:\s*'bg-blue-50 text-blue-700 border-blue-200'\s*\}/g,
  "badge: {\n        text: customers.length > 0 ? `${customers.length} inscrits` : 'Actif',\n        bg: customers.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'\n      }"
);

// Nettoyer '12 Tunnels' en dur
gridContent = gridContent.replace(
  /value:\s*'12 Tunnels',/g,
  "value: 'Tunnels Prêts',"
);

gridContent = gridContent.replace(
  /subtext:\s*'Taux conv\. 4\.8% • TikTok & Web',/g,
  "subtext: 'Conversion directe & Vente omnicanale',"
);

fs.writeFileSync(gridPath, gridContent, 'utf8');
console.log('✓ HybridAnalyticsCardsGrid.tsx mis à jour avec succès');
