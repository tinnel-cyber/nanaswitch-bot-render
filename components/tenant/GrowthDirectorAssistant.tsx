'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Award, 
  Send, 
  User, 
  Bot, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  HelpCircle,
  Briefcase
} from 'lucide-react';

export interface Message {
  id?: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
}

export interface GrowthDirectorAssistantProps {
  storeName?: string;
  currency?: string;
  sellerMode?: string;
  isFloating?: boolean;
  onClose?: () => void;
}

export function GrowthDirectorAssistant({
  storeName = 'Ma Boutique Pro',
  currency = 'FCFA',
  sellerMode = 'ecommerce',
  isFloating = false,
  onClose
}: GrowthDirectorAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome-1',
      sender: 'ai', 
      text: "Salutations distinguées. Je suis le Professeur Konkobo, Directeur de la Stratégie Commerciale de Nanasore. C'est un honneur de vous accompagner. Quel est l'objectif commercial de votre entreprise aujourd'hui, et comment puis-je vous guider vers le modèle de croissance le plus lucratif ?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Quel plan d'abonnement choisir pour débuter ?",
    "Comment fonctionne le modèle à la commission ?",
    "Optimiser mes campagnes e-mail avec Nanasore",
    "Présentez-moi les 14 modules souverains",
    "Comment maximiser mon taux de conversion ?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/growth-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query,
          messages: updatedMessages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            sender: m.sender,
            content: m.text,
            text: m.text
          })),
          merchantContext: {
            storeName,
            currency,
            sellerMode
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.reply) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        // Fallback local résilient
        let fallbackText = "C'est une excellente question stratégique. En tant qu'entrepreneur visionnaire, pour maximiser votre retour sur investissement sur Nanasore, je vous suggère d'analyser votre volume de transactions actuel.";
        if (query.toLowerCase().includes('commission')) {
          fallbackText = "Le modèle de **Paiement à la Commission** est une merveille d'ingénierie financière pour les entrepreneurs visionnaires. Il vous permet de déployer l'ensemble de nos outils sans aucun coût fixe initial : Nanasore se rémunère uniquement en prélevant un pourcentage modéré sur vos ventes effectives. C'est le choix de la sécurité et de l'alignement total de nos succès.";
        } else if (query.toLowerCase().includes('plan') || query.toLowerCase().includes('abonnement')) {
          fallbackText = "Le choix du plan dépend de votre vélocité. Si votre volume de transactions est stable et élevé, l'**Abonnement Fixe** protège vos marges. Si vous démarrez ou testez un marché, le modèle à la commission ou le **Pay-as-You-Go** pour l'e-mailing s'avèrent infiniment plus rationnels.";
        }
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (networkError) {
      console.warn('[GROWTH_ASSISTANT] Erreur réseau:', networkError);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: "Je vous prie de m'excuser pour cette brève latence. Mon analyse stratégique demeure accessible : sur Nanasore, votre priorité est d'activer les leviers à plus fort ROI, notamment le Studio E-mailing Pro pour fidéliser votre clientèle existante et la Caisse POS pour fluidifier vos encaissements.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-[#FFFFFF] rounded-3xl border-2 border-[#2563EB]/30 shadow-xl transition-all duration-300 text-slate-800 ${
      isFloating 
        ? 'fixed bottom-6 right-6 z-50 w-full max-w-lg shadow-2xl border-blue-500/50' 
        : 'w-full p-5 sm:p-7 space-y-6'
    }`}>
      
      {/* En-tête du Directeur de la Croissance */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 ${
        isFloating ? 'p-4 pb-3' : 'pb-5'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-indigo-700 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30 shrink-0">
            <Award className="w-6 h-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Professeur Konkobo</h2>
              <span className="px-2.5 py-0.5 bg-[#2563EB] text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                Directeur de la Croissance • IA
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">Votre mentor stratégique en monétisation et optimisation e-commerce.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden xs:inline">Expert Stratégie Marchande</span>
            <span className="xs:hidden">Stratégie</span>
          </div>

          {isFloating && (
            <button
              type="button"
              onClick={() => setIsMinimized(prev => !prev)}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition"
              title={isMinimized ? "Déplier l'assistant" : "Réduire"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 cursor-pointer transition text-xs font-bold"
              title="Fermer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Corps du Widget (Masquable si minimisé) */}
      {!isMinimized && (
        <div className={`space-y-5 ${isFloating ? 'p-4 pt-0' : ''}`}>
          
          {/* Boîte de Discussion - Palette Blanc Cassé (#FBF9F5) et Bleu Royal (#2563EB) */}
          <div 
            className="bg-[#FBF9F5] border border-slate-200/90 rounded-2xl p-4 sm:p-5 h-84 sm:h-96 overflow-y-auto space-y-4 flex flex-col shadow-inner"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div 
                  key={msg.id || idx} 
                  className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-xs ${
                    isUser 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-[#2563EB] text-white shadow-blue-500/20'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bulle de texte */}
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                      isUser 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none prose prose-sm max-w-none'
                    }`}>
                      <div className="whitespace-pre-line">
                        {msg.text}
                      </div>
                    </div>
                    {msg.timestamp && (
                      <p className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Indicateur de réflexion */}
            {isLoading && (
              <div className="flex gap-3 items-center text-xs font-semibold text-blue-800 animate-pulse bg-blue-50/80 p-3 rounded-2xl border border-blue-200/80 w-fit">
                <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <span>Le Professeur Konkobo analyse votre requête stratégique...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions de questions rapides */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Questions Stratégiques Fréquentes</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(prompt)}
                  className="px-3.5 py-1.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-2xs"
                >
                  <span>{prompt}</span> 
                  <ArrowRight className="w-3 h-3 text-[#2563EB] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Barre de saisie */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Posez votre question stratégique au Directeur de la Croissance..."
              className="flex-1 px-4 py-3 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
            />
            <button
              type="button"
              disabled={isLoading || !input.trim()}
              onClick={() => handleSend()}
              className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Analyse...</span>
                </>
              ) : (
                <>
                  <span>Envoyer</span> 
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Note de bas de widget */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-blue-600" />
              Direction Commerciale Nanasore
            </span>
            <span className="font-semibold text-slate-500">
              Modèles : Abonnement • Commission • Pay-as-you-go
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
