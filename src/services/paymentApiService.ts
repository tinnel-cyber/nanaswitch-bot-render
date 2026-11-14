/**
 * Service Client Frontend pour l'API de Paiement Nanasore (Hébergée sur Render avec IP Statique Fixie)
 * Permet au frontend Firebase Hosting de communiquer avec le micro-service de transactions bancaires.
 */

export interface StaticIpInfo {
  status: 'success' | 'error';
  ip?: string;
  isProxyActive?: boolean;
  proxyConfigured?: boolean;
  latencyMs?: number;
  whitelistingInstructions?: string;
  error?: string;
}

export interface PaymentInitiateRequest {
  provider: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
  customerEmail?: string;
  description?: string;
  targetBankApiUrl?: string;
  payload?: any;
}

export interface PaymentInitiateResponse {
  success: boolean;
  txId?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  status?: string;
  message?: string;
  viaFixieProxy?: boolean;
  bankResponse?: any;
  error?: string;
}

// URL officielle du micro-service Render (avec sortie par IP Statique Fixie)
export const DEFAULT_PAYMENT_API_URL = 'https://nana-payment-api.onrender.com';

// Adresses IP statiques de sortie Fixie enregistrées auprès de la banque
export const PRIMARY_FIXIE_IP = '54.195.3.54';
export const KNOWN_FIXIE_STATIC_IPS = ['54.195.3.54', '54.217.142.99'];

// État de l'infrastructure & Passage officiel en Mode Production Réelle Sebpay
export const BANK_VALIDATION_STATUS = {
  isInfrastructureReady: true,
  fixieIpSubmitted: PRIMARY_FIXIE_IP,
  renderApiUrl: DEFAULT_PAYMENT_API_URL,
  uptimeRobotActive: true,
  isWaitingBankApproval: false, // Production validée et active
  liveChargesAllowed: true      // Débits bancaires réels autorisés
};

export interface PaymentServiceHealth {
  status: 'online' | 'offline';
  service?: string;
  version?: string;
  environment?: string;
  fixieEnabled?: boolean;
  firebaseConnected?: boolean;
  uptimeSeconds?: number;
  timestamp?: string;
  latencyMs?: number;
  error?: string;
}

export function getPaymentApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('nana_custom_payment_api_url');
    if (customUrl) return customUrl.replace(/\/+$/, '');

    // Si explicitement configuré en local par un développeur
    if (localStorage.getItem('nana_use_local_payment_api') === 'true') {
      return 'http://localhost:10000';
    }
  }
  
  const envUrl = (import.meta as any).env?.VITE_PAYMENT_API_URL || (typeof process !== 'undefined' && process.env?.VITE_PAYMENT_API_URL);
  if (envUrl) return envUrl.replace(/\/+$/, '');

  return DEFAULT_PAYMENT_API_URL;
}

/**
 * Interroge le micro-service pour obtenir l'adresse IP statique vue par les banques
 */
export async function getPaymentApiStaticIp(): Promise<StaticIpInfo> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/payment/ip`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      throw new Error(`Erreur serveur HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('[PAYMENT API] Impossible de joindre le micro-service pour l\'IP statique :', err.message);
    return {
      status: 'error',
      error: err.message,
      isProxyActive: false
    };
  }
}

/**
 * Initialise une transaction bancaire ou Mobile Money via l'API Render
 */
export async function initiatePaymentTransaction(params: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[PAYMENT API] Erreur initialisation paiement :', err);
    return {
      success: false,
      error: err.message || 'Erreur réseau vers l\'API de paiement'
    };
  }
}

/**
 * Relaye un appel bancaire quelconque à travers l'IP statique du micro-service
 */
export async function proxyBankRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'POST',
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  const baseUrl = getPaymentApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/payment/bank-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      method,
      headers,
      body
    }),
    signal: AbortSignal.timeout(20000)
  });

  return await res.json();
}

/**
 * Vérification de la disponibilité du micro-service de paiement
 */
export async function checkPaymentServiceHealth(): Promise<boolean> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Diagnostic complet du micro-service Render (latence, statut Fixie, Firestore)
 */
export async function getPaymentServiceHealth(): Promise<PaymentServiceHealth> {
  const baseUrl = getPaymentApiBaseUrl();
  const startTime = Date.now();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      return {
        status: 'offline',
        latencyMs,
        error: `HTTP ${res.status}`
      };
    }
    const data = await res.json();
    return {
      status: 'online',
      latencyMs,
      ...data
    };
  } catch (err: any) {
    return {
      status: 'offline',
      latencyMs: Date.now() - startTime,
      error: err.message || 'Serveur inaccessible'
    };
  }
}

/**
 * Vérifie le statut d'une transaction bancaire / Mobile Money auprès du micro-service Render
 */
