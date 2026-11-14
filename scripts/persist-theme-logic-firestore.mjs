/**
 * Script autoritaire de persistance de la logique de routes, préfixes de thèmes et nsore.shop dans Cloud Firestore
 * Projet : nanasore
 */

import fs from 'fs';
import path from 'path';

// 1. Récupération du jeton OAuth Firebase CLI
const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function getAccessToken() {
  if (cfg.tokens.access_token) {
    const testRes = await fetch('https://firestore.googleapis.com/v1/projects/nanasore/databases/(default)/documents/stores', {
      headers: { Authorization: 'Bearer ' + cfg.tokens.access_token }
    });
    if (testRes.ok) return cfg.tokens.access_token;
  }

  console.log('Rafraîchissement du jeton OAuth...');
  const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85od6.apps.googleusercontent.com';
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: cfg.tokens.refresh_token
    })
  });
  const data = await refreshRes.json();
  if (!data.access_token) {
    throw new Error('Impossible de rafraîchir le jeton OAuth : ' + JSON.stringify(data));
  }
  return data.access_token;
}

// 2. Fonctions d'attribution des préfixes
const PREDEFINED_THEME_PREFIXES = {
  'theme-default': 'se',        // Standard Élite
  'theme-digital-pro': 'dp',     // Digital Pro
  'theme-electro-tech': 'et',    // Electro Tech
  'theme-mega-store-pro': 'ms',  // Mega Store
  'theme-electro-orange': 'eo',  // Electro Orange
  'theme-beauty-emerald': 'ep',  // Émeraude Prestige
  'theme-livestream-pro': 'lp',  // LiveStream Pro
  'theme-minimal': 'mc',         // Minimal Clean
  'theme-grid': 'gs',            // Grid Store
};

function toRomanNumeral(num) {
  if (!num || num <= 0) return 'i';
  const lookup = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
  ];
  let roman = '';
  let n = Math.floor(num);
  for (const [val, letter] of lookup) {
    while (n >= val) {
      roman += letter;
      n -= val;
    }
  }
  return roman || 'i';
}

function getThemeRoutePrefix(themeId, blankIndex = 1) {
  if (!themeId) return 'se';
  const cleanId = themeId.toLowerCase().trim();
  if (cleanId.includes('blank') || cleanId.startsWith('custom-')) {
    return toRomanNumeral(blankIndex || 1);
  }
  if (PREDEFINED_THEME_PREFIXES[cleanId]) {
    return PREDEFINED_THEME_PREFIXES[cleanId];
  }
  return 'se';
}

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function patchFirestoreDoc(token, collection, docId, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/nanasore/databases/(default)/documents/${collection}/${docId}`;
  
  // Convert fields to Firestore REST API format
  const firestoreFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) {
      firestoreFields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      firestoreFields[k] = { stringValue: v };
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        firestoreFields[k] = { integerValue: String(v) };
      } else {
        firestoreFields[k] = { doubleValue: v };
      }
    } else if (typeof v === 'boolean') {
      firestoreFields[k] = { booleanValue: v };
    }
  }

  // Update with updateMask for safe merge
  const updateMaskKeys = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const patchUrl = `${url}?${updateMaskKeys}`;

  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: firestoreFields })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[ERROR] PATCH ${collection}/${docId} (${res.status}):`, errText);
    return false;
  }
  return true;
}

