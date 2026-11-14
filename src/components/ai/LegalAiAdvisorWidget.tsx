import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Scale, Sparkles, X, Minus, Plus, Maximize2, Minimize2, 
  Trash2, Send, ExternalLink, ShieldAlert, Key, 
  RotateCcw, Check, Copy, AlertTriangle, Clock, WifiOff
} from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { 
  LegalChatMessage, 
  getStoredLegalChat, 
  saveStoredLegalChat, 
  clearLegalChat, 
  askLegalAdvisor,
  getResolvedGeminiApiKey,
  GEMINI_API_KEY_STORAGE_KEY
} from '../../services/legalAiService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

export interface LegalAiAdvisorWidgetProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  documentContext?: string;
  defaultPosition?: { x: number; y: number };
  apiKey?: string;
}

const FONT_SIZES = [11.5, 13, 14.5, 16, 18]; // Niveaux de typographie zoomables en px
const DEFAULT_COOLDOWN_SECONDS = 4; // Décompte de temporisation Free Tier (3-5 secondes)

export const LegalAiAdvisorWidget: React.FC<LegalAiAdvisorWidgetProps> = ({
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
  documentContext = '',
  defaultPosition,
  apiKey: propApiKey,
}) => {
  // Gestion de l'état ouvert/fermé (contrôlé ou non)
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const { isOnline } = useNetworkStatus();

  const handleToggle = () => {
    playTapBeep();
    if (onToggle) onToggle();
    else setInternalIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    playTapBeep();
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  // État minimisé en barre flottante
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Niveau de zoom typographique (indice dans FONT_SIZES)
  const [fontIndex, setFontIndex] = useState<number>(1); // 13px par défaut
  const currentFontSize = FONT_SIZES[fontIndex];

  // Gestion des quotas Free Tier & Cooldown anti-spam (3 à 5 secondes)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  // Configuration de la clé API
  const [isApiKeyDrawerOpen, setIsApiKeyDrawerOpen] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return propApiKey || getResolvedGeminiApiKey();
  });

  // Position du widget (Draggable / Docké au coin inférieur de l'écran)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    const initialX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 115) : 500;
    const initialY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 48) : 600;
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Gestion du repositionnement tactile / drag du bouton flottant compact
  const isButtonDraggingRef = useRef<boolean>(false);
  const buttonDragDistanceRef = useRef<number>(0);
  const buttonDragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Repositionnement automatique lors du redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 100) : 500;
        const maxY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 44) : 600;
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Historique des messages (0 Firestore, localStorage pur avec purge 24h)
  const [messages, setMessages] = useState<LegalChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Minuteur de cooldown décrémental chaque seconde
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // 2. Initialisation & Purge automatique des messages de plus de 24h
  useEffect(() => {
    const validHistory = getStoredLegalChat();
    if (validHistory.length === 0) {
      const welcomeMsg: LegalChatMessage = {
        id: 'welcome-0',
        role: 'assistant',
        text: `**Bonjour ! Je suis votre Expert Juriste d'Affaires & Financier.**\n\nSpécialiste du **droit OHADA** (17 États), des règles bancaires **UEMOA / CEMAC** et du **Commerce International (Incoterms 2020)**.\n\nJe vous assiste pour :\n• 📄 **Relire et auditer un contrat** ou une clause à signer\n• 🏢 **Baux commerciaux** : renouvellement, congés et indemnité d'éviction (AUDCG)\n• 🛡️ **Sécuriser vos créances** : cautionnements solidaires, garanties autonomes et réserve de propriété\n• 🚢 **Incoterms 2020** : répartition des risques, coûts de fret et douane (FOB, CIF, DAP)\n\n*Vos échanges sont confidentiels et purgés automatiquement après 24 heures.*`,
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
      saveStoredLegalChat([welcomeMsg]);
    } else {
      setMessages(validHistory);
    }
  }, []);

  // Défilement automatique au dernier message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Synchronisation inter-onglets/fenêtre détachée via événement storage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nana_legal_ai_chat_history') {
        const updated = getStoredLegalChat();
        if (updated.length > 0) setMessages(updated);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Gestion du drag & drop
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const width = 420;
    const height = isMinimized ? 56 : 580;
    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(10, window.innerHeight - height - 10);

    const newX = Math.min(maxX, Math.max(10, dragStartRef.current.posX + deltaX));
    const newY = Math.min(maxY, Math.max(10, dragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, isMinimized]);

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Repositionnement tactile / glisser-déplacer du bouton compact flottant
  const handleButtonPointerDown = (e: React.PointerEvent) => {
    isButtonDraggingRef.current = true;
    buttonDragDistanceRef.current = 0;
    buttonDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleButtonPointerMove = (e: React.PointerEvent) => {
    if (!isButtonDraggingRef.current) return;
    const deltaX = e.clientX - buttonDragStartRef.current.startX;
    const deltaY = e.clientY - buttonDragStartRef.current.startY;
    buttonDragDistanceRef.current = Math.hypot(deltaX, deltaY);

    const maxX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 100) : 500;
    const maxY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 44) : 600;

    const newX = Math.min(maxX, Math.max(8, buttonDragStartRef.current.posX + deltaX));
    const newY = Math.min(maxY, Math.max(8, buttonDragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleButtonPointerUp = (e: React.PointerEvent) => {
    if (!isButtonDraggingRef.current) return;
    isButtonDraggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Si le déplacement est inférieur à 5px, il s'agit d'un tap / clic
    if (buttonDragDistanceRef.current < 5) {
      handleToggle();
    }
  };

  // Envoi d'un message avec protection Cooldown & gestion HTTP 429
  const handleSendMessage = async (textToSend?: string) => {
    if (!isOnline) {
      const offlineMsg: LegalChatMessage = {
        id: `offline-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Connexion requise** : Le conseiller juridique IA nécessite un accès internet actif pour analyser vos contrats et requêtes en temps réel.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, offlineMsg]);
      return;
    }

    const query = (textToSend || inputText).trim();
    if (!query || isLoading || cooldownSeconds > 0) return;

    playTapBeep();
    setInputText('');
    setRateLimitNotice(null);

    const userMsg: LegalChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    saveStoredLegalChat(newHistory);
    setIsLoading(true);

    try {
      const response = await askLegalAdvisor({
        message: query,
        history: newHistory,
        documentContext,
        apiKey: customApiKey,
      });

      // Si limitation 429 détectée : appliquer un cooldown plus long et afficher l'alerte
      if (response.isRateLimited) {
        setCooldownSeconds(15);
        setRateLimitNotice('Quota Free Tier atteint (15 req/min). Temporisation de 15 secondes activée.');
      } else {
        // Cooldown standard anti-flood de 4 secondes
        setCooldownSeconds(DEFAULT_COOLDOWN_SECONDS);
      }

      const assistantMsg: LegalChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
        timestamp: Date.now(),
      };

      const finalHistory = [...newHistory, assistantMsg];
      setMessages(finalHistory);
      saveStoredLegalChat(finalHistory);
      playValidationBeep();
    } catch (err: any) {
      console.error('Erreur Legal AI :', err);
      // Cooldown de sécurité en cas d'anomalie
      setCooldownSeconds(DEFAULT_COOLDOWN_SECONDS);

      const is429 = err?.message?.includes('429') || err?.status === 429;
      const errMsg: LegalChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: is429
          ? `⚠️ **Limite de requêtes atteinte (Tier Gratuit : 15 requêtes/minute)**\n\nVeuillez patienter quelques instants avant de poser votre prochaine question.`
          : `⚠️ Une anomalie temporaire est survenue lors de la consultation. Veuillez reformuler votre question ou vous référer aux modèles contractuels prédéfinis.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialisation & Purge manuelle immédiate
  const handleClearHistory = () => {
    if (window.confirm('Voulez-vous effacer tout l’historique de conversation ? (Les données de plus de 24h sont déjà purgées automatiquement).')) {
      playTapBeep();
      clearLegalChat();
      const freshWelcome: LegalChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Session réinitialisée. Comment puis-je vous assister sur vos contrats ou opérations commerciales OHADA aujourd'hui ?`,
        timestamp: Date.now(),
      };
      setMessages([freshWelcome]);
      saveStoredLegalChat([freshWelcome]);
    }
  };

  // Copier le texte d'une clause
  const handleCopyText = (text: string, id: string) => {
    playTapBeep();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Enregistrer la clé API personnalisée
  const handleSaveApiKey = () => {
    try {
      if (customApiKey.trim()) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, customApiKey.trim());
      } else {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      }
      playValidationBeep();
      setIsApiKeyDrawerOpen(false);
    } catch {
      // Ignorer
    }
  };

  // Mode "Détacher la fenêtre" (window.open popup)
  const handleDetachWindow = () => {
    playTapBeep();
    handleClose();

    const popup = window.open(
      '',
      'NanaOHADALegalAdvisor',
      'width=480,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      alert('Veuillez autoriser les fenêtres pop-up pour détacher l’assistant juridique.');
      return;
    }

    const popupHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>⚖️ Expert Juridique & Financier OHADA - Nanasore</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #0b0f19; color: #f1f5f9; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
          header { background: #111827; border-bottom: 1px solid #1f2937; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
          h1 { font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px; color: #fbbf24; }
          .badge { font-size: 10px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 6px; border-radius: 6px; }
          .privacy-notice { font-size: 10px; color: #64748b; padding: 6px 16px; background: #0f172a; border-bottom: 1px solid #1e293b; text-align: center; }
          #chat-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
          .msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; word-break: break-word; }
          .msg-user { align-self: flex-end; background: #2563eb; color: #ffffff; border-bottom-right-radius: 2px; }
          .msg-assistant { align-self: flex-start; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-bottom-left-radius: 2px; }
          .msg-assistant blockquote { border-left: 3px solid #f59e0b; padding-left: 8px; margin: 8px 0; color: #cbd5e1; font-style: italic; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px; }
          .msg-assistant h3 { font-size: 13.5px; margin-bottom: 6px; color: #fbbf24; }
          footer { padding: 12px; background: #111827; border-top: 1px solid #1f2937; display: flex; flex-direction: column; gap: 6px; }
          .input-row { display: flex; gap: 8px; }
          input { flex: 1; background: #1f2937; border: 1px solid #374151; color: #fff; padding: 10px 14px; border-radius: 12px; font-size: 13px; outline: none; }
          input:focus { border-color: #fbbf24; }
          button.btn-send { background: #d97706; color: #fff; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
          button.btn-send:hover { background: #b45309; }
          button.btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
          .cooldown-text { font-size: 10.5px; color: #f59e0b; text-align: center; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>⚖️ IA Juriste OHADA</h1>
            <div style="font-size: 11px; color: #94a3b8;">Droit des affaires, UEMOA/CEMAC & Incoterms</div>
          </div>
          <button id="clear-btn" style="background:transparent;border:1px solid #475569;color:#94a3b8;padding:4px 8px;border-radius:6px;font-size:10.5px;cursor:pointer;">Effacer</button>
        </header>
        <div class="privacy-notice">🔒 Données confidentielles • Purge automatique après 24 heures • Free Tier 15 req/min</div>
        <div id="chat-container"></div>
        <footer>
          <div id="cooldown-badge" class="cooldown-text" style="display:none;">⏳ Veuillez patienter quelques secondes...</div>
          <div class="input-row">
            <input type="text" id="msg-input" placeholder="Posez une question juridique ou soumettez une clause..." autofocus />
            <button class="btn-send" id="send-btn">Envoyer</button>
          </div>
        </footer>

        <script>
          const STORAGE_KEY = 'nana_legal_ai_chat_history';
          const chatContainer = document.getElementById('chat-container');
          const msgInput = document.getElementById('msg-input');
          const sendBtn = document.getElementById('send-btn');
          const clearBtn = document.getElementById('clear-btn');
          const cdBadge = document.getElementById('cooldown-badge');
          let cdTimer = 0;

          function getMessages() {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (!raw) return [];
              const data = JSON.parse(raw);
              const now = Date.now();
              return (data.messages || []).filter(m => (now - m.timestamp) < 86400000);
            } catch(e) { return []; }
          }

          function saveMessages(msgs) {
            try {
              const now = Date.now();
              const valid = msgs.filter(m => (now - m.timestamp) < 86400000);
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, lastUpdated: now, messages: valid }));
            } catch(e) {}
          }

          function escapeHtml(str) {
            return String(str || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          }

          function formatText(txt) {
            if (!txt) return '';
            const safe = escapeHtml(txt);
            return safe
              .replace(/### (.*?)\\n/g, '<h3>$1</h3>')
              .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
              .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
              .replace(/&gt; "(.*?)"/g, '<blockquote>"$1"</blockquote>')
              .replace(/\\n/g, '<br/>');
          }

          function render() {
            const msgs = getMessages();
            chatContainer.innerHTML = '';
            msgs.forEach(m => {
              const div = document.createElement('div');
              div.className = 'msg msg-' + m.role;
              div.innerHTML = formatText(m.text);
              chatContainer.appendChild(div);
            });
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }

          function startCooldown(sec) {
            cdTimer = sec;
            sendBtn.disabled = true;
            cdBadge.style.display = 'block';
            cdBadge.innerText = '⏳ Veuillez patienter (' + cdTimer + 's)...';
            const itv = setInterval(() => {
              cdTimer--;
              if (cdTimer <= 0) {
                clearInterval(itv);
                sendBtn.disabled = false;
                cdBadge.style.display = 'none';
              } else {
                cdBadge.innerText = '⏳ Veuillez patienter (' + cdTimer + 's)...';
              }
            }, 1000);
          }

          async function send() {
            const text = msgInput.value.trim();
            if (!text || cdTimer > 0) return;
            msgInput.value = '';

            const msgs = getMessages();
            const userMsg = { id: 'u-' + Date.now(), role: 'user', text, timestamp: Date.now() };
            msgs.push(userMsg);
            saveMessages(msgs);
            render();

            sendBtn.disabled = true;
            sendBtn.innerText = '...';

            try {
              const res = await fetch('/api/ai/legal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: msgs })
              });

              if (res.status === 429) {
                msgs.push({ id: 'err-' + Date.now(), role: 'assistant', text: '⚠️ Limite Free Tier atteinte (15 req/min). Veuillez patienter 20 secondes.', timestamp: Date.now() });
                saveMessages(msgs);
                render();
                startCooldown(15);
                return;
              }

              const contentType = res.headers.get("content-type") || "";
              if (!contentType.includes("application/json")) {
                throw new Error("URL du serveur IA non configurée ou invalide");
              }

              const data = await res.json();
              const reply = data && data.reply ? data.reply : 'Conseil disponible via le moteur local.';
              msgs.push({ id: 'a-' + Date.now(), role: 'assistant', text: reply, timestamp: Date.now() });
              saveMessages(msgs);
              render();
              startCooldown(4);
            } catch(e) {
              msgs.push({ id: 'err-' + Date.now(), role: 'assistant', text: 'Réponse générée en mode sécurisé.', timestamp: Date.now() });
              saveMessages(msgs);
              render();
              startCooldown(4);
            } finally {
              sendBtn.innerText = 'Envoyer';
              msgInput.focus();
            }
          }

          sendBtn.addEventListener('click', send);
          msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
          clearBtn.addEventListener('click', () => {
            if (confirm('Effacer la conversation ?')) {
              localStorage.removeItem(STORAGE_KEY);
              render();
            }
          });

          render();
        </script>
      </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(popupHtml);
    popup.document.close();
  };

  // Suggestions rapides de questions juridiques
  const QUICK_PROMPTS = [
    { label: '🏢 Bail commercial AUDCG', query: "Quelles sont les conditions de renouvellement et les règles de résiliation d'un bail commercial selon l'AUDCG de l'OHADA ?" },
    { label: '🛡️ Clause de réserve de propriété', query: "Rédige une clause de réserve de propriété protectrice et conforme à l'Acte Uniforme sur les Sûretés de l'OHADA pour mes ventes à crédit." },
    { label: '🚢 Incoterms FOB vs CIF', query: "Quelle est la différence exacte entre les Incoterms 2020 FOB et CIF pour une cargaison à destination d'un port ouest-africain ?" },
    { label: '⚖️ Cautionnement vs Garantie bancaire', query: "Pourquoi est-il plus avantageux d'exiger une garantie autonome à première demande plutôt qu'un cautionnement simple selon l'AUS OHADA ?" },
    { label: '🏛️ SARL vs SAS', query: "Quels sont les avantages comparés entre créer une SARL et une SAS dans l'espace OHADA pour protéger les associés ?" },
  ];

  return (
    <>
      {/* 1. BULLE FLOTTANTE RÉDUITE ULTRA-COMPACTE (Quand le widget est fermé) */}
      {!isOpen && (
        <button
          type="button"
          onPointerDown={handleButtonPointerDown}
          onPointerMove={handleButtonPointerMove}
          onPointerUp={handleButtonPointerUp}
          style={{
            position: 'fixed',
            left: `${Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 90 : 500)}px`,
            top: `${Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 36 : 600)}px`,
            zIndex: 50,
          }}
          className="z-50 py-1 px-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md shadow-black/40 flex items-center gap-1 border border-amber-300 active:scale-95 transition-transform cursor-pointer select-none touch-none"
          title="Agent IA"
          aria-label="Agent IA"
        >
          <div className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-950">
            Agent IA
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
        </button>
      )}

      {/* 1.bis TRIGGER MINIMISÉ FLOTTANT ULTRA-COMPACT (Libère 100% de l'espace écran) */}
      {isOpen && isMinimized && (
        <div
          onPointerDown={handleButtonPointerDown}
          onPointerMove={handleButtonPointerMove}
          onPointerUp={handleButtonPointerUp}
          style={{
            position: 'fixed',
            left: `${Math.min(Math.max(10, position.x), typeof window !== 'undefined' ? window.innerWidth - 130 : 500)}px`,
            top: `${Math.min(Math.max(10, position.y), typeof window !== 'undefined' ? window.innerHeight - 36 : 600)}px`,
            zIndex: 50,
          }}
          className="z-50 py-1 px-2 flex items-center gap-1 bg-slate-900/95 border border-amber-400 rounded-full shadow-md shadow-black/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none touch-none"
        >
          <button
            type="button"
            onClick={() => { playTapBeep(); setIsMinimized(false); }}
            className="flex items-center gap-1 cursor-pointer active:scale-95 transition-transform text-left"
            title="Agent IA"
            aria-label="Agent IA"
          >
            <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-xs">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-amber-300">
              Agent IA
            </span>
          </button>

          {/* Bouton Agrandir / Restaurer */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setIsMinimized(false); }}
            className="w-4 h-4 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs active:scale-90 transition cursor-pointer"
            title="Agrandir le popup (Restaurer)"
            aria-label="Agrandir"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={() => { handleClose(); }}
            className="w-4 h-4 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center shadow-xs active:scale-90 transition cursor-pointer"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* 2. FENÊTRE FLOTTANTE DRAGGABLE EXPANDÉE */}
      {isOpen && !isMinimized && (
        <div
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'fixed',
            left: `${Math.max(8, Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 428 : 600))}px`,
            top: `${Math.max(8, Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 590 : 100))}px`,
            zIndex: 9999,
            width: '420px',
            maxWidth: 'calc(100vw - 16px)',
            height: '580px',
            maxHeight: 'calc(100vh - 32px)',
          }}
          className={`flex flex-col bg-slate-950/98 text-slate-100 rounded-2xl border border-amber-500/40 shadow-2xl shadow-black/80 backdrop-blur-md overflow-hidden transition-shadow ${
            isDragging ? 'ring-2 ring-amber-400 shadow-amber-500/20' : ''
          }`}
        >
          {/* EN-TÊTE DRAGGABLE AVEC POIGNÉE */}
          <div
            onPointerDown={handlePointerDown}
            className={`px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white leading-tight">
                    Juriste OHADA & Finance
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Gemini Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  AUDCG • Sûretés • UEMOA • Incoterms
                </p>
              </div>
            </div>

            {/* CONTRÔLES D'EN-TÊTE : CLÉ API, ZOOM (+/-), DÉTACHER & CONTRÔLES DÉTACHÉS (✕ / _) */}
            <div className="flex items-center gap-1">
              {/* Clé API Settings */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  setIsApiKeyDrawerOpen(!isApiKeyDrawerOpen);
                }}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  customApiKey ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Configurer votre Clé API Google AI Studio"
              >
                <Key className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Moins */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  setFontIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={fontIndex === 0}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Diminuer la police (A-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono text-amber-300 px-0.5 font-bold">
                {currentFontSize}px
              </span>

              {/* Zoom Plus */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  setFontIndex((prev) => Math.min(FONT_SIZES.length - 1, prev + 1));
                }}
                disabled={fontIndex === FONT_SIZES.length - 1}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Agrandir la police (A+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Détacher la fenêtre */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetachWindow();
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-amber-300 cursor-pointer transition"
                title="Détacher dans une fenêtre indépendante"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* CONTRÔLES DÉTACHÉS DÉDIÉS : RÉDUIRE (_) / FERMER (✕) */}
              <div className="flex items-center gap-0.5 bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 shadow-inner ml-1">
                {/* Bouton Réduire / Minimiser : _ */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTapBeep();
                    setIsMinimized(true);
                  }}
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-90"
                  title="Réduire (Libère 100% de l'écran)"
                  aria-label="Réduire"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Bouton Fermer : ✕ */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-90"
                  title="Fermer l'assistant"
                  aria-label="Fermer"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* TIROIR DE CONFIGURATION CLÉ API GOOGLE AI STUDIO */}
          {isApiKeyDrawerOpen && !isMinimized && (
            <div className="bg-slate-900 border-b border-slate-800 p-3 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Clé API Google AI Studio (Free Tier)
                </span>
                <button
                  type="button"
                  onClick={() => setIsApiKeyDrawerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Modèle gratuit : <code>gemini-2.5-flash</code> (15 req/min). Si aucune clé n'est saisie, l'appel transitera par le serveur Nanasore ou le moteur local.
              </p>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs cursor-pointer"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* BANDEAU CONFIDENTIALITÉ & PURGE 24H */}
          {!isMinimized && (
            <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 select-none">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Purge automatique après 24h • 0 base de données
              </span>
              <button
                type="button"
                onClick={handleClearHistory}
                className="hover:text-rose-400 flex items-center gap-1 cursor-pointer transition"
                title="Vider manuellement l'historique"
              >
                <Trash2 className="w-3 h-3" />
                <span>Effacer</span>
              </button>
            </div>
          )}

          {/* ALERTE QUOTA FREE TIER 429 */}
          {rateLimitNotice && !isMinimized && (
            <div className="bg-amber-950/80 border-b border-amber-500/40 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{rateLimitNotice}</span>
            </div>
          )}

          {/* CORPS DES MESSAGES */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    style={{
                      fontSize: `${currentFontSize}px`,
                      lineHeight: 1.55,
                    }}
                    className={`relative group max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Contenu Markdown simplifié */}
                    <div className="space-y-1.5 whitespace-pre-wrap select-text">
                      {msg.text}
                    </div>

                    {/* Horodatage & Bouton Copier */}
                    <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-between text-[9.5px] opacity-70">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="flex items-center gap-1 hover:text-amber-300 cursor-pointer ml-2"
                          title="Copier le texte de la clause"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2 text-xs text-amber-300 animate-pulse bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <span>Analyse juridique & vérification des Actes Uniformes OHADA en cours...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* SUGGESTIONS RAPIDES */}
          {!isMinimized && messages.length <= 2 && (
            <div className="px-3 py-1.5 bg-slate-900/50 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                Thèmes :
              </span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!isOnline}
                  onClick={() => handleSendMessage(qp.query)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition border border-slate-700 active:scale-95 shrink-0"
                  title={!isOnline ? "Connexion requise" : undefined}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* ZONE DE SAISIE AVEC COOLDOWN (3-5s) & SÉCURITÉ FREE TIER */}
          {!isMinimized && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 bg-slate-900 border-t border-slate-800 flex flex-col gap-1.5"
            >
              {!isOnline ? (
                <div className="flex items-center gap-1.5 text-[10.5px] text-amber-400 font-medium px-1">
                  <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Connexion requise pour consulter l'IA Juridique</span>
                </div>
              ) : cooldownSeconds > 0 ? (
                <div className="flex items-center gap-1.5 text-[10.5px] text-amber-400 font-medium px-1">
                  <Clock className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                  <span>Veuillez patienter ({cooldownSeconds}s) - temporisation Free Tier...</span>
                </div>
              ) : null}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    !isOnline
                      ? "Connexion requise..."
                      : cooldownSeconds > 0
                      ? `Veuillez patienter ${cooldownSeconds}s...`
                      : "Posez une question juridique ou soumettez une clause..."
                  }
                  disabled={!isOnline || cooldownSeconds > 0}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 disabled:opacity-50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
                />

                <button
                  type="submit"
                  disabled={!isOnline || !inputText.trim() || isLoading || cooldownSeconds > 0}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-black p-2 rounded-xl transition cursor-pointer shrink-0 shadow-md flex items-center justify-center min-w-[36px]"
                  title={!isOnline ? "Connexion requise" : cooldownSeconds > 0 ? `Patientez ${cooldownSeconds}s` : "Envoyer à l'expert juridique"}
                >
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-slate-950" />
                  ) : cooldownSeconds > 0 ? (
                    <span className="text-xs font-mono font-black">{cooldownSeconds}</span>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
};

export default LegalAiAdvisorWidget;
