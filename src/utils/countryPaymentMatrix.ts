import { 
  CentralPaymentConfig, 
  CountryCode, 
  CountryPaymentOption,
  CryptoCurrency 
} from '../types';
import { formatCFA } from './audio';

export const DEFAULT_CENTRAL_PAYMENT_CONFIG: CentralPaymentConfig = {
  orangeMoneyBurkina: {
    merchantCode: '',
    ussdTemplate: '*144*10*{merchantCode}*{montant}#',
    instructions: 'Composez le code USSD ci-dessous pour régler directement avec votre compte Orange Money Burkina Faso.'
  },
  internationalRecipient: {
    phone: '',
    name: 'Nanasore Trésorerie',
    country: 'Burkina Faso'
  },
  cryptoWallets: {
    usdtTrc20: '',
    moneroXmr: '',
    bitcoinBtc: ''
  },
  cardGatewayKeys: {
    publicKey: '',
    provider: 'Stripe',
    active: false
  },
  deliveryZones: [
    'Ouagadougou',
    'Bobo-Dioulasso',
    'Koudougou',
    'Ouahigouya',
    'Abidjan',
    'Bouaké',
    'Dakar',
    'Lomé',
    'Bamako'
  ],
  toggles: {
    enableMobileMoney: true,
    enableCard: false,
    enableCrypto: false,
    enableCashOnDelivery: true
  },
  scrollingMarquee: 'Composez le code indiqué pour valider votre paiement. Déblocage automatique dès confirmation.',
  supportW: ''
};

export interface SupportedCountry {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string;
  description: string;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF', description: 'Orange Money (Paiement Marchand) & Wave' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF', description: 'Wave CI, Orange Money, MTN MoMo, Moov' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF', description: 'Orange Money Mali, Moov Money, Wave' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF', description: 'Wave Sénégal, Orange Money, Free Money' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', currency: 'XOF', description: 'T-Money (TogoCom), Moov Money, Wave' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', currency: 'XOF', description: 'MTN MoMo Bénin, Moov Money, Celtiis Cash' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF', description: 'Airtel Money, Moov Money, Zamani, Wave' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', currency: 'GNF', description: 'Orange Money Guinée, MTN MoMo' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', description: 'MTN MoMo Cameroun, Orange Money' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', currency: 'XAF', description: 'Airtel Money Gabon, Moov Money' },
  { code: 'CG', name: 'Congo-Brazzaville', flag: '🇨🇬', currency: 'XAF', description: 'MTN MoMo Congo, Airtel Money' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', currency: 'XAF', description: 'Airtel Money Tchad, Moov Money' },
  { code: 'CD', name: 'R.D. Congo', flag: '🇨🇩', currency: 'CDF', description: 'M-Pesa (Vodacom), Orange Money, Airtel, AfriMoney' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', description: 'MTN Mobile Money, Telecel Cash, AT Money' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', description: 'MTN MoMo PSB, SmartCash Airtel, Paystack' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', description: 'M-Pesa Safaricom, Airtel Money' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', currency: 'MRU', description: 'Bankily, Masrvi, Sedad' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', description: 'MTN Mobile Money Rwanda, Airtel Money' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', currency: 'UGX', description: 'MTN MoMo Uganda, Airtel Money' },
  { code: 'DIASPORA', name: 'Diaspora (Europe, USA & Monde)', flag: '🌍', currency: 'EUR / USD', description: 'Visa / Mastercard, Apple Pay, Taptap Send' }
];

export interface CryptoOption {
  id: CryptoCurrency;
  name: string;
  network: string;
  symbol: string;
  iconColor: string;
  address: string;
}

/**
 * Retourne les configurations crypto dynamiques basées sur la config centrale
 */
export function getCryptoOptions(config?: CentralPaymentConfig | null): CryptoOption[] {
  const current = config?.cryptoWallets || DEFAULT_CENTRAL_PAYMENT_CONFIG.cryptoWallets;
  return [
    {
      id: 'USDT_TRC20',
      name: 'Tether USD',
      network: 'Tron TRC-20 (Frais minimes)',
      symbol: 'USDT',
      iconColor: 'emerald',
      address: current.usdtTrc20 || DEFAULT_CENTRAL_PAYMENT_CONFIG.cryptoWallets.usdtTrc20
    },
    {
      id: 'XMR',
      name: 'Monero',
      network: 'Mainnet Confidentiel Décentralisé',
      symbol: 'XMR',
      iconColor: 'orange',
      address: current.moneroXmr || DEFAULT_CENTRAL_PAYMENT_CONFIG.cryptoWallets.moneroXmr
    },
    {
      id: 'BTC',
      name: 'Bitcoin',
      network: 'Bitcoin Core Native',
      symbol: 'BTC',
      iconColor: 'amber',
      address: current.bitcoinBtc || DEFAULT_CENTRAL_PAYMENT_CONFIG.cryptoWallets.bitcoinBtc
    }
  ];
}

