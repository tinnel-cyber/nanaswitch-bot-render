/**
 * Module Client Réseau Officiel Sebpay pour l'API Pont Render
 * 
 * Sécurité & Spécifications :
 * - Double authentification par headers HTTP :
 *     "X-Public-Key": process.env.SEBPAY_PUBLIC_KEY
 *     "X-Secret-Key": process.env.SEBPAY_SECRET_KEY
 *     "Content-Type": "application/json"
 * - URL de base officielle : https://newapi.sebpay.bj/api/v1/
 * - Flux 100% Production / Live Réel (Sebpay ne dispose d'aucun environnement Sandbox ni clés de test)
 * - Tout flag SEBPAY_TEST ou sandbox est formellement interdit et neutralisé
 * - Sortie réseau garantie par l'IP Statique Fixie (54.195.3.54) pour conformité bancaire
 * - Isolation stricte côté backend : X-Secret-Key n'est JAMAIS transmise au frontend
 */

// Neutralisation stricte de tout proxy global pour isoler le reste du serveur
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;

const { HttpsProxyAgent } = require('https-proxy-agent');
const { ProxyAgent } = require('undici');
const {
  fetchViaFixie,
  getFixieUrl,
  getFixieAgents,
  getFixieAgentsSebpay,
  logProxyRouterUsage,
  getAxiosProxyConfig,
  maskProxyUrl
} = require('./fixie-proxy');

// Clients HTTP permissifs de secours pour le tunneling HTTP Proxy
let axiosClient = null;
try {
  axiosClient = require('axios');
} catch {
  axiosClient = null;
}

let nodeFetchClient = null;
try {
  nodeFetchClient = require('node-fetch');
} catch {
  nodeFetchClient = null;
}

/**
 * Détecte récursivement les erreurs d'authentification proxy ou de tunneling HTTP
 * (y compris les erreurs imbriquées dans TypeError: fetch failed -> DOMException -> RequestAbortedError)
 */
function isProxyTunnelError(err) {
  if (!err) return false;
  let cur = err;
  for (let i = 0; i < 5 && cur; i++) {
    const msg = String(cur.message || '');
    const name = String(cur.name || '');
    const code = String(cur.code || '');
    if (
      msg.includes('407') ||
      msg.includes('HTTP Tunneling') ||
      msg.includes('Proxy response') ||
      msg.includes('fetch failed') ||
      code === 'UND_ERR_ABORTED' ||
      name === 'RequestAbortedError' ||
      name === 'AbortError'
    ) {
      return true;
    }
    cur = cur.cause;
  }
  return false;
}

/**
 * Exécute un appel réseau vers l'API Sebpay via un client permissif (Axios ou node-fetch avec https-proxy-agent)
 * Utilisé en priorité lorsque FIXIE est actif pour éliminer radicalement l'erreur Undici 407.
 */
