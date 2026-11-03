import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Play,
  Sparkles,
  Link2,
  ExternalLink,
  ShieldCheck,
  Check,
  Edit2,
  X,
  VolumeX,
  Repeat
} from 'lucide-react';

// ============================================================================
// TYPES POUR LE BLOC VIDÉO AUTOPLAY SILENCIEUSE
// ============================================================================

export interface AutoplayVideoData {
  videoUrl?: string;
  title?: string;
  caption?: string;
  aspectRatio?: '16/9' | '9/16' | '1/1' | '4/5' | 'auto';
  borderRadius?: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-full' | 'rounded-none';
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-2xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-full';
  shadow?: 'shadow-none' | 'shadow-md' | 'shadow-xl' | 'shadow-2xl';
  bgColor?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export interface AutoplayVideoBlockProps {
  block?: { id?: string; data?: AutoplayVideoData; [key: string]: any };
  data?: AutoplayVideoData;
  isBuilderMode?: boolean;
  className?: string;
  onUpdateUrl?: (url: string) => void;
}

// ============================================================================
// VALEURS PAR DÉFAUT ÉCONOMISANT LA BANDE PASSANTE FIREBASE
// ============================================================================

export const DEFAULT_AUTOPLAY_VIDEO_DATA: AutoplayVideoData = {
  videoUrl: '',
  title: 'Vidéo Démonstration en Boucle',
  caption: '',
  aspectRatio: '16/9',
  borderRadius: 'rounded-2xl',
  maxWidth: 'max-w-4xl',
  shadow: 'shadow-2xl',
  bgColor: 'transparent',
  showBadge: false,
  badgeText: 'DÉMONSTRATION EN DIRECT'
};

/**
 * AutoplayVideoBlock
 * Composant de vidéo native haute performance optimisé pour les tunnels de vente.
 * - Ne propose aucun upload de fichier (économie totale de bande passante Firebase).
 * - Champ texte (input) pour coller l'URL directe (Cloudinary, CDN Bunny, AWS S3, mp4 direct).
 * - Utilise STRICTEMENT la balise native <video> avec : autoPlay, loop, muted, playsInline.
 * - CSS/Tailwind : w-full, object-fit: cover, pointer-events-none, coins arrondis épurés.
 */
export const AutoplayVideoBlock: React.FC<AutoplayVideoBlockProps> = ({
  block,
  data: propsData,
  isBuilderMode = false,
  className = '',
  onUpdateUrl
}) => {
  // Fusion des configurations
  const data: AutoplayVideoData = useMemo(() => {
    return {
      ...DEFAULT_AUTOPLAY_VIDEO_DATA,
      ...(block?.data || {}),
      ...(propsData || {})
    };
  }, [block?.data, propsData]);

  const rawUrl = data.videoUrl || '';
  const [inputUrl, setInputUrl] = useState<string>(rawUrl);
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);
  const [hasCopiedFeedback, setHasCopiedFeedback] = useState<boolean>(false);

  // Synchronisation avec l'état externe si l'URL change depuis l'inspecteur
  useEffect(() => {
    setInputUrl(rawUrl);
  }, [rawUrl]);

