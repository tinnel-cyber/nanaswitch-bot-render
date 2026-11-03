import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Mic, UserCheck, XCircle, BookOpen, Volume2, Sparkles, Loader2, Wifi, WifiOff, Cpu, Lock, Boxes } from 'lucide-react';
import { playValidationBeep, playCancelSound, formatCFA } from '../../../utils/audio';
import { InventoryProduct, CartItem } from '../../../types';
import {
  startAudioRecording,
  stopAudioRecording,
  processVoiceCommand,
} from '../../../services/voiceRecognitionService';
import { getWhisperStatus, subscribeWhisperStatus, WhisperModelStatus } from '../../../services/whisperEngine';

import { FAST_SALE_PRODUCTS } from '../../../data/initialData';

const FRENCH_NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15,
  seize: 16, dixsept: 17, dixhuit: 18, dixneuf: 19, vingt: 20,
  trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100,
};

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Analyse le texte parlé et associe les articles au stock commerçant (tolérance casse, accents, pluriels).
 */
export function parseAndMatchInventory(
  rawText: string,
  inventory: InventoryProduct[]
): { matched: { product: InventoryProduct; quantity: number }[]; notFound: boolean; spokenText: string } {
  if (!rawText || !rawText.trim()) {
    return { matched: [], notFound: false, spokenText: '' };
  }

  const cleanText = rawText.trim();
  const normalized = normalizeText(cleanText);

  // Pool de recherche : inventaire du commerçant + produits rapides en secours
  const productPool: InventoryProduct[] = inventory && inventory.length > 0
    ? inventory
    : (FAST_SALE_PRODUCTS || []).map((f) => ({
        id: f.id,
        storeId: '',
        name: f.name,
        category: 'Général',
        sellingPrice: f.price,
        costPrice: Math.round(f.price * 0.75),
        stock: 999,
        unit: 'pièce',
        keywords: [f.name.toLowerCase()],
      }));

  const matched: { product: InventoryProduct; quantity: number }[] = [];
  const matchedProductIds = new Set<string>();

  // Découper par segments ("et", "+", virgules) pour supporter les multi-articles (ex: "2 savons et 1 pain")
  const segments = normalized.split(/\s*(?:,|\bet\b|\+|\&)\s*/);

  for (const segment of segments) {
    const trimmedSeg = segment.trim();
    if (!trimmedSeg) continue;

    let bestMatch: { product: InventoryProduct; quantity: number } | null = null;
    let longestMatchLen = 0;

    for (const prod of productPool) {
      if (matchedProductIds.has(prod.id)) continue;

      const normProdName = normalizeText(prod.name);
      const candidateTerms = new Set<string>();
      candidateTerms.add(normProdName);

      // Mots du nom s'ils font au moins 3 caractères (ex: "Savon", "BF")
      normProdName.split(/\s+/).forEach((w) => {
        if (w.length >= 3) candidateTerms.add(w);
      });

      if (Array.isArray(prod.keywords)) {
        prod.keywords.forEach((kw) => {
          const normKw = normalizeText(kw);
          if (normKw.length >= 2) candidateTerms.add(normKw);
        });
      }

      for (const term of candidateTerms) {
        const singularTerm = term.endsWith('s') || term.endsWith('x') ? term.slice(0, -1) : term;
        const termRegex = new RegExp(`\\b${singularTerm}[sx]?\\b`, 'i');

        if (termRegex.test(trimmedSeg) || trimmedSeg.includes(singularTerm)) {
          if (term.length > longestMatchLen) {
            longestMatchLen = term.length;

            let quantity = 1;
            const qtyRegex = new RegExp(
              `(?:^|\\s)(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente)\\s*(?:x|de)?\\s*(?:paquets?\\s+(?:de)?|boites?\\s+(?:de)?|sachets?\\s+(?:de)?|sacs?\\s+(?:de)?|bouteilles?\\s+(?:de)?|morceaux?\\s+(?:de)?)?\\s*${singularTerm}`,
              'i'
            );
            const qtyMatch = trimmedSeg.match(qtyRegex);

            if (qtyMatch && qtyMatch[1]) {
              const qVal = qtyMatch[1].toLowerCase();
              quantity = FRENCH_NUMBER_WORDS[qVal] || parseInt(qVal, 10) || 1;
            } else {
              const leadNumMatch = trimmedSeg.match(/^(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/i);
              if (leadNumMatch && leadNumMatch[1]) {
                const leadVal = leadNumMatch[1].toLowerCase();
                quantity = FRENCH_NUMBER_WORDS[leadVal] || parseInt(leadVal, 10) || 1;
              }
            }

            bestMatch = { product: prod, quantity: Math.max(1, quantity) };
          }
        }
      }
    }

    if (bestMatch) {
      matched.push(bestMatch);
      matchedProductIds.add(bestMatch.product.id);
    }
  }

  // Si aucun segment n'a produit de match, tenter sur la phrase entière
  if (matched.length === 0) {
    for (const prod of productPool) {
      const normProdName = normalizeText(prod.name);
      const singularName = normProdName.endsWith('s') || normProdName.endsWith('x')
        ? normProdName.slice(0, -1)
        : normProdName;

      if (new RegExp(`\\b${singularName}[sx]?\\b`, 'i').test(normalized) || normalized.includes(singularName)) {
        let quantity = 1;
        const qtyMatch = normalized.match(new RegExp(`(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\s+.*${singularName}`, 'i'));
        if (qtyMatch && qtyMatch[1]) {
          const qVal = qtyMatch[1].toLowerCase();
          quantity = FRENCH_NUMBER_WORDS[qVal] || parseInt(qVal, 10) || 1;
        }
        matched.push({ product: prod, quantity: Math.max(1, quantity) });
        matchedProductIds.add(prod.id);
        break;
      }
    }
  }

  const notFound = matched.length === 0 && cleanText.length > 0;
  return { matched, notFound, spokenText: cleanText };
}

interface BottomControlsProps {
  onAddVoiceItems: () => void;
  onAddRecognizedItems?: (items: CartItem[]) => void;
  inventory?: InventoryProduct[];
  onOpenCreditModal: () => void;
  onCancelCart: () => void;
  onOpenDebtBook: () => void;
  onOpenInventory?: () => void;
  onOpenVoiceTest?: () => void;
  cartTotal: number;
  cartItemCount: number;
  isCashierMode?: boolean;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  onAddVoiceItems,
  onAddRecognizedItems,
  inventory = [],
  onOpenCreditModal,
  onCancelCart,
  onOpenDebtBook,
  onOpenInventory,
  onOpenVoiceTest,
  cartTotal,
  cartItemCount,
  isCashierMode,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);
  const [whisperStatus, setWhisperStatus] = useState<WhisperModelStatus>('IDLE');
  const [whisperProgress, setWhisperProgress] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : false
  );

  const recordingTimerRef = useRef<number | null>(null);
  const isPressingRef = useRef<boolean>(false);
  const pressStartTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to Whisper model status
    const unsubscribe = subscribeWhisperStatus((status, progress) => {
      setWhisperStatus(status);
      setWhisperProgress(progress);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  const executeVoiceMatchAndInjection = (spokenText: string) => {
    setIsProcessing(true);
    const { matched, notFound } = parseAndMatchInventory(spokenText, inventory);

    if (matched.length > 0) {
      playValidationBeep();
      const cartItems: CartItem[] = matched.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        price: product.sellingPrice,
        quantity,
        photoUrl: product.photoUrl || (product as any).imageUrl || (product as any).image,
        barcode: product.barcode,
      }));

      if (onAddRecognizedItems) {
        onAddRecognizedItems(cartItems);
      } else {
        onAddVoiceItems();
      }

      const totalGain = matched.reduce((s, m) => s + m.product.sellingPrice * m.quantity, 0);
      const summary = matched.map(({ product, quantity }) => `${quantity}x ${product.name}`).join(' + ');
      setVoiceNotification(`✓ « ${summary} » ajouté (+${formatCFA(totalGain)})`);
    } else if (notFound) {
      playCancelSound();
      setVoiceNotification('Produit non trouvé dans votre stock');
    } else {
      setVoiceNotification('Aucune parole détectée. Réessayez.');
    }

    setIsProcessing(false);

    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = window.setTimeout(() => {
      setVoiceNotification(null);
    }, 3500);
  };

  const handleStartRecording = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isPressingRef.current || isProcessing) return;
    isPressingRef.current = true;
    pressStartTimeRef.current = Date.now();
    setVoiceNotification(null);
    transcriptRef.current = '';

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('[Web Speech API] Non supporté sur ce navigateur.');
      setVoiceNotification('Reconnaissance vocale non supportée sur ce navigateur.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRec();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        isListeningRef.current = true;
        setVoiceNotification("🎙️ À l'écoute... (Dites par ex: 2 savons)");
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const clean = fullTranscript.trim();
        if (clean) {
          transcriptRef.current = clean;
          setVoiceNotification(`Entendu : « ${clean} »`);
        }
      };

      recognition.onerror = (errEvent: any) => {
        console.warn('[Web Speech API] Erreur :', errEvent.error);
        isListeningRef.current = false;
        setIsRecording(false);
        setIsProcessing(false);
        if (errEvent.error !== 'no-speech' && errEvent.error !== 'aborted') {
          setVoiceNotification('Microphone indisponible ou erreur d\'écoute.');
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsRecording(false);
        const finalSpoken = transcriptRef.current;
        if (finalSpoken) {
          executeVoiceMatchAndInjection(finalSpoken);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Erreur démarrage SpeechRecognition :', err);
      setIsRecording(false);
      isListeningRef.current = false;
    }
  };

  const handleStopRecording = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isPressingRef.current) return;
    isPressingRef.current = false;

    if (recognitionRef.current && isListeningRef.current) {
      setIsProcessing(true);
      try {
        recognitionRef.current.stop();
      } catch (err) {
        setIsProcessing(false);
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
      const text = transcriptRef.current;
      if (text) {
        executeVoiceMatchAndInjection(text);
      }
    }
  };

  return (
    <div className="h-full flex flex-col justify-between px-3 py-2 bg-slate-900/95 border-t border-slate-800 relative z-20 select-none overflow-y-auto custom-scrollbar">
      {/* Voice speech recognition feedback banner (Toast) */}
      <div className="min-h-6 flex items-center justify-center">
        {voiceNotification ? (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold animate-bounce shadow-md">
            <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="truncate max-w-[280px] sm:max-w-md">{voiceNotification}</span>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 text-xs font-bold shadow-md animate-pulse">
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{processingStatus || '🎙️ Traitement audio local (Hors-ligne)'}</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold tracking-wide animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Écoute en cours... Relâchez pour valider</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>Maintenez le gros bouton micro pour dicter la commande</span>
            <span className="text-slate-600">•</span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-800/40">
                <Wifi className="w-2.5 h-2.5" /> En ligne
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-semibold bg-amber-950/50 px-1.5 py-0.5 rounded-md border border-amber-800/40">
                <WifiOff className="w-2.5 h-2.5" /> 100% Hors-ligne (WASM)
              </span>
            )}
            {whisperStatus === 'DOWNLOADING' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-700/40">
                <Cpu className="w-2.5 h-2.5 animate-spin" /> Whisper {whisperProgress}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main 3-action row: [Crédit Client (Rouge)] | [GIANT MICRO CENTRAL] | [Annuler] */}
      <div className="flex items-center justify-between gap-2.5 py-1">
        {/* Bouton Rouge: Crédit Client */}
        <button
          id="btn-credit-client"
          type="button"
          onClick={onOpenCreditModal}
          className="flex-1 max-w-[100px] sm:max-w-[120px] h-16 sm:h-20 flex flex-col items-center justify-center p-1.5 rounded-2xl bg-gradient-to-b from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-95 text-white border border-red-400/40 shadow-lg shadow-red-900/40 cursor-pointer transition-transform"
          title="Enregistrer cette vente au Cahier de Dettes"
        >
          <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-white shrink-0" />
          <span className="font-extrabold text-[11px] sm:text-xs tracking-tight text-center leading-tight">
            Crédit Client
          </span>
          {cartTotal > 0 && (
            <span className="text-[9px] font-mono text-red-100 bg-red-950/60 px-1 rounded mt-0.5">
              À noter
            </span>
          )}
        </button>

        {/* BOUTON MICRO GÉANT CENTRAL (Push-to-Talk) */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Animated soundwaves background when recording */}
          {isRecording && (
            <div className="absolute -inset-4 flex items-center justify-center pointer-events-none">
              {/* Pulsing rings */}
              <div className="absolute w-24 h-24 rounded-full bg-blue-500/20 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full border-2 border-cyan-400/40 animate-pulse" />

              {/* Sound wave bars */}
              <div className="absolute flex items-center gap-1.5 z-0">
                <span className="w-1.5 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-8" />
                <span className="w-1.5 bg-blue-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-12" />
                <span className="w-1.5 bg-cyan-300 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-16" />
                <span className="w-1.5 bg-blue-300 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-14" />
                <span className="w-1.5 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-10" />
              </div>
            </div>
          )}

          <button
            id="btn-push-to-talk"
            type="button"
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={(e) => {
              if (isPressingRef.current) handleStopRecording(e);
            }}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            onTouchCancel={(e) => {
              if (isPressingRef.current) handleStopRecording(e);
            }}
            disabled={isProcessing}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center relative z-10 cursor-pointer shadow-xl transition-all duration-150 select-none ${
              isProcessing
                ? 'bg-gradient-to-tr from-cyan-600 via-teal-600 to-blue-700 text-white ring-4 ring-cyan-400/60 shadow-cyan-600/40'
                : isRecording
                ? 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 text-white scale-110 ring-4 ring-cyan-300 shadow-cyan-500/50'
                : 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white hover:brightness-110 active:scale-95 ring-2 ring-blue-400/40 shadow-blue-600/40'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-cyan-200" />
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-center mt-0.5 leading-none px-1 text-cyan-100">
                  Traitement
                </span>
              </>
            ) : (
              <>
                <Mic className={`w-8 h-8 sm:w-10 sm:h-10 ${isRecording ? 'animate-bounce text-white' : 'text-blue-100'}`} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center mt-0.5 leading-none px-1">
                  {isRecording ? 'Relâcher' : 'Maintenir'}
                </span>
              </>
            )}
          </button>

          {/* Indicateur visuel sous le bouton */}
          {isProcessing ? (
            <span className="text-[10px] text-cyan-300 font-bold mt-1 tracking-tight flex items-center gap-1 animate-pulse">
              🎙️ Traitement audio local (Hors-ligne)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-semibold mt-1 tracking-tight">
              Push-to-Talk {isOnline ? '(Gemini)' : '(Whisper WASM)'}
            </span>
          )}
        </div>

        {/* Bouton: Annuler */}
        <button
          id="btn-annuler-ticket"
          type="button"
          onClick={() => {
            playCancelSound();
            onCancelCart();
          }}
          disabled={cartTotal === 0 && cartItemCount === 0}
          className={`flex-1 max-w-[100px] sm:max-w-[120px] h-16 sm:h-20 flex flex-col items-center justify-center p-1.5 rounded-2xl border transition-all cursor-pointer ${
            cartTotal > 0 || cartItemCount > 0
              ? 'bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 border-slate-700 shadow-md hover:border-slate-600'
              : 'bg-slate-800/40 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-50'
          }`}
          title="Vider le ticket en cours"
        >
          <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-slate-400 shrink-0" />
          <span className="font-extrabold text-[11px] sm:text-xs tracking-tight text-center leading-tight flex items-center gap-1">
            Annuler
            {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
          </span>
          <span className="text-[9px] text-slate-500">Vider</span>
        </button>
      </div>

      {/* Bottom quick switch buttons: Stock + Cahier de Dettes */}
      <div className="pt-1 flex gap-2">
        {onOpenInventory && (
          <button
            id="btn-switch-stock-inventory"
            type="button"
            onClick={onOpenInventory}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 active:bg-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue-300 hover:text-white transition-colors cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-blue-400" />
            <span>Stock</span>
          </button>
        )}

        <button
          id="btn-switch-cahier-dettes"
          type="button"
          onClick={onOpenDebtBook}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 active:bg-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-white transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Cahier Dettes</span>
        </button>
      </div>
    </div>
  );
};

export default parseAndMatchInventory;
