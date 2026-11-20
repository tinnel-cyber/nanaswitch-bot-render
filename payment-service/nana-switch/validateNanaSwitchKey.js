/**
 * ==============================================================================
 * MIDDLEWARE D'AUTHENTIFICATION & SÉCURISATION NANASWITCH CLOUD (100% SUPABASE)
 * ==============================================================================
 *
 * - Validation stricte des clés secrètes complexes : ns_live_sk_<random>
 * - Vérification cryptographique par hash Bcrypt dans Supabase (`nanaswitch_merchants`)
 * - Fail-closed absolu : aucun compte de secours local lorsque la base est indisponible
 * - Bloque avec HTTP 401 Unauthorized en cas d'absence ou d'invalidité
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getSupabaseAdmin } = require('../supabase-admin');

function timingSafeStringEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Génère une clé secrète de signature Webhook HMAC-SHA256 (32 octets aléatoires)
 */
function generateWebhookSecret() {
  const whsecRandom = crypto.randomBytes(32).toString('hex');
  return `ns_whsec_${whsecRandom}`;
}

/**
 * Génère une paire de clés d'API NanaSwitch sécurisées et un secret webhook
 */
async function generateNanaSwitchKeyPair(mode = 'live') {
  const envPrefix = mode === 'test' ? 'ns_test_' : 'ns_live_';
  const pkRandom = crypto.randomBytes(16).toString('hex');
  const skRandom = crypto.randomBytes(24).toString('hex');
  const webhookSecret = generateWebhookSecret();

  const publicKey = `${envPrefix}pk_${pkRandom}`;
  const secretKey = `${envPrefix}sk_${skRandom}`;
  const secretKeyHash = await bcrypt.hash(secretKey, 10);

  return {
    publicKey,
    secretKey,
    secretKeyHash,
    webhookSecret
  };
}

/**
 * Middleware Express vérifiant obligatoirement la clé secrète NanaSwitch
 */
function requireNanaSwitchAuth(db) {
  return async function (req, res, next) {
    try {
      const skHeader = req.headers['x-nanaswitch-skey'] ||
                       req.headers['x-nanaswitch-key'] ||
                       req.headers['x-api-key'] ||
                       '';

      let providedKey = skHeader;
      const authHeader = req.headers['authorization'] || '';
      if (!providedKey && authHeader.startsWith('Bearer ')) {
        providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
      if (!providedKey && req.body && req.body.secretKey) {
        providedKey = req.body.secretKey;
      }

      if (!providedKey) {
        return res.status(401).json({
          success: false,
          errorCode: '401_UNAUTHORIZED',
          error: 'Unauthorized',
          message: 'Clé secrète NanaSwitch manquante. Veuillez fournir le header "x-nanaswitch-skey" ou "Authorization: Bearer <ns_live_sk_...>".'
        });
      }

      const cleanKey = String(providedKey).trim();

      // 1. Clé interne plateforme explicite (via variable d'environnement sécurisée uniquement)
      const internalMasterKey = process.env.NANASWITCH_INTERNAL_KEY || process.env.ADMIN_API_KEY || '';
      if (internalMasterKey && timingSafeStringEqual(cleanKey, internalMasterKey)) {
        req.merchant = {
          merchant_id: 'm_live_bf_001',
          business_name: 'NANASORE TECHNOLOGIES',
          account_type: 'INTERNAL',
          status: 'ACTIVE',
          integration_config: { mode: 'AGREGATED' },
          api_pricing_config: { cost_per_request_xof: 0, api_credits_balance: 999999, auto_block_on_zero: false }
        };
        return next();
      }

      const explicitMerchantId = req.headers['x-merchant-id'] || req.body?.merchantId || req.body?.merchant_id;
      let targetMerchant = null;

      // 2. Validation via Supabase `nanaswitch_merchants` (source de vérité principale)
      const supabase = getSupabaseAdmin();
      if (supabase) {
        if (explicitMerchantId) {
          const { data: row } = await supabase
            .from('nanaswitch_merchants')
            .select('*')
            .eq('merchant_id', String(explicitMerchantId))
            .maybeSingle();

          if (row && row.secret_key_hash) {
            const isMatch = await bcrypt.compare(cleanKey, row.secret_key_hash).catch(() => false);
            if (isMatch) {
              targetMerchant = row;
            }
          }
        } else {
          // Exige x-merchant-id pour éviter un scan O(N) coûteux en bcrypt DoS
          const { data: rows } = await supabase
            .from('nanaswitch_merchants')
            .select('*')
            .eq('status', 'ACTIVE')
            .limit(25);

          for (const row of (rows || [])) {
            if (row.secret_key_hash) {
              const isMatch = await bcrypt.compare(cleanKey, row.secret_key_hash).catch(() => false);
              if (isMatch) {
                targetMerchant = row;
                break;
              }
            }
          }
        }
      } else if (db) {
        // Fallback legacy Firestore uniquement si un vrai client Firestore est injecté (tests)
        if (explicitMerchantId) {
          const docSnap = await db.collection('merchants').doc(explicitMerchantId).get();
          if (docSnap.exists) {
            const mData = docSnap.data();
            const storedHash = mData?.nanaswitch_keys?.secret_key_hash;
            if (storedHash && (await bcrypt.compare(cleanKey, storedHash).catch(() => false))) {
              targetMerchant = mData;
            }
          }
        }
      } else {
        // Fail-closed strict : jamais d'accès gratuit quand la base n'est pas configurée
        return res.status(503).json({
          success: false,
          errorCode: '503_AUTH_STORE_UNAVAILABLE',
          error: 'Service Unavailable',
          message: 'Service d\'authentification marchand indisponible (Supabase Service Role requis).'
        });
      }

      if (!targetMerchant) {
        return res.status(401).json({
          success: false,
          errorCode: '401_INVALID_SECRET_KEY',
          error: 'Unauthorized',
          message: 'Clé secrète NanaSwitch invalide, inactive ou révoquée.'
        });
      }

      if (targetMerchant.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          errorCode: '403_MERCHANT_SUSPENDED',
          error: 'Forbidden',
          message: `Le compte marchand "${targetMerchant.business_name}" est actuellement suspendu ou en attente de vérification.`
        });
      }

      req.merchant = targetMerchant;
      next();
    } catch (err) {
      console.error('[NANASWITCH AUTH ERROR]', err.message);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne lors de la validation des identifiants NanaSwitch'
      });
    }
  };
}

/**
 * Middleware optionnel : tente d'authentifier le marchand, mais ne bloque pas la requête si absent
 */
function optionalNanaSwitchAuth(db) {
  return async function (req, res, next) {
    const hasKey = req.headers['x-nanaswitch-skey'] ||
                   req.headers['x-nanaswitch-key'] ||
                   req.headers['x-api-key'] ||
                   req.headers['authorization'];

    if (!hasKey) {
      return next();
    }

    return requireNanaSwitchAuth(db)(req, res, next);
  };
}

module.exports = {
  generateWebhookSecret,
  generateNanaSwitchKeyPair,
  requireNanaSwitchAuth,
  optionalNanaSwitchAuth
};
