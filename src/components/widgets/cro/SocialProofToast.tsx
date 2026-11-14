import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  X,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ============================================================================
// TYPES DE LA PREUVE SOCIALE CONNECTÉE
// ============================================================================

export interface SocialProofNotification {
  id: string;
  customerName: string;
  city: string;
  productName: string;
  paymentMethod: string;
  timeAgo: string;
  avatarUrl?: string;
  isRealOrder?: boolean;
}

export interface SocialProofToastProps {
  funnelId?: string; // Slug ou ID du tunnel
  storeId?: string;  // ID de la boutique marchand
  productNameFallback?: string;
  initialDelayMs?: number;    // Délai avant 1ère apparition (défaut: 3500ms)
  displayDurationMs?: number; // Temps visible à l'écran (défaut: 5500ms)
  minIntervalMs?: number;     // Intervalle minimum entre 2 toasts (défaut: 7000ms)
  maxIntervalMs?: number;     // Intervalle maximum entre 2 toasts (défaut: 12000ms)
  forceShowForTesting?: boolean; // Permet de forcer l'affichage immédiat en test
  className?: string;
}

// ============================================================================
// POOL RÉGIONAL DE REPLI (FALLBACK CRÉDIBLE AFRIQUE DE L'OUEST & CENTRALE)
// ============================================================================

const REGIONAL_FALLBACK_ORDERS: SocialProofNotification[] = [
  {
    id: 'fomo-1',
    customerName: 'Moussa D.',
    city: 'Ouagadougou',
    productName: 'cet article exclusif',
    paymentMethod: 'Wave Money',
    timeAgo: 'il y a 4 min',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    isRealOrder: false
  },
  {
    id: 'fomo-2',
    customerName: 'Aïcha K.',
    city: 'Abidjan',
    productName: 'cet article exclusif',
    paymentMethod: 'Paiement à la livraison',
    timeAgo: 'il y a 9 min',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
    isRealOrder: false
  },
  {
    id: 'fomo-3',
    customerName: 'Cheikh N.',
    city: 'Dakar',
    productName: 'cet article exclusif',
    paymentMethod: 'Orange Money',
    timeAgo: 'il y a 14 min',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80',
    isRealOrder: false
  }
];

// ============================================================================
// FONCTIONS UTILITAIRES D'ANONYMISATION & DE FORMATAGE
// ============================================================================

/**
 * Anonymise le nom du client (ex: "Ibrahim Traoré" -> "Ibrahim T.", ou "Un client vérifié")
 */
function anonymizeCustomerName(fullName?: string): string {
  if (!fullName || typeof fullName !== 'string') return 'Un client vérifié';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    return first.length > 3 ? `${first.charAt(0).toUpperCase() + first.slice(1, 3)}***` : first;
  }
  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Calcule un libellé de temps relatif dynamique (ex: "il y a 3 min")
 */
