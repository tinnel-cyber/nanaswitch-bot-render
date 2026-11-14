import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  orderBy,
  updateDoc 
} from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { 
  EscrowProject, 
  EscrowStatus, 
  EscrowPaymentDetails, 
  EscrowWithdrawalDetails,
  EscrowChatMessage,
  EscrowSenderRole
} from '../types';

const LOCAL_STORAGE_KEY_PREFIX = 'nana_escrow_projects_';

/**
 * Enregistre un Devis / Projet avec séquestre
 * Sauvegardé sous stores/{storeId}/quotes_projects/{projectId} et en miroir dans public_projects/{projectId}
 */
export async function saveEscrowProject(project: EscrowProject): Promise<void> {
  const updatedProject: EscrowProject = {
    ...project,
    updatedAt: Date.now(),
  };

  // 1. Sauvegarde locale (immédiate / hors-ligne)
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${project.storeId}`;
    const cached = localStorage.getItem(localKey);
    let list: EscrowProject[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      list[idx] = updatedProject;
    } else {
      list = [updatedProject, ...list];
    }
    localStorage.setItem(localKey, JSON.stringify(list));
    // Cache individuel pour consultation publique hors-ligne
    localStorage.setItem(`nana_public_project_${project.id}`, JSON.stringify(updatedProject));
  } catch (err) {
    console.warn('Erreur cache local Devis :', err);
  }

  // 2. Persistance Firestore
  try {
    const storeDocRef = doc(db, 'stores', project.storeId, 'quotes_projects', project.id);
    await setDoc(storeDocRef, updatedProject, { merge: true });

    // Miroir public pour accès client direct via /p/:projectId
    const publicDocRef = doc(db, 'public_projects', project.id);
    await setDoc(publicDocRef, updatedProject, { merge: true });
  } catch (err) {
    console.warn('Erreur storage saveEscrowProject :', err);
  }
}

/**
 * Récupère un projet par son ID (depuis la vue client ou prestataire)
 */
export async function getEscrowProject(
  projectId: string, 
  storeId?: string
): Promise<EscrowProject | null> {
  // 1. Tentative Firestore
  try {
    if (storeId) {
      const snap = await getDoc(doc(db, 'stores', storeId, 'quotes_projects', projectId));
      if (snap.exists()) {
        return snap.data() as EscrowProject;
      }
    }

    const publicSnap = await getDoc(doc(db, 'public_projects', projectId));
    if (publicSnap.exists()) {
      return publicSnap.data() as EscrowProject;
    }
  } catch (err) {
    console.warn('Erreur lecture storage getEscrowProject :', err);
  }

  // 2. Repli cache local
  try {
    const cached = localStorage.getItem(`nana_public_project_${projectId}`);
    if (cached) {
      return JSON.parse(cached) as EscrowProject;
    }
    if (storeId) {
      const listCached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${storeId}`);
      if (listCached) {
        const list: EscrowProject[] = JSON.parse(listCached);
        const found = list.find(p => p.id === projectId);
        if (found) return found;
      }
    }
  } catch {
    // Ignorer
  }

  return null;
}

/**
 * Écoute temps réel des projets de la boutique
 */
