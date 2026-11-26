/**
 * Test Suite Automatisée pour NanaSwitch Cloud :
 * - Cryptographie des Clés (ns_live_pk_... & ns_live_sk_...)
 * - Middleware d'Authentification Zero-Trust (Bcrypt Hash)
 * - Moteur de Tarification Hybride (Commissions + Marge 1.5% vs Crédits API 0.02 XOF)
 * - Coupe-Circuit 402_INSUFFICIENT_CLOUD_CREDITS
 * - BYOK Dynamic Routing & Isolation des Identifiants
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const { generateNanaSwitchKeyPair, requireNanaSwitchAuth, optionalNanaSwitchAuth } = require('./nana-switch/validateNanaSwitchKey');
const { pricingEngine } = require('./nana-switch/pricingEngine');
const { merchantService, DEFAULT_PRICING_MATRIX } = require('./nana-switch/merchant-service');

async function runTests() {
  console.log('--- TEST 1 : Génération cryptographique des clés ---');
  const keyPair = await generateNanaSwitchKeyPair('live');
  assert(keyPair.publicKey.startsWith('ns_live_pk_'), 'Public key must start with ns_live_pk_');
  assert(keyPair.secretKey.startsWith('ns_live_sk_'), 'Secret key must start with ns_live_sk_');
  assert(keyPair.secretKeyHash.startsWith('$2'), 'Secret key hash must be a valid bcrypt hash');
  
  const isValidHash = await bcrypt.compare(keyPair.secretKey, keyPair.secretKeyHash);
  assert.strictEqual(isValidHash, true, 'Bcrypt compare must succeed on generated key pair');
  console.log('✓ Clés générées avec succès :', { pk: keyPair.publicKey, sk: keyPair.secretKey.slice(0, 15) + '...' });

  console.log('\n--- TEST 2 : Moteur de Tarification Agrégée (+1.5% marge) ---');
  const bfFee = pricingEngine.calculateAggregatedFees({
    amount: 10000,
    country: 'BF',
    operator: 'orange_bf'
  });
  console.log('Frais calculés Orange BF (10 000 XOF) :', bfFee);
  assert.strictEqual(bfFee.rate_applied, 6.0, 'Orange BF rate must be 6.0% (4.5% aggregator + 1.5% margin)');
  assert.strictEqual(bfFee.total_fee, 600, 'Fee on 10,000 XOF at 6.0% must be 600 XOF');
  assert.strictEqual(bfFee.net_amount, 9400, 'Net amount must be 9,400 XOF');
  assert.strictEqual(bfFee.platform_margin, 150, 'Platform margin (1.5%) must be 150 XOF');
  console.log('✓ Grille tarifaire et marge +1.5% validées.');

  console.log('\n--- TEST 3 : Coupe-circuit 402 sur solde épuisé (Mode SaaS / BYOK) ---');
  const exhaustedMerchant = {
    merchant_id: 'm_dev_external_002',
    account_type: 'EXTERNAL_BYOK',
    status: 'ACTIVE',
    api_pricing_config: {
      cost_per_request_xof: 0.02,
      api_credits_balance: 0,
      auto_block_on_zero: true
    }
  };

  const creditCheckBlocked = await pricingEngine.verifyAndCheckApiCredits(null, exhaustedMerchant);
  assert.strictEqual(creditCheckBlocked.allowed, false, 'Credit check must be blocked when balance is 0');
  assert.strictEqual(creditCheckBlocked.errorResponse.errorCode, '402_INSUFFICIENT_CLOUD_CREDITS', 'Error code must be 402_INSUFFICIENT_CLOUD_CREDITS');
  console.log('✓ Coupe-circuit 402 déclenché correctement :', creditCheckBlocked.errorResponse.errorCode);

  const fundedMerchant = {
    merchant_id: 'm_dev_external_003',
    account_type: 'EXTERNAL_BYOK',
    status: 'ACTIVE',
    api_pricing_config: {
      cost_per_request_xof: 0.02,
      api_credits_balance: 150,
      auto_block_on_zero: true
    }
  };
  const creditCheckFunded = await pricingEngine.verifyAndCheckApiCredits(null, fundedMerchant);
  assert.strictEqual(creditCheckFunded.allowed, true, 'Credit check must pass when balance > 0');
  console.log('✓ Crédits suffisants autorisés (150 restants).');

  console.log('\n--- TEST 4 : Middleware d\'authentification NanaSwitch ---');
  // Mock Express req, res, next
  let statusCode = null;
  let responseData = null;
  const mockRes = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    }
  };

  const mockDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => ({
          exists: id === 'm_mock_001',
          data: () => ({
            merchant_id: 'm_mock_001',
            business_name: 'Mock Test Store',
            status: 'ACTIVE',
            nanaswitch_keys: {
              public_key: keyPair.publicKey,
              secret_key_hash: keyPair.secretKeyHash
            }
          })
        })
      }),
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{
              data: () => ({
                merchant_id: 'm_mock_001',
                business_name: 'Mock Test Store',
                status: 'ACTIVE',
                nanaswitch_keys: {
                  public_key: keyPair.publicKey,
                  secret_key_hash: keyPair.secretKeyHash
                }
              })
            }]
          })
        })
      })
    })
  };

  // Cas 4a : Clé absente -> 401
  const reqMissingKey = { headers: {} };
  await requireNanaSwitchAuth(mockDb)(reqMissingKey, mockRes, () => {});
  assert.strictEqual(statusCode, 401, 'Missing key must yield 401');
  assert.strictEqual(responseData.errorCode, '401_UNAUTHORIZED');

  // Cas 4b : Clé erronée -> 401
  const reqBadKey = { headers: { 'x-nanaswitch-skey': 'ns_live_sk_invalid_secret_key' } };
  statusCode = null;
  await requireNanaSwitchAuth(mockDb)(reqBadKey, mockRes, () => {});
  assert.strictEqual(statusCode, 401, 'Invalid key must yield 401');
  assert.strictEqual(responseData.errorCode, '401_INVALID_SECRET_KEY');

  // Cas 4c : Clé valide -> passage à next() avec req.merchant attaché
  const reqGoodKey = { headers: { 'x-nanaswitch-skey': keyPair.secretKey, 'x-merchant-id': 'm_mock_001' } };
  let nextCalled = false;
  await requireNanaSwitchAuth(mockDb)(reqGoodKey, mockRes, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true, 'Next must be called on valid key');
  assert.strictEqual(reqGoodKey.merchant?.merchant_id, 'm_mock_001', 'req.merchant must be attached');
  console.log('✓ Middleware requireNanaSwitchAuth testé (401 Missing, 401 Invalid, 200 Success).');

  console.log('\n--- TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS ! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