  // Référence sur la balise vidéo native pour garantir l'autoplay muet sans friction
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Force les propriétés DOM natives pour contourner les restrictions des navigateurs
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // L'échec d'autoplay est absorbé silencieusement
        });
      }
    }
  }, [rawUrl]);

  // Gestion de la mise à jour de l'URL
  const handleApplyUrl = (newUrl: string) => {
    const cleaned = newUrl.trim();
    setInputUrl(cleaned);
    if (onUpdateUrl) {
      onUpdateUrl(cleaned);
    }
    if (block?.data) {
      block.data.videoUrl = cleaned;
    }
    setIsEditingInline(false);
  };

  // Classe d'aspect ratio
  const getAspectRatioClass = (ratio?: string) => {
    switch (ratio) {
      case '9/16':
        return 'aspect-[9/16] max-h-[700px] mx-auto';
      case '1/1':
        return 'aspect-square max-h-[550px] mx-auto';
      case '4/5':
        return 'aspect-[4/5] max-h-[600px] mx-auto';
      case 'auto':
        return 'aspect-auto';
      case '16/9':
      default:
        return 'aspect-video';
    }
  };

  const roundedClass = data.borderRadius || 'rounded-2xl';
  const shadowClass = data.shadow || 'shadow-2xl';
  const maxWidthClass = data.maxWidth || 'max-w-4xl';
  const hasVideo = Boolean(rawUrl && rawUrl.trim().length > 0);

  return (
    <section
      className={`relative w-full py-4 px-2 sm:px-4 ${className}`}
      style={{ backgroundColor: data.bgColor || 'transparent' }}
    >
      <div className={`w-full mx-auto ${maxWidthClass}`}>
        {/* ================================================================ */}
        {/* CAS 1 : AUCUNE VIDÉO DÉFINIE -> ZONE DE SAISIE DE L'URL CDN      */}
        {/* ================================================================ */}
        {!hasVideo ? (
          <div className="w-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950/90 border-2 border-dashed border-indigo-500/40 text-center shadow-2xl relative overflow-hidden group">
            {/* Halo décoratif discret */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />

            <div className="relative z-10 max-w-xl mx-auto space-y-4">
              {/* Badge & Icône */}
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
                <Video className="w-7 h-7" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-300 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vidéo Autoplay Silencieuse • Zéro Coût Firebase</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Intégrez Votre Vidéo en Boucle Rapide
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Collez simplement le lien direct de votre vidéo (Cloudinary, CDN, S3 ou MP4).
                  Aucun fichier n'est téléversé pour préserver votre stockage et charger en moins de 0.5s.
                </p>
              </div>

              {/* Champ texte direct pour coller l'URL (Aucun bouton d'upload) */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyUrl(inputUrl);
                        }
                      }}
                      placeholder="https://res.cloudinary.com/.../video.mp4 ou lien direct .mp4"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyUrl(inputUrl)}
                    disabled={!inputUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Appliquer la Vidéo</span>
                  </button>
                </div>

                {/* Exemples rapides de liens de test */}
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-500">
                  <span>Exemple de test :</span>
                  <button
                    type="button"
                    onClick={() => {
                      const demo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                      setInputUrl(demo);
                      handleApplyUrl(demo);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 underline font-mono text-[10.5px] cursor-pointer"
                  >
                    Insérer démo MP4 CDN
                  </button>
                </div>
              </div>

              {/* Badges de Réassurance */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                <div className="flex items-center justify-center gap-1">
                  <VolumeX className="w-3 h-3 text-emerald-400" />
                  <span>100% Silencieux (Muted)</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Repeat className="w-3 h-3 text-indigo-400" />
                  <span>Boucle Infinie (Loop)</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Compatible iOS/Android</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* CAS 2 : VIDÉO CONFIGURÉE -> LECTEUR AUTOPLAY STRICTEMENT CONFIGURÉ */
          /* ================================================================ */
          <div className="relative group w-full">
            {/* Conteneur stylisé 100% largeur avec coins arrondis et bordure épurée */}
            <div
              className={`relative w-full ${getAspectRatioClass(
                data.aspectRatio
              )} ${roundedClass} ${shadowClass} overflow-hidden bg-slate-950 border border-slate-800/80`}
            >
              {/* Badge optionnel par-dessus la vidéo */}
              {data.showBadge && data.badgeText && (
                <div className="absolute top-3 left-3 z-20 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {data.badgeText}
                  </span>
                </div>
              )}

              {/*
                RENDU NATIF DE LA BALISE <video>
                STRICTEMENT les attributs demandés :
                - autoPlay
                - loop
                - muted
                - playsInline
                Tailwind :
                - w-full (s'adapte à 100% de la largeur de son conteneur)
                - object-cover (object-fit: cover)
                - pointer-events-none (pour masquer les contrôles système)
                - coins arrondis épurés
              */}
              <video
                ref={videoRef}
                src={rawUrl}
                preload="none"
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover pointer-events-none ${roundedClass}`}
              />
            </div>

            {/* Titre ou légende optionnelle sous la vidéo */}
            {(data.title || data.caption) && (
              <div className="mt-2 text-center space-y-0.5">
                {data.title && (
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {data.title}
                  </h4>
                )}
                {data.caption && (
                  <p className="text-[11px] text-slate-400">
                    {data.caption}
                  </p>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* COMMANDES ÉDITEUR EN MODE BUILDER (Modification sans upload) */}
            {/* ============================================================ */}
            {isBuilderMode && (
              <div className="mt-2">
                {!isEditingInline ? (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-mono text-slate-300 truncate max-w-xs sm:max-w-md">
                        {rawUrl}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingInline(true)}
                      className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Changer l'URL</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5 text-indigo-400">
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Modifier l'URL directe (Cloudinary, CDN, MP4)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingInline(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://res.cloudinary.com/.../video.mp4"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyUrl(inputUrl)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingInline(false)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AutoplayVideoBlock;