async function callSebpayApiViaPermissiveClient(targetUrl, { method, headers, body, httpsAgent, timeoutMs }) {
  console.log(`[SEBPAY PERMISSIVE CLIENT] Exécution via HttpsProxyAgent (${axiosClient ? 'Axios' : 'node-fetch'})...`);

  if (axiosClient) {
    try {
      const axiosRes = await axiosClient({
        url: targetUrl,
        method,
        headers,
        data: body,
        httpsAgent,
        httpAgent: httpsAgent,
        proxy: false,
        timeout: timeoutMs,
        validateStatus: () => true
      });

      const responseData = axiosRes.data;
      if (axiosRes.status < 200 || axiosRes.status >= 300) {
        console.error(`[SEBPAY API ERROR ${axiosRes.status} DETAIL]`, JSON.stringify(responseData));
        const errorMsg = (typeof responseData === 'object' && (responseData.message || responseData.error || responseData.msg))
          ? (responseData.message || responseData.error || responseData.msg)
          : `HTTP ${axiosRes.status} ${axiosRes.statusText || 'Error'}`;
        const error = new Error(`Erreur Sebpay (${axiosRes.status}): ${errorMsg}`);
        error.status = axiosRes.status;
        error.data = responseData;
        throw error;
      }
      return responseData;
    } catch (axiosErr) {
      if (axiosErr.status || (axiosErr.response && axiosErr.response.status) || axiosErr.data) {
        throw axiosErr;
      }
      console.warn('[SEBPAY AXIOS NOTICE] Erreur réseau Axios, tentative de secours via node-fetch :', axiosErr.message);
    }
  }

  if (nodeFetchClient) {
    const fetchBody = (body && method !== 'GET' && method !== 'HEAD')
      ? (typeof body === 'string' ? body : JSON.stringify(body))
      : undefined;

    const nfRes = await nodeFetchClient(targetUrl, {
      method,
      headers,
      body: fetchBody,
      agent: httpsAgent,
      timeout: timeoutMs
    });

    const contentType = nfRes.headers.get('content-type') || '';
    let responseData = null;
    if (contentType.includes('application/json')) {
      responseData = await nfRes.json().catch(() => ({}));
    } else {
      responseData = await nfRes.text();
    }

    if (!nfRes.ok) {
      const errorMsg = (typeof responseData === 'object' && (responseData.message || responseData.error))
        ? (responseData.message || responseData.error)
        : `HTTP ${nfRes.status} ${nfRes.statusText}`;
      const error = new Error(`Erreur Sebpay (${nfRes.status}): ${errorMsg}`);
      error.status = nfRes.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  }

  throw new Error('Aucun client HTTP permissif (Axios ou node-fetch) disponible pour le tunneling.');
}

// URL de base officielle Sebpay
const SEBPAY_DEFAULT_BASE_URL = 'https://newapi.sebpay.bj/api/v1/';

// Dictionnaire officiel des 20 pays certifiés avec IDs et schémas officiels Sebpay (/api/v1/countries)
const SUPPORTED_COUNTRIES = {
  BF: { id: "20260506192835258815", name: "Burkina Faso", country_name: "Burkina Faso", country_code: "BF", prefix: "+226", currency_id: "20260506192834884879", currency: "XOF" },
  BJ: { id: "20260506192835884841", name: "Benin", country_name: "Benin", country_code: "BJ", prefix: "+229", currency_id: "20260506192834884879", currency: "XOF" },
  CI: { id: "20260506192835429869", name: "Côte d'Ivoire", country_name: "Côte d'Ivoire", country_code: "CI", prefix: "+225", currency_id: "20260506192834884879", currency: "XOF" },
  ML: { id: "20260506192835642474", name: "Mali", country_name: "Mali", country_code: "ML", prefix: "+223", currency_id: "20260506192834884879", currency: "XOF" },
  NE: { id: "20260506192835691483", name: "Niger", country_name: "Niger", country_code: "NE", prefix: "+227", currency_id: "20260506192834884879", currency: "XOF" },
  SN: { id: "20260506192835771819", name: "Senegal", country_name: "Senegal", country_code: "SN", prefix: "+221", currency_id: "20260506192834884879", currency: "XOF" },
  TG: { id: "20260506192835820312", name: "Togo", country_name: "Togo", country_code: "TG", prefix: "+228", currency_id: "20260506192834884879", currency: "XOF" },
  GW: { id: "20260506192835609951", name: "Guinea-Bissau", country_name: "Guinea-Bissau", country_code: "GW", prefix: "+245", currency_id: "20260506192834884879", currency: "XOF" },
  CM: { id: "20260506192835490355", name: "Cameroon", country_name: "Cameroon", country_code: "CM", prefix: "+237", currency_id: "20260506192835391282", currency: "XAF" },
  CG: { id: "20260506192835400983", name: "Congo", country_name: "Congo", country_code: "CG", prefix: "+242", currency_id: "20260506192835391282", currency: "XAF" },
  GA: { id: "20260506192835518192", name: "Gabon", country_name: "Gabon", country_code: "GA", prefix: "+241", currency_id: "20260506192835391282", currency: "XAF" },
  TD: { id: "20260508014307386840", name: "Tchad", country_name: "Tchad", country_code: "TD", prefix: "+235", currency_id: "20260506192835391282", currency: "XAF" },
  GH: { id: "20260706132629645425", name: "Ghana", country_name: "Ghana", country_code: "GH", prefix: "+233", currency_id: "20260706132037956467", currency: "GHS" },
  GN: { id: "20260506192835563073", name: "Guinea Conakry", country_name: "Guinea Conakry", country_code: "GN", prefix: "+224", currency_id: "20260506192835550797", currency: "GNF" },
  NG: { id: "20260706132458113019", name: "Nigéria", country_name: "Nigéria", country_code: "NG", prefix: "+234", currency_id: "20260706131900898656", currency: "NGN" },
  CD: { id: "20260506192835321584", name: "R.D.C", country_name: "R.D.C", country_code: "CD", prefix: "+243", currency_id: "20260506192835314236", currency: "CDF" },
  KE: { id: "20260813115256032331", name: "Kenya", country_name: "Kenya", country_code: "KE", prefix: "+254", currency_id: "20260813114604860772", currency: "KES" },
  UG: { id: "20260813115612389340", name: "Ouganda", country_name: "Ouganda", country_code: "UG", prefix: "+256", currency_id: "20260813114955698986", currency: "UGX" },
  TZ: { id: "20260813115842870606", name: "Tanzanie", country_name: "Tanzanie", country_code: "TZ", prefix: "+255", currency_id: "20260813114814658462", currency: "TZS" },
  GM: { id: "20260506192835995905", name: "Gambia", country_name: "Gambia", country_code: "GM", prefix: "+220", currency_id: "20260506192835984144", currency: "GMD" }
};

/**
 * Fonction de nettoyage pour forcer le format local à 8 chiffres (Burkina Faso)
 * Requis par les opérateurs (notamment Orange Burkina Faso) pour éviter le rejet HTTP 400 Bad Request
 * 
 * @param {string|number} phone - Numéro de téléphone brut (ex: '+22670123456', '00226 70 12 34 56', '22670123456')
 * @returns {string} Numéro nettoyé au format local à 8 chiffres (ex: '70123456')
 */
function formatLocalPhoneNumber(phone) {
  if (!phone) return '';
  
  // 1. Supprime tous les caractères non numériques (+, espaces, tirets)
  let cleaned = String(phone).replace(/\D/g, '');
  
  // 2. Si le numéro commence par un indicatif régional ou international (ex: 226, 225, 229)
  if (cleaned.startsWith('226') && cleaned.length >= 11) {
    cleaned = cleaned.substring(3);
  } else if ((cleaned.startsWith('225') || cleaned.startsWith('229')) && cleaned.length >= 12) {
    cleaned = cleaned.substring(3);
  }
  
  return cleaned;
}

/**
 * Nettoie et formate un numéro de téléphone pour le Burkina Faso (strictement format local à 8 chiffres)
 * Requis par Orange Burkina Faso pour éviter le rejet opérateur
 * 
 * @param {string|number} phone - Numéro de téléphone brut (ex: '+22665565805', '22665565805')
 * @returns {string} Numéro épuré à 8 chiffres (ex: '65565805')
 */
function formatBurkinaPhoneNumber(phone) {
  return formatSebpayPhoneNumber(phone, 'BF');
}

/**
 * Formate le numéro de téléphone selon les exigences de l'API Sebpay par pays
 * TOUJOURS inclure le '+' et l'indicatif national (ex: '+22665565805' pour le BF, '+2250712345678' pour la CI, etc.)
 * 
 * @param {string|number} phone - Numéro de téléphone brut
 * @param {string} countryIso - Code ISO du pays (ex: 'BF', 'CI', 'BJ')
 * @returns {string} Numéro formaté au format international avec '+' (ex: '+22665565805')
 */
function formatSebpayPhoneNumber(phone, countryIso = 'BF') {
  if (!phone) return '';
  const iso = String(countryIso || 'BF').toUpperCase();
  let cleaned = String(phone).replace(/\D/g, '');

  const countryInfo = SUPPORTED_COUNTRIES[iso] || SUPPORTED_COUNTRIES.BF;
  const prefixDigits = countryInfo?.prefix ? countryInfo.prefix.replace('+', '') : '226';

  // Si le numéro commence par 00, enlever 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Si le numéro commence déjà par l'indicatif officiel du pays (ex: 22665565805)
  if (cleaned.startsWith(prefixDigits)) {
    return `+${cleaned}`;
  }

  // Si le numéro a été saisi en format local (ex: 65565805), ajouter impérativement l'indicatif officiel avec le '+'
  return `+${prefixDigits}${cleaned}`;
}

/**
 * Résout dynamiquement le code ISO pays (ex: "BF"), son ID officiel Sebpay et la devise nationale (ex: "XOF")
 * Résolution par ordre de priorité :
 * 1. Code pays explicite à 2 lettres (ex: "BF", "BJ", "CI")
 * 2. Objet pays { country_code, code, id, ... }
 * 3. Nom de pays (ex: "Burkina Faso" -> "BF")
 * 4. Détection via préfixe téléphonique (ex: "+22670..." -> "BF", "+229..." -> "BJ")
 * 5. Valeur par défaut de secours : "BF" (Burkina Faso) et "XOF"
 */
function resolveCountryAndCurrency(countryInput, phoneInput, currencyInput) {
  let resolvedCountry = 'BF';

  if (countryInput) {
    if (typeof countryInput === 'object') {
      const candidate = countryInput.country_code || countryInput.code || countryInput.id || countryInput.country;
      if (candidate && typeof candidate === 'string') {
        const upper = candidate.trim().toUpperCase();
        if (SUPPORTED_COUNTRIES[upper]) {
          resolvedCountry = upper;
        } else {
          // Recherche par ID Sebpay éventuel (ex: "20260506192835258815")
          const byId = Object.entries(SUPPORTED_COUNTRIES).find(([, info]) => info.id === candidate.trim());
          if (byId) resolvedCountry = byId[0];
        }
      }
    } else if (typeof countryInput === 'string') {
      const clean = countryInput.trim().toUpperCase();
      if (SUPPORTED_COUNTRIES[clean]) {
        resolvedCountry = clean;
      } else {
        const found = Object.entries(SUPPORTED_COUNTRIES).find(
          ([code, info]) => info.name.toLowerCase() === countryInput.trim().toLowerCase() ||
                            info.country_name.toLowerCase() === countryInput.trim().toLowerCase()
        );
        if (found) {
          resolvedCountry = found[0];
        } else {
          const byId = Object.entries(SUPPORTED_COUNTRIES).find(([, info]) => info.id === countryInput.trim());
          if (byId) resolvedCountry = byId[0];
        }
      }
    }
  } else if (phoneInput) {
    const raw = String(phoneInput).trim();
    const sorted = Object.entries(SUPPORTED_COUNTRIES).sort((a, b) => b[1].prefix.length - a[1].prefix.length);
    for (const [code, info] of sorted) {
      const pfx = info.prefix.replace('+', '');
      if (raw.startsWith(info.prefix) || raw.startsWith(pfx) || raw.startsWith(`00${pfx}`)) {
        resolvedCountry = code;
        break;
      }
    }
  }

  const countryInfo = SUPPORTED_COUNTRIES[resolvedCountry] || SUPPORTED_COUNTRIES.BF;
  let resolvedCurrency = countryInfo.currency || 'XOF';

  if (currencyInput && typeof currencyInput === 'string') {
    const currUpper = currencyInput.trim().toUpperCase();
    if (currUpper === 'FCFA' || currUpper === 'CFA') {
      resolvedCurrency = countryInfo.currency || 'XOF';
    } else if (currUpper.length === 3) {
      resolvedCurrency = currUpper;
    }
  }

  return {
    id: countryInfo.id,
    country: resolvedCountry,
    country_code: resolvedCountry,
    country_name: countryInfo.country_name || countryInfo.name,
    prefix: countryInfo.prefix,
    currency_id: countryInfo.currency_id,
    currency: resolvedCurrency,
    // Structure objet complète conforme au endpoint /api/v1/countries
    country_details: {
      id: countryInfo.id,
      country_name: countryInfo.country_name || countryInfo.name,
      country_code: resolvedCountry,
      prefix: countryInfo.prefix,
      currency_id: countryInfo.currency_id,
      currency: {
        id: countryInfo.currency_id,
        code: resolvedCurrency,
        name: resolvedCurrency,
        symbol: resolvedCurrency
      }
    }
  };
}

/**
 * Table de correspondance officielle certifiée des opérateurs Sebpay pour le Burkina Faso
 * Récupérée en direct via GET /api/v1/operators?country=BF
 */
const BF_OPERATORS_MAP = {
  'orange': {
    slug: 'orange-bf',
    code: 'orange',
    id: '20260506192835289381',
    name: 'Orange Money',
    otp_required: true,
    ussd_code: '*144*4*6*montant#',
    country_id: '20260506192835258815',
    country: {
      id: '20260506192835258815',
      country_name: 'Burkina Faso',
      country_code: 'BF'
    }
  },
  'moov': {
    slug: 'moov-bf',
    code: 'moov',
    id: '20260506192835278434',
    name: 'Moov Money',
    otp_required: false,
    ussd_code: null,
    country_id: '20260506192835258815',
    country: {
      id: '20260506192835258815',
      country_name: 'Burkina Faso',
      country_code: 'BF'
    }
  },
  'wligdicash': {
    slug: 'wligdicash-bf',
    code: 'wligdicash',
    id: '20260506192835300791',
    name: 'Wallet LigdiCash',
    otp_required: false,
    ussd_code: null,
    country_id: '20260506192835258815',
    country: {
      id: '20260506192835258815',
      country_name: 'Burkina Faso',
      country_code: 'BF'
    }
  }
};

/**
 * Dictionnaire officiel complet des opérateurs supportés par Sebpay par pays
 */
const SEBPAY_COUNTRY_OPERATORS = {
  BF: ['moov', 'orange', 'wligdicash'],
  CD: ['afrimoney', 'airtel', 'mpesa', 'orange', 'vodacom'],
  CG: ['airtel', 'mtn'],
  CI: ['moov', 'mtn', 'orange', 'wave'],
  CM: ['mtn', 'orange'],
  GA: ['airtel', 'moov'],
  GN: ['mtn', 'orange'],
  GW: ['orange'],
  ML: ['mobicash', 'moov', 'orange'],
  NE: ['airtel', 'amanata', 'moov', 'nita', 'wligdicash', 'zamani'],
  SN: ['emoney', 'free', 'orange', 'wave'],
  TG: ['moov', 'togocom'],
  BJ: ['celtiis', 'coris', 'moov', 'mtn'],
  GM: ['afrimoney'],
  TD: ['airtel', 'moov'],
  NG: ['airtel', 'mtn'],
  GH: ['airtel', 'mtn', 'telecel'],
  KE: ['airtel', 'mpesa'],
  UG: ['airtel', 'mtn'],
  TZ: ['airtel', 'ezypesa', 'halo_pesa', 'mpesa', 'tigopesa']
};

/**
 * Opérateur par défaut par pays en cas d'omission ou terme générique (ex: MOMO)
 */
const SEBPAY_DEFAULT_OPERATOR_BY_COUNTRY = {
  BF: 'orange',
  CD: 'orange',
  CG: 'airtel',
  CI: 'orange',
  CM: 'orange',
  GA: 'airtel',
  GN: 'orange',
  GW: 'orange',
  ML: 'orange',
  NE: 'airtel',
  SN: 'orange',
  TG: 'togocom',
  BJ: 'mtn',
  GM: 'afrimoney',
  TD: 'moov',
  NG: 'mtn',
  GH: 'mtn',
  KE: 'mpesa',
  UG: 'mtn',
  TZ: 'mpesa'
};

/**
 * Normalisation universelle enrichie des codes d'opérateurs pour l'API Sebpay
 * Couvre les 20 pays supportés par Sebpay :
 * - BF (Burkina Faso) : moov, orange, wligdicash
 * - CD (R.D. Congo) : afrimoney, airtel, mpesa, orange, vodacom
 * - CG (Congo) : airtel, mtn
 * - CI (Côte d'Ivoire) : moov, mtn, orange, wave
 * - CM (Cameroun) : mtn, orange
 * - GA (Gabon) : airtel, moov
 * - GN (Guinée Conakry) : mtn, orange
 * - GW (Guinée-Bissau) : orange
 * - ML (Mali) : mobicash, moov, orange
 * - NE (Niger) : airtel, amanata, moov, nita, wligdicash, zamani
 * - SN (Sénégal) : emoney, free, orange, wave
 * - TG (Togo) : moov, togocom
 * - BJ (Bénin) : celtiis, coris, moov, mtn
 * - GM (Gambie) : afrimoney
 * - TD (Tchad) : airtel, moov
 * - NG (Nigéria) : airtel, mtn
 * - GH (Ghana) : airtel, mtn, telecel
 * - KE (Kenya) : airtel, mpesa
 * - UG (Ouganda) : airtel, mtn
 * - TZ (Tanzanie) : airtel, ezypesa, halo_pesa, mpesa, tigopesa
 * 
 * @param {string|object} country - Code ISO du pays (ex: 'BF', 'CI') ou objet pays
 * @param {string} rawOperator - Nom brut de l'opérateur (ex: 'ORANGE_MONEY', 'MOOV_MONEY', 'Halo Pesa')
 * @returns {string} Slug opérateur officiel Sebpay en minuscules
 */
function normalizeSebpayOperator(country, rawOperator) {
  const countryCode = (typeof country === 'object'
    ? (country.country_code || country.code || country.id || 'BF')
    : String(country || 'BF')
  ).trim().toUpperCase();

  if (!rawOperator) {
    return SEBPAY_DEFAULT_OPERATOR_BY_COUNTRY[countryCode] || '';
  }

  const op = String(rawOperator).toLowerCase().trim();

  // Termes génériques de paiement mobile -> fallback vers opérateur par défaut du pays
  if (op === 'momo' || op === 'mobile_money' || op === 'mobile-money' || op === 'mobilemoney' || op === 'money') {
    return SEBPAY_DEFAULT_OPERATOR_BY_COUNTRY[countryCode] || 'orange';
  }

  // Détections et correspondances des opérateurs officiels Sebpay
  if (op.includes('orange')) return 'orange';
  if (op.includes('moov') || op.includes('flooz')) return 'moov';
  if (op.includes('mtn')) return 'mtn';
  if (op.includes('wave')) return 'wave';
  if (op.includes('celtiis')) return 'celtiis';
  if (op.includes('coris')) return 'coris';
  if (op.includes('togocom') || op.includes('togo') || op.includes('tmoney')) return 'togocom';
  if (op.includes('ligdicash') || op.includes('wligdicash')) return 'wligdicash';
  if (op.includes('mobicash')) return 'mobicash';
  if (op.includes('free')) return 'free';
  if (op.includes('emoney') || op.includes('e-money')) return 'emoney';
  if (op.includes('amanata')) return 'amanata';
  if (op.includes('nita')) return 'nita';
  if (op.includes('zamani')) return 'zamani';
  if (op.includes('airtel')) return 'airtel';
  if (op.includes('vodacom')) return 'vodacom';
  if (op.includes('afrimoney') || op.includes('afri')) return 'afrimoney';
  if (op.includes('mpesa') || op.includes('m-pesa')) return 'mpesa';
  if (op.includes('telecel')) return 'telecel';
  if (op.includes('ezypesa') || op.includes('ezy')) return 'ezypesa';
  if (op.includes('halo')) return 'halo_pesa';
  if (op.includes('tigo')) return 'tigopesa';

  // Si le code correspond déjà directement à un opérateur supporté dans ce pays
  const supported = SEBPAY_COUNTRY_OPERATORS[countryCode];
  if (supported && supported.includes(op)) {
    return op;
  }

  return op;
}

function getSebpayBaseUrl() {
  const url = process.env.SEBPAY_BASE_URL || SEBPAY_DEFAULT_BASE_URL;
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Construit les en-têtes officiels requis par Sebpay
 * Injecte obligatoirement X-Public-Key, X-Secret-Key et Content-Type
 */
function getSebpayHeaders(customHeaders = {}) {
  const publicKey = customHeaders['X-Public-Key'] || customHeaders.publicKey || process.env.SEBPAY_PUBLIC_KEY || '';
  const secretKey = customHeaders['X-Secret-Key'] || customHeaders.secretKey || process.env.SEBPAY_SECRET_KEY || '';

  const clean = { ...customHeaders };
  delete clean.publicKey;
  delete clean.secretKey;

  return {
    'X-Public-Key': publicKey,
    'X-Secret-Key': secretKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...clean
  };
}

/**
 * Diagnostic de configuration des clés Sebpay
 * Retourne l'état sans JAMAIS exposer la clé secrète
 */
function getSebpayConfigStatus() {
  const publicKey = process.env.SEBPAY_PUBLIC_KEY || '';
  const secretKey = process.env.SEBPAY_SECRET_KEY || '';
  const baseUrl = getSebpayBaseUrl();

  const isConfigured = Boolean(publicKey && secretKey);

  // Masquage sécurisé de la clé publique (ex: pk_live_abc...1234)
  let maskedPublicKey = null;
  if (publicKey) {
    if (publicKey.length > 12) {
      maskedPublicKey = `${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 4)}`;
    } else {
      maskedPublicKey = `${publicKey.substring(0, 3)}***`;
    }
  }

  return {
    isConfigured,
    environment: 'production',
    isLive: true,
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    maskedPublicKey,
    baseUrl,
    timestamp: new Date().toISOString()
  };
}

/**
 * Exécute une requête réseau sécurisée vers l'API Sebpay
 * - Utilise systématiquement HttpsProxyAgent configuré avec process.env.FIXIE_URL
 * - Transmet systématiquement httpsAgent (pour Axios et HTTP Node) et dispatcher (pour undici / fetch Node 18+)
 * - Injecte les headers d'authentification bancaire X-Public-Key et X-Secret-Key
 * - Protège contre toute fuite de secret dans les logs d'erreurs
 * 
 * @param {string} endpoint - Chemin d'API relatif (ex: 'collections', 'collections/:id', etc.)
 * @param {object} options - Options HTTP { method, body, headers, timeoutMs }
 */
async function callSebpayApi(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    timeoutMs = 25000
  } = options;

  const baseUrl = getSebpayBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const targetUrl = `${baseUrl}${cleanEndpoint}`;

  const publicKey = headers['X-Public-Key'] || headers.publicKey || process.env.SEBPAY_PUBLIC_KEY;
  const secretKey = headers['X-Secret-Key'] || headers.secretKey || process.env.SEBPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error('[SEBPAY AUTH ERROR] Clés d\'authentification manquantes. Définissez SEBPAY_PUBLIC_KEY et SEBPAY_SECRET_KEY sur Render.');
  }

  const reqHeaders = getSebpayHeaders(headers);

  // Résolution dynamique du proxy avec priorité SEBPAY_FIXIE_URL
  const txId = options.transactionId || options.orderId || options.externalReference || (typeof body === 'object' && body?.external_reference) || null;
  const { httpsAgent, undiciAgent, variableName, fixieUrl } = getFixieAgents('sebpay', {
    transactionId: txId,
    forceAlternate: Boolean(options.forceAlternateProxy)
  });

  if (!fixieUrl) {
    console.warn('[SEBPAY PROXY WARNING] Aucune variable de proxy (SEBPAY_FIXIE_URL ou FIXIE_URL) configurée. L\'IP dynamique Render risque d\'être rejetée par Sebpay.');
  }

  const fetchOptions = {
    method,
    headers: reqHeaders,
    signal: AbortSignal.timeout(timeoutMs)
  };

  // Injection systématique garantie de HttpsProxyAgent pour Axios, node-fetch et fetch
  if (httpsAgent) {
    fetchOptions.agent = httpsAgent;
    fetchOptions.httpsAgent = httpsAgent; // Axios compatibility
    fetchOptions.httpAgent = httpsAgent;  // Axios compatibility
    fetchOptions.proxy = false;           // Empêche Axios d'utiliser un mauvais proxy
  }
  if (undiciAgent) {
    fetchOptions.dispatcher = undiciAgent; // Node.js 18+ global fetch
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  console.log(`[SEBPAY REQUEST] ${method} ${targetUrl} (via Fixie IP Statique / HttpsProxyAgent isolé)...`);

  // 1. Si un proxy Fixie est configuré, exécuter directement via le client permissif éprouvé (Axios / node-fetch avec https-proxy-agent)
  // afin d'éliminer définitivement l'erreur "Proxy response (407) !== 200 when HTTP Tunneling" de l'implémentation Undici interne de Node.js.
  if (httpsAgent && (axiosClient || nodeFetchClient)) {
    return await callSebpayApiViaPermissiveClient(targetUrl, {
      method,
      headers: reqHeaders,
      body,
      httpsAgent,
      timeoutMs
    });
  }

  // 2. Si aucun proxy ou mode direct en clair, exécuter via fetch natif avec filet de sécurité
  let response;
  try {
    response = await fetch(targetUrl, fetchOptions);
  } catch (fetchErr) {
    if (isProxyTunnelError(fetchErr) && httpsAgent) {
      console.warn(`[SEBPAY FALLBACK] Échec du tunneling Undici ProxyAgent (407). Basculement automatique vers le client permissif https-proxy-agent / axios... Cause : ${fetchErr.message}`);
      return await callSebpayApiViaPermissiveClient(targetUrl, {
        method,
        headers: reqHeaders,
        body,
        httpsAgent,
        timeoutMs
      });
    }

    throw fetchErr;
  }

  const contentType = response.headers.get('content-type') || '';
  let responseData = null;

  if (contentType.includes('application/json')) {
    responseData = await response.json().catch(() => ({}));
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (typeof responseData === 'object' && (responseData.message || responseData.error))
      ? (responseData.message || responseData.error)
      : `HTTP ${response.status} ${response.statusText}`;

    console.error(`[SEBPAY ERROR] ${method} ${cleanEndpoint} -> HTTP ${response.status}:`, errorMsg);

    const error = new Error(`Erreur Sebpay (${response.status}): ${errorMsg}`);
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}

/**
 * 1. POST /collections - Création d'un paiement Sebpay avec gestion Multi-Tenant & Cas spécifiques
 * 
 * Spécificités gérées :
 * - external_reference : concaténation multi-tenant "${tenant_id}___${order_id}"
 * - callback_url : webhook officiel Render
 * - otp_code : transmis si opérateur Orange ou requis
 * - Dépaquetage du wrapper Sebpay (response.data.data ou response.data)
 * - Détection Wave : si provider_link présent -> action redirect
 */
async function createSebpayCollection(params) {
  const {
    tenantId = 'nanasore_central_hub',
    orderId = `ORD_${Date.now()}`,
    amount,
    currency,
    country,
    countryCode,
    phone,
    customerPhone,
    customerName,
    customerEmail,
    operator,
    otpCode,
    description,
    callbackUrl,
    customPayload = {}
  } = params;

  if (!amount || Number(amount) <= 0) {
    throw new Error('Le montant du paiement est requis et doit être supérieur à 0.');
  }

  const effectivePhone = (phone || customerPhone || '').replace(/[^0-9+]/g, '');

  // Nettoyage standardisé du nom de la boutique pour qu'il soit propre dans l'external_reference
  const rawShopName = params.shopName || params.storeName || tenantId || 'boutique';
  const cleanShopName = String(rawShopName)
    .toLowerCase()
    .replace(/^nanasore_/, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'boutique';

  const externalReference = params.externalReference || params.external_reference || `nanasore_${cleanShopName}___${orderId}`;
  const effectiveCallback = callbackUrl || process.env.PAYMENT_CALLBACK_URL || process.env.PAYMENT_WEBHOOK_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/webhook';

  // Résolution obligatoire du code ISO pays (ex: "BF"), ID et devise (ex: "XOF")
  const resolved = resolveCountryAndCurrency(
    country || countryCode || customPayload.country || customPayload.country_code,
    effectivePhone,
    currency || customPayload.currency
  );

  // Objet Pays complet conforme à la documentation officielle Sebpay et /api/v1/countries
  const countryObject = {
    id: resolved.id || "20260506192835258815",
    country_name: resolved.country_name || "Burkina Faso",
    country_code: (resolved.country_code || resolved.country || "BF").toUpperCase(),
    prefix: resolved.prefix || "+226",
    currency: resolved.currency || "XOF"
  };

  const countryIso = countryObject.country_code;

  // Normalisation universelle du code opérateur pour l'API Sebpay
  const rawOperator = operator || customPayload.operator || customPayload.provider || params.provider || params.operator_code || params.slug || '';
  const normalizedOperator = normalizeSebpayOperator(countryIso, rawOperator) || SEBPAY_DEFAULT_OPERATOR_BY_COUNTRY[countryIso] || 'orange';
  const isLigdicash = String(rawOperator || normalizedOperator || '').toLowerCase().includes('ligdicash');

  // 1. Validation préalable du format téléphonique (minimum 8 chiffres requis)
  const localPhoneNumber = formatLocalPhoneNumber(effectivePhone);
  if (localPhoneNumber.length < 8) {
    console.error(`[SEBPAY GUARD] Opérateur ou numéro invalide : Numéro local "${effectivePhone}" (nettoyé: "${localPhoneNumber}") incomplet (minimum 8 chiffres requis).`);
    const phoneErr = new Error(`Le numéro de téléphone "${effectivePhone}" est invalide (minimum 8 chiffres requis).`);
    phoneErr.code = 'INVALID_PHONE_NUMBER';
    phoneErr.status = 400;
    throw phoneErr;
  }

  // 2. Vérification préalable dynamique des opérateurs (GET /operators?country=...)
  const operatorDetails = await resolveSebpayOperatorDetails(countryIso, rawOperator);

  // Pour LigdiCash (mode Wallet / Checkout redirection) : désactivation absolue de l'OTP
  if (isLigdicash) {
    operatorDetails.otp_required = false;
  }

  console.log(`[SEBPAY GUARD] Opérateur vérifié pour ${countryIso} : ${operatorDetails.name} [slug: "${operatorDetails.slug}", code: "${operatorDetails.code}", id: "${operatorDetails.id}", otp_required: ${operatorDetails.otp_required}]`);

  // Extraction polyvalente du code d'autorisation temporaire (OTP) Orange Money
  const effectiveOtp = String(
    params.otpCode ||
    params.otp ||
    params.otp_code ||
    params.authorization_code ||
    customPayload.otpCode ||
    customPayload.otp ||
    customPayload.otp_code ||
    ''
  ).trim();

  // 3. Contrôle strict de l'OTP : Si l'opérateur exige un OTP (Orange BF), refuser catégoriquement si absent
  // Ne s'applique JAMAIS à LigdiCash
  if (!isLigdicash && operatorDetails.otp_required) {
    if (!effectiveOtp || effectiveOtp.length < 4) {
      console.error(`[SEBPAY GUARD] Opérateur introuvable ou OTP manquant : L'opérateur ${operatorDetails.name} (${operatorDetails.slug}) au ${countryIso} exige obligatoirement un code OTP. Requête bloquée avant POST /collections.`);
      const otpErr = new Error(`Le code d'autorisation temporaire (OTP) est obligatoire pour valider le paiement via ${operatorDetails.name}. Veuillez composer le code USSD ${operatorDetails.ussd_code || '*144*4*6*montant#'} sur votre mobile Orange pour générer votre code OTP.`);
      otpErr.code = 'OTP_REQUIRED';
      otpErr.status = 400;
      otpErr.operator = operatorDetails.slug;
      otpErr.operator_id = operatorDetails.id;
      otpErr.ussd_code = operatorDetails.ussd_code || '*144*4*6*montant#';
      otpErr.data = {
        success: false,
        code: 'OTP_REQUIRED',
        operator: operatorDetails.slug,
        operator_id: operatorDetails.id,
        ussd_code: operatorDetails.ussd_code || '*144*4*6*montant#',
        message: otpErr.message
      };
      throw otpErr;
    }
    console.log(`[SEBPAY GUARD] Contrôle strict OTP validé pour ${operatorDetails.name} (Code OTP présent: ${effectiveOtp.length} caractères)`);
  }

  const operatorSlug = operatorDetails.slug;
  const operatorCode = operatorDetails.code;
  const operatorId = operatorDetails.id;
  const isOtpRequired = operatorDetails.otp_required;

  // Objet opérateur complet strictement conforme à la documentation officielle Sebpay (/api/v1/operators)
  const operatorObject = {
    id: operatorDetails.id,
    name: operatorDetails.name,
    slug: operatorDetails.slug,
    code: operatorDetails.code,
    country: operatorDetails.country || {
      id: countryObject.id,
      country_name: countryObject.country_name,
      country_code: countryIso
    },
    otp_required: operatorDetails.otp_required
  };

  // Préparation du numéro de téléphone au format Sebpay (avec indicatif 226 pour le BF, ex: 22670123456)
  const finalSebpayPhone = formatSebpayPhoneNumber(effectivePhone, countryIso);
  const sebpayPhone = finalSebpayPhone;

  // Troncature sécurisée selon la spécification Sebpay (Max 255 caractères)
  const safeExternalReference = String(externalReference).trim().slice(0, 255);

  // Construction STRICTEMENT CONFORME à la documentation officielle Sebpay POST /collections
  // Seuls les champs explicitement autorisés par l'API sont inclus pour éviter les rejets 400/422
  const body = {
    amount: Math.round(Number(amount)),
    currency: resolved.currency || 'XOF',
    phone: finalSebpayPhone,
    operator: operatorCode || 'orange', // Code ('orange', 'mtn') ou slug ('orange-bf', 'mtn-bj')
    country: countryIso,                // Code ISO du pays (ex: 'BF', 'CI', 'BJ')
    external_reference: safeExternalReference
  };

  // Champs optionnels officiellement documentés
  if (effectiveCallback) {
    body.callback_url = effectiveCallback;
  }
  if (customerName) {
    body.customer_name = String(customerName).trim();
  }
  if (customerEmail) {
    body.customer_email = String(customerEmail).trim();
  }
  if (!isLigdicash && effectiveOtp) {
    body.otp_code = effectiveOtp;
  }

  console.log(`[SEBPAY INITIATE] Collection pour ${safeExternalReference} | ${amount} ${resolved.currency} | Pays: ${countryIso} | Opérateur: ${body.operator} (Slug: ${operatorSlug}) | OTP Présent: ${Boolean(!isLigdicash && effectiveOtp)}`);
  console.log('[SEBPAY PAYLOAD DUMP]', JSON.stringify(body, null, 2));

  let rawResponse;
  try {
    rawResponse = await callSebpayApi('collections', {
      method: 'POST',
      body
    });
  } catch (apiErr) {
    // Analyse et adaptation conforme aux codes d'erreur officiels de la documentation Sebpay :
    const errorData = apiErr.data || {};
    const errorStr = JSON.stringify(errorData).toLowerCase();
    console.error('[SEBPAY API ERROR DETAIL]', JSON.stringify(errorData));

    // 400 PAYMENT_DECLINED : L'opérateur a refusé la demande avant qu'elle n'atteigne le client
    if (apiErr.status === 400 && (errorStr.includes('payment_declined') || errorStr.includes('declined'))) {
      const declinedErr = new Error(`Paiement refusé par l'opérateur (PAYMENT_DECLINED). Veuillez vérifier le solde du compte et le numéro de téléphone, puis réessayez.`);
      declinedErr.status = 400;
      declinedErr.code = 'PAYMENT_DECLINED';
      declinedErr.data = errorData;
      throw declinedErr;
    }

    // 409 EXTERNAL_REFERENCE_CONFLICT : Conflit d'identifiant envoyé avec d'autres paramètres
    if (apiErr.status === 409 || errorStr.includes('external_reference_conflict')) {
      const conflictErr = new Error(`Conflit de référence externe (EXTERNAL_REFERENCE_CONFLICT). Cet identifiant a déjà été utilisé avec des paramètres différents.`);
      conflictErr.status = 409;
      conflictErr.code = 'EXTERNAL_REFERENCE_CONFLICT';
      conflictErr.data = errorData;
      throw conflictErr;
    }

    // 422 OTP_REQUIRED : L'opérateur exige un OTP
    if (apiErr.status === 422 && (errorStr.includes('otp_required') || errorStr.includes('otp'))) {
      const otpErr = new Error(`L'opérateur exige un code OTP (OTP_REQUIRED). Veuillez demander le code OTP au client.`);
      otpErr.status = 422;
      otpErr.code = 'OTP_REQUIRED';
      otpErr.data = errorData;
      throw otpErr;
    }

    // 503 OPERATOR_MAINTENANCE : Opérateur ou pays temporairement indisponible
    if (apiErr.status === 503 || errorStr.includes('operator_maintenance') || errorStr.includes('maintenance')) {
      const maintErr = new Error(`L'opérateur ou le pays est temporairement en maintenance (OPERATOR_MAINTENANCE). Veuillez réessayer plus tard.`);
      maintErr.status = 503;
      maintErr.code = 'OPERATOR_MAINTENANCE';
      maintErr.data = errorData;
      throw maintErr;
    }

    // Alternative Opérateur : Si le code court ('orange') a été rejeté, tentative avec le slug officiel ('orange-bf')
    if ((apiErr.status === 400 || apiErr.status === 422) && body.operator !== operatorSlug) {
      console.warn(`[SEBPAY AUTO-ADAPT OPERATOR SLUG] Sebpay a rejeté "${body.operator}". Nouvelle tentative avec le slug officiel : "${operatorSlug}"`);
      body.operator = operatorSlug;
      console.log('[SEBPAY PAYLOAD DUMP]', JSON.stringify(body, null, 2));
      try {
        rawResponse = await callSebpayApi('collections', {
          method: 'POST',
          body
        });
        return rawResponse;
      } catch (errSlug) {
        console.warn(`[SEBPAY AUTO-ADAPT NOTICE] Échec avec slug "${operatorSlug}" :`, errSlug.message);
      }
    }

    throw apiErr;
  }

  // Dépaquetage du wrapper Sebpay : { success: true, data: { ... }, message: "..." }
  let innerData = rawResponse?.data;
  if (innerData && typeof innerData === 'object' && innerData.data) {
    innerData = innerData.data;
  }
  const sebpayData = innerData || rawResponse;

  // Détection exhaustive du lien de redirection (Spécifique LigdiCash / Wave / Checkout link documenté)
  const providerLink =
    sebpayData?.provider_link ||
    sebpayData?.checkout_url ||
    sebpayData?.payment_url ||
    sebpayData?.redirect_url ||
    rawResponse?.data?.provider_link ||
    rawResponse?.data?.checkout_url ||
    rawResponse?.data?.payment_url ||
    rawResponse?.data?.redirect_url ||
    rawResponse?.provider_link ||
    rawResponse?.checkout_url ||
    rawResponse?.payment_url ||
    rawResponse?.redirect_url ||
    null;

  return {
    success: rawResponse?.success !== false,
    action: providerLink ? 'redirect' : 'pending',
    transaction_id: sebpayData?.transaction_id || sebpayData?.id || null,
    status: sebpayData?.status || 'pending',
    external_reference: sebpayData?.external_reference || safeExternalReference,
    amount: Number(sebpayData?.amount || amount),
    currency: sebpayData?.currency || resolved.currency,
    provider_link: providerLink,
    paymentUrl: providerLink,
    checkout_url: providerLink,
    redirectUrl: providerLink,
    message: sebpayData?.message || rawResponse?.message || (providerLink ? 'Redirection vers la passerelle opérateur requise' : 'Demande de paiement initiée avec succès.'),
    idempotent_replay: Boolean(sebpayData?.idempotent_replay),
    tenantId,
    orderId,
    country: resolved.country,
    txId: sebpayData?.transaction_id || sebpayData?.id || safeExternalReference,
    data: sebpayData
  };
}

/**
 * 1b. POST /checkout/sessions - Création d'une session de paiement hébergée Sebpay
 * Redirection sécurisée du client vers l'interface Hosted Checkout Sebpay avec pré-remplissage.
 * 
 * @param {object} params
 */
async function createSebpayCheckoutSession(params = {}) {
  const {
    amount,
    currency = 'XOF',
    orderId,
    storeId = 'nanasore_central_hub',
    tenantId,
    shopName,
    externalReference,
    external_reference,
    redirectUrl,
    redirect_url,
    returnUrl,
    return_url,
    callbackUrl,
    callback_url,
    customerPhone,
    phone,
    customer_phone,
    customerEmail,
    email,
    customer_email,
    customerName,
    name,
    customer_name,
    country,
    countryCode,
    metadata = {}
  } = params;

  if (!amount || Number(amount) <= 0) {
    throw new Error('[SEBPAY CHECKOUT SESSION] Le montant (amount > 0) est obligatoire.');
  }

  const effectiveOrderId = orderId || params.id || `ORD-${Date.now()}`;
  const rawShopName = shopName || tenantId || storeId || 'boutique';
  const cleanShopName = String(rawShopName)
    .toLowerCase()
    .replace(/^nanasore_/, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'boutique';

  const safeExternalReference = String(
    externalReference ||
    external_reference ||
    `nanasore_${cleanShopName}___${effectiveOrderId}`
  ).trim().slice(0, 255);

  const rawPhone = customerPhone || customer_phone || phone || '';
  const resolvedCountry = String(country || countryCode || 'BF').trim().toUpperCase();
  const formattedPhone = rawPhone ? formatSebpayPhoneNumber(rawPhone, resolvedCountry) : undefined;

  const effectiveRedirectUrl = redirectUrl || redirect_url || returnUrl || return_url || 'https://nanasore.com/checkout/return';
  const effectiveCallbackUrl = callbackUrl || callback_url || process.env.PAYMENT_CALLBACK_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/webhook';

  const body = {
    amount: Math.round(Number(amount)),
    currency: String(currency || 'XOF').toUpperCase(),
    redirect_url: effectiveRedirectUrl,
    external_reference: safeExternalReference,
    callback_url: effectiveCallbackUrl,
    metadata: {
      orderId: effectiveOrderId,
      storeId: tenantId || storeId || 'nanasore_central_hub',
      ...metadata
    }
  };

  if (formattedPhone) {
    body.customer_phone = formattedPhone;
  }
  const effectiveCustomerEmail = customerEmail || email || customer_email;
  if (effectiveCustomerEmail) {
    body.customer_email = String(effectiveCustomerEmail).trim();
  }
  const effectiveCustomerName = customerName || name || customer_name;
  if (effectiveCustomerName) {
    body.customer_name = String(effectiveCustomerName).trim();
  }

  console.log(`[SEBPAY CHECKOUT SESSION] Création Hosted Session pour ${safeExternalReference} (${amount} ${body.currency}) | Tél: ${formattedPhone || 'N/A'}`);
  console.log('[SEBPAY CHECKOUT PAYLOAD]', JSON.stringify(body, null, 2));

  const customHeaders = params.customHeaders || {};
  if (params.customCredentials?.sebpay) {
    if (params.customCredentials.sebpay.public_key) customHeaders.publicKey = params.customCredentials.sebpay.public_key;
    if (params.customCredentials.sebpay.secret_key) customHeaders.secretKey = params.customCredentials.sebpay.secret_key;
  }

  let rawResponse;
  try {
    rawResponse = await callSebpayApi('checkout/sessions', {
      method: 'POST',
      body,
      headers: customHeaders
    });
  } catch (err) {
    console.error('[SEBPAY CHECKOUT SESSION ERROR]', err.message, err.data || '');
    throw err;
  }

  let innerData = rawResponse?.data;
  if (innerData && typeof innerData === 'object' && innerData.data) {
    innerData = innerData.data;
  }
  const sessionData = innerData || rawResponse;

  const checkoutUrl =
    sessionData?.checkout_url ||
    sessionData?.url ||
    sessionData?.payment_url ||
    sessionData?.redirect_url ||
    rawResponse?.checkout_url ||
    rawResponse?.url ||
    `https://checkout.sebpay.bj/pay/${sessionData?.id || effectiveOrderId}`;

  const sessionId = String(
    sessionData?.id ||
    sessionData?.checkout_session_id ||
    sessionData?.session_id ||
    rawResponse?.id ||
    `cs_${Date.now()}`
  );

  return {
    success: rawResponse?.success !== false,
    action: 'REDIRECT',
    redirectUrl: checkoutUrl,
    checkout_url: checkoutUrl,
    paymentUrl: checkoutUrl,
    provider_link: checkoutUrl,
    checkout_session_id: sessionId,
    id: sessionId,
    transaction_id: sessionId,
    external_reference: safeExternalReference,
    orderId: effectiveOrderId,
    storeId: tenantId || storeId,
    amount: Number(sessionData?.amount || amount),
    currency: sessionData?.currency || body.currency,
    message: rawResponse?.message || 'Session de paiement hébergée Sebpay créée avec succès.',
    failover: Boolean(params.failover),
    data: sessionData,
    rawResponse
  };
}

/**
 * 1c. GET /checkout/sessions/{id} - Vérification du statut d'une session de paiement hébergée Sebpay
 * Utilisé au retour client sur /checkout/return?checkout_session_id=...
 * 
 * @param {string} sessionId - Identifiant de la session de paiement
 */
async function getSebpayCheckoutSession(sessionId) {
  if (!sessionId) {
    throw new Error('[SEBPAY CHECKOUT SESSION] Identifiant de session (checkout_session_id) obligatoire.');
  }
  const cleanId = String(sessionId).trim();
  console.log(`[SEBPAY CHECKOUT SESSION] Vérification de la session "${cleanId}" auprès de Sebpay...`);

  let rawResponse;
  try {
    rawResponse = await callSebpayApi(`checkout/sessions/${cleanId}`, {
      method: 'GET'
    });
  } catch (err) {
    console.error(`[SEBPAY CHECKOUT SESSION GET ERROR] ${cleanId} :`, err.message);
    throw err;
  }

  let innerData = rawResponse?.data;
  if (innerData && typeof innerData === 'object' && innerData.data) {
    innerData = innerData.data;
  }
  const session = innerData || rawResponse;

  const transactionStatus = String(
    session?.transaction_status ||
    session?.status ||
    session?.payment_status ||
    'pending'
  ).toLowerCase();

  const isApproved = ['approved', 'success', 'paid', 'completed', 'validated', 'confirmed'].includes(transactionStatus);

  return {
    success: rawResponse?.success !== false,
    id: cleanId,
    checkout_session_id: cleanId,
    transaction_status: transactionStatus,
    isPaid: isApproved,
    isApproved,
    status: isApproved ? 'APPROVED' : transactionStatus.toUpperCase(),
    amount: Number(session?.amount || 0),
    currency: session?.currency || 'XOF',
    external_reference: session?.external_reference || session?.metadata?.orderId || null,
    orderId: session?.metadata?.orderId || null,
    storeId: session?.metadata?.storeId || null,
    customer_phone: session?.customer_phone || session?.phone || null,
    metadata: session?.metadata || {},
    data: session,
    rawResponse
  };
}

/**
 * 2. GET /collections/{id_or_reference} - Lecture d'une collecte
 * Récupère une collecte créée par POST /collections, via son identifiant SebPay ou external_reference.
 * Revérifie automatiquement son statut auprès de l'opérateur si elle est en attente.
 * 
 * @param {string} idOrReference - Identifiant de transaction SebPay ou external_reference
 */
async function getSebpayCollection(idOrReference) {
  if (!idOrReference) {
    throw new Error('Identifiant SebPay ou external_reference requis pour la vérification');
  }

  const cleanRef = String(idOrReference).trim();

  // Guard : Sebpay /collections/{id} n'accepte QUE son propre transaction_id officiel (ex: "26102609322822189215").
  // Ne JAMAIS appeler l'API Sebpay avec une référence de commande (CHK-...) ou composite (___) pour éviter les boucles 404.
  if (cleanRef.startsWith('CHK-') || cleanRef.includes('___')) {
    console.warn(`[SEBPAY GUARD] Référence de commande interne détectée "${cleanRef}". Seul un transaction_id numérique officiel Sebpay est vérifiable.`);
    return {
      success: false,
      isPaid: false,
      status: 'pending',
      transaction_id: null,
      external_reference: cleanRef,
      amount: 0,
      currency: 'XOF',
      message: 'En attente de transaction_id Sebpay officiel.'
    };
  }

  console.log(`[SEBPAY GET COLLECTION] Vérification de ${cleanRef}...`);

  const rawResponse = await callSebpayApi(`collections/${encodeURIComponent(cleanRef)}`, {
    method: 'GET'
  });

  // Dépaquetage du wrapper officiel Sebpay : { success: true, data: { ... }, message: "..." }
  let innerData = rawResponse?.data;
  if (innerData && typeof innerData === 'object' && innerData.data) {
    innerData = innerData.data;
  }
  const sebpayData = innerData || rawResponse;

  const rawStatus = String(sebpayData?.status || '').toLowerCase();
  const isPaid = rawStatus === 'approved' || rawStatus === 'success' || rawStatus === 'completed';

  return {
    success: isPaid,
    transaction_id: sebpayData?.transaction_id || null,
    external_reference: sebpayData?.external_reference || cleanRef,
    status: sebpayData?.status || (isPaid ? 'approved' : 'pending'),
    isPaid,
    amount: Number(sebpayData?.amount || 0),
    currency: sebpayData?.currency || 'XOF',
    created_at: sebpayData?.created_at || null,
    updated_at: sebpayData?.updated_at || null,
    data: sebpayData,
    message: rawResponse?.message || (isPaid ? 'Paiement validé avec succès par Sebpay.' : 'Paiement en attente de confirmation.')
  };
}

// ============================================================================
// 3. CATALOGUE DES 20 PAYS COUVERTS SEBPAY & GESTION DE CACHE SERVEUR
// ============================================================================
const SEBPAY_SUPPORTED_COUNTRIES_FALLBACK = [
  {
    id: 'bj',
    country_name: 'Bénin',
    country_code: 'BJ',
    prefix: '+229',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇧🇯',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Celtiis Money', 'Coris Money', 'Moov Money', 'MTN Money']
  },
  {
    id: 'bf',
    country_name: 'Burkina Faso',
    country_code: 'BF',
    prefix: '+226',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇧🇫',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Moov Money', 'Orange Money', 'Wallet LigdiCash', 'Wave Money']
  },
  {
    id: 'cm',
    country_name: 'Cameroun',
    country_code: 'CM',
    prefix: '+237',
    currency: 'XAF',
    currency_symbol: 'FCFA',
    flag: '🇨🇲',
    zone: 'CEMAC',
    status: 'Active',
    operators: ['MTN Money', 'Orange Money']
  },
  {
    id: 'cg',
    country_name: 'Congo',
    country_code: 'CG',
    prefix: '+242',
    currency: 'XAF',
    currency_symbol: 'FCFA',
    flag: '🇨🇬',
    zone: 'CEMAC',
    status: 'Active',
    operators: ['Airtel Money', 'MTN Money']
  },
  {
    id: 'ci',
    country_name: "Côte d'Ivoire",
    country_code: 'CI',
    prefix: '+225',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇨🇮',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Moov Money', 'MTN Money', 'Orange Money', 'Wave Money']
  },
  {
    id: 'ga',
    country_name: 'Gabon',
    country_code: 'GA',
    prefix: '+241',
    currency: 'XAF',
    currency_symbol: 'FCFA',
    flag: '🇬🇦',
    zone: 'CEMAC',
    status: 'Active',
    operators: ['Airtel Money', 'Moov Money']
  },
  {
    id: 'gm',
    country_name: 'Gambie',
    country_code: 'GM',
    prefix: '+220',
    currency: 'GMD',
    currency_symbol: 'D',
    flag: '🇬🇲',
    zone: 'CEDEAO',
    status: 'Active',
    operators: ['Afri Money']
  },
  {
    id: 'gh',
    country_name: 'Ghana',
    country_code: 'GH',
    prefix: '+233',
    currency: 'GHS',
    currency_symbol: 'GH₵',
    flag: '🇬🇭',
    zone: 'CEDEAO',
    status: 'Active',
    operators: ['AIRTEL', 'MTN Money', 'TELECEL CASH']
  },
  {
    id: 'gn',
    country_name: 'Guinée Conakry',
    country_code: 'GN',
    prefix: '+224',
    currency: 'GNF',
    currency_symbol: 'FG',
    flag: '🇬🇳',
    zone: 'CEDEAO',
    status: 'Active',
    operators: ['MTN Money', 'Orange Money']
  },
  {
    id: 'gw',
    country_name: 'Guinée-Bissau',
    country_code: 'GW',
    prefix: '+245',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇬🇼',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Orange Money']
  },
  {
    id: 'ke',
    country_name: 'Kenya',
    country_code: 'KE',
    prefix: '+254',
    currency: 'KES',
    currency_symbol: 'KSh',
    flag: '🇰🇪',
    zone: 'EAC',
    status: 'Active',
    operators: ['Airtel', 'Mpesa']
  },
  {
    id: 'ml',
    country_name: 'Mali',
    country_code: 'ML',
    prefix: '+223',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇲🇱',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Mobicash', 'Moov Money', 'Orange Money']
  },
  {
    id: 'ne',
    country_name: 'Niger',
    country_code: 'NE',
    prefix: '+227',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇳🇪',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Airtel Money', 'Amanata', 'Moov Money', 'Nita', 'Wallet LigdiCash', 'Zamani']
  },
  {
    id: 'ng',
    country_name: 'Nigéria',
    country_code: 'NG',
    prefix: '+234',
    currency: 'NGN',
    currency_symbol: '₦',
    flag: '🇳🇬',
    zone: 'CEDEAO',
    status: 'Active',
    operators: ['AIRTEL', 'MTN Money']
  },
  {
    id: 'ug',
    country_name: 'Ouganda',
    country_code: 'UG',
    prefix: '+256',
    currency: 'UGX',
    currency_symbol: 'USh',
    flag: '🇺🇬',
    zone: 'EAC',
    status: 'Active',
    operators: ['Airtel', 'Mtn']
  },
  {
    id: 'cd',
    country_name: 'R.D.C',
    country_code: 'CD',
    prefix: '+243',
    currency: 'CDF',
    currency_symbol: 'FC',
    flag: '🇨🇩',
    zone: 'Afrique Centrale',
    status: 'Active',
    operators: ['Afri Money', 'Airtel Money', 'Mpesa Money', 'Orange Money', 'Vodacom']
  },
  {
    id: 'sn',
    country_name: 'Sénégal',
    country_code: 'SN',
    prefix: '+221',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇸🇳',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Free Money', 'Orange Money', 'Wave Money', 'E-money']
  },
  {
    id: 'tz',
    country_name: 'Tanzanie',
    country_code: 'TZ',
    prefix: '+255',
    currency: 'TZS',
    currency_symbol: 'TSh',
    flag: '🇹🇿',
    zone: 'EAC',
    status: 'Active',
    operators: ['Airtel', 'Ezy pesa', 'Halo Pesa', 'Mpesa', 'Tigo pesa']
  },
  {
    id: 'td',
    country_name: 'Tchad',
    country_code: 'TD',
    prefix: '+235',
    currency: 'XAF',
    currency_symbol: 'FCFA',
    flag: '🇹🇩',
    zone: 'CEMAC',
    status: 'Active',
    operators: ['Moov', 'Airtel']
  },
  {
    id: 'tg',
    country_name: 'Togo',
    country_code: 'TG',
    prefix: '+228',
    currency: 'XOF',
    currency_symbol: 'CFA',
    flag: '🇹🇬',
    zone: 'UEMOA',
    status: 'Active',
    operators: ['Moov Money', 'TogoCom', 'Wave Money']
  },
  {
    id: 'mr',
    country_name: 'Mauritanie',
    country_code: 'MR',
    prefix: '+222',
    currency: 'MRU',
    currency_symbol: 'MRU',
    flag: '🇲🇷',
    zone: 'AUTRES_AFRIQUE',
    status: 'Active',
    operators: ['Bankily', 'Masrvi', 'Sedad', 'Mauripay']
  },
  {
    id: 'rw',
    country_name: 'Rwanda',
    country_code: 'RW',
    prefix: '+250',
    currency: 'RWF',
    currency_symbol: 'RF',
    flag: '🇷🇼',
    zone: 'AUTRES_AFRIQUE',
    status: 'Active',
    operators: ['MTN Mobile Money', 'Airtel Money']
  },
  {
    id: 'diaspora',
    country_name: 'Diaspora & International',
    country_code: 'DIASPORA',
    prefix: '+1',
    currency: 'EUR',
    currency_symbol: '€',
    flag: '🌍',
    zone: 'INTERNATIONAL',
    status: 'Active',
    operators: ['Visa / Mastercard', 'Apple Pay', 'Google Pay', 'Taptap Send']
  }
];

