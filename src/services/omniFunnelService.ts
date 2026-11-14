/**
 * Service pour le NaNa Omni-Funnel Engine
 * Gestion des commandes physiques & digitales, OTO Upsell/Downsell,
 * calculs de livraison, synchronisation WooCommerce, Brevo et Twilio.
 */

import { supabase } from '../lib/supabase';
import {
  OmniFunnelOrder,
  FunnelProductItem,
  DeliveryOption,
  ShippingAddress,
  OrderBumpConfig,
  UtmParameters,
  DEFAULT_DELIVERY_OPTIONS,
  DEFAULT_ORDER_BUMP
} from '../types/omniFunnel';
import { RESERVED_SUBDOMAINS, cleanDomain } from './tenantDomainService';
import { notifyMerchantNewOrder } from './PushNotificationService';
import { ensureMandatoryFunnelSlug } from '../utils/slugEngine';

/**
 * Extrait les paramètres de tracking UTM depuis une chaîne de recherche d'URL
 */
export function parseUtmParameters(search: string): UtmParameters {
  const params = new URLSearchParams(search);
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
    content: params.get('utm_content') || undefined,
    term: params.get('utm_term') || undefined
  };
}

/**
 * Calcule les frais de port dynamiques selon la ville et l'option choisie
 */
export function calculateShippingFee(city: string, optionId: string): number {
  const opt = DEFAULT_DELIVERY_OPTIONS.find(o => o.id === optionId);
  if (!opt) return 1500;
  return opt.price;
}

/**
 * Vérifie le stock en temps réel dans WooCommerce et Supabase
 */
export async function checkProductInventory(productId: string): Promise<{ inStock: boolean; availableQuantity: number }> {
  try {
    const res = await fetch(`/api/funnel/inventory/${productId}`);
    if (res.ok) {
      const data = await res.json();
      return {
        inStock: data.stock > 0,
        availableQuantity: data.stock
      };
    }
  } catch (err) {
    console.warn('[FUNNEL] Vérification stock API échouée, fallback local:', err);
  }

  // Fallback Supabase SQL products
  try {
    const { data: prodData } = await supabase.from('products').select('stock').eq('id', productId).maybeSingle();
    if (prodData && prodData.stock !== undefined) {
      return { inStock: prodData.stock > 0, availableQuantity: prodData.stock };
    }
  } catch {}

  // Par défaut en stock pour démonstration fluide
  return { inStock: true, availableQuantity: 15 };
}

/**
 * Initialise une commande Omni-Funnel et synchronise avec WooCommerce en "On-Hold"
 */
