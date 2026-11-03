import React, { useState } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Smartphone,
  Users,
  Radio,
  Mic,
  Volume2,
  Video,
  Award,
  Zap,
  Check
} from 'lucide-react';
import { VipBusinessLounge, VipCourseRoom } from './types';
import { useVipSubscription, VipSubscriptionPlan, VIP_DEFAULT_PLANS } from '../../../../../hooks/useVipSubscription';
import { playTapBeep } from '../../../../../utils/audio';

export interface VipPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lounge?: VipBusinessLounge | null;
  course?: VipCourseRoom | null;
  userPhone?: string;
  userName?: string;
  onUnlockedSuccess?: (roomOrLoungeId: string) => void;
}

/**
 * PROMPT 27 : La Barrière de Péage (UI & Logique d'Abonnement VIP)
 * Mission : UI/UX et Logique - La "Paywall VIP" (Abonnement VIP pour Wameet)
 * 
 * Directives UI/UX & Métier :
 * - Arrière-plan : La salle VIP lourdement floutée (backdrop-blur-2xl, filter blur-2xl).
 * - Au centre : Carte de tarification "Glassmorphism" (bg-white/10 border border-white/20 rounded-3xl p-8).
 * - Contenu : Titre du Salon, liste à puces des avantages (Accès 1-to-1, Webinaires privés, Réseau exclusif).
 * - Boutons d'Abonnement : "Pass Mensuel - 10 000 FCFA", "Accès à vie - 50 000 FCFA".
 * - Logique useVipSubscription : Appelle /api/vip/subscribe (S Client).
 * - En cas de succès : Le flou se dissipe avec une transition douce (duration-1000 ease-out), révélant le Salon.
 */