/**
 * Construit les options de paiement spécifiques par pays selon la matrice demandée
 */
export function getCountryPaymentOptions(
  countryCode: CountryCode,
  amount: number,
  config?: CentralPaymentConfig | null
): CountryPaymentOption[] {
  const cfg = config || DEFAULT_CENTRAL_PAYMENT_CONFIG;
  const merchantCode = cfg.orangeMoneyBurkina.merchantCode || '65565805';
  const cleanAmount = Math.max(0, Math.round(amount));
  const internationalPhone = cfg.internationalRecipient.phone || '+226 65 56 58 05';
  const rawRecipient = internationalPhone.replace(/[^0-9]/g, ''); // e.g. 22665565805

  switch (countryCode) {
    case 'BF': {
      const ussdCode = `*144*10*${merchantCode}*${cleanAmount}#`;
      const telUri = `tel:${ussdCode.replace(/#/g, '%23')}`;
      return [
        {
          id: 'bf-orange',
          operator: 'Orange Money Burkina',
          label: 'Orange Money (Paiement Marchand USSD)',
          badge: 'Automatisé 1-Clic',
          type: 'USSD',
          ussdCode,
          telUri,
          recipientNumber: merchantCode,
          instructions: `Composez directement le code USSD ci-dessus sur votre téléphone ou cliquez sur le bouton d'appel. Confirmez avec votre code secret.`,
          steps: [
            `Code USSD direct : ${ussdCode}`,
            `Code marchand Nanasore : ${merchantCode}`,
            `Montant exact : ${formatCFA(cleanAmount)}`,
            `Validation sans contact : le système débloque automatiquement dès réception du SMS !`
          ]
        },
        {
          id: 'bf-wave',
          operator: 'Wave Burkina Faso',
          label: 'Wave Burkina (Paiement Marchand Direct)',
          badge: '0% Frais',
          type: 'APP_TRANSFER',
          recipientNumber: internationalPhone,
          instructions: `Effectuez votre paiement Marchand Wave vers le numéro : ${internationalPhone}.`,
          steps: [
            `1. Ouvrez votre application Wave`,
            `2. Effectuez le paiement vers le numéro Marchand : ${internationalPhone}`,
            `3. Montant exact : ${formatCFA(cleanAmount)}`,
            `4. La validation Marchand est instantanée dès confirmation.`
          ]
        }
      ];
    }

    case 'CI': {
      return [
        {
          id: 'ci-wave',
          operator: 'Wave Côte d\'Ivoire',
          label: 'Wave CI (Paiement Marchand vers Burkina)',
          badge: 'Wave App',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Ouvrez Wave CI > Envoyer vers l'international > Burkina Faso (+226) > Numéro Marchand : ${internationalPhone}.`,
          steps: [
            `1. Ouvrez l'application Wave CI sur votre smartphone`,
            `2. Appuyez sur 'Envoyer' puis 'International'`,
            `3. Sélectionnez 'Burkina Faso (+226)'`,
            `4. Saisissez le numéro Marchand : ${internationalPhone}`,
            `5. Renseignez ${formatCFA(cleanAmount)} et validez le paiement Marchand.`
          ]
        }
      ];
    }

    case 'ML': {
      return [
        {
          id: 'ml-wave',
          operator: 'Wave Mali',
          label: 'Wave Mali (Paiement Marchand vers Burkina)',
          badge: 'Wave App',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Ouvrez Wave Mali > Envoyer vers l'international > Burkina Faso (+226) > Numéro Marchand : ${internationalPhone}.`,
          steps: [
            `1. Ouvrez l'application Wave Mali`,
            `2. Choisissez 'Envoyer vers l\'international'`,
            `3. Destination : Burkina Faso (+226)`,
            `4. Numéro Marchand : ${internationalPhone}`,
            `5. Montant exact : ${formatCFA(cleanAmount)} et validez le paiement Marchand.`
          ]
        }
      ];
    }

    case 'SN': {
      return [
        {
          id: 'sn-wave',
          operator: 'Wave Sénégal',
          label: 'Wave Sénégal (Paiement Marchand vers Burkina)',
          badge: 'Wave App',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Ouvrez Wave > Envoyer vers l'international > Burkina Faso (+226) > Numéro Marchand : ${internationalPhone}.`,
          steps: [
            `1. Ouvrez l'application Wave Sénégal`,
            `2. Appuyez sur 'Envoyer vers l'international'`,
            `3. Sélectionnez 'Burkina Faso (+226)'`,
            `4. Renseignez le numéro Marchand : ${internationalPhone}`,
            `5. Validez le montant Marchand : ${formatCFA(cleanAmount)}.`
          ]
        }
      ];
    }

    case 'TG': {
      // STRICT REQUIREMENT: Restrict mobile money in Togo exclusively to Wave Togo sending to +226 65 56 58 05
      return [
        {
          id: 'tg-wave',
          operator: 'Wave Togo',
          label: 'Wave Togo (Paiement Marchand Exclusif vers Burkina)',
          badge: 'Exclusif Togo',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Au Togo, le règlement Mobile Money est exclusivement opéré via l'application Wave Togo vers notre numéro Marchand du Burkina Faso (${internationalPhone}).`,
          steps: [
            `1. Ouvrez impérativement l'application Wave Togo sur votre mobile`,
            `2. Appuyez sur 'Envoyer' puis 'Transfert International'`,
            `3. Sélectionnez le pays de destination : Burkina Faso (+226)`,
            `4. Renseignez le numéro Marchand bénéficiaire : ${internationalPhone}`,
            `5. Montant à envoyer : ${formatCFA(cleanAmount)}`,
            `6. Validez votre paiement Marchand avec votre empreinte ou code Wave.`
          ]
        }
      ];
    }

    case 'NE': {
      // STRICT REQUIREMENT: Restrict mobile money in Niger exclusively to Wave Niger sending to +226 65 56 58 05
      return [
        {
          id: 'ne-wave',
          operator: 'Wave Niger',
          label: 'Wave Niger (Paiement Marchand vers Burkina)',
          badge: 'Exclusif Niger',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Au Niger, le règlement Mobile Money est opéré via l'application Wave Niger vers notre numéro Marchand du Burkina Faso (${internationalPhone}).`,
          steps: [
            `1. Ouvrez l'application Wave Niger sur votre mobile`,
            `2. Appuyez sur 'Envoyer' puis 'Transfert International'`,
            `3. Sélectionnez le pays de destination : Burkina Faso (+226)`,
            `4. Renseignez le numéro Marchand : ${internationalPhone}`,
            `5. Montant à envoyer : ${formatCFA(cleanAmount)}`,
            `6. Validez votre paiement Marchand.`
          ]
        }
      ];
    }

    case 'DIASPORA': {
      return [
        {
          id: 'diaspora-taptap',
          operator: 'Taptap Send (Europe / USA / Canada)',
          label: 'Taptap Send (Dépôt Orange Money Burkina)',
          badge: 'Carte Bancaire / Apple Pay',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Envoyez instantanément depuis votre carte bancaire en Europe/Amérique vers notre portefeuille Orange Money Burkina Faso via Taptap Send.`,
          steps: [
            `1. Ouvrez l'application Taptap Send sur votre smartphone`,
            `2. Sélectionnez le pays destinataire : Burkina Faso`,
            `3. Méthode de réception : 'Orange Money'`,
            `4. Numéro de téléphone bénéficiaire : +226 65 56 58 05`,
            `5. Nom bénéficiaire : Nanasore Trésorerie`,
            `6. Indiquez la valeur équivalente à ${formatCFA(cleanAmount)} et validez par carte.`
          ]
        },
        {
          id: 'diaspora-orange-europe',
          operator: 'Orange Money Europe',
          label: 'Orange Money Europe (Transfert Direct)',
          badge: 'Europe Direct',
          type: 'CROSS_BORDER',
          recipientNumber: internationalPhone,
          instructions: `Ouvrez l'application Orange Money Europe > Transférer vers Burkina Faso > Destinataire : +226 65 56 58 05.`,
          steps: [
            `1. Ouvrez votre compte Orange Money Europe`,
            `2. Cliquez sur 'Envoyer de l\'argent' vers le Burkina Faso`,
            `3. Renseignez le numéro : +226 65 56 58 05`,
            `4. Validez le montant équivalent à ${formatCFA(cleanAmount)}.`
          ]
        }
      ];
    }

    default:
      return [];
  }
}

/**
 * Génère une URL de QR code haute résolution pour les adresses crypto ou liens
 */
export function getQrCodeUrl(data: string, size: number = 220): string {
  if (!data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`;
}