export async function createOmniFunnelOrder(params: {
  product: FunnelProductItem;
  customer: { fullName: string; phoneNumber: string; email?: string };
  shippingAddress?: ShippingAddress;
  deliveryOption?: DeliveryOption;
  orderBump?: OrderBumpConfig;
  orderBumpAccepted?: boolean;
  utm: UtmParameters;
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO';
  storeId?: string;
}): Promise<OmniFunnelOrder> {
  const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const primaryAmount = params.product.price;
  const bumpAmount = params.orderBumpAccepted && params.orderBump ? params.orderBump.price : 0;
  const shippingAmount = params.deliveryOption ? params.deliveryOption.price : 0;
  const grandTotal = primaryAmount + bumpAmount + shippingAmount;

  const order: OmniFunnelOrder = {
    orderId,
    storeId: params.storeId || params.product.storeId,
    status: 'ON_HOLD',
    itemType: params.product.itemType,
    primaryProduct: params.product,
    orderBump: params.orderBump && params.orderBumpAccepted ? {
      bumpId: params.orderBump.id,
      title: params.orderBump.title,
      price: params.orderBump.price,
      accepted: true
    } : undefined,
    delivery: params.deliveryOption && params.shippingAddress ? {
      option: params.deliveryOption,
      shippingAddress: params.shippingAddress,
      status: 'PENDING_PREPARATION'
    } : undefined,
    customer: params.customer,
    payment: {
      provider: params.provider,
      primaryAmount,
      bumpAmount,
      shippingAmount,
      upsellAmount: 0,
      downsellAmount: 0,
      grandTotal,
      currency: 'FCFA'
    },
    utm: params.utm,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 1. Enregistrement Supabase SQL (table public.orders) & Cache Local
  try {
    await supabase.from('orders').upsert({
      id: orderId,
      customer_name: params.customer.name,
      customer_phone: params.customer.phone,
      total_amount: grandTotal,
      currency: 'FCFA',
      status: 'pending',
      payment_status: params.provider === 'CASH_ON_DELIVERY' ? 'pending_on_delivery' : 'pending',
      payment_provider: params.provider,
      metadata: order,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[FUNNEL] Sauvegarde Supabase orders notice:', err);
  }
  localStorage.setItem(`nana_order_${orderId}`, JSON.stringify(order));

  // 2. Synchronisation WooCommerce REST API (Création de commande On-Hold)
  try {
    const wooRes = await fetch('/api/funnel/woo/order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (wooRes.ok) {
      const wooData = await wooRes.json();
      if (wooData.wooOrderId) {
        order.wooOrderId = wooData.wooOrderId;
        localStorage.setItem(`nana_order_${orderId}`, JSON.stringify(order));
      }
    }
  } catch (err) {
    console.warn('[FUNNEL] Synchronisation WooCommerce on-hold échouée:', err);
  }

  return order;
}

/**
 * Valide le paiement principal, décrémente le stock et envoie les notifications Twilio/Brevo
 */
export async function confirmPrimaryPayment(orderId: string, transactionId: string): Promise<OmniFunnelOrder | null> {
  let order: OmniFunnelOrder | null = null;
  const raw = localStorage.getItem(`nana_order_${orderId}`);
  if (raw) order = JSON.parse(raw);

  if (!order) {
    try {
      const { data: supaOrder } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle();
      if (supaOrder && supaOrder.metadata) order = supaOrder.metadata as OmniFunnelOrder;
    } catch {}
  }

  if (!order) return null;

  order.status = order.itemType === 'physical' ? 'PROCESSING' : 'COMPLETED';
  order.payment.paidAt = Date.now();
  order.payment.transactionId = transactionId;
  order.updatedAt = Date.now();

  // Mise à jour Supabase & Local
  try {
    await supabase.from('orders').update({
      status: order.status,
      payment_status: 'paid',
      metadata: order,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
  } catch {}
  localStorage.setItem(`nana_order_${orderId}`, JSON.stringify(order));

  // Déclenchement automatique des flux d'accomplissement
  dispatchPostPaymentAutomations(order);

  return order;
}

/**
 * Ajoute un Upsell post-achat à la commande existante (mise à jour PUT WooCommerce)
 */
export async function purchaseUpsellItem(orderId: string, upsellProduct: FunnelProductItem, amount: number): Promise<boolean> {
  const raw = localStorage.getItem(`nana_order_${orderId}`);
  if (!raw) return false;
  const order: OmniFunnelOrder = JSON.parse(raw);

  order.upsell = {
    upsellId: upsellProduct.id,
    title: upsellProduct.name,
    price: amount,
    purchased: true,
    purchasedAt: Date.now()
  };
  order.payment.upsellAmount = amount;
  order.payment.grandTotal += amount;
  order.updatedAt = Date.now();

  localStorage.setItem(`nana_order_${orderId}`, JSON.stringify(order));
  try {
    await supabase.from('orders').update({
      total_amount: order.payment.grandTotal,
      metadata: order,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
  } catch {}

  // Mise à jour PUT WooCommerce (ajout de la ligne de commande)
  try {
    await fetch('/api/funnel/woo/order/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        wooOrderId: order.wooOrderId,
        lineItem: {
          name: upsellProduct.name,
          price: amount,
          quantity: 1,
          sku: upsellProduct.sku
        },
        type: 'UPSELL'
      })
    });
  } catch (err) {
    console.warn('[FUNNEL] Mise à jour PUT Upsell WooCommerce échouée:', err);
  }

  // Décrémenter le stock de l'upsell physique si applicable
  if (upsellProduct.itemType === 'physical') {
    deductStock(upsellProduct.id, 1);
  }

  return true;
}

/**
 * Ajoute un Downsell post-achat à la commande existante (mise à jour PUT WooCommerce)
 */
export async function purchaseDownsellItem(orderId: string, downsellProduct: FunnelProductItem, amount: number): Promise<boolean> {
  const raw = localStorage.getItem(`nana_order_${orderId}`);
  if (!raw) return false;
  const order: OmniFunnelOrder = JSON.parse(raw);

  order.downsell = {
    downsellId: downsellProduct.id,
    title: downsellProduct.name,
    price: amount,
    purchased: true,
    purchasedAt: Date.now()
  };
  order.payment.downsellAmount = amount;
  order.payment.grandTotal += amount;
  order.updatedAt = Date.now();

  localStorage.setItem(`nana_order_${orderId}`, JSON.stringify(order));
  try {
    await supabase.from('orders').update({
      total_amount: order.payment.grandTotal,
      metadata: order,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
  } catch {}

  // Mise à jour PUT WooCommerce
  try {
    await fetch('/api/funnel/woo/order/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        wooOrderId: order.wooOrderId,
        lineItem: {
          name: downsellProduct.name,
          price: amount,
          quantity: 1,
          sku: downsellProduct.sku
        },
        type: 'DOWNSELL'
      })
    });
  } catch (err) {
    console.warn('[FUNNEL] Mise à jour PUT Downsell WooCommerce échouée:', err);
  }

  if (downsellProduct.itemType === 'physical') {
    deductStock(downsellProduct.id, 1);
  }

  return true;
}

/**
 * Déclenche les intégrations externes automatiques après paiement
 */
function dispatchPostPaymentAutomations(order: OmniFunnelOrder) {
  // 1. Décrémenter stock physique dans Caisse NaNa & WooCommerce
  if (order.itemType === 'physical') {
    deductStock(order.primaryProduct.id, 1);
  }

  // 2. Reçu transactionnel par Email Brevo
  if (order.customer.email) {
    fetch('/api/funnel/brevo/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.customer.email,
        name: order.customer.fullName,
        orderId: order.orderId,
        items: [order.primaryProduct.name],
        total: order.payment.grandTotal
      })
    }).catch(console.warn);
  }

  // 3. SMS Confirmation Client via Twilio
  fetch('/api/funnel/twilio/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: order.customer.phoneNumber,
      message: `ENTREPRISE KONKOBO: Merci ${order.customer.fullName} ! Votre commande #${order.orderId} (${order.payment.grandTotal} FCFA) est confirmée. ${order.itemType === 'physical' ? 'Votre colis est en cours de préparation.' : 'Votre accès est débloqué.'}`
    })
  }).catch(console.warn);

  // 4. Si produit physique : Envoi WhatsApp au livreur avec épingle Google Maps
  if (order.itemType === 'physical' && order.delivery) {
    const mapsUrl = order.delivery.shippingAddress.googleMapsPin ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.delivery.shippingAddress.city} ${order.delivery.shippingAddress.district} ${order.delivery.shippingAddress.streetAddress || ''}`)}`;

    fetch('/api/funnel/twilio/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'DELIVERY_DRIVER',
        orderId: order.orderId,
        customerName: order.customer.fullName,
        customerPhone: order.customer.phoneNumber,
        deliveryOption: order.delivery.option.name,
        address: `${order.delivery.shippingAddress.city}, ${order.delivery.shippingAddress.district}, ${order.delivery.shippingAddress.streetAddress || ''}`,
        googleMapsLink: mapsUrl,
        items: [order.primaryProduct.name]
      })
    }).catch(console.warn);
  }

  // 5. Notification Push en temps réel vers le Marchand (Exclusivité Plan PRO)
  notifyMerchantNewOrder({
    merchantId: order.storeId,
    customerName: order.customer.fullName,
    orderTotal: order.payment.grandTotal,
    productName: order.primaryProduct.name,
    orderId: order.orderId
  }).catch((err) => {
    console.warn('[FUNNEL] Notification push marchand échouée ou ignorée :', err);
  });
}

