import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Clock, Calendar, Users, Radio, Sparkles, Share2, Check, Copy, 
  PhoneCall, MessageSquare, ThumbsUp, Send, ShieldCheck, Camera, 
  Mic, Volume2, Play, ArrowRight, Lock, GraduationCap, UserCheck, 
  Video, AlertCircle, RefreshCw, Award, CheckCircle2, ExternalLink, DollarSign
} from 'lucide-react';
import { LivePlatform, LiveRoomMode, LiveRoomStatus } from '../../../../types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { NanasorePaymentGateway, PaymentSuccessDetails } from '../../../../components/payment/NanasorePaymentGateway';

export interface SmartWaitingRoomProps {
  webinarId: string;
  title: string;
  description?: string;
  date: string;
  status: LiveRoomStatus;
  roomMode?: LiveRoomMode;
  hostName?: string;
  storeName?: string;
  hostPhone?: string;
  hostAvatarUrl?: string;
  isHost?: boolean;
  isPaid?: boolean;
  price?: number;
  currency?: string;
  platform?: LivePlatform;
  meetingUrl?: string;
  onEnterLive: () => void;
  onStartBroadcast?: () => void;
  onShareLink?: () => void;
  onPaymentValidated?: (details: PaymentSuccessDetails) => void;
  className?: string;
}

interface PreLiveQuestion {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  time: string;
  hasVoted?: boolean;
}

