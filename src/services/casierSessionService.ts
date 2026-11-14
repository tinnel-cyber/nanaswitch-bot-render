import { supabase } from '../lib/supabase';
export type Unsubscribe = () => void;
import { CasierSession, SellerUser, CompletedSale } from '../types';

/**
 * Générateur strict d'identifiants uniques pour les sessions de caisse (Casiers)
 * Format : `${storeId}_casier_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
 */
export function generateCasierSessionId(storeId: string): string {
  const cleanStoreId = storeId || 'store-default';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `${cleanStoreId}_casier_${timestamp}_${randomSuffix}`;
}

/**
 * Détecte le nom ou type d'appareil de manière descriptive
 */
export function getDeviceDisplayName(): string {
  if (typeof window === 'undefined' || !window.navigator) return 'Poste Principal';
  const ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'Terminal Mobile iOS';
  if (/Android/.test(ua)) return 'Terminal Tactile Android';
  if (/Windows/.test(ua)) return 'Caisse PC Windows';
  if (/Mac/.test(ua)) return 'Station macOS';
  return 'Terminal Caisse';
}

/**
 * Récupère ou instancie une session de caisse (Casier) isolée pour cet onglet / appareil.
 * Utilise `sessionStorage` en priorité pour garantir la concurrence entre onglets multiples
 * du même gérant sans risque d'écrasement ou d'expulsion réciproque.
 */
export function getOrCreateTabCasierSession(
  storeId: string, 
  activeCashier?: SellerUser | null
): CasierSession {
  const cleanStoreId = storeId || 'store-default';
  const tabStorageKey = `nana_casier_session_${cleanStoreId}`;

  // 1. Vérifier si l'onglet courant possède déjà une session active
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const savedRaw = sessionStorage.getItem(tabStorageKey);
      if (savedRaw) {
        const parsed: CasierSession = JSON.parse(savedRaw);
        if (parsed && parsed.status === 'ouvert' && parsed.sessionId) {
          // Mise à jour de la signature si le vendeur a changé
          if (activeCashier && activeCashier.signatureCode !== parsed.activeCashierSignature) {
            parsed.activeCashierSignature = activeCashier.signatureCode;
            parsed.sellerId = activeCashier.id;
            parsed.sellerName = activeCashier.name;
            parsed.sellerRole = activeCashier.role;
            sessionStorage.setItem(tabStorageKey, JSON.stringify(parsed));
            // Sync async Firestore
            syncCasierSessionToFirestore(parsed).catch(console.warn);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erreur lecture session casier sessionStorage:', e);
    }
  }

  // 2. Détermination du numéro de caisse (Caisse #1, #2, etc.)
  let casierNumber = 'Caisse #1';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existingCount = parseInt(localStorage.getItem(`nana_${cleanStoreId}_casier_counter`) || '0', 10);
      const nextIndex = (existingCount % 8) + 1;
      localStorage.setItem(`nana_${cleanStoreId}_casier_counter`, nextIndex.toString());
      casierNumber = `Caisse #${nextIndex}`;
    } catch {
      casierNumber = `Caisse #${Math.floor(Math.random() * 5) + 1}`;
    }
  }

  // 3. Création de la nouvelle session avec signature unique
  const newSessionId = generateCasierSessionId(cleanStoreId);
  const now = Date.now();
  const newSession: CasierSession = {
    sessionId: newSessionId,
    storeId: cleanStoreId,
    casierNumber,
    deviceName: getDeviceDisplayName(),
    openedAt: now,
    activeCashierSignature: activeCashier?.signatureCode || 'GERANT-01',
    sellerId: activeCashier?.id || 'usr-gerant',
    sellerName: activeCashier?.name || 'Gérant Principal',
    sellerRole: activeCashier?.role || 'GERANT',
    status: 'ouvert',
    openingBalance: 0,
    currentBalance: 0,
    totalCollected: 0,
    transactionsCount: 0,
    lastActiveAt: now,
  };

  // 4. Persistance isolée
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(tabStorageKey, JSON.stringify(newSession));
      localStorage.setItem(`nana_casier_last_${newSessionId}`, JSON.stringify(newSession));
    } catch (e) {
      console.warn('Erreur écriture sessionStorage casier:', e);
    }
  }

  // 5. Enregistrement Firestore sous stores/{storeId}/casierSessions/{sessionId}
  syncCasierSessionToFirestore(newSession).catch((err) => {
    console.warn('Sauvegarde session casier Firestore reportée (mode offline) :', err);
  });

  return newSession;
}

/**
 * Synchronise ou met à jour une session de caisse dans Firestore :
 * `stores/{storeId}/casierSessions/{sessionId}`
 */
