import React, { useState } from 'react';
import {
  Gift,
  ShieldCheck,
  Store,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Heart,
  Calendar,
  AlertCircle
} from 'lucide-react';
import type { CagnotteGroupState } from '../../../../../types/cagnotte';
import { playTapBeep } from '../../../../../utils/audio';

export interface PinnedCagnotteBannerProps {
  cagnotte: CagnotteGroupState;
  onOpenContribute: () => void;
  onOpenChangeGift?: () => void;
  onOpenCelebration?: () => void;
}

export const PinnedCagnotteBanner: React.FC<PinnedCagnotteBannerProps> = ({
  cagnotte,
  onOpenContribute,
  onOpenChangeGift,
  onOpenCelebration
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    beneficiaryName,
    gift,
    targetAmount,
    collectedAmount,
    progressPercentage,
    contributionsCount,
    contributions,
    status,
    eventDate,
    eventLocation,
    smartContract
  } = cagnotte;

  const isFunded = status === 'funded' || smartContract.isExecuted || progressPercentage >= 100;
  const remainingAmount = Math.max(0, targetAmount - collectedAmount);

  // Formatage des montants FCFA
  const fmt = (num: number) => num.toLocaleString('fr-FR');

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border-b border-emerald-500/30 text-white shadow-xl shadow-black/40 relative z-30 transition-all">
      {/* Barre Principale Épinglée */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-3">
          {/* Miniature du Cadeau NaNa POS */}
          <div className="relative shrink-0 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-800 shadow-md shadow-emerald-500/20">
              <img
                src={gift.imageUrl}
                alt={gift.name}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
              />
            </div>
            {isFunded ? (
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded-md shadow-xs ring-1 ring-slate-900">
                POS
              </span>
            )}
          </div>

          {/* Informations & Jauge de Progression */}
          <div className="flex-1 min-w-0">
            {/* Titre et Badges */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base sm:text-lg">🎂</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                  Cagnotte Cadeau : <span className="text-emerald-400">{gift.name}</span>
                </h3>
              </div>

              {/* Badge Heure de la Fête */}
              <div className="hidden md:flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                <Clock className="w-3 h-3" />
                <span>{eventDate}</span>
              </div>
            </div>

            {/* Jauge Visuelle Hautement Animée */}
            <div className="relative w-full h-3.5 sm:h-4 bg-slate-950/80 rounded-full overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                  isFunded
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 shadow-lg shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
              >
                {/* Effet Shimmer lumineux animé */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>

              {/* Indicateur de Pourcentage superposé */}
              <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-black text-white drop-shadow-md tracking-wider">
                {progressPercentage}%
              </div>
            </div>

            {/* Chiffres clés : Collecté / Objectif / Reste */}
            <div className="flex items-center justify-between text-[11px] mt-1 text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-400">
                  {fmt(collectedAmount)} FCFA
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{fmt(targetAmount)} FCFA</span>
              </div>

              <div>
                {isFunded ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> 100% Atteint !
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    Reste {fmt(remainingAmount)} FCFA
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'Action Rapide */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isFunded ? (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onOpenCelebration) onOpenCelebration();
                  else setIsExpanded(true);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 flex items-center gap-1.5 cursor-pointer transition active:scale-95 animate-pulse"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Payé au Marchand</span>
                <span className="sm:hidden">Reçu 📜</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenContribute();
                }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 cursor-pointer transition active:scale-95 group"
              >
                <Gift className="w-4 h-4 group-hover:rotate-12 transition" />
                <span>Contribuer</span>
              </button>
            )}

            {/* Toggle de détails */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsExpanded(!isExpanded);
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isExpanded ? 'Réduire' : 'Détails du Contrat Intelligent'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Contributeurs récents (Avatars Pill) */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              {contributions.slice(0, 5).map((c, idx) => (
                <img
                  key={c.id || idx}
                  src={c.contributorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={c.contributorName}
                  title={`${c.contributorName} (+${fmt(c.amount)} FCFA)`}
                  className="inline-block h-5 w-5 rounded-full ring-2 ring-slate-900 object-cover"
                />
              ))}
            </div>
            <span className="text-slate-400 text-[11px]">
              <strong className="text-slate-200">{contributionsCount}</strong> amis ont participé
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Store className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[160px] sm:max-w-[220px]">
              Marchand : <strong className="text-slate-200">{gift.merchantName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Accordéon Déroulant : Détails Complets, Contrat Intelligent & Dédicaces */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950/90 px-4 py-4 max-w-4xl mx-auto space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Bannière de Sécurité & Smart Contract */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-2">
                <span>Contrat Intelligent Sécurisé NaNa POS</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-mono">
                  100% Anti-Détournement
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {smartContract.terms}
              </p>
              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span>📍 Livraison : <strong>{eventLocation}</strong></span>
                <span>⏰ Heure : <strong>{eventDate}</strong></span>
                {smartContract.isExecuted && (
                  <span className="text-emerald-400 font-bold">
                    🔑 Code Réception PIN : <code className="bg-slate-800 px-1 py-0.5 rounded text-white">{smartContract.deliveryPinCode}</code>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fiche Technique du Cadeau NaNa POS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-emerald-400" /> Fiche Cadeau
                </span>
                {onOpenChangeGift && !isFunded && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onOpenChangeGift();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] underline cursor-pointer"
                  >
                    Changer de cadeau
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {gift.description}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Prix fixe garanti : <strong className="text-white">{fmt(gift.price)} FCFA</strong></span>
                <span>Stock boutique : <strong className="text-emerald-400">{gift.stock} unités</strong></span>
              </div>
            </div>

            {/* Magasin Vendeur Partenaire */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-400" /> Marchand Certifié NaNa POS
              </span>
              <div className="text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-white">{gift.merchantName}</p>
                <p className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{gift.merchantLocation}</span>
                </p>
                <p className="text-slate-400">
                  Contact Caisse : <span className="text-emerald-400 font-mono">{gift.merchantPhone}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Mur des Dédicaces & Contributions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" /> Dédicaces des Amis ({contributions.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Transparence totale en temps réel
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs gap-3 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={c.contributorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={c.contributorName}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">
                        {c.contributorName}
                      </div>
                      {c.note && (
                        <div className="text-[11px] text-slate-400 italic truncate max-w-xs sm:max-w-md">
                          "{c.note}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-emerald-400">
                      +{fmt(c.amount)} FCFA
                    </span>
                    <div className="text-[10px] text-slate-500">
                      {c.paymentMethod.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinnedCagnotteBanner;
