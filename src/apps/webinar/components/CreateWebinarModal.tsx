import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { 
  X, Video, Radio, Calendar, Sparkles, Share2, Copy, Check, 
  ExternalLink, PhoneCall, Globe, AlertCircle, RefreshCw,
  Users, GraduationCap, Lock, Link as LinkIcon, Zap, Plus,
  Trash2, Play, BookOpen, Layers, BarChart3, TrendingUp, CheckCircle2,
  DollarSign, ShieldCheck, ArrowRight, Eye, Settings
} from 'lucide-react';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../utils/audio';
import { LivePlatform, LiveRoomMode, LiveRoomStatus, LiveWebinar } from '../../../types';
import { UltimateFunnelBuilder } from '../../../components/storeBuilder/UltimateFunnelBuilder';
import { saveFunnelConfig, registerSubdomainInFirebase } from '../../../services/omniFunnelService';

export interface CreateWebinarModalProps {
  isOpen?: boolean;
  merchantId: string;
  storeName?: string;
  onClose: () => void;
  onOpenNanaGenerator?: () => void;
  isPublicView?: boolean;
}

// Modèles prêts à l'emploi du catalogue
export interface WebinarTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  platform: LivePlatform;
  roomMode: LiveRoomMode;
  isPaid: boolean;
  suggestedPrice: number;
  badge: string;
  badgeColor: string;
  category: string;
  duration: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '360p' | '480p' | '720p' | '1080p';
  highlights: string[];
}

export const WEBINAR_TEMPLATES: WebinarTemplate[] = [
  {
    id: 'tmpl-flash-sale',
    title: 'Vente Flash Live Shopping & Déstockage',
    subtitle: 'Présentation dynamique de vos meilleures offres avec achat direct WhatsApp & Mobile Money.',
    description: 'Session interactive en direct pour écouler vos stocks, dévoiler les nouveautés et proposer des remises exclusives valables uniquement pendant la diffusion.',
    platform: 'daily',
    roomMode: 'WEBINAR',
    isPaid: false,
    suggestedPrice: 0,
    aspectRatio: '9:16',
    resolution: '720p',
    badge: 'Fort Taux de Conversion',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    category: 'E-commerce & Vente Directe',
    duration: '45 min',
    highlights: ['Catalogue produits épinglés', 'Commandes 1-clic Mobile Money', 'Chat interactif & cœurs en direct']
  },
  {
    id: 'tmpl-masterclass-vip',
    title: 'Masterclass Payante & Formation VIP',
    subtitle: 'Monétisez votre expertise avec accès payant sécurisé par Nanasore Payment Gateway.',
    description: 'Session exclusive réservée aux apprenants payants. Le lien de visioconférence est déverrouillé automatiquement dès réception du paiement Orange, Moov, Wave ou MTN.',
    platform: 'jitsi',
    roomMode: 'CLASSROOM',
    isPaid: true,
    suggestedPrice: 5000,
    aspectRatio: '16:9',
    resolution: '720p',
    badge: '100% Monétisé',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    category: 'Formation & Coaching',
    duration: '90 min',
    highlights: ['Verrouillage Nanasore Pay', 'Génération salle Jitsi gratuite', 'Partage d\'écran & questions micro']
  },
  {
    id: 'tmpl-product-launch',
    title: 'Lancement de Produit & Déballage Exclusif',
    subtitle: 'Créez l\'engouement autour de vos nouveaux arrivages avant l\'ouverture officielle.',
    description: 'Présentez en détail les spécifications, tests en direct et témoignages pour maximiser les précommandes.',
    platform: 'daily',
    roomMode: 'WEBINAR',
    isPaid: false,
    suggestedPrice: 0,
    aspectRatio: '16:9',
    resolution: '720p',
    badge: 'Lancement Produit',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    category: 'Marketing & Notoriété',
    duration: '30 min',
    highlights: ['Compte à rebours de salle d\'attente', 'Bouton précommande WhatsApp', 'Replay disponible']
  },
  {
    id: 'tmpl-group-coaching',
    title: 'Coaching de Groupe & Atelier Interactif',
    subtitle: 'Session en petit comité via Google Meet avec suivi personnalisé et exercices pratiques.',
    description: 'Atelier de travail collaboratif où chaque participant peut interagir directement avec le coach.',
    platform: 'google_meet',
    roomMode: 'CLASSROOM',
    isPaid: true,
    suggestedPrice: 10000,
    aspectRatio: '16:9',
    resolution: '720p',
    badge: 'Places Limitées',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    category: 'Coaching & Consulting',
    duration: '60 min',
    highlights: ['Intégration Google Meet', 'Paiement préalable obligatoire', 'Lien sécurisé sous clé']
  },
  {
    id: 'tmpl-qa-fidelity',
    title: 'Session Q&R & Fidélisation Communauté',
    subtitle: 'Répondez aux questions de vos clients et offrez des cadeaux de fidélité.',
    description: 'Renforcez la confiance de votre communauté, répondez en direct aux objections et offrez des coupons rabais.',
    platform: 'daily',
    roomMode: 'WEBINAR',
    isPaid: false,
    suggestedPrice: 0,
    aspectRatio: '9:16',
    resolution: '720p',
    badge: 'Fidélisation Client',
    badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    category: 'Relation Client',
    duration: '40 min',
    highlights: ['Questions pré-live en salle d\'attente', 'Votes communautaires', 'Zéro publicité intrusive']
  },
  {
    id: 'tmpl-virtual-class',
    title: 'Classe Virtuelle & Mini-Cours Thématique',
    subtitle: 'Dispensez vos cours en direct avec synchronisation Google Classroom.',
    description: 'Format idéal pour les formateurs et enseignants souhaitant partager des documents et devoirs.',
    platform: 'google_classroom',
    roomMode: 'CLASSROOM',
    isPaid: true,
    suggestedPrice: 3000,
    aspectRatio: '16:9',
    resolution: '720p',
    badge: 'Pédagogique',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    category: 'Éducation',
    duration: '60 min',
    highlights: ['Lien Google Classroom verrouillé', 'Facturation automatique FCFA', 'Validation instantanée']
  }
];

