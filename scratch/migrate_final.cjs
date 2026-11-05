const fs = require('fs');
const path = require('path');

// Ensure target directories exist
const dirsToEnsure = [
  'src/admin/pages',
  'src/apps/wameet/pages',
  'src/services/nana-switch/pages',
  'src/services/nana-switch/components'
];

for (const d of dirsToEnsure) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// 1. Migrate pages/admin/HubBuilder.tsx -> src/admin/pages/HubBuilder.tsx
console.log('1. Migrating HubBuilder...');
let hubBuilderContent = fs.readFileSync('pages/admin/HubBuilder.tsx', 'utf8');
// Fix imports inside src/admin/pages/HubBuilder.tsx (depth 3 from project root)
// was: import { Link } from '../../components/CentralHubOmnibar';
// was: import { SlideModuleBlock... } from '../../src/components/storeBuilder/SlideModuleBlock';
// was: import { ImageUploadInput } from '../../src/components/common/ImageUploadInput';
// was: import { publishHubBlock... } from '../../src/services/hubPublishService';
hubBuilderContent = hubBuilderContent
  .replace(/from\s+['"]\.\.\/\.\.\/components\/CentralHubOmnibar['"]/g, "from '../../components/CentralHubOmnibar'")
  .replace(/from\s+['"]\.\.\/\.\.\/src\/components\/storeBuilder\/SlideModuleBlock['"]/g, "from '../../components/storeBuilder/SlideModuleBlock'")
  .replace(/from\s+['"]\.\.\/\.\.\/src\/components\/common\/ImageUploadInput['"]/g, "from '../../components/common/ImageUploadInput'")
  .replace(/from\s+['"]\.\.\/\.\.\/src\/services\/hubPublishService['"]/g, "from '../../services/hubPublishService'");

fs.writeFileSync('src/admin/pages/HubBuilder.tsx', hubBuilderContent, 'utf8');

// Update pages/admin/HubBuilder.tsx to be a shim
fs.writeFileSync('pages/admin/HubBuilder.tsx', `/**
 * Re-export canonique vers src/admin/pages/HubBuilder.tsx
 */
export * from '../../src/admin/pages/HubBuilder';
export { default } from '../../src/admin/pages/HubBuilder';
`, 'utf8');

// Update src/pages/admin/HubBuilder.tsx shim
fs.writeFileSync('src/pages/admin/HubBuilder.tsx', `/**
 * Re-export de compatibilité vers src/admin/pages/HubBuilder.tsx
 */
export * from '../../admin/pages/HubBuilder';
export { default } from '../../admin/pages/HubBuilder';
`, 'utf8');

// 2. Migrate src/pages/wameet/WameetSupraApp.tsx -> src/apps/wameet/pages/WameetSupraApp.tsx
console.log('2. Migrating WameetSupraApp...');
let wameetContent = fs.readFileSync('src/pages/wameet/WameetSupraApp.tsx', 'utf8');
// Adjust imports: from depth 2 (src/pages/wameet) to depth 3 (src/apps/wameet/pages)
// Every '../../' should become '../../../'
wameetContent = wameetContent.replace(/(from\s+['"])(\.\.\/\.\.\/)/g, '$1../../../');
// './WameetIsolatedExtensionApp' was a shim at src/pages/wameet/WameetIsolatedExtensionApp.tsx
// From src/apps/wameet/pages, it is at ../extension/WameetIsolatedExtensionApp
wameetContent = wameetContent.replace(/(from\s+['"])\.\/WameetIsolatedExtensionApp(['"])/g, "$1../extension/WameetIsolatedExtensionApp$2");

fs.writeFileSync('src/apps/wameet/pages/WameetSupraApp.tsx', wameetContent, 'utf8');

// Also create a shim in src/apps/wameet/pages/WameetIsolatedExtensionApp.tsx just in case
fs.writeFileSync('src/apps/wameet/pages/WameetIsolatedExtensionApp.tsx', `/**
 * Re-export de compatibilité vers src/apps/wameet/extension/WameetIsolatedExtensionApp.tsx
 */
export * from '../extension/WameetIsolatedExtensionApp';
export { default } from '../extension/WameetIsolatedExtensionApp';
`, 'utf8');

// Turn src/pages/wameet/WameetSupraApp.tsx into a shim
fs.writeFileSync('src/pages/wameet/WameetSupraApp.tsx', `/**
 * Re-export de compatibilité vers src/apps/wameet/pages/WameetSupraApp.tsx
 */
export * from '../../apps/wameet/pages/WameetSupraApp';
export { default } from '../../apps/wameet/pages/WameetSupraApp';
`, 'utf8');

// 3. Migrate src/components/nanaSwitch/* -> src/services/nana-switch/components/*
console.log('3. Migrating nanaSwitch components...');
const nsCompFiles = [
  'NanaDocPortalApp.tsx',
  'NanaSwitchApp.tsx',
  'NaNaSwitchAuthGuard.tsx',
  'NaNaSwitchLayout.tsx',
  'NaNaSwitchLogo.tsx',
  'NaNaSwitchPinModal.tsx'
];

for (const f of nsCompFiles) {
  let content = fs.readFileSync(`src/components/nanaSwitch/${f}`, 'utf8');
  // Moving from src/components/nanaSwitch (depth 3) to src/services/nana-switch/components (depth 4)
  // Relative '../../' becomes '../../../'
  content = content.replace(/(from\s+['"])(\.\.\/\.\.\/)/g, '$1../../../');
  content = content.replace(/(import\s*\(\s*['"])(\.\.\/\.\.\/)/g, '$1../../../');

  fs.writeFileSync(`src/services/nana-switch/components/${f}`, content, 'utf8');

  // Shim in src/components/nanaSwitch/
  fs.writeFileSync(`src/components/nanaSwitch/${f}`, `/**
 * Re-export de compatibilité vers src/services/nana-switch/components/${f}
 */
export * from '../../services/nana-switch/components/${f.replace(/\.tsx$/, '')}';
export { default } from '../../services/nana-switch/components/${f.replace(/\.tsx$/, '')}';
`, 'utf8');
}

// 4. Migrate src/pages/nanaSwitch/* -> src/services/nana-switch/pages/*
console.log('4. Migrating nanaSwitch pages...');
const nsPageFiles = [
  'NaNaSwitchAppPage.tsx',
  'NaNaSwitchAuthPage.tsx',
  'NaNaSwitchDocsPage.tsx',
  'NaNaSwitchExtensionPage.tsx',
  'NaNaSwitchLandingPage.tsx'
];

for (const f of nsPageFiles) {
  let content = fs.readFileSync(`src/pages/nanaSwitch/${f}`, 'utf8');
  // Moving from src/pages/nanaSwitch (depth 3) to src/services/nana-switch/pages (depth 4)
  // Relative '../../' becomes '../../../'
  content = content.replace(/(from\s+['"])(\.\.\/\.\.\/)/g, '$1../../../');
  content = content.replace(/(import\s*\(\s*['"])(\.\.\/\.\.\/)/g, '$1../../../');
  // Also any imports pointing to '../../components/nanaSwitch/' can point to '../components/'
  content = content.replace(/(from\s+['"])\.\.\/\.\.\/\.\.\/components\/nanaSwitch\//g, "$1../components/");
  content = content.replace(/(import\s*\(\s*['"])\.\.\/\.\.\/\.\.\/components\/nanaSwitch\//g, "$1../components/");

  fs.writeFileSync(`src/services/nana-switch/pages/${f}`, content, 'utf8');

  // Shim in src/pages/nanaSwitch/
  fs.writeFileSync(`src/pages/nanaSwitch/${f}`, `/**
 * Re-export de compatibilité vers src/services/nana-switch/pages/${f}
 */
export * from '../../services/nana-switch/pages/${f.replace(/\.tsx$/, '')}';
export { default } from '../../services/nana-switch/pages/${f.replace(/\.tsx$/, '')}';
`, 'utf8');
}

// Also update NanaSwitchApp.tsx in src/pages/nanaSwitch/ which was pointing to components
fs.writeFileSync('src/pages/nanaSwitch/NanaSwitchApp.tsx', `/**
 * Re-export de compatibilité vers src/services/nana-switch/components/NanaSwitchApp.tsx
 */
export * from '../../services/nana-switch/components/NanaSwitchApp';
export { default } from '../../services/nana-switch/components/NanaSwitchApp';
`, 'utf8');

console.log('Migration step completed!');
