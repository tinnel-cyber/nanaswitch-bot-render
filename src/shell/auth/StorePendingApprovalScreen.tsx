import React, { useState, useEffect, useCallback } from 'react';
import { StoreUser, StoreApprovalStatus } from '../../types';

import { supabase } from '@/lib/supabase';
import { updateStoreApprovalStatus } from '../../utils/firestoreService';
import { 
  Clock, 
  Store, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { playValidationBeep, playTapBeep } from '../../utils/audio';
import { isSuperAdminLocally } from '../../services/superAdminService';

interface StorePendingApprovalScreenProps {
  currentUser?: StoreUser | null;
  storeName?: string;
  storeId?: string;
  onStoreApproved?: () => void;
  onRefreshStatus?: () => void;
  onBypassForDemo?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenSaasAdmin?: () => void;
}

export const StorePendingApprovalScreen: React.FC<StorePendingApprovalScreenProps> = ({
  currentUser,
  storeName,
  storeId,
  onStoreApproved,
  onRefreshStatus,
  onBypassForDemo,
  onOpenAdminPanel,
  onOpenSaasAdmin,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [simulatedApproving, setSimulatedApproving] = useState(false);

  const safeStoreId = storeId || currentUser?.storeId || 'store-nana-1';
  const safeStoreName = storeName || currentUser?.storeName || 'Votre Boutique';
  const safeOwnerName = currentUser?.name || 'Gérant de boutique';
  const safePhone = currentUser?.phone || 'Non renseigné';

  const triggerApproved = () => {
    if (onStoreApproved) onStoreApproved();
    if (onRefreshStatus) onRefreshStatus();
    if (onBypassForDemo) onBypassForDemo();
  };

  // Exemption totale et bypass immédiat pour le Super Admin
  useEffect(() => {
    if (isSuperAdminLocally(currentUser)) {
      triggerApproved();
    }
  }, [currentUser]);

  if (isSuperAdminLocally(currentUser)) {
    return null;
  }

  // Écouteur Supabase Realtime & Firestore pour le déblocage instantané du marchand
  useEffect(() => {
    if (!safeStoreId) return;

    let isSubscribed = true;

    // 1. Supabase Initial Check
    supabase
      .from('verification_requests')
      .select('status')
      .or(`tenant_id.eq.${safeStoreId},user_id.eq.${currentUser?.id || safeStoreId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (isSubscribed && data?.status === 'approved') {
          playValidationBeep();
          triggerApproved();
        }
      })
      .catch(console.warn);

    // 2. Supabase Realtime Channel
    const channelName = `kyc_approval_${safeStoreId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_requests',
        },
        (payload) => {
          if (!isSubscribed) return;
          const rec = payload.new as any;
          if (rec && (rec.tenant_id === safeStoreId || rec.user_id === currentUser?.id) && rec.status === 'approved') {
            playValidationBeep();
            triggerApproved();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (!isSubscribed) return;
          const rec = payload.new as any;
          if (rec && (rec.id === safeStoreId || rec.firebase_uid === currentUser?.uid) && (rec.kyc_status === 'verified' || rec.kyc_status === 'approved')) {
            playValidationBeep();
            triggerApproved();
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [safeStoreId, currentUser]);

  const handleManualCheck = () => {
    playTapBeep();
    setIsChecking(true);
    if (onRefreshStatus) onRefreshStatus();
    setTimeout(() => {
      setIsChecking(false);
    }, 1200);
  };

  const handleSimulateAdminApproval = async () => {
    playTapBeep();
    setSimulatedApproving(true);
    try {
      await updateStoreApprovalStatus(safeStoreId, 'APPROVED', currentUser?.id || 'admin_super');
      playValidationBeep();
      triggerApproved();
    } catch (err) {
      console.warn('Erreur validation :', err);
      triggerApproved();
    } finally {
      setSimulatedApproving(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Bonjour Support Nanasore,\nJe viens de créer la boutique "${safeStoreName}" (ID: ${safeStoreId}) et je souhaite faire valider mon compte pour commencer à encaisser.\nPropriétaire : ${safeOwnerName} (${safePhone}).`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-4">
          {/* Badge & Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              En Attente de Validation
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Boutique en cours d'approbation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Pour des raisons de conformité et de sécurité anti-fraude, chaque nouvelle boutique doit être validée par un administrateur SaaS avant d'ouvrir sa caisse.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <span className="text-slate-400">Nom de la boutique :</span>
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-400" />
                {safeStoreName}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <span className="text-slate-400">Identifiant Unique (Store ID) :</span>
              <code className="font-mono text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded text-[11px] font-bold">
                {safeStoreId}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Responsable / Gérant :</span>
              <span className="font-semibold text-slate-200">{safeOwnerName}</span>
            </div>
          </div>

          {/* Real-time synchronization message */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 py-2 px-3 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Écoute en temps réel : Votre écran se débloquera automatiquement dès validation</span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2.5">
            <a
              href={`https://wa.me/22665565805?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-98"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Contacter l'administrateur par WhatsApp</span>
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Vérification...' : 'Actualiser statut'}</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateAdminApproval}
                disabled={simulatedApproving}
                className="py-2.5 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-indigo-100 text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-400/40 shadow-sm transition active:scale-95"
                title="Bouton de test immédiat pour débloquer la démo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{simulatedApproving ? 'Validation...' : 'Valider (Mode Démo)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePendingApprovalScreen;