function computeTimeAgo(timestamp?: any): string {
  if (!timestamp) return 'il y a quelques minutes';

  let dateMs: number = 0;
  if (typeof timestamp === 'number') {
    dateMs = timestamp;
  } else if (timestamp?.toMillis) {
    dateMs = timestamp.toMillis();
  } else if (timestamp?.seconds) {
    dateMs = timestamp.seconds * 1000;
  } else if (typeof timestamp === 'string') {
    dateMs = new Date(timestamp).getTime();
  }

  if (!dateMs || isNaN(dateMs)) return 'il y a 5 min';

  const elapsedSec = Math.floor((Date.now() - dateMs) / 1000);
  if (elapsedSec < 60) return 'à l\'instant';
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return `il y a ${elapsedMin} min`;
  const elapsedHours = Math.floor(elapsedMin / 60);
  if (elapsedHours < 24) return `il y a ${elapsedHours} h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `il y a ${elapsedDays} j`;
}

// ============================================================================
// COMPOSANT PRINCIPAL : SocialProofToast (Connecté Firestore)
// ============================================================================

export const SocialProofToast: React.FC<SocialProofToastProps> = ({
  funnelId,
  storeId,
  productNameFallback = 'cet article',
  initialDelayMs = 3500,
  displayDurationMs = 5500,
  minIntervalMs = 7000,
  maxIntervalMs = 12000,
  forceShowForTesting = false,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<SocialProofNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // 1. CHARGEMENT SÉCURISÉ DES 3 DERNIÈRES COMMANDES DEPUIS SUPABASE SQL
  // --------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    async function fetchRecentOrders() {
      const realOrders: SocialProofNotification[] = [];

      try {
        const { data } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (data && data.length > 0) {
          data.forEach((row: any) => {
            const custName = 'Client vérifié';
            const city = 'Ouagadougou';
            const prodName = productNameFallback;
            const pay = row.payment_method || 'Mobile Money';
            const time = computeTimeAgo(row.created_at || Date.now());

            realOrders.push({
              id: row.id,
              customerName: custName,
              city,
              productName: prodName,
              paymentMethod: pay,
              timeAgo: time,
              isRealOrder: true
            });
          });
        }
      } catch (globalErr) {
        // En cas d'erreur réseau, bascule silencieuse vers les commandes d'exemple
      }

      if (isCancelled || !isMountedRef.current) return;

      // Si des commandes réelles existent, on les utilise en priorité !
      if (realOrders.length > 0) {
        setNotifications(realOrders);
      } else {
        // Sinon, utilisation du pool de repli avec personnalisation du produit actif
        const customizedFallback = REGIONAL_FALLBACK_ORDERS.map(item => ({
          ...item,
          productName: productNameFallback || item.productName
        }));
        setNotifications(customizedFallback);
      }
    }

    fetchRecentOrders();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, [funnelId, storeId, productNameFallback]);

  // --------------------------------------------------------------------------
  // 2. CYCLE ASYNCHRONE D'AFFICHAGE FAÇON TRUSTPULSE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isDismissed || notifications.length === 0) return;

    let timeoutId: NodeJS.Timeout;

    // Fonction récursive de boucle asynchrone
    const scheduleNextToast = (delayMs: number) => {
      timeoutId = setTimeout(() => {
        if (!isMountedRef.current || isDismissed) return;

        // 1. Afficher le toast actuel
        setIsVisible(true);

        // 2. Le masquer après displayDurationMs
        timeoutId = setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsVisible(false);

          // 3. Passer à la commande suivante
          setCurrentIndex(prev => (prev + 1) % notifications.length);

          // 4. Attendre un délai aléatoire réaliste entre minIntervalMs et maxIntervalMs
          const randomInterval = Math.floor(
            minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs)
          );
          scheduleNextToast(randomInterval);
        }, displayDurationMs);

      }, delayMs);
    };

    // Premier démarrage après initialDelayMs (ou 0 si forceShowForTesting)
    scheduleNextToast(forceShowForTesting ? 100 : initialDelayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isDismissed, notifications, initialDelayMs, displayDurationMs, minIntervalMs, maxIntervalMs, forceShowForTesting]);

  // Permet de tester ou déclencher via console de navigateur : window.__triggerSocialProofToast()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__triggerSocialProofToast = () => {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), displayDurationMs);
      };
    }
  }, [displayDurationMs]);

  if (notifications.length === 0 || isDismissed) return null;

  const currentNotification = notifications[currentIndex] || notifications[0];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`fixed bottom-4 left-4 z-50 max-w-[340px] sm:max-w-[360px] bg-[#030712]/95 backdrop-blur-xl border border-emerald-500/35 p-3 sm:p-3.5 rounded-2xl shadow-2xl shadow-emerald-950/50 text-slate-100 flex items-center gap-3 select-none transform-gpu ${className}`}
        >
          {/* Avatar ou Icône de Panier TrustPulse */}
          <div className="relative shrink-0">
            {currentNotification.avatarUrl ? (
              <img
                src={currentNotification.avatarUrl}
                alt={currentNotification.customerName}
                className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>
            )}

            {/* Pastille Live Active (Radar Pulse Vert) */}
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#030712]" />
            </span>
          </div>

          {/* Contenu Textuel Informatif */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-white truncate">
              <span>{currentNotification.customerName}</span>
              <span className="text-slate-400 font-semibold text-[11px] truncate flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-emerald-400 inline shrink-0" />
                <span>{currentNotification.city}</span>
              </span>
              <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 ml-auto" />
            </div>

            <p className="text-[11px] text-slate-300 truncate mt-0.5 leading-snug">
              A commandé <strong className="text-emerald-300 font-bold">{currentNotification.productName}</strong>
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 rounded font-semibold border border-emerald-500/20">
                {currentNotification.paymentMethod}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-slate-400 font-mono">
                <Clock className="w-2.5 h-2.5" />
                <span>{currentNotification.timeAgo}</span>
              </span>
              {currentNotification.isRealOrder && (
                <span className="ml-auto text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">
                  En direct
                </span>
              )}
            </div>
          </div>

          {/* Bouton de Fermeture / Dismiss */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setIsDismissed(true);
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer shrink-0 -mr-1"
            title="Masquer cette notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofToast;
