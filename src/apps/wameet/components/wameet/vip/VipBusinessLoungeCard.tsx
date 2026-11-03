import React from 'react';
import { Star, ShieldCheck, Users, Radio, Crown, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { VipBusinessLoungeCardProps } from './types';
import { playTapBeep } from '../../../../../utils/audio';

/**
 * Carte de Salon d'Affaires & Coaching (VIP)
 * Style : Tons Or / Noir, Obsidian, Verre Dépoli & Shimmer Doré
 * Micro-interactions : hover:scale-105 transition-transform, shimmer au survol
 */
export const VipBusinessLoungeCard: React.FC<VipBusinessLoungeCardProps> = ({
  lounge,
  onSelect,
  onSubscribe,
  className = ''
}) => {
  const handleClick = () => {
    playTapBeep();
    onSelect?.(lounge);
  };

  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onSubscribe ? onSubscribe(lounge) : onSelect?.(lounge);
  };

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Salon VIP : ${lounge.title} avec ${lounge.coachName}`}
      className={`group relative w-[310px] sm:w-[340px] shrink-0 rounded-3xl bg-gradient-to-b from-slate-900/95 via-amber-950/20 to-slate-950 border border-amber-500/30 hover:border-amber-400/90 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.8)] hover:shadow-[0_16px_50px_-8px_rgba(245,158,11,0.3)] transition-all duration-300 ease-out hover:scale-105 active:scale-[1.02] cursor-pointer select-none overflow-hidden flex flex-col justify-between vip-shimmer-gold ${className}`}
    >
      {/* Halo doré d'ambiance en arrière-plan */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/25 transition-all duration-500" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Bannière supérieure de contexte */}
      <div className="relative h-28 w-full overflow-hidden bg-slate-900">
        <img
          src={lounge.bannerUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80'}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Badge "Accès sur Abonnement" Doré Luxe */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/35 to-amber-600/25 border border-amber-400/60 text-amber-300 backdrop-blur-md shadow-xs">
          <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {lounge.badgeLabel || 'Accès sur Abonnement'}
          </span>
        </div>

        {/* Statut En direct / Live si actif */}
        {lounge.isLiveNow ? (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/25 border border-red-500/60 text-red-300 backdrop-blur-md shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wide">Live</span>
          </div>
        ) : (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 backdrop-blur-md text-[10px] font-bold">
            <Users className="w-3 h-3 text-amber-400" />
            <span>{lounge.activeMembersCount} VIP</span>
          </div>
        )}
      </div>

      {/* Corps de la carte */}
      <div className="p-4 pt-1 flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Entête avec Photo du Coach / Expert */}
          <div className="flex items-start gap-3 -mt-9 mb-3">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)] bg-slate-900">
                <img
                  src={lounge.coachAvatar}
                  alt={lounge.coachName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
              {lounge.isOnline && (
                <span
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-xs"
                  title="En ligne maintenant"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-4">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-extrabold text-white truncate group-hover:text-amber-200 transition-colors">
                  {lounge.coachName}
                </h4>
                {lounge.isCoachVerified && (
                  <ShieldCheck
                    className="w-4 h-4 text-amber-400 shrink-0"
                    title="Expert & Mentor Vérifié Wameet"
                  />
                )}
              </div>
              <p className="text-[11px] text-amber-400/90 font-medium truncate">
                {lounge.coachRole}
              </p>
            </div>
          </div>

          {/* Titre du Salon d'Affaires */}
          <h3 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug mb-1.5">
            {lounge.title}
          </h3>

          {/* Sous-titre / Thème */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {lounge.topic}
          </p>

          {/* Note Moyenne & Avis */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/70 border border-amber-500/20 mb-3">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-white">
                {lounge.rating.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                ({lounge.reviewsCount} avis)
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-black text-amber-300">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{lounge.subscriptionPriceLabel}</span>
            </div>
          </div>

          {/* Tags d'expertise */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lounge.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300/90 border border-amber-500/20 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer avec Prochaine session & Bouton d'action */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="text-[10px] text-slate-400 min-w-0">
            <span className="text-amber-400/90 font-bold block truncate">
              {lounge.nextLiveDate || 'Session programmée'}
            </span>
            <span className="text-slate-500 text-[9px]">
              {lounge.availableSeats !== undefined
                ? `${lounge.availableSeats} places VIP restantes`
                : 'Accès exclusif'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubscribeClick}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 group-hover:shadow-amber-400/40 transition-all cursor-pointer shrink-0"
          >
            <span>Rejoindre</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default VipBusinessLoungeCard;
