import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = data.tokens.refresh_token;

async function getAccessToken() {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

async function deployHosting() {
  console.log('=== DÉPLOIEMENT FIREBASE HOSTING EN PRODUCTION ===');
  const token = await getAccessToken();
  console.log('1. Jeton d\'authentification Google Cloud valide.');

  const siteId = 'nanasore';
  const distDir = path.resolve('dist');

  if (!fs.existsSync(distDir)) {
    throw new Error('Le dossier dist/ n\'existe pas. Lancez npm run build d\'abord.');
  }

  // 1. Scanner, compresser en gzip et hasher tous les fichiers dans dist/
  const filePaths = getAllFiles(distDir);
  console.log(`2. Compression GZIP et calcul des empreintes SHA-256 pour ${filePaths.length} fichiers...`);

  const fileMap = {}; // relativeUrl -> hash
  const gzipMap = {}; // hash -> gzippedBuffer

  filePaths.forEach(fp => {
    const rel = '/' + path.relative(distDir, fp).replace(/\\/g, '/');
    const fileBuf = fs.readFileSync(fp);
    const gzBuf = zlib.gzipSync(fileBuf, { level: 9 });
    const hash = crypto.createHash('sha256').update(gzBuf).digest('hex');

    fileMap[rel] = hash;
    gzipMap[hash] = gzBuf;
  });

  // 2. Créer une nouvelle version sur Firebase Hosting
  console.log('3. Création d\'une nouvelle version sur Firebase Hosting...');
  const createVerRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      config: {
        rewrites: [
          {
            glob: '**',
            path: '/index.html'
          }
        ]
      }
    })
  });

  const versionData = await createVerRes.json();
  if (!versionData.name) {
    throw new Error('Erreur création version: ' + JSON.stringify(versionData));
  }
  const versionName = versionData.name;
  console.log('   Version créée:', versionName);

  // 3. Informer Firebase des fichiers à déployer (populateFiles)
  console.log('4. Vérification des fichiers manquants sur le CDN Firebase (populateFiles)...');
  const popRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files: fileMap })
  });

  const popData = await popRes.json();
  const uploadRequired = popData.uploadRequiredHashes || [];
  const uploadUrl = popData.uploadUrl;
  console.log(`   Fichiers à transférer vers le CDN: ${uploadRequired.length} / ${filePaths.length}`);

  // 4. Téléverser les fichiers manquants (par lots de 8 simultanés pour vitesse maximale)
  if (uploadRequired.length > 0) {
    console.log('5. Téléversement des fichiers compressés vers le CDN Google Cloud...');
    const chunkSize = 8;
    for (let i = 0; i < uploadRequired.length; i += chunkSize) {
      const chunk = uploadRequired.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (hash) => {
        const gzBuf = gzipMap[hash];
        const upRes = await fetch(`${uploadUrl}/${hash}`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/octet-stream'
          },
          body: gzBuf
        });
        if (!upRes.ok) {
          const errText = await upRes.text();
          throw new Error(`Échec upload pour hash ${hash}: ${upRes.status} - ${errText}`);
        }
      }));
      const current = Math.min(i + chunkSize, uploadRequired.length);
      const percent = Math.round((current / uploadRequired.length) * 100);
      process.stdout.write(`   Progression: ${current}/${uploadRequired.length} (${percent}%)\r`);
    }
    console.log('\n   Tous les fichiers ont été transférés avec succès !');
  }

  // 5. Finaliser la version
  console.log('6. Finalisation de la version...');
  const finalizeRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'FINALIZED' })
  });

  const finalizeData = await finalizeRes.json();
  if (finalizeData.status !== 'FINALIZED') {
    throw new Error('Erreur finalisation version: ' + JSON.stringify(finalizeData));
  }
  console.log('   Version finalisée avec statut: FINALIZED');

  // 6. Publier la version en ligne (Release)
  console.log('7. Publication immédiate de la version en ligne (Release)...');
  const releaseRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?versionName=${encodeURIComponent(versionName)}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });

  const releaseData = await releaseRes.json();
  if (!releaseData.name) {
    throw new Error('Erreur release: ' + JSON.stringify(releaseData));
  }

  console.log('\n======================================================');
  console.log('🎉 DÉPLOIEMENT EN PRODUCTION TERMINÉ AVEC SUCCÈS !');
  console.log(`URL Officielle : https://nanasore.com`);
  console.log(`URL CDN : https://${siteId}.web.app`);
  console.log(`Release : ${releaseData.name}`);
  console.log('======================================================');
}

deployHosting().catch(err => {
  console.error('\n❌ Erreur déploiement hosting:', err);
  process.exit(1);
});
