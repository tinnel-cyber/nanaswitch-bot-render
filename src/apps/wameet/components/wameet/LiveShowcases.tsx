/**
 * @file LiveShowcases.tsx
 * @description Carrousel haut XXL des Vitrines Vivantes avec Auras Lumineuses et Jauge d'Impact (Prompt 3).
 * 
 * Spécifications :
 * - Carrousel haut magnétique : w-full py-3 px-3 flex gap-3 overflow-x-auto snap-x scrollbar-none z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50
 * - Format portrait XXL (w-28 h-44)
 * - Auras lumineuses dynamiques (Glow Rings) :
 *   - DISPO (Wameet Disponible) : ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]
 *   - BUSINESS (Idée Business) : ring-2 ring-[#4169E1] shadow-[0_0_15px_rgba(65,105,225,0.4)]
 *   - COACHING (Coaching / Expertise) : ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]
 * - Fallback de classe mondiale : Si le média échoue ou est absent, dégradé Bleu Royal (#4169E1) avec filigrane W
 * - Jauge d'Impact Gamifiée : 💎 {impactScore}
 * - Compte à rebours FOMO réactif (HH:MM:SS) actualisé chaque seconde
 * - Carte 0 Utilisateur : "Créer ma Vitrine" avec bouton (+) Bleu Royal
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres ultra-propres
 * - Zéro marque tierce (WameetShowcase exclusif)
 */

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Sparkles, Calendar } from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export type ShowcaseStatusType = 'DISPO' | 'BUSINESS' | 'COACHING';
export type LiveShowcaseStatus = 'dispo' | 'business_idea' | 'coaching' | ShowcaseStatusType;

export interface ShowcaseItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorHandle?: string;
  backgroundMedia?: string;
  mediaUrl?: string;
  impactScore: number;
  statusType: ShowcaseStatusType;
  priceFcfa?: number;
  consultationPrice?: number;
  expiresInSeconds: number;
  caption?: string;
  [key: string]: any;
}

// Alias de rétrocompatibilité
export type LiveShowcaseItem = ShowcaseItem;

export interface LiveShowcasesProps {
  showcases?: ShowcaseItem[];
  currentUserAvatar?: string;
  currentUserName?: string;
  currentUserImpactScore?: number;
  onOpenCreateShowcase?: () => void;
  onSelectShowcase?: (item: ShowcaseItem, index: number) => void;
  onScheduleAppointment?: (item: ShowcaseItem) => void;
  className?: string;
}

export const DEFAULT_SHOWCASES: ShowcaseItem[] = [
  {
    id: 'sc-1',
    authorName: 'Ibrahim Pousbila',
    authorHandle: '@ibrahim.wameet',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    statusType: 'DISPO',
    backgroundMedia: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop&q=80',
    expiresInSeconds: 6330, // 01:45:30
    impactScore: 18450,
    caption: 'Disponible pour échanger sur vos projets e-commerce'
  },
  {
    id: 'sc-2',
    authorName: 'Awa Ouédraogo',
    authorHandle: '@awa.mode',
    authorAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    statusType: 'BUSINESS',
    backgroundMedia: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80',
    expiresInSeconds: 4120, // 01:08:40
    impactScore: 9280,
    caption: 'Centrale d’achat partagée pour le textile'
  },
  {
    id: 'sc-3',
    authorName: 'Coach Moussa',
    authorHandle: '@coach.moussa',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    statusType: 'COACHING',
    backgroundMedia: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&auto=format&fit=crop&q=80',
    expiresInSeconds: 8415, // 02:20:15
    impactScore: 24100,
    priceFcfa: 15000,
    consultationPrice: 15000,
    caption: 'Session intensive : Clôture de ventes en direct'
  },
  {
    id: 'sc-4',
    authorName: 'Sarah Kouamé',
    authorHandle: '@sarah.design',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    statusType: 'DISPO',
    backgroundMedia: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&auto=format&fit=crop&q=80',
    expiresInSeconds: 3100, // 00:51:40
    impactScore: 14750,
    caption: 'Revue de vos chartes graphiques en direct'
  },
  {
    id: 'sc-5',
    authorName: 'Mamadou Diallo',
    authorHandle: '@mamadou.fintech',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    statusType: 'BUSINESS',
    backgroundMedia: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&auto=format&fit=crop&q=80',
    expiresInSeconds: 9800, // 02:43:20
    impactScore: 19800,
    priceFcfa: 20000,
    consultationPrice: 20000,
    caption: 'Micro-crédit rotatif communautaire'
  }
];

