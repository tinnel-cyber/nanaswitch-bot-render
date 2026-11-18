/**
 * @file supabaseOrderService.ts
 * @description Service de Commande & Intentions d'Achat 100% Supabase (SQL, Storage & Realtime).
 * Élimine toute dépendance à Firestore/Firebase pour les thèmes et la vitrine client.
 */

import { supabase } from '../lib/supabase';
import { CentralPaymentConfig } from '../types';
import { DEFAULT_CENTRAL_PAYMENT_CONFIG } from '../utils/countryPaymentMatrix';

/**
 * Écouteur en temps réel Supabase Realtime pour la configuration centrale des paiements
 */
export function subscribeToCentralPaymentConfig(
  onUpdate: (config: CentralPaymentConfig) => void
): () => void {
  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('app_registry')
        .select('config_json')
        .eq('module_key', 'central_payment')
        .single();
      if (data?.config_json) {
        onUpdate({ ...DEFAULT_CENTRAL_PAYMENT_CONFIG, ...data.config_json });
        return;
      }
    } catch {
      // mode fallback
    }
    onUpdate(DEFAULT_CENTRAL_PAYMENT_CONFIG);
  };

  fetchConfig();

  const channelName = `central_pay_sb_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_registry',
        filter: 'module_key=eq.central_payment'
      },
      () => {
        fetchConfig();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface UnifiedOrderPayload {
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    category?: string;
    color?: string;
    size?: string;
    image?: string;
    productId?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status?: string;
  notes?: string;
}

export interface WLeadOrderPayload {
  storeId: string;
  storeName?: string;
  product: {
    id?: string;
    name: string;
    price: number;
    category?: string;
    image?: string;
    selectedColor?: string;
    selectedSize?: string;
  };
  quantity?: number;
  totalAmount?: number;
  sourceModule?: string;
  customerPhone?: string;
}

/**
 * Enregistrement unifié d'une commande client directement dans Supabase SQL (orders & app_registry)
 * avec propagation temps-réel Supabase Realtime et cache local de résilience.
 */
export async function recordUnifiedOrder(payload: UnifiedOrderPayload | any, optionalStoreId?: string): Promise<string> {
  const cleanStoreId = (payload.storeId || optionalStoreId || payload.storeSlug || 'boutique').replace(/^store-/, '');
  const now = payload.createdAt || Date.now();
  const orderNum = payload.orderNumber || `CMD-${now.toString().slice(-6)}`;
  const orderDocId = payload.id || `${cleanStoreId}_${orderNum}`;

  const cleanItems = (payload.items || []).map((item: any, idx: number) => ({
    id: item.productId || item.id || `item-${idx}`,
    productId: item.productId || item.id || `item-${idx}`,
    name: item.name || 'Produit',
    price: Number(item.price ?? item.unitPrice) || 0,
    quantity: Number(item.quantity) || 1,
    category: item.category || 'Général',
    color: item.color || '',
    size: item.size || '',
    image: item.image || ''
  }));

  const recordData = {
    id: orderDocId,
    orderId: orderDocId,
    orderNumber: orderNum,
    storeId: cleanStoreId,
    storeSlug: payload.storeSlug || cleanStoreId,
    storeName: payload.storeName || 'Boutique Nanasore',
    customerName: payload.customerName || 'Client Estimé',
    customerPhone: payload.customerPhone || '',
    deliveryAddress: payload.deliveryAddress || payload.customerAddress || 'Non spécifié',
    paymentMethod: payload.paymentMethod || 'Paiement à la livraison',
    paymentStatus: payload.paymentMethod?.includes('LIVRAISON') 
      ? 'À ENCAISSER À LA LIVRAISON' 
      : (payload.status === 'confirmed_paid' ? 'PAYÉ' : 'EN ATTENTE DE PAIEMENT'),
    deliveryStatus: 'Nouvelle commande',
    items: cleanItems,
    subtotal: Number(payload.subtotal ?? payload.total) || 0,
    deliveryFee: Number(payload.deliveryFee) || 0,
    total: Number(payload.total) || 0,
    totalAmount: Number(payload.total) || 0,
    type: payload.type || 'BON_COMMANDE',
    notes: payload.notes || '',
    createdAt: typeof payload.createdAt === 'number' ? new Date(payload.createdAt).toISOString() : (payload.createdAt || new Date().toISOString()),
    created_at: new Date().toISOString(),
    timestamp: typeof now === 'number' ? now : Date.now()
  };

  // 1. Sauvegarde prioritaire Supabase SQL (table public.orders)
  try {
    const isOrderUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderDocId);
    const orderUuidToUse = isOrderUUID ? orderDocId : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    
    if (orderUuidToUse) {
      await supabase.from('orders').upsert({
        id: orderUuidToUse,
        order_number: orderNum,
        customer_name: payload.customerName || 'Client Estimé',
        customer_phone: payload.customerPhone || '',
        total: Number(payload.total) || 0,
        status: payload.status || 'pending',
        items: cleanItems,
        notes: payload.notes || '',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' }).then(null, () => {});
    }

    // 2. Synchronisation dans la table centralisée public.app_registry
    await supabase.from('app_registry').upsert({
      key: `order_${orderDocId}`,
      tenant_id: cleanStoreId,
      module_key: 'orders',
      config_json: recordData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).then(null, () => {});

    // 3. Notification broadcast en temps réel via Supabase Realtime Channel
    const orderChannel = supabase.channel(`store_orders_${cleanStoreId}`);
    orderChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        orderChannel.send({
          type: 'broadcast',
          event: 'new_order',
          payload: recordData
        }).then(() => {
          supabase.removeChannel(orderChannel);
        }).catch(() => {});
      }
    });
  } catch (sbErr) {
    console.warn('[SUPABASE ORDER] Erreur upsert SQL orders / app_registry :', sbErr);
  }

  // 4. Cache local immédiat et événements d'interface 0ms
  try {
    const localKey = `nana_orders_cache_${cleanStoreId}`;
    const raw = localStorage.getItem(localKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.unshift(recordData);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 50)));

    window.dispatchEvent(new CustomEvent('newCustomerOrderAlert', { detail: recordData }));
    window.dispatchEvent(new CustomEvent('newCustomerOrder', { detail: recordData }));
    window.dispatchEvent(new Event('customerOrdersUpdated'));
  } catch {}

  return orderDocId;
}

/**
 * Enregistre une intention d'achat ou un prospect WhatsApp/Wameet dans Supabase SQL
 * pour que le commerçant retrouve tous les prospects chauds dans son Dashboard.
 */
export function recordWLeadOrder(payload: WLeadOrderPayload): void {
  // Exécution asynchrone fire-and-forget sans jamais bloquer l'interface
  Promise.resolve().then(async () => {
    try {
      const cleanStoreId = (payload.storeId || 'boutique').replace(/^store-/, '');
      const now = Date.now();
      const orderNum = `W-${now.toString().slice(-6)}`;
      const orderDocId = `${cleanStoreId}_${orderNum}`;
      const qty = Number(payload.quantity) || 1;
      const total = Number(payload.totalAmount) || ((Number(payload.product.price) || 0) * qty) || 0;

      const recordData = {
        id: orderDocId,
        orderId: orderDocId,
        orderNumber: orderNum,
        storeId: cleanStoreId,
        storeName: payload.storeName || 'Boutique Nanasore',
        customerName: 'Prospect Wameet',
        customerPhone: payload.customerPhone || '',
        customerCity: 'Non spécifié',
        deliveryAddress: 'Wameet Direct',
        paymentMethod: 'Discussion Wameet Direct',
        paymentStatus: 'PROSPECT WAMEET',
        deliveryStatus: 'Intention d\'achat',
        items: [{
          productId: payload.product.id || '',
          name: payload.product.name,
          price: Number(payload.product.price) || 0,
          quantity: qty,
          category: payload.product.category || 'Général',
          color: payload.product.selectedColor || '',
          size: payload.product.selectedSize || '',
          image: payload.product.image || ''
        }],
        subtotal: total,
        deliveryFee: 0,
        total: total,
        totalAmount: total,
        type: 'PROSPECT_WAMEET',
        sourceModule: payload.sourceModule || 'direct_view',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        timestamp: now
      };

      // 1. Sauvegarde Supabase SQL public.app_registry
      await supabase.from('app_registry').upsert({
        key: `lead_${orderDocId}`,
        tenant_id: cleanStoreId,
        module_key: 'leads',
        config_json: recordData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' }).then(null, () => {});

      // 2. Notification broadcast en temps réel via Supabase Realtime
      const leadChannel = supabase.channel(`store_leads_${cleanStoreId}`);
      leadChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          leadChannel.send({
            type: 'broadcast',
            event: 'new_lead',
            payload: recordData
          }).then(() => {
            supabase.removeChannel(leadChannel);
          }).catch(() => {});
        }
      });

      // 3. Cache local pour feedback vendeur
      const localKey = `nana_orders_cache_${cleanStoreId}`;
      const raw = localStorage.getItem(localKey);
      const list: any[] = raw ? JSON.parse(raw) : [];
      list.unshift(recordData);
      localStorage.setItem(localKey, JSON.stringify(list.slice(0, 50)));

      window.dispatchEvent(new CustomEvent('newCustomerOrderAlert', { detail: recordData }));
    } catch (err) {
      console.warn('[SUPABASE LEAD] Erreur enregistrement intention d\'achat :', err);
    }
  });
}
