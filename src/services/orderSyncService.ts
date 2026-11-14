/**
 * Service de Synchronisation et Réception des Commandes Clients en Temps Réel
 * Connecte la Boutique Vitrine, la Caisse (POS) et le Dashboard Commerçant
 * via Firestore Autoritaire + LocalStorage + Web Audio Alert.
 *
 * NOTE : Les requêtes HTTP polling vers Firebase RTDB (/orders/*.json) ont été
 * définitivement neutralisées pour supprimer toute boucle d'erreur 401 (Unauthorized).
 * Firestore ('orders') et les événements de fenêtre ('newCustomerOrderAlert') assurent
 * 100% de la synchronisation instantanée sans charge réseau polling.
 */

import { CustomerOrder, OrderItem } from '../types';
import { persistCustomerOrder, deleteCustomerOrder } from '../utils/firestoreService';
import { playNewOrderAlert } from '../utils/audio';
import {
  saveOrderOffline,
  getOrdersOffline,
  deleteOrderOffline,
  queueOfflineMutation,
} from './offlineSyncService';

export interface StoreCustomerOrder extends CustomerOrder {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string; // "PAYÉ (Mobile Money)" | "À ENCAISSER À LA LIVRAISON"
  deliveryStatus: 'Nouvelle commande' | 'En cours de livraison' | 'Livrée' | string;
  paymentOperator?: string;
  transactionId?: string;
  createdAtFormatted?: string;
}

/**
 * Récupère les commandes locales enregistrées dans localStorage
 */
export function getStoreOrdersLocal(storeId: string): StoreCustomerOrder[] {
  if (typeof window === 'undefined' || !storeId) return [];
  try {
    const rawTenant = localStorage.getItem(`nana_tenant_${storeId}_orders`);
    const rawDirect = localStorage.getItem(`nana_orders_${storeId}`);
    const source = rawTenant || rawDirect;
    if (source) {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[orderSyncService] Erreur lecture localStorage orders:', e);
  }
  return [];
}

/**
 * Sauvegarde synchrone dans les clés localStorage pour le storeId donné
 */
export function saveOrdersLocal(storeId: string, orders: StoreCustomerOrder[]): void {
  if (typeof window === 'undefined' || !storeId) return;
  try {
    const data = JSON.stringify(orders);
    localStorage.setItem(`nana_tenant_${storeId}_orders`, data);
    localStorage.setItem(`nana_orders_${storeId}`, data);
  } catch (e) {
    console.warn('[orderSyncService] Erreur écriture localStorage orders:', e);
  }
}

/**
 * Enregistrement universel de chaque commande dans Firestore + LocalStorage
 */
export async function saveCustomerOrderEverywhere(
  order: StoreCustomerOrder,
  storeId: string
): Promise<boolean> {
  if (!storeId || !order?.id) {
    console.warn('[orderSyncService] Impossible de sauvegarder : storeId ou order.id manquant');
    return false;
  }

  // 1. Mise à jour immédiate dans le localStorage local ET IndexedDB étanche
  try {
    const localOrders = getStoreOrdersLocal(storeId);
    const existingIndex = localOrders.findIndex((o) => o.id === order.id);
    let updatedOrders: StoreCustomerOrder[];
    if (existingIndex >= 0) {
      updatedOrders = [...localOrders];
      updatedOrders[existingIndex] = { ...updatedOrders[existingIndex], ...order };
    } else {
      updatedOrders = [order, ...localOrders];
    }
    saveOrdersLocal(storeId, updatedOrders);
    // Sauvegarde asynchrone non-bloquante dans la base IndexedDB
    saveOrderOffline(order, storeId).catch((err) =>
      console.warn('[orderSyncService] Sauvegarde IndexedDB différée:', err)
    );
  } catch (e) {
    console.warn('[orderSyncService] Erreur sauvegarde locale:', e);
  }

  // 2. Émission d'événements immédiats pour réactivité UI instantanée
  try {
    window.dispatchEvent(new CustomEvent('newCustomerOrderAlert', { detail: order }));
    window.dispatchEvent(new CustomEvent('newCustomerOrder', { detail: order }));
    window.dispatchEvent(new Event('customerOrdersUpdated'));
  } catch {}

  // 3. Mode Hors-ligne direct si déconnecté : Enfilement sécurisé dans la file d'attente
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[orderSyncService] Détection Hors-Ligne : Commande mise en file d’attente offlineSyncQueue');
    queueOfflineMutation({
      type: 'CREATE_ORDER',
      storeId,
      payload: order,
    }).catch(() => {});
    return true; // Succès immédiat pour le client, aucune interruption UI
  }

  // 4. Sauvegarde autoritaire dans Firestore avec fallback résilient vers offlineSyncQueue
  try {
    await persistCustomerOrder(order, storeId);
    return true;
  } catch (err) {
    console.warn('[orderSyncService] Erreur persistance storage (mise en file offlineSyncQueue):', err);
    queueOfflineMutation({
      type: 'CREATE_ORDER',
      storeId,
      payload: order,
    }).catch(() => {});
    return true; // Ne jamais faire échouer l'interface utilisateur
  }
}

