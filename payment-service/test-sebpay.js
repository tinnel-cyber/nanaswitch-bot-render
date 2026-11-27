/**
 * Test unitaire de validation de l'instance Sebpay (Headers & Sécurité)
 */

process.env.SEBPAY_PUBLIC_KEY = 'pk_live_sample_key_12345';
process.env.SEBPAY_SECRET_KEY = 'sk_live_sample_secret_67890';
process.env.SEBPAY_FIXIE_URL = 'http://fixie:test_token_fixie@velvet.usefixie.com:80';

const {
  getSebpayBaseUrl,
  getSebpayHeaders,
  getSebpayConfigStatus,
  getFixieHttpsProxyAgent,
  getSebpayAxiosConfig,
  formatLocalPhoneNumber,
  formatBurkinaPhoneNumber,
  formatSebpayPhoneNumber,
  SUPPORTED_COUNTRIES,
  resolveCountryAndCurrency
} = require('./sebpay-client');

console.log('=== TEST SEBPAY CLIENT ===');
console.log('Base URL :', getSebpayBaseUrl());

const headers = getSebpayHeaders();
console.log('Headers injectés :');
console.log('  X-Public-Key :', headers['X-Public-Key']);
console.log('  X-Secret-Key :', headers['X-Secret-Key'] ? 'PRESENT (PROTEGÉ CÔTÉ SERVEUR)' : 'ABSENT');
console.log('  Content-Type :', headers['Content-Type']);

const status = getSebpayConfigStatus();
console.log('\nStatut exposé (Sans secret) :');
console.log(JSON.stringify(status, null, 2));

const testDefault = resolveCountryAndCurrency();
const testBJ = resolveCountryAndCurrency(null, '+22961000000');
const testCM = resolveCountryAndCurrency('CM');
const testName = resolveCountryAndCurrency('Burkina Faso');

console.log('\n=== TEST RESOLUTION PAYS & DEVISE ===');
console.log('Default :', testDefault);
console.log('Par préfixe +229 :', testBJ);
console.log('Par code CM :', testCM);
console.log('Par nom Burkina Faso :', testName);

const isCountryValidationOk = 
  testDefault.country === 'BF' && testDefault.currency === 'XOF' &&
  testBJ.country === 'BJ' && testBJ.currency === 'XOF' &&
  testCM.country === 'CM' && testCM.currency === 'XAF' &&
  testName.country === 'BF' && testName.currency === 'XOF';

console.log('\n=== TEST PROXY FIXIE HTTPS-PROXY-AGENT ===');
const proxyAgent = getFixieHttpsProxyAgent();
const axiosConfig = getSebpayAxiosConfig();
console.log('HttpsProxyAgent présent :', Boolean(proxyAgent));
console.log('Axios config httpsAgent présent :', Boolean(axiosConfig.httpsAgent));
console.log('Axios config proxy disabled (false) :', axiosConfig.proxy === false);

console.log('\n=== TEST FORMATAGE NUMÉRO LOCAL 8 CHIFFRES (BURKINA FASO) ===');
const testPhone1 = formatLocalPhoneNumber('+22670123456');
const testPhone2 = formatLocalPhoneNumber('22670123456');
const testPhone3 = formatLocalPhoneNumber('00226 70 12 34 56');
const testPhone4 = formatLocalPhoneNumber('70123456');
const testPhone5 = formatLocalPhoneNumber('+226 76-54-32-10');

console.log('  +22670123456      ->', testPhone1);
console.log('  22670123456       ->', testPhone2);
console.log('  00226 70 12 34 56 ->', testPhone3);
console.log('  70123456          ->', testPhone4);
console.log('  +226 76-54-32-10  ->', testPhone5);

const isPhoneFormatOk =
  testPhone1 === '70123456' &&
  testPhone2 === '70123456' &&
  testPhone3 === '70123456' &&
  testPhone4 === '70123456' &&
  testPhone5 === '76543210';

console.log('\n=== TEST FORMATAGE NUMÉRO LOCAL STRICT 8 CHIFFRES (BURKINA FASO) ===');
const testBfPhone1 = formatBurkinaPhoneNumber('+22670123456');
const testBfPhone2 = formatBurkinaPhoneNumber('22670123456');
const testBfPhone3 = formatBurkinaPhoneNumber('00226 70 12 34 56');
const testBfPhone4 = formatBurkinaPhoneNumber('70123456');
const testBfPhone5 = formatBurkinaPhoneNumber('+226 76-54-32-10');

console.log('  +22670123456      ->', testBfPhone1);
console.log('  22670123456       ->', testBfPhone2);
console.log('  00226 70 12 34 56 ->', testBfPhone3);
console.log('  70123456          ->', testBfPhone4);
console.log('  +226 76-54-32-10  ->', testBfPhone5);

const isBfPhoneFormatOk =
  testBfPhone1 === '+22670123456' &&
  testBfPhone2 === '+22670123456' &&
  testBfPhone3 === '+22670123456' &&
  testBfPhone4 === '+22670123456' &&
  testBfPhone5 === '+22676543210';

console.log('\n=== TEST CONFORMITÉ OPÉRATEUR ORANGE BF ===');
const { normalizeSebpayOperator } = require('./sebpay-client');
const testNormOrange = normalizeSebpayOperator('BF', 'orange');
const testNormOrangeMoney = normalizeSebpayOperator('BF', 'ORANGE_MONEY');
const testNormMoov = normalizeSebpayOperator('BF', 'MOOV_MONEY');
console.log('  Normalisation "orange"       ->', testNormOrange);
console.log('  Normalisation "ORANGE_MONEY" ->', testNormOrangeMoney);
console.log('  Normalisation "MOOV_MONEY"   ->', testNormMoov);

const isOperatorNormOk =
  testNormOrange === 'orange' &&
  testNormOrangeMoney === 'orange' &&
  testNormMoov === 'moov';

if (
  headers['X-Public-Key'] === 'pk_live_sample_key_12345' &&
  headers['X-Secret-Key'] === 'sk_live_sample_secret_67890' &&
  headers['Content-Type'] === 'application/json' &&
  getSebpayBaseUrl() === 'https://newapi.sebpay.bj/api/v1/' &&
  status.isConfigured === true &&
  !('hasSecretKey' in status ? status.X_Secret_Key : false) &&
  isCountryValidationOk &&
  Boolean(proxyAgent) &&
  Boolean(axiosConfig.httpsAgent) &&
  axiosConfig.proxy === false &&
  isPhoneFormatOk &&
  isBfPhoneFormatOk &&
  isOperatorNormOk
) {
  console.log('\n>>> VALIDATION REUSSIE : L\'instance réseau Sebpay, formatage local 8 chiffres, opérateurs BF et validation country/currency sont 100% conformes !');
  process.exit(0);
} else {
  console.error('\n>>> ECHEC VALIDATION');
  process.exit(1);
}