let cachedCountries = null;
let cachedCountriesTimestamp = 0;
const COUNTRIES_CACHE_TTL_MS = 60 * 60 * 1000; // Cache 1 heure

/**
 * 3. GET /countries - Récupère la liste des pays supportés par Sebpay (avec cache serveur et fallback)
 */
async function getSebpayCountries(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCountries && (now - cachedCountriesTimestamp < COUNTRIES_CACHE_TTL_MS)) {
    return {
      success: true,
      cached: true,
      cachedAt: new Date(cachedCountriesTimestamp).toISOString(),
      count: cachedCountries.length,
      countries: cachedCountries
    };
  }

  try {
    const rawResponse = await callSebpayApi('countries', { method: 'GET' });
    let items = rawResponse?.data;
    if (items && typeof items === 'object' && items.data) {
      items = items.data;
    }
    if (Array.isArray(items) && items.length > 0) {
      const cleaned = items.map((c) => {
        const code = (c.country_code || c.code || '').toUpperCase();
        const fallback = SEBPAY_SUPPORTED_COUNTRIES_FALLBACK.find(f => f.country_code === code);
        return {
          id: c.id || code.toLowerCase(),
          country_name: c.country_name || c.name || fallback?.country_name || code,
          country_code: code,
          prefix: c.prefix || fallback?.prefix || '',
          currency: typeof c.currency === 'object' ? (c.currency?.code || c.currency?.name || 'XOF') : (c.currency || fallback?.currency || 'XOF'),
          currency_symbol: fallback?.currency_symbol || c.currency_symbol || '',
          flag: fallback?.flag || '🌍',
          zone: fallback?.zone || 'Afrique',
          status: c.status || 'Active',
          operators: fallback?.operators || []
        };
      });

      cachedCountries = cleaned;
      cachedCountriesTimestamp = now;

      return {
        success: true,
        cached: false,
        count: cleaned.length,
        countries: cleaned
      };
    }
  } catch (err) {
    console.warn('[SEBPAY COUNTRIES API] Échec appel distant, utilisation du catalogue de secours :', err.message);
  }

  // Fallback 20 pays certifiés
  cachedCountries = SEBPAY_SUPPORTED_COUNTRIES_FALLBACK;
  cachedCountriesTimestamp = now;

  return {
    success: true,
    cached: true,
    fallback: true,
    count: SEBPAY_SUPPORTED_COUNTRIES_FALLBACK.length,
    countries: SEBPAY_SUPPORTED_COUNTRIES_FALLBACK
  };
}

