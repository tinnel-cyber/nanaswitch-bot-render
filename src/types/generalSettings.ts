export interface GeneralSettingsData {
  companyName: string;
  storeName: string;
  managerFullName: string;
  email: string;
  whatsappPhone: string;
  address: string;
  ifuNumber: string;
  rccmNumber: string;
  countryCode: string;
  currencySymbol: string;
  logoUrl?: string;
  bannerUrl?: string;
  isStoreOpen: boolean;
  autoPrintReceipts: boolean;
  enableCreditSales: boolean;
  taxRate: number; // 0 ou 18%
  acceptedPayments: {
    cash: boolean;
    orangeMoney: boolean;
    moovMoney: boolean;
    wave: boolean;
    mtn: boolean;
    crypto: boolean;
  };
}