export const LiveShowcases: React.FC<LiveShowcasesProps> = ({
  showcases = DEFAULT_SHOWCASES,
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  currentUserName = 'Vous',
  currentUserImpactScore = 18450,
  onOpenCreateShowcase,
  onSelectShowcase,
  onScheduleAppointment,
  className = ''
}) => {
  return (
    <div
      className={`w-full py-2.5 px-3 flex gap-3 overflow-x-auto snap-x scrollbar-none z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent select-none ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      role="region"
      aria-label="Vitrines Vivantes Wameet"
    >
      {/* ============================================================== */}
      {/* CARTE 0 : CRÉER MA VITRINE (UTILISATEUR ACTUEL)                */}
      {/* ============================================================== */}
      <div
        onClick={() => {
          playTapBeep();
          if (onOpenCreateShowcase) onOpenCreateShowcase();
        }}
        className="w-28 h-44 rounded-2xl relative overflow-hidden shrink-0 snap-start border-2 border-dashed border-[#4169E1]/50 bg-slate-900/80 hover:bg-slate-900 flex flex-col justify-between p-2.5 cursor-pointer transition-all duration-300 active:scale-95 group shadow-lg"
        title="Créer ma vitrine vivante"
        role="button"
        tabIndex={0}
      >
        {/* Jauge d'Impact Utilisateur */}
        <div className="self-end bg-slate-950/80 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shadow-xs">
          <span className="text-[#4169E1]">💎</span>
          <span>{currentUserImpactScore.toLocaleString('fr-FR')}</span>
        </div>

        {/* Avatar + Bouton Plus */}
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="relative">
            <img
              src={currentUserAvatar}
              alt={currentUserName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-md ring-2 ring-[#4169E1]/40"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[11px] font-black text-white mt-2 text-center drop-shadow-sm">
            Ma Vitrine
          </span>
          <span className="text-[9px] font-bold text-blue-300/80 text-center">
            Publier
          </span>
        </div>

        {/* Mention bas */}
        <div className="text-center text-[8px] font-extrabold text-slate-400 uppercase tracking-widest py-0.5">
          Wameet Live
        </div>
      </div>

      {/* ============================================================== */}
      {/* LES CARTES VITRINES XXL AVEC AURAS DYNAMIQUES                   */}
      {/* ============================================================== */}
      {showcases.map((item, idx) => (
        <ShowcaseCard
          key={item.id}
          item={item}
          onClick={() => {
            playTapBeep();
            if (onSelectShowcase) onSelectShowcase(item, idx);
          }}
          onScheduleAppointment={onScheduleAppointment}
        />
      ))}
    </div>
  );
};

const ShowcaseCard: React.FC<{
  item: ShowcaseItem;
  onClick?: () => void;
  onScheduleAppointment?: (item: ShowcaseItem) => void;
}> = ({ item, onClick, onScheduleAppointment }) => {
  const initialSeconds = item.expiresInSeconds || item.remainingSeconds || 7200;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [hasMediaError, setHasMediaError] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Normalisation du statusType
  const rawStatus = (item.statusType || item.status || 'DISPO').toString().toUpperCase();
  const normalizedStatus: ShowcaseStatusType =
    rawStatus.includes('COACH') ? 'COACHING' : rawStatus.includes('BUSIN') ? 'BUSINESS' : 'DISPO';

  const getAuraClass = () => {
    switch (normalizedStatus) {
      case 'DISPO':
        return 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      case 'BUSINESS':
        return 'ring-2 ring-[#4169E1] shadow-[0_0_15px_rgba(65,105,225,0.4)]';
      case 'COACHING':
        return 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
      default:
        return 'ring-1 ring-white/20';
    }
  };

  const authorName = item.authorName || item.creatorName || 'Membre Wameet';
  const authorAvatar = item.authorAvatar || item.creatorAvatar;
  const backgroundMedia = item.backgroundMedia || item.mediaUrl;
  const price = item.priceFcfa || item.consultationPrice;
  const impact = item.impactScore || 18450;

  return (
    <div
      onClick={onClick}
      className={`w-28 h-44 rounded-2xl relative overflow-hidden shrink-0 snap-start bg-slate-900 cursor-pointer transition-all duration-300 active:scale-95 group ${getAuraClass()}`}
      role="button"
      tabIndex={0}
      title={`${authorName} - ${normalizedStatus}`}
    >
      {/* 1. Image de Fond avec Fallback de Classe Mondiale */}
      {!hasMediaError && backgroundMedia ? (
        <img
          src={backgroundMedia}
          alt={authorName}
          onError={() => setHasMediaError(true)}
          className="object-cover w-full h-full absolute inset-0 z-0 group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#4169E1] via-blue-900 to-slate-950 flex flex-col items-center justify-center p-2 text-center text-white z-0">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 animate-pulse mb-1">
            <span className="text-sm font-black text-white">W</span>
          </div>
          <span className="text-[9px] font-bold text-blue-200">Wameet Live</span>
        </div>
      )}

      {/* 2. Gradient d'ombrage */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-10" />

      {/* 3. Badge Statut Haut & Bouton Réserver */}
      <div className="absolute top-2 left-2 z-20 backdrop-blur-md bg-slate-950/70 border border-white/20 text-[8px] font-black text-white px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1 shadow-sm">
        {normalizedStatus}
      </div>

      {onScheduleAppointment && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playTapBeep();
            onScheduleAppointment(item);
          }}
          className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-slate-950/70 hover:bg-[#4169E1] border border-white/20 text-white flex items-center justify-center transition active:scale-90 shadow-sm cursor-pointer"
          title="Réserver un Wameet différé"
        >
          <Calendar className="w-3 h-3 text-white" />
        </button>
      )}

      {/* 4. Badge Prix Premium Haut de Gamme (Prompt 7) */}
      {price && price > 0 && (
        <div className="absolute top-7 left-2 right-2 z-20 backdrop-blur-md bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.5)] border border-amber-200/80 truncate text-center uppercase tracking-wider flex items-center justify-center gap-1">
          <span>Premium - {price.toLocaleString('fr-FR')} FCFA</span>
        </div>
      )}

      {/* 5. Profil & Jauge d'Impact en bas */}
      <div className="absolute bottom-7 left-2 right-2 z-20 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-[#4169E1] text-white flex items-center justify-center text-[9px] font-bold border border-white/40 shrink-0 shadow-xs">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="w-full h-full rounded-full object-cover" />
          ) : (
            authorName.charAt(0)
          )}
        </div>
        <div className="truncate">
          <p className="text-[10px] font-bold text-white truncate drop-shadow-sm">{authorName}</p>
          <p className="text-[9px] font-extrabold text-[#4169E1] flex items-center gap-0.5 drop-shadow-[0_2px_8px_rgba(65,105,225,0.4)]">
            💎 {impact.toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      {/* 6. Timer FOMO Bas */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-20 bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[9px] text-slate-200 font-mono font-bold py-0.5 rounded-md flex items-center justify-center gap-1 shadow-xs">
        <Clock className="w-2.5 h-2.5 text-[#4169E1]" />
        <span>{formatTimer(timeLeft)}</span>
      </div>
    </div>
  );
};

export default LiveShowcases;