export function subscribeToStoreProjects(
  storeId: string,
  callback: (projects: EscrowProject[]) => void
): () => void {
  // Initialiser immédiatement avec le cache local
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${storeId}`);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch {
    // Ignorer
  }

  try {
    const fetchProjects = async () => {
      try {
        const colRef = collection(db, 'stores', storeId, 'quotes_projects');
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: EscrowProject[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as EscrowProject);
        });
        if (items.length > 0) {
          callback(items);
          try {
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${storeId}`, JSON.stringify(items));
          } catch {}
        }
      } catch (e) {
        console.warn('Erreur lecture quotes_projects :', e);
      }
    };

    fetchProjects();

    const channelName = `escrow_projects_${storeId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_projects',
          filter: `tenant_id=eq.${storeId}`,
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Échec abonnement Realtime quotes_projects :', err);
    return () => {};
  }
}

/**
 * Met à jour le statut d'un projet séquestre
 */
export async function updateEscrowStatus(
  projectId: string,
  storeId: string,
  status: EscrowStatus,
  extra: Partial<EscrowProject> = {}
): Promise<void> {
  const updates: Partial<EscrowProject> = {
    ...extra,
    status,
    updatedAt: Date.now(),
  };

  // Local update
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${storeId}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const list: EscrowProject[] = JSON.parse(cached);
      const updatedList = list.map(p => p.id === projectId ? { ...p, ...updates } : p);
      localStorage.setItem(localKey, JSON.stringify(updatedList));
    }
    const singleCached = localStorage.getItem(`nana_public_project_${projectId}`);
    if (singleCached) {
      const obj = JSON.parse(singleCached);
      localStorage.setItem(`nana_public_project_${projectId}`, JSON.stringify({ ...obj, ...updates }));
    }
  } catch {
    // Ignorer
  }

  try {
    const storeRef = doc(db, 'stores', storeId, 'quotes_projects', projectId);
    await updateDoc(storeRef, updates);
    const pubRef = doc(db, 'public_projects', projectId);
    await updateDoc(pubRef, updates);
  } catch (err) {
    console.warn('Erreur updateEscrowStatus :', err);
  }
}

/**
 * Validation du paiement client sous séquestre -> statut funds_locked
 */
export async function recordClientEscrowPayment(
  projectId: string,
  storeId: string,
  paymentDetails: EscrowPaymentDetails
): Promise<void> {
  return updateEscrowStatus(projectId, storeId, 'funds_locked', { paymentDetails });
}

/**
 * Validation de la livraison par le client -> statut completed_released
 */
export async function confirmProjectDelivery(
  projectId: string,
  storeId: string
): Promise<void> {
  return updateEscrowStatus(projectId, storeId, 'completed_released');
}

/**
 * Demande de retrait des fonds par le prestataire -> statut funds_withdrawn
 */
export async function requestEscrowWithdrawal(
  projectId: string,
  storeId: string,
  withdrawalDetails: EscrowWithdrawalDetails
): Promise<void> {
  return updateEscrowStatus(projectId, storeId, 'funds_withdrawn', { withdrawalDetails });
}

/**
 * Génère le lien public unique pour le client
 */
export function getPublicProjectUrl(projectId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nanasore.com';
  return `${origin}/p/${projectId}`;
}

/**
 * Génère le lien WhatsApp pré-rempli pour envoyer le devis au client
 */
export function getQuoteWhatsAppUrl(project: EscrowProject): string {
  const cleanPhone = (project.clientPhone || '').replace(/[^0-9]/g, '');
  const publicUrl = getPublicProjectUrl(project.id);
  const formattedTotal = `${project.totalAmount.toLocaleString('fr-FR')} F CFA`;
  
  const text = `Bonjour ${project.clientName},

Voici le devis sécurisé pour votre projet *"${project.projectTitle}"* émis par *${project.storeName || 'Nanasore'}*.

📋 *Détails des prestations :*
${project.milestones.map((m, i) => `${i + 1}. ${m.title} : ${m.amount.toLocaleString('fr-FR')} F CFA`).join('\n')}

💰 *Montant Total :* ${formattedTotal}
🛡️ *Garantie Tiers de Confiance (Escrow) :* Vos fonds sont consignés en toute sécurité et ne seront libérés au prestataire qu'après votre validation de conformité.

🔗 *Consulter le devis & Valider :*
${publicUrl}

Merci pour votre confiance !`;

  return cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Envoie un message dans le chat tripartite en direct (Client, Prestataire, Super Admin)
 */
export async function sendEscrowChatMessage(
  projectId: string,
  storeId: string,
  messageData: Omit<EscrowChatMessage, 'id' | 'timestamp'>
): Promise<void> {
  const msgId = `msg-${Date.now()}-${Math.floor(Math.random() * 899 + 100)}`;
  const message: EscrowChatMessage = {
    ...messageData,
    id: msgId,
    timestamp: Date.now(),
  };

  // 1. Cache local
  try {
    const localKey = `nana_escrow_chat_${projectId}`;
    const cached = localStorage.getItem(localKey);
    const list: EscrowChatMessage[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(localKey, JSON.stringify([...list, message]));
  } catch (err) {
    console.warn('Erreur cache local chat :', err);
  }

  // 2. Persistance Firestore dans public_projects/{projectId}/messages et stores/{storeId}/quotes_projects/{projectId}/messages
  try {
    const pubMsgRef = doc(db, 'public_projects', projectId, 'messages', msgId);
    await setDoc(pubMsgRef, message);

    if (storeId) {
      const storeMsgRef = doc(db, 'stores', storeId, 'quotes_projects', projectId, 'messages', msgId);
      await setDoc(storeMsgRef, message);
    }
  } catch (err) {
    console.warn('Erreur storage sendEscrowChatMessage :', err);
  }
}

/**
 * Écoute temps réel des messages du chat tripartite
 */
export function subscribeToEscrowMessages(
  projectId: string,
  callback: (messages: EscrowChatMessage[]) => void
): () => void {
  // Initialisation immédiate avec le cache local
  try {
    const localKey = `nana_escrow_chat_${projectId}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch {
    // Ignorer
  }

  try {
    const fetchChat = async () => {
      try {
        const colRef = collection(db, 'public_projects', projectId, 'messages');
        const q = query(colRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        const messages: EscrowChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          messages.push(docSnap.data() as EscrowChatMessage);
        });
        if (messages.length > 0) {
          callback(messages);
          try {
            localStorage.setItem(`nana_escrow_chat_${projectId}`, JSON.stringify(messages));
          } catch {}
        }
      } catch (e) {
        console.warn('Erreur lecture chat tripartite :', e);
      }
    };

    fetchChat();

    const channelName = `escrow_chat_${projectId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
          filter: `chat_id=eq.${projectId}`,
        },
        () => {
          fetchChat();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Échec abonnement chat tripartite :', err);
    return () => {};
  }
}

/**
 * Écoute temps réel de tous les projets sous séquestre pour le Super Admin
 */
export function subscribeAllProjectsForAdmin(
  callback: (projects: EscrowProject[]) => void
): () => void {
  try {
    const fetchAll = async () => {
      try {
        const colRef = collection(db, 'public_projects');
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: EscrowProject[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as EscrowProject);
        });
        callback(items);
      } catch (e) {
        console.warn('Erreur lecture admin all projects :', e);
      }
    };

    fetchAll();

    const channelName = `admin_escrow_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_projects',
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Échec abonnement admin all projects :', err);
    return () => {};
  }
}

