import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Lock,
  KeyRound,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Send,
  X,
  ExternalLink,
  Share2,
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { UltimateCheckout } from '../../services/nana-switch/payment/UltimateCheckout';
import { subscribeToStoreProjects } from '../../services/escrowService';

export interface NanaWalletHomeProps {
  onBackToHub?: () => void;
  className?: string;
}

interface PaygModuleItem {
  id: string;
  name: string;
  category: string;
  unitLabel: string;
  priceXof: number;
  supabaseModuleKey: string;
  description: string;
}

interface WalletTxItem {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  category?: string;
  reference?: string;
  status: string;
  createdAt: string;
}

interface PaymentLinkItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  url: string;
  merchant_name?: string;
  clicks?: number;
  payments?: number;
}

interface UniverseOption {
  id: string;
  name: string;
  sector?: string;
  balanceXof: number;
}

type WalletTab = 'HOME' | 'PAYG' | 'LINKS' | 'WITHDRAW' | 'SECURITY';

const QUICK_RECHARGE_AMOUNTS = [2000, 5000, 10000, 25000, 50000];

const formatCFA = (val: number) => `${Math.round(Number(val) || 0).toLocaleString('fr-FR')} FCFA`;

export default function NanaWalletHome({ onBackToHub, className = '' }: NanaWalletHomeProps) {
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<WalletTab>('HOME');
  const [universes, setUniverses] = useState<UniverseOption[]>([]);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('');
  const [resolvedUserId, setResolvedUserId] = useState<string>(authUser?.id || '');
  const [resolvedUserName, setResolvedUserName] = useState<string>(authUser?.name || 'Marchand');
  const [resolvedUserEmail, setResolvedUserEmail] = useState<string>(authUser?.email || '');
  const [resolvedUserPhone, setResolvedUserPhone] = useState<string>(authUser?.phone || '');

  // Source de vérité serveur (zéro mock, zéro solde fictif)
  const [balanceXof, setBalanceXof] = useState<number>(0);
  const [paymentsCount, setPaymentsCount] = useState<number>(0);
  const [totalSalesNetXof, setTotalSalesNetXof] = useState<number>(0);
  const [escrowLockedXof, setEscrowLockedXof] = useState<number>(0);
  const [escrowReleasedXof, setEscrowReleasedXof] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTxItem[]>([]);
  const [paygCatalog, setPaygCatalog] = useState<PaygModuleItem[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, { credits: number; totalSpentXof: number; lastUnlockedAt: string }>>({});
  const [hasMasterPin, setHasMasterPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(true);
  const [isUnmaskPinModalOpen, setIsUnmaskPinModalOpen] = useState<boolean>(false);
  const [unmaskPinInput, setUnmaskPinInput] = useState<string>('');
  const [isVerifyingUnmaskPin, setIsVerifyingUnmaskPin] = useState<boolean>(false);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Recharge via VRAI UltimateCheckout
  const [isRechargeAmountModalOpen, setIsRechargeAmountModalOpen] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(5000);
  const [isUltimateCheckoutOpen, setIsUltimateCheckoutOpen] = useState<boolean>(false);
  const [activeRechargeOrderId, setActiveRechargeOrderId] = useState<string>('');

  // Pay-As-You-Go multi-sélection
  const [selectedPaygIds, setSelectedPaygIds] = useState<string[]>([]);
  const [paygPinInput, setPaygPinInput] = useState<string>('');
  const [isPayingPayg, setIsPayingPayg] = useState<boolean>(false);

  // Liens de paiement (identiques au Wallet principal)
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState<boolean>(false);
  const [linkTitle, setLinkTitle] = useState<string>('');
  const [linkDescription, setLinkDescription] = useState<string>('');
  const [linkAmount, setLinkAmount] = useState<string>('');
  const [isCreatingLink, setIsCreatingLink] = useState<boolean>(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Retraits Mobile Money réels
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawProvider, setWithdrawProvider] = useState<'wave' | 'orange' | 'moov' | 'mtn'>('wave');
  const [withdrawPhone, setWithdrawPhone] = useState<string>('');
  const [withdrawPin, setWithdrawPin] = useState<string>('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  // Master PIN (création / modification)
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);

  // PWA Install Prompt (/manifest-wallet.json?v=wallet_v3)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState<boolean>(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(prev => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  // 1. Injection dynamique du Manifest PWA dédié (/manifest-wallet.json?v=wallet_v3) + capture beforeinstallprompt
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existingManifest = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const previousHref = existingManifest?.getAttribute('href') || '/manifest.json';

    if (existingManifest) {
      existingManifest.setAttribute('href', '/manifest-wallet.json?v=wallet_v3');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest-wallet.json?v=wallet_v3';
      document.head.appendChild(link);
    }

    const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || (window.navigator as any)?.standalone === true;
    if (isStandalone) setIsPwaInstalled(true);

    const globalPrompt = (window as any).__nanaDeferredInstallPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__nanaDeferredInstallPrompt = e;
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      (window as any).__nanaDeferredInstallPrompt = null;
      showToast('Nanawallet installé sur votre écran d\'accueil !', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (existingManifest && previousHref) {
        existingManifest.setAttribute('href', previousHref);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handleInstallPwa = async () => {
    playTapBeep();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/nana-wallet')) {
      window.location.href = '/nana-wallet?install=1';
      return;
    }
    const promptEvent = deferredPrompt || (window as any).__nanaDeferredInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice.catch(() => null);
        if (choice?.outcome === 'accepted') {
          setIsPwaInstalled(true);
        }
      } catch {
        setShowIosInstallHint(true);
        showToast('Ouvrez le menu du navigateur (⋮ ou Partager) → « Ajouter à l\'écran d\'accueil ».', 'info');
      }
      setDeferredPrompt(null);
      (window as any).__nanaDeferredInstallPrompt = null;
    } else {
      setShowIosInstallHint(true);
      showToast('Ouvrez le menu du navigateur (⋮ sur Chrome ou Partager sur Safari) → « Ajouter à l\'écran d\'accueil ».', 'info');
    }
  };

  // 2. Résolution utilisateur connecté + Univers marchands réels (Cloud)
  useEffect(() => {
    let mounted = true;
    const bootstrapUserAndUniverses = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData?.user;
        const uid = u?.id || authUser?.id || '';
        const uEmail = u?.email || authUser?.email || '';
        const uName =
          (u?.user_metadata as any)?.full_name ||
          (u?.user_metadata as any)?.name ||
          authUser?.name ||
          uEmail.split('@')[0] ||
          'Marchand';
        const uPhone = (u?.user_metadata as any)?.phone || authUser?.phone || '';

        if (mounted) {
          setResolvedUserId(uid);
          setResolvedUserEmail(uEmail);
          setResolvedUserName(uName);
          if (uPhone) {
            setResolvedUserPhone(uPhone);
            setWithdrawPhone(prev => prev || uPhone);
          }
        }

        if (uid) {
          const { data: univRows } = await supabase
            .from('universes')
            .select('id, name, sector, balances')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

          if (mounted && Array.isArray(univRows) && univRows.length > 0) {
            const mapped: UniverseOption[] = univRows.map((r: any) => ({
              id: String(r.id),
              name: r.name || 'Univers Marchand',
              sector: r.sector || '',
              balanceXof: Number(r.balances?.XOF ?? 0) || 0,
            }));
            setUniverses(mapped);
            setSelectedUniverseId(prev => prev || mapped[0].id);
            return;
          }
        }
      } catch (err) {
        console.warn('[WALLET] Chargement univers:', err);
      }
    };
    bootstrapUserAndUniverses();
    return () => { mounted = false; };
  }, [authUser?.id, authUser?.email, authUser?.name, authUser?.phone]);

  // 3. Chargement unifié du résumé Wallet depuis le serveur (zéro mock)
  const fetchWalletSummary = useCallback(async () => {
    if (!selectedUniverseId && !resolvedUserId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUniverseId) params.set('universeId', selectedUniverseId);
      if (resolvedUserId) params.set('userId', resolvedUserId);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const headers: Record<string, string> = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};

      const res = await fetch(`/api/merchant/wallet/summary?${params.toString()}`, { headers });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        const nextBal = Number(json.balanceXof ?? 0) || 0;
        const txList = Array.isArray(json.transactions) ? json.transactions : [];
        setBalanceXof(nextBal);
        setTransactions(txList);
        const creditTxs = txList.filter((t: any) => t.type === 'CREDIT' || t.category === 'SALE');
        setPaymentsCount(typeof json.paymentsCount === 'number' ? json.paymentsCount : creditTxs.length);
        setTotalSalesNetXof(
          typeof json.totalSalesNetXof === 'number'
            ? json.totalSalesNetXof
            : creditTxs.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0)
        );
        setPaygCatalog(Array.isArray(json.paygCatalog) ? json.paygCatalog : []);
        setEntitlements(json.entitlements && typeof json.entitlements === 'object' ? json.entitlements : {});
        setHasMasterPin(Boolean(json.hasMasterPin));
      }
    } catch (err) {
      console.warn('[WALLET] Erreur chargement summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedUniverseId, resolvedUserId]);

  useEffect(() => {
    fetchWalletSummary();
  }, [fetchWalletSummary]);

  // Écoute Temps Réel Cloud sur wallet_transactions & universes
  useEffect(() => {
    if (!selectedUniverseId && !resolvedUserId) return;
    const channel = supabase
      .channel(`unified-wallet-${selectedUniverseId || resolvedUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => {
        fetchWalletSummary();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universes' }, () => {
        fetchWalletSummary();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUniverseId, resolvedUserId, fetchWalletSummary]);

  // Écoute Temps Réel des soldes Escrow / Séquestre (Bloqué vs Débloqué)
  useEffect(() => {
    const storeKey = selectedUniverseId || resolvedUserId;
    if (!storeKey) return;
    const unsub = subscribeToStoreProjects(storeKey, (projectsList) => {
      let locked = 0;
      let released = 0;
      for (const p of projectsList) {
        const rel = Math.max(0, Math.round(Number(p.releasedAmount) || 0));
        if (p.status === 'funds_locked' || p.status === 'work_in_progress' || p.status === 'delivered') {
          locked += Math.max(0, Math.round(p.totalAmount) - rel);
          released += rel;
        } else if (p.status === 'completed_released') {
          released += Math.round(p.totalAmount);
        }
      }
      setEscrowLockedXof(locked);
      setEscrowReleasedXof(released);
    });
    return () => unsub();
  }, [selectedUniverseId, resolvedUserId]);

  const broadcastWalletBalanceUpdate = useCallback((nextBalanceXof: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nanasore_wallet_updated', {
        detail: {
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          balanceXof: nextBalanceXof
        }
      }));
    }
  }, [selectedUniverseId, resolvedUserId]);

  // 4. Chargement des Liens de paiement IDENTIQUES au Wallet principal (/api/payment-links)
  const fetchPaymentLinks = useCallback(async () => {
    if (!selectedUniverseId) {
      setPaymentLinks([]);
      return;
    }
    setIsLoadingLinks(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || '';
      if (!token) {
        setPaymentLinks([]);
        return;
      }
      const res = await fetch(`/api/payment-links?tenantId=${encodeURIComponent(selectedUniverseId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.links)) {
        setPaymentLinks(json.links);
      }
    } catch (err) {
      console.warn('[WALLET] Erreur chargement liens de paiement:', err);
    } finally {
      setIsLoadingLinks(false);
    }
  }, [selectedUniverseId]);

  useEffect(() => {
    if (activeTab === 'LINKS') {
      fetchPaymentLinks();
    }
  }, [activeTab, fetchPaymentLinks]);

  const handleCreatePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUniverseId) {
      showToast('Sélectionnez d\'abord un univers marchand pour générer un lien de paiement.', 'error');
      return;
    }
    const amt = Number(linkAmount);
    if (!linkTitle.trim() || !Number.isFinite(amt) || amt <= 0) {
      showToast('Veuillez saisir un libellé et un montant valide (> 0 FCFA).', 'error');
      return;
    }

    setIsCreatingLink(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || '';
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tenantId: selectedUniverseId,
          title: linkTitle.trim(),
          description: linkDescription.trim(),
          amount: amt,
          currency: 'XOF',
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Impossible de générer le lien de paiement.');
      }

      playValidationBeep();
      setLinkTitle('');
      setLinkDescription('');
      setLinkAmount('');
      showToast('Lien de paiement généré et synchronisé dans tout votre Dashboard !', 'success');
      await fetchPaymentLinks();
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la création du lien.', 'error');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const getWalletAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) base.Authorization = `Bearer ${token}`;
    } catch {}
    return base;
  }, []);

  // 5. Lancement du VRAI UltimateCheckout pour la Recharge (Intention créée côté serveur)
  const handleLaunchUltimateCheckout = async () => {
    if (rechargeAmount < 100) {
      showToast('Montant minimum de recharge : 100 FCFA.', 'error');
      return;
    }
    playTapBeep();
    try {
      const headers = await getWalletAuthHeaders();
      const intentRes = await fetch('/api/merchant/wallet/recharge/intent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          amount: rechargeAmount,
        }),
      });
      const intentJson = await intentRes.json().catch(() => null);
      if (!intentRes.ok || !intentJson?.success || !intentJson?.orderId) {
        throw new Error(intentJson?.error || 'Impossible d\'initialiser la recharge sécurisée.');
      }
      setActiveRechargeOrderId(intentJson.orderId);
      setIsRechargeAmountModalOpen(false);
      setIsUltimateCheckoutOpen(true);
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de l\'initialisation de la recharge.', 'error');
    }
  };

  const handleUltimateCheckoutSuccess = async (details: any) => {
    setIsUltimateCheckoutOpen(false);
    try {
      const headers = await getWalletAuthHeaders();
      const res = await fetch('/api/merchant/wallet/recharge/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          amount: Number(details?.amount || rechargeAmount),
          provider: details?.provider || details?.paymentMethod || 'UltimateCheckout',
          reference: activeRechargeOrderId || details?.orderId || details?.transactionRef,
          orderId: activeRechargeOrderId,
          phone: details?.phone || resolvedUserPhone
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Erreur confirmation recharge.');
      }
      playCashChime();
      const nextBal = Number(json.balanceXof ?? 0) || 0;
      setBalanceXof(nextBal);
      broadcastWalletBalanceUpdate(nextBal);
      await fetchWalletSummary();
      showToast(`Recharge de ${formatCFA(Number(json.amount || details?.amount || rechargeAmount))} vérifiée et créditée !`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la synchronisation de la recharge.', 'error');
    }
  };

  // 6. Paiement multi-modules Pay-As-You-Go (décrémente partout + exécute dans le Cloud pour chaque module)
  const togglePaygModule = (modId: string) => {
    playTapBeep();
    setSelectedPaygIds(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const selectedPaygTotal = useMemo(() => {
    return paygCatalog
      .filter(m => selectedPaygIds.includes(m.id))
      .reduce((sum, m) => sum + m.priceXof, 0);
  }, [paygCatalog, selectedPaygIds]);

  const handleExecutePaygPayment = async () => {
    if (selectedPaygIds.length === 0) {
      showToast('Sélectionnez au moins un module Pay-As-You-Go.', 'error');
      return;
    }
    if (balanceXof < selectedPaygTotal) {
      showToast(`Solde insuffisant (${formatCFA(balanceXof)}). Rechargez via UltimateCheckout.`, 'error');
      return;
    }
    if (hasMasterPin && !paygPinInput.trim()) {
      showToast('Veuillez saisir votre Master PIN pour autoriser ce paiement.', 'error');
      return;
    }

    setIsPayingPayg(true);
    try {
      const headers = await getWalletAuthHeaders();
      const res = await fetch('/api/merchant/wallet/pay-as-you-go', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          moduleIds: selectedPaygIds,
          pin: paygPinInput.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Paiement Pay-As-You-Go refusé.');
      }

      playCashChime();
      const nextBal = Number(json.balanceXof ?? 0) || 0;
      setBalanceXof(nextBal);
      setSelectedPaygIds([]);
      setPaygPinInput('');
      broadcastWalletBalanceUpdate(nextBal);
      await fetchWalletSummary();
      showToast(
        `${json.activatedModules?.length || 1} module(s) activé(s) sur le Cloud (-${formatCFA(json.totalCost)}) !`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors du paiement Pay-As-You-Go.', 'error');
    } finally {
      setIsPayingPayg(false);
    }
  };

  // 7. Retrait Mobile Money réel (protégé par Master PIN + POST /api/payouts/request)
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(Number(withdrawAmount) || 0);
    if (amt < 1000) {
      showToast('Montant minimum de retrait : 1 000 FCFA.', 'error');
      return;
    }
    if (amt > balanceXof) {
      showToast(`Solde insuffisant (${formatCFA(balanceXof)} disponible).`, 'error');
      return;
    }
    if (!withdrawPhone.trim()) {
      showToast('Renseignez votre numéro Mobile Money bénéficiaire.', 'error');
      return;
    }
    if (hasMasterPin && !withdrawPin.trim()) {
      showToast('Saisissez votre Master PIN pour confirmer le retrait.', 'error');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const headers = await getWalletAuthHeaders();
      if (hasMasterPin) {
        const pinRes = await fetch('/api/merchant/wallet/pin/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            universeId: selectedUniverseId,
            userId: resolvedUserId,
            pin: withdrawPin.trim()
          })
        });
        const pinJson = await pinRes.json().catch(() => null);
        if (!pinRes.ok || !pinJson?.verified) {
          throw new Error(pinJson?.error || 'Master PIN incorrect.');
        }
      }

      const providerNames: Record<string, string> = {
        wave: 'Wave Mobile Money',
        orange: 'Orange Money',
        moov: 'Moov Money',
        mtn: 'MTN Mobile Money'
      };
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId || null,
          amount: amt,
          fee: 0,
          netAmount: amt,
          currency: 'XOF',
          country: 'UEMOA',
          countryCode: 'BF',
          operatorId: withdrawProvider,
          operatorName: providerNames[withdrawProvider],
          destination: withdrawPhone.trim(),
          beneficiary: resolvedUserName,
          pin: withdrawPin.trim(),
          mode: 'PRODUCTION'
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Erreur demande de retrait.');
      }

      playValidationBeep();
      const nextBal = json?.balanceXof !== undefined ? Number(json.balanceXof) : Math.max(0, balanceXof - amt);
      setBalanceXof(nextBal);
      setWithdrawAmount('');
      setWithdrawPin('');
      broadcastWalletBalanceUpdate(nextBal);
      await fetchWalletSummary();
      showToast(`Retrait de ${formatCFA(amt)} vers ${providerNames[withdrawProvider]} enregistré !`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors du retrait.', 'error');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // 8. Création / Mise à jour Master PIN (scrypt côté serveur)
  const handleSaveMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(newPinInput.trim())) {
      showToast('Le Master PIN doit contenir entre 4 et 6 chiffres.', 'error');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      showToast('Les deux saisies du Master PIN ne correspondent pas.', 'error');
      return;
    }
    setIsSavingPin(true);
    try {
      const headers = await getWalletAuthHeaders();
      const res = await fetch('/api/merchant/wallet/pin/set', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          pin: newPinInput.trim(),
          currentPin: currentPinInput.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Impossible d\'enregistrer le Master PIN.');
      }

      playValidationBeep();
      setHasMasterPin(true);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      showToast('Master PIN chiffré et activé sur votre Wallet Marchand !', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erreur enregistrement Master PIN.', 'error');
    } finally {
      setIsSavingPin(false);
    }
  };

  // 9. Démasquage des chiffres du Nanawallet protégé par Master PIN
  const handleToggleBalanceVisibility = () => {
    playTapBeep();
    if (!isBalanceHidden) {
      setIsBalanceHidden(true);
      return;
    }
    if (!hasMasterPin) {
      showToast('Veuillez d\'abord configurer votre Master PIN pour démasquer les chiffres du Nanawallet.', 'info');
      setActiveTab('SECURITY');
      return;
    }
    setUnmaskPinInput('');
    setIsUnmaskPinModalOpen(true);
  };

  const handleVerifyUnmaskPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(unmaskPinInput.trim())) {
      showToast('Le Master PIN doit contenir entre 4 et 6 chiffres.', 'error');
      return;
    }
    setIsVerifyingUnmaskPin(true);
    try {
      const headers = await getWalletAuthHeaders();
      const res = await fetch('/api/merchant/wallet/pin/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          universeId: selectedUniverseId,
          userId: resolvedUserId,
          pin: unmaskPinInput.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.verified) {
        throw new Error(json?.error || 'Master PIN incorrect.');
      }
      playValidationBeep();
      setIsBalanceHidden(false);
      setIsUnmaskPinModalOpen(false);
      setUnmaskPinInput('');
      showToast('Chiffres du Nanawallet démasqués.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Master PIN incorrect.', 'error');
    } finally {
      setIsVerifyingUnmaskPin(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (activityFilter === 'ALL') return transactions;
    return transactions.filter(t => t.type === activityFilter);
  }, [transactions, activityFilter]);

  const activeUniverse = useMemo(
    () => universes.find(u => u.id === selectedUniverseId) || null,
    [universes, selectedUniverseId]
  );

  const renderUniverseIdField = (label: string = "ID de l'univers") => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{label}</span>
        </label>
        {selectedUniverseId && (
          <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-md truncate max-w-[170px]">
            {selectedUniverseId}
          </span>
        )}
      </div>
      {universes.length > 0 ? (
        <select
          value={selectedUniverseId}
          onChange={(e) => {
            setSelectedUniverseId(e.target.value);
            setIsBalanceHidden(true);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          required
        >
          {!selectedUniverseId && <option value="">-- Sélectionner un univers --</option>}
          {universes.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.id}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={selectedUniverseId}
          onChange={(e) => setSelectedUniverseId(e.target.value)}
          placeholder="Saisissez l'ID de l'univers (ex: univ_...)"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          required
        />
      )}
    </div>
  );

  return (
    <div className={`min-h-[100dvh] w-full bg-slate-950 text-slate-100 font-sans antialiased flex flex-col ${className}`}>
      {/* Toast Flottant */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
          toast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
            : toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-200'
              : 'bg-blue-950/95 border-blue-500/60 text-blue-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* En-tête Sticky Mobile-First */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white border border-blue-200/40 flex items-center justify-center shadow-lg shrink-0 p-1.5">
              <img src="/wallet-icon.svg?v=wallet_v2" alt="Nanawallet" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-white truncate">Nanawallet</h1>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase">
                  Unifié
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeUniverse ? activeUniverse.name : resolvedUserName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isPwaInstalled && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                title="Installer Nanawallet sur votre téléphone"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                fetchWalletSummary();
                if (activeTab === 'LINKS') fetchPaymentLinks();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Synchroniser avec le Cloud"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Retour au Dashboard"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sélecteur d'Univers si plusieurs univers */}
        {universes.length > 1 && (
          <div className="max-w-3xl mx-auto mt-2.5 flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={selectedUniverseId}
              onChange={(e) => {
                setSelectedUniverseId(e.target.value);
                setIsBalanceHidden(true);
              }}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
            >
              {universes.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Indice d'installation iOS/Android si prompt natif indisponible */}
      {showIosInstallHint && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-3">
          <div className="p-3 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-start justify-between gap-2">
            <span>
              📲 Pour installer <strong>Nanawallet</strong> : ouvrez le menu de votre navigateur (Partager sur Safari iOS ou ⋮ sur Chrome Android) puis choisissez <strong>« Ajouter à l'écran d'accueil »</strong>.
            </span>
            <button type="button" onClick={() => setShowIosInstallHint(false)} className="text-indigo-300 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenu Principal Fluide (Mobile-First, pb-28 pour la barre du bas) */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 pb-28 space-y-5">
        {/* CARTE SOLDE PRINCIPAL UNIFIÉ */}
        <section className="rounded-3xl bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-slate-900 border border-blue-400/25 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-2 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Solde Marchand Réel (Synchronisé)
                </span>
                <button
                  type="button"
                  onClick={handleToggleBalanceVisibility}
                  title={isBalanceHidden ? 'Démasquer avec le Master PIN' : 'Masquer les chiffres'}
                  className="text-blue-200 hover:text-white cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {isBalanceHidden && <Lock className="w-2.5 h-2.5 text-amber-300" />}
                </button>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono tracking-tight">
                {isBalanceHidden ? '••••••••' : formatCFA(balanceXof)}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-blue-100/90 font-bold">
                <span className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/15">
                  Paiements reçus : <strong className="text-amber-300">{isBalanceHidden ? '••' : paymentsCount}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/15">
                  Total encaissé : <strong className="text-emerald-300">{isBalanceHidden ? '••••••' : formatCFA(totalSalesNetXof)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30">
                  Escrow bloqué : <strong className="text-amber-200">{isBalanceHidden ? '••••••' : formatCFA(escrowLockedXof)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
                  Escrow débloqué : <strong className="text-emerald-200">{isBalanceHidden ? '••••••' : formatCFA(escrowReleasedXof)}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('SECURITY')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 cursor-pointer ${
                hasMasterPin
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40 animate-pulse'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{hasMasterPin ? 'Master PIN Actif' : 'Activer Master PIN'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 relative z-10">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsRechargeAmountModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-2xl bg-white text-[#1E3A8A] hover:bg-blue-50 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Recharger</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('PAYG');
              }}
              className="py-2.5 px-3 rounded-2xl bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400/30 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>Pay-As-Go</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('LINKS');
              }}
              className="py-2.5 px-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 text-white border border-white/15 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Link2 className="w-4 h-4" />
              <span>Lien Pay</span>
            </button>
          </div>
        </section>

        {/* ONGLET 1 : ACCUEIL & HISTORIQUE RÉEL */}
        {activeTab === 'HOME' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Historique Réel ({isBalanceHidden ? '••' : filteredTransactions.length})
              </h2>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                {(['ALL', 'CREDIT', 'DEBIT'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activityFilter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? 'Tous' : f === 'CREDIT' ? '+ Crédits' : '- Débits'}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span>Synchronisation du portefeuille avec le Cloud...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
                <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Aucune transaction enregistrée</p>
                <p className="text-[11px] text-slate-500">
                  Rechargez votre wallet via UltimateCheckout ou générez un lien de paiement pour encaisser.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map(tx => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tx.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{tx.subtitle}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBalanceHidden ? '••••••' : `${isCredit ? '+' : '-'}${formatCFA(tx.amount)}`}
                        </p>
                        <span className="text-[9px] uppercase font-bold text-slate-400">{tx.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ONGLET 2 : MODULES SOUMIS AU PAY-AS-YOU-GO (SÉLECTION MULTIPLE + DÉCRÉMENTATION PARTOUT + CLOUD) */}
        {activeTab === 'PAYG' && (
          <section className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-black text-white">Modules soumis au Pay-As-You-Go</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Sélectionnez un ou plusieurs modules à activer. Chaque paiement décrémente immédiatement votre solde partout et exécute l'activation dans le Cloud pour chaque module concerné.
                </p>
              </div>
              {renderUniverseIdField("ID de l'univers à activer")}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paygCatalog.map(mod => {
                const isSelected = selectedPaygIds.includes(mod.id);
                const activeCredits = entitlements[mod.id]?.credits || 0;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => togglePaygModule(mod.id)}
                    className={`text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-950/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                          {mod.category}
                        </span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <h3 className="text-xs font-black text-white">{mod.name}</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{mod.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-sm font-black text-emerald-400 font-mono">{formatCFA(mod.priceXof)}</span>
                        <span className="block text-[10px] text-slate-400">{mod.unitLabel}</span>
                      </div>
                      {activeCredits > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                          {activeCredits} actif{activeCredits > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Barre de confirmation Pay-As-You-Go */}
            {selectedPaygIds.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900 border-2 border-blue-500/50 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {selectedPaygIds.length} module(s) sélectionné(s)
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    Total : {formatCFA(selectedPaygTotal)}
                  </span>
                </div>

                {renderUniverseIdField("ID de l'univers pour le paiement")}

                {hasMasterPin && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Master PIN requis pour valider le paiement</span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={paygPinInput}
                      onChange={(e) => setPaygPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Saisissez votre Master PIN (4-6 chiffres)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExecutePaygPayment}
                    disabled={isPayingPayg || balanceXof < selectedPaygTotal}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    {isPayingPayg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Exécution sur le Cloud...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Payer {formatCFA(selectedPaygTotal)} &amp; Activer</span>
                      </>
                    )}
                  </button>
                  {balanceXof < selectedPaygTotal && (
                    <button
                      type="button"
                      onClick={() => {
                        setRechargeAmount(Math.max(1000, selectedPaygTotal - balanceXof));
                        setIsRechargeAmountModalOpen(true);
                      }}
                      className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black cursor-pointer"
                    >
                      Recharger
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ONGLET 3 : LIENS DE PAIEMENT (IDENTIQUES AU WALLET PRINCIPAL) */}
        {activeTab === 'LINKS' && (
          <section className="space-y-4">
            <form onSubmit={handleCreatePaymentLink} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-black text-white">Générer un Lien de Paiement Unifié</h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Identique aux liens générés depuis votre Dashboard Principal — tout paiement reçu crédite directement ce Wallet et apparaît partout.
              </p>

              {renderUniverseIdField("ID de l'univers pour ce lien de paiement")}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Titre (ex: Acompte Prestation, Formation...)"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="number"
                  min={100}
                  value={linkAmount}
                  onChange={(e) => setLinkAmount(e.target.value)}
                  placeholder="Montant en FCFA (ex: 15000)"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <input
                type="text"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                placeholder="Description courte (optionnel)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isCreatingLink}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {isCreatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                <span>Générer le lien de paiement officiel</span>
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Vos Liens de Paiement ({paymentLinks.length})
              </h3>
              {isLoadingLinks ? (
                <div className="p-6 text-center text-xs text-slate-400">Chargement des liens...</div>
              ) : paymentLinks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  Aucun lien de paiement créé pour cet univers.
                </div>
              ) : (
                paymentLinks.map(lnk => (
                  <div key={lnk.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{lnk.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{lnk.url}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-400 font-mono shrink-0">
                        {formatCFA(lnk.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400">
                        {lnk.clicks || 0} clic(s) • {lnk.payments || 0} paiement(s)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(lnk.url).catch(() => {});
                            setCopiedLinkId(lnk.id);
                            setTimeout(() => setCopiedLinkId(null), 2000);
                            showToast('Lien copié !', 'success');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLinkId === lnk.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLinkId === lnk.id ? 'Copié' : 'Copier'}</span>
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Bonjour, voici votre lien de paiement sécurisé (${lnk.title} - ${formatCFA(lnk.amount)}) : ${lnk.url}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={lnk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Ouvrir le lien"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ONGLET 4 : RETRAITS MOBILE MONEY RÉELS */}
        {activeTab === 'WITHDRAW' && (
          <form onSubmit={handleWithdrawSubmit} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black text-white">Retrait Mobile Money Réel</h2>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['wave', 'orange', 'moov', 'mtn'] as const).map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setWithdrawProvider(op)}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase border cursor-pointer transition ${
                    withdrawProvider === op
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Montant à retirer (min. 1 000 FCFA)</label>
              <input
                type="number"
                min={1000}
                max={balanceXof || undefined}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Ex: 10000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Numéro bénéficiaire</label>
              <input
                type="tel"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                placeholder="+226 70 00 00 00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {hasMasterPin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Master PIN de sécurité</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={withdrawPin}
                  onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Entrez votre Master PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingWithdraw || balanceXof < 1000}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
            >
              {isSubmittingWithdraw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Confirmer le retrait Mobile Money</span>
            </button>
          </form>
        )}

        {/* ONGLET 5 : SÉCURITÉ MASTER PIN & APPLICATION PWA */}
        {activeTab === 'SECURITY' && (
          <section className="space-y-4">
            <form onSubmit={handleSaveMasterPin} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-sm font-black text-white">Master PIN (Sécurité Wallet)</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  hasMasterPin
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {hasMasterPin ? 'Configuré' : 'Non configuré'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Votre Master PIN (4 à 6 chiffres) est chiffré côté serveur et protège le démasquage des chiffres de votre Nanawallet, tous vos paiements Pay-As-You-Go ainsi que vos retraits Mobile Money.
              </p>

              {hasMasterPin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Master PIN actuel</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nouveau Master PIN (4-6 chiffres)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Confirmer le Master PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPin}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {isSavingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>{hasMasterPin ? 'Mettre à jour le Master PIN' : 'Activer mon Master PIN'}</span>
              </button>
            </form>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-white">Application Installable (PWA)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isPwaInstalled
                    ? 'Nanawallet est installé sur votre appareil.'
                    : 'Installez Nanawallet directement sur votre écran d\'accueil mobile.'}
                </p>
              </div>
              {!isPwaInstalled && (
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer</span>
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      {/* BARRE DE NAVIGATION INFÉRIEURE FIXE (MOBILE-FIRST) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 safe-area-pb">
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1">
          {[
            { id: 'HOME' as WalletTab, label: 'Accueil', icon: Wallet },
            { id: 'PAYG' as WalletTab, label: 'Pay-As-Go', icon: Layers },
            { id: 'LINKS' as WalletTab, label: 'Liens', icon: Link2 },
            { id: 'WITHDRAW' as WalletTab, label: 'Retrait', icon: Send },
            { id: 'SECURITY' as WalletTab, label: 'PIN', icon: Lock },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition cursor-pointer ${
                  isActive ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODALE CHOIX MONTANT RECHARGE AVANT LANCEMENT DU VRAI ULTIMATECHECKOUT */}
      {isRechargeAmountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">Recharger Nanawallet</h3>
                <p className="text-[11px] text-slate-400">Paiement sécurisé via UltimateCheckout</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRechargeAmountModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderUniverseIdField("ID de l'univers à recharger")}

            <div className="grid grid-cols-3 gap-2">
              {QUICK_RECHARGE_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRechargeAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-black border cursor-pointer transition ${
                    rechargeAmount === amt
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {amt.toLocaleString('fr-FR')} F
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Ou montant libre (FCFA)</label>
              <input
                type="number"
                min={100}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleLaunchUltimateCheckout}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Continuer vers UltimateCheckout ({formatCFA(rechargeAmount)})</span>
            </button>
          </div>
        </div>
      )}

      {/* VRAI ULTIMATECHECKOUT BRANCHÉ POUR LA RECHARGE RÉELLE */}
      {isUltimateCheckoutOpen && (
        <UltimateCheckout
          isModal={true}
          isOpen={isUltimateCheckoutOpen}
          enablePhysicalPosToken={false}
          onClose={() => setIsUltimateCheckoutOpen(false)}
          onCancel={() => setIsUltimateCheckoutOpen(false)}
          product={{
            id: 'nana_wallet_recharge',
            name: `Recharge Nanawallet (${formatCFA(rechargeAmount)})`,
            price: rechargeAmount,
            description: `Crédit instantané sur le portefeuille ${activeUniverse?.name || 'Nanawallet'} • Sans expiration`,
            itemType: 'recharge',
          }}
          amount={rechargeAmount}
          currency="FCFA"
          orderId={activeRechargeOrderId}
          orderDescription={`Recharge Nanawallet (${activeUniverse?.name || resolvedUserName})`}
          storeName={activeUniverse?.name || 'Nanawallet'}
          merchantId={selectedUniverseId || resolvedUserId || 'nana-wallet'}
          defaultCustomerName={resolvedUserName}
          defaultEmail={resolvedUserEmail}
          defaultPhone={resolvedUserPhone}
          onSuccess={handleUltimateCheckoutSuccess}
        />
      )}

      {/* MODALE MASTER PIN POUR DÉMASQUER LES CHIFFRES DU NANAWALLET */}
      {isUnmaskPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleVerifyUnmaskPin}
            className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Démasquer les chiffres</h3>
                  <p className="text-[11px] text-slate-400">Saisissez votre Master PIN Nanawallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnmaskPinModalOpen(false);
                  setUnmaskPinInput('');
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Master PIN (4 à 6 chiffres)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={unmaskPinInput}
                onChange={(e) => setUnmaskPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-center text-lg text-white font-mono tracking-[0.4em] focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsUnmaskPinModalOpen(false);
                  setUnmaskPinInput('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isVerifyingUnmaskPin}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                {isVerifyingUnmaskPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                <span>Démasquer</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
