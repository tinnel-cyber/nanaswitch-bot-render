import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  StoreUser, 
  AffiliateProfile, 
  ReferredStore, 
  AffiliateWithdrawal, 
  MobileMoneyProvider 
} from '../../../types';
import { 
  persistAffiliateProfile, 
  requestAffiliateWithdrawal 
} from '../../../utils/firestoreService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../utils/audio';
import {
  Users,
  Copy,
  Check,
  Wallet,
  ArrowUpRight,
  Store,
  X,
  MessageCircle,
  Facebook,
  Gift,
  CheckCircle2,
  TrendingUp,
  Percent,
  QrCode,
  Share2,
  Sparkles,
  Download,
  Calendar,
  ShieldCheck,
  Clock,
  CreditCard,
  Award,
  ArrowRight,
  Zap,
  BarChart3,
  HelpCircle,
  Smartphone,
  Search,
  ChevronRight,
  Flame,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

export interface AffiliateDashboardModalProps {
  currentUser?: StoreUser | null;
  isOpen: boolean;
  onClose: () => void;
  isModal?: boolean;
}

type ActiveTab = 'OVERVIEW' | 'STORES' | 'WALLET' | 'MARKETING_KIT' | 'SIMULATOR';

interface MarketingTemplate {
  id: string;
  title: string;
  category: string;
  preview: string;
  fullText: string;
}

export const AffiliateDashboardModal: React.FC<AffiliateDashboardModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  isModal = true,
}) => {
  const safeStoreId = currentUser?.storeId || 'store-nana-1';
  const safeName = currentUser?.name || 'Partenaire Ambassadeur';
  const safePhone = currentUser?.phone || '';
  const affiliateCode = (currentUser as any)?.affiliateCode || (currentUser as any)?.affiliateId || safeStoreId.replace('store-', 'AMB-').toUpperCase();
  
  const siteOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://nanasore.com';
  const referralLink = `${siteOrigin}/?ref=${affiliateCode}`;

  const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'>('ALL');
  
  // Simulation slider state
  const [simulatedStores, setSimulatedStores] = useState<number>(12);
  const subscriptionCostPerMonth = 10000; // 10 000 FCFA / mois

  // Withdrawal state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5000);
  const [withdrawProvider, setWithdrawProvider] = useState<MobileMoneyProvider>('WAVE');
  const [withdrawPhone, setWithdrawPhone] = useState(safePhone);
  const [withdrawAccountName, setWithdrawAccountName] = useState(safeName);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Large QR Code preview modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Persistance locale et synchronisation
  const storageProfileKey = `nana_affiliate_profile_${safeStoreId}`;
  const storageWithdrawalsKey = `nana_affiliate_withdrawals_${safeStoreId}`;

  const [profile, setProfile] = useState<AffiliateProfile>(() => {
    try {
      const savedRaw = localStorage.getItem(storageProfileKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        // Purge automatique des fausses boutiques de démonstration
        const hasFakeStores = saved.referredStores?.some(
          (s: any) => s.storeId === 'str_abidjan_01' || s.storeName === 'Boutique Élite Treichville'
        );
        if (hasFakeStores) {
          localStorage.removeItem(storageProfileKey);
        } else {
          return saved;
        }
      }
    } catch (e) {
      console.warn('Storage read error', e);
    }

    // Profil réel propre sans chiffres fictifs
    return {
      id: `aff_${safeStoreId}`,
      storeId: safeStoreId,
      affiliateCode,
      name: safeName,
      phone: safePhone,
      commissionRate: 15,
      availableBalance: 0,
      totalEarned: 0,
      referredStoresCount: 0,
      referredStores: [],
      createdAt: Date.now(),
    };
  });

  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>(() => {
    try {
      const savedRaw = localStorage.getItem(storageWithdrawalsKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        // Purge automatique des faux retraits de démonstration
        const hasFakeWithdrawals = saved?.some(
          (w: any) => w.id === 'WITH-89XA21' || w.id === 'WITH-74KL10'
        );
        if (hasFakeWithdrawals) {
          localStorage.removeItem(storageWithdrawalsKey);
        } else {
          return saved;
        }
      }
    } catch (e) {
      console.warn('Storage read error', e);
    }

    // Historique de retraits réel initialement vide
    return [];
  });

  // Save changes locally
  useEffect(() => {
    try {
      localStorage.setItem(storageProfileKey, JSON.stringify(profile));
    } catch (e) {
      console.warn('Profile save error', e);
    }
  }, [profile, storageProfileKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageWithdrawalsKey, JSON.stringify(withdrawals));
    } catch (e) {
      console.warn('Withdrawals save error', e);
    }
  }, [withdrawals, storageWithdrawalsKey]);

  // Dynamic Tier Calculation
  const partnerTier = useMemo(() => {
    const activeCount = profile.referredStores.filter(s => s.status === 'ACTIVE').length;
    if (activeCount >= 10) {
      return {
        name: 'Partenaire Élite',
        badgeColor: 'from-amber-400 to-yellow-600 text-slate-950 border-amber-300',
        iconColor: 'text-amber-400',
        rate: 20,
        nextTier: null,
        neededForNext: 0,
        progress: 100
      };
    } else if (activeCount >= 5) {
      return {
        name: 'Partenaire Pro',
        badgeColor: 'from-indigo-500 to-purple-600 text-white border-indigo-400',
        iconColor: 'text-indigo-400',
        rate: 18,
        nextTier: 'Partenaire Élite (20%)',
        neededForNext: 10 - activeCount,
        progress: Math.round((activeCount / 10) * 100)
      };
    } else {
      return {
        name: 'Partenaire Starter',
        badgeColor: 'from-emerald-500 to-teal-600 text-white border-emerald-400',
        iconColor: 'text-emerald-400',
        rate: 15,
        nextTier: 'Partenaire Pro (18%)',
        neededForNext: 5 - activeCount,
        progress: Math.round((activeCount / 5) * 100)
      };
    }
  }, [profile.referredStores]);

  // Filtered referred stores
  const filteredStores = useMemo(() => {
    return profile.referredStores.filter(store => {
      const matchesSearch = 
        store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'ALL' || store.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [profile.referredStores, searchQuery, statusFilter]);

  // Computed metrics
  const activeStoresCount = useMemo(() => 
    profile.referredStores.filter(s => s.status === 'ACTIVE').length, 
    [profile.referredStores]
  );
  
  const trialStoresCount = useMemo(() => 
    profile.referredStores.filter(s => s.status === 'TRIAL').length, 
    [profile.referredStores]
  );

  const pendingWithdrawalTotal = useMemo(() => 
    withdrawals
      .filter(w => w.status === 'PENDING')
      .reduce((sum, w) => sum + w.amount, 0),
    [withdrawals]
  );

  // Marketing templates
  const marketingTemplates: MarketingTemplate[] = useMemo(() => [
    {
      id: 'tmpl-direct',
      title: 'Message WhatsApp Direct & Convivial',
      category: 'Pour collègues et amis commerçants',
      preview: 'Salut ! Je teste depuis peu le logiciel de caisse Nanasore dans ma boutique...',
      fullText: `Salut cher confrère ! 👋\n\nJe voulais te partager le logiciel de caisse que j'utilise actuellement dans ma boutique : *Nanasore* 📱✨\n\nÇa remplace les vieux cahiers de compte et ça évite les vols et erreurs de caisse :\n- Vente tactile ultra rapide avec bip sonore\n- Suivi des dettes clients par WhatsApp\n- Alerte quand un produit est presque épuisé\n- Fonctionne même quand la connexion Internet est coupée !\n\nTu peux tester gratuitement pendant 14 jours ici :\n👉 ${referralLink}\n\nEntre mon code promo partenaire : *${affiliateCode}*`
    },
    {
      id: 'tmpl-anti-perte',
      title: 'Argumentaire "Zéro Vol & Zéro Erreur de Caisse"',
      category: 'Pour épiceries, dépôts et superettes',
      preview: 'Marre des écarts de caisse en fin de journée et des calculs interminables ?...',
      fullText: `🚨 *Commerçants, arrêtez de perdre de l'argent sur vos stocks !* 🚨\n\nAvec *Nanasore*, sécurisez votre boutique dès aujourd'hui :\n✅ Clôture de caisse infalsifiable en 1 clic\n✅ Tickets de caisse automatiques envoyés par WhatsApp\n✅ Inventaire précis avec scan de codes-barres\n✅ Zéro risque de coupure : fonctionne 100% hors-ligne\n\n🎁 Essai gratuit 14 jours sans aucun engagement :\n👉 ${referralLink}\nCode privilège : *${affiliateCode}*`
    },
    {
      id: 'tmpl-statut-wa',
      title: 'Texte Court pour Statut WhatsApp & Stories',
      category: 'Format compact pour forte visibilité',
      preview: 'Boostez votre commerce avec la caisse tactile intelligente Nanasore...',
      fullText: `📊 *Propriétaires de boutique, simplifiez votre gestion !*\nCaisse tactile sur téléphone ou tablette, gestion des stocks et des dettes clients.\n\n👉 Testez gratuitement Nanasore : ${referralLink}\nCode parrain : *${affiliateCode}*`
    }
  ], [referralLink, affiliateCode]);

  // Handlers robustes avec fallbacks
  const handleCopyLink = async () => {
    playTapBeep();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy link error', e);
    }
  };

  const handleCopyCode = async () => {
    playTapBeep();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(affiliateCode);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = affiliateCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      console.warn('Copy code error', e);
    }
  };

  const handleCopyTemplate = async (template: MarketingTemplate) => {
    playTapBeep();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(template.fullText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = template.fullText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedTemplateId(template.id);
      setTimeout(() => setCopiedTemplateId(null), 2500);
    } catch (e) {
      console.warn('Copy template error', e);
    }
  };

  const handleShareWhatsAppTemplate = (text: string) => {
    playTapBeep();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleShareFacebook = () => {
    playTapBeep();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleDownloadQrCode = async () => {
    playTapBeep();
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRCode_NanaPOS_${affiliateCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrCodeUrl, '_blank');
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    if (withdrawAmount < 5000) {
      setWithdrawError('Le montant minimum de retrait est de 5 000 FCFA.');
      return;
    }

    if (withdrawAmount > profile.availableBalance) {
      setWithdrawError('Le montant demandé dépasse votre solde disponible.');
      return;
    }

    if (!withdrawPhone || withdrawPhone.length < 8) {
      setWithdrawError('Veuillez indiquer un numéro Mobile Money valide.');
      return;
    }

    playTapBeep();

    const newWithdrawal: AffiliateWithdrawal = {
      id: `WITH-${Date.now().toString(36).toUpperCase()}`,
      affiliateId: profile.id,
      affiliateName: profile.name,
      phone: withdrawPhone.trim(),
      amount: withdrawAmount,
      provider: withdrawProvider,
      status: 'PENDING',
      createdAt: Date.now(),
      adminNotes: `Bénéficiaire : ${withdrawAccountName || profile.name}. En attente de transfert.`
    };

    try {
      await requestAffiliateWithdrawal(newWithdrawal);
      playValidationBeep();

      const updatedBalance = profile.availableBalance - withdrawAmount;
      const updatedProfile = {
        ...profile,
        availableBalance: updatedBalance,
      };

      setProfile(updatedProfile);
      setWithdrawals(prev => [newWithdrawal, ...prev]);
      await persistAffiliateProfile(updatedProfile);

      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setIsWithdrawOpen(false);
      }, 2500);
    } catch (err) {
      console.warn('Erreur demande retrait :', err);
      // Mode secours local si hors-ligne
      playValidationBeep();
      const updatedBalance = profile.availableBalance - withdrawAmount;
      setProfile(prev => ({ ...prev, availableBalance: updatedBalance }));
      setWithdrawals(prev => [newWithdrawal, ...prev]);
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setIsWithdrawOpen(false);
      }, 2500);
    }
  };

  const getProviderBadge = (provider: MobileMoneyProvider) => {
    switch (provider) {
      case 'WAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Wave
          </span>
        );
      case 'ORANGE_MONEY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Orange Money
          </span>
        );
      case 'MTN_MOMO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> MTN MoMo
          </span>
        );
      case 'MOOV_MONEY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Moov Money
          </span>
        );
    }
  };

  const getStatusBadge = (status: AffiliateWithdrawal['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VIRÉ
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" /> EN COURS
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" /> REJETÉ
          </span>
        );
    }
  };

  // QR Code Image URL helper
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(referralLink)}&margin=10&color=0f172a&bgcolor=ffffff`;

  if (!isOpen) return null;

  return (
    <div className={isModal ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto" : "w-full"}>
      <div className={isModal ? "w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative my-auto flex flex-col overflow-hidden text-slate-100 max-h-[94vh]" : "w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative flex flex-col overflow-hidden text-slate-100"}>
        
        {/* =========================================================================
            HEADER : BRANDING PARTENAIRE & PROFIL DU COMMERÇANT
           ========================================================================= */}
        <div className="px-5 sm:px-8 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Gift className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Espace Partenaire
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border bg-gradient-to-r ${partnerTier.badgeColor}`}>
                  {partnerTier.name} • {partnerTier.rate}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Recommandez Nanasore à vos confrères commerçants et percevez des commissions récurrentes à vie.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {/* Quick Share Buttons in Header */}
            <button
              onClick={() => { playTapBeep(); setIsQrModalOpen(true); }}
              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Afficher le QR Code de parrainage"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Mon QR Code</span>
            </button>

            <button
              onClick={handleShareWhatsAppTemplate.bind(null, marketingTemplates[0].fullText)}
              className="px-3 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Inviter un commerçant via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); onClose(); }}
              className={`transition-colors cursor-pointer ml-1 ${
                isModal
                  ? 'p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl'
                  : 'px-3 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700'
              }`}
              title={isModal ? "Fermer" : "Retour"}
            >
              {isModal ? (
                <X className="w-5 h-5" />
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>Retour</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            NAVIGATION TABS
           ========================================================================= */}
        <div className="px-5 sm:px-8 bg-slate-950/60 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar shrink-0 py-2.5">
          <button
            onClick={() => { playTapBeep(); setActiveTab('OVERVIEW'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Aperçu & Performances
          </button>

          <button
            onClick={() => { playTapBeep(); setActiveTab('STORES'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'STORES'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-4 h-4" />
            Boutiques Partenaires
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'STORES' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {profile.referredStores.length}
            </span>
          </button>

          <button
            onClick={() => { playTapBeep(); setActiveTab('WALLET'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'WALLET'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Portefeuille & Retraits
            {profile.availableBalance >= 5000 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => { playTapBeep(); setActiveTab('MARKETING_KIT'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'MARKETING_KIT'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Kit Partenaire
          </button>

          <button
            onClick={() => { playTapBeep(); setActiveTab('SIMULATOR'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Simulateur Partenaire
          </button>
        </div>

        {/* =========================================================================
            CONTENT CONTAINER
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">

          {/* -----------------------------------------------------------------------
              TAB 1 : APERÇU & PERFORMANCES
             ----------------------------------------------------------------------- */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              
              {/* TOP HERO BOX : LIENS ET CODES D'INVITATION */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xl">
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      Commission à vie garantie sur chaque réabonnement
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Votre lien unique de recommandation
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Chaque commerçant qui ouvre sa caisse avec votre lien ou votre code promo vous rapporte <strong className="text-emerald-400">{partnerTier.rate}%</strong> de tous ses abonnements mensuels ou annuels.
                    </p>
                  </div>

                  {/* Quick Copy Card */}
                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-3 w-full lg:max-w-md shadow-inner">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                        <span>LIEN DE PARRAINAGE DIRECT</span>
                        <span className="text-emerald-400 font-mono">14 JOURS OFFERTS</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                        <span className="text-xs font-mono text-emerald-300 truncate flex-1 select-all">
                          {referralLink}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Code Promo Manuel</div>
                        <div className="text-xs font-black font-mono text-white tracking-wider">{affiliateCode}</div>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedCode ? 'Copié' : 'Copier Code'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PROGRESSION VERS LE PALIER SUPÉRIEUR */}
                {partnerTier.nextTier && (
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Prochain statut : <strong className="text-white">{partnerTier.nextTier}</strong>. Plus que <strong className="text-amber-400">{partnerTier.neededForNext} boutique(s)</strong> active(s) pour débloquer le palier !
                      </span>
                    </div>
                    <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${partnerTier.progress}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4 CARTES KPI STATISTIQUES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Solde Retirable */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider">Solde Disponible</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {formatCFA(profile.availableBalance)}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Immédiatement retirable
                    </span>
                    <button
                      type="button"
                      onClick={() => { playTapBeep(); setIsWithdrawOpen(true); }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-[11px] font-black transition-all cursor-pointer active:scale-95"
                    >
                      Retirer
                    </button>
                  </div>
                </div>

                {/* Total Encaissé */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider">Total Gains Cumulés</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {formatCFA(profile.totalEarned)}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    Commissions validées depuis votre inscription
                  </div>
                </div>

                {/* Boutiques Actives */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider">Boutiques Parrainées</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Store className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {profile.referredStores.length} <span className="text-xs font-normal text-slate-400">boutiques</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-bold">{activeStoresCount} actives</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-bold">{trialStoresCount} en essai</span>
                  </div>
                </div>

                {/* Taux & Revenu Mensuel Récurrent Estimé */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider">Rente Mensuelle Estimée</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Percent className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-400 tracking-tight">
                    {formatCFA(activeStoresCount * (subscriptionCostPerMonth * (partnerTier.rate / 100)))} <span className="text-xs font-normal text-slate-400">/ mois</span>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Basé sur {activeStoresCount} boutique(s) abonnée(s)
                  </div>
                </div>

              </div>

              {/* SECTION RETRAIT RAPIDE & EXPLICATION EN 3 ÉTAPES */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Retrait en vedette */}
                <div className="lg:col-span-1 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <CreditCard className="w-4 h-4" />
                      Paiement Mobile Money Garanti
                    </div>
                    <h4 className="text-base font-black text-white mb-2">
                      Retirez vos gains sans attendre
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Virement direct sur votre numéro Wave, Orange Money, MTN MoMo ou Moov Money en moins de 4 heures. Frais de transfert 100% offerts.
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Seuil minimum :</span>
                      <span className="font-bold text-white">5 000 F CFA</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Délai d'exécution :</span>
                      <span className="font-bold text-emerald-400">2h à 4h ouvrées</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playTapBeep(); setIsWithdrawOpen(true); }}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Demander un virement ({formatCFA(profile.availableBalance)})
                    </button>
                  </div>
                </div>

                {/* Comment ça fonctionne */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-400" />
                        Comment maximiser vos revenus récurrents ?
                      </h4>
                      <span className="text-[11px] font-bold text-slate-500">Guide Partenaire</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">
                          1
                        </div>
                        <div className="text-xs font-bold text-white">Partagez votre QR ou lien</div>
                        <div className="text-[11px] text-slate-400 leading-normal">
                          Montrez l'application à un commerçant voisin ou partagez votre message WhatsApp pré-rédigé.
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center">
                          2
                        </div>
                        <div className="text-xs font-bold text-white">Il teste 14 jours gratuits</div>
                        <div className="text-[11px] text-slate-400 leading-normal">
                          Le commerçant s'inscrit sans carte bancaire et teste la caisse et la gestion de stock.
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                          3
                        </div>
                        <div className="text-xs font-bold text-white">Encaissez 15% à 20% à vie</div>
                        <div className="text-[11px] text-slate-400 leading-normal">
                          Chaque mois où il renouvelle son abonnement, la commission est créditée automatiquement.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400">
                      Besoin de dépliants ou d'affiches personnalisées avec votre QR Code ?
                    </span>
                    <button
                      onClick={() => setActiveTab('MARKETING_KIT')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Consulter les kits de promotion <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB 2 : BOUTIQUES FILLEULES (SUIVI DÉTAILLÉ)
             ----------------------------------------------------------------------- */}
          {activeTab === 'STORES' && (
            <div className="space-y-5">
              
              {/* Entête avec filtres et recherche */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Filtrer :</span>
                  {(['ALL', 'ACTIVE', 'TRIAL'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => { playTapBeep(); setStatusFilter(filterKey); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        statusFilter === filterKey
                          ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filterKey === 'ALL' && `Toutes (${profile.referredStores.length})`}
                      {filterKey === 'ACTIVE' && `Abonnées (${activeStoresCount})`}
                      {filterKey === 'TRIAL' && `En essai (${trialStoresCount})`}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une boutique..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tableau / Liste des boutiques filleules */}
              {filteredStores.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Store className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Aucune boutique enregistrée pour le moment</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      Invitez vos confrères commerçants avec votre lien ou QR code. Dès qu'une boutique s'inscrit, elle apparaîtra ici en temps réel avec le suivi de ses commissions !
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? 'Lien copié !' : 'Copier mon lien de parrainage'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppTemplate(marketingTemplates[0].fullText)}
                      className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-950/40"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Inviter sur WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => { playTapBeep(); setActiveTab('MARKETING_KIT'); }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      Kit Marketing & QR Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3.5 px-4 sm:px-6">Boutique & Propriétaire</th>
                          <th className="py-3.5 px-4">Date d'inscription</th>
                          <th className="py-3.5 px-4">Statut d'abonnement</th>
                          <th className="py-3.5 px-4 text-right">Commissions générées</th>
                          <th className="py-3.5 px-4 text-center">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredStores.map((store) => (
                          <tr key={store.storeId} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-4 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-emerald-400 text-xs shrink-0">
                                  {store.storeName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs sm:text-sm">{store.storeName}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>{store.ownerName}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="font-mono text-[10px] text-slate-500">{store.storeId}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(store.registeredAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              {store.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ABONNÉE (ACTIF)
                                </span>
                              ) : store.status === 'TRIAL' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  ESSAI GRATUIT (14J)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                                  EXPIRÉ
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="font-black text-emerald-400 text-xs sm:text-sm">
                                +{formatCFA(store.commissionGenerated)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {store.status === 'ACTIVE' ? '15% récurrent' : 'En attente 1er abonnement'}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => {
                                  playTapBeep();
                                  const text = `Bonjour ${store.ownerName}, j'espère que l'utilisation de Nanasore dans votre boutique "${store.storeName}" se passe bien ! Besoin d'une astuce sur la caisse ou le stock ?`;
                                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Prendre des nouvelles sur WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB 3 : PORTEFEUILLE & RETRAITS MOBILE MONEY
             ----------------------------------------------------------------------- */}
          {activeTab === 'WALLET' && (
            <div className="space-y-6">
              
              {/* Carte Résumé du Portefeuille */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/40 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Solde Disponible Immédiat</span>
                    <div className="text-3xl font-black text-white mt-1">
                      {formatCFA(profile.availableBalance)}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Fonds validés prêts à être virés par Mobile Money.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setIsWithdrawOpen(true); }}
                    className="mt-4 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Effectuer un retrait
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">En cours de traitement</span>
                    <div className="text-3xl font-black text-white mt-1">
                      {formatCFA(pendingWithdrawalTotal)}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Demandes de retrait reçues et en attente de versement final.
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Délais habituels : 2h à 4h ouvrées
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Total Déjà Encaissé</span>
                    <div className="text-3xl font-black text-white mt-1">
                      {formatCFA(profile.totalEarned - profile.availableBalance)}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Montant cumulé déjà viré avec succès sur vos comptes Mobile Money.
                    </p>
                  </div>

                  <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% de fiabilité de versement
                  </div>
                </div>
              </div>

              {/* Historique des transactions de retrait */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Historique des Retraits Mobile Money
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">{withdrawals.length} demande(s)</span>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    Aucun retrait effectué pour le moment.
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4 sm:px-6">Référence & Date</th>
                            <th className="py-3 px-4">Opérateur & Numéro</th>
                            <th className="py-3 px-4">Montant Net</th>
                            <th className="py-3 px-4">Statut</th>
                            <th className="py-3 px-4">Notes & Réf. Virement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {withdrawals.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="font-mono font-bold text-white text-xs">{item.id}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1">
                                  {getProviderBadge(item.provider)}
                                  <span className="font-mono text-[11px] text-slate-300 font-bold">
                                    {item.phone}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-black text-white text-sm">
                                  {formatCFA(item.amount)}
                                </div>
                                <div className="text-[10px] text-emerald-400">Frais de retrait 0 F</div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {getStatusBadge(item.status)}
                              </td>

                              <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                                {item.adminNotes || 'En cours de validation par la centrale Nanasore'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB 4 : KIT MARKETING & OUTILS DE PROMOTION
             ----------------------------------------------------------------------- */}
          {activeTab === 'MARKETING_KIT' && (
            <div className="space-y-6">
              
              {/* QR CODE & OUTILS VISUELS */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                
                <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0 flex flex-col items-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Parrainage Nanasore"
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                  <span className="text-[10px] font-black text-slate-800 mt-2 font-mono">
                    {affiliateCode}
                  </span>
                </div>

                <div className="space-y-3 text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code Officiel Partenaire
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Faites scanner ce QR Code directement en boutique
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    Idéal lorsque vous rendez visite à un commerçant ami. Il lui suffit de pointer son smartphone sur l'écran pour ouvrir la page d'inscription pré-remplie avec votre code.
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Afficher en plein écran
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadQrCode}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger l'image QR
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppTemplate(marketingTemplates[0].fullText)}
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/40"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={handleShareFacebook}
                      className="px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-950/40"
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </button>
                  </div>
                </div>

              </div>

              {/* TEMPLATES WHATSAPP PRÊTS À L'EMPLOI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    Messages d'invitation WhatsApp prêts à l'envoi
                  </h4>
                  <span className="text-xs text-slate-500">Testés pour un taux de conversion maximal</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {marketingTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          {template.category}
                        </span>
                        <h5 className="font-black text-white text-xs sm:text-sm mb-2">
                          {template.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 italic line-clamp-4 leading-relaxed font-sans mb-4">
                          "{template.preview}"
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleShareWhatsAppTemplate(template.fullText)}
                          className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-emerald-950/40 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Envoyer sur WhatsApp
                        </button>

                        <button
                          onClick={() => handleCopyTemplate(template)}
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedTemplateId === template.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Texte copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copier le texte
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ARGUMENTS CLÉS DE VENTE (PITCH RAPIDE) */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Les 4 Arguments Clés pour convaincre n'importe quel commerçant
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Mode 100% Hors-Ligne
                    </div>
                    <div className="text-[11px] text-slate-400 leading-normal">
                      Aucune interruption de vente même lors des pannes de réseau Internet fréquentes.
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Zéro Perte ni Vol
                    </div>
                    <div className="text-[11px] text-slate-400 leading-normal">
                      Clôture de caisse mathématique aveugle : le gérant sait exactement où va chaque franc CFA.
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Reçus WhatsApp Gratuits
                    </div>
                    <div className="text-[11px] text-slate-400 leading-normal">
                      Économisez sur les rouleaux thermiques en envoyant les tickets directement sur WhatsApp.
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Carnet de Dettes Intelligent
                    </div>
                    <div className="text-[11px] text-slate-400 leading-normal">
                      Relances amicales automatiques pour se faire rembourser les crédits clients 3x plus vite.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB 5 : SIMULATEUR DE REVENUS PASSIFS
             ----------------------------------------------------------------------- */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl">
                
                <div className="max-w-2xl space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Simulateur de Rente Récurrente Nanasore
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Calculez vos revenus mensuels prévisionnels
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Ajustez le curseur ci-dessous selon le nombre de boutiques et commerces que vous pouvez inviter dans votre quartier, ville ou réseau professionnel.
                  </p>
                </div>

                {/* Slider interactif */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Nombre de boutiques partenaires abonnées
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-base">
                      {simulatedStores} boutiques
                    </span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={simulatedStores}
                    onChange={(e) => setSimulatedStores(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>1 boutique</span>
                    <span>15 boutiques</span>
                    <span>30 boutiques</span>
                    <span>45 boutiques</span>
                    <span>60+ boutiques</span>
                  </div>
                </div>

                {/* Résultats de simulation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase">Revenu Mensuel Récurrent</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {formatCFA(simulatedStores * (subscriptionCostPerMonth * (partnerTier.rate / 100)))}
                    </div>
                    <div className="text-[10px] text-slate-500">Versé chaque mois sans interruption</div>
                  </div>

                  <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-5 text-center space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase">Revenu Annuel Total</div>
                    <div className="text-2xl sm:text-3xl font-black text-indigo-300">
                      {formatCFA(simulatedStores * (subscriptionCostPerMonth * (partnerTier.rate / 100)) * 12)}
                    </div>
                    <div className="text-[10px] text-slate-500">Sur 12 mois de fidélité</div>
                  </div>

                  <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-5 text-center space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase">Taux de Commission</div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400">
                      {partnerTier.rate}%
                    </div>
                    <div className="text-[10px] text-slate-500">Statut : {partnerTier.name}</div>
                  </div>

                </div>

                {/* Équivalence concrète */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-300">
                  <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    💡 <strong>Concrètement :</strong> Avec seulement {simulatedStores} boutiques actives, vous générez <strong className="text-emerald-400">{formatCFA(simulatedStores * (subscriptionCostPerMonth * (partnerTier.rate / 100)) * 12)} par an</strong>, de quoi couvrir largement le loyer d'un magasin ou vos factures d'électricité !
                  </span>
                </div>

                {/* Bouton d'action direct vers les outils */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-center sm:text-left">
                    <div className="text-sm font-black text-white">Prêt à développer vos revenus récurrents ?</div>
                    <div className="text-xs text-slate-400">Partagez votre lien ou votre QR code avec les commerçants de votre entourage.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setActiveTab('MARKETING_KIT'); }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Share2 className="w-4 h-4" />
                    Accéder à mes outils de parrainage
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* =========================================================================
            MODAL INNER : RETRAIT MOBILE MONEY
           ========================================================================= */}
        {isWithdrawOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200 text-slate-100">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-black text-base">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>Demande de Retrait Mobile Money</span>
                </div>
                <button 
                  onClick={() => setIsWithdrawOpen(false)} 
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {withdrawSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-white text-lg">
                    {profile.availableBalance < 5000 ? 'Coordonnées Enregistrées !' : 'Demande Validée !'}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                    {profile.availableBalance < 5000
                      ? `Votre compte Mobile Money (${withdrawPhone}) est prêt. Dès que votre solde atteint 5 000 FCFA, vos gains vous seront virés automatiquement.`
                      : `Votre demande de virement de ${formatCFA(withdrawAmount)} a été envoyée avec succès sur votre numéro ${withdrawPhone}.`
                    }
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-2">
                    {profile.availableBalance < 5000 ? 'Configuration sauvegardée' : 'Délai estimé : 2 à 4 heures'}
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={profile.availableBalance < 5000 ? (e) => {
                    e.preventDefault();
                    if (!withdrawPhone || withdrawPhone.length < 8) {
                      setWithdrawError('Veuillez indiquer un numéro Mobile Money valide.');
                      return;
                    }
                    playValidationBeep();
                    setWithdrawError(null);
                    setWithdrawSuccess(true);
                    setTimeout(() => {
                      setWithdrawSuccess(false);
                      setIsWithdrawOpen(false);
                    }, 2000);
                  } : handleWithdrawSubmit} 
                  className="space-y-4 pt-4 text-xs"
                >
                  
                  {withdrawError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {withdrawError}
                    </div>
                  )}

                  {/* Solde disponible rappel */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Solde disponible :</span>
                    <span className="font-black text-emerald-400 text-sm">{formatCFA(profile.availableBalance)}</span>
                  </div>

                  {profile.availableBalance < 5000 && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        Seuil minimum de retrait : 5 000 F CFA
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed">
                        Votre solde actuel est de <strong>{formatCFA(profile.availableBalance)}</strong>. Vous pouvez pré-enregistrer vos coordonnées Mobile Money ci-dessous, puis partager votre lien pour enregistrer vos premières boutiques.
                      </div>
                    </div>
                  )}

                  {/* Montant (actif si solde >= 5000) */}
                  {profile.availableBalance >= 5000 && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        Montant à virer (FCFA)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={5000}
                          max={profile.availableBalance}
                          step={500}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 font-black text-white text-sm focus:border-emerald-500 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(profile.availableBalance)}
                          className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] cursor-pointer"
                        >
                          MAX
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Minimum : 5 000 FCFA</span>
                        <span>Frais : 0 FCFA (Offerts)</span>
                      </div>
                    </div>
                  )}

                  {/* Opérateur Mobile Money */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">
                      Réseau Mobile Money
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'WAVE', label: 'Wave', color: 'border-sky-500/40 text-sky-300' },
                        { key: 'ORANGE_MONEY', label: 'Orange Money', color: 'border-orange-500/40 text-orange-300' },
                        { key: 'MTN_MOMO', label: 'MTN MoMo', color: 'border-yellow-500/40 text-yellow-300' },
                        { key: 'MOOV_MONEY', label: 'Moov Money', color: 'border-blue-500/40 text-blue-300' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setWithdrawProvider(item.key as MobileMoneyProvider)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                            withdrawProvider === item.key
                              ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{item.label}</span>
                          {withdrawProvider === item.key && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numéro de téléphone */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Numéro de téléphone du compte Mobile Money
                    </label>
                    <input
                      type="tel"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      placeholder="Ex: +225 07 12 34 56 78"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Nom complet du titulaire */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Nom complet du titulaire du compte
                    </label>
                    <input
                      type="text"
                      value={withdrawAccountName}
                      onChange={(e) => setWithdrawAccountName(e.target.value)}
                      placeholder="Ex: Mamadou Ouattara"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    {profile.availableBalance >= 5000 ? (
                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        Confirmer le virement ({formatCFA(withdrawAmount)})
                      </button>
                    ) : (
                      <>
                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-95 border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Enregistrer mes coordonnées Mobile Money
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsWithdrawOpen(false);
                            setActiveTab('MARKETING_KIT');
                          }}
                          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Partager mon lien & débloquer mes commissions
                        </button>
                      </>
                    )}
                  </div>

                </form>
              )}

            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL INNER : QR CODE PLEIN ÉCRAN
           ========================================================================= */}
        {isQrModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-white uppercase tracking-wider">Scanner pour s'inscrire</span>
                <button 
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-white rounded-2xl shadow-2xl mx-auto inline-block">
                <img
                  src={qrCodeUrl}
                  alt="QR Code Parrainage"
                  className="w-56 h-56 object-contain rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300">Code Partenaire :</div>
                <div className="text-lg font-black font-mono text-emerald-400 tracking-wider">
                  {affiliateCode}
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Pointez la caméra du téléphone du commerçant sur l'écran pour démarrer les 14 jours d'essai gratuit.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Lien de parrainage copié !' : 'Copier le lien direct'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQrCode}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppTemplate(marketingTemplates[0].fullText)}
                    className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AffiliateDashboardModal;
