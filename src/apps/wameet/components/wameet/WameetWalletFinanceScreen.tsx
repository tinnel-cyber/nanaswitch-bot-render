import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  Lock,
  Sparkles,
  TrendingUp,
  Share2,
  Radio,
  Crown,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  X,
  CreditCard,
  Building2,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import {
  playTapBeep,
  playValidationBeep,
  playCashChime,
  playCancelSound,
  formatCFA
} from '../../../../utils/audio';

export interface WameetWalletFinanceScreenProps {
  onBack?: () => void;
  initialBalance?: number;
  className?: string;
}

export interface CreatorEarningStats {
  microRelayEarnings: number; // Gagné via Affiliation (Micro-relais)
  liveShoppingEarnings: number; // Revenus Lives
  vipRoomsEarnings: number; // Salons & Salles VIP
  mysteryGiftsEarnings: number; // Pourboires & Cadeaux Mystères
  thisMonthTotal: number;
  growthPercentage: number;
}

export interface EscrowHoldItem {
  id: string;
  orderNumber: string;
  buyerName: string;
  itemTitle: string;
  amountFcfa: number;
  status: 'locked_in_transit' | 'awaiting_confirmation' | 'ready_to_release';
  deliveryPartner: string;
  daysRemaining: number;
  date: string;
}

export interface WithdrawalMethod {
  id: string;
  operator: 'Wave' | 'Orange Money' | 'MTN MoMo' | 'Moov Flooz' | 'Virement Bancaire';
  operatorColor: string;
  accountNumber: string;
  holderName: string;
  isDefault: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'recharge' | 'withdrawal' | 'micro_relay' | 'live_shopping' | 'vip_room' | 'escrow_release';
  title: string;
  subtitle: string;
  amountFcfa: number;
  isCredit: boolean;
  timestamp: string;
  status: 'completed' | 'pending' | 'escrow_locked';
  refNumber: string;
}

/**
 * PROMPT 36 : L'Écran "Portefeuille & Monétisation" (Le Centre Financier Wameet)
 * Wameet Creator Fund, adapté pour S et le Mobile Money.
 * Offre une confiance bancaire absolue conforme aux standards financiers UEMOA / OHADA.
 */