export async function syncCasierSessionToFirestore(session: CasierSession): Promise<void> {
  if (!session.storeId || !session.sessionId) return;
  try {
    await supabase.from('app_registry').upsert({
      key: `casier_${session.sessionId}`,
      tenant_id: session.storeId,
      module_key: 'casier_sessions',
      config_json: {
        ...session,
        lastActiveAt: Date.now()
      }
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('Impossible de synchroniser le casier avec Supabase (mode offline):', err);
  }
}

/**
 * Comptabilise une vente terminée dans la session de caisse correspondante
 */
export async function recordSaleInCasierSession(
  storeId: string,
  sessionId: string,
  sale: CompletedSale
): Promise<void> {
  if (!storeId || !sessionId) return;

  const tabStorageKey = `nana_casier_session_${storeId}`;
  
  // 1. Mise à jour mémoire / locale de la session
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(tabStorageKey);
      if (raw) {
        const sess: CasierSession = JSON.parse(raw);
        if (sess.sessionId === sessionId) {
          sess.transactionsCount = (sess.transactionsCount || 0) + 1;
          sess.totalCollected = (sess.totalCollected || 0) + (sale.total || 0);
          sess.currentBalance = (sess.openingBalance || 0) + sess.totalCollected;
          sess.lastActiveAt = Date.now();
          sessionStorage.setItem(tabStorageKey, JSON.stringify(sess));
        }
      }
    } catch (e) {
      console.warn('Erreur mise à jour locale de la session casier:', e);
    }
  }

  // 2. Mise à jour Supabase du casier
  try {
    const { data: rows } = await supabase
      .from('app_registry')
      .select('config_json')
      .eq('key', `casier_${sessionId}`)
      .single();

    if (rows && rows.config_json) {
      const data = rows.config_json as any;
      const newTransactionsCount = (data.transactionsCount || 0) + 1;
      const newTotalCollected = (data.totalCollected || 0) + (sale.total || 0);
      const newBalance = (data.openingBalance || 0) + newTotalCollected;

      await supabase.from('app_registry').upsert({
        key: `casier_${sessionId}`,
        tenant_id: storeId,
        module_key: 'casier_sessions',
        config_json: {
          ...data,
          transactionsCount: newTransactionsCount,
          totalCollected: newTotalCollected,
          currentBalance: newBalance,
          lastActiveAt: Date.now()
        }
      }, { onConflict: 'key' });
    }
  } catch (err) {
    console.warn('Erreur enregistrement de la vente dans le casier Supabase:', err);
  }
}

/**
 * Fermeture propre d'une session de caisse
 */
export async function closeCasierSession(
  storeId: string, 
  sessionId: string,
  closingBalance?: number
): Promise<void> {
  const tabStorageKey = `nana_casier_session_${storeId}`;
  const now = Date.now();

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(tabStorageKey);
      if (raw) {
        const sess: CasierSession = JSON.parse(raw);
        if (sess.sessionId === sessionId) {
          sess.status = 'ferme';
          sess.closedAt = now;
          if (closingBalance !== undefined) sess.currentBalance = closingBalance;
          sessionStorage.setItem(tabStorageKey, JSON.stringify(sess));
        }
      }
    } catch (e) {
      console.warn('Erreur fermeture locale casier:', e);
    }
  }

  try {
    const { data: rows } = await supabase
      .from('app_registry')
      .select('config_json')
      .eq('key', `casier_${sessionId}`)
      .single();

    const data = (rows?.config_json || {}) as any;
    await supabase.from('app_registry').upsert({
      key: `casier_${sessionId}`,
      tenant_id: storeId,
      module_key: 'casier_sessions',
      config_json: {
        ...data,
        status: 'ferme',
        closedAt: now,
        ...(closingBalance !== undefined ? { currentBalance: closingBalance } : {}),
        lastActiveAt: now
      }
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('Erreur fermeture casier dans Supabase:', err);
  }
}

/**
 * Écoute temps réel de tous les casiers actifs de la boutique (pour le tableau de bord gérant)
 */
export function subscribeToStoreCasierSessions(
  storeId: string,
  onUpdate: (sessions: CasierSession[]) => void
): Unsubscribe {
  if (!storeId) {
    onUpdate([]);
    return () => {};
  }

  const fetchSessions = async () => {
    try {
      const { data: rows } = await supabase
        .from('app_registry')
        .select('config_json')
        .eq('tenant_id', storeId)
        .eq('module_key', 'casier_sessions');

      const sessions: CasierSession[] = [];
      if (rows) {
        rows.forEach(r => {
          if (r.config_json && (r.config_json as any).status === 'ouvert') {
            sessions.push(r.config_json as CasierSession);
          }
        });
      }
      sessions.sort((a, b) => b.openedAt - a.openedAt);
      onUpdate(sessions);
    } catch (err) {
      console.warn('Erreur lecture casiers actifs Supabase:', err);
    }
  };

  fetchSessions();

  const channelName = `casier_${storeId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_registry',
        filter: `tenant_id=eq.${storeId}`,
      },
      () => {
        fetchSessions();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