export const CreateWebinarModal: React.FC<CreateWebinarModalProps> = ({
  isOpen = true,
  merchantId,
  storeName = 'Ma Boutique',
  onClose,
  onOpenNanaGenerator,
  isPublicView = false
}) => {
  // Sécurité renforcée : strict refus de rendu sur la vitrine publique
  if (!isOpen || isPublicView) {
    return null;
  }

  // 3 Onglets principaux de l'Espace Live & Webinaire
  const [activeTab, setActiveTab] = useState<'my_webinars' | 'catalog' | 'funnels'>('my_webinars');

  // Mode formulaire de création
  const [isCreatingFormOpen, setIsCreatingFormOpen] = useState(false);

  // Champs du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [platform, setPlatform] = useState<LivePlatform>('daily');
  const [roomMode, setRoomMode] = useState<LiveRoomMode>('WEBINAR');
  const [streamUrl, setStreamUrl] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'360p' | '480p' | '720p' | '1080p'>('720p');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Liste des lives du marchand
  const [myWebinars, setMyWebinars] = useState<LiveWebinar[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Liste des funnels générés
  const [generatedFunnels, setGeneratedFunnels] = useState<any[]>([]);

  // Constructeur de Funnel
  const [showWebinarFunnelBuilder, setShowWebinarFunnelBuilder] = useState(false);
  const [funnelInitialData, setFunnelInitialData] = useState<any>(null);

  // Helper pour générer un ID de salle unique
  const generateUniqueRoomId = useCallback(() => {
    return 'nana-live-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  }, []);

  // Définitions et descriptions des plateformes
  const platformLabels: Record<LivePlatform, { name: string; badge: string; iconColor: string; bg: string }> = {
    daily: {
      name: "NaNa Live HD (Intégré dans l'app, zéro pub)",
      badge: "HD Intégré Sans Pubs",
      iconColor: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30"
    },
    jitsi: {
      name: "Jitsi Meet (Génération automatique de salle gratuite & intégrée)",
      badge: "1-Clic Gratuit & Illimité",
      iconColor: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30"
    },
    zoom: {
      name: "Zoom (Lien de réunion / Webinaire Zoom)",
      badge: "Verrouillé Nanasore Pay",
      iconColor: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30"
    },
    google_meet: {
      name: "Google Meet (Lien de visioconférence Google)",
      badge: "Verrouillé Nanasore Pay",
      iconColor: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30"
    },
    google_classroom: {
      name: "Google Classroom (Lien de cours / classe virtuelle)",
      badge: "Verrouillé Nanasore Pay",
      iconColor: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30"
    },
    youtube: {
      name: "YouTube Live",
      badge: "Haute Définition & Replay",
      iconColor: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30"
    },
    tiktok: {
      name: "TikTok Live",
      badge: "Viralité & Audience Jeune",
      iconColor: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/30"
    },
    facebook: {
      name: "Facebook Live",
      badge: "Communauté & Groupes",
      iconColor: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30"
    },
    instagram: {
      name: "Instagram Live",
      badge: "Story & Shopping Direct",
      iconColor: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10 border-fuchsia-500/30"
    },
    linkedin: {
      name: "LinkedIn Live",
      badge: "B2B & Professionnels",
      iconColor: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/30"
    }
  };

  // Auto-génération de l'URL de salle pour Jitsi ou NaNa Live HD (Daily.co)
  const handleAutoGenerateRoomUrl = useCallback(async (targetPlatform: LivePlatform) => {
    playTapBeep();
    const currentUrl = (meetingUrl || streamUrl).trim();
    if (!forceOverwrite && currentUrl && !isInternalGeneratedUrl(currentUrl)) {
      // Ne jamais écraser un lien collé manuellement par l'utilisateur (ex: Google Meet, Zoom, YouTube...)
      return;
    }
    const roomId = generateUniqueRoomId();
    if (targetPlatform === 'jitsi') {
      const url = `https://meet.jit.si/${roomId}`;
      setMeetingUrl(url);
      setStreamUrl(url);
    } else if (targetPlatform === 'daily') {
      const roomName = `webinar-${roomId}`;
      let finalDailyUrl = `https://nanasore.daily.co/${roomName}`;

      try {
        const resp = await fetch('/api/daily/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            durationSeconds: 7200 // 2h pour webinaire
          })
        });

        if (resp.ok) {
          const roomData = await resp.json();
          if (roomData.url) {
            finalDailyUrl = roomData.url;
          }
        }
      } catch (callErr) {
        console.warn("[DAILY] Provisioning via API en repli:", callErr);
      }

      setMeetingUrl(finalDailyUrl);
      setStreamUrl(finalDailyUrl);
    }
  }, [generateUniqueRoomId, isInternalGeneratedUrl, meetingUrl, streamUrl]);

  // Initialisation automatique du lien Jitsi uniquement si aucun lien n'a été collé
  useEffect(() => {
    if (platform === 'jitsi' && !meetingUrl && !streamUrl) {
      handleAutoGenerateRoomUrl('jitsi', false);
    }
  }, [platform, meetingUrl, streamUrl, handleAutoGenerateRoomUrl]);

  // Génère un UUID v4 valide pour la clé primaire UUID de public.live_sessions dans Supabase
  const generateSupabaseUuid = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }, []);

  // Charger les Lives du commerçant depuis Supabase (table public.live_sessions) + cache local
  const loadMyWebinars = useCallback(async () => {
    setLoadingList(true);
    let loaded: LiveWebinar[] = [];

    // 1. Lecture prioritaire depuis Supabase public.live_sessions
    try {
      const { data: supaRows, error: sErr } = await supabase
        .from('live_sessions')
        .select('*')
        .or(`host_id.eq.${merchantId},tenant_id.eq.${merchantId}`)
        .order('created_at', { ascending: false });

      if (!sErr && supaRows && supaRows.length > 0) {
        loaded = supaRows.map((row: any) => ({
          id: row.id,
          merchantId: row.host_id || merchantId,
          storeName: storeName || 'Boutique Partenaire',
          title: row.title,
          description: row.description || '',
          date: row.created_at || new Date().toISOString(),
          platform: 'daily',
          roomMode: 'WEBINAR',
          status: row.status as any,
          socialStreamUrl: row.stream_url,
          meetingUrl: row.stream_url,
          isPaid: false,
          price: 0,
          currency: 'FCFA',
          createdAt: new Date(row.created_at).getTime(),
          registeredCount: row.viewer_count || 0
        }));
      }
    } catch (supaErr) {
      console.warn("Lecture Supabase live_sessions en repli:", supaErr);
    }

    // Récupération du cache local pour résilience
    try {
      const cached = localStorage.getItem('nana_merchant_webinars');
      if (cached) {
        const parsed: LiveWebinar[] = JSON.parse(cached);
        const map = new Map<string, LiveWebinar>();
        loaded.forEach(item => map.set(item.id, item));
        parsed.forEach(item => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        loaded = Array.from(map.values());
      }
    } catch {}

    // Tri par date décroissante
    loaded.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    setMyWebinars(loaded);
    setLoadingList(false);
  }, [merchantId, storeName, detectPlatformFromUrl]);

  // Charger les funnels sauvegardés
  const loadFunnels = useCallback(() => {
    try {
      const raw = localStorage.getItem('nana_webinar_funnels');
      if (raw) {
        setGeneratedFunnels(JSON.parse(raw));
      } else {
        // Exemples initiaux inspirants
        const initialFunnels = [
          {
            id: 'funnel-demo-1',
            title: 'Tunnel de Vente Flash Live Shopping',
            webinarTitle: 'Vente Flash Nouveautés & Déstockage',
            price: 15000,
            viewsCount: 238,
            conversionsCount: 42,
            conversionRate: '17.6%',
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
            slug: 'vente-flash-live'
          },
          {
            id: 'funnel-demo-2',
            title: 'Page de Capture Masterclass VIP',
            webinarTitle: 'Masterclass Stratégie & Croissance Pro',
            price: 5000,
            viewsCount: 412,
            conversionsCount: 89,
            conversionRate: '21.6%',
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
            slug: 'masterclass-vip'
          }
        ];
        setGeneratedFunnels(initialFunnels);
        localStorage.setItem('nana_webinar_funnels', JSON.stringify(initialFunnels));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadMyWebinars();
    loadFunnels();
  }, [loadMyWebinars, loadFunnels]);

  // Utiliser un modèle prêt à l'emploi (1-clic) sans écraser un lien déjà collé par l'utilisateur
  const handleUseTemplate = (template: WebinarTemplate) => {
    playValidationBeep();
    setTitle(template.title);
    setDescription(template.description);
    setRoomMode(template.roomMode);
    setIsPaid(template.isPaid);
    setPrice(template.suggestedPrice.toString());
    setAspectRatio(template.aspectRatio || '16:9');
    setResolution(template.resolution || '720p');

    // Calculer une date par défaut (demain à 19h00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDate(localIso);

    if (template.platform === 'jitsi') {
      const url = `https://meet.jit.si/${generateUniqueRoomId()}`;
      setMeetingUrl(url);
      setStreamUrl(url);
    } else if (template.platform === 'daily') {
      setMeetingUrl('');
      setStreamUrl('');
      // Déclencher le provisionnement réel auprès du serveur
      handleAutoGenerateRoomUrl('daily');
    } else {
      setPlatform(template.platform);
      if (template.platform === 'jitsi') {
        const url = `https://meet.jit.si/${generateUniqueRoomId()}`;
        setMeetingUrl(url);
        setStreamUrl(url);
      } else if (template.platform === 'daily') {
        const url = `https://nanasore.daily.co/${generateUniqueRoomId()}`;
        setMeetingUrl(url);
        setStreamUrl(url);
      } else {
        setMeetingUrl('');
        setStreamUrl('');
      }
    }

    setIsCreatingFormOpen(true);
  };

  // Soumission et création du Webinaire dans Supabase (public.live_sessions) + Salle Live (/live/:id)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      setErrorMsg('Veuillez renseigner un titre et une date pour le live.');
      return;
    }

    const rawPastedUrl = (meetingUrl.trim() || streamUrl.trim());
    const detectedPlat = detectPlatformFromUrl(rawPastedUrl);
    const effectivePlatform: LivePlatform = detectedPlat || platform;

    if ((effectivePlatform === 'zoom' || effectivePlatform === 'google_meet' || effectivePlatform === 'google_classroom') && !rawPastedUrl) {
      setErrorMsg(`Veuillez coller le lien de votre réunion ${platformLabels[effectivePlatform].name}.`);
      return;
    }

    playTapBeep();
    setLoading(true);
    setErrorMsg('');

    try {
      const numericPrice = isPaid ? Math.max(0, parseInt(price) || 0) : 0;
      const finalMeetingUrl = rawPastedUrl || (
        effectivePlatform === 'jitsi'
          ? `https://meet.jit.si/${generateUniqueRoomId()}`
          : effectivePlatform === 'daily'
            ? `https://nanasore.daily.co/${generateUniqueRoomId()}`
            : ''
      );
      const finalStreamUrl = rawPastedUrl || finalMeetingUrl;

      let liveId = generateSupabaseUuid();

      const coachingRoom = (
        effectivePlatform === 'google_meet' ||
        effectivePlatform === 'zoom' ||
        effectivePlatform === 'google_classroom' ||
        effectivePlatform === 'jitsi'
      )
        ? finalMeetingUrl
        : undefined;

      const metaData = {
        sessionSlug: liveId,
        storeId: merchantId || 'merchant-store',
        storeName: storeName || 'Ma Boutique',
        date,
        platform: effectivePlatform,
        roomMode,
        sessionMode: roomMode === 'CLASSROOM' ? 'interactive_class' : 'live_shopping',
        aspectRatio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        streamUrl: finalStreamUrl,
        meetingUrl: finalMeetingUrl,
        socialStreamUrl: finalStreamUrl,
        coachingRoomUrl: coachingRoom,
        isPaid,
        price: numericPrice,
        currency: 'FCFA',
        registeredCount: 0
      };

      // 1. Enregistrement direct dans Supabase PostgreSQL (table public.live_sessions)
      try {
        const { data: insertedRow, error: sbErr } = await supabase
          .from('live_sessions')
          .upsert({
            id: liveId,
            tenant_id: merchantId || 'default',
            host_id: merchantId || 'host',
            title: title.trim(),
            description: description.trim(),
            is_live: true,
            viewer_count: 1,
            stream_url: finalStreamUrl,
            status: 'live',
            pinned_product_data: {
              _meta: metaData
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (sbErr) {
          console.warn("[SUPABASE WEBINAR] Avertissement upsert live_sessions:", sbErr.message);
        } else if (insertedRow?.id) {
          liveId = insertedRow.id;
        }
      } catch (sbCatchErr) {
        console.warn("[SUPABASE WEBINAR] Mode résilient activé:", sbCatchErr);
      }

      const newWebinarData = {
        merchantId,
        storeName,
        title: title.trim(),
        description: description.trim(),
        date,
        platform: effectivePlatform,
        roomMode,
        aspectRatio,
        resolution,
        socialStreamUrl: finalStreamUrl || null,
        meetingUrl: finalMeetingUrl || null,
        streamUrl: finalStreamUrl || null,
        isPaid,
        price: numericPrice,
        currency: 'FCFA',
        status: 'scheduled' as LiveRoomStatus,
        registeredCount: 0
      };

      let liveId = `live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Enregistrement prioritaire dans Supabase SQL (public.live_sessions)
      try {
        const { data: supaData, error: supaErr } = await supabase
          .from('live_sessions')
          .insert({
            host_id: merchantId || 'merchant-default',
            tenant_id: merchantId || 'tenant-default',
            title: title.trim(),
            description: description.trim(),
            status: 'scheduled',
            is_live: false,
            stream_url: finalStreamUrl || finalMeetingUrl,
            viewer_count: 0
          })
          .select('id')
          .single();

        if (!supaErr && supaData?.id) {
          liveId = supaData.id;
        }
      } catch (sErr) {
        console.warn("[WEBINAR] Sauvegarde Supabase SQL en repli:", sErr);
      }

      // 2. Mise à jour du cache local (nana_merchant_webinars + nana_live_sessions_cache)
      const localWebinarItem: LiveWebinar = {
        id: liveId,
        ...newWebinarData,
        createdAt: Date.now()
      };

      const updatedLocalList = [localWebinarItem, ...myWebinars];
      setMyWebinars(updatedLocalList);
      try {
        localStorage.setItem('nana_merchant_webinars', JSON.stringify(updatedLocalList));
        const rawSessionsCache = localStorage.getItem('nana_live_sessions_cache');
        const sessionsMap = rawSessionsCache ? JSON.parse(rawSessionsCache) : {};
        sessionsMap[liveId] = liveSessionPayload;
        localStorage.setItem('nana_live_sessions_cache', JSON.stringify(sessionsMap));
      } catch {}

      // 3. Génération du lien de la Landing Page publique (Domaine public officiel : nsore.shop)
      const origin = typeof window !== 'undefined' && window.location.origin 
        ? (window.location.hostname.includes('localhost') ? window.location.origin : 'https://nsore.shop')
        : 'https://nsore.shop';
      const publicUrl = `${origin}/live/${liveId}`;
      setGeneratedLink(publicUrl);
      playValidationBeep();
    } catch (error: any) {
      console.error("Erreur lors de la création du webinaire :", error);
      setErrorMsg(error?.message || "Erreur lors de la création de la page de live.");
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'un webinaire dans Supabase (public.live_sessions) + cache local
  const handleDeleteWebinar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce live ?")) return;
    playTapBeep();

    try {
      await supabase.from('live_sessions').delete().eq('id', id);
    } catch (delErr) {
      console.warn("[WEBINAR] Erreur suppression Supabase:", delErr);
    }

    const updated = myWebinars.filter(w => w.id !== id);
    setMyWebinars(updated);
    try {
      localStorage.setItem('nana_merchant_webinars', JSON.stringify(updated));
      const rawSessionsCache = localStorage.getItem('nana_live_sessions_cache');
      if (rawSessionsCache) {
        const sessionsMap = JSON.parse(rawSessionsCache);
        delete sessionsMap[id];
        localStorage.setItem('nana_live_sessions_cache', JSON.stringify(sessionsMap));
      }
    } catch {}
  };

  // Copier le lien
  const handleCopyLink = (url: string) => {
    playTapBeep();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Lancer le constructeur de Funnel pour un Live spécifique
  const handleLaunchFunnelForLive = (live?: LiveWebinar) => {
    playTapBeep();
    const targetLive = live || (myWebinars.length > 0 ? myWebinars[0] : undefined);
    setFunnelInitialData({
      id: 'webinar-funnel-' + (targetLive?.id || Date.now()),
      title: targetLive?.title || title || 'Grand Live Shopping & Vente Directe',
      subtitle: targetLive?.description || description || 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
      image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80',
      price: targetLive?.isPaid ? targetLive.price : (isPaid ? Number(price) : 0),
      originalPrice: (targetLive?.isPaid ? (targetLive.price || 0) * 1.5 : (isPaid ? Number(price) * 1.5 : 25000)),
      instructor: storeName || 'Animateur Live NaNa',
      instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      category: 'Live / Webinaire Haute Fréquence',
      duration: targetLive?.date ? `Diffusion le ${targetLive.date}` : (date ? `Diffusion le ${date}` : 'Diffusion Directe Replay'),
      type: 'webinar',
      webinarId: targetLive?.id || null
    });
    setShowWebinarFunnelBuilder(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Supérieur */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-rose-950/30 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-inner">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Studio Live, Webinaires & Funnels
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">
                  NaNa HD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Générez vos salles de direct interactives, vendez en live et convertissez vos prospects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingFormOpen && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsCreatingFormOpen(true);
                  setGeneratedLink('');
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau Live</span>
              </button>
            )}

            {onOpenNanaGenerator && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenNanaGenerator();
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition cursor-pointer min-h-[40px]"
                title="Ouvrir NaNaGénérateur IA ✨"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden lg:inline">NaNaGénérateur</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                handleLaunchFunnelForLive();
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition cursor-pointer min-h-[40px]"
              title="Créer un Funnel de conversion ⚡"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span className="hidden md:inline">Créer un Funnel ⚡</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); onClose(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre des 3 Onglets Principaux */}
        {!isCreatingFormOpen && (
          <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 gap-2 sm:gap-4 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('my_webinars'); }}
              className={`py-3 px-3 text-xs sm:text-sm font-black border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'my_webinars'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>🔴 Mes Lives & Webinaires créés</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
                {myWebinars.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('catalog'); }}
              className={`py-3 px-3 text-xs sm:text-sm font-black border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📚 Catalogue des Lives & Modèles</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold">
                {WEBINAR_TEMPLATES.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('funnels'); }}
              className={`py-3 px-3 text-xs sm:text-sm font-black border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'funnels'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>⚡ Mes Funnels de vente générés</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                {generatedFunnels.length}
              </span>
            </button>
          </div>
        )}

        {/* Corps Principal Défilable */}
        <div 
          className="p-4 sm:p-6 overflow-y-auto overscroll-y-contain flex-1 space-y-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE FORMULAIRE DE CRÉATION DE LIVE / WEBINAIRE           */}
          {/* ======================================================== */}
          {isCreatingFormOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-sm">
                    ✨
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      Paramétrer votre Salle Live
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configurez la plateforme, l'accès payant ou gratuit, et lancez le direct
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsCreatingFormOpen(false);
                    setGeneratedLink('');
                  }}
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 transition cursor-pointer"
                >
                  ← Revenir à mes Lives
                </button>
              </div>

              {!generatedLink ? (
                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Titre de l'événement */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Titre de l'événement</span>
                      <span className="text-[10px] text-slate-500">Obligatoire</span>
                    </label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      required
                      placeholder="Ex: Vente Flash Live & Déballage de la nouvelle collection !"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition min-h-[44px]"
                    />
                  </div>

                  {/* Format & Mode de la Salle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Format de la Session</span>
                      <span className="text-[10px] text-indigo-400 font-semibold">Adaptation automatique</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setRoomMode('WEBINAR'); }}
                        className={`p-2.5 rounded-2xl border text-center transition cursor-pointer min-h-[56px] flex flex-col items-center justify-center gap-1 ${
                          roomMode === 'WEBINAR'
                            ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Radio className="w-4 h-4 text-rose-400" />
                        <span className="text-[11px] font-bold">Webinaire</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setRoomMode('CLASSROOM'); }}
                        className={`p-2.5 rounded-2xl border text-center transition cursor-pointer min-h-[56px] flex flex-col items-center justify-center gap-1 ${
                          roomMode === 'CLASSROOM'
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-bold">Formation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setRoomMode('ONE_ON_ONE'); }}
                        className={`p-2.5 rounded-2xl border text-center transition cursor-pointer min-h-[56px] flex flex-col items-center justify-center gap-1 ${
                          roomMode === 'ONE_ON_ONE'
                            ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold">1-sur-1 Privé</span>
                      </button>
                    </div>
                  </div>

                  {/* Format & Orientation Vidéo (Ratio) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Format & Orientation Vidéo (Ratio)</span>
                      </span>
                      <span className="text-[10px] text-indigo-400 font-semibold">
                        {aspectRatio === '16:9' ? 'Format Paysage Standard (16:9)' : 'Format Vertical Mobile (9:16)'}
                      </span>
                    </label>
                    <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setAspectRatio('16:9'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px] ${
                          aspectRatio === '16:9'
                            ? 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-lg shadow-indigo-950/50 border border-indigo-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <span className="text-base leading-none">▭</span>
                        <span>16:9 (Paysage : YouTube, PC, TV)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setAspectRatio('9:16'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px] ${
                          aspectRatio === '9:16'
                            ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-950/50 border border-rose-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <span className="text-base leading-none">▯</span>
                        <span>9:16 (Vertical : TikTok, Reels, Shorts)</span>
                      </button>
                    </div>
                  </div>

                  {/* Résolution Vidéo avec 720p HD par défaut et fallback automatique */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Résolution du Flux Vidéo</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{resolution === '720p' ? '720p HD (Recommandé par défaut)' : resolution}</span>
                      </span>
                    </label>
                    <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setResolution('360p'); }}
                        className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center transition cursor-pointer min-h-[44px] ${
                          resolution === '360p'
                            ? 'bg-slate-800 text-amber-300 shadow-md border border-amber-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <span>360p</span>
                        <span className="text-[9px] font-normal text-slate-500">Éco / 3G</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setResolution('480p'); }}
                        className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center transition cursor-pointer min-h-[44px] ${
                          resolution === '480p'
                            ? 'bg-slate-800 text-sky-300 shadow-md border border-sky-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <span>480p</span>
                        <span className="text-[9px] font-normal text-slate-500">SD Fluide</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setResolution('720p'); }}
                        className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center transition cursor-pointer min-h-[44px] ${
                          resolution === '720p'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>720p</span>
                          <span className="text-[9px] px-1 rounded bg-black/40 text-emerald-200">HD</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-300">Par défaut</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setResolution('1080p'); }}
                        className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center transition cursor-pointer min-h-[44px] ${
                          resolution === '1080p'
                            ? 'bg-slate-800 text-purple-300 shadow-md border border-purple-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <span>1080p</span>
                        <span className="text-[9px] font-normal text-slate-500">FHD Max</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ℹ️ Fallback automatique : si le flux ou le réseau ne supporte pas 720p, l'affichage bascule automatiquement sur 480p ou 360p sans interruption.
                    </p>
                  </div>
                  
                  {/* Choix de la plateforme de diffusion */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Plateforme de diffusion</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${platformLabels[platform].bg} ${platformLabels[platform].iconColor}`}>
                        {platformLabels[platform].badge}
                      </span>
                    </label>
                    <select 
                      value={platform} 
                      onChange={(e) => {
                        const newPlat = e.target.value as LivePlatform;
                        setPlatform(newPlat);
                        if (newPlat === 'jitsi' || newPlat === 'daily') {
                          handleAutoGenerateRoomUrl(newPlat, false);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition min-h-[44px] cursor-pointer"
                    >
                      <option value="daily">NaNa Live HD (Intégré dans l'app, zéro pub)</option>
                      <option value="jitsi">Jitsi Meet (Génération automatique de salle gratuite & intégrée)</option>
                      <option value="zoom">Zoom (Lien de réunion / Webinaire Zoom)</option>
                      <option value="google_meet">Google Meet (Lien de visioconférence Google)</option>
                      <option value="google_classroom">Google Classroom (Lien de cours / classe virtuelle)</option>
                      <option value="youtube">YouTube Live (Recommandé pour Replay HD)</option>
                      <option value="tiktok">TikTok Live (Achats direct TikTok)</option>
                      <option value="facebook">Facebook Live</option>
                      <option value="instagram">Instagram Live</option>
                      <option value="linkedin">LinkedIn Live</option>
                    </select>

                    <p className="mt-1 text-[10.5px] text-slate-400 leading-snug">
                      {platform === 'daily' && "Diffusion WebRTC interactive 100% white-label sans quitter l'application, avec catalogue de produits synchronisé."}
                      {platform === 'jitsi' && "Génération instantanée en 1 clic d'une salle Jitsi sans limite de participants, totalement gratuite et sans compte requis."}
                      {platform === 'zoom' && "Lien de réunion Zoom verrouillé derrière Nanasore Payment Gateway : seuls les acheteurs reçoivent l'accès."}
                      {platform === 'google_meet' && "Visioconférence Google Meet monétisée : le lien est déverrouillé automatiquement après paiement Mobile Money."}
                      {platform === 'google_classroom' && "Idéal pour enseignants et formateurs : lien de classe virtuelle déverrouillé après encaissement."}
                      {platform === 'youtube' && "Intégration sécurisée YouTube Live avec protection anti-redirection."}
                      {platform === 'tiktok' && "Lecteur TikTok Live encapsulé au-dessus de vos produits avec achat direct WhatsApp."}
                      {platform === 'facebook' && "Diffusez auprès de votre communauté Facebook avec commande en 1 clic."}
                      {platform === 'instagram' && "Idéal pour rediriger vos followers Instagram vers votre boutique."}
                      {platform === 'linkedin' && "Parfait pour les présentations B2B et démonstrations professionnelles."}
                    </p>
                  </div>

                  {/* Bouton de génération 1-clic ou collage direct de lien (Google Meet, Zoom, YouTube, Jitsi...) */}
                  {(platform === 'jitsi' || platform === 'daily') && (
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          Collez votre lien Live (Google Meet, Zoom, YouTube...) ou utilisez la salle {platform === 'jitsi' ? 'Jitsi Meet' : 'NaNa Live HD'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAutoGenerateRoomUrl(platform, true)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Régénérer</span>
                        </button>
                      </div>
                      <input 
                        type="url" 
                        value={meetingUrl || streamUrl} 
                        onChange={(e) => handleLiveUrlInput(e.target.value)} 
                        placeholder="Collez un lien (https://meet.google.com/..., https://zoom.us/..., YouTube...) ou laissez générer"
                        className="w-full bg-slate-950/80 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs font-mono text-indigo-200 focus:outline-none min-h-[38px]"
                      />
                    </div>
                  )}

                  {/* Champ de saisie pour Zoom, Google Meet et Google Classroom */}
                  {(platform === 'zoom' || platform === 'google_meet' || platform === 'google_classroom') && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Lien d'accès à la session ({platformLabels[platform].name})</span>
                        <span className="text-[10px] text-rose-400 font-semibold">* Requis</span>
                      </label>
                      <input 
                        type="url" 
                        value={meetingUrl || streamUrl} 
                        onChange={(e) => handleLiveUrlInput(e.target.value)} 
                        required
                        placeholder={
                          platform === 'zoom' 
                            ? 'https://zoom.us/j/123456789 ou https://us02web.zoom.us/...' 
                            : platform === 'google_meet'
                              ? 'https://meet.google.com/abc-defg-hij'
                              : 'https://classroom.google.com/c/...'
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition min-h-[44px]"
                      />

                      {/* Sécurité Verrou Nanasore */}
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10.5px] text-amber-200/90 leading-tight font-medium">
                          <strong>Sécurité Nanasore Payment Gateway :</strong> Ce lien d'accès restera strictement confidentiel et masqué. Les participants ne pourront le voir ou y accéder qu'après avoir validé leur paiement via Mobile Money (Orange, Moov, Wave, MTN).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* URL du flux pour les réseaux sociaux externes */}
                  {(platform === 'youtube' || platform === 'tiktok' || platform === 'facebook' || platform === 'instagram' || platform === 'linkedin') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Lien du flux externe ({platformLabels[platform].name})</span>
                      </label>
                      <input 
                        type="url" 
                        value={streamUrl || meetingUrl} 
                        onChange={(e) => handleLiveUrlInput(e.target.value)} 
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition min-h-[44px]"
                      />
                    </div>
                  )}

                  {/* Tarif d'accès et Monétisation via Nanasore Payment Gateway */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        Tarif d'accès à la session
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        Nanasore Gateway
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setIsPaid(false); }}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer min-h-[44px] flex items-center justify-center gap-2 ${
                          !isPaid 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-white font-black' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${!isPaid ? 'text-emerald-400' : 'opacity-0'}`} />
                        <span className="text-xs">Gratuit (Accès libre)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setIsPaid(true); }}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer min-h-[44px] flex items-center justify-center gap-2 ${
                          isPaid 
                            ? 'bg-amber-500/20 border-amber-500/50 text-white font-black' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs">Payant (Verrouillé)</span>
                      </button>
                    </div>

                    {isPaid && (
                      <div className="pt-2 animate-in fade-in duration-200">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Prix du billet d'accès (en FCFA) :
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="500" 
                            step="500"
                            value={price} 
                            onChange={(e) => setPrice(e.target.value)} 
                            placeholder="5000"
                            className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3.5 py-2 text-sm font-black text-amber-300 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
                          />
                          <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                            FCFA
                          </span>
                        </div>
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          Les participants règleront ce montant par Orange Money, Moov Money, Wave ou MTN avant d'obtenir l'accès.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Description & Programme</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      required
                      rows={3}
                      placeholder="Présentez les articles en promotion, les codes rabais et les surprises prévues pendant la session..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition resize-none leading-relaxed"
                    />
                  </div>

                  {/* Date et Heure */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Date et Heure de Diffusion</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition min-h-[44px]"
                    />
                  </div>

                  {/* Actions du formulaire */}
                  <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleLaunchFunnelForLive()}
                      className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition cursor-pointer min-h-[44px]"
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Créer un Funnel ⚡</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => { playTapBeep(); setIsCreatingFormOpen(false); }} 
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl font-bold text-xs transition cursor-pointer min-h-[44px]"
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading} 
                        className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white rounded-2xl font-extrabold text-xs transition shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-2 min-h-[44px] disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Créer la Salle Live</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Écran de Succès et Partage du Live créé */
                <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <Check className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white">Votre Salle Live est Prête !</h3>
                    <p className="text-xs text-slate-400">
                      Les participants accéderont à la page intelligente synchronisée avec compte à rebours et encaissement Mobile Money.
                    </p>
                  </div>

                  {/* Affichage du lien */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-indigo-300 truncate select-all">
                      {generatedLink}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(generatedLink)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 min-h-[40px] cursor-pointer"
                      title="Copier le lien"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  {/* Boutons d'action */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchFunnelForLive()}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer min-h-[48px]"
                    >
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>Créer un Funnel de Vente Dédié ⚡ (1-Clic)</span>
                    </button>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 *INVITATION EXCLUSIVE LIVE SHOPPING*\n\nNe manquez pas notre diffusion en direct : *${title}* !\n\n👉 *Rejoindre la salle live :* ${generatedLink}\n\nÀ très vite !`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={playValidationBeep}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer min-h-[48px]"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Diffuser sur WhatsApp (Statuts & Groupes)</span>
                    </a>

                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                    >
                      <ExternalLink className="w-4 h-4 text-indigo-400" />
                      <span>Tester et Prévisualiser la Salle</span>
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedLink('');
                        setIsCreatingFormOpen(false);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Revenir à la liste de mes Lives
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* NAVIGATION PAR LES 3 ONGLETS DU STUDIO                   */
            /* ======================================================== */
            <>
              {/* ---------------------------------------------------- */}
              {/* ONGLET 1 : MES LIVES & WEBINAIRES CRÉÉS              */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'my_webinars' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Sessions programmées & en direct</span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({myWebinars.length} session{myWebinars.length > 1 ? 's' : ''})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Gérez vos diffusions, rejoignez vos directs et générez des tunnels de vente
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setIsCreatingFormOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un Live</span>
                    </button>
                  </div>

                  {loadingList ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                      <p className="text-xs">Chargement de vos sessions...</p>
                    </div>
                  ) : myWebinars.length === 0 ? (
                    <div className="py-12 px-4 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                        <Radio className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Aucun Live programmé pour le moment</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Lancez votre première vente flash en direct ou utilisez l'un de nos modèles prêts à l'emploi.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => { playTapBeep(); setIsCreatingFormOpen(true); }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Créer mon premier Live</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { playTapBeep(); setActiveTab('catalog'); }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Voir les Modèles</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {myWebinars.map((webinar) => {
                        const platInfo = platformLabels[webinar.platform] || platformLabels.daily;
                        const isLiveNow = webinar.status === 'live';
                        const isEnded = webinar.status === 'ended';
                        const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/live/${webinar.id}` : `/live/${webinar.id}`;

                        return (
                          <div 
                            key={webinar.id}
                            className="p-4 rounded-3xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 space-y-3 transition flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              {/* Badges d'état et de plateforme */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                  isLiveNow 
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                    : isEnded
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                                }`}>
                                  <Radio className="w-3 h-3" />
                                  <span>{isLiveNow ? 'EN DIRECT' : isEnded ? 'TERMINÉ' : 'PROGRAMMÉ'}</span>
                                </span>

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${platInfo.bg} ${platInfo.iconColor}`}>
                                  {webinar.platform === 'jitsi' ? 'Jitsi Meet' : webinar.platform === 'zoom' ? 'Zoom' : webinar.platform === 'google_meet' ? 'Google Meet' : webinar.platform === 'google_classroom' ? 'Classroom' : platInfo.badge}
                                </span>

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                  {webinar.isPaid && webinar.price ? `${formatCFA(webinar.price)} (Payant)` : 'Gratuit'}
                                </span>

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                                  {webinar.aspectRatio === '9:16' ? '▯ 9:16' : '▭ 16:9'}
                                </span>

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  {webinar.resolution || '720p HD'}
                                </span>
                              </div>

                              {/* Titre et Date */}
                              <div>
                                <h4 className="text-xs sm:text-sm font-black text-white line-clamp-1">
                                  {webinar.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>{webinar.date ? new Date(webinar.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date à définir'}</span>
                                </p>
                              </div>

                              {/* Description tronquée */}
                              {webinar.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                  {webinar.description}
                                </p>
                              )}
                            </div>

                            {/* Boutons d'action pour la session */}
                            <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 flex-wrap">
                              <a
                                href={publicLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-[110px] py-2 px-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[36px]"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Rejoindre</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleCopyLink(publicLink)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                                title="Copier le lien d'invitation"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Lien</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLaunchFunnelForLive(webinar)}
                                className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-black transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                                title="Créer un Funnel de vente ⚡"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span className="hidden sm:inline">Funnel</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteWebinar(webinar.id, e)}
                                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-[11px] transition cursor-pointer min-h-[36px]"
                                title="Supprimer ce live"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* ONGLET 2 : CATALOGUE DES LIVES & MODÈLES             */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'catalog' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Modèles de Direct & Webinaires Prêts à l'Emploi</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          1-Clic
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Sélectionnez un modèle éprouvé pour pré-remplir instantanément votre session live
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {WEBINAR_TEMPLATES.map((tmpl) => (
                      <div 
                        key={tmpl.id}
                        className="p-4 rounded-3xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                              {tmpl.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {tmpl.duration}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-indigo-300 transition">
                              {tmpl.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                              {tmpl.subtitle}
                            </p>
                          </div>

                          <div className="space-y-1 pt-1">
                            {tmpl.highlights.map((h, i) => (
                              <div key={i} className="text-[10.5px] text-slate-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-extrabold text-slate-300">
                            {tmpl.isPaid ? `${formatCFA(tmpl.suggestedPrice)}` : 'Gratuit'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleUseTemplate(tmpl)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-950/50"
                          >
                            <span>Utiliser</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* ONGLET 3 : MES FUNNELS DE VENTE GÉNÉRÉS              */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'funnels' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Funnels de vente générés à partir des Lives</span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({generatedFunnels.length})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Pages d'atterrissage, séquences de conversion et tunnels d'inscription optimisés
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchFunnelForLive()}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouveau Funnel</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {generatedFunnels.map((funnel) => {
                      const funnelUrl = typeof window !== 'undefined' ? `${window.location.origin}/f/${funnel.id}` : `https://nsore.shop/f/${funnel.id}`;

                      return (
                        <div 
                          key={funnel.id}
                          className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-current" />
                                <span>Tunnel Haute Conversion</span>
                              </span>
                              <span className="text-xs font-black text-emerald-400">
                                {formatCFA(funnel.price || 0)}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-white">
                                {funnel.title}
                              </h4>
                              {funnel.webinarTitle && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Radio className="w-3 h-3 text-rose-400" />
                                  <span>Lié à : {funnel.webinarTitle}</span>
                                </p>
                              )}
                            </div>

                            {/* Statistiques de conversion */}
                            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                                <div className="text-xs sm:text-sm font-black text-white">{funnel.viewsCount || 142}</div>
                                <div className="text-[9px] uppercase font-bold text-slate-500">Vues</div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                                <div className="text-xs sm:text-sm font-black text-emerald-400">{funnel.conversionsCount || 28}</div>
                                <div className="text-[9px] uppercase font-bold text-slate-500">Ventes</div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                                <div className="text-xs sm:text-sm font-black text-amber-400">{funnel.conversionRate || '19.7%'}</div>
                                <div className="text-[9px] uppercase font-bold text-slate-500">Taux Conv.</div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleLaunchFunnelForLive({ id: funnel.id, title: funnel.title, price: funnel.price } as any)}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Éditer dans le Builder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(funnelUrl)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[38px]"
                              title="Copier le lien public"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Lien</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Constructeur de Pages UltimateFunnelBuilder via React Portal pour affichage plein écran au-dessus de la modale */}
      {showWebinarFunnelBuilder && typeof document !== 'undefined' && createPortal(
        <UltimateFunnelBuilder
          isOpen={showWebinarFunnelBuilder}
          initialData={funnelInitialData || {
            id: 'webinar-' + Date.now(),
            title: title || (myWebinars[0]?.title) || 'Grand Live Shopping & Vente Directe',
            subtitle: description || (myWebinars[0]?.description) || 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
            image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80',
            price: isPaid ? Number(price) : (myWebinars[0]?.isPaid ? myWebinars[0].price : 0),
            originalPrice: (isPaid ? Number(price) : (myWebinars[0]?.isPaid ? (myWebinars[0].price || 0) : 0)) * 1.5 || 25000,
            instructor: storeName || 'Animateur Live NaNa',
            instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
            category: 'Live / Webinaire Haute Fréquence',
            duration: date ? `Diffusion le ${date}` : (myWebinars[0]?.date ? `Diffusion le ${myWebinars[0].date}` : 'Diffusion Directe Replay'),
            type: 'webinar'
          }}
          sourceType="webinar"
          onClose={() => setShowWebinarFunnelBuilder(false)}
          onSave={(async (saveData?: any) => {
            try {
              const src = saveData?.source;
              const newFunnelItem = {
                id: src?.id || ('funnel-' + Date.now()),
                title: src?.title || 'Tunnel Live Shopping',
                webinarTitle: src?.title || 'Session Live Shopping',
                price: src?.price || 0,
                viewsCount: 1,
                conversionsCount: 0,
                conversionRate: '0%',
                createdAt: Date.now(),
                slug: (src?.title || 'live').toLowerCase().replace(/[^a-z0-9]/g, '-')
              };
              const updated = [newFunnelItem, ...generatedFunnels.filter(f => f.id !== newFunnelItem.id)];
              setGeneratedFunnels(updated);
              localStorage.setItem('nana_webinar_funnels', JSON.stringify(updated));

              // Persistance universelle dans Firestore (funnels, deals, tenants, stores)
              const funnelSlug = newFunnelItem.slug || newFunnelItem.id;
              const webinarPayload = {
                id: funnelSlug,
                slug: funnelSlug,
                subdomain: funnelSlug,
                customDomain: null,
                title: newFunnelItem.title || 'Tunnel Live Shopping',
                funnelTitle: newFunnelItem.title || 'Tunnel Live Shopping',
                subtitle: src?.subtitle || 'Session interactive en direct',
                salePrice: newFunnelItem.price || 0,
                type: 'webinar',
                source: src,
                merchantWhatsapp: saveData?.merchantWhatsapp || '',
                isPublished: true,
                updatedAt: new Date().toISOString()
              };
              await registerSubdomainInFirebase(funnelSlug, webinarPayload.title, webinarPayload);
              await saveFunnelConfig(webinarPayload);
            } catch (err) {
              console.error('Error saving funnel:', err);
            }
          }) as any}
        />,
        document.body
      )}
    </div>
  );
};

export default CreateWebinarModal;