export async function verifyPaymentTransaction(txId: string, amount?: number, phone?: string): Promise<{
  success: boolean;
  status?: string;
  message?: string;
  transactionRef?: string;
}> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/payment/verify/${encodeURIComponent(txId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      const isConfirmed = data.success === true || 
        ['COMPLETED', 'SUCCESS', 'PAID', 'VALIDATED'].includes(String(data.status || '').toUpperCase());
      return {
        success: isConfirmed,
        status: data.status,
        message: data.message || (isConfirmed ? 'Paiement confirmé par la passerelle de paiement.' : 'En attente de confirmation.'),
        transactionRef: data.txId || txId
      };
    }
  } catch (err: any) {
    console.warn('[PAYMENT API] Vérification transaction :', err.message);
  }
  return {
    success: false,
    status: 'PENDING',
    message: "En attente de confirmation par le serveur de paiement."
  };
}

/**
 * Interroge le micro-service Render pour vérifier l'état de la passerelle S
 * (Sécurité stricte : ne renvoie jamais de clé secrète, uniquement le statut de configuration)
 */
export async function getSBackendStatus(): Promise<{
  isConfigured: boolean;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  maskedPublicKey?: string;
  baseUrl?: string;
  error?: string;
}> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/payment/sebpay/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      return data.s || data.provider || data;
    }
    return { isConfigured: false, hasPublicKey: false, hasSecretKey: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { isConfigured: false, hasPublicKey: false, hasSecretKey: false, error: err.message };
  }
}

export interface SCollectionRequest {
  tenantId?: string;
  storeId?: string;
  shopName?: string;
  storeName?: string;
  externalReference?: string;
  external_reference?: string;
  orderId: string;
  amount: number;
  currency?: string;
  country?: string;
  countryCode?: string;
  country_code?: string;
  customerPhone?: string;
  phone?: string;
  operator?: string;
  provider?: string;
  otpCode?: string;
  description?: string;
  callbackUrl?: string;
  callback_url?: string;
}

export interface SCollectionResponse {
  success: boolean;
  action?: 'redirect' | 'pending' | 'ussd_push';
  provider_link?: string;
  redirectUrl?: string;
  checkout_url?: string;
  paymentUrl?: string;
  external_reference?: string;
  orderId?: string;
  tenantId?: string;
  amount?: number;
  currency?: string;
  country?: string;
  txId?: string;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * Initialise une collection de paiement Sebpay via l'API Render (100% Production Réelle / Live)
 * Sebpay ne disposant d'aucune clé Sandbox ni d'environnement de test, tout le flux
 * d'encaissement utilise directement les paramètres et endpoints réels de production.
 */
export async function initiateSPayment(params: SCollectionRequest): Promise<SCollectionResponse> {
  const baseUrl = getPaymentApiBaseUrl();
  const orderId = params.orderId;
  const resolvedCountry = (params.country || params.country_code || params.countryCode || 'BF').toUpperCase();
  const resolvedCurrency = (params.currency || 'XOF').toUpperCase();

  // Nettoyage standardisé du nom de la boutique pour une external_reference unique et propre
  const rawShopName = params.shopName || params.storeName || params.tenantId || params.storeId || 'boutique';
  const cleanShopName = String(rawShopName)
    .toLowerCase()
    .replace(/^nanasore_/, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'boutique';

  const externalReference = params.externalReference || params.external_reference || `nanasore_${cleanShopName}___${orderId}`;

  // 1. Initialisation persistante de l'intention dans Firestore (Flux 100% Production Réel)
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    const intentPayload = {
      id: orderId,
      orderId,
      externalReference,
      external_reference: externalReference,
      storeName: params.storeName || rawShopName,
      shopName: params.shopName || rawShopName,
      tenantId: `nanasore_${cleanShopName}`,
      amount: params.amount,
      currency: resolvedCurrency,
      country: resolvedCountry,
      countryCode: resolvedCountry,
      customerPhone: params.phone || params.customerPhone,
      operator: params.operator || 'MOBILE_MONEY',
      provider: params.provider || params.gateway || 'SASPAY',
      gateway: params.gateway || 'saspay',
      status: 'PENDING',
      isPaid: false,
      isTest: false,
      environment: 'production',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, 'payment_intents', orderId), intentPayload, { merge: true });
    if (externalReference && externalReference !== orderId) {
      await setDoc(doc(db, 'payment_intents', externalReference), intentPayload, { merge: true });
    }
  } catch (err: any) {
    console.warn('[storage INTENT INIT]', err.message);
  }