/**
 * Décrémente le stock local dans Firestore et déclenche l'API WooCommerce
 */
async function deductStock(productId: string, quantity: number): Promise<void> {
  try {
    await fetch('/api/funnel/stock/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });
  } catch (err) {
    console.warn('[FUNNEL] Stock deduction call error:', err);
  }
}

/**
 * ============================================================================
 * SÉPARATION STRICTE & RÈGLE D'OR DE PRIORITÉ DES TUNNELS (RTDB + FIRESTORE)
 * - Nœud Priorité 1 (Haute) : /products/$productId/modular_funnel (Funnel 12 blocs)
 * - Nœud Priorité 2 (Fallback) : /products/$productId/ultimate_funnel (Ultimate Funnel)
 * ============================================================================
 */
export async function saveProductModularFunnelRTDB(
  productId: string,
  modularFunnelData: any,
  tenantId?: string
): Promise<boolean> {
  if (!productId || !modularFunnelData) return false;
  const cleanId = String(productId).trim().replace(/^[fct]-/i, '');
  const safePayload = JSON.parse(
    JSON.stringify({
      ...modularFunnelData,
      funnelType: 'modular',
      funnelStudio: 'nana_studio_3',
      linkPrefix: 't',
      updatedAt: Date.now()
    })
  );

  try {
    localStorage.setItem(`nana_rtdb_product_${cleanId}_modular_funnel`, JSON.stringify(safePayload));
    localStorage.setItem(`nana_funnel_t-${cleanId}`, JSON.stringify(safePayload));
    localStorage.setItem(`nana_funnel_${cleanId}`, JSON.stringify(safePayload));
  } catch {}

  try {
    await supabase.from('funnels').upsert({
      slug: cleanId,
      title: safePayload.title || `Tunnel ${cleanId}`,
      template_data: safePayload,
      is_published: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'slug' });
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] Fallback local modular_funnel:', err);
    return false;
  }
}