export const VipPaywallModal: React.FC<VipPaywallModalProps> = ({
  isOpen,
  onClose,
  lounge,
  course,
  userPhone: initialPhone = '+225 07 89 45 12 30',
  userName = 'Membre VIP Wameet',
  onUnlockedSuccess
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'lifetime'>('monthly');
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [selectedOperator, setSelectedOperator] = useState<'ORANGE' | 'WAVE' | 'MTN' | 'MOOV'>('ORANGE');

  // Hook d'abonnement VIP
  const {
    status,
    isUnlocked,
    isProcessing,
    error,
    subscribe,
    reset
  } = useVipSubscription(() => {
    onUnlockedSuccess?.(lounge?.id || course?.id || 'vip-room');
  });

  if (!isOpen || (!lounge && !course)) return null;

  const itemTitle = lounge?.title || course?.title || 'Salon Privé VIP';
  const itemHostName = lounge?.coachName || course?.instructorName || 'Coach & Mentor Wameet';
  const itemHostRole = lounge?.coachRole || course?.instructorRole || 'Directeur Associé & Expert';
  const itemHostAvatar =
    lounge?.coachAvatar ||
    course?.instructorAvatar ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
  const itemBanner =
    lounge?.bannerUrl ||
    course?.bannerUrl ||
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80';

  const defaultPerks = [
    'Accès 1-to-1 confidentiel avec le mentor',
    'Webinaires privés & sessions hebdomadaires micro ouvert',
    'Réseau exclusif de dirigeants et investisseurs qualifiés',
    'Replays vidéo HD illimités & supports de cours confidentiels',
    'Canal audio Wameet VIP ultra-sécurisé'
  ];

  const perksList = lounge?.perks || course?.syllabus || defaultPerks;

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();

    const amount = selectedPlanId === 'lifetime' ? 50000 : 10000;

    await subscribe({
      loungeId: lounge?.id || course?.id || 'vip-room-default',
      loungeTitle: itemTitle,
      planId: selectedPlanId,
      amount,
      customerPhone,
      customerName: userName,
      paymentMethod: `S_${selectedOperator}_MONEY`
    });
  };

  const handleClose = () => {
    playTapBeep();
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* =====================================================================
          1. L'ARRIÈRE-PLAN : LA SALLE VIP (FLOUTÉE PUIS DÉVOILÉE EN DOUCEUR)
             Transition douce : duration-1000 ease-out lorsque isUnlocked = true
         ===================================================================== */}
      <div
        className={`absolute inset-0 bg-slate-950 transition-all duration-1000 ease-out ${
          isUnlocked
            ? 'filter blur-0 scale-100 opacity-100'
            : 'filter blur-2xl md:blur-3xl scale-110 opacity-70 pointer-events-none'
        }`}
      >
        {/* Photo panoramique de fond de salle */}
        <img
          src={itemBanner}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />

        {/* Intérieur simulé de la Salle VIP (Révélé à 100% après paiement validé) */}
        <div className="absolute inset-0 max-w-6xl mx-auto p-4 sm:p-8 flex flex-col justify-between text-white pointer-events-auto">
          {/* Top Bar de la Salle VIP */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white">{itemTitle}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    VIP LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Animé par {itemHostName} ({itemHostRole})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-black">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
                <span>48 Membres en Ligne</span>
              </div>
            </div>
          </div>

          {/* Grille des Participants & Orateurs VIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto py-6">
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <img
                src={itemHostAvatar}
                alt={itemHostName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-bold text-amber-300">
                <Mic className="w-3 h-3 text-amber-400" />
                <span>{itemHostName} (Coach)</span>
              </div>
            </div>

            {[
              { name: 'Kouassi Yves', role: 'Dirigeant B2B', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' },
              { name: 'Aminata Touré', role: 'Investisseuse Retail', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80' },
              { name: 'Dr. Mensah', role: 'CTO FinTech', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80' }
            ].map((p, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-md"
              >
                <img src={p.img} alt={p.name} className="w-full h-full object-cover opacity-85" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-medium text-slate-200">
                  <span>{p.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Barre inférieure des commandes du Salon */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Accès Wameet Validé • Membre Titulaire</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs cursor-pointer shadow-md hover:from-amber-400 hover:to-yellow-400 transition"
            >
              Quitter la vue plein écran
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. CARTE CENTRALE GLASSMORPHISM (LA BARRIÈRE DE PÉAGE WAMEET)
             bg-white/10 border border-white/20 rounded-3xl p-8 backdrop-blur-2xl
             Disparaît en douceur (duration-1000 ease-out) une fois déverrouillée
         ===================================================================== */}
      <div
        className={`relative z-20 w-full max-w-xl rounded-3xl bg-white/10 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6 sm:p-8 text-white transition-all duration-1000 ease-out overflow-hidden ${
          isUnlocked
            ? 'opacity-0 scale-95 pointer-events-none translate-y-8'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Halo doré d'ambiance à l'intérieur de la carte de péage */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl" />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Entête de Prestige */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/30 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-wider shadow-sm">
            <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Espace Restreint Wameet VIP</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {itemTitle}
          </h2>

          <div className="flex items-center justify-center gap-2 pt-1">
            <img
              src={itemHostAvatar}
              alt={itemHostName}
              className="w-7 h-7 rounded-full object-cover border border-amber-400"
            />
            <span className="text-xs text-slate-300 font-medium">
              Dirigé par <strong className="text-white">{itemHostName}</strong>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Liste à puces des avantages exclusifs */}
        <div className="mb-6 space-y-2.5 p-4 rounded-2xl bg-black/30 border border-white/10">
          <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vos Privilèges Membre VIP :</span>
          </h4>

          <ul className="space-y-1.5">
            {perksList.slice(0, 4).map((perk, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-slate-200 leading-snug"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Les Boutons d'Abonnement (Options Claires Wameet) */}
        <form onSubmit={handleSubscribeSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1 : Pass Mensuel - 10 000 FCFA */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setSelectedPlanId('monthly');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedPlanId === 'monthly'
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/40'
                  : 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Pass Mensuel</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPlanId === 'monthly'
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-500'
                  }`}
                >
                  {selectedPlanId === 'monthly' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
              </div>
              <div className="text-lg font-black text-amber-300">10 000 FCFA</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Par mois • Sans engagement</p>
            </button>

            {/* Option 2 : Accès à vie - 50 000 FCFA */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setSelectedPlanId('lifetime');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedPlanId === 'lifetime'
                  ? 'bg-gradient-to-br from-amber-500/25 to-yellow-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
                  : 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30'
              }`}
            >
              <span className="absolute -top-2 right-2 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black uppercase tracking-wider shadow-xs">
                ⭐ Recommandé (-60%)
              </span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Accès à vie</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPlanId === 'lifetime'
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-500'
                  }`}
                >
                  {selectedPlanId === 'lifetime' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
              </div>
              <div className="text-lg font-black text-amber-300">50 000 FCFA</div>
              <p className="text-[10px] text-amber-300/80 mt-0.5">Paiement unique • Accès perpétuel</p>
            </button>
          </div>

          {/* Saisie Numéro Mobile Money pour Wameet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <label htmlFor="mobile-money-phone" className="font-bold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Payer par Mobile Money sécurisé</span>
              </label>
              <span className="text-[10px] text-slate-400">Orange • Wave • MTN • Moov</span>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/15">
                {(['ORANGE', 'WAVE', 'MTN', 'MOOV'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedOperator(op);
                    }}
                    className={`px-2 py-1 rounded-xl text-[10px] font-black transition cursor-pointer ${
                      selectedOperator === op
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>

              <input
                id="mobile-money-phone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/20 focus:border-amber-400 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Message d'erreur éventuel */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200">
              ⚠️ {error}
            </div>
          )}

          {/* Bouton de Validation Wameet */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>
                  {status === 'PENDING_S_PAY'
                    ? 'Agrégation Mobile Money en cours...'
                    : 'Vérification du paiement...'}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>
                  Déverrouiller le Salon Wameet (
                  {selectedPlanId === 'lifetime' ? '50 000' : '10 000'} FCFA)
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Mentions de sécurité et Wameet */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paiement sécurisé par Passerelle Wameet • Déverrouillage instantané</span>
          </div>
        </form>
      </div>

      {/* =====================================================================
          3. BANNIÈRE DE SUCCÈS LORS DU DÉVERROUILLAGE
         ===================================================================== */}
      {isUnlocked && (
        <div className="fixed top-8 z-50 animate-bounce-subtle pointer-events-auto">
          <div className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-slate-950 font-black text-sm shadow-[0_10px_40px_rgba(16,185,129,0.5)] flex items-center gap-2 border border-emerald-300">
            <Unlock className="w-5 h-5 text-slate-950" />
            <span>Péage VIP Franchi ! Bienvenue dans le Salon VIP.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipPaywallModal;
