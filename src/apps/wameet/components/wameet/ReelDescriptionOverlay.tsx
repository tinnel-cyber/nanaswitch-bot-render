import React from 'react';
import { Music } from 'lucide-react';
import { WameetReelItem } from './WameetReelsView';

/**
 * Moteurs IA officiels pris en compte pour la détection automatique
 */
const AI_ENGINES = ['tinnela', 'gemini', 'pollinations', 'replicate', 'wan', 'flux', 'sora', 'veo'];

/**
 * Détecte si un Reel provient d'un moteur d'Intelligence Artificielle
 * (Tinnela AI Studio, Gemini, Pollinations, Replicate, tags ou métadonnées)
 */
export const detectIsAIGenerated = (reel: Partial<WameetReelItem>): boolean => {
  if (reel.isAIGenerated === true) return true;

  // 1. Vérification du moteur de génération explicite
  if (reel.generatorEngine) {
    const engineLower = reel.generatorEngine.toLowerCase();
    if (AI_ENGINES.some(eng => engineLower.includes(eng))) return true;
  }

  // 2. Vérification des URLs de médias (serveurs IA connus)
  const mediaUrl = (reel.videoUrl || (reel as any).mediaUrl || '').toLowerCase();
  const thumbUrl = (reel.thumbnailUrl || '').toLowerCase();
  if (
    mediaUrl.includes('pollinations.ai') ||
    mediaUrl.includes('replicate.delivery') ||
    mediaUrl.includes('replicate.com') ||
    thumbUrl.includes('pollinations.ai') ||
    thumbUrl.includes('replicate.delivery')
  ) {
    return true;
  }

  // 3. Vérification de l'auteur / badge
  const authorBadge = (reel.authorBadge || '').toLowerCase();
  const authorName = (reel.authorName || '').toLowerCase();
  if (
    authorBadge.includes('ia') ||
    authorBadge.includes('ai') ||
    authorBadge.includes('tinnela') ||
    authorName.includes('tinnela ai') ||
    authorName.includes('gemini') ||
    authorName.includes('pollinations') ||
    authorName.includes('replicate')
  ) {
    return true;
  }

  // 4. Vérification des hashtags
  if (Array.isArray(reel.hashtags)) {
    const aiTags = ['#ia', '#ai', '#aigenerated', '#tinnela', '#tinnelaai', '#replicate', '#pollinations', '#gemini', '#videoia', '#generativeai'];
    if (reel.hashtags.some(tag => aiTags.includes(tag.toLowerCase()))) {
      return true;
    }
  }

  // 5. Vérification du texte de description ou titre
  const fullText = `${reel.title || ''} ${reel.description || ''}`.toLowerCase();
  if (
    fullText.includes('généré par ia') ||
    fullText.includes('générée par ia') ||
    fullText.includes('ia studio') ||
    fullText.includes('tinnela ai') ||
    fullText.includes('replicate ai')
  ) {
    return true;
  }

  return false;
};

/**
 * Badge sobre et semi-transparent indiquant qu'une vidéo est générée par IA
 */
export const AIGeneratedBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-300 font-medium select-none shadow-sm ${className}`}
    title="Contenu synthétique généré par Intelligence Artificielle (Tinnela AI Studio / Gemini / Pollinations / Replicate)"
  >
    <span>✨</span>
    <span>Vidéo générée par IA</span>
  </div>
);

export interface ReelDescriptionOverlayProps {
  reel: WameetReelItem;
  className?: string;
  onHashtagClick?: (tag: string) => void;
  onProfileClick?: () => void;
}

/**
 * ReelDescriptionOverlay : Affiche les informations textuelles du Reel
 * avec l'avertissement sobre pour les vidéos générées par IA.
 */
export const ReelDescriptionOverlay: React.FC<ReelDescriptionOverlayProps> = ({
  reel,
  className = '',
  onHashtagClick,
  onProfileClick
}) => {
  const isAI = detectIsAIGenerated(reel);

  return (
    <div
      className={`absolute left-3.5 right-16 bottom-3 sm:bottom-4 z-20 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] space-y-1 pointer-events-auto max-w-[78%] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Avertissement Vidéo générée par IA */}
      {isAI && <AIGeneratedBadge />}

      {/* Auteur + Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          onClick={onProfileClick}
          className="text-sm sm:text-base font-black tracking-tight drop-shadow-md cursor-pointer hover:underline"
        >
          {reel.authorName}
        </span>
        <span className="text-xs font-semibold text-white/80">
          {reel.authorHandle}
        </span>
        {reel.authorBadge && (
          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/30">
            {reel.authorBadge}
          </span>
        )}
      </div>

      {/* Titre & Description du Reel */}
      {reel.title && (
        <p className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-white/95 drop-shadow-md">
          {reel.title}
        </p>
      )}

      {/* Hashtags */}
      {reel.hashtags && reel.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs font-bold text-white/90">
          {reel.hashtags.map((tag) => (
            <span
              key={tag}
              onClick={() => onHashtagClick && onHashtagClick(tag)}
              className="hover:underline cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Piste Audio & Musique */}
      {reel.audioTrackName && (
        <div className="flex items-center gap-2 text-xs font-medium text-white/80 pt-0.5">
          <Music className="w-3.5 h-3.5 animate-pulse text-white/90 shrink-0" />
          <span className="truncate">{reel.audioTrackName}</span>
        </div>
      )}
    </div>
  );
};

export default ReelDescriptionOverlay;
