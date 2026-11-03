/**
 * @file SalleVipRoomView.tsx
 * @description Vue individuelle d'une Salle VIP E-learning (Routes: /salles-vip/:id, /vip/salle/:id)
 * Propose deux onglets ("Leçons Vidéo" et "Direct"), un lecteur vidéo universel (S3/MP4/YouTube),
 * et un Chat en direct temps réel branché sur la logique WebSocket de Smart Haggle / Wameet Sync.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Users,
  Video,
  Send,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Check,
  HelpCircle,
  Coins,
  Flame,
  ThumbsUp,
  Heart,
  Lightbulb,
  ExternalLink,
  Clock,
  BookOpen,
  ScreenShare
} from 'lucide-react';
import { VipRoom, VipLesson, getVipRoomById } from '../../services/vipRoomsService';
import { useVipRoomChat } from '../../../../hooks/useVipRoomChat';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import { extractVipYouTubeId } from '../../../../components/wameet/vip/VipYouTubePlayer';
import { ScreenRecordButton } from '../../../../components/wameet/ScreenRecordButton';

export interface SalleVipRoomViewProps {
  roomId: string;
  onBackToDiscovery: () => void;
  currentUser?: any;
}

export type VipRoomTab = 'LESSONS' | 'LIVE';

export const SalleVipRoomView: React.FC<SalleVipRoomViewProps> = ({
  roomId,
  onBackToDiscovery,
  currentUser
}) => {
  const [room, setRoom] = useState<VipRoom | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<VipRoomTab>('LESSONS');
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Contrôles du lecteur vidéo local
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Chat WebSocket
  const [chatInputText, setChatInputText] = useState<string>('');
  const [isQuestionMode, setIsQuestionMode] = useState<boolean>(false);
  const [isFarotageMenuOpen, setIsFarotageMenuOpen] = useState<boolean>(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Chargement des détails de la salle
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getVipRoomById(roomId).then((data) => {
      if (!isCancelled) {
        setRoom(data);
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [roomId]);

  // Hook Chat WebSocket en temps réel
  const {
    messages,
    isConnected,
    participantsCount,
    sendMessage,
    sendFarotageTip,
    sendReaction,
    activeReaction
  } = useVipRoomChat({
    roomId,
    currentUser,
    expertName: room?.expertName,
    expertAvatar: room?.expertAvatar
  });

  // Défilement automatique vers le bas à chaque nouveau message
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Leçon actuellement sélectionnée
  const activeLesson: VipLesson | undefined = room?.lessons[activeLessonIndex] || room?.lessons[0];

  // Gestion de la lecture vidéo
  const togglePlay = () => {
    playTapBeep();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (speed: number) => {
    playTapBeep();
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleLessonCompleted = (lessonId: string) => {
    playValidationBeep();
    setCompletedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    sendMessage(chatInputText, isQuestionMode);
    setChatInputText('');
    setIsQuestionMode(false);
  };

  const handleShareRoom = () => {
    playTapBeep();
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !room) {
    return (
      <div className="min-h-screen bg-[#060B18] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <span className="text-sm font-bold text-slate-300">
          Connexion à la Salle VIP {roomId}...
        </span>
      </div>
    );
  }

  // Détection si la leçon est un lien YouTube ou une vidéo directe (S3 / MP4)
  const isLessonYouTube = activeLesson?.videoUrl?.includes('youtube.com') || activeLesson?.videoUrl?.includes('youtu.be');
  const youtubeVideoId = isLessonYouTube && activeLesson ? extractVipYouTubeId(activeLesson.videoUrl) : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#4169E1] selection:text-white">
      {/* ─── En-tête Navigation Supérieure : Bleu Royal (#4169E1) ─────────── */}
      <header className="sticky top-0 z-40 bg-[#4169E1] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBackToDiscovery();
              }}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Retour aux Salles VIP"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Toutes les Salles</span>
            </button>

            <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-[#4169E1] shrink-0 shadow-xs">
                VIP
              </span>
              <h1 className="text-sm sm:text-base font-black text-white truncate">
                {room.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Statut WebSocket */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isConnected
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/10 border-white/20 text-blue-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isConnected ? `${participantsCount} en ligne` : 'Connexion...'}</span>
            </div>

            <button
              type="button"
              onClick={handleShareRoom}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Partager le lien de la salle"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4 text-white" />}
              <span className="hidden sm:inline">{copiedLink ? 'Lien copié !' : 'Partager'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Onglets Principaux ("Leçons Vidéo" & "Direct") : Blanc Pur ────── */}
      <nav aria-label="Onglets de la salle" className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('LESSONS');
              }}
              className={`px-4 sm:px-6 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'LESSONS'
                  ? 'bg-[#4169E1] text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Leçons Vidéo</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'LESSONS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {room.lessons.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('LIVE');
              }}
              className={`px-4 sm:px-6 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'LIVE'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Direct</span>
              {room.isLiveNow && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Formateur Badge */}
          <div className="hidden md:flex items-center gap-2.5">
            <img
              src={room.expertAvatar}
              alt={room.expertName}
              className="w-8 h-8 rounded-full object-cover border-2 border-[#4169E1]"
            />
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block leading-none">{room.expertName}</span>
              <span className="text-[10px] text-[#4169E1] font-semibold">{room.expertRole}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Contenu Principal : Grille 2 Volets (Vidéo à Gauche / Chat à Droite) ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── VOLET GAUCHE (Vidéo & Modules) : 8 Colonnes ─────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* TAB 1 : LEÇONS VIDÉO */}
          {activeTab === 'LESSONS' && (
            <div className="space-y-4">
              {/* Conteneur Lecteur Vidéo */}
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center group">
                {isLessonYouTube && youtubeVideoId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&modestbranding=1&rel=0&controls=1&playsinline=1`}
                    title={activeLesson?.title || 'Leçon Vidéo'}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activeLesson?.videoUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={activeLesson.videoUrl}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={togglePlay}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => {
                        setIsPlaying(false);
                        if (activeLesson) toggleLessonCompleted(activeLesson.id);
                      }}
                      playsInline
                    />

                    {/* Bouton Play Central si en pause */}
                    {!isPlaying && (
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center hover:scale-110 transition-transform shadow-2xl cursor-pointer"
                      >
                        <Play className="w-8 h-8 fill-slate-950 translate-x-0.5" />
                      </button>
                    )}

                    {/* Barre de Contrôle Inférieure */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                      {/* Barre de progression */}
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />

                      <div className="flex items-center justify-between text-xs text-white">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={togglePlay} className="cursor-pointer">
                            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                          </button>
                          <button type="button" onClick={toggleMute} className="cursor-pointer">
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <span className="font-mono text-[11px] text-slate-300">
                            {formatSeconds(currentTime)} / {formatSeconds(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Sélecteur de vitesse */}
                          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-lg border border-slate-700">
                            {[1, 1.25, 1.5, 2].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleSpeedChange(s)}
                                className={`text-[10px] font-bold px-1 rounded ${
                                  playbackSpeed === s ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (videoRef.current?.requestFullscreen) {
                                videoRef.current.requestFullscreen();
                              }
                            }}
                            className="cursor-pointer text-slate-300 hover:text-white"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Video className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">Aucune vidéo configurée pour cette leçon</p>
                  </div>
                )}
              </div>

              {/* Détails de la Leçon Actuelle */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Module {activeLessonIndex + 1} sur {room.lessons.length}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                      {activeLesson?.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeLesson && (
                      <button
                        type="button"
                        onClick={() => toggleLessonCompleted(activeLesson.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          completedLessonIds.has(activeLesson.id)
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{completedLessonIds.has(activeLesson.id) ? 'Complété' : 'Marquer comme vu'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {activeLesson?.description || room.description}
                </p>

                {/* Playlist des Leçons */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#4169E1]" />
                    <span>Programme des Leçons de la Masterclass</span>
                  </h3>

                  <div className="grid grid-cols-1 gap-2">
                    {room.lessons.map((lesson, idx) => {
                      const isCurrent = idx === activeLessonIndex;
                      const isCompleted = completedLessonIds.has(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            playTapBeep();
                            setActiveLessonIndex(idx);
                            setIsPlaying(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              playTapBeep();
                              setActiveLessonIndex(idx);
                              setIsPlaying(false);
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-50/80 border-2 border-[#4169E1] shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-[#4169E1] text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                            </div>
                            <div className="truncate">
                              <span className={`text-xs font-bold block truncate ${isCurrent ? 'text-[#4169E1]' : 'text-slate-900'}`}>
                                {lesson.title}
                              </span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {lesson.duration}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#4169E1] text-white shadow-2xs">
                                En cours
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 : DIRECT / LIVE STREAMING */}
          {activeTab === 'LIVE' && (
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-slate-200 shadow-xl flex items-center justify-center">
                {room.liveStreamUrl ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${extractVipYouTubeId(room.liveStreamUrl)}?autoplay=1&modestbranding=1&rel=0&controls=1&playsinline=1`}
                    title="Direct VIP"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-8 bg-white">
                    <Radio className="w-12 h-12 text-rose-500 animate-pulse mx-auto mb-2" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">Session en Direct Prévue</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Le formateur {room.expertName} démarrera le flux vidéo en direct très bientôt. Restez connectés dans le chat.
                    </p>
                  </div>
                )}

                {/* Badge Direct en superposition */}
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1.5 shadow-md animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>Direct VIP</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-800 border border-slate-200">
                    {participantsCount} spectateurs
                  </span>
                </div>

                {/* Bouton Enregistrement d'écran local */}
                <div className="absolute top-3 right-3">
                  <ScreenRecordButton />
                </div>
              </div>

              {/* Présentation du Direct : Carte Blanc Pur */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5 font-bold">
                    <Radio className="w-3.5 h-3.5 text-rose-600" />
                    <span>Session Interactive & Questions-Réponses</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Faible latence</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">
                  Échange direct avec {room.expertName}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Posez vos questions dans le chat de droite. L'expert y répondra directement à la fin de chaque démonstration pratique.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── VOLET DROIT (Chat en Direct WebSocket Smart Haggle) : Blanc Pur ── */}
        <aside className="lg:col-span-4 flex flex-col h-[600px] lg:h-[calc(100vh-10rem)] rounded-3xl bg-white border-2 border-slate-200 shadow-xl overflow-hidden sticky top-20">
          {/* En-tête du Chat : Bleu Royal (#4169E1) */}
          <div className="p-3.5 sm:p-4 bg-[#4169E1] text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white">
                  Chat en Direct & Q&A
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[10px] text-blue-100">
                {isConnected ? 'Connecté au WebSocket VIP' : 'Reconnexion au serveur...'}
              </p>
            </div>

            {/* Réaction jubilatoire volante */}
            {activeReaction && (
              <div className="text-2xl animate-bounce">
                {activeReaction}
              </div>
            )}
          </div>

          {/* Liste des Messages avec Défilement */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70">
            {messages.map((msg) => {
              const isMe = msg.senderId === (currentUser?.uid || currentUser?.id);
              const isInstructor = msg.senderRole === 'instructor';
              const isFarotage = Boolean(msg.farotageAmountFcfa);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-4 h-4 rounded-full object-cover border border-[#4169E1]/30"
                    />
                    <span className="text-[10px] font-bold text-slate-700">
                      {msg.senderName}
                    </span>
                    {isInstructor && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-[#4169E1] text-white">
                        Formateur
                      </span>
                    )}
                    {msg.isQuestion && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-indigo-600 text-white">
                        Question
                      </span>
                    )}
                  </div>

                  {/* Bulle de Message */}
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isFarotage
                        ? 'bg-amber-100 border border-amber-300 text-amber-900 font-semibold'
                        : msg.isQuestion
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : isMe
                        ? 'bg-[#4169E1] text-white font-medium rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 mt-0.5 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Barre de Réactions Rapides & Farotage */}
          <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {['👏', '🔥', '💡', '❤️'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs transition cursor-pointer active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFarotageMenuOpen(!isFarotageMenuOpen)}
                className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              >
                <Coins className="w-3 h-3 text-amber-500" />
                <span>Faroter</span>
              </button>

              {/* Menu Farotage */}
              {isFarotageMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl bg-white border-2 border-amber-300 shadow-xl flex flex-col gap-1 z-50 w-36 animate-in slide-in-from-bottom-2">
                  <span className="text-[9px] font-black uppercase text-amber-700 text-center mb-1">
                    Offrir un Pourboire
                  </span>
                  {[500, 1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        sendFarotageTip(amt);
                        setIsFarotageMenuOpen(false);
                      }}
                      className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-[#4169E1] hover:text-white text-slate-800 text-xs font-bold transition text-left cursor-pointer"
                    >
                      +{amt.toLocaleString('fr-FR')} FCFA
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Formulaire de Saisie du Message */}
          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <button
                type="button"
                onClick={() => setIsQuestionMode(!isQuestionMode)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                  isQuestionMode
                    ? 'bg-[#4169E1] text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                <span>Mode Question (Q&A)</span>
              </button>

              <span className="text-slate-400">Touche Entrée ↵</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder={isQuestionMode ? "Posez votre question à l'expert..." : 'Partagez votre message en direct...'}
                className="flex-1 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4169E1]"
              />

              <button
                type="submit"
                disabled={!chatInputText.trim()}
                className="w-9 h-9 rounded-2xl bg-[#4169E1] hover:bg-[#3154b3] text-white flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 shadow-md shadow-blue-500/20"
              >
                <Send className="w-4 h-4 fill-white" />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default SalleVipRoomView;

