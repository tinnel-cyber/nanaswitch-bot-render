/**
 * Passerelle de paiement NaNa Store / S-Pay
 * Remplace l'ancien système par le Checkout Ultime (Qualité Stripe / Apple Pay)
 */

export { UltimateCheckout as NanasorePaymentGateway } from './UltimateCheckout';
export type {
  UltimateCheckoutProps as NanasorePaymentGatewayProps,
  PaymentSuccessDetails,
  CheckoutProductSummary as ProductType
} from './UltimateCheckout';

export { UltimateCheckout, UltimateCheckout as default } from './UltimateCheckout';
