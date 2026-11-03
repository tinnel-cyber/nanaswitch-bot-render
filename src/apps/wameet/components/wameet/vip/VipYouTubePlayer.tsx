import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  Users,
  Crown,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  Send,
  Coins,
  Sparkles,
  X,
  ChevronDown,
  Check,
  Flame,
  Award,
  GraduationCap
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';
import { ScreenRecordButton } from '../ScreenRecordButton';

// ─── Extraction Universelle de l'ID YouTube (URLs standards, Shorts, Live, et IFrame) ─
export function extractVipYouTubeId(input: string): string {
  if (!input || typeof input !== 'string') return 'jfKfPfyJRdk';
  const cleaned = input.trim();

  // 1. Déjà un ID direct de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Code Iframe Embed
  const iframeMatch = cleaned.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  const target = iframeMatch ? iframeMatch[1] : cleaned;

  // 3. Regex universelle YouTube (live, shorts, embed, watch, youtu.be)
  const pattern = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/|e\/))([a-zA-Z0-9_-]{11})/;
  const match = target.match(pattern);
  if (match && match[1]) {
    return match[1];
  }

  const vParam = target.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParam && vParam[1]) {
    return vParam[1];
  }

  return 'jfKfPfyJRdk';
}

export interface VipChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  isInstructor?: boolean;
  text: string;
  createdAt: string;
  isQuestion?: boolean;
  farotageAmountFcfa?: number;
}

export interface VipYouTubePlayerProps {
  /** Titre officiel du Salon VIP ou de la Masterclass */
  roomTitle?: string;
  /** Nom du formateur / coach certifié */
  instructorName?: string;
  /** Rôle / titre du formateur */
  instructorRole?: string;
  /** Avatar du formateur */
  instructorAvatar?: string;
  /** URL ou ID du flux YouTube Live */
  youtubeLiveUrl?: string;
  /** Nombre d'abonnés VIP connectés en direct */
  liveViewersCount?: number;
  /** Tarif mensuel du Salon */
  monthlyPriceFcfa?: number;
  /** Visibilité de la salle */
  isOpen?: boolean;
  /** Callback lors de la fermeture de la salle */
  onClose?: () => void;
  className?: string;
}

const INITIAL_VIP_MESSAGES: VipChatMessage[] = [
  {
    id: 'm-1',
    senderName: 'Prof. Amadou Diallo',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    senderRole: 'Formateur Certifié NaNa POS',
    isInstructor: true,
    text: 'Bienvenue dans notre Salon Privé ! Posez vos questions dans l’onglet Q&A, nous ferons une session de réponses en direct dans 20 minutes.',
    createdAt: '19:02'
  },
  {
    id: 'm-2',
    senderName: 'Awa Ouédraogo',
    senderAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&auto=format&fit=crop&q=80',
    senderRole: 'Membre VIP',
    text: 'Excellente introduction sur les contrats d’exportation vers Abidjan ! 👏',
    createdAt: '19:05',
    farotageAmountFcfa: 5000
  },
  {
    id: 'm-3',
    senderName: 'Moussa Kaboré',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    senderRole: 'Entrepreneur Pro',
    text: 'Est-il possible d’automatiser les retraits Wameet vers Moov Money sur le compte de la société ?',
    createdAt: '19:07',
    isQuestion: true
  }
];

/**
 * COMPOSANT VipYouTubePlayer (Prompt 50 : L'Intégration YouTube Live pour les Salles VIP)
 * 
 * Directives Techniques et UI/UX :
 * 1. Le Lecteur VipYouTubePlayer :
 *    - Iframe optimisée headless en arrière-plan (absolute inset-0 z-0)
 *    - Paramètres de nettoyage strict : controls=0 (aucun contrôle YT), modestbranding=1, rel=0, disablekb=1, autoplay=1, playsinline=1, enablejsapi=1
 *    - L'interface Wameet gère le Play/Pause en surimpression native.
 * 2. L'Overlay Wameet (z-10 / z-20) :
 *    - Vrai Header Wameet : Nom du Salon, badge "VIP LIVE" animé, nombre de participants en direct, bouton Fermer.
 *    - Système de Chat VIP / Q&A avec des bulles Wameet, complètement déconnecté du chat YouTube.
 *    - Contrôles Wameet tactiles en surimpression : Play/Pause central, Mute/Unmute, Plein écran, Farotage VIP Wameet.
 */