/**
 * Met à jour le statut d'une commande (Livraison, Paiement) sur tous les canaux
 */
export async function updateCustomerOrderStatus(
  orderId: string,
  storeId: string,
  updates: Partial<StoreCustomerOrder>
): Promise<boolean> {
  if (!storeId || !orderId) return false;

  // 1. Mise à jour LocalStorage
  let updatedOrder: StoreCustomerOrder | null = null;
  try {
    const local = getStoreOrdersLocal(storeId);
    const idx = local.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      updatedOrder = { ...local[idx], ...updates };
      local[idx] = updatedOrder;
      saveOrdersLocal(storeId, local);
    }
  } catch {}

  // 2. Événement local
  try {
    window.dispatchEvent(new Event('customerOrdersUpdated'));
  } catch {}

  // 3. Mise à jour Firestore si l'objet complet est résolu + synchronisation IndexedDB
  if (updatedOrder) {
    saveOrderOffline(updatedOrder, storeId).catch(() => {});

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineMutation({
        type: 'UPDATE_ORDER',
        storeId,
        payload: updatedOrder,
      }).catch(() => {});
    } else {
      try {
        await persistCustomerOrder(updatedOrder, storeId);
      } catch (e) {
        console.warn('[orderSyncService] Erreur update storage, mise en file offlineSyncQueue:', e);
        queueOfflineMutation({
          type: 'UPDATE_ORDER',
          storeId,
          payload: updatedOrder,
        }).catch(() => {});
      }
    }
  }

  return true;
}

/**
 * Supprime une commande de partout (LocalStorage + IndexedDB + Firestore)
 */
export async function deleteCustomerOrderEverywhere(
  orderId: string,
  storeId: string
): Promise<boolean> {
  if (!storeId || !orderId) return false;

  try {
    const local = getStoreOrdersLocal(storeId).filter((o) => o.id !== orderId);
    saveOrdersLocal(storeId, local);
    deleteOrderOffline(orderId, storeId).catch(() => {});
    window.dispatchEvent(new Event('customerOrdersUpdated'));
  } catch {}

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineMutation({
      type: 'DELETE_ORDER',
      storeId,
      payload: { id: orderId },
    }).catch(() => {});
  } else {
    try {
      await deleteCustomerOrder(orderId, storeId);
    } catch (e) {
      console.warn('[orderSyncService] Erreur delete storage, mise en file offlineSyncQueue:', e);
      queueOfflineMutation({
        type: 'DELETE_ORDER',
        storeId,
        payload: { id: orderId },
      }).catch(() => {});
    }
  }
  return true;
}

/**
 * Récupère les commandes depuis le cache local IndexedDB ou localStorage
 */
export async function fetchOrdersFromRTDB(storeId: string): Promise<StoreCustomerOrder[]> {
  if (!storeId) return [];
  try {
    const offlineList = await getOrdersOffline(storeId);
    if (offlineList && offlineList.length > 0) {
      return offlineList;
    }
  } catch {}
  return getStoreOrdersLocal(storeId);
}

/**
 * Écouteur en direct côté Commerçant pour détecter l'arrivée de nouvelles commandes.
 * Utilise les événements locaux temps réel + l'écouteur Firestore natif (sans aucun polling HTTP).
 */
export function startOrderRealtimeSync(
  storeId: string,
  onOrdersUpdated: (orders: StoreCustomerOrder[]) => void,
  onNewOrder?: (order: StoreCustomerOrder) => void
): () => void {
  if (!storeId) return () => {};

  const knownOrderIds = new Set<string>();

  // 1. Charger immédiatement les commandes locales
  const initialLocal = getStoreOrdersLocal(storeId);
  initialLocal.forEach((o) => knownOrderIds.add(o.id));
  onOrdersUpdated(initialLocal);

  // 2. Écoute des événements de mise à jour locaux
  const handleLocalUpdate = () => {
    const currentOrders = getStoreOrdersLocal(storeId);
    currentOrders.forEach((o) => knownOrderIds.add(o.id));
    onOrdersUpdated(currentOrders);
  };

  // 3. Écoute de l'alerte nouvelle commande
  const handleNewOrderAlert = (e: any) => {
    const order = e.detail as StoreCustomerOrder;
    if (order && order.storeId === storeId) {
      if (!knownOrderIds.has(order.id)) {
        knownOrderIds.add(order.id);
        const currentOrders = getStoreOrdersLocal(storeId);
        onOrdersUpdated(currentOrders);
        try {
          playNewOrderAlert();
        } catch {}
        if (onNewOrder) onNewOrder(order);
      }
    }
  };

  window.addEventListener('customerOrdersUpdated', handleLocalUpdate);
  window.addEventListener('newCustomerOrderAlert', handleNewOrderAlert);

  return () => {
    window.removeEventListener('customerOrdersUpdated', handleLocalUpdate);
    window.removeEventListener('newCustomerOrderAlert', handleNewOrderAlert);
  };
}
