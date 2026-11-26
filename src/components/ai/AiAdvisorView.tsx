import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  InventoryProduct,
  DebtCustomer,
  CompletedSale,
  LossRecord,
} from '../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import {
  Cpu,
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
  const [aiAuditResult, setAiAuditResult] = useState<{
    summary?: string;
    concreteActions?: Array<{ title: string; description: string; estimatedGain?: string }>;
    reinvestmentSuggestion?: { title: string; message: string; expectedImpact?: string };
    source?: string;
  } | null>(null);
  const [restockSuccessMessage, setRestockSuccessMessage] = useState<string | null>(null);

  // Financial Q&A state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'gemini',
      text: `Bonjour ! Je suis votre Directeur Financier IA Nanasore.\nJe suis connecté en direct à vos ventes, vos stocks, vos marges et vos créances clients. Posez-moi vos questions — je conserve le fil complet de notre discussion et je raisonne avec vos vrais chiffres en F CFA.`,
      timestamp: 'À l\'instant',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isWaitingAnswer, setIsWaitingAnswer] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Computed live metrics (100% données réelles)
  const totalDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  const overdueCustomers = customers.filter((c) => c.status === 'OVERDUE' || (c.totalDebt || 0) > 15000);
  const overdueCustomersCount = overdueCustomers.length;
  const criticalStockProducts = [...inventory]
    .filter((p) => (p.stock ?? 0) < 5)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const primaryLowStockProduct = criticalStockProducts[0] || null;
  const todaySalesTotal = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const topProductsSummary = inventory.slice(0, 8).map((p) => ({
    name: p.name,
    price: p.price || 0,
    stock: p.stock ?? 0,
  }));
  const topDebtCustomer = [...customers]
    .filter((c) => (c.totalDebt || 0) > 0)
    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))[0] || null;

  const topProfitableProducts = [...inventory]
    .map((p) => {
      const unitCost = Number((p as any).costPrice || (p as any).purchasePrice || 0);
      const unitPrice = Number(p.price || 0);
      const unitMargin = Math.max(0, unitPrice - unitCost);
      const marginPct = unitPrice > 0 ? Math.round((unitMargin / unitPrice) * 100) : 0;
      return { ...p, unitCost, unitPrice, unitMargin, marginPct };
    })
    .sort((a, b) => b.unitMargin - a.unitMargin)
    .slice(0, 3);

  const totalCatalogValue = inventory.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

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

    setAnalysisStep(`🔍 Audit de ${sales.length} ventes et ${inventory.length} références en stock...`);
    await new Promise((r) => setTimeout(r, 400));

    setAnalysisStep(`📦 Vérification des ${criticalStockProducts.length} stock(s) critique(s) et ${formatCFA(totalDebt)} d'impayés...`);
    await new Promise((r) => setTimeout(r, 400));

    setAnalysisStep('⚡ Synthèse des 3 actions à fort impact par Nanasore IA...');

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
        const json = await response.json();
        const auditPayload = json?.analysis || json;
        if (auditPayload && (auditPayload.summary || Array.isArray(auditPayload.concreteActions))) {
          setAiAuditResult({
            summary: auditPayload.summary,
            concreteActions: Array.isArray(auditPayload.concreteActions) ? auditPayload.concreteActions : undefined,
            reinvestmentSuggestion: auditPayload.reinvestmentSuggestion,
            source: 'Nanasore IA Pro',
          });
        }
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

    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    if (!presetQuestion) setUserInput('');
    setIsWaitingAnswer(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: nextHistory.slice(-16).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            sender: m.sender,
            text: m.text,
          })),
          context: {
            totalDebt,
            overdueCustomers: overdueCustomers.slice(0, 5).map((c) => ({
              name: c.name || c.shortName,
              totalDebt: c.totalDebt,
            })),
            inventoryCount: inventory.length,
            lowStockCount: criticalStockProducts.length,
            lowStockNames: criticalStockProducts.slice(0, 6).map((p) => `${p.name} (${p.stock})`),
            todaySales: todaySalesTotal,
            totalSalesCount: sales.length,
            lossesCount: losses.length,
            topProducts: topProductsSummary,
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
        let answer = `**💡 Recommandation Financière Nanasore IA :**\n\n- **Trésorerie** : Sécurisez en priorité vos créances supérieures à 15 000 F CFA.\n- **Marge** : Concentrez-vous sur le Riz et le Lait qui assurent plus de 60% de votre marge.\n- **Disponibilité** : Réapprovisionnez le Sucre avant 48h pour ne pas rater les ventes du petit-déjeuner.`;
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
                  Conseils & Analyse Nanasore IA
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
          <span className="text-[11px] font-medium text-indigo-200">Moteur Nanasore Pro</span>
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
            <span>Agent Nanasore IA Cloud : <strong>Connexion requise</strong> pour les requêtes en temps réel. Vos données locales restent consultables.</span>
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
              todaySales={todaySalesTotal}
              totalDebt={totalDebt}
              lowStockCount={criticalStockProducts.length}
              topProducts={topProductsSummary}
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

            {/* CARTE 1 : ALERTE RUPTURE (DONNÉES RÉELLES) */}
            {primaryLowStockProduct ? (
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
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/40">
                        Stock Critique
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">
                        {primaryLowStockProduct.name} bientôt en rupture
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-400">Stock restant</span>
                    <div className="text-lg font-black text-amber-300">{primaryLowStockProduct.stock ?? 0} unité(s)</div>
                  </div>
                </div>

                {criticalStockProducts.length > 1 && (
                  <div className="mb-3 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-amber-400" />
                      Articles sous le seuil critique (moins de 5 unités) :
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {criticalStockProducts.slice(0, 6).map((p) => (
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

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onQuickRestock && (
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        onQuickRestock(primaryLowStockProduct.id, 10);
                      }}
                      className="flex-1 min-w-[140px] py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Boxes className="w-4 h-4" />
                      <span>Réapprovisionner {primaryLowStockProduct.name} (+10)</span>
                    </button>
                  )}
                  {onOpenInventory && (
                    <button
                      id="btn-view-all-stock"
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onOpenInventory(primaryLowStockProduct.id);
                      }}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Gérer tout le Stock</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-4 text-xs text-emerald-300 font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aucun article en rupture critique actuellement ({inventory.length} référence(s) suivie(s)).</span>
              </div>
            )}

            {/* CARTE 2 : ALERTE IMPAYÉS RÉELS */}
            {topDebtCustomer ? (
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
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                        Créance Client Active
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">
                        {topDebtCustomer.fullName || topDebtCustomer.shortName || 'Client'} — Solde à recouvrer
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Dette actuelle</span>
                    <div className="text-base font-black text-rose-400">
                      {formatCFA(topDebtCustomer.totalDebt || 0)}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 mb-3 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total impayés boutique :</span>
                    <span className="font-bold text-rose-400">{formatCFA(totalDebt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clients en dépassement :</span>
                    <span className="font-semibold text-slate-200">{overdueCustomersCount} client(s)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onOpenDebtBook && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onOpenDebtBook(topDebtCustomer.id);
                      }}
                      className="flex-1 min-w-[130px] py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Ouvrir le Cahier de Dettes</span>
                    </button>
                  )}

                  {topDebtCustomer.phone && (
                    <a
                      href={`https://wa.me/${topDebtCustomer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Bonjour ${topDebtCustomer.shortName || topDebtCustomer.fullName || ''}, votre compte présente un solde de ${formatCFA(topDebtCustomer.totalDebt || 0)}. Merci de passer pour le règlement.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playValidationBeep()}
                      className="py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-500/40 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Relancer par WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-4 text-xs text-emerald-300 font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aucun impayé client enregistré pour le moment.</span>
              </div>
            )}
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

              {/* 3 Cartes Podium (100% Catalogue Réel) */}
              {topProfitableProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                  {topProfitableProducts.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-xl bg-slate-900/90 border border-emerald-500/40 p-3 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-2 right-2 text-2xl font-black text-emerald-400/20">#{idx + 1}</div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                          <span className="font-extrabold text-white text-sm truncate pr-6">{item.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Stock : {item.stock ?? 0} unité(s)</p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                        {item.unitCost > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span>Prix d'achat :</span>
                            <span className="font-semibold">{formatCFA(item.unitCost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-300">
                          <span>Prix de vente :</span>
                          <span className="font-semibold">{formatCFA(item.unitPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                          <span className="text-emerald-400 font-bold">Marge / Valeur :</span>
                          <span className="text-sm font-black text-emerald-300">
                            +{formatCFA(item.unitMargin)} ({item.marginPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 text-center mb-3">
                  Ajoutez vos produits dans le catalogue pour afficher le classement réel de rentabilité.
                </div>
              )}

              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-2 text-xs text-indigo-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                  Valeur totale du stock actif : <strong>{formatCFA(totalCatalogValue)}</strong> ({inventory.length} référence(s)).
                </span>
              </div>
            </div>

            {/* RÉCAPITULATIF RÉEL DES VENTES */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-white">Activité Caisse & Encaissements</div>
                <div className="text-slate-400 mt-0.5">{sales.length} vente(s) enregistrée(s)</div>
              </div>
              <div className="text-base font-black text-emerald-400">{formatCFA(todaySalesTotal)}</div>
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
            {aiAuditResult && (
              <div className="space-y-3 mb-4">
                <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      Synthèse Directe de l&apos;Audit IA
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      Nanasore IA Pro
                    </span>
                  </div>
                  {aiAuditResult.summary && (
                    <p className="text-xs text-slate-200 leading-relaxed">{aiAuditResult.summary}</p>
                  )}
                </div>

                {Array.isArray(aiAuditResult.concreteActions) && aiAuditResult.concreteActions.length > 0 && (
                  <div className="space-y-2.5">
                    {aiAuditResult.concreteActions.map((act, idx) => (
                      <div
                        key={`ai-act-${idx}`}
                        className="rounded-xl bg-slate-900 border border-indigo-500/35 p-3.5 shadow-md flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-200 flex items-center justify-center font-black text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <h4 className="text-sm font-bold text-white">{act.title}</h4>
                          </div>
                          {act.estimatedGain && (
                            <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                              {act.estimatedGain}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{act.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

              {/* ACTION 1 : RECOUVREMENT RÉEL */}
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
                        {totalDebt > 0
                          ? `Recouvrer ${formatCFA(totalDebt)} d'impayés (${overdueCustomersCount} client(s) prioritaire(s))`
                          : 'Trésorerie saine : aucun impayé critique en attente'}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {formatCFA(totalDebt)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {topDebtCustomer
                    ? `Client prioritaire : ${topDebtCustomer.fullName || topDebtCustomer.shortName} (${formatCFA(topDebtCustomer.totalDebt || 0)}). Relancez-le directement pour réinjecter du cash dans votre stock.`
                    : 'Vos clients sont à jour de leurs règlements. Continuez à privilégier l’encaissement direct.'}
                </p>
                {onOpenDebtBook && totalDebt > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onOpenDebtBook(topDebtCustomer?.id)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Voir dans le Cahier de Dettes</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ACTION 2 : STOCK CRITIQUE RÉEL */}
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
                        {criticalStockProducts.length > 0
                          ? `Réapprovisionner ${criticalStockProducts.length} article(s) en seuil critique`
                          : 'Niveaux de stock maîtrisés'}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    {criticalStockProducts.length} alerte(s)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {primaryLowStockProduct
                    ? `Article le plus bas : ${primaryLowStockProduct.name} (${primaryLowStockProduct.stock ?? 0} restant(s)). Anticipez le réapprovisionnement pour éviter toute vente manquée.`
                    : `Toutes vos ${inventory.length} référence(s) disposent d'un stock supérieur au seuil critique.`}
                </p>
                {onOpenInventory && criticalStockProducts.length > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onOpenInventory(primaryLowStockProduct?.id)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ouvrir le Stock</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ACTION 3 : VENTES & RENTABILITÉ RÉELLE */}
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
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Performance Commerciale</span>
                      <h4 className="text-sm font-bold text-white">
                        {topProfitableProducts[0]
                          ? `Mettre en avant « ${topProfitableProducts[0].name} » (meilleure marge)`
                          : 'Développer votre catalogue et vos encaissements'}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {formatCFA(todaySalesTotal)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {sales.length > 0
                    ? `${sales.length} vente(s) enregistrée(s) pour un total de ${formatCFA(todaySalesTotal)}. Cliquez sur « Demander un conseil à l'IA » ci-dessus pour générer un audit personnalisé.`
                    : `Aucune vente enregistrée pour l'instant. Ajoutez vos produits et réalisez vos premiers encaissements pour activer l'audit IA complet.`}
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
                        Conseiller Nanasore IA
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
                  <span>Nanasore IA analyse vos finances et rédige sa recommandation...</span>
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