export const SmartWaitingRoom: React.FC<SmartWaitingRoomProps> = ({
  webinarId,
  title,
  description,
  date,
  status,
  roomMode = 'WEBINAR',
  hostName = 'Ibrahim Pousbila Konkobo',
  storeName = 'ENTREPRISE KONKOBO POUSBILA',
  hostPhone = '+226 70 00 00 00',
  hostAvatarUrl,
  isHost = false,
  isPaid = false,
  price = 0,
  currency = 'FCFA',
  platform = 'daily',
  meetingUrl = '',
  onEnterLive,
  onStartBroadcast,
  onShareLink,
  onPaymentValidated,
  className = ''
}) => {
  // État de paiement du participant
  const [hasPaid, setHasPaid] = useState<boolean>(() => {
    if (isHost) return true;
    if (!isPaid || !price || price <= 0) return true;
    try {
      const paidKey = localStorage.getItem('nana_paid_webinar_' + webinarId);
      return !!paidKey;
    } catch {
      return false;
    }
  });

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [copiedMeetingUrl, setCopiedMeetingUrl] = useState(false);

  // Calcul dynamique du compte à rebours
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  // Liste interactive des questions pré-live
  const [questions, setQuestions] = useState<PreLiveQuestion[]>([
    {
      id: 'q-1',
      author: 'Aïcha O.',
      text: 'Y aura-t-il des promotions spéciales sur les nouveautés pendant la diffusion ?',
      upvotes: 14,
      time: 'Il y a 10 min'
    },
    {
      id: 'q-2',
      author: 'Moussa K.',
      text: 'Est-il possible de payer directement par Orange Money ou Moov Money durant la session ?',
      upvotes: 9,
      time: 'Il y a 18 min'
    }
  ]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [copied, setCopied] = useState(false);

  // Test matériel pour mode CLASSROOM et hôte
  const [micTestPassed, setMicTestPassed] = useState(true);
  const [camTestPassed, setCamTestPassed] = useState(true);

  useEffect(() => {
    if (!date) return;
    const targetTime = new Date(date).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isPast: false
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [date]);

  const handleCopyLink = async () => {
    playTapBeep();
    if (onShareLink) {
      onShareLink();
    } else {
      const url = typeof window !== 'undefined' ? window.location.href : `https://nanasore.com/live/${webinarId}`;
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        try {
          await (navigator as any).share({
            title: title || 'Nanasore Live Shopping',
            url: url,
          });
          return;
        } catch (err) {}
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyMeetingDirect = () => {
    if (!meetingUrl) return;
    playTapBeep();
    navigator.clipboard.writeText(meetingUrl);
    setCopiedMeetingUrl(true);
    setTimeout(() => setCopiedMeetingUrl(false), 2500);
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    playTapBeep();

    const author = authorName.trim() || 'Visiteur';
    const newQ: PreLiveQuestion = {
      id: `q-${Date.now()}`,
      author,
      text: newQuestionText.trim(),
      upvotes: 1,
      time: 'À l’instant',
      hasVoted: true
    };

    setQuestions(prev => [newQ, ...prev]);
    setNewQuestionText('');
  };

  const handleUpvote = (id: string) => {
    playTapBeep();
    setQuestions(prev =>
      prev.map(q => {
        if (q.id === id) {
          const hasVoted = q.hasVoted;
          return {
            ...q,
            upvotes: hasVoted ? q.upvotes - 1 : q.upvotes + 1,
            hasVoted: !hasVoted
          };
        }
        return q;
      })
    );
  };

  const isReadyToEnter = status === 'live' || timeLeft.isPast;
  const isExternalMeeting = platform === 'zoom' || platform === 'google_meet' || platform === 'google_classroom';

  return (
    <div className={`max-w-4xl mx-auto w-full space-y-6 pb-12 ${className}`}>
      {/* 1. Carte Héro : Titre, Badge Direct & Présentation */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-4">
        {/* Halo décoratif d'arrière-plan */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge d'état interactif */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider shadow-inner">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>
            {status === 'live' 
              ? 'En Direct Maintenant' 
              : roomMode === 'CLASSROOM' 
                ? 'Classe Virtuelle Active' 
                : 'Salle d\'Attente Interactive'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        </div>

        {/* Titre & Description */}
        <div className="max-w-2xl mx-auto space-y-2">
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {description}
            </p>
          )}
        </div>

        {/* Badge de Prix / Accès Nanasore */}
        {isPaid && price > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Tarif d'accès : {formatCFA(price)}</span>
            {hasPaid && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Validé ✅
              </span>
            )}
          </div>
        )}

        {/* Compteur à Rebours Synchronisé */}
        {status !== 'live' && (
          <div className="pt-2 grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-indigo-950/30 to-slate-950">
              <div className="text-2xl sm:text-3xl font-black text-white">{timeLeft.days}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Jours</div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-indigo-950/30 to-slate-950">
              <div className="text-2xl sm:text-3xl font-black text-white">{timeLeft.hours}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Heures</div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-indigo-950/30 to-slate-950">
              <div className="text-2xl sm:text-3xl font-black text-white">{timeLeft.minutes}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Minutes</div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-rose-950/30 to-slate-950">
              <div className="text-2xl sm:text-3xl font-black text-rose-400">{timeLeft.seconds}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Secondes</div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* GESTION DU VERROUILLAGE NANASORE PAYMENT GATEWAY         */}
        {/* ======================================================== */}
        {!isHost && isPaid && price > 0 && !hasPaid ? (
          <div className="pt-4 max-w-lg mx-auto">
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/40 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs sm:text-sm">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Session Payante & Verrouillée</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                  {formatCFA(price)}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                L'accès à cette session {isExternalMeeting ? `(${platform.toUpperCase()})` : 'Live'} requiert un billet d'accès sécurisé. Réglez par Orange Money, Moov Money, Wave ou MTN pour déverrouiller instantanément le direct.
              </p>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setShowPaymentGateway(true);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 transition cursor-pointer min-h-[48px]"
              >
                <ShieldCheck className="w-5 h-5 fill-slate-950" />
                <span>Payer mon accès ({formatCFA(price)}) via Nanasore Pay</span>
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* ACCÈS DÉBLOQUÉ (SOIT PAYÉ, SOIT GRATUIT, SOIT HÔTE)       */
          /* ======================================================== */
          <div className="pt-2 max-w-lg mx-auto space-y-3">
            {/* Si c'est Zoom, Google Meet ou Google Classroom */}
            {isExternalMeeting && meetingUrl && (
              <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Lien de Visioconférence Déverrouillé</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {platform === 'zoom' ? 'Zoom' : platform === 'google_meet' ? 'Google Meet' : 'Classroom'}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Votre accès est actif. Cliquez pour rejoindre la réunion ou copiez le lien direct :
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition min-h-[44px]"
                  >
                    <Video className="w-4 h-4" />
                    <span>Rejoindre la Réunion ({platform.toUpperCase()})</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyMeetingDirect}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    {copiedMeetingUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMeetingUrl ? "Copié !" : "Copier le lien"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Boutons d'Action Principaux */}
            <div className="flex flex-col sm:flex-row gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => { playValidationBeep(); onStartBroadcast ? onStartBroadcast() : onEnterLive(); }}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-950/50 transition cursor-pointer min-h-[48px]"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>Démarrer le Direct maintenant (Animateur)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { playValidationBeep(); onEnterLive(); }}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer min-h-[48px] ${
                    isReadyToEnter
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isReadyToEnter ? "Entrer dans la Salle Live" : "Entrer en Salle d'Attente Interactive"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-3.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition border border-slate-700 min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
                <span>{copied ? "Lien copié !" : "Partager l'événement"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Carte d'Identité de l'Animateur & Établissement Certifié */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-left w-full sm:w-auto">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-rose-600 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0 overflow-hidden border-2 border-indigo-500/30">
            {hostAvatarUrl ? (
              <img src={hostAvatarUrl} alt={hostName} className="w-full h-full object-cover" />
            ) : (
              <span>{hostName.slice(0, 2).toUpperCase()}</span>
            )}
            <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full border-2 border-slate-900" title="En ligne">
              <span className="sr-only">En ligne</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">{hostName}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-400" />
                <span>Hôte Vérifié</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{storeName}</p>
          </div>
        </div>

        {hostPhone && (
          <a
            href={`tel:${hostPhone}`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-bold border border-slate-700"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>Assistance : {hostPhone}</span>
          </a>
        )}
      </div>

      {/* 3. Questions / Réponses Pré-Live */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-black text-white">Questions & Sujets Pré-Live</h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {questions.length} question{questions.length > 1 ? 's' : ''} posée{questions.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Formulaire d'ajout de question */}
        <form onSubmit={handleAddQuestion} className="space-y-2">
          <div className="flex gap-2">
            <input 
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Votre prénom..."
              className="w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <input 
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Posez votre question à l'animateur..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center min-h-[40px] cursor-pointer"
              title="Envoyer la question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Liste des questions */}
        <div className="space-y-2 max-h-60 overflow-y-auto overscroll-y-contain pr-1">
          {questions.map((q) => (
            <div 
              key={q.id} 
              className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{q.author}</span>
                  <span className="text-[10px] text-slate-500">{q.time}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-snug">{q.text}</p>
              </div>

              <button
                type="button"
                onClick={() => handleUpvote(q.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[36px] ${
                  q.hasVoted 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title="Voter pour cette question"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${q.hasVoted ? 'fill-current' : ''}`} />
                <span>{q.upvotes}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* PASSERELLE DE PAIEMENT NANASORE PAYMENT GATEWAY          */}
      {/* ======================================================== */}
      {showPaymentGateway && (
        <NanasorePaymentGateway
          isModal={true}
          amount={price}
          productType="digital"
          currency={currency || "FCFA"}
          orderDescription={`Billet d'accès : ${title}`}
          orderId={`webinar-${webinarId}`}
          onSuccess={(details: PaymentSuccessDetails) => {
            try {
              localStorage.setItem('nana_paid_webinar_' + webinarId, details.transactionId || 'VALIDATED');
            } catch {}
            setHasPaid(true);
            setShowPaymentGateway(false);
            playValidationBeep();
            if (onPaymentValidated) onPaymentValidated(details);
          }}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}
    </div>
  );
};

export default SmartWaitingRoom;
