import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  Crown, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Zap, 
  ArrowLeft, 
  Filter, 
  ExternalLink,
  ChevronRight,
  Send,
  Layers,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Film,
  Sliders,
  Upload
} from 'lucide-react';
import { StoreUser, StoreSubscription } from '../../types';
import { 
  AiMediaType, 
  GeneratedAiMedia, 
  generateAIMedia, 
  subscribeToUserGeneratedMedia, 
  deleteUserGeneratedMedia,
  calculateUserAiQuotas,
  startVidnozVideoGeneration,
  subscribeToVideoGeneration,
  VIDNOZ_AVATARS,
  VIDNOZ_VOICES,
  VideoGenerationDoc
} from '../../services/aiStudioService';
import { auth, db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { deductUserCredits } from '../../utils/firestoreService';
import { callAwsLambdaUnified } from '../NanaGeneratorModal';
import { isFreePlan, triggerProFeatureUpsell } from '../../utils/planFeatures';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { 
  getHardwareProfile,
  processVisualOnGPU,
  prewarmStudioTurbo,
  activateTurboWakeLock,
  releaseTurboWakeLock,
  runTurboHighPriorityTask,
  executeParallelCpuWorkers,
  executeSmartVariants,
  purgeStudioTurboRam,
  HardwareProfile
} from '../../utils/hardwareTurboEngine';

export interface AiStudioViewProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onBack?: () => void;
  onOpenUpgrade?: () => void;
  initialTab?: AiMediaType;
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({
  currentUser,
  subscription,
  onBack,
  onOpenUpgrade,
  initialTab = 'video'
}) => {
  const { handlePremiumAction } = useFeatureGate();
  const [activeTab, setActiveTab] = useState<AiMediaType>(initialTab);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Détection matérielle préalable & Sécurité Auto-Adaptative (Smart Throttling)
  const hardwareProfile = useMemo(() => getHardwareProfile(), []);

  // Configuration vidéo avatar Vidnoz
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(VIDNOZ_AVATARS[0].id);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VIDNOZ_VOICES[0].id);
  const [activeVideoGenId, setActiveVideoGenId] = useState<string | null>(null);
  const [activeVideoTaskId, setActiveVideoTaskId] = useState<string | null>(null);
  const [videoGenStatus, setVideoGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string>("Création de la vidéo IA en cours sur Replicate... (cela prend environ 1 à 2 minutes)");

  // Médias depuis Firestore
  const [mediaList, setMediaList] = useState<GeneratedAiMedia[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Réglages rapides Omni (Ratio, Résolution avec fallback, Mode Frames, Durée, Variantes)
  const [selectedAspect, setSelectedAspect] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  // Règle 2 : Propose 360p automatiquement si l'appareil a 4 Go de RAM ou moins ou est sur mobile
  const [selectedResolution, setSelectedResolution] = useState<'360p' | '480p' | '720p' | '1080p'>(
    hardwareProfile.isLowRamDevice ? '360p' : '720p'
  );
  const [activeResolutionUsed, setActiveResolutionUsed] = useState<string>(
    hardwareProfile.isLowRamDevice ? '360p' : '720p'
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(8);
  const [selectedVariants, setSelectedVariants] = useState<number>(1);
  const [videoMode, setVideoMode] = useState<'prompt' | 'ingredients'>('prompt');
  const [startFrameImage, setStartFrameImage] = useState<string | null>(null);
  const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
  const [avatarVoiceTone, setAvatarVoiceTone] = useState<'DYNAMIC' | 'PROFESSIONAL' | 'ACADEMIC'>('DYNAMIC');

  const [allGeneratedVariants, setAllGeneratedVariants] = useState<string[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [isProcessingFramesOnGpu, setIsProcessingFramesOnGpu] = useState<boolean>(false);

  // Pré-chargement et Buffering haute vitesse en RAM dès saisie ou changement d'options
  useEffect(() => {
    prewarmStudioTurbo();
  }, [prompt, selectedAspect, selectedResolution, activeTab]);

  // Traitement GPU direct via OffscreenCanvas pour les frames / ingrédients
  const handleFrameUpload = async (file: File, type: 'start' | 'end') => {
    try {
      setIsProcessingFramesOnGpu(true);
      playTapBeep();

      const targetW = selectedResolution === '1080p' ? 1920 : selectedResolution === '720p' ? 1280 : selectedResolution === '480p' ? 854 : 640;
      const targetH = selectedResolution === '1080p' ? 1080 : selectedResolution === '720p' ? 720 : selectedResolution === '480p' ? 480 : 360;

      const fileUrl = URL.createObjectURL(file);

      // Traitement GPU direct via OffscreenCanvas + Contexte matériel
      const gpuResult = await processVisualOnGPU(fileUrl, targetW, targetH, {
        aspectRatio: selectedAspect,
        quality: 0.95,
        filterMode: 'cinematic'
      });

      if (type === 'start') {
        setStartFrameImage(gpuResult.dataUrl);
      } else {
        setEndFrameImage(gpuResult.dataUrl);
      }
    } catch (err) {
      console.warn('[AI STUDIO GPU FRAME ERROR]', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'start') setStartFrameImage(reader.result as string);
        else setEndFrameImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingFramesOnGpu(false);
    }
  };

  const isFree = isFreePlan(subscription);
  const uid = auth.currentUser?.uid || currentUser?.id || 'demo-user';

  // Synchronisation des médias en temps réel depuis Firestore
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUserGeneratedMedia(uid, (items) => {
      setMediaList(items);
    });
    return () => unsub();
  }, [uid]);

  // Écoute en temps réel via Supabase Realtime du document de génération vidéo
  useEffect(() => {
    if (!activeVideoGenId) return;

    console.log(`[AI STUDIO] Démarrage de l'écouteur Supabase Realtime pour /video_generations/${activeVideoGenId}`);
    const unsub = subscribeToVideoGeneration(activeVideoGenId, (doc) => {
      console.log('[AI STUDIO] Mise à jour en temps réel reçue du document vidéo :', doc);

      if (doc.taskId) {
        setActiveVideoTaskId(doc.taskId);
      }

      if (doc.status === 'processing') {
        setVideoGenStatus('processing');
      } else if (doc.status === 'completed' && doc.videoUrl) {
        setVideoGenStatus('completed');
        setCompletedVideoUrl(doc.videoUrl);
        setIsGenerating(false);
        setSuccessMsg("Votre vidéo d'avatar a été générée avec succès et est prête à être lue !");
        playValidationBeep();
      } else if (doc.status === 'failed') {
        setVideoGenStatus('failed');
        setIsGenerating(false);
        setErrorMsg(doc.error || "La génération de votre vidéo a échoué. Veuillez réessayer.");
        playCancelSound();
      }
    });

    return () => unsub();
  }, [activeVideoGenId]);

  // Calcul dynamique des statistiques d'usage pour les quotas
  const usageStats = useMemo(() => {
    const vCount = mediaList.filter(m => m.type === 'video').length;
    const iCount = mediaList.filter(m => m.type === 'image').length;
    const tCount = mediaList.filter(m => m.type === 'text').length;
    return { videoCount: vCount, imageCount: iCount, textCount: tCount };
  }, [mediaList]);

  const quotas = useMemo(() => {
    return calculateUserAiQuotas(subscription, usageStats);
  }, [subscription, usageStats]);

  const currentTabQuota = useMemo(() => {
    if (activeTab === 'video') return quotas.videos;
    if (activeTab === 'image') return quotas.images;
    return quotas.texts;
  }, [activeTab, quotas]);

  // Suggestions de prompts selon l'onglet actif
  const PROMPT_SUGGESTIONS = useMemo(() => {
    switch (activeTab) {
      case 'video':
        return [
          "Vidéo TikTok promotionnelle de 30s présentant une offre exclusive",
          "Présentation de masterclass avec avatar en costume d'affaires",
          "Démonstration produit en situation réelle avec musique dynamique",
          "Vidéo d'annonce WhatsApp avec appel à l'action immédiat"
        ];
      case 'image':
        return [
          "Photo studio 4K fond blanc épuré pour produit e-commerce",
          "Packshot élégant avec éclairage publicitaire haut de gamme",
          "Affiche promotionnelle WhatsApp aux couleurs vives avec badge promo",
          "Mise en scène lifestyle moderne pour vente sur les réseaux sociaux"
        ];
      case 'text':
        return [
          "Fiche descriptive de vente ultra-persuasive avec puces bénéfices",
          "Script de closing WhatsApp pour répondre aux clients hésitants",
          "Post percutant Facebook & Instagram avec accroche virale",
          "Annonce promotionnelle pour campagne SMS Mobile Money"
        ];
    }
  }, [activeTab]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setErrorMsg("Veuillez renseigner un prompt descriptif pour lancer la génération.");
      return;
    }

    // Interception des clics pour les utilisateurs du plan Gratuit
    if (isFreePlan(subscription)) {
      playCancelSound();
      handlePremiumAction('pro', () => {}, {
        featureType: 'STUDIO',
        featureName: `Génération ${activeTab === 'video' ? 'Vidéo' : activeTab === 'image' ? 'Image' : 'Texte'} IA`,
        featureKey: 'AI_STUDIO',
        customTitle: 'Débloquez le Studio IA 👑',
        customMessage: 'Cette fonctionnalité (Studio IA Multimodal) est incluse dans nos plans Premium. Gagnez des heures de travail chaque semaine en laissant notre Intelligence Artificielle générer vos contenus.'
      });
      return;
    }

    // Vérifier si le quota restant est épuisé
    if (!currentTabQuota.isUnlimited && currentTabQuota.remaining <= 0) {
      playCancelSound();
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        triggerProFeatureUpsell('AI_STUDIO');
      }
      return;
    }

    playTapBeep();
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAllGeneratedVariants([]);
    setSelectedVariantIndex(0);

    // 1. Activation du WakeLock CPU anti-ralentissement pour empêcher l'OS de brider les cœurs
    await activateTurboWakeLock();

    // 2. Exécution avec priorité maximale du processeur (scheduler user-blocking)
    return runTurboHighPriorityTask(async () => {
      try {
        // 1. Branchement Vidéo Directe via notre serveur AWS Lambda avec FALLBACK DE RÉSOLUTION & MULTI-VARIANTES EN PARALLÈLE
        if (activeTab === 'video') {
          setCompletedVideoUrl(null);
          setVideoGenStatus('processing');

          const videoPrompt = prompt.trim();
          const LAMBDA_ENDPOINT = "https://lvl7sz2hihrrp6jdui35hm7qnq0zxbkl.lambda-url.eu-north-1.on.aws/";

          // Fonction de génération d'une variante avec cascade automatique de résolutions
          const generateSingleVideo = async (variantIdx: number): Promise<{ url: string; resUsed: string }> => {
            const resolutionCandidates: ('360p' | '480p' | '720p' | '1080p')[] = 
              selectedResolution === '1080p' ? ['1080p', '720p', '480p', '360p']
              : selectedResolution === '720p' ? ['720p', '480p', '360p']
              : selectedResolution === '480p' ? ['480p', '360p']
              : ['360p'];

            let successfulVideoUrl: string | null = null;
            let lastErrorMsg: string | null = null;
            let finalResolutionUsed: string = selectedResolution;

            for (let i = 0; i < resolutionCandidates.length; i++) {
              const currentRes = resolutionCandidates[i];
              finalResolutionUsed = currentRes;
              setActiveResolutionUsed(currentRes);

              const variantLabel = selectedVariants > 1 ? ` (Variante ${variantIdx + 1}/${selectedVariants})` : '';
              if (i > 0) {
                setVideoLoadingMessage(`Bascule automatique en cours sur la résolution de secours ${currentRes}${variantLabel}...`);
              } else {
                setVideoLoadingMessage(`Création de la vidéo IA${variantLabel} (${currentRes}, ${selectedAspect}, ${selectedDuration}s) en cours...`);
              }

              try {
                const payload: any = {
                  type: "video",
                  prompt: videoPrompt + (variantIdx > 0 ? ` (variant ${variantIdx + 1})` : ''),
                  aspect_ratio: selectedAspect,
                  aspectRatio: selectedAspect,
                  resolution: currentRes,
                  duration: selectedDuration,
                  variants: 1,
                  mode: videoMode
                };

                if (videoMode === 'ingredients') {
                  if (startFrameImage) payload.image = startFrameImage;
                  if (startFrameImage) payload.start_frame = startFrameImage;
                  if (endFrameImage) payload.end_frame = endFrameImage;
                }

                // Premier appel pour lancer la génération vidéo
                const res = await fetch(LAMBDA_ENDPOINT, {
                  method: "POST",
                  headers: { "Content-Type": "text/plain;charset=UTF-8" },
                  body: JSON.stringify(payload)
                });

                let data = await res.json();

                if (!res.ok || data.error) {
                  throw new Error(data.error || `Erreur Replicate en ${currentRes}`);
                }

                // Polling Replicate toutes les 4 secondes si processing
                let tries = 0;
                while (
                  !data.output &&
                  !data.videoUrl &&
                  !data.url &&
                  data.id &&
                  (data.status === "starting" || data.status === "processing") &&
                  tries < 45
                ) {
                  setVideoLoadingMessage(`Rendu vidéo IA${variantLabel} (${currentRes}) en cours... (${(tries + 1) * 4}s / ~1-2 min)`);
                  await new Promise((resolve) => setTimeout(resolve, 4000));
                  const pollRes = await fetch(LAMBDA_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=UTF-8" },
                    body: JSON.stringify({ type: "status", id: data.id })
                  });
                  data = await pollRes.json();
                  if (data.error || data.status === "failed") {
                    throw new Error(data.error || `Échec du calcul en ${currentRes}`);
                  }
                  tries++;
                }

                const finalVideoUrl = Array.isArray(data.output)
                  ? data.output[0]
                  : (data.output || data.videoUrl || data.url);

                if (finalVideoUrl && typeof finalVideoUrl === "string") {
                  successfulVideoUrl = finalVideoUrl;
                  break; // Succès de génération ! Sortir de la boucle de fallback
                } else {
                  throw new Error(`Réponse incomplète en ${currentRes}`);
                }
              } catch (tryErr: any) {
                console.warn(`[AI STUDIO] Échec en résolution ${currentRes} pour variante ${variantIdx}, repli... :`, tryErr);
                lastErrorMsg = tryErr?.message || `Erreur en ${currentRes}`;
              }
            }

            if (!successfulVideoUrl) {
              throw new Error(lastErrorMsg || `La variante ${variantIdx + 1} n'a pas pu aboutir après les tentatives de repli.`);
            }

            return { url: successfulVideoUrl, resUsed: finalResolutionUsed };
          };

          // Lancement sécurisé via Smart Throttling (séquentiel 1 par 1 sur mobile/RAM <= 4Go, ou parallèle sur PC)
          const variantCount = Math.max(1, selectedVariants);
          const results = await executeSmartVariants(
            variantCount,
            (vIdx) => generateSingleVideo(vIdx),
            (_res, idx) => {
              if (variantCount > 1) {
                setVideoLoadingMessage(`Variante ${idx + 1}/${variantCount} prête ! Finalisation en cours...`);
              }
            }
          );

          const generatedUrls = results.map(r => r.url);
          const bestResolution = results[0]?.resUsed || selectedResolution;

          setAllGeneratedVariants(generatedUrls);
          setSelectedVariantIndex(0);
          setCompletedVideoUrl(generatedUrls[0]);
          setVideoGenStatus('completed');
          setSuccessMsg(`Votre vidéo (${generatedUrls.length} variante${generatedUrls.length > 1 ? 's' : ''}, ${bestResolution}, ${selectedAspect}) a été générée avec succès via accélération Turbo !`);
          playValidationBeep();

          // Enregistrement de chaque variante dans Firestore
          for (let vi = 0; vi < generatedUrls.length; vi++) {
            const vUrl = generatedUrls[vi];
            try {
              const mediaId = `media_${Date.now()}_${vi}_${Math.random().toString(36).substring(2, 6)}`;
              const mediaDocRef = doc(db, 'users', uid, 'generated_media', mediaId);
              await setDoc(mediaDocRef, {
                id: mediaId,
                uid,
                prompt: videoPrompt + (vi > 0 ? ` (Variante ${vi + 1})` : ''),
                type: 'video',
                mediaUrl: vUrl,
                status: 'completed',
                provider: 'replicate-wan-lambda',
                metadata: {
                  aspectRatio: selectedAspect,
                  resolution: bestResolution,
                  duration: selectedDuration,
                  variants: selectedVariants,
                  variantIndex: vi,
                  mode: videoMode,
                  turboAccelerated: true,
                  generatedAt: Date.now()
                },
                createdAt: serverTimestamp()
              });
            } catch (saveErr) {
              console.warn('[AI STUDIO] Notice enregistrement Firestore :', saveErr);
            }
          }

          // Débite les crédits uniquement si la vidéo est bien reçue
          try {
            await deductUserCredits(uid, 20 * variantCount, {
              type: 'video',
              description: `Génération Vidéo Turbo AWS Lambda (${variantCount}x ${bestResolution} ${selectedAspect})`
            });
          } catch (debitErr) {
            console.warn('[CREDITS] Notice débit vidéo AiStudioView :', debitErr);
          }
          return;
        }

        // 2. Génération synchrone standard pour Images et Textes (avec multi-variantes sécurisées via Smart Throttling)
        if (activeTab === 'image' && selectedVariants > 1) {
          const variantCount = selectedVariants;

          const imageResults = await executeSmartVariants(
            variantCount,
            async (vIndex) => {
              return generateAIMedia({
                prompt: prompt.trim() + (vIndex > 0 ? ` (variante ${vIndex + 1})` : ''),
                type: 'image',
                options: {
                  aspectRatio: selectedAspect,
                  resolution: selectedResolution,
                  variants: 1,
                  variantIndex: vIndex,
                  voiceTone: avatarVoiceTone,
                  storeName: currentUser?.storeName || 'NaNa Store'
                }
              });
            }
          );

          const urls = imageResults.map(r => r.mediaUrl).filter(Boolean);
          setAllGeneratedVariants(urls);
          setSelectedVariantIndex(0);
          playValidationBeep();
          setSuccessMsg(`${urls.length} images générées avec succès (${hardwareProfile.isLowRamDevice ? 'Mode Éco 1 par 1' : 'Multi-Cœurs Turbo'}) !`);
          setPrompt('');
          setTimeout(() => setSuccessMsg(null), 4000);
          return;
        }

        // Cas standard 1 image ou 1 texte
        const generated = await generateAIMedia({
          prompt: prompt.trim(),
          type: activeTab,
          options: {
            aspectRatio: selectedAspect,
            resolution: selectedResolution,
            variants: selectedVariants,
            voiceTone: avatarVoiceTone,
            storeName: currentUser?.storeName || 'NaNa Store'
          }
        });

        if (generated.mediaUrl) {
          setAllGeneratedVariants([generated.mediaUrl]);
          setSelectedVariantIndex(0);
        }

        playValidationBeep();
        setSuccessMsg(`Média (${activeTab}) généré avec succès et enregistré dans votre bibliothèque !`);
        setPrompt('');
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (err: any) {
        console.error('[AI STUDIO ERROR]', err);
        setErrorMsg(err?.message || "Une erreur est survenue lors de la génération. Veuillez réessayer.");
        playCancelSound();
        if (activeTab === 'video') setVideoGenStatus('failed');
      } finally {
        setIsGenerating(false);
        // Règle 3 : Purge immédiate de la mémoire vive (Garbage Collection, Object URLs, Workers, WakeLock)
        purgeStudioTurboRam();
      }
    });
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément de votre galerie ?")) return;
    try {
      playTapBeep();
      await deleteUserGeneratedMedia(uid, mediaId);
    } catch (err: any) {
      setErrorMsg("Impossible de supprimer le média.");
    }
  };

  const handleCopyContent = (id: string, text: string) => {
    playValidationBeep();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtrer les médias pour la galerie de l'onglet actif
  const filteredMedia = useMemo(() => {
    return mediaList.filter(item => item.type === activeTab);
  }, [mediaList, activeTab]);

  return (
    <div className="w-full h-full min-h-0 flex-1 bg-[#050814] text-slate-100 flex flex-col font-sans select-none overflow-y-auto overscroll-contain pb-24 scrollbar-thin">
      
      {/* 1. HEADER DU STUDIO IA */}
      <header className="sticky top-0 z-30 bg-[#090e21]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBack(); }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              title="Retour au tableau de bord"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                Studio IA 👑
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-tight shrink-0 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40" />
                <span>Multimodal</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block truncate">
              Générateur d'avatars vidéo, visuels publicitaires 4K et argumentaires haute conversion
            </p>
          </div>
        </div>

        {/* Bouton d'Upgrade ou Statut Pro */}
        <div className="flex items-center gap-2 shrink-0">
          {isFree ? (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onOpenUpgrade) onOpenUpgrade();
                else triggerProFeatureUpsell('AI_STUDIO');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-950/40 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Passer en Pro</span>
            </button>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Forfait Pro Actif</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. CONTENU PRINCIPAL */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 2.1 BANNIÈRE DE QUOTAS DU MOIS (Exigence Cahier des charges) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0e1530] to-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Consommation & Quota Restant
                </span>
              </div>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>{currentTabQuota.label}</span>
                {!currentTabQuota.isUnlimited && (
                  <span className="text-xs font-bold text-slate-400">
                    ({currentTabQuota.remaining} restant{currentTabQuota.remaining > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>

            {/* Barre de progression visuelle */}
            {!currentTabQuota.isUnlimited && (() => {
              const aiSafeMax = Math.max(currentTabQuota.max || 1, 1);
              const aiSafeUsed = Math.max(currentTabQuota.used || 0, 0);
              const aiPercent = aiSafeUsed === 0 ? 0 : Math.min(100, Math.max(0, Math.round((aiSafeUsed / aiSafeMax) * 100)));
              const isAiCritical = aiPercent >= 80;
              const isAiModerate = aiPercent >= 50;

              return (
                <div className="w-full sm:w-64 space-y-1.5">
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        isAiCritical
                          ? 'bg-rose-500'
                          : isAiModerate
                          ? 'bg-amber-500'
                          : aiSafeUsed === 0
                          ? 'bg-slate-700'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${aiPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    {aiSafeUsed === 0 ? (
                      <span className="text-blue-400 truncate">0/{currentTabQuota.max} — Prêt à générer ! ✨</span>
                    ) : (
                      <span className={isAiCritical ? 'text-rose-400' : 'text-slate-400'}>
                        {aiSafeUsed} consommée{aiSafeUsed > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-slate-500 shrink-0">Max: {currentTabQuota.max}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2.2 PANNEAU OMNI DARK MINIMALIST : RÉGLAGES RAPIDES & CONTRÔLE DE GÉNÉRATION */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider block">
                  Réglages Rapides Omni
                </span>
                <span className="text-[10px] text-slate-400">
                  Contrôles ultra-rapides du Studio IA
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[10.5px] text-amber-300 flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-500/15 px-3 py-1 rounded-full border border-amber-500/40 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="font-black text-white">⚡ Sécurité Auto-Adaptative :</span>
                <span className="text-amber-200 font-mono text-[10px] font-bold">
                  {hardwareProfile.safeCpuCores}/{hardwareProfile.rawCpuCores} Cœurs CPU (Plafond 60%) • RAM {hardwareProfile.memoryGb}Go {hardwareProfile.isLowRamDevice ? 'Protégée' : 'Optimale'}
                </span>
              </div>
              <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-300">
                  {hardwareProfile.isLowRamDevice ? 'Mode Éco (1 par 1)' : 'Parallèle Turbo'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Bascule Média : Image / Vidéo / Texte */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Type de Contenu</span>
              </label>
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('video'); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'video'
                      ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md shadow-rose-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vidéo ({quotas.videos.used})</span>
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('image'); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'image'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image ({quotas.images.used})</span>
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('text'); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'text'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Texte ({quotas.texts.used})</span>
                </button>
              </div>
            </div>

            {/* 2. Format / Ratio (16:9 Paysage vs 9:16 Portrait) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Format (Ratio)</span>
                </label>
                <span className="text-[10px] text-purple-400 font-bold">
                  {selectedAspect === '16:9' ? 'Paysage (Widescreen)' : selectedAspect === '9:16' ? 'Vertical (Mobile)' : 'Carré Produit'}
                </span>
              </div>
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedAspect('16:9'); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedAspect === '16:9'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm font-black leading-none">▭</span>
                  <span>16:9 (Défaut)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedAspect('9:16'); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedAspect === '9:16'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm font-black leading-none">▯</span>
                  <span>9:16 (TikTok)</span>
                </button>
                {activeTab === 'image' && (
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setSelectedAspect('1:1'); }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedAspect === '1:1'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-sm font-black leading-none">◽</span>
                    <span>1:1</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Résolution (avec 720p HD sélectionné par défaut et fallback automatique) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>3. Résolution</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {selectedResolution === '720p' ? '720p HD (Défaut)' : selectedResolution}
                </span>
              </div>
              <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
                {(['360p', '480p', '720p', '1080p'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => { playTapBeep(); setSelectedResolution(res); }}
                    className={`py-1 px-1 rounded-lg text-[10.5px] font-bold transition text-center cursor-pointer ${
                      selectedResolution === res
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <div>{res}</div>
                    {res === '720p' && (
                      <span className="block text-[8px] text-amber-300 font-black -mt-0.5 leading-none">
                        Défaut
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Choix du Mode (Frames / Ingrédients vs Prompt direct) - Vidéo */}
            {activeTab === 'video' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>4. Mode Vidéo</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-bold">
                    {videoMode === 'prompt' ? 'Prompt Direct' : 'Frames / Ingrédients'}
                  </span>
                </div>
                <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setVideoMode('prompt'); }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      videoMode === 'prompt'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Prompt Direct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setVideoMode('ingredients'); }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      videoMode === 'ingredients'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Frames / Ingrédients</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. Durée de la vidéo (4s, 6s, 8s défaut, 10s) */}
            {activeTab === 'video' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>5. Durée Vidéo</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-bold">
                    {selectedDuration}s {selectedDuration === 8 && '(Recommandé)'}
                  </span>
                </div>
                <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
                  {([4, 6, 8, 10] as const).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => { playTapBeep(); setSelectedDuration(dur); }}
                      className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-bold transition text-center cursor-pointer ${
                        selectedDuration === dur
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Nombre de variantes (x1 défaut, x2, x3, x4) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>6. Nombre de Variantes</span>
                </label>
                <span className="text-[10px] text-purple-400 font-bold">
                  x{selectedVariants} {selectedVariants === 1 && '(Standard)'}
                </span>
              </div>
              <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
                {([1, 2, 3, 4] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { playTapBeep(); setSelectedVariants(v); }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-bold transition text-center cursor-pointer ${
                      selectedVariants === v
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    x{v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zone Frames / Ingrédients de départ si mode === 'ingredients' */}
          {activeTab === 'video' && videoMode === 'ingredients' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Ingrédients Visuels (Frames de départ pour animer votre produit en vidéo)</span>
                </span>
                <span className="text-[10px] text-purple-300 font-semibold">Téléversez vos photos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Frame 1 : Image de départ / Produit */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>Frame de Départ (Start Frame)</span>
                    {startFrameImage && (
                      <button
                        type="button"
                        onClick={() => setStartFrameImage(null)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Effacer</span>
                      </button>
                    )}
                  </div>
                  {startFrameImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-700 group">
                      <img src={startFrameImage} alt="Start frame" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-purple-500/40 text-purple-300 text-[9px] font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                        <span>GPU Offscreen Accéléré</span>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition text-slate-400 hover:text-purple-300">
                      {isProcessingFramesOnGpu ? (
                        <div className="flex flex-col items-center gap-1">
                          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                          <span className="text-[10px] text-purple-300 font-bold">Rendu Offscreen GPU en cours...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10.5px] font-semibold">Téléverser image de départ</span>
                          <span className="text-[8.5px] text-slate-500 font-mono">Prétraitement matériel GPU</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFrameUpload(file, 'start');
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Frame 2 : Image de fin / Transition */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>Frame de Fin (End Frame - Optionnel)</span>
                    {endFrameImage && (
                      <button
                        type="button"
                        onClick={() => setEndFrameImage(null)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Effacer</span>
                      </button>
                    )}
                  </div>
                  {endFrameImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-700 group">
                      <img src={endFrameImage} alt="End frame" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-purple-500/40 text-purple-300 text-[9px] font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                        <span>GPU Offscreen Accéléré</span>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition text-slate-400 hover:text-purple-300">
                      {isProcessingFramesOnGpu ? (
                        <div className="flex flex-col items-center gap-1">
                          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                          <span className="text-[10px] text-purple-300 font-bold">Rendu Offscreen GPU en cours...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10.5px] font-semibold">Téléverser image de fin (optionnel)</span>
                          <span className="text-[8.5px] text-slate-500 font-mono">Prétraitement matériel GPU</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFrameUpload(file, 'end');
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2.3 ATELIER DE RÉDACTION DU PROMPT & SYNTHÈSE IA */}
        <form onSubmit={handleGenerate} className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Prompt de Génération {activeTab === 'video' ? 'Vidéo' : activeTab === 'image' ? 'Image' : 'Texte'}</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {prompt.length} car.
            </span>
          </div>

          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeTab === 'video'
                ? "Décrivez le sujet de votre vidéo d'avatar (ex: Présentation percutante du nouveau smartphone 5G pour les commerçants)..."
                : activeTab === 'image'
                ? "Décrivez précisément le visuel souhaité (ex: Sac de riz 25kg posé sur table en bois, fond blanc studio 4K net)..."
                : "Décrivez le texte recherché (ex: Script de vente WhatsApp avec offre spéciale -20% livrable aujourd'hui)..."
            }
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none leading-relaxed transition"
          />

          {/* Options secondaires contextuelles (Ton de voix, Avatars) */}
          {activeTab === 'video' && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 text-[11px] font-bold">Ton de Voix :</span>
                <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                  {(['DYNAMIC', 'PROFESSIONAL', 'ACADEMIC'] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setAvatarVoiceTone(tone)}
                      className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                        avatarVoiceTone === tone
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tone === 'DYNAMIC' ? 'Dynamique' : tone === 'PROFESSIONAL' ? 'Professionnel' : 'Académique'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur d'Avatar Vidnoz */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <span>Avatar Numérique Vidnoz :</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold">Synchro labiale IA</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIDNOZ_AVATARS.map(avatar => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        selectedAvatarId === avatar.id
                          ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40 text-white shadow-lg shadow-purple-950/40'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl shrink-0 p-1 rounded-xl bg-slate-900 border border-slate-800">{avatar.preview}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate text-white">{avatar.name}</p>
                        <p className="text-[9.5px] text-slate-400 truncate">{avatar.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur de Voix Vidnoz */}
              <div className="w-full space-y-2 pt-1">
                <span className="text-[11px] font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>Voix IA :</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIDNOZ_VOICES.map(voice => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => setSelectedVoiceId(voice.id)}
                      className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                        selectedVoiceId === voice.id
                          ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg shadow-indigo-950/40'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <p className="text-[11px] font-bold truncate text-white">{voice.name}</p>
                      <p className="text-[9.5px] text-slate-400 truncate">{voice.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bouton de Soumission */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-950/50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthèse IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Générer {activeTab === 'video' ? `la Vidéo (${selectedAspect} • ${selectedResolution})` : activeTab === 'image' ? `l'Image (${selectedAspect})` : 'le Texte'}</span>
                  <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300/20" />
                </>
              )}
            </button>
          </div>

          {/* Suggestions de Prompts 1-Clic */}
          <div className="pt-2 border-t border-slate-800/60">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Idées de prompts suggérés :</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { playTapBeep(); setPrompt(sug); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition text-left cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Messages d'erreur et succès */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>

        {/* 2.3.1 ÉTAT DE CHARGEMENT TEMPS RÉEL (Replicate Vidéo Wan-2.1 + Télémétrie Turbo Matérielle) */}
        {videoGenStatus === 'processing' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/50 shadow-2xl shadow-purple-950/50 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-300" />
              </div>
              <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-black text-purple-300 uppercase tracking-wider">
                    Génération Vidéo Replicate Wan-2.1
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-sm font-bold text-white">
                  {videoLoadingMessage}
                </p>
                <p className="text-xs text-slate-400">
                  Suivi d'avancement automatique en cours via notre serveur AWS Lambda (interrogation toutes les 4s)...
                </p>
              </div>
            </div>

            {/* Badge et télémétrie d'accélération matérielle maximale en temps réel */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="font-black text-amber-300 uppercase tracking-wider">
                    ⚡ Smart Throttling Actif (Anti-Chauffe & Anti-Crash RAM)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                  PLAFOND 60% CPU • {hardwareProfile.isLowRamDevice ? 'FILE 1 PAR 1 PROTÉGÉE' : 'TURBO MULTI-CŒURS'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Processeur CPU :</span>
                  <span className="font-mono text-emerald-400 font-black">{hardwareProfile.safeCpuCores} sur {hardwareProfile.rawCpuCores} Cœurs (Plafond 60%)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Rendu Graphique :</span>
                  <span className="font-mono text-purple-300 font-bold truncate block">{hardwareProfile.hasOffscreenCanvas ? 'OffscreenCanvas GPU' : 'GPU WebGL'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Mémoire RAM :</span>
                  <span className="font-mono text-amber-300 font-bold">{hardwareProfile.isLowRamDevice ? `${hardwareProfile.memoryGb}Go (Mode Éco Léger)` : `${hardwareProfile.memoryGb}Go (Tampon Actif)`}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Protection Système :</span>
                  <span className="font-mono text-blue-400 font-bold">SMS App Protégée + Purge Auto</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2.3.2 LECTEUR VIDÉO TEMPS RÉEL (Affiché dès que status === 'completed') */}
        {completedVideoUrl && (
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl shadow-emerald-950/40 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-black border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  VIDÉO GÉNÉRÉE AVEC SUCCÈS
                </span>
                <span className="text-xs text-slate-400">Prête pour diffusion</span>
              </div>
              <button
                type="button"
                onClick={() => setCompletedVideoUrl(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                Masquer l'aperçu
              </button>
            </div>

            {/* Sélecteur de Variantes Générées en Parallèle (x2, x3, x4) */}
            {allGeneratedVariants.length > 1 && (
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Variantes Générées en Parallèle ({allGeneratedVariants.length}) :</span>
                  </span>
                  <span className="text-[10px] text-purple-300">Cliquez pour prévisualiser</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allGeneratedVariants.map((vUrl, vIdx) => (
                    <button
                      key={vIdx}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedVariantIndex(vIdx);
                        setCompletedVideoUrl(vUrl);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        selectedVariantIndex === vIdx
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/50 border border-purple-400/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>Variante {vIdx + 1}</span>
                      {selectedVariantIndex === vIdx && <Check className="w-3.5 h-3.5 text-amber-300" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composant Lecteur Vidéo <video> natif avec support dynamique Ratio & Résolution */}
            <div className={`relative ${selectedAspect === '9:16' ? 'aspect-[9/16] max-w-xs sm:max-w-sm mx-auto' : 'aspect-video w-full'} max-h-[480px] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner`}>
              <video
                src={completedVideoUrl}
                preload="none"
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full rounded-xl object-contain max-h-[480px]"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white text-[10.5px] font-bold flex items-center gap-1.5 shadow-md">
                <span className="text-amber-400">{selectedAspect === '9:16' ? '▯ 9:16 Vertical' : '▭ 16:9 Paysage'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400">{activeResolutionUsed || selectedResolution}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  window.open(
                    'https://www.canva.com/fr_fr/creer/videos/',
                    'CanvaVideoStudio',
                    'width=900,height=800,left=600,top=100,resizable=yes,scrollbars=yes'
                  );
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-purple-950/40 border border-purple-400/30 cursor-pointer active:scale-95"
              >
                <Film className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>🎬 Monter la vidéo pour Pub / Webinaire</span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-200" />
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    if (!completedVideoUrl) return;
                    const filename = `nanagenerateur-${Date.now()}.mp4`;
                    try {
                      const res = await fetch(completedVideoUrl, { mode: 'cors' });
                      const blob = await res.blob();
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = u;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(u), 10000);
                    } catch {
                      const a = document.createElement('a');
                      a.href = completedVideoUrl;
                      a.download = filename;
                      a.target = '_blank';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Télécharger MP4</span>
                </button>
                <a
                  href={completedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-900/40"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                  <span>Ouvrir en plein écran</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 2.4 GALERIE DES MÉDIAS PRÉCÉDENTS (Récupérés depuis Firestore avec <video> natif) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm sm:text-base font-black text-white">
                Galerie des {activeTab === 'video' ? 'Vidéos' : activeTab === 'image' ? 'Images' : 'Textes'} ({filteredMedia.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Enregistré dans Firestore (/users/{uid}/generated_media)
            </span>
          </div>

          {filteredMedia.length === 0 ? (
            <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                {activeTab === 'video' ? <Video className="w-6 h-6" /> : activeTab === 'image' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Aucun média {activeTab} pour le moment</p>
                <p className="text-xs text-slate-400 mt-1">Utilisez l'atelier ci-dessus pour lancer votre première génération.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedia.map((item) => (
                <div 
                  key={item.id} 
                  className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-purple-500/40 transition-all duration-300"
                >
                  {/* Contenu visuel selon le type */}
                  {item.type === 'video' && (
                    <div className={`relative ${item.metadata?.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-72 mx-auto' : 'aspect-video w-full'} bg-black flex items-center justify-center overflow-hidden`}>
                      {/* Lecteur <video> natif conforme au cahier des charges */}
                      <video
                        src={item.mediaUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      {item.metadata?.aspectRatio && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold">
                          {item.metadata.aspectRatio === '9:16' ? '▯ 9:16' : '▭ 16:9'}
                          {item.metadata.resolution && ` • ${item.metadata.resolution}`}
                        </div>
                      )}
                    </div>
                  )}

                  {item.type === 'image' && (
                    <div className="relative aspect-square bg-slate-950 overflow-hidden">
                      <img
                        src={item.mediaUrl}
                        alt={item.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {item.type === 'text' && (
                    <div className="p-4 bg-slate-950/60 rounded-t-3xl min-h-[140px] max-h-[220px] overflow-y-auto text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed border-b border-slate-800/80 scrollbar-thin">
                      {item.content || item.prompt}
                    </div>
                  )}

                  {/* Métadonnées & Actions */}
                  <div className="p-3.5 space-y-2 bg-slate-900/90">
                    <p className="text-xs text-slate-300 font-semibold line-clamp-2" title={item.prompt}>
                      "{item.prompt}"
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10.5px] text-slate-400 font-medium">
                      <span>{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>

                      <div className="flex items-center gap-1.5">
                        {item.type === 'text' ? (
                          <button
                            type="button"
                            onClick={() => handleCopyContent(item.id, item.content || item.prompt)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copier le texte"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Ouvrir le média"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                          title="Supprimer de la galerie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default AiStudioView;