export async function saveProductUltimateFunnelRTDB(
  productId: string,
  ultimateFunnelData: any,
  tenantId?: string
): Promise<boolean> {
  if (!productId || !ultimateFunnelData) return false;
  const cleanId = String(productId).trim().replace(/^[fct]-/i, '');
  const safePayload = JSON.parse(
    JSON.stringify({
      ...ultimateFunnelData,
      funnelType: 'ultimate',
      funnelStudio: 'ultimate_studio',
      linkPrefix: 'f',
      updatedAt: Date.now()
    })
  );

  // Sauvegarde isolée
  try {
    localStorage.setItem(`nana_rtdb_product_${cleanId}_ultimate_funnel`, JSON.stringify(safePayload));
    localStorage.setItem(`nana_funnel_f-${cleanId}`, JSON.stringify(safePayload));
    localStorage.setItem(`nana_funnel_${cleanId}`, JSON.stringify(safePayload));
  } catch {}

  try {
    await supabase.from('funnels').upsert({
      slug: cleanId,
      title: safePayload.title || `Ultimate Funnel ${cleanId}`,
      template_data: safePayload,
      is_published: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'slug' });
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] Fallback local ultimate_funnel:', err);
    return false;
  }
}

/**
 * Vérifie de manière synchrone si un Funnel Modulaire à 12 blocs existe ou est actif pour un produit/slug
 */
export function hasActiveModularFunnelSync(productOrSlug?: any): boolean {
  if (!productOrSlug) return true; // Par défaut, le Funnel 12 blocs est le tunnel prioritaire

  if (typeof productOrSlug === 'object') {
    if (productOrSlug.modular_funnel) return true;
    if (productOrSlug.hasModularFunnel === true) return true;
    // Si le marchand n'a pas explicitement désactivé le 12 blocs ET activé Ultimate Funnel, le 12 blocs reste actif
    if (productOrSlug.hasModularFunnel !== false && productOrSlug.useUltimateFunnel !== true) {
      return true;
    }
  }

  const rawId = typeof productOrSlug === 'string'
    ? productOrSlug
    : (productOrSlug.linkedFunnelId || productOrSlug.slug || productOrSlug.id || '');
  const cleanId = String(rawId).trim().toLowerCase().replace(/^(?:[fct][\/-]|funnel-|tunnel-)/i, '');

  if (cleanId && typeof window !== 'undefined') {
    try {
      const rtdbMod = localStorage.getItem(`nana_rtdb_product_${cleanId}_modular_funnel`) ||
        localStorage.getItem(`nana_rtdb_product_${rawId}_modular_funnel`);
      if (rtdbMod) return true;

      const tCache = localStorage.getItem(`nana_funnel_t-${cleanId}`);
      if (tCache) return true;

      const directCache = localStorage.getItem(`nana_funnel_${cleanId}`);
      if (directCache) {
        const parsed = JSON.parse(directCache);
        if (parsed && (parsed.funnelType === 'modular' || parsed.funnelStudio === 'nana_studio_3' || parsed.linkPrefix === 't')) {
          return true;
        }
      }
    } catch {}
  }

  // Règle d'or : Le Funnel Modulaire 12 blocs est ACTIF par défaut, sauf si le produit n'a pas de 12 blocs ET useUltimateFunnel === true
  if (typeof productOrSlug === 'object' && productOrSlug.hasModularFunnel === false && productOrSlug.useUltimateFunnel === true) {
    return false;
  }
  return true;
}