export const WameetWalletFinanceScreen: React.FC<WameetWalletFinanceScreenProps> = ({
  onBack,
  initialBalance = 145000,
  className = ''
}) => {
  // 1. États Financiers Principaux
  const [balance, setBalance] = useState<number>(initialBalance);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Statistiques Creator Fund
  const [creatorStats] = useState<CreatorEarningStats>({
    microRelayEarnings: 48500,
    liveShoppingEarnings: 62000,
    vipRoomsEarnings: 24500,
    mysteryGiftsEarnings: 10000,
    thisMonthTotal: 145000,
    growthPercentage: 32.4
  });

  // 3. Transactions en Escrow (Séquestre de livraison)
  const [escrowList, setEscrowList] = useState<EscrowHoldItem[]>([
    {
      id: 'esc-1',
      orderNumber: '#NW-9824',
      buyerName: 'Aïcha Coulibaly',
      itemTitle: 'Sneakers Édition Limitée Abidjan',
      amountFcfa: 27500,
      status: 'locked_in_transit',
      deliveryPartner: 'NaNa Swarm Moto #12',
      daysRemaining: 1,
      date: 'Aujourd’hui à 11:20'
    },
    {
      id: 'esc-2',
      orderNumber: '#NW-9801',
      buyerName: 'Mamadou Diallo',
      itemTitle: 'Sac Cuir Artisanal Dakar',
      amountFcfa: 15000,
      status: 'awaiting_confirmation',
      deliveryPartner: 'Colis Reçu - En attente validation client',
      daysRemaining: 2,
      date: 'Hier à 16:45'
    }
  ]);

  // 4. Méthodes de Retrait Mobile Money (S)
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([
    {
      id: 'wm-1',
      operator: 'Wave',
      operatorColor: 'bg-cyan-500',
      accountNumber: '+225 07 48 92 10',
      holderName: 'Ibrahim Traoré',
      isDefault: true
    },
    {
      id: 'wm-2',
      operator: 'Orange Money',
      operatorColor: 'bg-orange-500',
      accountNumber: '+225 07 11 34 56',
      holderName: 'Ibrahim Traoré',
      isDefault: false
    },
    {
      id: 'wm-3',
      operator: 'MTN MoMo',
      operatorColor: 'bg-yellow-500',
      accountNumber: '+225 05 99 88 77',
      holderName: 'Ibrahim Traoré',
      isDefault: false
    }
  ]);

  // 5. Historique des Transactions Récentes
  const [transactions, setTransactions] = useState<WalletTransaction[]>([
    {
      id: 'tx-1',
      type: 'micro_relay',
      title: 'Commission Micro-relais Wameet',
      subtitle: 'Partage Wameet converti • Boutique #B-402',
      amountFcfa: 4500,
      isCredit: true,
      timestamp: 'Il y a 25 min',
      status: 'completed',
      refNumber: 'WMT-REL-9921'
    },
    {
      id: 'tx-2',
      type: 'live_shopping',
      title: 'Vente Directe Flash Live',
      subtitle: 'Session "Tech & Accessoires" avec 240 spectateurs',
      amountFcfa: 18500,
      isCredit: true,
      timestamp: 'Aujourd’hui à 02:15',
      status: 'completed',
      refNumber: 'WMT-LIV-8812'
    },
    {
      id: 'tx-3',
      type: 'vip_room',
      title: 'Pass Mensuel Salon VIP Affaires',
      subtitle: 'Abonné @koffi_invest • Coaching 1-to-1',
      amountFcfa: 10000,
      isCredit: true,
      timestamp: 'Hier à 18:40',
      status: 'completed',
      refNumber: 'WMT-VIP-3319'
    },
    {
      id: 'tx-4',
      type: 'withdrawal',
      title: 'Retrait Instantané Wave Mobile Money',
      subtitle: 'Vers +225 07 48 92 10 • Validé Wameet',
      amountFcfa: 25000,
      isCredit: false,
      timestamp: '14 Oct à 14:10',
      status: 'completed',
      refNumber: 'WMT-WTH-0045'
    },
    {
      id: 'tx-5',
      type: 'recharge',
      title: 'Rechargement Orange Money',
      subtitle: 'Approvisionnement Wallet personnel',
      amountFcfa: 50000,
      isCredit: true,
      timestamp: '12 Oct à 09:30',
      status: 'completed',
      refNumber: 'WMT-RCH-7789'
    }
  ]);

  // 6. Modales d'actions
  const [showRechargeModal, setShowRechargeModal] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(25000);
  const [rechargeOperator, setRechargeOperator] = useState<string>('Wave');
  const [rechargePhone, setRechargePhone] = useState<string>('+225 07 48 92 10');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(20000);
  const [selectedWithdrawMethodId, setSelectedWithdrawMethodId] = useState<string>('wm-1');
  const [withdrawPin, setWithdrawPin] = useState<string>('');

  const [showEscrowModal, setShowEscrowModal] = useState<boolean>(false);
  const [showMethodsModal, setShowMethodsModal] = useState<boolean>(false);

  // Nouvel ajout de méthode Mobile Money
  const [newMethodOperator, setNewMethodOperator] = useState<WithdrawalMethod['operator']>('Wave');
  const [newMethodPhone, setNewMethodPhone] = useState<string>('');
  const [newMethodHolder, setNewMethodHolder] = useState<string>('Ibrahim Traoré');
  const [isAddingMethod, setIsAddingMethod] = useState<boolean>(false);

  // Filtre d'historique
  const [historyFilter, setHistoryFilter] = useState<'all' | 'earnings' | 'withdrawals'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBack = () => {
    playTapBeep();
    if (onBack) onBack();
    else if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  };

  const handleRefreshBalance = () => {
    playTapBeep();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Solde synchronisé en direct avec Wameet Core API.');
    }, 800);
  };

  const handleCopyAccountRef = () => {
    playValidationBeep();
    if (navigator.clipboard) {
      navigator.clipboard.writeText('WMT-8839-4021-9921');
    }
    showToast('Identifiant bancaire virtuel Wameet copié !');
  };

  // Calcul du montant total bloqué en Escrow
  const totalEscrowLocked = escrowList.reduce((acc, item) => acc + item.amountFcfa, 0);

  // Soumission Rechargement
  const handleConfirmRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (rechargeAmount <= 0) return;
    setIsProcessingAction(true);
    playTapBeep();

    setTimeout(() => {
      setIsProcessingAction(false);
      setShowRechargeModal(false);
      const newBal = balance + rechargeAmount;
      setBalance(newBal);
      playCashChime();

      // Ajouter à l'historique
      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'recharge',
        title: `Rechargement ${rechargeOperator}`,
        subtitle: `Compte Wameet crédité via ${rechargePhone}`,
        amountFcfa: rechargeAmount,
        isCredit: true,
        timestamp: 'À l’instant',
        status: 'completed',
        refNumber: `WMT-RCH-${Math.floor(1000 + Math.random() * 9000)}`
      };
      setTransactions([newTx, ...transactions]);
      showToast(`+${rechargeAmount.toLocaleString('fr-FR')} FCFA ajoutés avec succès !`);
    }, 1200);
  };

  // Soumission Retrait
  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) return;
    if (withdrawAmount > balance) {
      playCancelSound();
      showToast('Solde insuffisant pour ce montant de retrait.');
      return;
    }
    if (withdrawPin.length !== 6) {
      playCancelSound();
      showToast('Veuillez saisir votre code PIN 2FA Wameet à 6 chiffres.');
      return;
    }

    setIsProcessingAction(true);
    playTapBeep();

    setTimeout(() => {
      setIsProcessingAction(false);
      setShowWithdrawModal(false);
      setWithdrawPin('');
      const newBal = balance - withdrawAmount;
      setBalance(newBal);
      playValidationBeep();

      const method = withdrawalMethods.find((m) => m.id === selectedWithdrawMethodId);

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'withdrawal',
        title: `Retrait Instantané ${method?.operator || 'Mobile Money'}`,
        subtitle: `Transféré vers ${method?.accountNumber || 'numéro associé'}`,
        amountFcfa: withdrawAmount,
        isCredit: false,
        timestamp: 'À l’instant',
        status: 'completed',
        refNumber: `WMT-WTH-${Math.floor(1000 + Math.random() * 9000)}`
      };
      setTransactions([newTx, ...transactions]);
      showToast(`Retrait de ${withdrawAmount.toLocaleString('fr-FR')} FCFA envoyé avec succès !`);
    }, 1300);
  };

  // Ajout d'une nouvelle méthode de retrait
  const handleAddNewMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodPhone.trim()) return;

    playValidationBeep();
    const colors: Record<WithdrawalMethod['operator'], string> = {
      Wave: 'bg-cyan-500',
      'Orange Money': 'bg-orange-500',
      'MTN MoMo': 'bg-yellow-500',
      'Moov Flooz': 'bg-blue-600',
      'Virement Bancaire': 'bg-emerald-600'
    };

    const newM: WithdrawalMethod = {
      id: `wm-${Date.now()}`,
      operator: newMethodOperator,
      operatorColor: colors[newMethodOperator],
      accountNumber: newMethodPhone,
      holderName: newMethodHolder || 'Ibrahim Traoré',
      isDefault: withdrawalMethods.length === 0
    };

    setWithdrawalMethods([...withdrawalMethods, newM]);
    setNewMethodPhone('');
    setIsAddingMethod(false);
    showToast(`Numéro ${newMethodOperator} enregistré avec succès.`);
  };

  const handleSetDefaultMethod = (id: string) => {
    playTapBeep();
    setWithdrawalMethods(
      withdrawalMethods.map((m) => ({
        ...m,
        isDefault: m.id === id
      }))
    );
    showToast('Méthode de retrait par défaut mise à jour.');
  };

  const handleDeleteMethod = (id: string) => {
    playTapBeep();
    if (withdrawalMethods.length <= 1) {
      showToast('Vous devez conserver au moins un numéro de retrait actif.');
      return;
    }
    setWithdrawalMethods(withdrawalMethods.filter((m) => m.id !== id));
    showToast('Méthode de retrait supprimée.');
  };

  // Filtrage transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (historyFilter === 'earnings') {
      return tx.type === 'micro_relay' || tx.type === 'live_shopping' || tx.type === 'vip_room';
    }
    if (historyFilter === 'withdrawals') {
      return tx.type === 'withdrawal';
    }
    return true;
  });

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] selection:bg-emerald-500/20 selection:text-emerald-700 ${className}`}
    >
      {/* Toast de notification flottante avec accélération matérielle */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle transform-gpu will-change-transform">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. HEADER NAVIGATION (44x44 TAP TARGET & SAFE AREA TOP)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* FIXED: Tap Target 44x44px standard */}
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <span>Portefeuille & Monétisation</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Wameet Pay
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Centre financier créateur & garanties bancaires OHADA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FIXED: Zone tactile standard 44x44px */}
          <button
            type="button"
            onClick={handleRefreshBalance}
            className={`w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center ${
              isRefreshing ? 'animate-spin text-emerald-500' : ''
            }`}
            title="Actualiser le solde"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* =====================================================================
            DIRECTIVE PROMPT 36 : LA CARTE DE SOLDE (BALANCECARD)
            bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl
           ===================================================================== */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-slate-700/60">
          {/* Effets de lueurs géométriques et filigrane de sécurité */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Rangée Supérieure : Puce EMV & Type de compte */}
          <div className="flex items-center justify-between relative z-10 mb-6">
            <div className="flex items-center gap-2.5">
              {/* Puce de carte bancaire dorée stylisée */}
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full border border-amber-600/40 rounded flex flex-col justify-around p-0.5 opacity-80">
                  <div className="h-0.5 bg-amber-800/40 rounded" />
                  <div className="h-0.5 bg-amber-800/40 rounded" />
                </div>
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wameet Platinum</span>
              </span>
            </div>

            {/* Bouton masquage œil */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowBalance(!showBalance);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title={showBalance ? 'Masquer le solde' : 'Afficher le solde'}
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Affichage du Solde Principal */}
          <div className="relative z-10 mb-6">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Solde disponible</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Instantané
              </span>
            </div>

            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {showBalance ? balance.toLocaleString('fr-FR') : '••••••••'}
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-400">FCFA</span>
            </div>

            {/* Numéro de compte virtuel Wameet (IBAN Afrique) */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono tracking-wider">
                ID Compte : WMT-8839 •••• 4021
              </span>
              <button
                type="button"
                onClick={handleCopyAccountRef}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copier l'identifiant"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* DEUX GROS BOUTONS D'ACTION : "RECHARGER" (Flèche bas) & "RETIRER" (Flèche haut) */}
          <div className="grid grid-cols-2 gap-3 relative z-10 pt-2 border-t border-slate-700/60">
            {/* BOUTON RECHARGER (Flèche vers le bas) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowRechargeModal(true);
              }}
              className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-white" />
              </div>
              <span>Recharger</span>
            </button>

            {/* BOUTON RETIRER (Flèche vers le haut) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowWithdrawModal(true);
              }}
              className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all backdrop-blur-sm cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <span>Retirer</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 36 : SECTION "MES GAINS DE CRÉATEUR"
            (Wameet Creator Fund pour l'Afrique)
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mes Gains de Créateur
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              <TrendingUp className="w-3 h-3" />
              <span>+{creatorStats.growthPercentage}% ce mois</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* STAT 1 : Gagné via Affiliation (Micro-relais) */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/40">
                  Micro-relais
                </span>
              </div>
              <h4 className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gagné via Affiliation (Micro-relais)
              </h4>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {creatorStats.microRelayEarnings.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-blue-600">FCFA</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Commissions directes sur partages Wameet & statuts
              </p>
            </div>

            {/* STAT 2 : Revenus Lives */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-red-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/40">
                  Live Shopping
                </span>
              </div>
              <h4 className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Revenus Lives
              </h4>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {creatorStats.liveShoppingEarnings.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-red-600">FCFA</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Ventes flash en direct & pourboires spectateurs
              </p>
            </div>

            {/* STAT 3 (Complémentaire) : Salons & Salles VIP */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  <Crown className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/40">
                  Abonnements
                </span>
              </div>
              <h4 className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Salons & Salles VIP
              </h4>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {creatorStats.vipRoomsEarnings.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-amber-600">FCFA</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Pass mensuels LMS et accès Business Lounge
              </p>
            </div>

            {/* STAT 4 (Complémentaire) : Total Cumulé Mois */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  BCEAO Conforme
                </span>
              </div>
              <h4 className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                Total Monétisation du Mois
              </h4>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {creatorStats.thisMonthTotal.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">FCFA</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Fonds entièrement déblocables et virables en Mobile Money
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 36 : SECTION "SÉCURITÉ FINANCIÈRE"
            - Transactions en Escrow (Smart Séquestre de livraison)
            - Méthodes de retrait (Mobile Money via Wameet)
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sécurité Financière & Garanties
            </h3>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* CARTE 1 : TRANSACTIONS EN ESCROW (SMART SÉQUESTRE) */}
            <div
              onClick={() => {
                playTapBeep();
                setShowEscrowModal(true);
              }}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Transactions en Escrow (Séquestre)
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40">
                      {escrowList.length} en cours
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    <strong className="text-amber-600 font-bold">
                      {totalEscrowLocked.toLocaleString('fr-FR')} FCFA
                    </strong>{' '}
                    sécurisés sous séquestre jusqu'à livraison finale par NaNa Swarm.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* CARTE 2 : MÉTHODES DE RETRAIT (MOBILE MONEY VIA WAMEET) */}
            <div
              onClick={() => {
                playTapBeep();
                setShowMethodsModal(true);
              }}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Méthodes de retrait
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300/40">
                      {withdrawalMethods.length} configurés
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Gérez vos numéros Wave, Orange Money et MTN MoMo via la passerelle Wameet.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400">
                  Défaut : {withdrawalMethods.find((m) => m.isDefault)?.operator || 'Wave'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION : HISTORIQUE DES TRANSACTIONS & REÇUS WAMEET
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Historique des Transactions
            </h3>

            {/* Filtres rapides */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setHistoryFilter('all');
                }}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  historyFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setHistoryFilter('earnings');
                }}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  historyFilter === 'earnings'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Gains
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setHistoryFilter('withdrawals');
                }}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  historyFilter === 'withdrawals'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Retraits
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => {
                  playTapBeep();
                  showToast(`Réf: ${tx.refNumber} • Validé par Wameet`);
                }}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                      tx.isCredit
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tx.isCredit ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {tx.title}
                    </h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      {tx.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">{tx.timestamp}</span>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                        {tx.refNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-black ${
                      tx.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.isCredit ? '+' : '-'}
                    {tx.amountFcfa.toLocaleString('fr-FR')} FCFA
                  </span>
                  <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Succès</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================================
            FOOTER DE CONFIANCE BANCAIRE (OHADA & BCEAO)
           ===================================================================== */}
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sécurité Bancaire Wameet & Cadre Juridique OHADA</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
            Les fonds des séquestres sont cantonnés sur des comptes d'établissements de monnaie
            électronique agréés par la BCEAO. Vos retraits sont instantanés et protégés par 2FA.
          </p>
        </div>
      </div>

      {/* =====================================================================
          MODALE 1 : RECHARGER LE SOLDE (MOBILE MONEY WAMEET)
         ===================================================================== */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Recharger mon Solde Wameet</h3>
                  <p className="text-[10px] text-slate-400">Paiement Mobile Money via Wameet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRecharge} className="space-y-4">
              {/* Choix des montants rapides */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Montant à recharger
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {[5000, 10000, 25000, 50000, 100000, 250000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRechargeAmount(amt);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                        rechargeAmount === amt
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {amt.toLocaleString('fr-FR')} F
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    step={100}
                    required
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Choix de l'opérateur */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Opérateur de Débit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Wave', color: 'border-cyan-500 text-cyan-600 bg-cyan-50/30' },
                    { name: 'Orange Money', color: 'border-orange-500 text-orange-600 bg-orange-50/30' },
                    { name: 'MTN MoMo', color: 'border-yellow-500 text-yellow-600 bg-yellow-50/30' },
                    { name: 'Moov Flooz', color: 'border-blue-500 text-blue-600 bg-blue-50/30' }
                  ].map((op) => (
                    <button
                      key={op.name}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRechargeOperator(op.name);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        rechargeOperator === op.name
                          ? `${op.color} border-2 shadow-xs`
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{op.name}</span>
                      {rechargeOperator === op.name && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numéro de téléphone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Numéro Mobile Money de débit
                </label>
                <input
                  type="tel"
                  required
                  value={rechargePhone}
                  onChange={(e) => setRechargePhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction || rechargeAmount <= 0}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md flex-1 flex items-center justify-center gap-1.5"
                >
                  {isProcessingAction ? (
                    <span>Validation Wameet...</span>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Confirmer ({rechargeAmount.toLocaleString('fr-FR')} F)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE 2 : RETIRER DES FONDS (VERS MOBILE MONEY WAMEET)
         ===================================================================== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Retirer mes Fonds vers Mobile Money</h3>
                  <p className="text-[10px] text-slate-400">Virement instantané Wameet Direct Cash</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmWithdraw} className="space-y-4">
              {/* Solde disponible rappel */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">Solde disponible :</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {balance.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Montant à retirer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Montant du retrait
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={500}
                    max={balance}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-slate-400">Frais de retrait Wameet : 0 FCFA</span>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balance)}
                    className="text-[10px] font-bold text-purple-600 hover:underline"
                  >
                    Retirer la totalité
                  </button>
                </div>
              </div>

              {/* Sélection du compte de réception */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Compte de réception
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {withdrawalMethods.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        playTapBeep();
                        setSelectedWithdrawMethodId(m.id);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedWithdrawMethodId === m.id
                          ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg ${m.operatorColor} text-white flex items-center justify-center text-[10px] font-black`}
                        >
                          {m.operator.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{m.operator}</div>
                          <div className="text-[10px] text-slate-400">{m.accountNumber}</div>
                        </div>
                      </div>
                      {selectedWithdrawMethodId === m.id && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Code PIN 2FA Wameet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Code PIN 2FA Wameet (Sécurité)</span>
                  <span className="text-[10px] text-slate-400">6 chiffres</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  pattern="[0-9]{6}"
                  value={withdrawPin}
                  onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-base font-black py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    isProcessingAction ||
                    withdrawAmount <= 0 ||
                    withdrawAmount > balance ||
                    withdrawPin.length !== 6
                  }
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md flex-1 flex items-center justify-center gap-1.5"
                >
                  {isProcessingAction ? (
                    <span>Transfert en cours...</span>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Retirer {withdrawAmount.toLocaleString('fr-FR')} F</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE 3 : DÉTAILS DES FONDS EN ESCROW (SMART SÉQUESTRE)
         ===================================================================== */}
      {showEscrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Fonds sous Smart Escrow (Séquestre)</h3>
                  <p className="text-[10px] text-slate-400">
                    Garantie de livraison physique NaNa Swarm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEscrowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Conformément aux règles du commerce électronique OHADA, ces fonds sont déposés par
                l'acheteur et immédiatement libérés sur votre solde dès que le client confirme la
                réception du colis ou après expiration du délai de vérification.
              </p>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {escrowList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {item.orderNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {item.status === 'locked_in_transit'
                            ? 'En cours de livraison'
                            : 'En attente validation'}
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {item.itemTitle}
                      </h5>
                      <p className="text-[10px] text-slate-400">Acheteur : {item.buyerName}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {item.amountFcfa.toLocaleString('fr-FR')} FCFA
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Libération sous ~{item.daysRemaining}j</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-xl flex items-center justify-between border border-slate-200/40 dark:border-slate-800">
                    <span>Livreur : {item.deliveryPartner}</span>
                    <span className="font-mono">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowEscrowModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE 4 : GÉRER LES MÉTHODES DE RETRAIT MOBILE MONEY
         ===================================================================== */}
      {showMethodsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Numéros de Retrait Mobile Money</h3>
                  <p className="text-[10px] text-slate-400">Passerelle certifiée Wameet Direct</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMethodsModal(false);
                  setIsAddingMethod(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des numéros enregistrés */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {withdrawalMethods.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${m.operatorColor} text-white flex items-center justify-center text-xs font-black shrink-0`}
                    >
                      {m.operator.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.operator}
                        </h5>
                        {m.isDefault && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Par défaut
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {m.accountNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{m.holderName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!m.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultMethod(m.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                        title="Définir comme méthode principale"
                      >
                        Défaut
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMethod(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Supprimer ce numéro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulaire d'ajout d'une nouvelle méthode */}
            {isAddingMethod ? (
              <form
                onSubmit={handleAddNewMethod}
                className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold">Ajouter un compte Mobile Money</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingMethod(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['Wave', 'Orange Money', 'MTN MoMo', 'Moov Flooz'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setNewMethodOperator(op);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold border ${
                        newMethodOperator === op
                          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="tel"
                    required
                    placeholder="+225 07 00 00 00"
                    value={newMethodPhone}
                    onChange={(e) => setNewMethodPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors"
                >
                  Enregistrer ce numéro
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsAddingMethod(true);
                }}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un nouveau compte de retrait</span>
              </button>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMethodsModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetWalletFinanceScreen;