const cachedOperatorsByCountry = new Map();
const OPERATORS_CACHE_TTL_MS = 60 * 60 * 1000; // Cache 1 heure

/**
 * 4. GET /operators?country={country} - Récupère les opérateurs actifs auprès de Sebpay (avec cache dynamique 1h)
 * 
 * @param {string} [country='BF'] - Code ISO du pays (ex: 'BF', 'CI', 'BJ')
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ success: boolean, country: string, cached?: boolean, operators: Array }>}
 */
async function getSebpayOperators(country = 'BF', forceRefresh = false) {
  const cleanCountry = String(country || 'BF').trim().toUpperCase();
  const now = Date.now();
  const cached = cachedOperatorsByCountry.get(cleanCountry);

  if (!forceRefresh && cached && (now - cached.timestamp < OPERATORS_CACHE_TTL_MS)) {
    return {
      success: true,
      country: cleanCountry,
      cached: true,
      operators: cached.operators
    };
  }

  try {
    const rawResponse = await callSebpayApi(`operators?country=${encodeURIComponent(cleanCountry)}`, {
      method: 'GET'
    });
    let items = rawResponse?.data;
    if (items && typeof items === 'object' && items.data) {
      items = items.data;
    }
    const operatorsList = Array.isArray(items) ? items : (rawResponse?.operators || []);

    if (operatorsList.length > 0) {
      cachedOperatorsByCountry.set(cleanCountry, {
        timestamp: now,
        operators: operatorsList
      });
    }

    return {
      success: true,
      country: cleanCountry,
      cached: false,
      operators: operatorsList
    };
  } catch (err) {
    console.warn(`[SEBPAY OPERATORS API] Impossible de récupérer les opérateurs pour ${cleanCountry}:`, err.message);
    const fallbackList = cleanCountry === 'BF'
      ? Object.values(BF_OPERATORS_MAP)
      : (SEBPAY_COUNTRY_OPERATORS[cleanCountry] || ['orange', 'moov']).map(slug => ({
          slug,
          code: slug.toUpperCase(),
          name: slug === 'orange' ? 'Orange Money' : slug === 'moov' ? 'Moov Money' : slug,
          otp_required: cleanCountry === 'BF' && slug === 'orange',
          country_code: cleanCountry
        }));
    return {
      success: false,
      country: cleanCountry,
      error: err.message,
      operators: fallbackList
    };
  }
}

