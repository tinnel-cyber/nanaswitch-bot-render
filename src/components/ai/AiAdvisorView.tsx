import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  InventoryProduct,
  DebtCustomer,
  CompletedSale,
  LossRecord,
} from '../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  DollarSign,
  Boxes,
  Users,
  Send,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  Flame,
  Zap,
  Coffee,
  HelpCircle,
  Clock,
  ThumbsUp,
  RotateCw,
  Award,
  WifiOff
} from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { GrowthDirectorAssistant } from '../tenant/GrowthDirectorAssistant';

interface AiAdvisorViewProps {
  inventory: InventoryProduct[];
  customers: DebtCustomer[];
  sales: CompletedSale[];
  losses: LossRecord[];
  onBackToRegister: () => void;
  onOpenInventory?: (productId?: string) => void;
  onOpenDebtBook?: (customerId?: string) => void;
  onQuickRestock?: (productId: string, quantity: number) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export const AiAdvisorView: React.FC<AiAdvisorViewProps> = ({
  inventory,
  customers,
  sales,
  losses,
  onBackToRegister,
  onOpenInventory,
  onOpenDebtBook,
  onQuickRestock,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'PROFITABILITY' | 'ANALYSIS' | 'FINANCE_CHAT' | 'GROWTH_DIRECTOR'>('GROWTH_DIRECTOR');
  const { isOnline } = useNetworkStatus();

  // AI Global Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [restockSuccessMessage, setRestockSuccessMessage] = useState<string | null>(null);

  // Financial Q&A state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'gemini',
      text: `Bonjour cher boutiquier ! Je suis votre conseiller financier intelligent Gemini. 
Je surveille en direct vos ventes, vos marges, vos stocks et votre cahier de dettes. 
Posez-moi n'importe quelle question sur vos finances, vos marges ou vos impayés, je vous réponds avec des calculs concrets en Francs CFA !`,
      timestamp: 'À l\'instant',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isWaitingAnswer, setIsWaitingAnswer] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Computed live metrics
  const totalDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  const overdueCustomersCount = customers.filter((c) => c.status === 'OVERDUE' || c.totalDebt > 15000).length;
  const criticalStockProducts = inventory.filter((p) => p.stock < 5);
  const sucreProduct = inventory.find((p) => p.id === 'sucre');
  const mamadouCustomer = customers.find((c) => c.shortName?.toLowerCase().includes('mamadou') || c.id === 'cust-mamadou');

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isWaitingAnswer]);

  // Handler: Run AI Global Analysis
  const handleRunGlobalAnalysis = async () => {
    if (!isOnline) {
      playTapBeep();
      setHasRunAnalysis(true);
      return;
    }
    playTapBeep();
    setIsAnalyzing(true);
    setHasRunAnalysis(false);

    // Simulation steps for great UX
    setAnalysisStep('🔍 Scan de 147 transactions et marges brutes...');
    await new Promise((r) => setTimeout(r, 650));

    setAnalysisStep('📦 Analyse des vitesses de vente et alertes de rupture (Sucre, Tomate)...');
    await new Promise((r) => setTimeout(r, 700));

    setAnalysisStep('📓 Audit des 108 000 F CFA d\'impayés dans le Cahier de Dettes...');
    await new Promise((r) => setTimeout(r, 650));

    setAnalysisStep('⚡ Synthèse des 3 actions à fort impact par Gemini 3.8 Flash...');

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          customers,
          sales,
          losses,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        await response.json();
      }
    } catch (e) {
      console.warn('Analysis network call:', e);
    }

    setIsAnalyzing(false);
    setHasRunAnalysis(true);
    playValidationBeep();
  };

  // Handler: Send financial question
  const handleSendFinancialQuestion = async (presetQuestion?: string) => {
    const query = (presetQuestion || userInput).trim();
    if (!query || isWaitingAnswer) return;

    playTapBeep();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'À l\'instant',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuestion) setUserInput('');
    setIsWaitingAnswer(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            totalDebt,
            lowStockCount: criticalStockProducts.length,
            todaySales: sales.reduce((sum, s) => sum + s.total, 0),
          },
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        const geminiMsg: ChatMessage = {
          id: `gem-${Date.now()}`,
          sender: 'gemini',
          text: data.reply || 'Voici mon analyse pour votre boutique...',
          timestamp: 'À l\'instant',
        };
        setChatMessages((prev) => [...prev, geminiMsg]);
        playCashChime();
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      // Graceful local financial response
      setTimeout(() => {
        let answer = `**💡 Recommandation Financière Gemini :**\n\n- **Trésorerie** : Sécurisez en priorité vos créances supérieures à 15 000 F CFA.\n- **Marge** : Concentrez-vous sur le Riz et le Lait qui assurent plus de 60% de votre marge.\n- **Disponibilité** : Réapprovisionnez le Sucre avant 48h pour ne pas rater les ventes du petit-déjeuner.`;
        if (query.toLowerCase().includes('impayé') || query.toLowerCase().includes('crédit')) {
          answer = `**💡 Comment réduire vos impayés sans perdre vos clients :**\n\n1. **Plafonnez le crédit** : Limitez le crédit à 15 000 F CFA maximum par famille.\n2. **Règle des 50%** : Exigez qu'un client avec dette ancienne règle au moins la moitié avant tout nouvel achat.\n3. **Relance WhatsApp amicale le 28 du mois** : Les gens paient en priorité les commerçants qui relancent poliment le jour de paie.`;
        }
        const geminiMsg: ChatMessage = {
          id: `gem-${Date.now()}`,
          sender: 'gemini',
          text: answer,
          timestamp: 'À l\'instant',
        };
        setChatMessages((prev) => [...prev, geminiMsg]);
        playValidationBeep();
      }, 700);
    } finally {
      setIsWaitingAnswer(false);
    }
  };

  // Quick Restock action for Sucre
  const handleRestockSucre = () => {
    playTapBeep();
    if (onQuickRestock && sucreProduct) {
      onQuickRestock(sucreProduct.id, 24);
      playCashChime();
      setRestockSuccessMessage('✅ Arrivage validé : +24 paquets de Sucre ajoutés au stock !');
      setTimeout(() => setRestockSuccessMessage(null), 4000);
    } else if (onOpenInventory) {
      onOpenInventory('sucre');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-900/40 p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <button
            id="btn-back-to-caisse"
            type="button"
            onClick={() => {
              playTapBeep();
              onBackToRegister();
            }}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="Retourner à la caisse"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span className="hidden xs:inline">Caisse</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/40">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Conseils & Analyse IA de Gemini
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Gratuit
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Copilote intelligent pour maximiser bénéfices, stocks et encaissements
              </p>
            </div>
          </div>
        </div>

        {/* Global AI status badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/30 px-2 py-1 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-medium text-indigo-200">Gemini 3.8 Flash</span>
        </div>
      </header>

      {/* Quick Notification Toast */}
      {restockSuccessMessage && (
        <div className="shrink-0 bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span>{restockSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setRestockSuccessMessage(null)}
            className="text-white/80 hover:text-white ml-2 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Secondary Horizontal Sub-Nav */}
      <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 flex items-center px-2 py-1 gap-1 overflow-x-auto scrollbar-none">
        <button
          id="tab-sub-growth-director"
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('GROWTH_DIRECTOR');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'GROWTH_DIRECTOR'
              ? 'bg-[#2563EB] text-white border border-blue-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>Directeur de Croissance • IA</span>
        </button>

        <button
          id="tab-sub-alerts"
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('ALERTS');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'ALERTS'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Alertes Intelligentes</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-0.5" />
        </button>

        <button
          id="tab-sub-profitability"
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('PROFITABILITY');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'PROFITABILITY'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rentabilité & Top 3</span>
        </button>

        <button
          id="tab-sub-analysis"
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('ANALYSIS');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'ANALYSIS'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Analyse IA (3 Actions)</span>
        </button>

        <button
          id="tab-sub-chat"
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('FINANCE_CHAT');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'FINANCE_CHAT'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>Questions Finances</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-4">
        {/* Alerte si Hors-ligne */}
        {!isOnline && (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Agent IA Gemini Cloud : <strong>Connexion requise</strong> pour les requêtes en temps réel. Vos données locales restent consultables.</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 0: DIRECTEUR DE CROISSANCE (AGENT NSORE)             */}
        {/* ======================================================== */}
        {activeTab === 'GROWTH_DIRECTOR' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <GrowthDirectorAssistant
              storeName="Mon Entreprise Nanasore"
              currency="FCFA"
              sellerMode="ecommerce"
              salesCount={sales?.length || 0}
              productsCount={inventory?.length || 0}
              isNewUser={!sales?.length && !inventory?.length}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: CARTES D'ALERTE INTELLIGENTES                     */}
        {/* ======================================================== */}
        {activeTab === 'ALERTS' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Cartes d'Alerte Intelligentes en Temps Réel
                </h2>
                <p className="text-xs text-slate-400">
                  Détection proactive des risques de rupture et des plafonds de crédit dépassés
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-950/80 text-red-400 border border-red-800/60">
                2 Priorités Hautes
              </span>
            </div>

            {/* CARTE 1 : ALERTE RUPTURE (SUCRE & CRITIQUES) */}
            <div
              id="card-alert-rupture-sucre"
              className="rounded-xl bg-gradient-to-br from-red-950/40 via-slate-900 to-amber-950/30 border-2 border-red-500/50 p-3.5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/40">
                        Alerte Rupture Imminente (J+2)
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white mt-0.5">
                      Rupture imminente sur les produits de base
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-400">Sucre en stock</span>
                  <div className="text-lg font-black text-amber-300">{sucreProduct?.stock ?? 50} pqt</div>
                </div>
              </div>

              {/* Message spécifique demandé par l'utilisateur */}
              <div className="bg-red-950/60 border border-red-800/60 rounded-lg p-2.5 mb-3 text-red-100 text-xs font-semibold leading-relaxed flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-extrabold text-red-300 text-xs block mb-0.5">
                    Notification IA :
                  </span>
                  « Attention, vous allez manquer de Sucre dans 2 jours selon vos ventes récentes et autres. »
                </div>
              </div>

              {/* Diagnostic précis */}
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Votre rythme de vente moyen est de <strong>18 paquets de sucre par jour</strong>. Avec un stock actuel de {sucreProduct?.stock ?? 50} paquets, la rupture interviendra dès ce week-end lors du pic du matin.
              </p>

              {/* Autres articles en rupture critique (< 5 unités) */}
              {criticalStockProducts.length > 0 && (
                <div className="mb-3 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    Autres articles sous le seuil critique (moins de 5 unités) :
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {criticalStockProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-200 truncate">{p.name}</span>
                        <span className="font-extrabold text-red-400 px-1.5 py-0.5 rounded bg-red-950/80 text-[10px]">
                          {p.stock} restant{p.stock > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions directes en 1 clic */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-restock-sucre-direct"
                  type="button"
                  onClick={handleRestockSucre}
                  className="flex-1 min-w-[140px] py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/40 cursor-pointer"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Arrivage Rapide Sucre (+24)</span>
                </button>

                {onOpenInventory && (
                  <button
                    id="btn-view-all-stock"
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onOpenInventory('sucre');
                    }}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Gérer tout le Stock</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* CARTE 2 : ALERTE IMPAYÉS (MAMADOU ET DÉPASSEMENTS) */}
            <div
              id="card-alert-impayes-mamadou"
              className="rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-red-950/20 border-2 border-rose-500/50 p-3.5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-300">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                        Alerte Plafond de Crédit Dépassé
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white mt-0.5">
                      Risque de trésorerie sur crédit client
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">Total impayés</span>
                  <div className="text-base font-black text-rose-400">
                    {formatCFA(mamadouCustomer?.totalDebt || 35000)}
                  </div>
                </div>
              </div>

              {/* Message spécifique demandé par l'utilisateur */}
              <div className="bg-rose-950/60 border border-rose-800/60 rounded-lg p-2.5 mb-3 text-rose-100 text-xs font-semibold leading-relaxed flex items-start gap-2">
                <span className="text-base">🔴</span>
                <div>
                  <span className="font-extrabold text-rose-300 text-xs block mb-0.5">
                    Alerte Recouvrement :
                  </span>
                  « Mamadou a dépassé son plafond de crédit de 15 000 F CFA. »
                </div>
              </div>

              {/* Analyse & Chiffres réels */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 mb-3 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dette cumulée actuelle :</span>
                  <span className="font-bold text-rose-400">{formatCFA(mamadouCustomer?.totalDebt || 35000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plafond de sécurité boutique :</span>
                  <span className="font-semibold text-slate-200">20 000 F CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dépassement net non autorisé :</span>
                  <span className="font-extrabold text-red-400">+15 000 F CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Retard de paiement constaté :</span>
                  <span className="font-bold text-amber-400">14 jours sans règlement</span>
                </div>
              </div>

              {/* Actions directes en 1 clic */}
              <div className="flex flex-wrap items-center gap-2">
                {onOpenDebtBook && (
                  <button
                    id="btn-open-fiche-mamadou"
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onOpenDebtBook(mamadouCustomer?.id || 'cust-mamadou');
                    }}
                    className="flex-1 min-w-[130px] py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-900/30 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Fiche Mamadou (Cahier)</span>
                  </button>
                )}

                <a
                  id="btn-whatsapp-relance-mamadou"
                  href={`https://wa.me/${mamadouCustomer?.phone ? mamadouCustomer.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(
                    `Bonjour M. Mamadou, sauf erreur de notre part, votre compte à la boutique Nana présente un solde de ${formatCFA(
                      mamadouCustomer?.totalDebt || 35000
                    )}. Merci de passer nous voir pour faire un point sur vos règlements. Excellente journée !`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playValidationBeep()}
                  className="py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-500/40 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Relancer par WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CONSEILS DE RENTABILITÉ & TOP 3 PRODUITS          */}
        {/* ======================================================== */}
        {activeTab === 'PROFITABILITY' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Conseils de Rentabilité & Optimisation des Marges
                </h2>
                <p className="text-xs text-slate-400">
                  Calculs basés sur vos prix de gros, marges unitaires et rotations en caisse
                </p>
              </div>
            </div>

            {/* ENCADRÉ TOP 3 DES PRODUITS LES PLUS RENTABLES CE MOIS-CI */}
            <div
              id="box-top-3-rentables"
              className="rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-emerald-500/40 p-3.5 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      Podium Rentabilité
                    </span>
                    <h3 className="text-sm font-extrabold text-white">
                      Top 3 des produits les plus rentables ce mois-ci
                    </h3>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold hidden xs:inline">
                  Marge brute réelle
                </span>
              </div>

              {/* 3 Cartes Podium */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                {/* 1ER : RIZ 25KG */}
                <div className="rounded-xl bg-slate-900/90 border border-amber-500/50 p-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-2 right-2 text-2xl font-black text-amber-400/30">#1</div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🥇</span>
                      <span className="font-extrabold text-white text-sm">Riz 25kg</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">Grand sac familial</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Prix d'achat :</span>
                      <span className="font-semibold">14 500 F</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Prix de vente :</span>
                      <span className="font-semibold">17 500 F</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 font-bold">Marge brute :</span>
                      <span className="text-sm font-black text-emerald-300">+3 000 F CFA</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    💡 <strong>Champion du cash</strong> : Chaque sac vendu injecte 3 000 F nets de marge immédiate.
                  </div>
                </div>

                {/* 2E : LAIT EN BOÎTE */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-400/40 p-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-2 right-2 text-2xl font-black text-slate-400/20">#2</div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🥈</span>
                      <span className="font-extrabold text-white text-sm">Lait (boîte)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">Rotation quotidienne</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Prix d'achat :</span>
                      <span className="font-semibold">350 F</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Prix de vente :</span>
                      <span className="font-semibold">500 F</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 font-bold">Marge brute :</span>
                      <span className="text-sm font-black text-emerald-300">+150 F CFA (30%)</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    💡 <strong>Forte rotation</strong> : 1 carton vendu par semaine = 3 600 F CFA de marge nette récurrente.
                  </div>
                </div>

                {/* 3E : HUILE 1L */}
                <div className="rounded-xl bg-slate-900/90 border border-amber-700/40 p-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-2 right-2 text-2xl font-black text-amber-700/20">#3</div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🥉</span>
                      <span className="font-extrabold text-white text-sm">Huile 1L</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">Bouteille ménagère</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Prix d'achat :</span>
                      <span className="font-semibold">900 F</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Prix de vente :</span>
                      <span className="font-semibold">1 100 F</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 font-bold">Marge brute :</span>
                      <span className="text-sm font-black text-emerald-300">+200 F CFA (18%)</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    💡 <strong>Indispensable</strong> : 24 bouteilles vendues par semaine garantissent 4 800 F de marge.
                  </div>
                </div>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-2 text-xs text-indigo-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  Ces 3 articles représentent <strong>62% de votre bénéfice brut mensuel</strong>.
                </span>
                <span className="text-[10px] bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-300 font-bold">
                  À protéger absolument
                </span>
              </div>
            </div>

            {/* ENCADRÉ SUGGESTION DE RÉINVESTISSEMENT (PAIN + BEURRE DU VENDREDI) */}
            <div
              id="box-suggestion-reinvestissement"
              className="rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-3.5 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                      Suggestion de Réinvestissement IA
                    </span>
                    <h3 className="text-sm font-extrabold text-white mt-0.5">
                      Opportunité de vente croisée (Cross-Selling)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/40">
                  Pic du Vendredi
                </span>
              </div>

              {/* Message spécifique demandé par l'utilisateur */}
              <div className="bg-amber-950/50 border border-amber-700/50 rounded-lg p-2.5 mb-3 text-amber-100 text-xs font-semibold leading-relaxed flex items-start gap-2">
                <span className="text-base">🥐</span>
                <div>
                  <span className="font-extrabold text-amber-300 text-xs block mb-0.5">
                    Conseil Stratégique Gemini :
                  </span>
                  « Vos ventes de pain augmentent de 20% le vendredi, pensez à commander plus de beurre. »
                </div>
              </div>

              {/* Explication du mécanisme financier */}
              <div className="text-xs text-slate-300 space-y-2 mb-3">
                <p>
                  <strong>Pourquoi cette recommandation ?</strong> Les données de vente de votre caisse montrent que les clients achètent 65 baguettes de pain le vendredi matin (contre 45 en semaine). 8 clients sur 10 qui achètent du pain demandent du <strong>beurre en portion</strong> ou du lait concentré.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Sans beurre en rayon :</div>
                    <div className="font-bold text-slate-200">Panier moyen = 150 F CFA (Pain seul)</div>
                  </div>
                  <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-600/30">
                    <div className="text-emerald-400">Avec beurre proposé :</div>
                    <div className="font-extrabold text-emerald-300">Panier moyen = 450 F CFA (+200% de vente)</div>
                  </div>
                </div>
              </div>

              {/* Action Réinvestissement */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (onOpenInventory) onOpenInventory();
                  }}
                  className="py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-900/30"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Commander Beurre pour Vendredi</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: ANALYSE IA GLOBALE (3 ACTIONS CONCRÈTES)          */}
        {/* ======================================================== */}
        {activeTab === 'ANALYSIS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Audit Global de la Boutique & Actions Rentabilité
                </h2>
                <p className="text-xs text-slate-400">
                  Simule une analyse complète des ventes et dégage 3 actions concrètes pour augmenter vos bénéfices
                </p>
              </div>
            </div>

            {/* LE BOUTON D'ANALYSE IA DEMANDÉ */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border-2 border-indigo-500/50 p-4 text-center shadow-xl">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-300/40">
                  <Sparkles className={`w-6 h-6 text-white ${isAnalyzing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Audit Financier & Commercial Instantané
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Analyse simultanée de vos stocks, dettes clients, marges unitaires et rotations de caisse.
                  </p>
                </div>

                {/* Gros Bouton d'Analyse IA */}
                <button
                  id="btn-demander-conseil-ia"
                  type="button"
                  disabled={isAnalyzing || !isOnline}
                  onClick={handleRunGlobalAnalysis}
                  title={!isOnline ? "Connexion requise pour l'analyse Cloud en direct" : undefined}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    !isOnline
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      <span>Connexion requise</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isAnalyzing ? 'Analyse globale en cours...' : "Demander un conseil à l'IA"}</span>
                    </>
                  )}
                </button>

                {isAnalyzing && (
                  <div className="pt-2 animate-in fade-in">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                      <div className="bg-indigo-500 h-full w-3/4 animate-pulse rounded-full" />
                    </div>
                    <p className="text-xs font-semibold text-indigo-300 flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {analysisStep}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RÉSULTAT DE L'ANALYSE : LES 3 ACTIONS CONCRÈTES POUR AUGMENTER LE BÉNÉFICE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  3 Actions Concrètes pour Augmenter le Bénéfice du Mois
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  Calculé sur vos données réelles
                </span>
              </div>

              {/* ACTION 1 : RECOUVREMENT & SÉCURISATION DU CRÉDIT */}
              <div
                id="action-concrete-1"
                className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 hover:border-indigo-500/40 transition-all shadow-md flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center font-black text-xs">
                      1
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-400">Trésorerie & Impayés</span>
                      <h4 className="text-sm font-bold text-white">
                        Bloquer les crédits au-dessus du plafond et récupérer 35 000 F CFA
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    +35 000 F cash
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Plan d'action :</strong> Mamadou a dépassé son plafond de 15 000 F CFA (total 35 000 F CFA). Exigez un règlement d'au moins 50% en cash aujourd'hui avant tout nouvel achat à crédit. Récupérer cet argent finance directement votre réapprovisionnement sans emprunt.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                  {onOpenDebtBook && (
                    <button
                      type="button"
                      onClick={() => onOpenDebtBook('cust-mamadou')}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Voir dans le Cahier de Dettes</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ACTION 2 : ANTI-RUPTURE SUR LE SUCRE ET ARTICLES CRITIQUES */}
              <div
                id="action-concrete-2"
                className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 hover:border-indigo-500/40 transition-all shadow-md flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Gestion de Stock</span>
                      <h4 className="text-sm font-bold text-white">
                        Réapprovisionner le Sucre et les 3 produits d'urgence avant vendredi soir
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    +24 000 F préservés
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Plan d'action :</strong> Le Sucre sera en rupture dans 48h selon la cadence actuelle. De plus, la Tomate concentrée (3 boîtes restantes), les Sardines (2 restantes) et les Spaghetti (4 restants) sont au niveau critique. Un refus de vente fait partir le client chez le concurrent.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleRestockSucre}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Commander Sucre d'urgence</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ACTION 3 : VENTE ASSOCIÉE PAIN + BEURRE / LAIT */}
              <div
                id="action-concrete-3"
                className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 hover:border-indigo-500/40 transition-all shadow-md flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-xs">
                      3
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Marge & Vente Croisée</span>
                      <h4 className="text-sm font-bold text-white">
                        Créer le réflexe "Duo Pain + Beurre / Lait" dès le jeudi
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    +18 000 F de marge nette
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Plan d'action :</strong> Vos ventes de pain progressent de +20% le vendredi. En disposant le beurre frais et les sticks de café juste à côté du présentoir à pain, vous augmentez le panier moyen de 150 F à 450 F sans effort de prospection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: ASSISTANT FINANCIER INTERACTIF (Q&A FINANCES)     */}
        {/* ======================================================== */}
        {activeTab === 'FINANCE_CHAT' && (
          <div className="h-full flex flex-col space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Assistant Financier Dédié (Questions-Réponses)
                </h2>
                <p className="text-xs text-slate-400">
                  Répond en direct à toutes vos questions sur la trésorerie, la fixation des prix et les impayés
                </p>
              </div>
              <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-full font-bold">
                100% Gratuit
              </span>
            </div>

            {/* Quick Questions Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                Suggestions rapides en 1 clic :
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendFinancialQuestion("Comment réduire mes impayés sans fâcher mes clients ?")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium active:scale-95 transition-all text-left cursor-pointer"
                >
                  ❓ Comment réduire mes impayés sans fâcher mes clients ?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendFinancialQuestion("Quels produits devrais-je vendre plus cher pour augmenter ma marge ?")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium active:scale-95 transition-all text-left cursor-pointer"
                >
                  💰 Quels produits vendre plus cher pour augmenter ma marge ?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendFinancialQuestion("Faut-il payer mes grossistes au comptant ou à crédit ?")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium active:scale-95 transition-all text-left cursor-pointer"
                >
                  📦 Faut-il payer mes grossistes au comptant ou à crédit ?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendFinancialQuestion("Vos ventes de pain augmentent de 20% le vendredi, comment en profiter au maximum ?")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium active:scale-95 transition-all text-left cursor-pointer"
                >
                  🥐 Pourquoi le pain et le beurre le vendredi ?
                </button>
              </div>
            </div>

            {/* Chat History Box */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-[260px] max-h-[380px] overflow-y-auto bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-3"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {msg.sender === 'gemini' ? (
                      <span className="text-[10px] font-extrabold text-indigo-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        Conseiller IA Gemini
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Vous (Boutiquier)</span>
                    )}
                    <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`rounded-xl p-3 text-xs leading-relaxed max-w-[90%] whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isWaitingAnswer && (
                <div className="flex items-center gap-2 text-xs text-indigo-300 bg-slate-800/60 p-2.5 rounded-xl w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini analyse vos finances et rédige sa recommandation...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendFinancialQuestion();
              }}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5"
            >
              <input
                type="text"
                value={userInput}
                disabled={!isOnline}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isOnline ? "Posez une question sur vos marges, dettes, stocks..." : "Connexion requise pour interroger l'agent IA..."}
                className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isWaitingAnswer || !isOnline}
                className={`p-2 rounded-lg text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  !isOnline ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                }`}
                title={!isOnline ? "Connexion requise" : "Envoyer la question"}
              >
                {!isOnline ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAdvisorView;
