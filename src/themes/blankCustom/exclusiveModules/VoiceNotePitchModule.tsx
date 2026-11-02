import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Sparkles, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface VoiceNotePitchModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  storeSlug?: string;
  storeName?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const VoiceNotePitchModule: React.FC<VoiceNotePitchModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  storeSlug = 'boutique',
  storeName = 'Notre Boutique',
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const cfg = section.settings || section.config || {};
  const targetProduct = products.find(p => p.id === cfg.productId) || products[0];

  const title = section.title || cfg.title || "🎙️ Écoutez Pourquoi Ce Produit Change Tout";
  const subtitle = section.subtitle || cfg.subtitle || "NOTE VOCALE CONFIDENTIELLE DU FONDATEUR";
  const founderName = cfg.founderName || "Mamadou K. • Fondateur";
  const founderAvatar = cfg.founderAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
  const audioUrl = cfg.audioUrl || "";
  const audioDuration = cfg.durationLabel || "0:38";
  
  const defaultScript = cfg.pitchScript || 
    `Bonjour et bienvenue sur ${storeName} ! Je tenais personnellement à vous enregistrer cette note vocale pour vous expliquer pourquoi ce produit fait l'unanimité auprès de tous nos clients. Il est conçu avec des matériaux d'une qualité irréprochable et contrôlé minutieusement avant chaque expédition. Vous avez la garantie de tester et vérifier votre colis à la livraison avant tout paiement. Profitez de l'offre spéciale réservée à ceux qui écoutent ce message aujourd'hui !`;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [waveSeed, setWaveSeed] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Animation des barres de l'onde sonore
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setWaveSeed(prev => (prev + 1) % 100);
      }, 120);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Nettoyage speech synth
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleTogglePlay = () => {
    playTapBeep();

    if (isPlaying) {
      // Pause
      if (audioUrl && audioRef.current) {
        audioRef.current.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    } else {
      // Lecture
      if (audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setProgress(100);
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          };
          audioRef.current.ontimeupdate = () => {
            if (audioRef.current && audioRef.current.duration) {
              const cur = audioRef.current.currentTime;
              const dur = audioRef.current.duration;
              setProgress(Math.min(100, (cur / dur) * 100));
              setElapsedSec(Math.floor(cur));
            }
          };
        }
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.warn('Audio play error, falling back to Web Speech:', err);
          startSpeechSynth();
        });
      } else {
        startSpeechSynth();
      }
    }
  };

  const startSpeechSynth = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(defaultScript);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      const totalEstimatedSec = 35;
      let startTs = Date.now();

      utterance.onstart = () => {
        setIsPlaying(true);
        setProgress(0);
        setElapsedSec(0);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        progressTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTs) / 1000;
          setElapsedSec(Math.min(totalEstimatedSec, Math.floor(elapsed)));
          setProgress(Math.min(98, (elapsed / totalEstimatedSec) * 100));
        }, 200);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(100);
        setElapsedSec(totalEstimatedSec);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 5000);
    }
  };

  const handleProductTrigger = (p: StoreProductItem) => {
    playValidationBeep();
    if (onOpenTunnel) {
      onOpenTunnel(p);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(p);
    } else {
      triggerOpenFunnel(p.linkedFunnelId || p.id, p.name);
    }
    if (onSelectProduct) {
      onSelectProduct(p);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Barres d'onde sonore (24 barres stylisées)
  const baseWaveHeights = [24, 45, 75, 30, 90, 60, 100, 40, 80, 55, 70, 35, 95, 65, 40, 85, 50, 75, 30, 90, 60, 45, 80, 35];

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            <Volume2 className="w-3.5 h-3.5" />
            <span>{subtitle}</span>
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
            Prenez 30 secondes pour écouter le mot du fondateur : la confiance commence par la voix.
          </p>
        </div>

        {/* Grille principale : Note Vocale + Produit Recommandé */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          {/* CARTE VOCALE VIP (Style Wameet / Note Privilège) */}
          <div className={`lg:col-span-7 rounded-3xl p-6 sm:p-8 ${moodStyle.cardBg} border border-emerald-500/20 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md`}>
            {/* Aura lumineuse d'ambiance */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div>
              {/* Profil de l'expéditeur */}
              <div className="flex items-center justify-between pb-6 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={founderAvatar}
                      alt={founderName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm sm:text-base font-black ${moodStyle.textPrimary}`}>
                        {founderName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                        Vérifié ✓
                      </span>
                    </div>
                    <p className={`text-xs ${moodStyle.textSecondary} flex items-center gap-1 mt-0.5`}>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Note vocale confidentielle • {audioDuration}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {isPlaying ? "En cours de lecture 🟢" : "Prêt à écouter ⏸️"}
                  </span>
                </div>
              </div>

              {/* LECTEUR AUDIO & WAVEFORM SVG */}
              <div className="my-8 p-5 sm:p-6 rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/40 border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Bouton Play / Pause Géant */}
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xl shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer`}
                    aria-label={isPlaying ? "Mettre en pause" : "Écouter la note vocale"}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white ml-1" />
                    )}
                  </button>

                  {/* Waveform des 24 barres */}
                  <div className="flex-1 flex items-center gap-1 sm:gap-1.5 h-12">
                    {baseWaveHeights.map((h, idx) => {
                      const isActive = (idx / baseWaveHeights.length) * 100 <= progress;
                      const dynamicH = isPlaying 
                        ? Math.min(100, Math.max(20, (h + Math.sin(waveSeed + idx) * 35))) 
                        : h;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex items-center justify-center h-full"
                        >
                          <span
                            className={`w-full rounded-full transition-all duration-100 ${
                              isActive 
                                ? 'bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-400/50' 
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ height: `${dynamicH}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Minuteur & Indicateur de progression */}
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <span>{formatTime(elapsedSec)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[11px] font-bold">
                    {isPlaying ? "🎙️ Voix officielle en direct" : "▶️ Cliquez pour écouter le fondateur"}
                  </span>
                  <span>{audioDuration}</span>
                </div>
              </div>

              {/* Rassurance immédiate sous la note vocale */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-black/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-[11px]">Vérification du colis avant paiement</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-black/5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-[11px]">Expédié en 24h à votre adresse</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Audio 100% authentique enregistré par la boutique
              </span>
              <button
                type="button"
                onClick={handleTogglePlay}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isPlaying ? "Pause ⏸️" : "Écouter à nouveau 🔄"}
              </button>
            </div>
          </div>

          {/* CARTE PRODUIT RECOMMANDÉ DANS L'AUDIO */}
          {targetProduct && (
            <div className={`lg:col-span-5 rounded-3xl p-6 sm:p-7 ${moodStyle.cardBg} border border-black/10 shadow-2xl flex flex-col justify-between relative`}>
              <AdminProductQuickBar
                product={targetProduct}
                storeSlug={storeSlug}
                onEditProduct={onEditProduct}
                onPreviewFunnel={onPreviewFunnel}
                isPublicView={isPublicView}
                isAdminPreview={isAdminPreview}
              />

              <div>
                <div className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800 mb-4 group cursor-pointer"
                  onClick={() => handleProductTrigger(targetProduct)}
                >
                  <img
                    src={targetProduct.image}
                    alt={targetProduct.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase shadow-lg flex items-center gap-1.5">
                    <ShoppingBag className="w-3 h-3" />
                    <span>L'Offre Mentionnée</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className={`text-base sm:text-lg font-black line-clamp-1 ${moodStyle.textPrimary}`}>
                    {targetProduct.name}
                  </h3>
                  <p className={`text-xs line-clamp-2 ${moodStyle.textSecondary}`}>
                    {targetProduct.description || "L'article recommandé personnellement par le fondateur dans la note vocale ci-contre."}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarif Spécial Audio</span>
                    <span className={`text-xl sm:text-2xl font-black ${moodStyle.textPrimary}`}>
                      {targetProduct.price.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {targetProduct.originalPrice && targetProduct.originalPrice > targetProduct.price && (
                    <span className="text-xs line-through text-slate-400">
                      {targetProduct.originalPrice.toLocaleString('fr-FR')} F
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleProductTrigger(targetProduct)}
                  className={`w-full py-4 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl transition-transform active:scale-95`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{cfg.ctaText || "Profiter de l'offre mentionnée"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