/**
 * Résout de manière dynamique et certifiée les détails d'un opérateur auprès de Sebpay.
 * Interroge GET /operators?country={country} pour récupérer dynamiquement :
 * - id : l'identifiant unique officiel
 * - slug : le slug officiel (ex: 'orange-bf')
 * - code : le code opérateur (ex: 'orange')
 * - otp_required : indicateur d'exigence d'un code OTP
 * - ussd_code : syntaxe de génération OTP si applicable (*144*4*6*montant#)
 * 
 * @param {string} countryCode - Code ISO (ex: 'BF')
 * @param {string} rawOperator - Nom, code ou slug demandé (ex: 'orange', 'orange-bf', 'ORANGE_MONEY')
 * @returns {Promise<{ found: boolean, id: string, name: string, slug: string, code: string, otp_required: boolean, ussd_code: string|null, country: object }>}
 */
async function resolveSebpayOperatorDetails(countryCode = 'BF', rawOperator = '') {
  const cleanCountry = String(countryCode || 'BF').trim().toUpperCase();
  const input = String(rawOperator || '').trim().toLowerCase();
  const normalizedSlug = normalizeSebpayOperator(cleanCountry, input) || 'orange';

  let foundOp = null;

  try {
    const opsRes = await getSebpayOperators(cleanCountry);
    const opsList = opsRes.operators || [];

    // Recherche multi-critères dans la liste dynamique retournée par Sebpay
    foundOp = opsList.find(op => {
      const opId = String(op.id || '').trim();
      const opSlug = String(op.slug || '').trim().toLowerCase();
      const opCode = String(op.code || '').trim().toLowerCase();
      const opName = String(op.name || '').trim().toLowerCase();

      return (
        opId === rawOperator ||
        opSlug === input ||
        opCode === input ||
        opSlug === normalizedSlug ||
        opCode === normalizedSlug ||
        (cleanCountry === 'BF' && (normalizedSlug === 'orange' && (opSlug === 'orange-bf' || opCode === 'orange' || opName.includes('orange')))) ||
        (cleanCountry === 'BF' && (normalizedSlug === 'moov' && (opSlug === 'moov-bf' || opCode === 'moov' || opName.includes('moov')))) ||
        (cleanCountry === 'BF' && (normalizedSlug === 'wligdicash' && (opSlug.includes('ligdicash') || opCode.includes('ligdicash'))))
      );
    });
  } catch (err) {
    console.warn(`[SEBPAY GUARD] Erreur lors de la résolution dynamique des opérateurs pour ${cleanCountry} :`, err.message);
  }

  // Fallback certifié pour le Burkina Faso
  if (!foundOp && cleanCountry === 'BF') {
    foundOp = BF_OPERATORS_MAP[normalizedSlug] || BF_OPERATORS_MAP['orange'];
  }

  if (!foundOp) {
    return {
      found: false,
      id: `${normalizedSlug}_${cleanCountry.toLowerCase()}`,
      name: `${normalizedSlug.toUpperCase()} Money`,
      slug: normalizedSlug,
      code: normalizedSlug,
      otp_required: cleanCountry === 'BF' && normalizedSlug === 'orange',
      ussd_code: (cleanCountry === 'BF' && normalizedSlug === 'orange') ? '*144*4*6*montant#' : null,
      country: { country_code: cleanCountry }
    };
  }

  return {
    found: true,
    id: String(foundOp.id || `${normalizedSlug}_${cleanCountry.toLowerCase()}`),
    name: foundOp.name || 'Opérateur Mobile',
    slug: foundOp.slug || normalizedSlug,
    code: foundOp.code || normalizedSlug,
    otp_required: Boolean(foundOp.otp_required),
    ussd_code: foundOp.ussd_code || (foundOp.slug === 'orange-bf' ? '*144*4*6*montant#' : null),
    country: foundOp.country || { country_code: cleanCountry }
  };
}