/**
 * Interrompre / Geler un projet sous séquestre (Super Admin)
 */
export async function freezeEscrowProject(
  projectId: string,
  storeId: string,
  reason: string,
  adminUid: string
): Promise<void> {
  const disputeData = {
    disputeReason: reason,
    disputedAt: Date.now(),
    resolvedByAdminUid: adminUid,
  };

  await updateEscrowStatus(projectId, storeId, 'disputed_paused', disputeData);

  // Message système automatique dans le chat
  await sendEscrowChatMessage(projectId, storeId, {
    projectId,
    senderRole: 'SYSTEM',
    senderName: 'Médiation Super Admin',
    message: `⚠️ Ce projet a été temporairement suspendu par la médiation Super Admin pour arbitrage. Motif : ${reason}`,
  });
}

/**
 * Résolution finale du litige par le Super Admin
 */
export async function resolveEscrowDispute(
  projectId: string,
  storeId: string,
  resolution: 'RELEASED_TO_MERCHANT' | 'REFUNDED_TO_CLIENT',
  notes: string,
  adminUid: string
): Promise<void> {
  const nextStatus: EscrowStatus = resolution === 'RELEASED_TO_MERCHANT' ? 'completed_released' : 'refunded_client';
  const resolutionData = {
    resolutionAction: resolution,
    resolutionNotes: notes,
    resolvedAt: Date.now(),
    resolvedByAdminUid: adminUid,
  };

  await updateEscrowStatus(projectId, storeId, nextStatus, resolutionData);

  const resolutionMessage = resolution === 'RELEASED_TO_MERCHANT'
    ? `✅ Décision d'arbitrage Super Admin : La prestation a été validée conforme. Les fonds sont débloqués en faveur du prestataire.`
    : `↩️ Décision d'arbitrage Super Admin : Le remboursement intégral a été ordonné en faveur du client.`;

  await sendEscrowChatMessage(projectId, storeId, {
    projectId,
    senderRole: 'SYSTEM',
    senderName: 'Médiation Super Admin',
    message: `${resolutionMessage}${notes ? ` Notes d'arbitrage : ${notes}` : ''}`,
  });
}

/**
 * Abonnement en temps réel à un projet public (pour la vue client)
 */
export function subscribeToPublicProject(
  projectId: string,
  callback: (project: EscrowProject | null) => void
): () => void {
  try {
    const cached = localStorage.getItem(`nana_public_project_${projectId}`);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch {
    // ignore
  }

  try {
    const fetchDoc = async () => {
      try {
        const docRef = doc(db, 'public_projects', projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as EscrowProject;
          callback(data);
          try {
            localStorage.setItem(`nana_public_project_${projectId}`, JSON.stringify(data));
          } catch {}
        } else {
          callback(null);
        }
      } catch (e) {
        console.warn('Erreur lecture public_projects :', e);
      }
    };

    fetchDoc();

    const channelName = `pub_escrow_${projectId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_projects',
          filter: `id=eq.${projectId}`,
        },
        () => {
          fetchDoc();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Échec abonnement public_projects :', err);
    return () => {};
  }
}
