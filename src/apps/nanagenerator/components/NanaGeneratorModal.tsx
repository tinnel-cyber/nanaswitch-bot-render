import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Upload, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  ArrowLeft,
  Settings,
  Send,
  Eye,
  WifiOff,
  Coins,
  CreditCard,
  AlertTriangle,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Zap,
  ExternalLink,
  Film,
  Camera,
  Sun,
  Maximize2,
  Music,
  Volume2,
  ArrowRight,
  Clapperboard,
  Layers
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound, playCashChime, formatCFA } from '../../../utils/audio';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { auth } from '../../../firebase';
import { StoreUser } from '../../../types';
import { 
  subscribeToUserCredits, 
  deductUserCredits, 
  addUserCredits, 
  GENERATOR_CREDIT_COSTS, 
  DEFAULT_FREE_CREDITS 
} from '../../../utils/firestoreService';
import { SPaymentGateway } from '../../../components/payment/SPaymentGateway';
import { FLOW_STUDIO_URL, openFlowInApp, showGoogleFlowToast } from '../../../utils/launchGoogleFlow';
import { getResolvedGeminiApiKey } from '../../../services/legalAiService';
import { 
  prewarmStudioTurbo,
  activateTurboWakeLock,
  releaseTurboWakeLock,
  runTurboHighPriorityTask,
  purgeStudioTurboRam
} from '../../../utils/hardwareTurboEngine';

export type GeneratorMode = 'text' | 'image' | 'video';
export type VideoSubMode = 'flow' | 'direct';
export type FlowStyleType = 'pub' | 'cours' | 'cinema';

// URL backend AWS Lambda officielle (Replicate centralisé : Texte, Image, Vidéo)
export const OFFICIAL_AWS_LAMBDA_URL = 'https://lvl7sz2hihrrp6jdui35hm7qnq0zxbkl.lambda-url.eu-north-1.on.aws/';

// Configurée via .env (VITE_AWS_LAMBDA_URL, VITE_LAMBDA_URL, LAMBDA_URL, AWS_LAMBDA_URL) ou URL officielle par défaut
const rawConfiguredLambdaUrl: string =
  (import.meta as any).env?.VITE_AWS_LAMBDA_URL ||
  (import.meta as any).env?.VITE_LAMBDA_URL ||
  (typeof process !== 'undefined' ? (process.env?.AWS_LAMBDA_URL || process.env?.LAMBDA_URL || '') : '') ||
  '';
export const LAMBDA_URL: string =
  (rawConfiguredLambdaUrl.startsWith('https://') || rawConfiguredLambdaUrl.startsWith('http://'))
    ? rawConfiguredLambdaUrl.trim()
    : OFFICIAL_AWS_LAMBDA_URL;

/**
 * Appel sécurisé vers le backend AWS Lambda officiel (Replicate centralisé côté AWS) :
 * 1. En développement : Proxy Vite / Node.js sur '/aws-lambda' (0 restriction CORS)
 * 2. En direct : URL AWS Lambda avec Content-Type 'text/plain;charset=UTF-8' (évite le preflight CORS OPTIONS)
 */
export async function callAwsLambdaUnified(
  payload: { type: string; prompt?: string; id?: string; [key: string]: any },
  signal?: AbortSignal
): Promise<Response> {
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    Boolean((import.meta as any).env?.DEV)
  );

  const payloadStr = JSON.stringify(payload);

  if (isLocal) {
    try {
      const proxyRes = await fetch('/aws-lambda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payloadStr,
        signal
      });

      if (proxyRes.ok || (proxyRes.status !== 404 && proxyRes.status !== 502)) {
        return proxyRes;
      }
    } catch (proxyErr: any) {
      console.warn('[STUDIO] Proxy local /aws-lambda indisponible, bascule sur AWS Lambda direct :', proxyErr?.message);
    }
  }

  // Appel direct vers AWS Lambda (simple request CORS sans preflight)
  const targetUrl = OFFICIAL_AWS_LAMBDA_URL;
  return await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    },
    body: payloadStr,
    signal
  });
}



/**
 * Moteur rédactionnel local Studio NaNa (100% hors-ligne et résilient)
 */
export function generateLocalStudioCopy(prompt: string, storeName?: string): string {
  const cleanStore = storeName?.trim() || 'Notre Boutique';
  const cleanPrompt = prompt.trim();

  return `✨ OFFRE EXCLUSIVE — ${cleanStore.toUpperCase()}\n\n` +
    `🔥 ${cleanPrompt}\n\n` +
    `💡 Pourquoi choisir notre offre ?\n` +
    `• Qualité supérieure vérifiée et certifiée\n` +
    `• Excellent rapport qualité/prix garanti\n` +
    `• Disponibilité immédiate en stock limité\n\n` +
    `📦 Livraison rapide et soignée à domicile ou retrait immédiat\n` +
    `💳 Paiement sécurisé (Orange Money, Moov Money, Espèces à la livraison)\n\n` +
    `📲 Commandez dès maintenant en nous contactant directement par message ou Wameet Direct !`;
}

/**
 * Génération textuelle directe via Google Gemini AI Studio si une clé API est configurée
 */
