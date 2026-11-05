/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * nanawallet — Écran d'Accueil & Dashboard Portefeuille Mobile Hybride
 * Design Épuré, Moderne & Chaleureux de Classe Mondiale.
 * Palette Officielle : Fond blanc cassé (#F9F8F6), Accents Bleu Royal (#1E3A8A / #2563EB).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  PlusCircle, 
  History, 
  ShieldCheck, 
  Smartphone, 
  Bell, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CreditCard, 
  Layers, 
  ExternalLink,
  QrCode,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Lock,
  Zap,
  Info
} from 'lucide-react';
import NanaWalletRecharge from './NanaWalletRecharge';
import NanaWalletCryptoComingSoon from './NanaWalletCryptoComingSoon';
import NanaWalletCheckout from './NanaWalletCheckout';
import { playTapBeep, playValidationBeep, playCashChime, formatCFA } from '../../utils/audio';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  timestamp: number;
  category: 'RECHARGE' | 'SERVICE' | 'PRODUCT' | 'CRYPTO';
  reference: string;
  operator?: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_101',
    type: 'DEBIT',
    title: 'Génération de CV Pro IA',
    subtitle: 'Service Pay-per-use Nanasore',
    amount: 300,
    currency: 'FCFA',
    date: "Aujourd'hui",
    time: '14:20',
    timestamp: Date.now() - 1000 * 60 * 85,
    category: 'SERVICE',
    reference: 'REF-CV-88412',
    status: 'CONFIRMED'
  },
  {
    id: 'tx_102',
    type: 'CREDIT',
    title: 'Recharge Mobile Money (Wave)',
    subtitle: 'Dépôt direct sur nanawallet',
    amount: 1000,
    currency: 'FCFA',
    date: 'Hier',
    time: '09:15',
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
    category: 'RECHARGE',
    reference: 'REF-WAV-99120',
    operator: 'Wave CI/SN',
    status: 'CONFIRMED'
  },
  {
    id: 'tx_103',
    type: 'DEBIT',
    title: 'Activation Produit Supplémentaire',
    subtitle: 'Boutique Store Studio (Produit #4)',
    amount: 1000,
    currency: 'FCFA',
    date: 'Il y a 3 jours',
    time: '18:40',
    timestamp: Date.now() - 1000 * 60 * 60 * 70,
    category: 'PRODUCT',
    reference: 'REF-PROD-44109',
    status: 'CONFIRMED'
  },
  {
    id: 'tx_104',
    type: 'CREDIT',
    title: 'Bonus de Bienvenue NaNa',
    subtitle: 'Ouverture de compte nanawallet',
    amount: 1550,
    currency: 'FCFA',
    date: 'Il y a 5 jours',
    time: '10:00',
    timestamp: Date.now() - 1000 * 60 * 60 * 120,
    category: 'RECHARGE',
    reference: 'REF-BONUS-001',
    status: 'CONFIRMED'
  }
];

export interface NanaWalletHomeProps {
  onBackToHub?: () => void;
  className?: string;
}

