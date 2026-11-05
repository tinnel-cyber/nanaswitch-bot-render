const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('src');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const installedDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'react', 'react-dom', 'path', 'fs', 'crypto', 'events', 'util', 'stream', 'buffer', 'http', 'https', 'url', 'os', 'child_process'
]);

// Also check tsconfig path aliases if any
let pathAliases = {};
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
    pathAliases = tsconfig.compilerOptions.paths;
  }
} catch (e) {}

const unknownPkgImports = new Map();

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"])/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;
    if (importPath.startsWith('.')) continue; // relative checked already

    // Check if it matches an alias
    let matchedAlias = false;
    for (const alias of Object.keys(pathAliases)) {
      const prefix = alias.replace(/\*$/, '');
      if (importPath.startsWith(prefix)) {
        matchedAlias = true;
        break;
      }
    }
    if (matchedAlias) continue;

    // Extract root pkg name (e.g. '@lucide/react' or 'lucide-react')
    let pkgName = importPath;
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      pkgName = parts[0] + '/' + (parts[1] || '');
    } else {
      pkgName = importPath.split('/')[0];
    }

    if (!installedDeps.has(pkgName) && !installedDeps.has(importPath)) {
      // Check node_modules directly
      const inNodeModules = fs.existsSync(path.resolve('node_modules', pkgName)) || fs.existsSync(path.resolve('node_modules', importPath));
      if (!inNodeModules) {
        if (!unknownPkgImports.has(importPath)) {
          unknownPkgImports.set(importPath, []);
        }
        unknownPkgImports.get(importPath).push(path.relative(process.cwd(), filePath).replace(/\\/g, '/'));
      }
    }
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        walk(full);
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      checkFile(full);
    }
  }
}

walk(srcDir);
console.log('=== VÉRIFICATION DES PACKAGES NATIVES / NPM ===');
console.log('Packages ou imports non répertoriés détectés:', unknownPkgImports.size);
for (const [pkgName, files] of unknownPkgImports.entries()) {
  console.log(`- "${pkgName}" importé dans ${files.length} fichier(s):`);
  files.slice(0, 3).forEach(f => console.log(`    ${f}`));
}