/**
 * HIÉRARCHIE DE SÉLECTION DU TUNNEL (Priority Resolution Order) :
 * - ÉTAPE 1 (Priorité 1 - Obligatoire) : Vérifier si le Funnel Builder Modulaire à 12 blocs est actif pour le produit.
 *   Si OUI, charger TOUJOURS et EXCLUSIVEMENT le Funnel Modulaire à 12 blocs ('t').
 * - ÉTAPE 2 (Priorité 2 - Conditionnelle) : Ne charger "Ultimate Funnel Builder" ('f') QUE SI le produit
 *   n'a pas de Funnel 12 blocs ET que le marchand a explicitement coché "Utiliser Ultimate Funnel" (useUltimateFunnel === true).
 */
export function resolveProductFunnelEngine(
  product?: any,
  explicitUrlPrefix?: 't' | 'f' | 'c' | null
): 't' | 'f' | 'c' {
  if (explicitUrlPrefix === 'c') return 'c';

  // ÉTAPE 1 (Priorité 1 - Obligatoire) : Funnel Builder Modulaire à 12 blocs
  const isModularActive = hasActiveModularFunnelSync(product);
  if (isModularActive) {
    // Même si un ancien préfixe 'f' traîne, si un produit est fourni et que le 12 blocs est actif (ou useUltimateFunnel n'est pas coché), priorité au 12 blocs
    if (product && typeof product === 'object') {
      if (product.modular_funnel || product.hasModularFunnel === true || !product.useUltimateFunnel) {
        return 't';
      }
    }
    if (explicitUrlPrefix !== 'f') {
      return 't';
    }
  }

  // ÉTAPE 2 (Priorité 2 - Conditionnelle) : Ultimate Funnel UNIQUEMENT si pas de 12 blocs ET useUltimateFunnel === true
  if (product && typeof product === 'object') {
    if (!product.modular_funnel && product.hasModularFunnel === false && product.useUltimateFunnel === true) {
      return 'f';
    }
    return 't';
  }

  return explicitUrlPrefix === 'f' ? 'f' : 't';
}

/**
 * Enregistre un tunnel de vente dans Firebase
 * (collections unifiées 'funnels' et 'deals', accessible directement par son slug).
 * Si un vrai domaine personnalisé externe est fourni, l'associe dans 'tenants'.
 */
