import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InventoryProduct, VoiceParseResult, CartItem } from '../../types';
import { parseVoicePhrase } from '../../utils/voiceParser';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Terminal,
  Volume2
} from 'lucide-react';

interface VoiceTestComponentProps {
  inventory: InventoryProduct[];
  onAddToCart?: (items: CartItem[]) => void;
  onBackToRegister: () => void;
}

const PRESET_EXAMPLES = [
  '3 lais 1500',
  '2 pains et 1 lait',
  '5 sachets d\'eau 250',
  '1 pain 150',
  '4 sucre 800',
  '1 sac de riz 17500 et 2 huiles 2200',
];

export const VoiceTestComponent: React.FC<VoiceTestComponentProps> = ({
  inventory,
  onAddToCart,
  onBackToRegister,
}) => {
  // Input phrase
  const [inputPhrase, setInputPhrase] = useState('3 lais 1500');
  const [parseResult, setParseResult] = useState<VoiceParseResult>(() =>
    parseVoicePhrase('3 lais 1500', inventory)
  );
  const [isListening, setIsListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [injectedToast, setInjectedToast] = useState(false);

  // Timers & Recognition refs for clean unmounting
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyage strict au démontage du composant
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Update parse result whenever input phrase changes
  useEffect(() => {
    const res = parseVoicePhrase(inputPhrase, inventory);
    setParseResult(res);
  }, [inputPhrase, inventory]);

  const handleSelectExample = (example: string) => {
    playTapBeep();
    setInputPhrase(example);
  };

  const handleCopyJson = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(parseResult, null, 2));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInjectToTicket = () => {
    if (!onAddToCart || parseResult.recognizedItems.length === 0) return;

    playValidationBeep();
    const cartItems: CartItem[] = parseResult.recognizedItems.map((item) => ({
      id: item.productId,
      name: item.productName,
      price: item.unitPrice,
      quantity: item.quantity,
    }));

    onAddToCart(cartItems);
    setInjectedToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setInjectedToast(false);
      onBackToRegister();
    }, 1200);
  };

  // Optional real SpeechRecognition support if available in browser
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Simulate real phrase if not supported in iframe/browser
      playTapBeep();
      const randomPreset = PRESET_EXAMPLES[Math.floor(Math.random() * PRESET_EXAMPLES.length)];
      setInputPhrase(randomPreset);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        playValidationBeep();
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPhrase(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToRegister}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 active:scale-95 transition-all text-xs font-bold"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-base font-extrabold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Test Reconnaissance Vocale</span>
            </h1>
            <p className="text-[11px] text-slate-400">Interprétation IA & Extraction JSON</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Moteur Nana IA
        </span>
      </div>

      <div className="p-3.5 space-y-3.5 max-w-lg mx-auto w-full">
        {/* Champ de Test / Saisie manuelle */}
        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 shadow-lg">
          <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              Simuler une phrase vocale
            </span>
            <span className="text-[10px] font-mono text-slate-400">Saisie manuelle ou dictée</span>
          </label>

          <div className="relative">
            <input
              id="input-voice-phrase"
              type="text"
              value={inputPhrase}
              onChange={(e) => setInputPhrase(e.target.value)}
              placeholder="Ex: 3 lais 1500..."
              className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-blue-500 shadow-inner"
            />
            <button
              id="btn-voice-mic-test"
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              }`}
              title="Dicter au micro"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Example Chips */}
          <div className="mt-2.5">
            <span className="text-[10px] text-slate-400 font-semibold block mb-1">
              Phrases d'exemples rapides :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleSelectExample(ex)}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    inputPhrase === ex
                      ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                  }`}
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résumé de l'analyse */}
        <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Éléments Extraits
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                parseResult.confidence === 'HAUTE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : parseResult.confidence === 'MOYENNE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Confiance : {parseResult.confidence}
            </span>
          </div>

          {parseResult.recognizedItems.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400">
              Aucun article reconnu dans l'inventaire. Essayez "3 lais 1500" ou "2 pains".
            </div>
          ) : (
            <div className="space-y-1.5">
              {parseResult.recognizedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/50 text-xs"
                >
                  <div>
                    <span className="font-bold text-white text-sm mr-2">{item.quantity}x</span>
                    <span className="text-blue-200 font-semibold">{item.productName}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      (mot: <span className="text-amber-300 font-mono">"{item.matchedKeyword}"</span>)
                    </span>
                  </div>
                  <div className="font-mono font-bold text-white">
                    {formatCFA(item.lineTotal)}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Prix prononcé : </span>
                  <span className="font-mono font-bold text-white">
                    {parseResult.spokenPrice !== null ? formatCFA(parseResult.spokenPrice) : 'Non précisé'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Calcul Catalogue : </span>
                  <span className="font-mono font-black text-emerald-400">
                    {formatCFA(parseResult.calculatedTotal)}
                  </span>
                </div>
              </div>

              {parseResult.extractedDetails.discrepancyNote && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-800/50 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{parseResult.extractedDetails.discrepancyNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Action button: Inject into live ticket */}
          {parseResult.recognizedItems.length > 0 && onAddToCart && (
            <button
              id="btn-inject-to-cart"
              type="button"
              onClick={handleInjectToTicket}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {injectedToast ? '✓ Ajouté au ticket !' : 'Ajouter directement au ticket de caisse'}
              </span>
            </button>
          )}
        </div>

        {/* AFFICHAGE DU RÉSULTAT JSON STRUCTURÉ (Demandé explicitement par l'utilisateur) */}
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold font-mono">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Résultat JSON Structuré</span>
            </div>
            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copié !' : 'Copier JSON'}</span>
            </button>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 overflow-x-auto text-[11px] font-mono leading-relaxed text-emerald-400 select-text scrollbar-thin scrollbar-thumb-slate-700 max-h-72">
            <pre>{JSON.stringify(parseResult, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTestComponent;