async function generateWithGeminiStudio(prompt: string, apiKey: string): Promise<string> {
  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Tu es le Studio IA NaNa, assistant marketing et rédactionnel expert pour commerçants et créateurs africains.\n` +
                    `Rédige un texte percutant, captivant et prêt à publier pour :\n"${prompt}".\n` +
                    `Inclus des émojis pertinents, les arguments clés et un appel à l'action percutant.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("URL du serveur IA non configurée ou invalide");
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Erreur Gemini (${res.status})`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error("Impossible de joindre le service Gemini");
}

// Bibliothèque Audio 'Zéro Mémoire' (100% Externe sur CDN sans aucun stockage local)
export interface AudioTrackItem {
  id: string;
  title: string;
  genre: string;
  duration: string;
  url: string;
  badge: string;
}

export const MONTAGE_AUDIO_LIBRARY: AudioTrackItem[] = [
  {
    id: 'track_1',
    title: 'Rythme Pub Dynamique',
    genre: 'Électro Commercial & Punchy',
    duration: '2:15',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    badge: '⚡ Pub & Reels'
  },
  {
    id: 'track_2',
    title: 'Fond Corporate Doux',
    genre: 'Acoustique Moderne & Zen',
    duration: '1:48',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    badge: '💼 Cours & Webinaire'
  },
  {
    id: 'track_3',
    title: 'Effet Sonore Transition / Whoosh',
    genre: 'Impact SFX & Cut Rapide',
    duration: '0:02',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    badge: '💥 Transition & Cut'
  },
  {
    id: 'track_4',
    title: 'Suspense Vente & Urgence',
    genre: 'Tension Rythmée & Urgence',
    duration: '1:30',
    url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
    badge: '⏳ Offre Limitée'
  },
  {
    id: 'track_5',
    title: 'Énergie & Motivation Vente',
    genre: 'Feel-Good & Optimisme',
    duration: '2:05',
    url: 'https://assets.mixkit.co/music/preview/mixkit-happy-times-158.mp3',
    badge: '🌟 Lancement Produit'
  }
];

export interface NanaGeneratorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialMode?: GeneratorMode;
  initialPrompt?: string;
  storeName?: string;
  isModal?: boolean; // true = modal overlay, false = page complète
  currentUser?: StoreUser | null;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  name: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { 
    id: 'pack_25', 
    credits: 25, 
    price: 1500, 
    name: 'Pack Découverte', 
    description: '25 crédits (ex: 8 vidéos Flow ou 12 images)' 
  },
  { 
    id: 'pack_60', 
    credits: 60, 
    price: 3000, 
    name: 'Pack Créateur', 
    description: '60 crédits (ex: 20 vidéos Flow ou 3 vidéos directes)', 
    popular: true 
  },
  { 
    id: 'pack_250', 
    credits: 250, 
    price: 10000, 
    name: 'Pack Studio Pro', 
    description: '250 crédits (ex: 80 vidéos Flow ou 125 images)' 
  },
  { 
    id: 'pack_600', 
    credits: 600, 
    price: 20000, 
    name: 'Pack Agence & Entreprise', 
    description: '600 crédits (ex: 200 vidéos Flow ou 300 images)' 
  },
];

export const NanaGeneratorModal: React.FC<NanaGeneratorModalProps> = ({
  isOpen = true,
  onClose,
  initialMode = 'text',
  initialPrompt = '',
  storeName = 'Notre Entreprise',
  isModal = true,
  currentUser,
}) => {
  // Mode actif : 'text', 'image', 'video'
  const [mode, setMode] = useState<GeneratorMode>(initialMode);
  const { isOnline } = useNetworkStatus();

  // Sous-mode Vidéo Hybride :
  // Option A : 'flow' = Studio Flow Assisté (Économique - 3 crédits) [Sélectionné par défaut]
  // Option B : 'direct' = Génération Directe Cloud (20 crédits)
  const [videoSubMode, setVideoSubMode] = useState<VideoSubMode>('flow');

  // Styles rapides pour le Studio Flow Assisté
  const [flowStyle, setFlowStyle] = useState<FlowStyleType>('pub');
  const [flowProductDescription, setFlowProductDescription] = useState(initialPrompt);
  const [videoDescription, setVideoDescription] = useState(initialPrompt);
  const [flowOptimizedPrompt, setFlowOptimizedPrompt] = useState<string>('');
  const [isFlowPrepared, setIsFlowPrepared] = useState<boolean>(false);
  const [isPreparingFlow, setIsPreparingFlow] = useState<boolean>(false);
  const [isFlowCopied, setIsFlowCopied] = useState<boolean>(false);
  const [isDownloadingMedia, setIsDownloadingMedia] = useState<boolean>(false);
  const [isFullScreenPreview, setIsFullScreenPreview] = useState<boolean>(false);

  // Résolution de l'identifiant utilisateur pour Firestore
  const effectiveUid = useMemo(() => {
    return (
      currentUser?.id ||
      currentUser?.uid ||
      auth.currentUser?.uid ||
      (typeof window !== 'undefined' ? localStorage.getItem('nana_store_user_id') : null) ||
      'user_studio_default'
    );
  }, [currentUser]);

  // Solde de Crédits synchronisé en temps réel avec Firebase Firestore (collection users)
  const [credits, setCredits] = useState<number>(() => {
    if (typeof currentUser?.credits === 'number') return currentUser.credits;
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`nana_user_credits_${effectiveUid}`);
      if (cached !== null) {
        const num = parseInt(cached, 10);
        if (!isNaN(num)) return num;
      }
    }
    return DEFAULT_FREE_CREDITS;
  });

  // Écouteur temps réel via Supabase Realtime (remplace Firestore onSnapshot)
  useEffect(() => {
    if (!effectiveUid) return;
    const unsubscribe = subscribeToUserCredits(effectiveUid, (liveCredits) => {
      setCredits(liveCredits);
    });
    return () => unsubscribe();
  }, [effectiveUid]);

  // Saisie utilisateur
  const [textPrompt, setTextPrompt] = useState(initialPrompt);
  const [textChannel, setTextChannel] = useState<'DESCRIPTION' | 'SOCIAL' | 'MESSAGE'>('DESCRIPTION');
  
  // Image pour le mode vidéo direct
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoImageBase64, setVideoImageBase64] = useState<string>('');
  const [videoImagePreview, setVideoImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États de chargement et retours
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [insufficientCreditsInfo, setInsufficientCreditsInfo] = useState<{
    required: number;
    current: number;
    modeLabel: string;
  } | null>(null);

  // Modal de Rechargement & Passerelle SPaymentGateway
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[1]);
  const [isPaymentGatewayActive, setIsPaymentGatewayActive] = useState(false);
  const [rechargeSuccessToast, setRechargeSuccessToast] = useState<string | null>(null);

  // Résultats
  const [generatedText, setGeneratedText] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const isImageDebitedRef = useRef<boolean>(false);
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // État du Studio de Montage (Post-Production) & Kit de Montage IA Split-Screen
  const [showMontageKit, setShowMontageKit] = useState<boolean>(false);
  const [copiedKitBlock, setCopiedKitBlock] = useState<string | null>(null);
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState<boolean>(false);
  const montageKitRef = useRef<HTMLDivElement>(null);

  // Pré-chauffage des ressources et du tampon RAM
  useEffect(() => {
    prewarmStudioTurbo();
  }, [mode, textPrompt]);

  // Blocs de textes courts prêts à être copiés en 1 clic pour Canva
  const kitCopyBlocks = useMemo(() => {
    const rawSubject = flowProductDescription.trim() || textPrompt.trim() || storeName || 'notre offre exclusive';
    const cleanSubject = rawSubject.length > 55 ? rawSubject.slice(0, 52) + '...' : rawSubject;

    return [
      {
        id: 'hook',
        label: 'Titre Accrocheur (3 premières secondes)',
        badge: '0-3 SEC',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        description: 'Captez immédiatement l\'attention et stoppez le scroll',
        text: `🔥 STOP ! Découvrez la solution qui révolutionne ${cleanSubject} dès aujourd'hui.`
      },
      {
        id: 'pitch',
        label: 'Sous-titre Argumentaire',
        badge: 'BÉNÉFICES',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        description: 'Les 3 arguments clés pour convaincre et rassurer',
        text: `✨ 1. Efficacité immédiate prouvée • 2. Finition et qualité professionnelle • 3. Garantie sérénité totale avec assistance dédiée.`
      },
      {
        id: 'cta',
        label: 'Appel à l\'action (Lien Funnel / Webinaire)',
        badge: 'CONVERSION',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'L\'incitation irrésistible à cliquer et passer à l\'action',
        text: `👉 Cliquez ci-dessous pour réserver votre accès exclusif et profiter de l'offre spéciale limitée ! 🚀`
      }
    ];
  }, [flowProductDescription, textPrompt, storeName]);

  // Configuration de l'URL du backend AWS Lambda (URLs externes uniquement, jamais de route locale /api/...)
  const [showConfig, setShowConfig] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nana_generator_backend_url');
      if (saved && (saved.startsWith('https://') || saved.startsWith('http://')) && !saved.includes('/api/') && !saved.includes('localhost')) {
        return saved.trim();
      }
      localStorage.setItem('nana_generator_backend_url', OFFICIAL_AWS_LAMBDA_URL);
    }
    return OFFICIAL_AWS_LAMBDA_URL;
  });

  // Synchronisation si initialPrompt change
  useEffect(() => {
    if (initialPrompt) {
      setTextPrompt(initialPrompt);
      setFlowProductDescription(initialPrompt);
      setVideoDescription(initialPrompt);
    }
  }, [initialPrompt]);

  // Synchronisation si initialMode change
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Sauvegarde sécurisée de l'URL backend si modifiée
  const handleSaveBackendUrl = (url: string) => {
    const trimmed = url.trim();
    setBackendUrl(trimmed);
    if (typeof window !== 'undefined') {
      if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && !trimmed.includes('/api/')) {
        localStorage.setItem('nana_generator_backend_url', trimmed);
      } else if (!trimmed || trimmed.includes('/api/')) {
        localStorage.removeItem('nana_generator_backend_url');
      }
    }
  };

  // Gestion de la sélection de fichier image pour la vidéo directe
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    setVideoFile(file);
    setErrorMessage(null);

    // Conversion en Base64 via FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setVideoImageBase64(result);
      setVideoImagePreview(result);
    };
    reader.onerror = () => {
      setErrorMessage("Erreur lors de la lecture du fichier image.");
    };
    reader.readAsDataURL(file);
  };

  // Copie automatique ou manuelle dans le presse-papiers
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      return false;
    }
  };

  // =========================================================================
  // FONCTIONNALITÉ DU "STUDIO FLOW ASSISTÉ" (OPTION A - 3 CRÉDITS)
  // =========================================================================
  const handlePrepareFlowStudio = async () => {
    setErrorMessage(null);
    setInsufficientCreditsInfo(null);

    // 1. Garde-fou Hors-ligne
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setErrorMessage("Connexion requise : La préparation du Studio Flow nécessite un accès à internet.");
      playCancelSound();
      return;
    }

    // 2. Protection par Crédits (Requis : 3 crédits)
    const requiredCost = 3;
    if (credits < requiredCost) {
      playCancelSound();
      setInsufficientCreditsInfo({
        required: requiredCost,
        current: credits,
        modeLabel: 'Studio Flow Assisté'
      });
      setErrorMessage(
        `Solde insuffisant : Vous disposez de ${credits} ${credits <= 1 ? 'crédit' : 'crédits'}, mais le Studio Flow Assisté nécessite ${requiredCost} crédits.`
      );
      return;
    }

    const description = videoDescription?.trim() || flowProductDescription?.trim() || textPrompt?.trim();
    if (!description && !videoImageBase64) {
      setErrorMessage("Veuillez saisir la description ou le script de votre vidéo avant de lancer le studio.");
      playCancelSound();
      return;
    }

    playTapBeep();
    setIsPreparingFlow(true);
    await activateTurboWakeLock();

    try {
      // 3. Déduction stricte de 3 crédits dans Firebase Firestore
      const debitRes = await deductUserCredits(effectiveUid, 3, {
        type: 'video_flow',
        description: `Studio Flow Assisté (${flowStyle})`
      });

      if (debitRes.success) {
        setCredits(debitRes.newBalance);
      }

      // 4. Instructions professionnelles de Caméra et Lumière selon le style choisi
      let cameraDetails = '';
      let lightDetails = '';
      let styleTitle = '';

      if (flowStyle === 'pub') {
        styleTitle = 'Format Publicité Commerciale Produit (Packshot Studio)';
        cameraDetails = 'Travelling avant lent et fluide (dolly-in à vitesse constante), rotation panoramique circulaire à 360 degrés mettant en valeur chaque angle, cadrage serré macro sur les finitions, détails ultra-nets.';
        lightDetails = 'Éclairage studio publicitaire 3 points haute intensité, boîte à lumière latérale douce (softbox), halo lumineux arrière subtil pour découper la silhouette, reflets spéculaires maîtrisés, colorimétrie commerciale vibrante et flatteuse.';
      } else if (flowStyle === 'cours') {
        styleTitle = 'Format Présentation Cours & Pédagogie';
        cameraDetails = 'Plan moyen stable (medium shot), légers zooms progressifs lents (slow push-in), cadrage dynamique et centré sur l’intervenant ou le contenu explicatif, transitions fluides et posées.';
        lightDetails = 'Lumière douce et homogène de type studio de diffusion (broadcast 5500K naturelle), éclairage d’ambiance valorisant, ombres adoucies pour un rendu reposant et clair, lisibilité visuelle maximale.';
      } else {
        styleTitle = 'Format Cinéma & Séquence Immersive';
        cameraDetails = 'Travelling cinématographique avant fluide, format grand angle immersif 16:9, profondeur de champ ultra-courte (f/1.4 avec bokeh artistique arrière), mouvements de caméra stabilisés sur dolly cinématique.';
        lightDetails = 'Éclairage clair-obscur dramatique cinématographique, contre-jour néon chaud et volumétrique, étalonnage couleur cinéma 4K haute fidélité (teal & orange subtil), contrastes saisissants et ambiance captivante.';
      }

      // 5. Construction directe du prompt vidéo ultra-détaillé optimisé pour Google Flow (ZÉRO appel /api/...)
      const optimizedPromptText = `🎬 Prompt Vidéo Cinématique Haute Définition (${styleTitle}) :\n` +
        `Description du Sujet : ${description}\n\n` +
        `🎥 Mouvements de Caméra : ${cameraDetails}\n\n` +
        `💡 Éclairage & Ambiance Lumineuse : ${lightDetails}\n\n` +
        `✨ Spécifications Rendu : Résolution 4K Ultra-HD, 60fps, photoréaliste, netteté cinématographique, textures riches, immersion commerciale immédiate.`;

      setFlowOptimizedPrompt(optimizedPromptText);
      setIsFlowPrepared(true);

      // 6. Copie automatique en 1 clic dans le presse-papiers
      await copyToClipboard(optimizedPromptText);
      setIsFlowCopied(true);
      setTimeout(() => setIsFlowCopied(false), 3500);

      // 7. Notification toast confirmant la déduction des 3 crédits et la disponibilité du prompt
      showGoogleFlowToast({
        title: '✨ Prompt Vidéo Prêt & Copié !',
        message: '3 crédits déduits. Cliquez sur « Ouvrir le Studio Flow » à droite pour lancer le studio.',
        type: 'success',
        duration: 5000,
        promptCopied: optimizedPromptText,
        productName: description
      });

      playValidationBeep();
    } catch (err: any) {
      playCancelSound();
      setErrorMessage(err?.message || "Erreur lors de la préparation du Studio Flow.");
    } finally {
      setIsPreparingFlow(false);
      await releaseTurboWakeLock();
    }
  };

  const handleCopyFlowPrompt = async () => {
    if (!flowOptimizedPrompt) return;
    const copied = await copyToClipboard(flowOptimizedPrompt);
    if (copied) {
      setIsFlowCopied(true);
      playValidationBeep();
      setTimeout(() => setIsFlowCopied(false), 2500);
    }
  };

  /**
   * Téléchargement direct d'un média éphémère (Replicate) vers le stockage local de l'appareil
   * Intercepte le clic, convertit en Blob et déclenche l'enregistrement local (0 envoi sur S3).
   */
  const handleDirectDownload = async (mediaUrl: string, extension: 'png' | 'mp4' | 'webp') => {
    if (!mediaUrl) return;
    try {
      setIsDownloadingMedia(true);
      playTapBeep();

      const filename = `nanagenerateur-${Date.now()}.${extension}`;

      try {
        const response = await fetch(mediaUrl, { mode: 'cors' });
        if (!response.ok) throw new Error("Échec HTTP lors du téléchargement");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (fetchErr) {
        // Repli direct par balise ancre avec nom de fichier si CORS restreint
        const a = document.createElement('a');
        a.href = mediaUrl;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      playValidationBeep();
    } catch (err: any) {
      playCancelSound();
      console.warn('[DOWNLOAD ERROR]', err);
    } finally {
      setIsDownloadingMedia(false);
    }
  };

  // =========================================================================
  // STUDIO DE MONTAGE & CANVA SPLIT-SCREEN (CONTOURNEMENT IFRAME & POST-PROD)
  // =========================================================================

  // Ouverture de Canva en plein écran (Lien court direct vers l'éditeur de montage vidéo)
  const handleOpenCanvaSplitScreen = () => {
    playTapBeep();
    setShowMontageKit(true);

    // Lien court et direct officiel vers l'éditeur de montage vidéo Canva (0 page d'erreur)
    const canvaUrl = 'https://www.canva.com/video-editor/';

    // Support natif mobile si sous Capacitor/Cordova
    const isCapacitor = typeof window !== 'undefined' && (window as any)?.Capacitor?.isNativePlatform?.();
    if (isCapacitor) {
      openFlowInApp(canvaUrl);
      return;
    }

    try {
      const win = window.open(canvaUrl, '_blank');
      if (win) {
        win.focus();
      } else {
        window.open(canvaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.warn('Erreur ouverture Canva :', e);
      window.open(canvaUrl, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => {
      montageKitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // Ouverture de Google Flow en plein écran
  const handleOpenGoogleFlowWide = () => {
    playTapBeep();
    const flowUrl = FLOW_STUDIO_URL;
    const screenW = typeof window !== 'undefined' ? (window.screen.availWidth || window.innerWidth) : 1920;
    const screenH = typeof window !== 'undefined' ? (window.screen.availHeight || window.innerHeight) : 1080;
    const windowFeatures = `width=${screenW},height=${screenH},left=0,top=0,resizable=yes,scrollbars=yes`;

    // Support natif mobile si sous Capacitor/Cordova
    const isCapacitor = typeof window !== 'undefined' && (window as any)?.Capacitor?.isNativePlatform?.();
    if (isCapacitor) {
      openFlowInApp(flowUrl);
      return;
    }

    try {
      const win = window.open(flowUrl, '_blank', windowFeatures);
      if (win) {
        win.focus();
      } else {
        openFlowInApp(flowUrl);
      }
    } catch (e) {
      console.warn('Erreur ouverture plein écran Google Flow :', e);
      openFlowInApp(flowUrl);
    }
  };

  // Ouverture de 123apps (Découpeur audio & vidéo) en plein écran
  const handleOpen123Apps = () => {
    playTapBeep();
    const appsUrl = 'https://123apps.com/fr/';
    const screenW = typeof window !== 'undefined' ? (window.screen.availWidth || window.innerWidth) : 1920;
    const screenH = typeof window !== 'undefined' ? (window.screen.availHeight || window.innerHeight) : 1080;
    const windowFeatures = `width=${screenW},height=${screenH},left=0,top=0,resizable=yes,scrollbars=yes`;

    try {
      const win = window.open(appsUrl, '_blank', windowFeatures);
      if (win) {
        win.focus();
      } else {
        window.open(appsUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.warn('Erreur ouverture plein écran 123apps :', e);
      window.open(appsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Copie en 1 clic des blocs marketing du Kit de Montage
  const handleCopyKitBlock = async (id: string, text: string) => {
    const copied = await copyToClipboard(text);
    if (copied) {
      setCopiedKitBlock(id);
      playValidationBeep();
      setTimeout(() => setCopiedKitBlock(null), 2500);
    }
  };

  // Redirection fluide vers le Funnel Builder (/checkout) ou l'espace Formateur (/courses/create)
  const handleNavigateToIntegration = (target: 'funnel' | 'course') => {
    playTapBeep();
    setIsRedirectModalOpen(false);
    if (onClose) onClose();
    if (typeof window !== 'undefined') {
      if (target === 'funnel') {
        window.location.href = '/checkout';
      } else {
        window.location.href = '/courses/create';
      }
    }
  };

  // =========================================================================
  // PANNEAU "KIT DE MONTAGE IA" (POST-PRODUCTION CANVA SPLIT-SCREEN)
  // =========================================================================
  const renderMontageKit = () => (
    <div 
      ref={montageKitRef}
      className="mt-4 p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border-2 border-indigo-500/40 shadow-2xl space-y-4 animate-in fade-in duration-200"
    >
      {/* En-tête du Kit avec statut Split-Screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Film className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white tracking-tight">
                Studio de Montage IA
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold">
                Post-Production
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Kit synchronisé avec Canva (fenêtre flottante à droite de votre écran)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Studio Externe Prêt</span>
          </div>

          <button
            type="button"
            onClick={handleOpenCanvaSplitScreen}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-sm"
            title="Ouvrir Canva Studio (1280x850)"
          >
            <Film className="w-3 h-3 text-amber-300" />
            <span>Canva (1280x850)</span>
          </button>

          <button
            type="button"
            onClick={handleOpen123Apps}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer border border-slate-700"
            title="Ouvrir 123apps Studio (1280x850)"
          >
            <Layers className="w-3 h-3 text-teal-300" />
            <span>123apps (1280x850)</span>
          </button>
        </div>
      </div>

      {/* 1. BOUTON DE TÉLÉCHARGEMENT DE LA VIDÉO GÉNÉRÉE POUR LA GLISSER DANS CANVA */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Fichier Vidéo pour le Montage Canva & 123apps :</span>
        </label>

        {generatedVideoUrl ? (
          <a
            href={generatedVideoUrl}
            download="video-montage-nana.mp4"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 transition active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>📥 Télécharger la vidéo générée pour la glisser dans Canva / 123apps</span>
          </a>
        ) : (
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Film className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-[11px]">
                {videoSubMode === 'flow'
                  ? "Téléchargez votre vidéo MP4 depuis la fenêtre Flow Studio, puis glissez-la directement dans Canva ou 123apps."
                  : "Générez d'abord votre vidéo directe ci-dessus pour la télécharger et la glisser en 1 clic dans Canva ou 123apps."}
              </span>
            </div>
            {videoImagePreview && (
              <a
                href={videoImagePreview}
                download="image-source-canva.png"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1.5 shrink-0 transition"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>Télécharger l'image source</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. 3 BLOCS DE TEXTES COURTS PRÊTS À ÊTRE COPIÉS EN 1 CLIC (GRILLE AÉRÉE 3 COLONNES) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-indigo-400" />
            <span>Textes Publicitaires Prêts à Coller (1 Clic) :</span>
          </label>
          <span className="text-[10px] text-slate-400">À coller sur vos calques de texte Canva</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {kitCopyBlocks.map((block) => (
            <div 
              key={block.id} 
              className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-2 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${block.badgeColor}`}>
                    {block.badge}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyKitBlock(block.id, block.text)}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm ${
                      copiedKitBlock === block.id
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {copiedKitBlock === block.id ? (
                      <>
                        <Check className="w-3 h-3 text-slate-950" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-indigo-400" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-extrabold text-xs text-white">
                  {block.label}
                </div>
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-xl text-slate-200 text-xs font-sans leading-relaxed border border-slate-800 flex-1">
                {block.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. BIBLIOTHÈQUE AUDIO 'ZÉRO MÉMOIRE' (100% EXTERNE - GRILLE AÉRÉE 2 COLONNES) */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-emerald-400" />
            <h4 className="font-black text-xs text-white">
              🎵 Musiques & Effets Publicitaires
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">
            CDN Externe • Lecteur HTML5 Standard (preload="none") • Aucun stockage local
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {MONTAGE_AUDIO_LIBRARY.map((track) => (
            <div 
              key={track.id}
              className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-700 transition"
            >
              <div className="space-y-0.5 min-w-[160px]">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9.5px] font-extrabold border border-indigo-500/30">
                    {track.badge}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">{track.duration}</span>
                </div>
                <div className="font-bold text-xs text-slate-200">
                  {track.title}
                </div>
                <div className="text-[10px] text-slate-500">
                  {track.genre}
                </div>
              </div>

              {/* Lecteur HTML5 Standard Zéro Mémoire : preload="none" strictly */}
              <div className="flex-1 max-w-xs w-full">
                <audio 
                  controls 
                  preload="none" 
                  className="w-full h-8 outline-none rounded-lg"
                  src={track.url}
                >
                  Votre navigateur ne supporte pas l'élément audio.
                </audio>
              </div>

              {/* Bouton de téléchargement direct pour l'importer dans Canva */}
              <a
                href={track.url}
                download={`${track.id}_${track.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.mp3`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer border border-slate-700/60"
                title="Télécharger cette piste audio pour l'insérer dans Canva ou 123apps"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Télécharger</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 4. PASSERELLE VERS FUNNEL / FORMATION */}
      <div className="pt-2 border-t border-slate-800 space-y-2.5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-xs">
                  Passerelle vers Funnel / Formation
                </h4>
                <p className="text-[11px] text-slate-400">
                  Déployez votre vidéo finalisée directement dans votre page de vente ou votre cours
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleNavigateToIntegration('funnel')}
              className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <span>🎯 Intégrer dans mon Funnel</span>
                </div>
                <p className="text-[10px] text-slate-400">Smart Checkout & Page d'offre</p>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigateToIntegration('course')}
              className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                  <span>🎓 Intégrer dans mon Cours</span>
                </div>
                <p className="text-[10px] text-slate-400">Espace Formateur & Académie</p>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
            </button>
          </div>

          {/* Bouton global express */}
          <button
            type="button"
            onClick={() => setIsRedirectModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Intégrer dans mon Funnel / Mon Cours</span>
          </button>
        </div>
      </div>

    </div>
  );

  // Nettoyage automatique du timer d'image au démontage
  useEffect(() => {
    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
      }
    };
  }, []);

  // Validation d'affichage de la balise <img>
  const handleImageLoadSuccess = () => {
    if (imageTimeoutRef.current) {
      clearTimeout(imageTimeoutRef.current);
      imageTimeoutRef.current = null;
    }
    setIsImageLoading(false);
  };

  const handleImageLoadError = () => {
    if (imageTimeoutRef.current) {
      clearTimeout(imageTimeoutRef.current);
      imageTimeoutRef.current = null;
    }
    setIsImageLoading(false);
    setErrorMessage("Impossible d'afficher l'aperçu de l'image retournée par le backend.");
  };

  // =========================================================================
  // SOUMISSION PRINCIPALE (REPLICATE VIA BACKEND AWS LAMBDA)
  // Centralise 100% des générations : Texte (1 cr), Image (2 cr), Vidéo Directe (20 cr)
  // Option Google Flow (3 cr) conservée
  // =========================================================================

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInsufficientCreditsInfo(null);

    // Si on est en mode vidéo avec l'Option A (Flow), on délègue au handler Flow (3 crédits)
    if (mode === 'video' && videoSubMode === 'flow') {
      return handlePrepareFlowStudio();
    }

    // Garde-fou Hors-ligne
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setErrorMessage("Connexion requise : La génération multimédia Cloud nécessite un accès à internet.");
      playCancelSound();
      return;
    }

    // Coût selon le barème strict :
    // Texte = 1 crédit, Image = 2 crédits, Vidéo Directe = 20 crédits
    const requiredCost = mode === 'text' 
      ? GENERATOR_CREDIT_COSTS.text 
      : mode === 'image' 
      ? GENERATOR_CREDIT_COSTS.image 
      : GENERATOR_CREDIT_COSTS.video;

    const modeLabel = mode === 'text' ? 'Texte' : mode === 'image' ? 'Image' : 'Vidéo Directe Cloud';

    // VÉRIFICATION DU SOLDE DE CRÉDITS AVANT D'ENVOYER LA REQUÊTE
    if (credits < requiredCost) {
      playCancelSound();
      setInsufficientCreditsInfo({
        required: requiredCost,
        current: credits,
        modeLabel,
      });
      setErrorMessage(
        `Solde insuffisant : Vous disposez de ${credits} ${credits <= 1 ? 'crédit' : 'crédits'}, mais la génération de ${modeLabel.toLowerCase()} nécessite ${requiredCost} crédits.`
      );
      return;
    }

    // Validation des entrées selon le mode
    const userPrompt = mode === 'video'
      ? (videoDescription?.trim() || flowProductDescription?.trim() || textPrompt?.trim() || '')
      : textPrompt.trim();
    const optionalImageUrl = videoImageBase64 || undefined;

    if (mode === 'text') {
      if (!userPrompt) {
        setErrorMessage("Veuillez saisir votre demande pour l'Assistant Texte.");
        return;
      }
    } else if (mode === 'image') {
      if (!userPrompt) {
        setErrorMessage("Veuillez saisir la description de l'image à créer.");
        return;
      }
    } else if (mode === 'video' && videoSubMode === 'direct') {
      if (!userPrompt && !optionalImageUrl) {
        setErrorMessage("Veuillez saisir une description / script ou importer une image pour générer la vidéo.");
        return;
      }
    }

    // =========================================================================
    // 1. MODE IMAGE : 100% IA RÉELLE VIA REPLICATE (AWS LAMBDA)
    // Envoie la requête POST vers l'URL AWS Lambda configurée (black-forest-labs/flux-schnell).
    // Récupère data.output / data.imageUrl / data.url et l'affiche dans l'aperçu.
    // Débite les 2 crédits uniquement quand la vraie image IA est reçue.
    // Affiche le vrai message d'erreur de Lambda en cas d'échec, sans aucun Unsplash.
    // =========================================================================
    if (mode === 'image') {
      playTapBeep();
      setIsLoading(true);
      setIsImageLoading(true);
      setErrorMessage(null);
      setGeneratedImageUrl('');

      try {
        const lambdaUrl = backendUrl?.trim() || LAMBDA_URL || OFFICIAL_AWS_LAMBDA_URL;

        if (!lambdaUrl || (!lambdaUrl.startsWith('https://') && !lambdaUrl.startsWith('http://'))) {
          throw new Error("L'URL de votre serveur AWS Lambda n'est pas configurée. Veuillez renseigner l'URL externe HTTPS dans les paramètres ⚙️.");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 secondes pour Replicate Flux

        const payload = {
          type: "image",
          prompt: userPrompt,
          ...(optionalImageUrl ? { image: optionalImageUrl } : {})
        };

        let response: Response;
        try {
          response = await callAwsLambdaUnified(payload, controller.signal);
        } catch (networkErr: any) {
          if (networkErr?.name === 'AbortError') {
            throw new Error("Le serveur AWS Lambda a mis plus de 90 secondes à répondre. Veuillez réessayer.");
          }
          throw new Error(`Échec de connexion au serveur AWS Lambda : ${networkErr?.message || 'Erreur réseau ou restriction CORS'}`);
        } finally {
          clearTimeout(timeoutId);
        }

        // Si Lambda a renvoyé un code d'erreur HTTP (ex: 502 Bad Gateway, 500, 400, etc.)
        if (!response.ok) {
          const rawError = await response.text().catch(() => '');
          let messageFromLambda = '';
          try {
            const parsed = JSON.parse(rawError);
            messageFromLambda = parsed.error || parsed.message || parsed.detail || '';
          } catch {
            messageFromLambda = rawError.trim();
          }
          throw new Error(
            messageFromLambda
              ? `Erreur AWS Lambda (${response.status}) : ${messageFromLambda}`
              : `Erreur serveur AWS Lambda (${response.status} : ${response.statusText || 'Erreur interne'})`
          );
        }

        // Vérification stricte du Content-Type JSON
        let data: any;
        try {
          data = await response.json();
        } catch {
          throw new Error("Réponse non-JSON reçue du serveur AWS Lambda.");
        }

        // Gestion explicite de data.error
        if (data.error) {
          const errDetail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          throw new Error(`Erreur Replicate / AWS Lambda : ${errDetail}`);
        }

        // Lecture et extraction du résultat Replicate (data.output)
        const rawOutput = data.output;
        if (!rawOutput) {
          throw new Error("Aucun résultat d'image retourné par le serveur Lambda (data.output est vide ou manquant).");
        }

        const imageUrl = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
          const receivedPreview = JSON.stringify(data).slice(0, 250);
          throw new Error(`Aucune image IA valide n'a été retournée par Replicate dans data.output. Réponse reçue : ${receivedPreview}`);
        }

        // Affichage direct de la vraie image IA dans le grand écran d'aperçu de droite
        setGeneratedImageUrl(imageUrl);
        setIsImageLoading(false);
        isImageDebitedRef.current = true;

        // Débite les 2 crédits UNIQUEMENT si data.output est bien reçu et non nul
        try {
          const debit = await deductUserCredits(effectiveUid, GENERATOR_CREDIT_COSTS.image, {
            type: 'image',
            description: "Génération Image IA (Flux Schnell Replicate)"
          });
          if (debit.success) setCredits(debit.newBalance);
        } catch (debitErr) {
          console.warn('[CREDITS] Notice débit image :', debitErr);
        }

        playValidationBeep();
      } catch (imgErr: any) {
        playCancelSound();
        setIsImageLoading(false);
        setGeneratedImageUrl('');
        setErrorMessage(imgErr?.message || "Impossible de générer l'image.");
      } finally {
        setIsLoading(false);
        purgeStudioTurboRam();
      }
      return;
    }

    // =========================================================================
    // 2. MODE TEXTE : CENTRALISÉ SUR L'AWS LAMBDA AVEC DOUBLE SECOURS
    // Envoie la requête POST à l'AWS Lambda officielle (Replicate llama-3).
    // Fais data.output.join('') si tableau ou data.output si chaîne.
    // En cas d'indisponibilité, repli direct sur Google Gemini ou moteur local.
    // =========================================================================
    if (mode === 'text') {
      playTapBeep();
      setIsLoading(true);

      try {
        let fullText = '';
        const trimmedBackendUrl = backendUrl?.trim() || LAMBDA_URL || OFFICIAL_AWS_LAMBDA_URL;

        if (trimmedBackendUrl && (trimmedBackendUrl.startsWith('https://') || trimmedBackendUrl.startsWith('http://'))) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await callAwsLambdaUnified({
              type: 'text',
              prompt: userPrompt
            }, controller.signal);

            clearTimeout(timeoutId);

            const contentType = response.headers.get("content-type") || "";
            if (response.ok && contentType.includes("application/json")) {
              const data = await response.json();
              const textOutput = Array.isArray(data?.output)
                ? data.output.join('')
                : (data?.output ?? (data?.result ?? data?.copyText ?? ''));
              if (textOutput) {
                fullText = typeof textOutput === 'string' ? textOutput.trim() : String(textOutput);
              }
            }
          } catch (lambdaErr: any) {
            console.warn('[STUDIO] Repli résilient après tentative AWS Lambda texte :', lambdaErr?.message);
          }
        }

        // B. Si pas de texte, tenter l'API Gemini configurée dans le projet
        if (!fullText) {
          const geminiApiKey = getResolvedGeminiApiKey();
          if (geminiApiKey) {
            try {
              fullText = await generateWithGeminiStudio(userPrompt, geminiApiKey);
            } catch (geminiErr: any) {
              console.warn('[STUDIO] Repli après tentative Gemini direct :', geminiErr?.message);
            }
          }
        }

        // C. Si toujours pas de texte, moteur rédactionnel local ultra-rapide et résilient
        if (!fullText) {
          fullText = generateLocalStudioCopy(userPrompt, storeName);
        }

        if (!fullText) {
          throw new Error("Le texte généré est vide.");
        }

        setGeneratedText(fullText);

        // Débite 1 crédit dans Firebase
        try {
          const debit = await deductUserCredits(effectiveUid, GENERATOR_CREDIT_COSTS.text, {
            type: 'text',
            description: "Génération Texte IA Studio"
          });
          if (debit.success) setCredits(debit.newBalance);
        } catch (debitErr) {
          console.warn('[CREDITS] Notice débit texte :', debitErr);
        }

        playValidationBeep();
      } catch (textErr: any) {
        playCancelSound();
        setErrorMessage(textErr?.message || "Une erreur est survenue lors de la rédaction du texte.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // =========================================================================
    // 3. MODE VIDÉO DIRECTE : CENTRALISÉ SUR L'AWS LAMBDA
    // Envoie la requête POST à l'AWS Lambda officielle (Replicate Vidéo).
    // Si data.output est retourné, affiche la vidéo dans le lecteur et débite 20 crédits.
    // =========================================================================
    if (mode === 'video' && videoSubMode === 'direct') {
      playTapBeep();
      setIsLoading(true);
      setVideoLoadingMessage("Création de la vidéo IA en cours sur Replicate... (cela prend environ 1 à 2 minutes)");

      try {
        const videoPrompt = userPrompt;
        const LAMBDA_ENDPOINT = OFFICIAL_AWS_LAMBDA_URL;

        // 1. Premier appel pour lancer la génération vidéo sur AWS Lambda (Replicate & S3)
        const res = await fetch(LAMBDA_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify({ type: "video", prompt: videoPrompt })
        });

        let data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Erreur retournée par Replicate");
        }

        // 2. Si la vidéo est encore en calcul (starting / processing), on vérifie toutes les 4 secondes
        let tries = 0;
        while (
          !data.output &&
          !data.videoUrl &&
          !data.url &&
          data.id &&
          (data.status === "starting" || data.status === "processing") &&
          tries < 45
        ) {
          setVideoLoadingMessage(`Création de la vidéo IA en cours sur Replicate... (${(tries + 1) * 4}s / ~1-2 min)`);
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const pollRes = await fetch(LAMBDA_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify({ type: "status", id: data.id })
          });
          data = await pollRes.json();
          if (data.error || data.status === "failed") {
            throw new Error(data.error || "La génération vidéo a échoué sur Replicate");
          }
          tries++;
        }

        // 3. Récupération de l'URL finale
        const finalVideoUrl = Array.isArray(data.output)
          ? data.output[0]
          : (data.output || data.videoUrl || data.url);

        if (!finalVideoUrl || typeof finalVideoUrl !== "string") {
          throw new Error(`Statut Replicate: ${data.status || "inconnu"} - Détail: ${JSON.stringify(data)}`);
        }

        setGeneratedVideoUrl(finalVideoUrl);

        // Débite 20 crédits dans Firebase UNIQUEMENT si la vidéo est bien reçue
        try {
          const debit = await deductUserCredits(effectiveUid, GENERATOR_CREDIT_COSTS.video, {
            type: 'video',
            description: "Génération Vidéo Directe Haute Définition Cloud"
          });
          if (debit.success) setCredits(debit.newBalance);
        } catch (debitErr) {
          console.warn('[CREDITS] Notice débit vidéo directe :', debitErr);
        }

        playValidationBeep();
      } catch (vidErr: any) {
        playCancelSound();
        setErrorMessage(vidErr?.message || "Une erreur est survenue lors de la création vidéo.");
      } finally {
        setIsLoading(false);
        setVideoLoadingMessage(null);
        purgeStudioTurboRam();
      }
      return;
    }
  };

  const handleCopyText = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    playValidationBeep();
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (isModal && !isOpen) return null;

  const isGenerating = isLoading || isImageLoading || isPreparingFlow;

  const hasResultForCurrentMode = Boolean(
    (mode === 'text' && generatedText) ||
    (mode === 'image' && generatedImageUrl && !isImageLoading) ||
    (mode === 'video' && videoSubMode === 'direct' && generatedVideoUrl) ||
    (mode === 'video' && videoSubMode === 'flow' && isFlowPrepared && flowOptimizedPrompt)
  );

  const content = (
    <div className="w-full h-full flex-1 bg-[#070b14] relative flex flex-col text-slate-100 overflow-hidden select-none">
      
      {/* 1. EN-TÊTE PROFESSIONNEL EN PLEIN ÉCRAN AVEC SOLDE EN TEMPS RÉEL */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-3 z-20">
        <div className="flex items-center gap-3">
          {/* Bouton Quitter le Studio */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-2 font-bold text-xs transition cursor-pointer border border-slate-700/60 shadow-sm"
              title="Quitter le Studio"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Studio de Création
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Plein Écran
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Génération professionnelle multi-supports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* BADGE ÉLÉGANT DU SOLDE EN TEMPS RÉEL + BOUTON RECHARGER */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-inner">
            <Coins className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs font-black text-white whitespace-nowrap">
              Solde : <span className="text-amber-400 font-mono text-sm">{credits}</span> {credits <= 1 ? 'Crédit' : 'Crédits'}
            </span>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsRechargeModalOpen(true);
                setIsPaymentGatewayActive(false);
              }}
              className="ml-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
              title="Recharger mon solde de crédits"
            >
              <span>+ Recharger</span>
            </button>
          </div>

          {/* Bouton réglage discret de l'URL */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              showConfig 
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Paramètres de connexion"
          >
            <Settings className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Fermer le Studio"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Toast de succès de rechargement */}
      {rechargeSuccessToast && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-5 py-2.5 text-xs text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{rechargeSuccessToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRechargeSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Configuration discrète de l'adresse du backend */}
      {showConfig && (
        <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-3 text-xs flex flex-col sm:flex-row items-center gap-2">
          <span className="text-slate-400 font-semibold shrink-0">Adresse du service :</span>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => handleSaveBackendUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 outline-none"
          />
        </div>
      )}

      {/* 2. CORPS DU STUDIO : AMÉNAGEMENT EN 2 GRANDES ZONES CÔTE À CÔTE (GRID DESKTOP PLEIN ÉCRAN TOTAL) */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto lg:overflow-hidden text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full h-full min-h-0">
          
          {/* ========================================================================= */}
          {/* À GAUCHE (40% de la largeur - Le Moteur de commande)                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-900/40">
            
            {/* 1. ONGLETS DE COMMANDE (Assistant Texte, Création d'Image, Animation Vidéo) */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              {/* Onglet 1 : Assistant Texte (1 crédit) */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setMode('text');
                  setErrorMessage(null);
                  setInsufficientCreditsInfo(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  mode === 'text'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Texte (1)</span>
              </button>

              {/* Onglet 2 : Création d'Image (2 crédits) */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setMode('image');
                  setErrorMessage(null);
                  setInsufficientCreditsInfo(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  mode === 'image'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Image (2)</span>
              </button>

              {/* Onglet 3 : Animation Vidéo */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setMode('video');
                  setErrorMessage(null);
                  setInsufficientCreditsInfo(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  mode === 'video'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Vidéo</span>
              </button>
            </div>

            {/* BANNIÈRE EN CAS DE SOLDE INSUFFISANT */}
            {insufficientCreditsInfo && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-xs text-amber-300">
                      Solde insuffisant ({insufficientCreditsInfo.modeLabel})
                    </p>
                    <p className="text-slate-300 text-[11px] leading-tight">
                      Solde : <strong>{insufficientCreditsInfo.current}</strong> • Requis : <strong>{insufficientCreditsInfo.required} crédits</strong>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsRechargeModalOpen(true);
                    setIsPaymentGatewayActive(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                  <span>Recharger mon solde via Mobile Money</span>
                </button>
              </div>
            )}

            {/* Messages d'erreur */}
            {errorMessage && !insufficientCreditsInfo && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* 2. ZONE DE SAISIE DE DESCRIPTION PLUS HAUTE ET CONFORTABLE */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* MODE 1 : ASSISTANT TEXTE */}
              {mode === 'text' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/20 shadow-inner">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Sujet ou description du texte</span>
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTextChannel('DESCRIPTION')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          textChannel === 'DESCRIPTION'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Détaillé
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextChannel('SOCIAL')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          textChannel === 'SOCIAL'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Réseaux
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextChannel('MESSAGE')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          textChannel === 'MESSAGE'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Message
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Ex : Rédiger une présentation attractive et percutante pour notre nouvelle collection de produits exclusive, avec arguments de vente et appel à l'action..."
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none resize-none transition leading-relaxed shadow-inner min-h-[190px]"
                  />
                </div>
              )}

              {/* MODE 2 : CRÉATION D'IMAGE */}
              {mode === 'image' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-purple-500/20 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span>Description de l'image à créer</span>
                    </label>
                    <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/30">
                      Modèle Flux HD
                    </span>
                  </div>

                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Ex : Flacon de parfum luxueux sur socle en marbre noir, fines gouttelettes d'eau, éclairage studio or et néon subtil, reflets spéculaires parfaits, rendu 4K photoréaliste haute résolution..."
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 outline-none resize-none transition leading-relaxed shadow-inner min-h-[190px]"
                  />
                </div>
              )}

              {/* MODE 3 : ANIMATION VIDÉO */}
              {mode === 'video' && (
                <div className="space-y-4">
                  {/* Sélecteur de mode vidéo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setVideoSubMode('flow');
                        setInsufficientCreditsInfo(null);
                        setErrorMessage(null);
                      }}
                      className={`p-3 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer relative ${
                        videoSubMode === 'flow'
                          ? 'bg-gradient-to-br from-indigo-950/90 via-purple-950/60 to-slate-900 border-2 border-indigo-500 shadow-md'
                          : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Studio Flow</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9.5px] font-black">
                          3 crédits
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        50 crédits/jour offerts sur Flow
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setVideoSubMode('direct');
                        setInsufficientCreditsInfo(null);
                        setErrorMessage(null);
                      }}
                      className={`p-3 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer relative ${
                        videoSubMode === 'direct'
                          ? 'bg-gradient-to-br from-rose-950/90 via-amber-950/60 to-slate-900 border-2 border-rose-500 shadow-md'
                          : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-white flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-rose-400" />
                          <span>Vidéo Directe</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[9.5px] font-black">
                          20 crédits
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Animation directe via serveur Cloud
                      </p>
                    </button>
                  </div>

                  {/* CHAMP TEXTE / SCRIPT OBLIGATOIRE DANS L'ONGLET VIDÉO */}
                  <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/30 shadow-inner">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>Description / Script de la vidéo (Collez ou écrivez votre texte ici)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/30">
                        {videoSubMode === 'flow' ? 'Mode Flow 4K' : 'Mode Direct Cloud'}
                      </span>
                    </div>

                    <textarea
                      value={videoDescription}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVideoDescription(val);
                        setFlowProductDescription(val);
                        setTextPrompt(val);
                      }}
                      placeholder="Collez ou écrivez votre texte ici. Ex : Spot publicitaire cinématique 4K présentant le produit sous plusieurs angles, travelling fluide avant, éclairage studio or et néon subtil, ambiance dynamique et haute conversion..."
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none resize-none transition leading-relaxed shadow-inner min-h-[140px]"
                    />

                    {/* Styles rapides pour Google Flow */}
                    {videoSubMode === 'flow' && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Film className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Ambiance :</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { playTapBeep(); setFlowStyle('pub'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              flowStyle === 'pub'
                                ? 'bg-indigo-600 text-white shadow-sm border border-indigo-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Pub Vente
                          </button>
                          <button
                            type="button"
                            onClick={() => { playTapBeep(); setFlowStyle('cours'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              flowStyle === 'cours'
                                ? 'bg-purple-600 text-white shadow-sm border border-purple-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Cours LMS
                          </button>
                          <button
                            type="button"
                            onClick={() => { playTapBeep(); setFlowStyle('cinema'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              flowStyle === 'cinema'
                                ? 'bg-rose-600 text-white shadow-sm border border-rose-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Cinématique
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option A info : Flow Studio 50 crédits offerts */}
                  {videoSubMode === 'flow' && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-[11px] text-indigo-300 flex items-center gap-2.5 shadow-xs">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                      <span>Flow Studio vous alloue <strong>50 crédits gratuits chaque jour</strong> pour créer et monter vos vidéos.</span>
                    </div>
                  )}

                  {/* Option B : Sélectionner l'image source (Optionnelle : Texte seul OU Texte + Image) */}
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-rose-500/20 shadow-inner">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                        <Video className="w-4 h-4 text-rose-400" />
                        <span>Image source à animer (Facultatif : Texte seul OU Texte + Image)</span>
                      </label>
                      {videoImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setVideoImageBase64('');
                            setVideoImagePreview('');
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                        >
                          Supprimer l'image
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="nana-video-file-input"
                    />

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                        videoImagePreview 
                          ? 'border-rose-500/50 bg-rose-500/5 hover:border-rose-400' 
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                      }`}
                    >
                      {videoImagePreview ? (
                        <div className="space-y-2 w-full max-w-xs">
                          <img 
                            src={videoImagePreview} 
                            alt="Prévisualisation" 
                            className="max-h-40 mx-auto rounded-xl object-contain shadow-md border border-slate-700"
                          />
                          <div className="flex items-center justify-center gap-2 text-rose-300 text-xs font-semibold">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Changer d'image source</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3 py-1">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-slate-200 text-xs">
                              Cliquez pour importer une image source (optionnel)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              JPG, PNG, WebP • Vous pouvez aussi générer votre vidéo à partir du texte seul
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Avertissement si hors-ligne */}
              {!isOnline && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Génération multimédia Cloud : <strong>Connexion requise</strong>.</span>
                </div>
              )}

              {/* 3. GROS BOUTON GÉNÉRER */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isGenerating || !isOnline}
                  title={!isOnline ? "Connexion requise pour la génération" : undefined}
                  className={`w-full py-4 px-5 rounded-2xl text-white font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer shadow-xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                    !isOnline
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : mode === 'text'
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:opacity-95 shadow-indigo-950/40'
                      : mode === 'image'
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:opacity-95 shadow-purple-950/40'
                      : videoSubMode === 'flow'
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 shadow-indigo-950/40'
                      : 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 hover:opacity-95 shadow-rose-950/40'
                  }`}
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      <span>Connexion requise</span>
                    </>
                  ) : isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>
                        {isImageLoading
                          ? "Génération de l'image (Flux)..."
                          : isPreparingFlow
                          ? "Création du prompt Studio (3 crédits)..."
                          : "Traitement en cours..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {mode === 'text' && "Générer le texte (1 crédit)"}
                        {mode === 'image' && "Générer l'image (2 crédits)"}
                        {mode === 'video' && videoSubMode === 'flow' && "Préparer le Prompt Studio (3 crédits)"}
                        {mode === 'video' && videoSubMode === 'direct' && "Générer la vidéo (20 crédits)"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Accès rapide au Studio de Montage externe */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Clapperboard className="w-4 h-4 text-purple-400" />
                <span className="text-[11px]">Studio de Montage externe :</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenCanvaSplitScreen}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition"
                  title="Ouvrir Canva Studio (1280x850)"
                >
                  <Film className="w-3 h-3 text-amber-300" />
                  <span>Canva</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpen123Apps}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition"
                  title="Ouvrir 123apps (1280x850)"
                >
                  <Layers className="w-3 h-3 text-teal-300" />
                  <span>123apps</span>
                </button>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* À DROITE (60% de la largeur - Grand Écran de Sortie / Résultat)          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 h-full min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col space-y-4 bg-slate-950/70">

            {/* GRAND CADRE D'AFFICHAGE VISIBLE EN PERMANENCE (min-h-[550px] w-full) */}
            <div className="w-full flex-1 min-h-[550px] bg-slate-950 rounded-2xl border border-slate-800/90 shadow-2xl relative flex flex-col justify-between overflow-hidden">
              
              {/* Barre supérieure permanente du Grand Écran */}
              <div className="bg-slate-900/95 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    isGenerating 
                      ? 'bg-amber-400 animate-ping' 
                      : hasResultForCurrentMode 
                      ? 'bg-emerald-400' 
                      : 'bg-slate-600'
                  }`} />
                  <span className="font-bold text-white text-xs tracking-wide">
                    {isGenerating
                      ? "Écran de Sortie • Traitement en cours..."
                      : hasResultForCurrentMode
                      ? `Écran de Sortie • ${mode === 'text' ? 'Texte Généré' : mode === 'image' ? 'Image HD Prête' : 'Rendu Vidéo Prêt'}`
                      : "Écran de Sortie • Aperçu permanent"}
                  </span>
                </div>

                {/* Bouton d'agrandissement plein écran */}
                {hasResultForCurrentMode && (mode === 'image' || (mode === 'video' && videoSubMode === 'direct')) && (
                  <button
                    type="button"
                    onClick={() => setIsFullScreenPreview(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-slate-700/60 shadow-sm"
                    title="Agrandir en plein écran"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Agrandir</span>
                  </button>
                )}
              </div>

              {/* Zone centrale du Grand Écran (3 états stricts) */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
                {isGenerating ? (
                  /* ÉTAT 2 : PENDANT LA GÉNÉRATION (ANIMATION DE CHARGEMENT VISUELLE) */
                  <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto animate-in fade-in duration-200">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
                      <Sparkles className="w-7 h-7 text-indigo-400 absolute animate-pulse" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <p className="font-black text-white text-base">
                        {isImageLoading
                          ? "Génération de votre image HD (Flux)..."
                          : isPreparingFlow
                          ? "Préparation du prompt cinématique & Studio Flow..."
                          : mode === 'video'
                          ? (videoLoadingMessage || "Création de la vidéo IA en cours sur Replicate... (cela prend environ 1 à 2 minutes)")
                          : "Rédaction assistée en cours..."}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {isImageLoading
                          ? "Rendu photoréaliste haute résolution sans filigrane • Veuillez patienter..."
                          : isPreparingFlow
                          ? "Formulation des instructions caméra et éclairage studio 4K..."
                          : mode === 'video'
                          ? "Suivi d'avancement automatique toutes les 4s via le Cloud NaNa..."
                          : "Traitement Cloud sécurisé en temps réel..."}
                      </p>
                    </div>
                  </div>
                ) : hasResultForCurrentMode ? (
                  /* ÉTAT 3 : APRÈS GÉNÉRATION (RÉSULTAT EN GRAND FORMAT) */
                  <div className="w-full h-full flex flex-col justify-center animate-in fade-in duration-200">
                    {/* Résultat Image */}
                    {mode === 'image' && generatedImageUrl && (
                      <div className="relative w-full flex items-center justify-center">
                        <img
                          src={generatedImageUrl}
                          alt="Création HD"
                          className="max-h-[55vh] lg:max-h-[62vh] w-full object-contain rounded-xl bg-black border border-slate-800/80 shadow-2xl transition duration-200 cursor-pointer"
                          onClick={() => setIsFullScreenPreview(true)}
                          onLoad={handleImageLoadSuccess}
                          onError={handleImageLoadError}
                        />
                      </div>
                    )}

                    {/* Résultat Vidéo Directe */}
                    {mode === 'video' && videoSubMode === 'direct' && generatedVideoUrl && (
                      <div className="relative w-full flex items-center justify-center">
                        <video
                          src={generatedVideoUrl}
                          controls
                          autoPlay
                          loop
                          className="max-h-[55vh] lg:max-h-[62vh] w-full object-contain rounded-xl bg-black border border-slate-800/80 shadow-2xl"
                        />
                      </div>
                    )}

                    {/* Résultat Vidéo Flow */}
                    {mode === 'video' && videoSubMode === 'flow' && isFlowPrepared && flowOptimizedPrompt && (
                      <div className="w-full space-y-4">
                        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 sm:p-5 shadow-xl space-y-3.5">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                              </div>
                              <div>
                                <span className="font-black text-xs text-white">Hub Flow Studio (50 crédits offerts/jour)</span>
                                <p className="text-[10.5px] text-slate-400">Ouverture en plein écran</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyFlowPrompt}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isFlowCopied ? "Copié !" : "Copier le prompt"}</span>
                            </button>
                          </div>

                          <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-200 font-mono leading-relaxed whitespace-pre-line border border-slate-800/90 max-h-36 overflow-y-auto">
                            {flowOptimizedPrompt}
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenGoogleFlowWide}
                            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-950/50 border border-indigo-400/40 transition active:scale-98 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                            <span>🚀 Ouvrir le Studio Flow (Plein Écran)</span>
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-200" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Résultat Texte */}
                    {mode === 'text' && generatedText && (
                      <div className="w-full space-y-3">
                        <div className="p-4 bg-slate-900/95 rounded-2xl text-slate-100 whitespace-pre-line leading-relaxed text-xs sm:text-sm border border-slate-800 font-sans max-h-[480px] overflow-y-auto shadow-inner">
                          {generatedText}
                        </div>
                      </div>
                    )}
                  </div>
                ) : errorMessage ? (
                  /* ÉTAT ERREUR : VRAI MESSAGE D'ERREUR DU SERVEUR AFFICHÉ DIRECTEMENT DANS L'APERÇU */
                  <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-4 my-auto select-none animate-in fade-in duration-200">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
                      <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
                    </div>
                    <div className="max-w-md space-y-3">
                      <h3 className="font-black text-sm sm:text-base text-rose-300">
                        Erreur de Génération AWS Lambda / Replicate
                      </h3>
                      <div className="p-3.5 bg-rose-950/60 rounded-xl border border-rose-500/30 text-xs text-rose-200 font-mono text-left whitespace-pre-wrap break-words">
                        {errorMessage}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Aucune image de remplacement n'a été affichée et vos crédits n'ont pas été débités.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* ÉTAT 1 : AVANT GÉNÉRATION (ÉTAT INITIAL) */
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto select-none">
                    <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-400 shadow-xl">
                      {mode === 'text' ? (
                        <FileText className="w-9 h-9 text-indigo-400/60" />
                      ) : mode === 'image' ? (
                        <ImageIcon className="w-9 h-9 text-purple-400/60" />
                      ) : (
                        <Film className="w-9 h-9 text-rose-400/60" />
                      )}
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-200">
                        Aperçu du Studio : Votre {mode === 'text' ? 'texte' : mode === 'image' ? 'image' : 'vidéo'} apparaîtra ici en grand format
                      </h3>
                      <p className="text-[11.5px] text-slate-400 leading-relaxed">
                        {mode === 'text' && "Rédigez votre sujet à gauche et cliquez sur Générer pour afficher le texte complet ici."}
                        {mode === 'image' && "Décrivez l'image souhaitée à gauche pour générer un rendu HD (modèle Flux) dans ce grand cadre."}
                        {mode === 'video' && videoSubMode === 'flow' && "Préparez votre prompt vidéo cinématique 4K pour utiliser vos 50 crédits/jour offerts sur Flow Studio."}
                        {mode === 'video' && videoSubMode === 'direct' && "Importez une image source à gauche pour animer votre création en vidéo Cloud haute performance."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BARRE D'ACTIONS JUSTE EN DESSOUS DU GRAND CADRE */}
            {hasResultForCurrentMode && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-lg animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Action 1 : Téléchargement / Copie */}
                  {mode === 'image' && (
                    <button
                      type="button"
                      onClick={() => handleDirectDownload(generatedImageUrl, 'png')}
                      disabled={isDownloadingMedia}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98 shadow-md disabled:opacity-50"
                      title="Téléchargement direct dans la galerie ou dossier de téléchargement local"
                    >
                      <Download className={`w-4 h-4 text-purple-400 ${isDownloadingMedia ? 'animate-bounce' : ''}`} />
                      <span>{isDownloadingMedia ? "Téléchargement..." : "Télécharger l'image"}</span>
                    </button>
                  )}
                  {mode === 'video' && videoSubMode === 'direct' && (
                    <button
                      type="button"
                      onClick={() => handleDirectDownload(generatedVideoUrl, 'mp4')}
                      disabled={isDownloadingMedia}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98 shadow-md disabled:opacity-50"
                      title="Téléchargement direct dans la galerie ou dossier de téléchargement local"
                    >
                      <Download className={`w-4 h-4 text-rose-400 ${isDownloadingMedia ? 'animate-bounce' : ''}`} />
                      <span>{isDownloadingMedia ? "Téléchargement..." : "Télécharger la vidéo"}</span>
                    </button>
                  )}
                  {mode === 'video' && videoSubMode === 'flow' && (
                    <button
                      type="button"
                      onClick={handleCopyFlowPrompt}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98 shadow-md"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" />
                      <span>{isFlowCopied ? "Prompt copié !" : "Copier le prompt"}</span>
                    </button>
                  )}
                  {mode === 'text' && (
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98 shadow-md"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Texte copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-indigo-400" />
                          <span>Copier le texte</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Action 2 : 🎬 Monter sur Canva */}
                  <button
                    type="button"
                    onClick={handleOpenCanvaSplitScreen}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 border border-purple-400/40 transition active:scale-98 cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>🎬 Monter sur Canva</span>
                    <ExternalLink className="w-3.5 h-3.5 text-purple-200" />
                  </button>

                  {/* Action 3 : 🎚️ Son & Découpe 123apps */}
                  <button
                    type="button"
                    onClick={handleOpen123Apps}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-slate-800 via-indigo-900/60 to-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg border border-indigo-500/30 transition active:scale-98 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-teal-300" />
                    <span>🎚️ Son & Découpe 123apps</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </div>
              </div>
            )}

            {/* Panneau 'Kit de Montage IA' (côté NaNa POS) dès l'ouverture */}
            {showMontageKit && renderMontageKit()}

          </div>

        </div>
      </div>

      {/* 6. PIED DE PAGE EN MARQUE BLANCHE STRICTE */}
      <footer className="h-10 px-4 sm:px-6 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-medium shrink-0 gap-1.5">
        <span>Barème : Texte = 1 crédit • Image = 2 crédits • Flow = 3 crédits • Vidéo Directe = 20 crédits</span>
        <span className="text-slate-500 font-mono text-[10.5px]">Studio Sécurisé Multi-Support • Mode Plein Écran Actif</span>
      </footer>

      {/* ===================================================================== */}
      {/* MODALE DE RECHARGEMENT VIA LE MODULE S-PAY                          */}
      {/* ===================================================================== */}
      {isRechargeModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            setIsRechargeModalOpen(false);
            setIsPaymentGatewayActive(false);
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100"
          >
            {/* En-tête de la modale */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Portefeuille de Crédits Studio
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Solde actuel : <strong className="text-amber-400 font-mono">{credits}</strong> {credits <= 1 ? 'crédit' : 'crédits'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRechargeModalOpen(false);
                  setIsPaymentGatewayActive(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du rechargement */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              {!isPaymentGatewayActive ? (
                <>
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-slate-200">
                      Choisissez votre pack de rechargement :
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Rechargez instantanément par Mobile Money ou Carte Bancaire sans interruption.
                    </p>
                  </div>

                  {/* Grille des packs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CREDIT_PACKS.map((pack) => {
                      const isSelected = selectedPack.id === pack.id;
                      return (
                        <div
                          key={pack.id}
                          onClick={() => {
                            playTapBeep();
                            setSelectedPack(pack);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-950/30'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {pack.popular && (
                            <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 uppercase tracking-wider shadow">
                              Recommandé
                            </span>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-sm text-white">
                                {pack.name}
                              </span>
                              <span className="font-black text-amber-400 font-mono text-sm">
                                {pack.credits} Crédits
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              {pack.description}
                            </p>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Tarif unique :</span>
                            <span className="font-black text-white font-mono text-xs">
                              {formatCFA(pack.price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Récapitulatif du barème */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>• Génération de Texte :</span>
                      <strong className="text-slate-200">1 crédit</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Génération d'Image :</span>
                      <strong className="text-slate-200">2 crédits</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Studio Flow Assisté :</span>
                      <strong className="text-emerald-400 font-bold">3 crédits (50 gratuits/jour)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Animation Vidéo Directe :</span>
                      <strong className="text-slate-200">20 crédits</strong>
                    </div>
                  </div>

                  {/* Bouton pour lancer la passerelle */}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsPaymentGatewayActive(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition active:scale-98 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-slate-950" />
                    <span>Payer {formatCFA(selectedPack.price)} via Mobile Money</span>
                  </button>
                </>
              ) : (
                /* INTÉGRATION DE LA PASSERELLE S-PAY */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setIsPaymentGatewayActive(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Changer de pack</span>
                    </button>
                    <span className="text-xs font-bold text-amber-300">
                      {selectedPack.name} • {selectedPack.credits} Crédits
                    </span>
                  </div>

                  {/* Composant de paiement 100% Automatique S-Pay */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-1 sm:p-2">
                    <SPaymentGateway
                      isModal={false}
                      productType="digital"
                      amount={selectedPack.price}
                      currency="FCFA"
                      orderDescription={`Recharge ${selectedPack.credits} Crédits Studio`}
                      orderId={`CREDIT-${effectiveUid.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`}
                      defaultPhone={currentUser?.phone || ''}
                      onSuccess={async (details) => {
                        try {
                          await addUserCredits(effectiveUid, selectedPack.credits, details.transactionId);
                          setCredits((prev) => prev + selectedPack.credits);
                          playCashChime();
                          setRechargeSuccessToast(`✓ Félicitations ! +${selectedPack.credits} crédits ajoutés avec succès.`);
                          setTimeout(() => setRechargeSuccessToast(null), 5000);
                          setIsRechargeModalOpen(false);
                          setIsPaymentGatewayActive(false);
                          setInsufficientCreditsInfo(null);
                          setErrorMessage(null);
                        } catch (err) {
                          console.error('[CREDITS RECHARGE ERROR]', err);
                        }
                      }}
                      onCancel={() => {
                        playTapBeep();
                        setIsPaymentGatewayActive(false);
                      }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE DE SÉLECTION D'INTÉGRATION FUNNEL / COURS                     */}
      {/* ===================================================================== */}
      {isRedirectModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsRedirectModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Intégration de la Vidéo</h3>
                  <p className="text-[11px] text-slate-400">Choisissez la destination de votre contenu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRedirectModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleNavigateToIntegration('funnel')}
                className="w-full p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-950/30 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-indigo-300 flex items-center gap-1.5">
                    <span>🎯 Funnel Builder (Smart Checkout & Deal)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Publiez votre vidéo directement sur votre page de vente haute conversion pour encaisser vos commandes.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigateToIntegration('course')}
                className="w-full p-4 rounded-2xl bg-slate-950 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-950/30 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-purple-300 flex items-center gap-1.5">
                    <span>🎓 Espace Formateur (Académie & Cours LMS)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Ajoutez votre vidéo comme support pédagogique dans vos modules de formation pour vos étudiants.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Modal d'agrandissement en Plein Écran pour Image et Vidéo */}
      {isFullScreenPreview && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-150 select-none"
          onClick={() => setIsFullScreenPreview(false)}
        >
          <button
            type="button"
            onClick={() => setIsFullScreenPreview(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white transition z-10 cursor-pointer shadow-xl border border-slate-700"
            title="Fermer le plein écran"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div onClick={(e) => e.stopPropagation()} className="max-w-7xl max-h-[90vh] flex items-center justify-center">
            {mode === 'image' && generatedImageUrl && (
              <img
                src={generatedImageUrl}
                alt="Aperçu Plein Écran"
                className="max-h-[88vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            )}
            {mode === 'video' && generatedVideoUrl && (
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                className="max-h-[88vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 w-screen h-screen bg-[#070b14] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-150"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 bg-[#070b14] flex flex-col overflow-hidden text-slate-100 select-none">
      {content}
    </div>
  );
};

export default NanaGeneratorModal;
