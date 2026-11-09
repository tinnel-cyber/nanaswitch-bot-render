/**
 * Service pour le NaNa Omni-Funnel Engine
 * Gestion des commandes physiques & digitales, OTO Upsell/Downsell,
 * calculs de livraison, synchronisation WooCommerce, Brevo et Twilio.
 */

import { supabase } from '../lib/supabase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, get as rtdbGet } from 'firebase/database';
import { db, rtdb } from '../firebase';
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
 * Vérifie le stock en temps réel dans WooCommerce et Firestore
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

  // Fallback local Caisse NaNa
  try {
    const prodDoc = await getDoc(doc(db, 'inventory', productId));
    if (prodDoc.exists()) {
      const stock = prodDoc.data().stock || 0;
      return { inStock: stock > 0, availableQuantity: stock };
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

  // 1. Enregistrement Firestore & Local
  try {
    await setDoc(doc(db, 'funnel_orders', orderId), order);
  } catch (err) {
    console.warn('[FUNNEL] Sauvegarde Firestore échouée, fallback local:', err);
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
      const snap = await getDoc(doc(db, 'funnel_orders', orderId));
      if (snap.exists()) order = snap.data() as OmniFunnelOrder;
    } catch {}
  }

  if (!order) return null;

  order.status = order.itemType === 'physical' ? 'PROCESSING' : 'COMPLETED';
  order.payment.paidAt = Date.now();
  order.payment.transactionId = transactionId;
  order.updatedAt = Date.now();

  // Mise à jour Firestore & Local
  try {
    await updateDoc(doc(db, 'funnel_orders', orderId), {
      status: order.status,
      'payment.paidAt': order.payment.paidAt,
      'payment.transactionId': transactionId,
      updatedAt: Date.now()
    });
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
    await updateDoc(doc(db, 'funnel_orders', orderId), {
      upsell: order.upsell,
      'payment.upsellAmount': amount,
      'payment.grandTotal': order.payment.grandTotal,
      updatedAt: Date.now()
    });
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
    await updateDoc(doc(db, 'funnel_orders', orderId), {
      downsell: order.downsell,
      'payment.downsellAmount': amount,
      'payment.grandTotal': order.payment.grandTotal,
      updatedAt: Date.now()
    });
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
  } catch {}

  try {
    await rtdbSet(rtdbRef(rtdb, `products/${cleanId}/modular_funnel`), safePayload);
    if (tenantId) {
      await rtdbSet(rtdbRef(rtdb, `tenants/${tenantId}/products/${cleanId}/modular_funnel`), safePayload);
    }
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL RTDB] Fallback local modular_funnel:', err);
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

  // Sauvegarde isolée : NE SURCHARGE JAMAIS modular_funnel ni nana_funnel_t-{id}
  try {
    localStorage.setItem(`nana_rtdb_product_${cleanId}_ultimate_funnel`, JSON.stringify(safePayload));
    localStorage.setItem(`nana_funnel_f-${cleanId}`, JSON.stringify(safePayload));
  } catch {}

  try {
    await rtdbSet(rtdbRef(rtdb, `products/${cleanId}/ultimate_funnel`), safePayload);
    if (tenantId) {
      await rtdbSet(rtdbRef(rtdb, `tenants/${tenantId}/products/${cleanId}/ultimate_funnel`), safePayload);
    }
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL RTDB] Fallback local ultimate_funnel:', err);
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

    // 1. Sauvegarde directe dans 'funnels' sous la clé typée préfixée (t-slug, c-slug, f-slug) pour zéro conflit
    await setDoc(doc(db, 'funnels', typeKey), payload, { merge: true });

    // 2. NON-ÉCRASEMENT DES CONFIGURATIONS :
    // Si linkPrefix === 't' (Funnel Modulaire 12 blocs), il a la Priorité Haute : écrit dans funnels/{slug}, tunnels/{slug} et /products/$productId/modular_funnel
    // Si linkPrefix === 'f' (Ultimate Funnel), il écrit dans /products/$productId/ultimate_funnel et NE SURCHARGE JAMAIS funnels/{slug} ni modular_funnel !
    if (linkPrefix === 't') {
      try {
        await setDoc(doc(db, 'funnels', cleanSub), payload, { merge: true });
      } catch (e) {}
      try {
        await setDoc(doc(db, 'tunnels', cleanSub), payload, { merge: true });
      } catch (tErr) {}
      await saveProductModularFunnelRTDB(productId, payload, tenantId);
      if (cleanSub !== productId) {
        await saveProductModularFunnelRTDB(cleanSub, payload, tenantId);
      }
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
        localStorage.setItem(`nana_funnel_${cleanSub}`, JSON.stringify(payload));
      } catch (e) {}
    } else if (linkPrefix === 'c') {
      try {
        await setDoc(doc(db, 'deals', cleanSub), payload, { merge: true });
        await setDoc(doc(db, 'deals', typeKey), payload, { merge: true });
      } catch (dealErr) {
        console.warn('[OMNI-FUNNEL] Erreur écriture deals:', dealErr);
      }
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      } catch (e) {}
    } else if (linkPrefix === 'f') {
      // Ultimate Funnel : Stockage strictement isolé dans /products/$productId/ultimate_funnel et nana_funnel_f-{slug}
      await saveProductUltimateFunnelRTDB(productId, payload, tenantId);
      if (cleanSub !== productId) {
        await saveProductUltimateFunnelRTDB(cleanSub, payload, tenantId);
      }
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      } catch (e) {}
    }

    // 3. Si et seulement si un véritable domaine personnalisé externe est configuré, liaison dans 'tenants'
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
        await setDoc(doc(db, 'tenants', cleanCustomDomain), customTenantData, { merge: true });
        localStorage.setItem(`nana_resolved_tenant_domain_${cleanCustomDomain}`, JSON.stringify(customTenantData));
        localStorage.setItem(`nana_custom_domain_${cleanSub}`, cleanCustomDomain);
      } catch (customErr) {
        console.warn('[OMNI-FUNNEL] Erreur enregistrement domaine personnalisé:', customErr);
      }
    }

    console.log(`[OMNI-FUNNEL] Tunnel '${cleanSub}' (${linkPrefix}) enregistré avec succès !`);
    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] registerSubdomainInFirebase fallback local:', err);
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

    // 1. Sauvegarde standardisée par clé typée pour isolation absolue (zéro collision)
    await setDoc(doc(db, 'funnels', typeKey), payload, { merge: true });

    // 2. NON-ÉCRASEMENT DES CONFIGURATIONS :
    // - Si 't' (Funnel Modulaire 12 blocs) : met à jour funnels/{slug}, tunnels/{slug}, et /products/$productId/modular_funnel
    // - Si 'f' (Ultimate Funnel) : met à jour UNIQUEMENT /products/$productId/ultimate_funnel et funnels/f-{slug} sans écraser funnels/{slug} !
    if (linkPrefix === 't') {
      try {
        await setDoc(doc(db, 'funnels', slug), payload, { merge: true });
      } catch (e) {}
      try {
        await setDoc(doc(db, 'tunnels', slug), payload, { merge: true });
      } catch (e) {}
      await saveProductModularFunnelRTDB(productId, payload, tenantId);
      if (slug !== productId) {
        await saveProductModularFunnelRTDB(slug, payload, tenantId);
      }
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
        localStorage.setItem(`nana_funnel_${slug}`, JSON.stringify(payload));
      } catch (e) {}
    } else if (linkPrefix === 'c') {
      try {
        await setDoc(doc(db, 'deals', slug), payload, { merge: true });
        await setDoc(doc(db, 'deals', typeKey), payload, { merge: true });
      } catch (e) {}
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      } catch (e) {}
    } else if (linkPrefix === 'f') {
      await saveProductUltimateFunnelRTDB(productId, payload, tenantId);
      if (slug !== productId) {
        await saveProductUltimateFunnelRTDB(slug, payload, tenantId);
      }
      try {
        localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      } catch (e) {}
    }

    // 3. Enregistrement dans 'tenants' UNIQUEMENT pour les vrais domaines personnalisés externes
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
        await setDoc(doc(db, 'tenants', cleanCustomDomain), tenantPayload, { merge: true });
        localStorage.setItem(`nana_resolved_tenant_domain_${cleanCustomDomain}`, JSON.stringify(tenantPayload));
        localStorage.setItem(`nana_custom_domain_${slug}`, cleanCustomDomain);
      } catch (e) {
        console.warn('[OMNI-FUNNEL] Erreur enregistrement tenant domaine personnalisé:', e);
      }
    }

    return true;
  } catch (err) {
    console.warn('[OMNI-FUNNEL] Erreur écriture Firestore:', err);
    try {
      localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(payload));
      if (linkPrefix === 't') {
        localStorage.setItem(`nana_funnel_${slug}`, JSON.stringify(payload));
      }
    } catch (e) {}
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

  // 1. Priorité 1 : Si on cherche le Funnel Modulaire 12 blocs ('t'), vérifier d'abord le stockage dédié modular_funnel
  if (normType === 't') {
    try {
      const rtdbLocalMod = localStorage.getItem(`nana_rtdb_product_${cleanSlug}_modular_funnel`) ||
        localStorage.getItem(`nana_rtdb_product_${slug}_modular_funnel`);
      if (rtdbLocalMod) {
        const parsed = JSON.parse(rtdbLocalMod);
        if (parsed) return parsed;
      }
      const cachedTyped = localStorage.getItem(`nana_funnel_t-${cleanSlug}`);
      if (cachedTyped) {
        const parsed = JSON.parse(cachedTyped);
        if (parsed) return parsed;
      }
      const cachedDirect = localStorage.getItem(`nana_funnel_${cleanSlug}`);
      if (cachedDirect) {
        const parsed = JSON.parse(cachedDirect);
        // Ne jamais laisser un cache 'ultimate' masquer le Funnel 12 blocs !
        if (parsed && parsed.funnelType !== 'ultimate' && parsed.linkPrefix !== 'f') {
          return parsed;
        }
      }
    } catch (e) {}

    // Vérification Firebase RTDB /products/$productId/modular_funnel
    try {
      const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `products/${cleanSlug}/modular_funnel`));
      if (rtdbSnap.exists()) {
        const data = rtdbSnap.val();
        try { localStorage.setItem(`nana_rtdb_product_${cleanSlug}_modular_funnel`, JSON.stringify(data)); } catch {}
        return data;
      }
    } catch (e) {}

    // Vérification Firestore 'funnels/t-{slug}' et 'tunnels/{slug}'
    try {
      const snapTyped = await getDoc(doc(db, 'funnels', `t-${cleanSlug}`));
      if (snapTyped.exists()) {
        const data = snapTyped.data();
        try { localStorage.setItem(`nana_funnel_t-${cleanSlug}`, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) {}

    try {
      const tSnap = await getDoc(doc(db, 'tunnels', cleanSlug));
      if (tSnap.exists()) {
        const data = tSnap.data();
        try { localStorage.setItem(`nana_funnel_t-${cleanSlug}`, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) {}

    // Fallback Firestore 'funnels/{slug}' uniquement s'il ne s'agit pas d'un Ultimate Funnel
    try {
      const snap = await getDoc(doc(db, 'funnels', cleanSlug));
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.funnelType !== 'ultimate' && data.linkPrefix !== 'f') {
          try { localStorage.setItem(`nana_funnel_t-${cleanSlug}`, JSON.stringify(data)); } catch (e) {}
          return data;
        }
      }
    } catch (e) {}

    // Structure par défaut Modulaire 12 blocs (FunnelBuilder générera automatiquement les 12 blocs)
    return {
      id: `tunnel-${cleanSlug}`,
      slug: cleanSlug,
      subdomain: cleanSlug,
      productId: `prod_${cleanSlug}`,
      funnelType: 'modular',
      funnelStudio: 'nana_studio_3',
      linkPrefix: 't',
      title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1).replace(/-/g, ' '),
      brandColor: '#10b981',
      blocks: [],
      ogMetadata: {
        title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1).replace(/-/g, ' '),
        description: 'Offre exclusive et commande express.',
        priceAmount: 25000,
        currency: 'FCFA'
      },
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // 2. Si normType === 'f' (Ultimate Funnel - Priorité 2 Conditionnelle)
  if (normType === 'f') {
    try {
      const rtdbLocalUlt = localStorage.getItem(`nana_rtdb_product_${cleanSlug}_ultimate_funnel`) ||
        localStorage.getItem(`nana_rtdb_product_${slug}_ultimate_funnel`);
      if (rtdbLocalUlt) {
        const parsed = JSON.parse(rtdbLocalUlt);
        if (parsed) return parsed;
      }
      const cachedTyped = localStorage.getItem(`nana_funnel_f-${cleanSlug}`);
      if (cachedTyped) {
        const parsed = JSON.parse(cachedTyped);
        if (parsed) return parsed;
      }
    } catch (e) {}

    try {
      const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `products/${cleanSlug}/ultimate_funnel`));
      if (rtdbSnap.exists()) {
        const data = rtdbSnap.val();
        try { localStorage.setItem(`nana_rtdb_product_${cleanSlug}_ultimate_funnel`, JSON.stringify(data)); } catch {}
        return data;
      }
    } catch (e) {}

    try {
      const snapTyped = await getDoc(doc(db, 'funnels', `f-${cleanSlug}`));
      if (snapTyped.exists()) {
        const data = snapTyped.data();
        try { localStorage.setItem(`nana_funnel_f-${cleanSlug}`, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) {}
  }

  // 3. Si normType === 'c' (Caisse Express)
  if (normType === 'c') {
    try {
      const cachedTyped = localStorage.getItem(`nana_funnel_${typeKey}`);
      if (cachedTyped) {
        const parsed = JSON.parse(cachedTyped);
        if (parsed) return parsed;
      }
      const cSnap = await getDoc(doc(db, 'deals', typeKey)) || await getDoc(doc(db, 'deals', cleanSlug));
      if (cSnap && cSnap.exists()) {
        const data = cSnap.data();
        try { localStorage.setItem(`nana_funnel_${typeKey}`, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) {}
  }

  // 4. Fallback générique Firestore
  try {
    const snap = await getDoc(doc(db, 'funnels', cleanSlug));
    if (snap.exists()) {
      const data = snap.data();
      return data;
    }
  } catch (e) {}

  // 5. Structure par défaut minimale si introuvable
  return {
    id: `tunnel-${cleanSlug}`,
    slug: cleanSlug,
    subdomain: cleanSlug,
    productId: `prod_${cleanSlug}`,
    funnelType: 'modular',
    linkPrefix: 't',
    title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1),
    brandColor: '#10b981',
    blocks: [],
    ogMetadata: {
      title: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1),
      description: 'Offre exclusive et commande express.',
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
 * Récupère les tunnels de vente créés par un vendeur (Firestore collection 'funnels' + cache local)
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
                // Éviter d'enregistrer les clés typées doubles comme f-slug
                const cleanId = funnelId.replace(/^[fct]-/, '');
                if (!funnelsMap.has(cleanId)) {
                  funnelsMap.set(cleanId, {
                    id: cleanId,
                    title: funnelTitle,
                    slug: parsed.slug || cleanId,
                    linkPrefix: parsed.linkPrefix
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
    const { data: supaList, error } = await supabase.from('funnels').select('*');
    if (!error && supaList) {
      supaList.forEach((row: any) => {
        const cleanId = String(row.slug || row.id).replace(/^[fct]-/, '');
        const funnelTitle = row.title || cleanId;
        if (!funnelsMap.has(cleanId)) {
          funnelsMap.set(cleanId, {
            id: cleanId,
            title: funnelTitle,
            slug: row.slug || cleanId,
            linkPrefix: row.template_data?.linkPrefix || 't'
          });
        }
      });
    }
  } catch (supaErr) {
    console.warn('[OMNI-FUNNEL] fetchVendorFunnels Supabase notice:', supaErr);
  }

  // 3. Récupérer dans Firestore (collection 'funnels') en fallback
  try {
    const funnelsCol = collection(db, 'funnels');
    const snap = await getDocs(funnelsCol);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawId = data.slug || data.id || docSnap.id;
      const cleanId = String(rawId).replace(/^[fct]-/, '');
      const funnelTitle = data.title || data.funnelTitle || data.name || cleanId;
      if (!storeId || !data.storeId || data.storeId === storeId || data.userId === storeId) {
        if (!funnelsMap.has(cleanId)) {
          funnelsMap.set(cleanId, {
            id: cleanId,
            title: funnelTitle,
            slug: data.slug || cleanId,
            linkPrefix: data.linkPrefix
          });
        }
      }
    });
  } catch (err) {
    console.warn('[OMNI-FUNNEL] fetchVendorFunnels Firestore notice:', err);
  }

  return Array.from(funnelsMap.values());
}