export const VipYouTubePlayer: React.FC<VipYouTubePlayerProps> = ({
  roomTitle = 'Club Élite Business & Tontine Privée',
  instructorName = 'Prof. Amadou Diallo',
  instructorRole = 'Stratège Commerce & Export',
  instructorAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  youtubeLiveUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  liveViewersCount = 84,
  monthlyPriceFcfa = 25000,
  isOpen = true,
  onClose,
  className = ''
}) => {
  // États de lecture multimédia Wameet
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCenterPlayHint, setShowCenterPlayHint] = useState<boolean>(false);

  // Onglet Chat VIP vs Q&A Questions
  const [activeTab, setActiveTab] = useState<'chat' | 'qa'>('chat');
  const [messages, setMessages] = useState<VipChatMessage[]>(INITIAL_VIP_MESSAGES);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isQuestionToggle, setIsQuestionToggle] = useState<boolean>(false);
  const [showFarotageModal, setShowFarotageModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extraction propre de l'ID YouTube
  const youtubeVideoId = useMemo(() => extractVipYouTubeId(youtubeLiveUrl), [youtubeLiveUrl]);

  // URL Iframe avec tous les paramètres de nettoyage visuel strict
  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: '1',
      controls: '0', // Masquage total des contrôles YouTube natifs
      modestbranding: '1', // Masquage du logo YouTube
      rel: '0', // Pas de vidéos recommandées externes
      disablekb: '1', // Désactive les raccourcis clavier YouTube
      playsinline: '1', // Lecture intégrée mobile
      enablejsapi: '1', // Pilote API JS Wameet
      iv_load_policy: '3', // Masque les annotations et bannières
      mute: isMuted ? '1' : '0',
      loop: '1'
    });
    return `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?${params.toString()}`;
  }, [youtubeVideoId, isMuted]);

  // Défilement automatique du chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Bascule Play/Pause native Wameet avec retour visuel
  const handleTogglePlay = useCallback(() => {
    playTapBeep();
    setIsPlaying((prev) => {
      const next = !prev;
      setShowCenterPlayHint(true);
      setTimeout(() => setShowCenterPlayHint(false), 900);

      // Communication JS API avec l'iframe YouTube sans contrôles externes
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: next ? 'playVideo' : 'pauseVideo',
            args: []
          }),
          '*'
        );
      }
      return next;
    });
  }, []);

  // Bascule Mute/Unmute
  const handleToggleMute = useCallback(() => {
    playTapBeep();
    setIsMuted((prev) => {
      const next = !prev;
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: next ? 'mute' : 'unMute',
            args: []
          }),
          '*'
        );
      }
      return next;
    });
  }, []);

  // Plein écran
  const handleToggleFullscreen = () => {
    playTapBeep();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Envoi d'un message dans le Chat VIP Wameet
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    playValidationBeep();

    const newMsg: VipChatMessage = {
      id: `vip-msg-${Date.now()}`,
      senderName: 'Vous (Membre VIP)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      senderRole: 'Abonné VIP',
      text: inputMessage.trim(),
      createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isQuestion: isQuestionToggle
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setIsQuestionToggle(false);
  };

  // Envoi d'un pourboire Farotage VIP au formateur
  const handleSendFarotage = (amount: number) => {
    playCashChime();
    const newMsg: VipChatMessage = {
      id: `vip-farot-${Date.now()}`,
      senderName: 'Vous (Membre VIP)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      senderRole: 'Faroteur VIP',
      text: `💸 Farotage d'honneur de ${amount.toLocaleString('fr-FR')} FCFA envoyé au Formateur !`,
      createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      farotageAmountFcfa: amount
    };
    setMessages((prev) => [...prev, newMsg]);
    setShowFarotageModal(false);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none overflow-hidden animate-in fade-in duration-200 ${className}`}
    >
      {/* =====================================================================
          1. LECTEUR YOUTUBE EN ARRIÈRE-PLAN (absolute inset-0 z-0)
             Strictement nettoyé : controls=0, modestbranding=1, rel=0, disablekb=1
         ===================================================================== */}
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
        <iframe
          ref={iframeRef}
          key={`wameet-vip-yt-${youtubeVideoId}`}
          src={embedSrc}
          title={roomTitle}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130vw] h-[130vh] max-w-none border-0 pointer-events-none select-none opacity-95"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Halo et Gradient de lisibilité par-dessus le flux YouTube */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80 pointer-events-none" />
      </div>

      {/* =====================================================================
          2. L'OVERLAY WAMEET (z-10 / z-20)
             Par-dessus YouTube, place le vrai Header Wameet et les contrôles
         ===================================================================== */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-3 sm:p-5 max-w-5xl mx-auto w-full h-full pointer-events-auto">
        {/* Header Wameet Officiel (Haut) */}
        <header className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-amber-500/30 shadow-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Badge Couronne VIP */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>VIP Live</span>
                </span>
                <span className="text-[11px] font-bold text-amber-300">
                  {monthlyPriceFcfa.toLocaleString('fr-FR')} F/mois
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                {roomTitle}
              </h1>
              <div className="text-[10px] text-slate-300 truncate">
                {instructorName} • {instructorRole}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton d'Enregistrement d'Écran Local (Prompt 52) */}
            <ScreenRecordButton
              sessionTitle={roomTitle}
              variant="pill"
            />

            {/* Compteur de Participants Direct */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-200">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{liveViewersCount}</span>
            </div>

            {/* Bouton Quitter */}
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                title="Fermer la Salle VIP"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Zone Centrale Tactile (Bouton Play/Pause en surimpression native) */}
        <div
          onClick={handleTogglePlay}
          className="flex-1 flex items-center justify-center cursor-pointer relative group"
        >
          {/* Indicateur de bascule temporaire */}
          <div
            className={`w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl transition-all duration-300 ${
              showCenterPlayHint ? 'scale-110 opacity-100' : 'opacity-0 scale-95 group-hover:opacity-60'
            }`}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-white translate-x-0.5" />}
          </div>
        </div>

        {/* Zone Inférieure : Contrôles Wameet & Chat VIP / Q&A Hybride */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0 max-h-[46vh] sm:max-h-[42vh]">
          {/* Panneau Gauche : Statut Formateur & Contrôles Média Wameet */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={instructorAvatar}
                  alt={instructorName}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400"
                />
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    <span>{instructorName}</span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Transmission Sécurisée • Wameet Escrow
                  </div>
                </div>
              </div>

              {/* Bouton Farotage Formateur */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setShowFarotageModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer transition"
              >
                <Flame className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                <span>Faroter le Coach</span>
              </button>
            </div>

            {/* Rassurance Cryptographique */}
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Flux VIP Sans Publicité</span>
              </span>
              <span>100% Inclus dans l'Abonnement</span>
            </div>

            {/* Barre de Contrôles Média Wameet */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition active:scale-95"
                  title={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition active:scale-95"
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-[11px] font-semibold text-slate-400 ml-1">
                  HD 1080p • 60 FPS
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-95"
                title="Plein Écran"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Panneau Droit : Chat VIP & Q&A Wameet (Déconnecté de YouTube) */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex flex-col justify-between overflow-hidden shadow-xl">
            {/* Onglets Chat VIP vs Q&A */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveTab('chat');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  💬 Chat Privé VIP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveTab('qa');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'qa'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questions & Réponses</span>
                </button>
              </div>

              <span className="text-[10px] font-bold text-slate-400">
                Wameet Sync
              </span>
            </div>

            {/* Liste Défilante des Messages du Chat VIP */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs max-h-36 scrollbar-thin">
              {messages
                .filter((m) => (activeTab === 'qa' ? m.isQuestion : true))
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl text-left ${
                      msg.isInstructor
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                        : msg.farotageAmountFcfa
                        ? 'bg-gradient-to-r from-amber-950/70 to-yellow-950/70 border border-amber-400/50 text-amber-200'
                        : msg.isQuestion
                        ? 'bg-blue-950/60 border border-blue-500/40 text-blue-200'
                        : 'bg-slate-800/60 border border-slate-700/50 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-0.5">
                      <span className="flex items-center gap-1 font-black text-white">
                        {msg.senderName}
                        {msg.isInstructor && <Crown className="w-3 h-3 text-amber-400" />}
                        {msg.isQuestion && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-blue-500 text-white font-black">
                            QUESTION
                          </span>
                        )}
                      </span>
                      <span>{msg.createdAt}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-normal">
                      {msg.text}
                    </p>
                  </div>
                ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Formulaire d'envoi Wameet */}
            <form onSubmit={handleSendMessage} className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsQuestionToggle((prev) => !prev);
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer shrink-0 border ${
                  isQuestionToggle
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Marquer comme question prioritaire"
              >
                Q&A
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isQuestionToggle ? 'Poser une question au coach...' : 'Écrire aux membres VIP...'}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <Send className="w-3.5 h-3.5 fill-slate-950" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MODALE FAROTAGE VIP (Via Wameet Pay)
         ===================================================================== */}
      {showFarotageModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-amber-400">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Farotage VIP Formateur</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFarotageModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Soutenez {instructorName} pour la qualité de sa masterclass. Les fonds sont versés instantanément sur son compte Wameet.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[2000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSendFarotage(amt)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-black transition cursor-pointer border border-slate-700"
                >
                  {amt.toLocaleString('fr-FR')} F
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipYouTubePlayer;
