const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('src');
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.png', '.svg', '.jpg', '.webp'];

let totalFiles = 0;
let totalImportsChecked = 0;
const brokenImports = [];

function checkFile(filePath) {
  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  // Match standard imports/exports: import ... from '...'; export ... from '...'; import('...')
  const regex = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"])/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;
    // Only test relative imports
    if (importPath.startsWith('.')) {
      totalImportsChecked++;
      const dir = path.dirname(filePath);
      const targetBase = path.resolve(dir, importPath);
      
      let exists = false;
      try {
        if (fs.existsSync(targetBase) && fs.statSync(targetBase).isFile()) {
          exists = true;
        }
      } catch (e) {}

      if (!exists) {
        for (const ext of extensions) {
          try {
            if (fs.existsSync(targetBase + ext) && fs.statSync(targetBase + ext).isFile()) {
              exists = true;
              break;
            }
          } catch (e) {}
          try {
            const indexFile = path.join(targetBase, 'index' + ext);
            if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
              exists = true;
              break;
            }
          } catch (e) {}
        }
      }
      if (!exists) {
        brokenImports.push({
          file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
          importPath,
          resolvedAttempt: path.relative(process.cwd(), targetBase).replace(/\\/g, '/')
        });
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
console.log('=== RAPPORT SCAN IMPORTS RELATIFS ===');
console.log('Total fichiers TypeScript/JavaScript analysés dans src/:', totalFiles);
console.log('Total imports relatifs résolus et vérifiés:', totalImportsChecked);
console.log('Nombre d\'imports brisés détectés:', brokenImports.length);
if (brokenImports.length > 0) {
  console.log('\nDétail des imports brisés:');
  brokenImports.forEach(b => {
    console.log(`- Dans ${b.file}:`);
    console.log(`    import: "${b.importPath}"`);
    console.log(`    tentative résolution: "${b.resolvedAttempt}"`);
  });
}