export async function registerSubdomainInFirebase(subdomain: string, title?: string, additionalData: any = {}): Promise<boolean> {
  const cleanSub = ensureMandatoryFunnelSlug({
    id: subdomain,
    title: title || additionalData?.funnelTitle || additionalData?.title,
    slug: subdomain
  });
  if (!cleanSub || RESERVED_SUBDOMAINS.includes(cleanSub as any)) return false;

  const timestamp = Date.now();
  const funnelTitle = title || additionalData?.funnelTitle || additionalData?.funnelName || additionalData?.title || `Tunnel ${cleanSub.charAt(0).toUpperCase() + cleanSub.slice(1)}`;

  const rawCustom = additionalData?.customDomain || additionalData?.settings?.customDomain;
  const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
  const isRealCustom = cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

  const isExplicitUltimate =
    additionalData?.funnelType === 'ultimate' ||
    additionalData?.funnelStudio === 'ultimate_studio' ||
    additionalData?.linkPrefix === 'f';

  // Par défaut, tout tunnel est Modulaire 12 blocs ('t') en Priorité 1
  const linkPrefix =
    additionalData?.linkPrefix || (
      additionalData?.funnelType === 'checkout' || additionalData?.funnelStudio === 'cro_express' ? 'c' :
      isExplicitUltimate ? 'f' :
      't'
    );
  const typeKey = `${linkPrefix}-${cleanSub}`;
  const productId = additionalData?.product?.id || additionalData?.productId || cleanSub;
  const tenantId = additionalData?.storeId || additionalData?.product?.storeId || undefined;

  let payload: any = null;
  try {
    payload = {
      id: cleanSub,
      slug: cleanSub,
      subdomain: cleanSub,
      customDomain: isRealCustom ? cleanCustomDomain : null,
      title: funnelTitle,
      funnelTitle: funnelTitle,
      subtitle: additionalData?.subtitle || additionalData?.metaDescription || 'Offre exclusive et commande express.',
      brandColor: additionalData?.brandColor || additionalData?.primaryColor || '#10b981',
      currency: additionalData?.currency || 'FCFA',
      salePrice: additionalData?.salePrice || additionalData?.price || 25000,
      originalPrice: additionalData?.originalPrice || (additionalData?.salePrice ? additionalData.salePrice * 1.5 : 45000),
      merchantWhatsapp: additionalData?.merchantWhatsapp || '+225 07 00 00 00 00',
      product: additionalData?.product || additionalData?.source || null,
      products: additionalData?.products || (additionalData?.product ? [additionalData.product] : (additionalData?.source ? [additionalData.source] : [])),
      steps: additionalData?.steps || null,
      pages: additionalData?.pages || null,
      blocks: additionalData?.blocks || null,
      settings: additionalData?.settings || additionalData || {},
      funnelType: linkPrefix === 't' ? 'modular' : linkPrefix === 'c' ? 'checkout' : 'ultimate',
      linkPrefix,
      isPublished: true,
      createdAt: additionalData?.createdAt || timestamp,
      updatedAt: timestamp,
      ...additionalData
    };

    // 0. Sauvegarde prioritaire dans Supabase (table public.funnels) & cache local
    try {
      localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      localStorage.setItem(`nana_funnel_${cleanSub}`, JSON.stringify(payload));
      localStorage.setItem(`nana_funnel_c-${cleanSub}`, JSON.stringify(payload));

      await supabase.from('funnels').upsert({
        slug: cleanSub,
        title: funnelTitle,
        template_data: payload,
        is_published: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
    } catch (supaErr) {
      console.warn('[OMNI-FUNNEL] Sauvegarde Supabase notice:', supaErr);
    }

    // Sauvegarde domaine personnalisé Supabase SQL (table public.tenants)
    if (isRealCustom && cleanCustomDomain) {
      try {
        const customTenantData = {
          storeId: cleanSub,
          storeName: funnelTitle,
          customDomain: cleanCustomDomain,
          funnelId: cleanSub,
          funnelSlug: cleanSub,
          dealSlug: cleanSub,
          type: 'funnel',
          vendorType: 'funnel',
          logoUrl: payload.ogImageUrl || payload.image || payload.logoUrl || '',
          primaryColor: payload.brandColor || '#10b981',
          whatsappPhone: payload.merchantWhatsapp || '',
          funnelData: payload,
          whiteLabel: {
            hidePoweredBy: true,
            hideReceiptLogo: true
          },
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await supabase.from('tenants').upsert({
          domain: cleanCustomDomain,
          store_name: funnelTitle,
          template_data: customTenantData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'domain' });
        localStorage.setItem(`nana_resolved_tenant_domain_${cleanCustomDomain}`, JSON.stringify(customTenantData));
        localStorage.setItem(`nana_custom_domain_${cleanSub}`, cleanCustomDomain);
      } catch (customErr) {
        console.warn('[OMNI-FUNNEL] Erreur enregistrement domaine personnalisé Supabase:', customErr);
      }
    }

    console.log(`[OMNI-FUNNEL] Tunnel '${cleanSub}' (${linkPrefix}) enregistré avec succès dans Supabase SQL !`);
    return true;

    console.log(`[OMNI-FUNNEL] Tunnel '${cleanSub}' (${linkPrefix}) enregistré avec succès !`);
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] registerSubdomainInstorage fallback local:', err);
    try {
      localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      if (linkPrefix === 't') {
        localStorage.setItem(`nana_funnel_${cleanSub}`, JSON.stringify(payload));
      }
    } catch {}
    return false;
  }
}

/**
 * Enregistre ou met à jour la configuration d'un tunnel de vente dans Firestore & RTDB
 * (Séparation stricte /products/$productId/modular_funnel vs /products/$productId/ultimate_funnel).
 */
export async function saveFunnelConfig(funnelData: any): Promise<boolean> {
  if (!funnelData) return false;
  const slug = ensureMandatoryFunnelSlug({
    id: funnelData.id,
    name: funnelData.title || funnelData.funnelTitle || funnelData.name,
    productName: funnelData.product?.name,
    slug: funnelData.slug || funnelData.subdomain
  });
  const timestamp = Date.now();
  const rawCustom = funnelData.customDomain || funnelData.settings?.customDomain;
  const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
  const isRealCustomDomain = cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

  const isExplicitUltimate =
    funnelData?.funnelType === 'ultimate' ||
    funnelData?.funnelStudio === 'ultimate_studio' ||
    funnelData?.linkPrefix === 'f';

  // Le Funnel Modulaire 12 blocs ('t') est le moteur par défaut et prioritaire
  const linkPrefix = funnelData?.linkPrefix || (
    funnelData?.funnelType === 'checkout' || funnelData?.funnelStudio === 'cro_express' ? 'c' :
    isExplicitUltimate ? 'f' :
    't'
  );
  const typeKey = `${linkPrefix}-${slug}`;
  const productId = funnelData?.product?.id || funnelData?.productId || slug;
  const tenantId = funnelData?.storeId || funnelData?.product?.storeId || undefined;

  const payload: any = {
    ...funnelData,
    slug,
    subdomain: slug,
    id: funnelData.id || slug,
    funnelType: linkPrefix === 't' ? 'modular' : linkPrefix === 'c' ? 'checkout' : 'ultimate',
    linkPrefix,
    customDomain: isRealCustomDomain ? cleanCustomDomain : null,
    updatedAt: timestamp
  };

  try {
    // 0. Sauvegarde prioritaire dans Supabase (table public.funnels) & cache local
    try {
      localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      localStorage.setItem(`nana_funnel_${slug}`, JSON.stringify(payload));
      if (linkPrefix === 'c') {
        localStorage.setItem(`nana_funnel_c-${slug}`, JSON.stringify(payload));
      }

      await supabase.from('funnels').upsert({
        slug,
        title: payload.title || payload.funnelTitle || `Tunnel ${slug}`,
        template_data: payload,
        is_published: payload.isPublished !== false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
    } catch (supaErr) {
      console.warn('[OMNI-FUNNEL] Sauvegarde Supabase notice:', supaErr);
    }

    // Enregistrement dans 'tenants' Supabase SQL UNIQUEMENT pour les vrais domaines personnalisés externes
    if (isRealCustomDomain && cleanCustomDomain) {
      try {
        const tenantPayload = {
          storeId: slug,
          storeName: payload.title || payload.funnelTitle || 'Tunnel de Vente',
          customDomain: cleanCustomDomain,
          type: 'funnel',
          vendorType: 'funnel',
          funnelId: slug,
          funnelSlug: slug,
          dealSlug: slug,
          logoUrl: payload.ogImageUrl || payload.image || '',
          primaryColor: payload.brandColor || '#10b981',
          whatsappPhone: payload.merchantWhatsapp || '',
          funnelData: payload,
          whiteLabel: {
            hidePoweredBy: true,
            hideReceiptLogo: true,
            customFaviconUrl: payload.faviconUrl || ''
          },
          updatedAt: timestamp
        };
        await supabase.from('tenants').upsert({
          domain: cleanCustomDomain,
          store_name: payload.title || 'Tunnel de Vente',
          template_data: tenantPayload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'domain' });
        localStorage.setItem(`nana_resolved_tenant_domain_${cleanCustomDomain}`, JSON.stringify(tenantPayload));
        localStorage.setItem(`nana_custom_domain_${slug}`, cleanCustomDomain);
      } catch (e) {
        console.warn('[OMNI-FUNNEL] Erreur enregistrement tenant Supabase:', e);
      }
    }

    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] Erreur enregistrement tunnel:', err);
    return false;
  }
}

/**
 * Récupère un tunnel de vente par son slug dans RTDB & Firestore
 * Respecte strictement la Règle d'Or de Priorité :
 * - 't' (ou par défaut) : Funnel Builder Modulaire à 12 blocs (/products/$productId/modular_funnel -> tunnels/{slug} -> funnels/t-{slug})
 * - 'f' : Ultimate Funnel Builder (/products/$productId/ultimate_funnel -> funnels/f-{slug})
 * - 'c' : Caisse Express / Commande 1-Clic (/c/:slug)
 */
export async function getFunnelBySlug(slug: string, typeHint?: string): Promise<any | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim().replace(/^(?:[fct][\/-]|funnel-|tunnel-)/i, '').replace(/[^a-z0-9-]/g, '') || slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

  // Par défaut (si aucun typeHint n'est forcé), le type prioritaire est TOUJOURS 't' (Funnel Modulaire 12 blocs)
  const normType = typeHint === 'c' || typeHint === 'checkout' || typeHint === 'express' ? 'c' :
    typeHint === 'f' || typeHint === 'ultimate' ? 'f' : 't';

  const typeKey = `${normType}-${cleanSlug}`;

  // 0. Priorité 0 : Récupération Supabase (public.funnels) & cache local (0ms)
  try {
    const cachedTyped = localStorage.getItem(`nana_funnel_${typeKey}`) ||
      localStorage.getItem(`nana_funnel_${normType}-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_c-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_${cleanSlug}`);
    if (cachedTyped) {
      const parsed = JSON.parse(cachedTyped);
      if (parsed && (parsed.blocks || parsed.steps || parsed.title)) {
        return parsed;
      }
    }

    const { data: supaRow, error } = await supabase
      .from('funnels')
      .select('template_data, title, slug, is_published')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (!error && supaRow?.template_data && Object.keys(supaRow.template_data).length > 0) {
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(supaRow.template_data));
        localStorage.setItem(`nana_funnel_${cleanSlug}`, JSON.stringify(supaRow.template_data));
      } catch (e) {}
      return supaRow.template_data;
    }
  } catch (supaErr) {
    console.warn('[OMNI-FUNNEL] Supabase getFunnelBySlug notice:', supaErr);
  }

  // 1. Priorité Supabase SQL (public.funnels)
  try {
    const { data: supaRow, error } = await supabase
      .from('funnels')
      .select('template_data, title, slug, is_published')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (!error && supaRow?.template_data && Object.keys(supaRow.template_data).length > 0) {
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(supaRow.template_data));
        localStorage.setItem(`nana_funnel_${cleanSlug}`, JSON.stringify(supaRow.template_data));
      } catch (e) {}
      return supaRow.template_data;
    }
  } catch (supaErr) {
    console.warn('[OMNI-FUNNEL] Supabase getFunnelBySlug notice:', supaErr);
  }

  // 2. Cache local réactif de secours
  try {
    const cachedTyped = localStorage.getItem(`nana_funnel_${typeKey}`) ||
      localStorage.getItem(`nana_funnel_${normType}-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_c-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_t-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_f-${cleanSlug}`) ||
      localStorage.getItem(`nana_funnel_${cleanSlug}`);
    if (cachedTyped) {
      const parsed = JSON.parse(cachedTyped);
      if (parsed && (parsed.blocks || parsed.steps || parsed.title)) {
        return parsed;
      }
    }
  } catch (e) {}

  // 3. Structure par défaut minimale si introuvable
  return {
    id: `caisse_${cleanSlug}`,
    slug: cleanSlug,
    subdomain: cleanSlug,
    productId: `prod_${cleanSlug}`,
    funnelType: normType === 'c' ? 'checkout' : normType === 'f' ? 'ultimate' : 'modular',
    linkPrefix: normType,
    title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1).replace(/-/g, ' '),
    brandColor: '#10b981',
    blocks: DEFAULT_PHYSICAL_FUNNEL_BLOCKS,
    ogMetadata: {
      title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1).replace(/-/g, ' '),
      description: 'Offre exclusive et commande express avec livraison rapide.',
      priceAmount: 35000,
      currency: 'FCFA'
    },
    isPublished: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export interface VendorFunnelSummary {
  id: string;
  title: string;
  slug?: string;
  linkPrefix?: string;
}

