/**
 * Suite de tests de sécurité & conformité Audit Paiement (C1-C6, M1, M4, M6, Zero-Firebase)
 */
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SEBPAY_WEBHOOK_SECRET = 'test_sebpay_webhook_secret_2026';
process.env.SASPAY_WEBHOOK_SECRET = 'test_saspay_webhook_secret_2026';
process.env.INTERNAL_ADMIN_KEY = 'test_internal_admin_key_2026';
process.env.PORT = '0';

const app = require('./server');
const { switchManager } = require('./nana-switch/switch-manager');
const { sanitizeRedirectUrl } = require('./supabase-admin');

function request(server, method, pathUrl, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body === null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = http.request({
      hostname: '127.0.0.1',
      port: addr.port,
      path: pathUrl,
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  const server = app.server;
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== TESTS SÉCURITÉ PAIEMENT & SUPPRESSION FIREBASE (BASE origin/main) ===\n');

  await test('Zero-Firebase: package.json sans firebase-admin, firebase-admin-fallback.js supprimé', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    assert.strictEqual(Boolean(pkg.dependencies['firebase-admin']), false);
    assert.ok(pkg.dependencies['@supabase/supabase-js']);
    assert.strictEqual(fs.existsSync(path.join(__dirname, 'firebase-admin-fallback.js')), false);
  });

  await test('C6: Suppression totale de la faille substring orderId.includes("elite")', async () => {
    const serverSrc = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    assert.strictEqual(serverSrc.includes("includes('elite')"), false);
  });

  await test('C2: Webhook Sebpay signé SANS statut rejeté (HTTP 400 MISSING_WEBHOOK_STATUS)', async () => {
    const payload = JSON.stringify({ transaction_id: 'TX_NO_STATUS', external_reference: 'store___ORD_1', amount: 1000 });
    const sig = crypto.createHmac('sha256', process.env.SEBPAY_WEBHOOK_SECRET).update(payload).digest('hex');
    const res = await request(server, 'POST', '/api/payment/webhook', {
      headers: { 'x-sebpay-signature': sig },
      body: payload
    });
    assert.strictEqual(res.status, 400, `Attendu 400, reçu ${res.status}`);
    assert.strictEqual(res.body.error, 'MISSING_WEBHOOK_STATUS');
  });

  await test('M4: Webhook Sebpay avec signature invalide rejeté (HTTP 401)', async () => {
    const payload = JSON.stringify({ transaction_id: 'TX_BAD_SIG', status: 'SUCCESS', amount: 1000 });
    const res = await request(server, 'POST', '/api/payment/webhook', {
      headers: { 'x-sebpay-signature': 'deadbeef0000' },
      body: payload
    });
    assert.strictEqual(res.status, 401);
  });

  await test('M4: Webhook Sebpay avec timestamp expiré (> 5 min) rejeté (HTTP 401)', async () => {
    const payload = JSON.stringify({ transaction_id: 'TX_EXPIRED', status: 'SUCCESS', amount: 1000 });
    const sig = crypto.createHmac('sha256', process.env.SEBPAY_WEBHOOK_SECRET).update(payload).digest('hex');
    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const res = await request(server, 'POST', '/api/payment/webhook', {
      headers: { 'x-sebpay-signature': sig, 'x-webhook-timestamp': String(oldTs) },
      body: payload
    });
    assert.strictEqual(res.status, 401);
  });

  await test('C3: Routes sensibles protégées (payout, decrypt, keys/generate, credits/recharge, bank-proxy, config)', async () => {
    const protectedEndpoints = [
      ['/api/payment/saspay/payout', { amount: 1000, phone: '70000000' }],
      ['/api/payment/bank-proxy', { url: 'https://example.com' }],
      ['/api/switch/decrypt', { encrypted: 'aes256gcm:00:00' }],
      ['/api/switch/keys/generate', { merchantId: 'm_test' }],
      ['/api/switch/merchant/credits/recharge', { merchantId: 'm_test', creditsAmount: 99999 }],
      ['/api/switch/config', { primaryGateway: 'sebpay' }]
    ];
    for (const [endpoint, body] of protectedEndpoints) {
      const resNoAuth = await request(server, 'POST', endpoint, { body });
      assert.strictEqual(resNoAuth.status, 403, `${endpoint} sans auth doit renvoyer 403 (reçu ${resNoAuth.status})`);
      const resFakeJwt = await request(server, 'POST', endpoint, {
        headers: { Authorization: 'Bearer fake_user_jwt_token' },
        body
      });
      assert.strictEqual(resFakeJwt.status, 403, `${endpoint} avec faux JWT doit renvoyer 403 (reçu ${resFakeJwt.status})`);
    }
  });

  await test('C5: /api/escrow/release (403) et /api/chat-finance/release (401/503) protégés', async () => {
    const resEscrow = await request(server, 'POST', '/api/escrow/release', {
      body: { transactionId: 'TX_ESC_123' }
    });
    assert.strictEqual(resEscrow.status, 403);
    const resChatRelease = await request(server, 'POST', '/api/chat-finance/release', {
      body: { transactionId: 'TX_ESC_123' }
    });
    assert.ok([401, 503].includes(resChatRelease.status), `Attendu 401 ou 503, reçu ${resChatRelease.status}`);
  });

  await test('M1: Failover sélectif (jamais sur insufficient_balance / declined / chargeCreated)', async () => {
    assert.strictEqual(switchManager.isEligibleForFailover({ message: 'insufficient_balance' }), false);
    assert.strictEqual(switchManager.isEligibleForFailover({ message: 'Payment declined by operator' }), false);
    assert.strictEqual(switchManager.isEligibleForFailover({ code: 'OTP_REQUIRED' }), false);
    assert.strictEqual(switchManager.isEligibleForFailover({ status: 400, message: 'Bad request' }), false);
    assert.strictEqual(switchManager.isEligibleForFailover({ chargeCreated: true, message: 'timeout' }), false);

    assert.strictEqual(switchManager.isEligibleForFailover({ status: 503, message: 'Service Unavailable' }), true);
    assert.strictEqual(switchManager.isEligibleForFailover({ status: 502, message: 'Bad Gateway' }), true);
    assert.strictEqual(switchManager.isEligibleForFailover({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }), true);
  });

  await test('M6: Assainissement returnUrl et callbackUrl contre Open Redirect', async () => {
    assert.strictEqual(sanitizeRedirectUrl('https://evil-phishing.com/steal', 'https://nsore.shop'), 'https://nsore.shop');
    assert.strictEqual(sanitizeRedirectUrl('javascript:alert(1)', 'https://nsore.shop'), 'https://nsore.shop');
    assert.strictEqual(sanitizeRedirectUrl('https://nsore.shop/checkout/return', 'https://nsore.shop'), 'https://nsore.shop/checkout/return');
  });

  console.log(`\nRésultat : ${passed} réussis, ${failed} échoués.\n`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

if (app.server.listening) {
  runTests();
} else {
  app.server.once('listening', runTests);
}