async function main() {
  console.log('=== ATTRIBUTION DE LA LOGIQUE DANS FIRESTORE ===');
  const token = await getAccessToken();
  console.log('Jeton d\'accès Firebase Admin validé.');

  // 1. Lire tous les documents de 'stores'
  const storesRes = await fetch('https://firestore.googleapis.com/v1/projects/nanasore/databases/(default)/documents/stores', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const storesData = await storesRes.json();
  const storeDocs = storesData.documents || [];
  console.log(`Nombre de boutiques trouvées dans Firestore : ${storeDocs.length}`);

  const usedSlugs = new Set();

  for (const docItem of storeDocs) {
    const storeId = docItem.name.split('/').pop();
    const existingFields = docItem.fields || {};

    let storeName = existingFields.storeName?.stringValue || '';
    if (!storeName) {
      if (storeId === 'Jz9wo3HN4YXdgTnYtDJFsNvnJKv1') storeName = 'Nsore';
      else if (storeId === 'rgLiIgFUFjQLfjzPlmSY9jy6mBE3') storeName = 'Mon Académie Pro';
      else if (storeId === 'PaU03TqG7ZRXCfqBwr9H9n4GMvN2') storeName = 'Alimentation de la Paix';
      else if (storeId === 'oPFENDtYI9NIGYbiORvusA1WAyr1') storeName = 'Alimentation de la Paix';
      else if (storeId === 'demo-store-mu3b9q4j') storeName = 'Alimentation Générale de la Paix';
      else if (storeId === 'REXOSTjomRXXIMAT8bcHbVVaqeR2') storeName = 'Boutique Rexost';
      else if (storeId.startsWith('CREDIT-')) storeName = 'Crédit Express';
      else storeName = `Boutique-${storeId.slice(0, 6)}`;
    }

    // Calcul du slug officiel
    let baseSlug = slugify(storeName) || `boutique-${storeId.slice(0, 6).toLowerCase()}`;
    let finalSlug = baseSlug;
    let counter = 2;
    while (usedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    usedSlugs.add(finalSlug);

    // Détermination du thème
    const activeThemeId = existingFields.activeThemeId?.stringValue || 
      existingFields.active_theme_id?.stringValue || 
      'theme-default';
    const blankIndex = Number(existingFields.blankThemeIndex?.integerValue || 1);
    const activeThemePrefix = getThemeRoutePrefix(activeThemeId, blankIndex);

    // URLs et Patterns officiels
    const publicShopUrl = `https://nsore.shop/${activeThemePrefix}/${finalSlug}`;
    const themeRoutePattern = 'https://nsore.shop/{themePrefix}/{storeSlug}';
    const productRoutePattern = 'https://nsore.shop/{themePrefix}/{storeSlug}/p/{productSlug}';
    const funnelRoutePattern = 'https://nsore.shop/{themePrefix}/{storeSlug}/f/{funnelSlug}';

    const payload = {
      storeName: storeName,
      storeSlug: finalSlug,
      slug: finalSlug,
      tenantSlug: finalSlug,
      activeThemeId: activeThemeId,
      active_theme_id: activeThemeId,
      activeThemePrefix: activeThemePrefix,
      blankThemeIndex: blankIndex,
      publicShopUrl: publicShopUrl,
      themeRoutePattern: themeRoutePattern,
      productRoutePattern: productRoutePattern,
      funnelRoutePattern: funnelRoutePattern,
      ownerId: storeId
    };

    console.log(`\nPersistance boutique [${storeId}] :`);
    console.log(`  Nom : ${storeName}`);
    console.log(`  Slug : ${finalSlug}`);
    console.log(`  Thème : ${activeThemeId} -> Préfixe : [${activeThemePrefix}]`);
    console.log(`  Lien officiel : ${publicShopUrl}`);

    // Persistance dans stores/{storeId}
    const storeOk = await patchFirestoreDoc(token, 'stores', storeId, payload);
    if (storeOk) console.log(`  ✅ stores/${storeId} mis à jour dans Firestore`);

    // Persistance dans tenants/{finalSlug}
    const tenantSlugOk = await patchFirestoreDoc(token, 'tenants', finalSlug, {
      ...payload,
      tenantId: storeId,
      storeId: storeId
    });
    if (tenantSlugOk) console.log(`  ✅ tenants/${finalSlug} mis à jour dans Firestore`);

    // Persistance dans tenants/{storeId}
    if (storeId !== finalSlug) {
      const tenantIdOk = await patchFirestoreDoc(token, 'tenants', storeId, {
        ...payload,
        tenantId: storeId,
        storeId: storeId
      });
      if (tenantIdOk) console.log(`  ✅ tenants/${storeId} mis à jour dans Firestore`);
    }
  }

  // Vérifier également les tenants existants (ex: promo.nana-store.ci)
  console.log('\n=== VÉRIFICATION TENANTS EXISTANTS ===');
  const tenantsRes = await fetch('https://firestore.googleapis.com/v1/projects/nanasore/databases/(default)/documents/tenants', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const tenantsData = await tenantsRes.json();
  const tenantDocs = tenantsData.documents || [];
  for (const tDoc of tenantDocs) {
    const tId = tDoc.name.split('/').pop();
    const tFields = tDoc.fields || {};
    if (!tFields.activeThemePrefix?.stringValue) {
      const tTheme = tFields.activeThemeId?.stringValue || 'theme-default';
      const tPrefix = getThemeRoutePrefix(tTheme);
      const tSlug = tFields.storeSlug?.stringValue || tFields.slug?.stringValue || tId;
      await patchFirestoreDoc(token, 'tenants', tId, {
        activeThemeId: tTheme,
        active_theme_id: tTheme,
        activeThemePrefix: tPrefix,
        themeRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}',
        productRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}/p/{productSlug}',
        funnelRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}/f/{funnelSlug}'
      });
      console.log(`  ✅ tenants/${tId} enrichi avec activeThemePrefix [${tPrefix}]`);
    }
  }

  console.log('\n🎉 Persistance Firebase terminée avec succès !');
}

main().catch(err => {
  console.error('Erreur fatale lors de la persistance Firestore :', err);
  process.exit(1);
});