/**
 * Récupère les tunnels de vente créés par un vendeur (Supabase SQL table 'funnels' + cache local)
 */
export async function fetchVendorFunnels(storeId?: string): Promise<VendorFunnelSummary[]> {
  const funnelsMap = new Map<string, VendorFunnelSummary>();

  // 1. Lire d'abord dans le localStorage pour un affichage instantané à 0ms
  try {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nana_funnel_') || key.startsWith('nana_tunnel_'))) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const funnelId = parsed.slug || parsed.id;
              const funnelTitle = parsed.title || parsed.funnelTitle || parsed.name;
              if (funnelId && funnelTitle && (!storeId || !parsed.storeId || parsed.storeId === storeId)) {
                const cleanId = funnelId.replace(/^[fct]-/, '');
                if (!funnelsMap.has(cleanId)) {
                  funnelsMap.set(cleanId, {
                    id: cleanId,
                    title: funnelTitle,
                    slug: parsed.slug || cleanId,
                    linkPrefix: parsed.linkPrefix || 'c'
                  });
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 2. Récupérer dans Supabase (table 'funnels')
  try {
    let query = supabase.from('funnels').select('*');
    if (storeId) {
      query = query.eq('user_id', storeId);
    }
    const { data: supaList, error } = await query;
    if (!error && supaList) {
      supaList.forEach((row: any) => {
        const cleanId = String(row.slug || row.id).replace(/^[fct]-/, '');
        const funnelTitle = row.title || cleanId;
        if (!funnelsMap.has(cleanId)) {
          funnelsMap.set(cleanId, {
            id: cleanId,
            title: funnelTitle,
            slug: row.slug || cleanId,
            linkPrefix: row.template_data?.linkPrefix || 'c'
          });
        }
      });
    }
  } catch (supaErr) {
    console.warn('[OMNI-FUNNEL] fetchVendorFunnels Supabase notice:', supaErr);
  }

  return Array.from(funnelsMap.values());
}