/**
 * Retourne une instance de HttpsProxyAgent configurée dynamiquement avec priorité SEBPAY_FIXIE_URL
 */
function getFixieHttpsProxyAgent(options = {}) {
  const { httpsAgent } = getFixieAgents('sebpay', options);
  return httpsAgent;
}

/**
 * Retourne la configuration officielle pour Axios avec HttpsProxyAgent garanti
 * Utilisable pour toute requête Axios vers l'API Sebpay
 */
function getSebpayAxiosConfig(customConfig = {}) {
  const agent = getFixieHttpsProxyAgent();
  return {
    baseURL: getSebpayBaseUrl(),
    headers: getSebpayHeaders(customConfig.headers || {}),
    httpsAgent: agent,
    httpAgent: agent,
    proxy: false,
    timeout: 25000,
    ...customConfig
  };
}

/**
 * Grille tarifaire officielle Sebpay (Frais PayIn Collections & PayOut Payouts)
 * - Collections (PayIn) : frais déduits du montant reçu par le marchand
 * - Payouts (PayOut) : frais ajoutés au montant et prélevés sur le wallet
 */
const SEBPAY_FEE_RATES = {
  collection: {
    BJ: 2.7, // Bénin : 2,7 %
    BF: 4.0, // Burkina Faso : 4 %
    CM: 3.5, // Cameroun : 3,5 %
    CG: 4.5, // Congo : 4,5 %
    CI: 2.5, // Côte d'Ivoire : 2,5 %
    GA: 4.5, // Gabon : 4,5 %
    GM: 4.0, // Gambie : 4 %
    GH: 3.5, // Ghana : 3,5 %
    GN: 4.5, // Guinée Conakry : 4,5 %
    GW: 6.5, // Guinée-Bissau : 6,5 %
    KE: 3.5, // Kenya : 3,5 %
    ML: 4.5, // Mali : 4,5 %
    NE: 5.5, // Niger : 5,5 %
    NG: 3.5, // Nigéria : 3,5 %
    UG: 4.0, // Ouganda : 4 %
    CD: 5.5, // R.D.C : 5,5 %
    SN: 3.0, // Sénégal : 3 %
    TZ: 4.5, // Tanzanie : 4,5 %
    TD: 7.0, // Tchad : 7 %
    TG: 4.5  // Togo : 4,5 %
  },
  payout: {
    BJ: 1.9, // Bénin : 1,9 %
    BF: 2.5, // Burkina Faso : 2,5 %
    CM: 2.5, // Cameroun : 2,5 %
    CG: 2.5, // Congo : 2,5 %
    CI: 2.5, // Côte d'Ivoire : 2,5 %
    GA: 2.5, // Gabon : 2,5 %
    GM: 4.5, // Gambie : 4,5 %
    GH: 2.5, // Ghana : 2,5 %
    GN: 2.5, // Guinée Conakry : 2,5 %
    GW: 3.5, // Guinée-Bissau : 3,5 %
    KE: 2.5, // Kenya : 2,5 %
    ML: 2.5, // Mali : 2,5 %
    NE: 2.5, // Niger : 2,5 %
    NG: 2.5, // Nigéria : 2,5 %
    UG: 5.0, // Ouganda : 5 %
    CD: 5.0, // R.D.C : 5 %
    SN: 2.5, // Sénégal : 2,5 %
    TZ: 5.0, // Tanzanie : 5 %
    TD: 3.5, // Tchad : 3,5 %
    TG: 3.5  // Togo : 3,5 %
  }
};