  // 2. Appel direct vers le micro-service Render (Passerelle SasPay / NaNaSwitch Live)
  try {
    const payloadWithCallback: SCollectionRequest = {
      callback_url: 'https://nana-payment-api.onrender.com/api/payment/webhook',
      callbackUrl: 'https://nana-payment-api.onrender.com/api/payment/webhook',
      ...params,
      externalReference,
      external_reference: externalReference,
      country: resolvedCountry,
      countryCode: resolvedCountry,
      currency: resolvedCurrency
    };

    const res = await fetch(`${baseUrl}/api/payment/sebpay/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payloadWithCallback),
      signal: AbortSignal.timeout(25000)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data && data.success !== false) {
      // Met à jour l'intention avec le vrai transactionId et la passerelle résolue
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const updateData: any = {
          gateway: data.gateway || 'saspay',
          provider: (data.gateway || 'saspay').toUpperCase(),
          transactionId: data.transactionId || data.id || null,
          redirectUrl: data.checkout_url || data.redirectUrl || data.paymentUrl || null,
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'payment_intents', orderId), updateData, { merge: true });
        if (externalReference && externalReference !== orderId) {
          await setDoc(doc(db, 'payment_intents', externalReference), updateData, { merge: true });
        }
      } catch {}
      return data;
    }

    const errorMsg = data?.error || data?.message || `Erreur serveur HTTP ${res.status}`;
    console.error('[PAYMENT API ERROR]', errorMsg, data);

    return {
      success: false,
      orderId,
      amount: params.amount,
      currency: resolvedCurrency,
      country: resolvedCountry,
      error: errorMsg,
      message: errorMsg
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Impossible de joindre la passerelle de paiement.';
    console.error('[PAYMENT NETWORK ERROR]', errorMsg);
    return {
      success: false,
      orderId,
      amount: params.amount,
      currency: resolvedCurrency,
      country: resolvedCountry,
      error: errorMsg,
      message: errorMsg
    };
  }
}

/**
 * Vérifie l'état d'un paiement Sebpay par son external_reference (${tenant_id}___${order_id})
 */
export async function verifySPayment(externalReference: string): Promise<{
  success: boolean;
  status?: string;
  isPaid?: boolean;
  data?: any;
  message?: string;
  error?: string;
}> {
  const baseUrl = getPaymentApiBaseUrl();

  // 1. Appel du micro-service Render (Passerelle Sebpay Live)
  try {
    const res = await fetch(`${baseUrl}/api/payment/sebpay/verify/${encodeURIComponent(externalReference)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.success || data.isPaid)) {
        return data;
      }
    }
  } catch (err: any) {}

  // 2. Vérification directe dans Firestore (Webhook officiel temps réel)
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    const snap = await getDoc(doc(db, 'payment_intents', externalReference));
    if (snap.exists()) {
      const d = snap.data();
      const isPaid = d?.isPaid === true || d?.paid === true || ['PAID', 'COMPLETED', 'SUCCESS'].includes(String(d?.status || '').toUpperCase());
      return {
        success: isPaid,
        isPaid,
        status: d?.status || (isPaid ? 'PAID' : 'PENDING'),
        data: d,
        message: isPaid ? 'Paiement confirmé par Sebpay.' : 'En cours de validation opérateur.'
      };
    }
  } catch (fbErr: any) {}

  return {
    success: false,
    status: 'PENDING',
    isPaid: false,
    message: 'En attente de confirmation par le serveur de paiement.'
  };
}

// =============================================================================
// CATALOGUE DES 20 PAYS COUVERTS S (B2B INTERNATIONAL)
// =============================================================================

export interface SupportedCountryInfo {
  id: string;
  country_name: string;
  country_code: string;
  prefix: string;
  currency: string;
  currency_symbol?: string;
  flag: string;
  zone?: string;
  status: 'Active' | string;
  operators?: string[];
}

export interface CountriesApiResponse {
  success: boolean;
  count?: number;
  countries: SupportedCountryInfo[];
  cached?: boolean;
  cachedAt?: string;
  fallback?: boolean;
  warning?: string;
  error?: string;
}

export const FALLBACK_20_COUNTRIES: SupportedCountryInfo[] = [
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
    operators: ['Moov Money', 'TogoCom']
  }
];

/**
 * Récupère la liste des pays supportés depuis l'API Render (avec relais sécurisé S)
 */
export async function getInternationalCoverageCountries(forceRefresh = false): Promise<CountriesApiResponse> {
  const baseUrl = getPaymentApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/payment/countries${forceRefresh ? '?refresh=true' : ''}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.countries) && data.countries.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn('[PAYMENT API] Impossible de joindre le micro-service pays, utilisation du catalogue local :', err.message);
  }

  return {
    success: true,
    count: FALLBACK_20_COUNTRIES.length,
    countries: FALLBACK_20_COUNTRIES,
    fallback: true
  };
}

/**
 * Vérifie le statut d'une session de paiement hébergée Sebpay Hosted Checkout
 * Appelé depuis /checkout/return?checkout_session_id=...
 */
export async function verifyCheckoutSession(sessionId: string): Promise<any> {
  if (!sessionId) {
    throw new Error('Identifiant checkout_session_id obligatoire pour la vérification.');
  }

  const baseUrl = getPaymentApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/payment/verify-session?checkout_session_id=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(20000)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Erreur serveur HTTP ${res.status}`);
  }

  return data;
}




