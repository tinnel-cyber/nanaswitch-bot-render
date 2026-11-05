const fs = require('fs');
const path = require('path');

const hubPath = path.resolve('src/shell/layout/CentralMasterHubView.tsx');
let content = fs.readFileSync(hubPath, 'utf8');

// 1. Ajouter Box, Megaphone, PlaySquare, Wand2 dans les imports lucide-react si non présents
if (!content.includes('Megaphone,')) {
  content = content.replace(
    /import\s*\{\s*ShoppingBag,/,
    'import {\n  Box,\n  Megaphone,\n  PlaySquare,\n  Wand2,\n  ShoppingBag,'
  );
}

// 2. Supprimer la déclaration de state supabaseStatus et son useEffect
const supabaseStateRegex = /\s*\/\/ Validation Supabase & Récupération des Organisations\s*const \[supabaseStatus, setSupabaseStatus\] = useState<\{[\s\S]*?\}\>\(\{[\s\S]*?\}\);\s*useEffect\(\(\) => \{[\s\S]*?fetch\('\/api\/test-supabase'\)[\s\S]*?\}, \[\]\);/;

if (supabaseStateRegex.test(content)) {
  content = content.replace(supabaseStateRegex, '');
  console.log('✓ Déclaration supabaseStatus et useEffect supprimés');
} else {
  console.log('! supabaseStatus regex non trouvée par motif direct, recherche alternative...');
}

// 3. Supprimer le bloc visuel Supabase au début de <main>
const supabaseBannerRegex = /\{\/\* Validation Supabase & Statut de Connexion \(Table organizations\) \*\/\}[\s\S]*?Diagnostic Supabase ↗\s*<\/a>\s*<\/div>\s*<\/div>/;

if (supabaseBannerRegex.test(content)) {
  content = content.replace(supabaseBannerRegex, '');
  console.log('✓ Bannière visuelle Supabase supprimée de CentralMasterHubView');
} else {
  console.log('! Bannière visuelle Supabase non trouvée par motif direct, recherche alternative...');
}

// 4. Corriger les valeurs hardcodées en mode formateur
content = content.replace(
  /\{formatCFA\(metrics\.todayTotal > 0 \? metrics\.todayTotal : 450000\)\}/g,
  '{formatCFA(metrics.todayTotal)}'
);

content = content.replace(
  /\{Math\.max\(customers\.length, 128\)\} élèves/g,
  "{customers.length} élève{customers.length > 1 ? 's' : ''}"
);

content = content.replace(
  /<span className="text-lg sm:text-xl font-black text-slate-900">\s*14 à corriger\s*<\/span>/g,
  '<span className="text-lg sm:text-xl font-black text-slate-900">\n                      {customers.length > 0 ? `${customers.length} devoirs` : "0 à corriger"}\n                    </span>'
);

content = content.replace(
  /\{formatCFA\(320000\)\}/g,
  '{formatCFA(metrics.allSalesTotal)}'
);

content = content.replace(
  /12 Blocs Actifs/g,
  'Tunnels Actifs'
);

// 5. Remplacer Sparkles sur la courbe vide (ligne 2266)
content = content.replace(
  /<div className="w-10 h-10 rounded-2xl bg-blue-100 text-\[#2563EB\] flex items-center justify-center mb-2 border border-blue-300">\s*<Sparkles className="w-5 h-5 text-amber-500 animate-pulse" \/>\s*<\/div>/g,
  '<div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center mb-2 border border-blue-300">\n                    <TrendingUp className="w-5 h-5 text-blue-600" />\n                  </div>'
);

// 6. Remplacer Sparkles et Catalogue 36 -> 27 en bas (lignes 2320-2326)
content = content.replace(
  /<div className="w-8 h-8 rounded-xl bg-blue-500\/20 text-cyan-300 border border-cyan-400\/30 flex items-center justify-center shrink-0 shadow-sm">\s*<Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" \/>\s*<\/div>/g,
  '<div className="w-8 h-8 rounded-xl bg-blue-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-sm">\n              <LayoutGrid className="w-4 h-4 text-cyan-300" />\n            </div>'
);

content = content.replace(
  /Catalogue Intégré : 36 Services, Applications, Modules et Outils/g,
  'Catalogue Intégré : 27 Services, Applications, Modules et Outils'
);

// 7. Remplacer Sparkles dans les boutons et modules
content = content.replace(
  /<Sparkles className="w-4 h-4 fill-slate-950" \/>\s*🟢 Réouvrir la Boutique/g,
  '<Store className="w-4 h-4" />\n                🟢 Réouvrir la Boutique'
);

content = content.replace(
  /<Sparkles className="w-4 h-4 text-cyan-400" \/>\s*<\/div>\s*<div>\s*<h3 className="text-sm font-black text-white flex items-center gap-2">\s*<span>📌 Mes Solutions Activées<\/span>/g,
  '<Boxes className="w-4 h-4 text-cyan-400" />\n                </div>\n                <div>\n                  <h3 className="text-sm font-black text-white flex items-center gap-2">\n                    <span>📌 Mes Solutions Activées</span>'
);

content = content.replace(
  /<Sparkles className="w-2\.5 h-2\.5 fill-emerald-300" \/>/g,
  '<CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />'
);

// Modules avec icon: Sparkles
content = content.replace(
  /title: 'Studio IA 👑 \(Vidéos, Images & Textes\)',[\s\S]*?icon: Sparkles,/g,
  (match) => match.replace('icon: Sparkles,', 'icon: Wand2,')
);

content = content.replace(
  /title: 'Marketing & Campagnes',[\s\S]*?icon: Sparkles,/g,
  (match) => match.replace('icon: Sparkles,', 'icon: Megaphone,')
);

content = content.replace(
  /title: 'Next-Gen LMS Marketplace',[\s\S]*?icon: Sparkles,/g,
  (match) => match.replace('icon: Sparkles,', 'icon: PlaySquare,')
);

content = content.replace(
  /title: 'Marque Blanche \/ Retirer le logo Nanasore',[\s\S]*?icon: Sparkles,/g,
  (match) => match.replace('icon: Sparkles,', 'icon: Palette,')
);

// Fallback logo Sparkles dans le tiroir d'apps
content = content.replace(
  /\{app\.appLogo \? \(\s*<img src=\{app\.appLogo\} alt=\{app\.appName\} className="w-full h-full object-contain" \/>\s*\) : \(\s*<Sparkles className="w-4 h-4 text-cyan-400" \/>\s*\)\}/g,
  '{app.appLogo ? (\n                          <img src={app.appLogo} alt={app.appName} className="w-full h-full object-contain" />\n                        ) : (\n                          <Box className="w-4 h-4 text-cyan-400" />\n                        )}'
);

fs.writeFileSync(hubPath, content, 'utf8');
console.log('✓ CentralMasterHubView.tsx patché avec succès !');