/**
 * Calcule les frais d'une transaction via l'endpoint officiel Sebpay GET /c/calculate-fee
 * ou via la grille locale certifiée en cas de secours.
 * 
 * @param {object} options
 * @param {number} options.amount - Montant en devise locale (ex: 10000 XOF)
 * @param {string} [options.country='BF'] - Code ISO du pays (ex: 'bf', 'ci', 'bj')
 * @param {string} [options.transactionType='collection'] - 'collection' (PayIn) ou 'payout' (PayOut)
 * @returns {Promise<{ fee_amount: number, fee_percentage: number, net_amount: number, total_debit: number, pricing: string, currency: string }>}
 */
async function calculateSebpayFee({ amount, country = 'BF', transactionType = 'collection' } = {}) {
  const numAmount = Math.max(0, Number(amount) || 0);
  const cleanType = String(transactionType).toLowerCase() === 'payout' ? 'payout' : 'collection';
  const cleanCountry = String(country || 'BF').trim().toUpperCase();
  const lowerCountry = cleanCountry.toLowerCase();

  // Tentative en direct via GET /api/v1/c/calculate-fee (avec clés API pour obtenir le tarif exact du compte)
  try {
    const params = new URLSearchParams({
      amount: String(numAmount),
      transaction_type: cleanType
    });
    if (cleanType === 'payout') {
      params.append('destination_country', lowerCountry);
    } else {
      params.append('source_country', lowerCountry);
    }

    const rawRes = await callSebpayApi(`c/calculate-fee?${params.toString()}`, {
      method: 'GET'
    });

    let innerData = rawRes?.data;
    if (innerData && typeof innerData === 'object' && innerData.data) {
      innerData = innerData.data;
    }
    const feeData = innerData || rawRes;
    const feeAmount = Number(feeData?.fee_amount || 0);
    const feePercentage = Number(feeData?.fee_percentage || (numAmount > 0 ? (feeAmount / numAmount) * 100 : 0));

    return {
      success: true,
      amount: numAmount,
      country: cleanCountry,
      transaction_type: cleanType,
      fee_amount: feeAmount,
      fee_percentage: feePercentage,
      net_amount: cleanType === 'collection' ? Math.max(0, numAmount - feeAmount) : numAmount,
      total_debit: cleanType === 'payout' ? numAmount + feeAmount : numAmount,
      pricing: feeData?.pricing || 'account',
      message: rawRes?.message || 'Frais calculés avec succès.'
    };
  } catch (apiErr) {
    // Repli résilient sur la grille standard certifiée Sebpay
    const rates = SEBPAY_FEE_RATES[cleanType] || SEBPAY_FEE_RATES.collection;
    const ratePercent = typeof rates[cleanCountry] === 'number' ? rates[cleanCountry] : 4.0;
    const calculatedFee = Math.round(numAmount * (ratePercent / 100));

    return {
      success: true,
      amount: numAmount,
      country: cleanCountry,
      transaction_type: cleanType,
      fee_amount: calculatedFee,
      fee_percentage: ratePercent,
      net_amount: cleanType === 'collection' ? Math.max(0, numAmount - calculatedFee) : numAmount,
      total_debit: cleanType === 'payout' ? numAmount + calculatedFee : numAmount,
      pricing: 'standard_fallback',
      message: 'Frais calculés via la grille tarifaire standard Sebpay.'
    };
  }
}

module.exports = {
  SEBPAY_DEFAULT_BASE_URL,
  SUPPORTED_COUNTRIES,
  SEBPAY_SUPPORTED_COUNTRIES_FALLBACK,
  SEBPAY_COUNTRY_OPERATORS,
  SEBPAY_DEFAULT_OPERATOR_BY_COUNTRY,
  SEBPAY_FEE_RATES,
  BF_OPERATORS_MAP,
  formatLocalPhoneNumber,
  formatBurkinaPhoneNumber,
  formatSebpayPhoneNumber,
  resolveCountryAndCurrency,
  normalizeSebpayOperator,
  resolveSebpayOperatorDetails,
  calculateSebpayFee,
  getSebpayBaseUrl,
  getSebpayHeaders,
  getSebpayConfigStatus,
  getFixieHttpsProxyAgent,
  getSebpayAxiosConfig,
  callSebpayApi,
  createSebpayCollection,
  createSebpayCheckoutSession,
  getSebpayCollection,
  getSebpayCheckoutSession,
  getSebpayCountries,
  getSebpayOperators
};
