/**
 * Service WebSocket pour les Smart Transactions Wameet
 * Gère la communication bi-directionnelle en temps réel (Client React <-> Serveur WebSocket Render)
 * - Émission des actions transactionnelles (send_smart_transaction)
 * - Réception instantanée des validations de paiement (transaction_updated)
 * - Reconnexion automatique avec backoff exponentiel
 * - Basé sur l'API native WebSocket du navigateur (zéro dépendance externe)
 */

export interface SmartSocketEventPayload {
  chatId: string;
  transactionId?: string;
  messageId?: string;
  type?: string;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'locked' | 'released' | 'failed' | string;
  sender?: {
    id: string;
    name?: string;
    phone?: string;
  };
  payload?: Record<string, any>;
  [key: string]: any;
}

export type SmartSocketEventHandler = (data: SmartSocketEventPayload) => void;

class SmartTransactionSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<SmartSocketEventHandler>> = new Map();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private currentChatId: string | null = null;
  private currentUserId: string | null = null;
  private isExplicitlyClosed = false;
  private pingInterval: any = null;

  /**
   * Calcule l'URL WebSocket du serveur en tenant compte de l'environnement
   */
  private getWebSocketUrl(chatId: string, userId: string): string {
    const customWs = (import.meta as any).env?.VITE_WS_PAYMENT_URL;
    if (customWs) {
      return `${customWs}?chatId=${encodeURIComponent(chatId)}&userId=${encodeURIComponent(userId)}`;
    }

    const apiUrl =
      (import.meta as any).env?.VITE_API_URL ||
      (import.meta as any).env?.VITE_PAYMENT_API_URL ||
      'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run';
    const isHttps = apiUrl.startsWith('https://');
    const wsProto = isHttps ? 'wss://' : 'ws://';
    const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    return `${wsProto}${host}/ws/smart-transactions?chatId=${encodeURIComponent(chatId)}&userId=${encodeURIComponent(userId)}`;
  }

  /**
   * Établit la connexion WebSocket pour une discussion donnée
   */
  public connect(chatId: string, userId: string): void {
    if (!chatId) return;

    // Si déjà connecté sur le même chat et ouvert, ne rien faire
    if (
      this.ws &&
      this.currentChatId === chatId &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.disconnect();
    this.currentChatId = chatId;
    this.currentUserId = userId;
    this.isExplicitlyClosed = false;

    const url = this.getWebSocketUrl(chatId, userId);
    console.log(`[SMART SOCKET] Connexion vers ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[SMART SOCKET] Connecté avec succès au chat ${chatId}`);
        this.reconnectAttempts = 0;
        this.emitLocalEvent('connection_status', { chatId, status: 'connected' });

        // Envoie un message de bienvenue / join room
        this.emit('join_chat_room', { chatId, userId });

        // Démarre le heartbeat ping/pong pour maintenir la connexion active
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : '';
          if (!raw) return;

          // Ignorer les pongs
          if (raw === 'pong' || raw === '{"type":"pong"}') return;

          const parsed = JSON.parse(raw);
          const eventName = parsed.event || parsed.type || 'message';
          const data = parsed.data || parsed;

          // Notification des écouteurs
          this.emitLocalEvent(eventName, data);
        } catch (err) {
          console.warn('[SMART SOCKET] Erreur de parsing du message reçu :', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[SMART SOCKET NOTICE] Signal socket réseau :', err);
        this.emitLocalEvent('connection_status', { chatId, status: 'error' });
      };

      this.ws.onclose = (event) => {
        console.log(`[SMART SOCKET] Déconnecté (code: ${event.code})`);
        this.stopHeartbeat();
        this.emitLocalEvent('connection_status', { chatId, status: 'disconnected' });

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('[SMART SOCKET] Impossible d\'initialiser WebSocket :', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Planifie une reconnexion automatique avec backoff exponentiel
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isExplicitlyClosed) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    console.log(`[SMART SOCKET] Tentative de reconnexion dans ${Math.round(delay / 1000)}s...`);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentChatId && this.currentUserId && !this.isExplicitlyClosed) {
        this.connect(this.currentChatId, this.currentUserId);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
        } catch {}
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Émet un événement vers le serveur WebSocket
   */
  public emit(event: string, data: Record<string, any>): boolean {
    const payload = JSON.stringify({
      event,
      data,
      timestamp: Date.now()
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return true;
    } else {
      console.warn(`[SMART SOCKET NOTICE] Socket non prêt (état: ${this.ws?.readyState}). Message mis en attente.`);
      return false;
    }
  }

  /**
   * Enregistre un écouteur d'événement local
   */
  public on(event: string, handler: SmartSocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Fonction de désabonnement retournée
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Supprime un écouteur d'événement
   */
  public off(event: string, handler: SmartSocketEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Déclenche un événement localement pour tous les écouteurs inscrits
   */
  public emitLocalEvent(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[SMART SOCKET] Erreur dans le handler de '${event}' :`, err);
        }
      });
    }
  }

  /**
   * Retourne l'état de connexion actuel
   */
  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }

  /**
   * Ferme explicitement la connexion WebSocket
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Fermeture client normale');
      } catch {}
      this.ws = null;
    }
  }
}

// Instance singleton partagée pour l'application
export const smartSocketClient = new SmartTransactionSocketClient();
