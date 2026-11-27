require('dotenv').config({ path: __dirname + '/.env' });
const { switchManager } = require('./nana-switch/switch-manager');

console.log('====================================================');
console.log('🔍 AUDIT RIGOUROUX EN TEMPS RÉEL DU ROUTEUR NANASWITCH');
console.log('====================================================\n');

// 1. VÉRIFICATION DE LA CONFIGURATION ACTIVE
const config = switchManager.getRoutingConfig();
console.log('1. Passerelle Principale (ACTIVE)  :', config.primaryGateway);
console.log('2. Passerelle de Secours (FALLBACK):', config.fallbackGateway);
console.log('3. Passerelles Disponibles         :', config.availableGateways.join(', '));

if (config.primaryGateway !== 'saspay') {
  console.error('❌ ERREUR: La passerelle principale doit être strictement "saspay".');
  process.exit(1);
}
if (config.fallbackGateway !== 'sebpay') {
  console.error('❌ ERREUR: La passerelle de secours doit être strictement "sebpay".');
  process.exit(1);
}
console.log('✅ Configuration stricte 100% conforme : SasPay en tête, Sebpay en secours.\n');

// 2. DIAGNOSTIC RÉEL DES ADAPTATEURS ENREGISTRÉS SANS AUCUN MOCK
console.log('--- ÉTATS RÉELS DES ADAPTATEURS DANS LE ROUTEUR ---');
const gateways = switchManager.listGateways();
for (const gw of gateways) {
  console.log(`- [${gw.id.toUpperCase()}] : ${gw.name}`);
  if (gw.id === 'saspay') {
    console.log(`   Base URL      : ${gw.baseUrl}`);
    console.log(`   Environnement : ${gw.environment}`);
    console.log(`   API Key Masquée: ${gw.maskedApiKey || 'NON DÉFINIE'}`);
    console.log(`   Pays Supportés: ${gw.supportedCountriesCount}`);
  } else if (gw.id === 'sebpay') {
    console.log(`   Base URL      : ${gw.baseUrl}`);
    console.log(`   Environnement : ${gw.environment}`);
    console.log(`   Public Key    : ${gw.maskedPublicKey || 'NON DÉFINIE'}`);
  }
}

// 3. VÉRIFICATION DU CRITÈRE D'ÉLIGIBILITÉ AU FAILOVER (isEligibleForFailover)
console.log('\n--- VÉRIFICATION RIGOUREUSE DES CONDITIONS DE FAILOVER ---');
const testCases = [
  { err: { status: 400, message: 'The operator declined the payment request.' }, expected: false, label: 'HTTP 400 Rejet opérateur (M1)' },
  { err: { status: 401, message: 'Unauthorized' }, expected: true, label: 'HTTP 401 Clé invalide' },
  { err: { status: 404, message: 'Not found' }, expected: true, label: 'HTTP 404 Route/Ressource introuvable' },
  { err: { status: 500, message: 'Internal Server Error' }, expected: true, label: 'HTTP 500 Défaillance serveur' },
  { err: { status: 503, message: 'Service Unavailable' }, expected: true, label: 'HTTP 503 Passerelle indisponible' },
  { err: { message: 'connect ETIMEDOUT 102.16.45.1:443' }, expected: true, label: 'Erreur Réseau ETIMEDOUT' },
  { err: { message: 'fetch failed' }, expected: true, label: 'Erreur Réseau Fetch' }
];

let allPassed = true;
for (const tc of testCases) {
  const result = switchManager.isEligibleForFailover(tc.err);
  console.log(`  ${tc.label.padEnd(35)} -> Éligible Failover: ${result ? 'OUI ✅' : 'NON ❌'}`);
  if (result !== tc.expected) {
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('\n❌ Échec du contrôle rigoureux des critères de failover.');
  process.exit(1);
}

console.log('\n====================================================');
console.log('🎉 TOUS LES CONTRÔLES RÉELS SONT 100% CONFORMES !');
console.log('====================================================');
