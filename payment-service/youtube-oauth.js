/**
 * ==============================================================================
 * Module Sécurisé Google OAuth2 & YouTube Data API v3 pour NaNaSwitch / Wameet
 * ==============================================================================
 * 
 * Sécurité & Confidentialité :
 * - YOUTUBE_CLIENT_ID et YOUTUBE_CLIENT_SECRET sont isolés côté backend (Render).
 * - Aucune clé secrète n'est exposée au frontend.
 * - Gestion automatique de l'échange de code OAuth2 et du rafraîchissement de jeton.
 * - Sauvegarde chiffrée / sécurisée du Refresh Token dans Firestore.
 */

const https = require('https');
const { URL } = require('url');

// Identifiants OAuth2 injectés depuis les variables d'environnement sur Render
function getOAuth2Config() {
  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:10000/api/youtube/callback';

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret)
  };
}

// Scopes officiels YouTube requis
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'openid',
  'email',
  'profile'
];

/**
 * 1. Génère l'URL d'autorisation Google OAuth 2.0
 * L'utilisateur est redirigé vers cette URL pour consentir à l'accès YouTube
 */
function generateYouTubeAuthUrl(state = '') {
  const config = getOAuth2Config();
  if (!config.isConfigured) {
    throw new Error('[YOUTUBE OAUTH ERROR] YOUTUBE_CLIENT_ID ou YOUTUBE_CLIENT_SECRET non configuré dans .env sur Render.');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline', // Obligatoire pour obtenir un refresh_token
    prompt: 'consent',      // Force l'affichage pour garantir la réception du refresh_token
    include_granted_scopes: 'true'
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 2. Échange le code d'autorisation contre des jetons (Access Token & Refresh Token)
 */
async function exchangeCodeForTokens(code) {
  const config = getOAuth2Config();
  if (!config.isConfigured) {
    throw new Error('[YOUTUBE OAUTH ERROR] Identifiants OAuth2 manquants.');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const postData = new URLSearchParams({
    code: code.trim(),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              accessToken: parsed.access_token,
              refreshToken: parsed.refresh_token || null,
              expiresIn: parsed.expires_in,
              tokenType: parsed.token_type,
              scope: parsed.scope,
              idToken: parsed.id_token
            });
          } else {
            reject(new Error(`[GOOGLE OAUTH ERROR ${res.statusCode}] : ${parsed.error_description || parsed.error || rawData}`));
          }
        } catch (err) {
          reject(new Error(`[GOOGLE OAUTH PARSE ERROR] : ${err.message}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * 3. Rafraîchit automatiquement le jeton d'accès via le refresh token
 */
async function refreshAccessToken(refreshToken) {
  const config = getOAuth2Config();
  if (!config.isConfigured) {
    throw new Error('[YOUTUBE OAUTH ERROR] Identifiants OAuth2 manquants.');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const postData = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken.trim(),
    grant_type: 'refresh_token'
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              accessToken: parsed.access_token,
              expiresIn: parsed.expires_in,
              tokenType: parsed.token_type,
              scope: parsed.scope
            });
          } else {
            reject(new Error(`[GOOGLE REFRESH ERROR ${res.statusCode}] : ${parsed.error_description || parsed.error || rawData}`));
          }
        } catch (err) {
          reject(new Error(`[GOOGLE REFRESH PARSE ERROR] : ${err.message}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * 4. Sauvegarde sécurisée des tokens YouTube dans Firestore (nanasore)
 */
async function saveYouTubeTokensToFirestore(db, { userId = 'pousbila04', tokens }) {
  if (!db) return;

  const docRef = db.collection('system_configs').doc('youtube_oauth');
  const payload = {
    userId,
    hasRefreshToken: Boolean(tokens.refreshToken),
    updatedAt: new Date().toISOString(),
    tokenType: tokens.tokenType,
    scope: tokens.scope
  };

  if (tokens.refreshToken) {
    payload.refreshToken = tokens.refreshToken;
  }
  if (tokens.accessToken) {
    payload.lastAccessToken = tokens.accessToken;
    payload.expiresAt = new Date(Date.now() + (tokens.expiresIn || 3600) * 1000).toISOString();
  }

  await docRef.set(payload, { merge: true });
}

/**
 * 5. Diagnostic d'état de configuration (Sans fuite de secret)
 */
function getYouTubeOAuthStatus() {
  const config = getOAuth2Config();
  return {
    isConfigured: config.isConfigured,
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    redirectUri: config.redirectUri,
    maskedClientId: config.clientId
      ? `${config.clientId.substring(0, 12)}...${config.clientId.slice(-8)}`
      : null,
    accountEmail: 'pousbila04@gmail.com',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getOAuth2Config,
  generateYouTubeAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  saveYouTubeTokensToFirestore,
  getYouTubeOAuthStatus
};
