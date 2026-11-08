import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initFlashLiveRoom,
  pushLiveProduct,
  closeFlashLiveRoom,
  subscribeToFlashLiveRoom,
  FlashLiveRoomData,
  InitFlashRoomParams
} from '../services/flashLiveRoomService';
import { LiveProductItem } from '../components/wameet/LiveProductCard';

export interface UseLiveShoppingRoomOptions {
  roomId: string;
  isSeller?: boolean;
  roomConfig?: Partial<InitFlashRoomParams>;
  initialProduct?: LiveProductItem | null;
  onProductPushed?: (product: LiveProductItem) => void;
  onRoomClosed?: (farewellMessage: string) => void;
  onRedirectHome?: () => void;
}

export interface UseLiveShoppingRoomReturn {
  room: FlashLiveRoomData | null;
  pushedProduct: LiveProductItem | null;
  isLiveActive: boolean;
  isClosed: boolean;
  remainingSeconds: number;
  timerLabel: string;
  farewellMessage: string | null;
  viewersCount: number;
  pushProduct: (product: LiveProductItem) => Promise<boolean>;
  dismissPushedProduct: () => void;
  closeRoom: (farewellMessage?: string) => Promise<boolean>;
}

/**
 * Formate des secondes en chaîne mm:ss
 */
function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return '00:00';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Hook React useLiveShoppingRoom (Wameet Flash Live Shopping)
 * - Initialise la session avec expiresAt
 * - Synchronise en temps réel le Push Produit (WebSocket / Firebase)
 * - Gère le décompte éphémère et la destruction / redirection en fin de session
 */
export function useLiveShoppingRoom({
  roomId,
  isSeller = false,
  roomConfig,
  initialProduct = null,
  onProductPushed,
  onRoomClosed,
  onRedirectHome
}: UseLiveShoppingRoomOptions): UseLiveShoppingRoomReturn {
  const [room, setRoom] = useState<FlashLiveRoomData | null>(null);
  const [pushedProduct, setPushedProduct] = useState<LiveProductItem | null>(initialProduct);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [farewellMessage, setFarewellMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(45 * 60);
  const [viewersCount, setViewersCount] = useState<number>(1);

  const prevPushedProductIdRef = useRef<string | null>(null);
  const isClosureHandledRef = useRef<boolean>(false);

  // 1. Initialisation automatique de la session côté Vendeur si nécessaire
  useEffect(() => {
    if (!roomId) return;

    if (isSeller) {
      initFlashLiveRoom({
        roomId,
        title: roomConfig?.title,
        sellerId: roomConfig?.sellerId,
        sellerName: roomConfig?.sellerName,
        sellerAvatar: roomConfig?.sellerAvatar,
        location: roomConfig?.location,
        durationMinutes: roomConfig?.durationMinutes || 45,
        youtubeUrl: roomConfig?.youtubeUrl,
        initialProduct
      }).then(createdRoom => {
        setRoom(createdRoom);
        if (createdRoom.pushedProduct) {
          setPushedProduct(createdRoom.pushedProduct);
        }
      }).catch(err => {
        console.warn('[USE LIVE SHOPPING ROOM] Erreur init :', err);
      });
    }
  }, [roomId, isSeller, roomConfig, initialProduct]);

  // 2. Abonnement en temps réel (Supabase Realtime) sur l'ID du Live
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToFlashLiveRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.viewersCount) {
        setViewersCount(updatedRoom.viewersCount);
      }

      // A. Détection du Push Produit déclenché par le vendeur
      if (updatedRoom.pushedProduct) {
        const prod = updatedRoom.pushedProduct;
        setPushedProduct(prod);

        // Déclenche le callback si c'est un nouveau produit poussé
        if (prod.id !== prevPushedProductIdRef.current) {
          prevPushedProductIdRef.current = prod.id;
          if (onProductPushed) {
            onProductPushed(prod);
          }
        }
      }

      // B. Détection de la fermeture du live par le vendeur ou par expiration
      if (
        (updatedRoom.status === 'closed' || updatedRoom.isExpired) &&
        !isClosureHandledRef.current
      ) {
        isClosureHandledRef.current = true;
        setIsClosed(true);

        const farewell =
          updatedRoom.farewellMessage ||
          "Merci à tous d'avoir participé à notre Vente Flash Live Shopping ! Le salon est maintenant clos.";

        setFarewellMessage(farewell);

        if (onRoomClosed) {
          onRoomClosed(farewell);
        }

        // Redirection propre vers l'accueil après affichage du message de remerciement (3.5s)
        setTimeout(() => {
          if (onRedirectHome) {
            onRedirectHome();
          } else if (typeof window !== 'undefined') {
            window.location.hash = '#/';
          }
        }, 3500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, onProductPushed, onRoomClosed, onRedirectHome]);

  // 3. Décompte dynamique de la date d'expiration (expiresAt)
  useEffect(() => {
    if (!room?.expiresAt && !room?.expiresAtMs) return;

    const targetTime = room.expiresAtMs || new Date(room.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((targetTime - now) / 1000));
      setRemainingSeconds(diffSec);

      // Si le timer atteint 0 et que le salon n'a pas encore été fermé
      if (diffSec <= 0 && !isClosureHandledRef.current) {
        isClosureHandledRef.current = true;
        setIsClosed(true);
        const farewell =
          room.farewellMessage ||
          "Le temps imparti pour cette Vente Flash est écoulé. Merci à tous nos acheteurs !";
        setFarewellMessage(farewell);
        if (onRoomClosed) onRoomClosed(farewell);

        setTimeout(() => {
          if (onRedirectHome) onRedirectHome();
          else if (typeof window !== 'undefined') window.location.hash = '#/';
        }, 3500);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room?.expiresAt, room?.expiresAtMs, room?.farewellMessage, onRoomClosed, onRedirectHome]);

  // 4. Action Vendeur : Déclenche l'événement WebSocket / Firebase push_product
  const pushProduct = useCallback(
    async (product: LiveProductItem): Promise<boolean> => {
      if (!roomId || !product) return false;
      // Mise à jour optimiste locale immédiate
      setPushedProduct(product);
      prevPushedProductIdRef.current = product.id;
      if (onProductPushed) onProductPushed(product);

      return await pushLiveProduct(roomId, product);
    },
    [roomId, onProductPushed]
  );

  // 5. Masquer temporairement le produit poussé
  const dismissPushedProduct = useCallback(() => {
    setPushedProduct(null);
  }, []);

  // 6. Action : Clôture définitive et destruction du salon éphémère
  const closeRoom = useCallback(
    async (customFarewell?: string): Promise<boolean> => {
      if (!roomId) return false;

      setIsClosed(true);
      const res = await closeFlashLiveRoom(roomId, customFarewell);
      setFarewellMessage(res.farewellMessage);

      if (onRoomClosed) onRoomClosed(res.farewellMessage);

      setTimeout(() => {
        if (onRedirectHome) onRedirectHome();
        else if (typeof window !== 'undefined') window.location.hash = '#/';
      }, 3500);

      return res.success;
    },
    [roomId, onRoomClosed, onRedirectHome]
  );

  const timerLabel = formatCountdown(remainingSeconds);
  const isLiveActive = !isClosed && remainingSeconds > 0;

  return {
    room,
    pushedProduct,
    isLiveActive,
    isClosed,
    remainingSeconds,
    timerLabel,
    farewellMessage,
    viewersCount,
    pushProduct,
    dismissPushedProduct,
    closeRoom
  };
}

export default useLiveShoppingRoom;