export default function NanaWalletHome({ onBackToHub, className = '' }: NanaWalletHomeProps) {
  // =========================================================================
  // 1. ÉTAT PRINCIPAL DU PORTEFEUILLE (SYNCHRONISÉ AVEC LE PROFIL RÉEL)
  // =========================================================================
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nana_user_wallet_balance');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return 1250; // Valeur par défaut professionnelle
  });

  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'recharge' | 'history' | 'security' | 'crypto' | 'checkout'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path.includes('/checkout') || params.get('tab') === 'checkout') return 'checkout';
      if (path.includes('/crypto') || params.get('tab') === 'crypto') return 'crypto';
      if (path.includes('/recharge') || params.get('tab') === 'recharge' || params.get('action') === 'recharge') {
        return 'recharge';
      }
    }
    return 'home';
  });
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');

  // Modales interactives
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isCryptoInfoModalOpen, setIsCryptoInfoModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<WalletTransaction | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // État du formulaire de recharge
  const [rechargeAmount, setRechargeAmount] = useState<number>(2500);
  const [rechargeOperator, setRechargeOperator] = useState<'wave' | 'orange' | 'moov' | 'mtn' | 'card'>('wave');
  const [rechargePhone, setRechargePhone] = useState<string>('+226 70 00 11 22');
  const [isProcessingRecharge, setIsProcessingRecharge] = useState(false);

  // Valeur calculée en USDT (Taux simulé 1 USDT ≈ 610 FCFA)
  const cryptoPreview = useMemo(() => {
    return (balance / 610).toFixed(2);
  }, [balance]);

  // Nom utilisateur synchronisé
  const userName = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('nana_store_auth_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.name || parsed.displayName) return parsed.name || parsed.displayName;
          if (parsed.email) return parsed.email.split('@')[0];
        }
      } catch {}
    }
    return auth.currentUser?.displayName || 'Jean Kouassi';
  }, []);

  const userInitial = useMemo(() => {
    return (userName.trim()[0] || 'N').toUpperCase();
  }, [userName]);

  // =========================================================================
  // 2. SYNCHRONISATION EN TEMPS RÉEL (FIRESTORE / LOCALSTORAGE)
  // =========================================================================
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.profile?.wallet_balance !== undefined) {
        setBalance(Number(e.detail.profile.wallet_balance));
      }
    };
    window.addEventListener('nana_profile_synced', handleSync);
    return () => window.removeEventListener('nana_profile_synced', handleSync);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // =========================================================================
  // 3. ACTION : CONFIRMER UNE RECHARGE MOBILE MONEY
  // =========================================================================
  const handleConfirmRecharge = useCallback(async () => {
    if (rechargeAmount <= 0) return;
    playTapBeep();
    setIsProcessingRecharge(true);

    setTimeout(async () => {
      const newBal = balance + rechargeAmount;
      setBalance(newBal);

      const opLabel = 
        rechargeOperator === 'wave' ? 'Wave' :
        rechargeOperator === 'orange' ? 'Orange Money' :
        rechargeOperator === 'moov' ? 'Moov Africa' :
        rechargeOperator === 'mtn' ? 'MTN MoMo' : 'Carte Bancaire';

      const newTx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        type: 'CREDIT',
        title: `Recharge ${opLabel}`,
        subtitle: `Dépôt validé via ${rechargePhone}`,
        amount: rechargeAmount,
        currency: 'FCFA',
        date: "Aujourd'hui",
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        category: 'RECHARGE',
        reference: `REF-${rechargeOperator.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
        operator: opLabel,
        status: 'CONFIRMED'
      };

      setTransactions(prev => [newTx, ...prev]);

      // Sauvegarde dans le cache local
      try {
        localStorage.setItem('nana_user_wallet_balance', String(newBal));
      } catch {}

      // Mise à jour Firestore si utilisateur connecté
      if (auth.currentUser && db) {
        try {
          const uRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(uRef, { credits: increment(rechargeAmount), updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn('[WALLET] Synchro Firestore ignorée :', e);
        }
      }

      setIsProcessingRecharge(false);
      setIsRechargeModalOpen(false);
      playCashChime();
      showToast(`🎉 Recharge réussie ! +${formatCFA(rechargeAmount)} crédités sur votre portefeuille.`);
    }, 1200);
  }, [balance, rechargeAmount, rechargeOperator, rechargePhone, showToast]);

  // =========================================================================
  // 4. ACTION : EFFECTUER UN PAIEMENT / USAGE DE SERVICE
  // =========================================================================
  const handleExecuteUsageDebit = useCallback((serviceName: string, serviceCost: number) => {
    playTapBeep();
    if (balance < serviceCost) {
      showToast('⚠️ Solde insuffisant. Veuillez recharger votre portefeuille.');
      return;
    }

    const nextBal = balance - serviceCost;
    setBalance(nextBal);

    const debitTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'DEBIT',
      title: serviceName,
      subtitle: 'Paiement à l’usage instantané',
      amount: serviceCost,
      currency: 'FCFA',
      date: "Aujourd'hui",
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      category: 'SERVICE',
      reference: `REF-PAY-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'CONFIRMED'
    };

    setTransactions(prev => [debitTx, ...prev]);

    try {
      localStorage.setItem('nana_user_wallet_balance', String(nextBal));
    } catch {}

    setIsUsageModalOpen(false);
    playValidationBeep();
    showToast(`✅ ${serviceName} réglé avec succès (-${formatCFA(serviceCost)}).`);
  }, [balance, showToast]);

  // Filtrage des transactions pour l'historique
  const filteredTransactions = useMemo(() => {
    if (activityFilter === 'ALL') return transactions;
    return transactions.filter(t => t.type === activityFilter);
  }, [transactions, activityFilter]);

    // =========================================================================
  // ÉCRAN 4 : PAIEMENT INSTANTANÉ À L'USAGE (CHECKOUT)
  // =========================================================================
  if (activeNavTab === 'checkout') {
    return (
      <NanaWalletCheckout
        onBack={() => {
          setActiveNavTab('home');
          if (typeof window !== 'undefined' && window.location.pathname.includes('/checkout')) {
            window.history.pushState({}, '', '/wallet');
          }
        }}
        onNavigateRecharge={() => setActiveNavTab('recharge')}
        onSuccess={(srv, newBal) => {
          setBalance(newBal);
          const newTx: WalletTransaction = {
            id: `tx_${Date.now()}`,
            type: 'DEBIT',
            title: srv.title,
            subtitle: 'Paiement instantané à l’usage',
            amount: srv.cost,
            currency: 'FCFA',
            date: "Aujourd'hui",
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            category: 'SERVICE',
            reference: `REF-PAY-${Math.floor(10000 + Math.random() * 90000)}`,
            status: 'CONFIRMED'
          };
          setTransactions(prev => [newTx, ...prev]);
          setActiveNavTab('home');
          showToast(`✅ ${srv.title} activé avec succès (-${formatCFA(srv.cost)}).`);
        }}
      />
    );
  }

  // =========================================================================
  // ÉCRAN 3 : SECTION CRYPTO USDT BIENTÔT DISPONIBLE
  // =========================================================================
  if (activeNavTab === 'crypto') {
    return (
      <NanaWalletCryptoComingSoon
        onBack={() => {
          setActiveNavTab('home');
          if (typeof window !== 'undefined' && window.location.pathname.includes('/crypto')) {
            window.history.pushState({}, '', '/wallet');
          }
        }}
      />
    );
  }

  // =========================================================================
  // ÉCRAN 2 : RECHARGE NANAWTCHIT DÉDIÉ (PLEIN ÉCRAN FLUIDE)
  // =========================================================================
  if (activeNavTab === 'recharge') {
    return (
      <NanaWalletRecharge
        onNavigateCrypto={() => setActiveNavTab('crypto')}
        onBack={() => {
          setActiveNavTab('home');
          if (typeof window !== 'undefined' && window.location.pathname.includes('/recharge')) {
            window.history.pushState({}, '', '/wallet');
          }
        }}
        onSuccess={(amt, op) => {
          const newBal = balance + amt;
          setBalance(newBal);
          const newTx: WalletTransaction = {
            id: `tx_${Date.now()}`,
            type: 'CREDIT',
            title: `Recharge ${op}`,
            subtitle: 'Alimentation validée via Nanawtchit',
            amount: amt,
            currency: 'FCFA',
            date: "Aujourd'hui",
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            category: 'RECHARGE',
            reference: `REF-RECH-${Math.floor(10000 + Math.random() * 90000)}`,
            operator: op,
            status: 'CONFIRMED'
          };
          setTransactions(prev => [newTx, ...prev]);
          setActiveNavTab('home');
          showToast(`🎉 Recharge réussie ! +${formatCFA(amt)} crédités.`);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans antialiased flex justify-center items-center p-0 sm:p-4 select-none ${className}`}>
      
      {/* Toast Flottant de Notification Réussie */}
      {toastMessage && (
        <div className="fixed top-5 z-50 max-w-sm w-[90%] bg-[#1E3A8A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-blue-400/40 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-blue-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Conteneur simulant l'écran d'un smartphone moderne (Responsive : 100% sur mobile, cadre immersif sur desktop) */}
      <div className="w-full max-w-md bg-[#F9F8F6] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[844px] border-0 sm:border-8 sm:border-[#1E3A8A] relative">
        
        {/* ===================================================================== */}
        {/* EN-TÊTE SUPÉRIEURE (HEADER) */}
        {/* ===================================================================== */}
        <header className="px-6 pt-6 sm:pt-8 pb-3 flex justify-between items-center bg-[#F9F8F6] border-b border-gray-100/60 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            {/* Avatar avec badge de connexion */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-blue-900/20 ring-2 ring-white">
                {userInitial}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-gray-500 font-medium">Bienvenue sur</p>
                <span className="text-[11px] font-black text-[#1E3A8A] tracking-tight">nanawallet</span>
              </div>
              <h2 className="text-sm font-bold text-[#1A1A1A] truncate max-w-[170px]">{userName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton de Notification */}
            <button 
              type="button"
              onClick={() => {
                playTapBeep();
                setIsNotificationOpen(!isNotificationOpen);
              }}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-gray-600 hover:text-[#1E3A8A] cursor-pointer transition active:scale-95 relative"
              title="Centre de notifications"
            >
              <Bell size={17} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </button>

            {/* Badge de Sécurité & Statut Vérifié */}
            <div 
              onClick={() => {
                playTapBeep();
                showToast("🛡️ Portefeuille sécurisé par architecture hybride NaNaSwitch.");
              }}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-[#1E3A8A] cursor-pointer hover:bg-blue-50 transition active:scale-95"
              title="Statut de Sécurité Vérifié"
            >
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>

            {/* Si un callback de retour vers le Hub existe */}
            {onBackToHub && (
              <button 
                type="button"
                onClick={onBackToHub}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition active:scale-95 ml-1"
                title="Quitter et revenir au Hub"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </header>

        {/* CONTENU PRINCIPAL DÉFILANT */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
          
          {/* ===================================================================== */}
          {/* CARTE DE SOLDE PRINCIPAL (HERO CARD DE CLASSE MONDIALE) */}
          {/* ===================================================================== */}
          <div className="bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#0F172A] text-white rounded-3xl p-6 shadow-xl shadow-blue-950/20 relative overflow-hidden flex flex-col justify-between border border-blue-400/20">
            {/* Reflet lumineux abstrait de verre (Glassmorphism) */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                    Solde Principal
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsBalanceHidden(!isBalanceHidden);
                    }}
                    className="text-blue-300 hover:text-white transition p-0.5"
                    title={isBalanceHidden ? "Afficher le solde" : "Masquer le solde"}
                  >
                    {isBalanceHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <span className="bg-blue-900/70 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Hybride Active
                </span>
              </div>

              {/* Chiffre du Solde */}
              <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight mt-1 text-white flex items-baseline gap-2 font-mono">
                {isBalanceHidden ? (
                  <span>••••••••</span>
                ) : (
                  <>
                    <span>{balance.toLocaleString('fr-FR')}</span>
                    <span className="text-base font-normal text-blue-200">FCFA</span>
                  </>
                )}
              </h1>

              {/* Mention Équivalent Crypto USDT Grisée */}
              <div className="text-xs text-blue-200/90 mt-2 flex items-center gap-2">
                <span>≈ {isBalanceHidden ? '•••' : cryptoPreview} USDT</span>
                <button
                  type="button"
                  onClick={() => setActiveNavTab('crypto')}
                  className="inline-flex items-center gap-1 text-[10px] bg-blue-950/70 hover:bg-blue-900 text-blue-200 px-2 py-0.5 rounded-md border border-blue-400/30 transition cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Bientôt</span>
                  <Info size={10} className="text-blue-300" />
                </button>
              </div>
            </div>

            {/* Deux Boutons d'Action Rapide dans la Carte */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10 relative z-10">
              <button 
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveNavTab('recharge');
                }}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950/20 transition-all active:scale-95 cursor-pointer"
              >
                <PlusCircle size={16} className="text-[#1E3A8A]" />
                <span>Recharger</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveNavTab('checkout');
                }}
                className="bg-blue-700/80 hover:bg-blue-700 text-white border border-blue-400/30 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowUpRight size={16} className="text-blue-200" />
                <span>Payer / Usage</span>
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECTION PORTEFEUILLES & ACTIFS (FIAT & CRYPTO PRÉPARATION) */}
          {/* ===================================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Portefeuilles &amp; Actifs
              </h3>
              <span className="text-[11px] font-semibold text-[#1E3A8A] flex items-center gap-1 cursor-pointer">
                <span>Multi-devises</span>
              </span>
            </div>

            <div className="space-y-2.5">
              
              {/* Actif 1 : Monnaie Locale (XOF) */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setActiveNavTab('recharge');
                }}
                className="bg-white p-3.5 rounded-2xl shadow-xs flex items-center justify-between border border-gray-100 hover:border-blue-200 transition cursor-pointer group active:scale-98"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-black text-sm group-hover:bg-[#1E3A8A] group-hover:text-white transition">
                    F
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[#1A1A1A]">Monnaie Locale (XOF)</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">Actif principal (NaNaSwitch)</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#1E3A8A] block font-mono">
                    {isBalanceHidden ? '••••' : `${balance.toLocaleString('fr-FR')} F`}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Disponible</span>
                </div>
              </div>

              {/* Actif 2 : Crypto-actifs (USDT) — Grisé "Bientôt" */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setActiveNavTab('crypto');
                }}
                className="bg-white/80 p-3.5 rounded-2xl shadow-xs flex items-center justify-between border border-gray-100 opacity-80 hover:opacity-100 transition cursor-pointer group active:scale-98"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-base group-hover:bg-amber-100 group-hover:text-amber-800 transition">
                    ₮
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-700">Crypto-actifs (USDT)</p>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">Réseau Polygon / Tron</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-md border border-gray-200 group-hover:border-amber-300 group-hover:bg-amber-50 group-hover:text-amber-900 transition">
                    Bientôt
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
              </div>

            </div>
          </div>

          {/* ===================================================================== */}
          {/* FLUX D'ACTIVITÉ RÉCENTE (TRANSACTIONS DÉBIT & CRÉDIT) */}
          {/* ===================================================================== */}
          <div className="pb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Activité récente
              </h3>
              
              {/* Filtres Rapides */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold text-gray-500">
                <button
                  type="button"
                  onClick={() => setActivityFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md transition ${activityFilter === 'ALL' ? 'bg-white text-[#1E3A8A] shadow-xs' : 'hover:text-gray-900'}`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('CREDIT')}
                  className={`px-2 py-0.5 rounded-md transition ${activityFilter === 'CREDIT' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  + Dépôts
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('DEBIT')}
                  className={`px-2 py-0.5 rounded-md transition ${activityFilter === 'DEBIT' ? 'bg-white text-rose-700 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  - Usages
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <div 
                    key={tx.id}
                    onClick={() => {
                      playTapBeep();
                      setSelectedTxForReceipt(tx);
                    }}
                    className="bg-white p-3 rounded-2xl shadow-xs flex items-center justify-between border border-gray-100 hover:border-blue-200 transition cursor-pointer group active:scale-98"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {isCredit ? <PlusCircle size={15} /> : <ArrowUpRight size={15} />}
                      </div>
                      <div className="truncate max-w-[190px]">
                        <p className="text-xs font-bold text-[#1A1A1A] truncate">{tx.title}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {tx.date}, {tx.time} {tx.operator ? `• ${tx.operator}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-extrabold font-mono block ${
                        isCredit ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isCredit ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} {tx.currency}
                      </span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                        Confirmé
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ===================================================================== */}
        {/* BARRE DE NAVIGATION INFÉRIEURE FIXE (BOTTOM BAR) */}
        {/* ===================================================================== */}
        <nav className="bg-white border-t border-gray-100 px-6 py-2.5 flex justify-around items-center sticky bottom-0 z-20 shadow-xs">
          
          <button 
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveNavTab('home');
            }}
            className={`flex flex-col items-center cursor-pointer transition ${
              activeNavTab === 'home' ? 'text-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeNavTab === 'home' ? 'bg-blue-50' : ''}`}>
              <Wallet size={19} />
            </div>
            <span className={`text-[10px] mt-0.5 ${activeNavTab === 'home' ? 'font-black' : 'font-medium'}`}>
              Accueil
            </span>
          </button>

          <button 
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveNavTab('recharge');
            }}
            className="flex flex-col items-center text-gray-400 hover:text-[#1E3A8A] cursor-pointer transition active:scale-95"
          >
            <div className="p-1 rounded-xl hover:bg-blue-50">
              <PlusCircle size={19} />
            </div>
            <span className="text-[10px] font-medium mt-0.5">Recharger</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveNavTab('history');
              setActivityFilter('ALL');
            }}
            className={`flex flex-col items-center cursor-pointer transition ${
              activeNavTab === 'history' ? 'text-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeNavTab === 'history' ? 'bg-blue-50' : ''}`}>
              <History size={19} />
            </div>
            <span className={`text-[10px] mt-0.5 ${activeNavTab === 'history' ? 'font-black' : 'font-medium'}`}>
              Historique
            </span>
          </button>

          <button 
            type="button"
            onClick={() => {
              playTapBeep();
              showToast("🔒 Master PIN actif. Vos fonds sont protégés par chiffrement.");
            }}
            className="flex flex-col items-center text-gray-400 hover:text-[#1E3A8A] cursor-pointer transition"
          >
            <div className="p-1 rounded-xl hover:bg-blue-50">
              <ShieldCheck size={19} />
            </div>
            <span className="text-[10px] font-medium mt-0.5">Sécurité</span>
          </button>

        </nav>

        {/* ===================================================================== */}
        {/* MODAL 1 : RECHARGEMENT RAPIDE MOBILE MONEY */}
        {/* ===================================================================== */}
        {isRechargeModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#F9F8F6] rounded-t-[2.5rem] p-6 space-y-4 max-h-[90%] overflow-y-auto border-t-2 border-[#1E3A8A] shadow-2xl animate-slideUp">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-bold">
                    <PlusCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1A1A1A]">Recharger mon Portefeuille</h3>
                    <p className="text-[10px] text-gray-500">Alimentation instantanée sans frais cachés</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-gray-700 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sélection du Montant Rapide */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Montant à recharger :
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2500, 5000, 10000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRechargeAmount(amt);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        rechargeAmount === amt 
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs' 
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {amt.toLocaleString()} F
                    </button>
                  ))}
                </div>
              </div>

              {/* Choix de l'Opérateur */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'wave', label: 'Wave (CI / SN)', badge: '0%' },
                    { id: 'orange', label: 'Orange Money', badge: 'BF/CI' },
                    { id: 'moov', label: 'Moov Africa', badge: 'UEMOA' },
                    { id: 'card', label: 'Carte Bancaire', badge: 'Visa/MC' }
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRechargeOperator(op.id as any);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center justify-between ${
                        rechargeOperator === op.id
                          ? 'bg-blue-50/80 border-[#1E3A8A] text-[#1E3A8A] font-bold ring-1 ring-[#1E3A8A]'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="text-xs">{op.label}</span>
                      <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                        {op.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ Numéro Mobile */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Numéro de débit Mobile Money :
                </label>
                <input 
                  type="tel"
                  value={rechargePhone}
                  onChange={(e) => setRechargePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono font-bold text-gray-800 outline-none focus:border-[#1E3A8A]"
                  placeholder="+226 70 00 00 00"
                />
              </div>

              {/* Bouton de validation */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessingRecharge}
                  onClick={handleConfirmRecharge}
                  className="w-full py-3.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-extrabold text-xs shadow-lg shadow-blue-950/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isProcessingRecharge ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Validation sécurisée en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      <span>Confirmer et Recharger {rechargeAmount.toLocaleString()} FCFA</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 2 : PAYER / USAGE DE SERVICES INTERNES */}
        {/* ===================================================================== */}
        {isUsageModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#F9F8F6] rounded-t-[2.5rem] p-6 space-y-4 max-h-[90%] overflow-y-auto border-t-2 border-[#1E3A8A] shadow-2xl animate-slideUp">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-bold">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1A1A1A]">Payer un service à l’usage</h3>
                    <p className="text-[10px] text-gray-500">Débit direct sur votre solde ({balance.toLocaleString()} F dispo)</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsUsageModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-gray-700 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Liste des Services Éligibles au Wallet */}
              <div className="space-y-2">
                {[
                  { name: 'Génération de CV Pro & Lettre IA', price: 300, desc: 'Téléchargement PDF certifié' },
                  { name: 'Produit Boutique Supplémentaire', price: 1000, desc: 'Ajout permanent à votre catalogue' },
                  { name: 'Tunnel de Vente Modulaire', price: 5000, desc: 'Activation de tunnel de conversion' },
                  { name: 'Pack 100 Notifications SMS OTP', price: 2500, desc: 'Routage SMS garanti UEMOA' },
                  { name: 'Signature Électronique Certifiée', price: 300, desc: 'Preuve légale horodatée DocuSign' }
                ].map((s, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-gray-200 flex items-center justify-between hover:border-blue-300 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">{s.name}</p>
                      <p className="text-[10px] text-gray-400">{s.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteUsageDebit(s.name, s.price)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white font-black text-xs transition cursor-pointer active:scale-95 border border-blue-200"
                    >
                      Payer {s.price} F
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 3 : DÉTAIL DU REÇU ÉLECTRONIQUE DE TRANSACTION */}
        {/* ===================================================================== */}
        {selectedTxForReceipt && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-gray-100 animate-slideUp">
              
              <div className="text-center pb-2 border-b border-gray-100">
                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 ${
                  selectedTxForReceipt.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {selectedTxForReceipt.type === 'CREDIT' ? <PlusCircle size={24} /> : <ArrowUpRight size={24} />}
                </div>
                <h3 className="text-base font-black text-[#1A1A1A]">{selectedTxForReceipt.title}</h3>
                <span className={`text-2xl font-black font-mono mt-1 block ${
                  selectedTxForReceipt.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {selectedTxForReceipt.type === 'CREDIT' ? '+' : '-'}{selectedTxForReceipt.amount.toLocaleString()} {selectedTxForReceipt.currency}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">Référence</span>
                  <span className="font-mono font-bold text-gray-800">{selectedTxForReceipt.reference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">Date &amp; Heure</span>
                  <span className="font-medium text-gray-800">{selectedTxForReceipt.date} à {selectedTxForReceipt.time}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">Statut</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Vérifié &amp; Scellé
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxForReceipt(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition cursor-pointer"
              >
                Fermer le reçu
              </button>

            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 4 : INFO CRYPTO-ACTIFS USDT (BIENTÔT) */}
        {/* ===================================================================== */}
        {isCryptoInfoModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-gray-100 animate-slideUp text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
                ₮
              </div>
              <h3 className="text-base font-black text-[#1A1A1A]">
                Portefeuille Crypto USDT (Bientôt disponible)
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                nanawallet intégrera les transferts stables en USDT sur les réseaux Polygon et Tron à frais ultra-réduits (&lt; 0.1$). Vous pourrez convertir instantanément vos FCFA en USDT et vice-versa.
              </p>
              <div className="p-3 bg-blue-50 rounded-xl text-left border border-blue-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1E3A8A] block mb-0.5">
                  Avantage Membre
                </span>
                <p className="text-xs text-gray-700 font-medium">
                  Zéro frais de tenue de compte crypto &amp; conversion 1-clic vers vos comptes Mobile Money.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setIsCryptoInfoModalOpen(false);
                  showToast("✨ Vous êtes inscrit sur la liste d'accès anticipé USDT !");
                }}
                className="w-full py-3 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Rejoindre la liste d'attente prioritaire
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
