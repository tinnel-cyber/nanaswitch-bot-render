import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Flame, Clock, CheckCircle2, ShieldCheck, Volume2, 
  VolumeX, Gift, Users, Award, ArrowRight, MessageCircle, 
  Sparkles, Check, ChevronDown, Lock, PhoneCall, Zap, Star,
  BookOpen, ChevronRight, Play, Smartphone, ArrowLeftRight,
  Layers, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PromoCampaign, CampaignBonusItem } from '../../../../../types/campaign';
import { 
  getCampaignById, 
  trackCampaignVisit, 
  trackCampaignConversion, 
  injectOpenGraphMeta,
  getOptimizedImageUrl,
  SEED_PROMO_CAMPAIGNS 
} from '../../../../../services/campaignService';
import { getMarketplaceCourseById } from '../../../../../services/marketplaceService';
import { MarketplaceCourse } from '../marketplace/types';
import { playCashChime, playTapBeep, playValidationBeep } from '../../../../../utils/audio';

// CODE-SPLITTING AGGRESSIF : La modale lourde de paiement Mobile Money est chargée strictement à la demande
const FrictionlessAfricanCheckoutBottomSheet = React.lazy(() => 
  import('../marketplace/FrictionlessAfricanCheckoutBottomSheet').then(m => ({ 
    default: m.FrictionlessAfricanCheckoutBottomSheet 
  }))
);

interface HighTechFunnelPageProps {
  campaignId: string;
  onEnrollSuccess?: (courseId: string) => void;
  className?: string;
}

// Notifications de preuve sociale en direct
const SOCIAL_PROOF_PULSES = [
  { name: 'Moussa D.', city: 'Ouagadougou', provider: 'Orange Money', timeAgo: 'il y a 3 min' },
  { name: 'Aïcha K.', city: 'Abidjan', provider: 'Wave', timeAgo: 'il y a 7 min' },
  { name: 'Cheikh N.', city: 'Dakar', provider: 'Wave', timeAgo: 'il y a 12 min' },
  { name: 'Romuald B.', city: 'Cotonou', provider: 'Moov Money', timeAgo: 'il y a 18 min' },
  { name: 'Salif T.', city: 'Bamako', provider: 'Orange Money', timeAgo: 'il y a 24 min' }
];

/* =========================================================================
   COMPOSANT 1 : COMPTE À REBOURS PULSATILE ISOLÉ (ZÉRO RE-RENDU DU PARENT)
   Isolé avec son propre cycle 45ms pour préserver 60 FPS lors du scroll
   ========================================================================= */
interface PulsatingCountdownTimerProps {
  deadlineTimestamp: number;
  discountPercent: number;
  remainingSeats: number;
}

const PulsatingCountdownTimer: React.FC<PulsatingCountdownTimerProps> = React.memo(({
  deadlineTimestamp,
  discountPercent,
  remainingSeats
}) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
    millis: 99
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = deadlineTimestamp - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, millis: 0 });
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const millis = Math.floor((diff % 1000) / 10);

      setTimeLeft({ hours, minutes, seconds, millis });
    }, 45);

    return () => clearInterval(interval);
  }, [deadlineTimestamp]);

  return (
    <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-emerald-500/30 px-3 py-2.5 shadow-2xl shadow-emerald-950/40 transform-gpu">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="font-black text-rose-300 tracking-wide uppercase text-[11px]">
            VENTE FLASH : -{discountPercent}%
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-300 font-medium">
            Plus que <strong className="text-emerald-400">{remainingSeats} places</strong> au tarif préférentiel
          </span>
        </div>

        {/* Décompte Chiffré Haute Précision */}
        <div className="flex items-center gap-1 font-mono font-black text-xs text-white bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700/80 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-amber-400 mr-1 animate-pulse" />
          <span className="text-amber-300">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-slate-500">:</span>
          <span className="text-amber-300">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-slate-500">:</span>
          <span className="text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-slate-500">.</span>
          <span className="text-rose-400 text-[11px] w-5 inline-block">{String(timeLeft.millis).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
});

PulsatingCountdownTimer.displayName = 'PulsatingCountdownTimer';

/* =========================================================================
   COMPOSANT 2 : CARROUSEL COMPÉTENCES & TRANSFORMATION (STRICT MEMO)
   ========================================================================= */
interface FeatureCarouselProps {
  learningOutcomes: string[];
}

const FeatureTransformationCarousel: React.FC<FeatureCarouselProps> = React.memo(({ learningOutcomes }) => (
  <motion.section 
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    className="space-y-4 transform-gpu"
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10.5px] font-black text-emerald-400 uppercase tracking-wider block">
          COMPÉTENCES OPÉRATIONNELLES
        </span>
        <h3 className="text-lg sm:text-xl font-black text-white">
          Ce que Vous Allez Maîtriser en 48 Heures
        </h3>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-slate-400">
        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Glissez horizontalement</span>
      </div>
    </div>

    {/* Carrousel Horizontal avec Scroll Snapping & Gesture Containment */}
    <div className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-contain snap-x snap-mandatory px-4 py-2 -mx-4 touch-pan-x">
      {learningOutcomes.map((outcome, idx) => (
        <div
          key={idx}
          className="snap-start flex-shrink-0 w-[260px] sm:w-[300px] p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">
              0{idx + 1}
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {outcome}
          </p>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            Opérationnel Immédiat ✓
          </span>
        </div>
      ))}
    </div>
  </motion.section>
));

FeatureTransformationCarousel.displayName = 'FeatureTransformationCarousel';

/* =========================================================================
   COMPOSANT 3 : SYLLABUS & MODULES (HORIZONTAL SNAP + SCROLL VERTICAL INTERNE)
   ========================================================================= */
interface SyllabusCarouselProps {
  modules: any[];
}

const SyllabusPreviewCarousel: React.FC<SyllabusCarouselProps> = React.memo(({ modules }) => (
  <motion.section 
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    className="space-y-4 transform-gpu"
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10.5px] font-black text-indigo-400 uppercase tracking-wider block">
          PARCOURS ACADÉMIQUE
        </span>
        <h3 className="text-lg sm:text-xl font-black text-white">
          Programme & Modules de la Masterclass ({modules.length || 6} Modules)
        </h3>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-indigo-400 font-bold">
        <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse" />
        <span>Glissez les modules</span>
      </div>
    </div>

    {/* Carrousel Horizontal des Modules avec Snap-x et Scroll Vertical Interne */}
    <div className="flex gap-4 overflow-x-auto scrollbar-hide overscroll-contain snap-x snap-mandatory px-4 py-2 -mx-4 touch-pan-x">
      {modules.map((module, idx) => (
        <div
          key={module.id || idx}
          className="snap-start flex-shrink-0 w-[290px] sm:w-[340px] rounded-3xl bg-slate-900/95 border border-slate-800 p-4 flex flex-col justify-between shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                MODULE {idx + 1}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {module.lessons?.length || 3} Leçons
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white mt-2.5 line-clamp-2">
              {module.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {module.description}
            </p>

            {/* LISTE DES LEÇONS EN SCROLL INTERNE INDÉPENDANT */}
            <div className="max-h-40 overflow-y-auto scrollbar-hide overscroll-contain space-y-2 pr-1 my-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 touch-pan-y">
              {(module.lessons || []).map((lesson: any, lIdx: number) => (
                <div
                  key={lesson.id || lIdx}
                  className="flex items-center justify-between text-[11px] gap-2 p-1.5 rounded-lg hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Play className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 truncate">{lesson.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {lesson.durationMinutes}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10.5px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Déblocage Immédiat
            </span>
            <span className="text-slate-500">Examen Final Inclus</span>
          </div>
        </div>
      ))}
    </div>
  </motion.section>
));

SyllabusPreviewCarousel.displayName = 'SyllabusPreviewCarousel';

/* =========================================================================
   COMPOSANT 4 : THE BONUS STACK (VALEUR EMPILÉE HORIZONTALE)
   ========================================================================= */
interface BonusStackProps {
  bonusItems: CampaignBonusItem[];
  originalPrice: number;
  discountPrice: number;
  totalValueCalculated: number;
}

const BonusStackCarousel: React.FC<BonusStackProps> = React.memo(({
  bonusItems,
  originalPrice,
  discountPrice,
  totalValueCalculated
}) => (
  <motion.section 
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6 transform-gpu"
  >
    <div className="text-center space-y-2">
      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-black border border-amber-500/30 inline-block">
        VALEUR TOTALE ESTIMÉE : {totalValueCalculated.toLocaleString('fr-FR')} FCFA
      </span>
      <h2 className="text-xl sm:text-2xl font-black text-white">
        Voici Tout Ce Que Vous Recevez Aujourd'hui
      </h2>
      <p className="text-xs text-slate-400 max-w-lg mx-auto">
        En validant votre inscription avant la fin du compte à rebours, ces ressources exclusives sont ajoutées gratuitement à votre espace.
      </p>
    </div>

    {/* Carrousel Horizontal des Bonus avec Snap */}
    <div className="flex gap-4 overflow-x-auto scrollbar-hide overscroll-contain snap-x snap-mandatory px-2 py-1 -mx-2 touch-pan-x">
      {/* Cours Principal */}
      <div className="snap-start flex-shrink-0 w-[280px] sm:w-[320px] p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-3">
        <div>
          <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-emerald-500/20 text-emerald-300">
            COURS PRINCIPAL
          </span>
          <h4 className="text-xs sm:text-sm font-black text-white mt-1.5">
            Accès Intégral à la Masterclass Télécom & Mobile Money
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Vidéos 4K, documents PDF téléchargeables, quiz et certificat accrédité.
          </p>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <span className="text-slate-400 font-medium">Valeur catalogue</span>
          <span className="text-white font-bold">{originalPrice.toLocaleString('fr-FR')} F</span>
        </div>
      </div>

      {/* Bonus Empilés */}
      {bonusItems.map((bonus, idx) => (
        <div
          key={bonus.id || idx}
          className="snap-start flex-shrink-0 w-[280px] sm:w-[320px] p-4 rounded-2xl bg-slate-950 border border-amber-500/20 flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-amber-500/20 text-amber-300 flex items-center gap-1">
                <Gift className="w-3 h-3" />
                BONUS #{idx + 1} OFFERT
              </span>
              <span className="text-[10px] line-through text-slate-500 font-mono">
                {bonus.valueCFA.toLocaleString('fr-FR')} F
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white mt-1.5">
              {bonus.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">
              {bonus.description}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-medium">Offert avec l'accès</span>
            <span className="text-emerald-400 font-black">GRATUIT</span>
          </div>
        </div>
      ))}
    </div>

    {/* Récapitulatif d'économie */}
    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
      <div className="text-xs text-slate-300 font-bold">
        Valeur Totale : <strong className="line-through text-slate-500">{totalValueCalculated.toLocaleString('fr-FR')} FCFA</strong>
      </div>
      <div className="text-lg font-black text-emerald-400">
        Vous payez seulement : {discountPrice.toLocaleString('fr-FR')} FCFA
      </div>
    </div>
  </motion.section>
));

BonusStackCarousel.displayName = 'BonusStackCarousel';

/* =========================================================================
   COMPOSANT 5 : AVIS & TÉMOIGNAGES (HORIZONTAL SNAP & LAZY IMAGES)
   ========================================================================= */
interface TestimonialsProps {
  testimonials: any[];
}

const TestimonialsCarousel: React.FC<TestimonialsProps> = React.memo(({ testimonials }) => (
  <motion.section 
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    className="space-y-4 transform-gpu"
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-wider block">
          PREUVE SOCIALE & AUTORITÉ
        </span>
        <h3 className="text-lg sm:text-xl font-black text-white">
          Ce que Disent les Dirigeants & Professionnels de l'UEMOA
        </h3>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
        <Star className="w-3.5 h-3.5 fill-current" />
        <span>4.95 / 5 (840+ avis)</span>
      </div>
    </div>

    {/* Carrousel Horizontal des Témoignages */}
    <div className="flex gap-4 overflow-x-auto scrollbar-hide overscroll-contain snap-x snap-mandatory px-4 py-2 -mx-4 touch-pan-x">
      {testimonials.map((testi) => (
        <div
          key={testi.id}
          className="snap-start flex-shrink-0 w-[290px] sm:w-[340px] p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3 shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(testi.rating || 5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              "{testi.comment}"
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
            <img
              src={getOptimizedImageUrl(testi.avatarUrl, 120, 70)}
              alt={testi.studentName}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 rounded-full object-cover border border-amber-500/40 flex-shrink-0"
            />
            <div>
              <h5 className="text-xs font-black text-white">{testi.studentName}</h5>
              <p className="text-[10.5px] text-slate-400">{testi.studentRole}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.section>
));

TestimonialsCarousel.displayName = 'TestimonialsCarousel';

/* =========================================================================
   COMPOSANT PRINCIPAL : HIGH-TECH FUNNEL PAGE
   ========================================================================= */
export const HighTechFunnelPage: React.FC<HighTechFunnelPageProps> = ({
  campaignId,
  onEnrollSuccess,
  className = ''
}) => {
  const [campaign, setCampaign] = useState<PromoCampaign | null>(null);
  const [course, setCourse] = useState<MarketplaceCourse | null>(null);
  const [loading, setLoading] = useState(true);

  // Lecteur vidéo hero
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Toaster de preuve sociale
  const [activePulseIndex, setActivePulseIndex] = useState<number | null>(0);
  const [isPulseVisible, setIsPulseVisible] = useState(true);

  // Bottom Sheet d'achat (chargé à la demande)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // 1. Chargement synchrone/asynchrone avec cache prioritaire
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const foundCampaign = await getCampaignById(campaignId);
        if (isMounted) {
          const activeCampaign = foundCampaign || SEED_PROMO_CAMPAIGNS[0];
          setCampaign(activeCampaign);

          // Syllabus et données du cours
          const courseData = getMarketplaceCourseById(activeCampaign.courseId);
          setCourse(courseData);

          setLoading(false);

          // Injection balises Open Graph
          injectOpenGraphMeta(activeCampaign);

          // Tracking visite non-bloquant
          trackCampaignVisit(activeCampaign.id, {
            referrer: document.referrer,
            userAgent: navigator.userAgent
          });
        }
      } catch (err) {
        console.error('Erreur chargement entonnoir promo:', err);
        if (isMounted) {
          const fallback = SEED_PROMO_CAMPAIGNS[0];
          setCampaign(fallback);
          setCourse(getMarketplaceCourseById(fallback.courseId));
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  // 2. Cycle de notifications de preuve sociale
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulseVisible(false);
      setTimeout(() => {
        setActivePulseIndex((prev) => ((prev ?? 0) + 1) % SOCIAL_PROOF_PULSES.length);
        setIsPulseVisible(true);
      }, 500);
    }, 9000);

    return () => clearInterval(pulseInterval);
  }, []);

  // Gestion du son vidéo
  const toggleSound = useCallback(() => {
    playTapBeep();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // Déclencheur CTA Principal
  const handleOpenCheckout = useCallback(() => {
    playValidationBeep();
    if (!campaign) return;

    if (campaign.ctaType === 'WHATSAPP') {
      const text = encodeURIComponent(
        `Bonjour M. Konkobo, je souhaite profiter de la promotion spéciale "${campaign.campaignName}" (${campaign.discountPrice.toLocaleString('fr-FR')} FCFA). Merci de m'indiquer la marche à suivre pour l'accès immédiat.`
      );
      window.open(`https://api.whatsapp.com/send?phone=22670000000&text=${text}`, '_blank');
      trackCampaignConversion(campaign.id, campaign.discountPrice);
      return;
    }

    setIsCheckoutOpen(true);
  }, [campaign]);

  // Calculs mémorisés
  const { discountPercent, totalValueCalculated, courseModules, testimonials, learningOutcomes } = useMemo(() => {
    if (!campaign) {
      return {
        discountPercent: 67,
        totalValueCalculated: 195000,
        courseModules: [],
        testimonials: [],
        learningOutcomes: []
      };
    }
    const percent = Math.round(((campaign.originalPrice - campaign.discountPrice) / campaign.originalPrice) * 100);
    const totalBonusVal = campaign.bonusItems.reduce((acc, b) => acc + b.valueCFA, 0);
    return {
      discountPercent: percent,
      totalValueCalculated: campaign.originalPrice + totalBonusVal,
      courseModules: course?.modules || [],
      testimonials: course?.testimonials || [],
      learningOutcomes: course?.learningOutcomes || [
        'Comprendre l\'architecture des réseaux télécoms et des protocoles USSD en Afrique de l\'Ouest',
        'Intégrer et automatiser les encaissements Orange Money, Moov Money et Wave sans intermédiaire',
        'Piloter un point de vente hybride synchronisé entre smartphone Android et caisse centrale',
        'Sécuriser les transactions contre les fraudes et gérer les comptes séquestres avec conformité légale'
      ]
    };
  }, [campaign, course]);

  if (loading || !campaign) {
    return (
      <div className="h-screen w-full bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase animate-pulse">
          Connexion au Tunnel Sécurisé...
        </span>
      </div>
    );
  }

  return (
    /* CONTENEUR RACINE : DÉFILEMENT VERTICAL FLUIDE & INERTIE MOBILE */
    <div className={`h-screen w-full bg-[#030712] text-slate-100 font-sans antialiased overflow-y-auto overscroll-contain scrollbar-hide relative selection:bg-emerald-500/30 selection:text-white touch-pan-y ${className}`}>
      
      {/* EFFETS DE LUMIÈRE CYBER-PREMIUM (ACCÉLÉRATION MATÉRIELLE) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] transform-gpu" />
        <div className="absolute top-[35%] -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[160px] transform-gpu" />
        <div className="absolute bottom-[20%] -right-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[160px] transform-gpu" />
      </div>

      {/* 1. BARRE D'URGENCE & COMPTE À REBOURS ISOLÉ (NE DÉCLENCHE PAS LE RE-RENDU DU RESTE DU DOM) */}
      <PulsatingCountdownTimer
        deadlineTimestamp={campaign.deadlineTimestamp || Date.now() + 48 * 3600 * 1000}
        discountPercent={discountPercent}
        remainingSeats={campaign.urgencyScarcity?.remainingSeats || 6}
      />

      {/* 2. CONTENU PRINCIPAL AVEC MARGE BASSE ÉTENDUE (pb-36 sm:pb-44) */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 sm:pt-10 pb-36 sm:pb-44 space-y-12 sm:space-y-16">
        
        {/* Entête du Funnel */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black shadow-lg shadow-emerald-950/40">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>ACCÈS EXCLUSIF • ZONE UEMOA</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight">
            {campaign.headline}
          </h1>

          {campaign.subheadline && (
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
              {campaign.subheadline}
            </p>
          )}

          {/* Ancrage du Prix Promo avec Remise Énorme */}
          <div className="pt-2 flex items-center justify-center gap-4 flex-wrap">
            <div className="text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Tarif Habituel</span>
              <span className="text-base sm:text-lg line-through text-slate-500 font-bold">
                {campaign.originalPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div className="p-3 sm:px-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border-2 border-emerald-400/60 shadow-xl shadow-emerald-950/60 text-center">
              <span className="text-[10px] sm:text-xs font-black text-emerald-300 uppercase tracking-wider block">
                Tarif Exceptionnel Vente Flash (-{discountPercent}%)
              </span>
              <div className="text-2xl sm:text-4xl font-black text-emerald-400 flex items-baseline justify-center gap-1.5">
                <span>{campaign.discountPrice.toLocaleString('fr-FR')}</span>
                <span className="text-sm sm:text-base text-emerald-200">FCFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TEASER VIDÉO GRAND FORMAT AVEC PRELOAD METADATA & POSTER OPTIMISÉ */}
        <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl shadow-emerald-950/80 bg-slate-950 group transform-gpu">
          <video
            ref={videoRef}
            src={campaign.courseTrailerVideoUrl}
            poster={getOptimizedImageUrl(campaign.courseCoverImage, 900, 75)}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />

          {/* Bouton Flottant Déverrouillage Audio */}
          <button
            type="button"
            onClick={toggleSound}
            className="absolute bottom-4 right-4 z-20 px-3.5 py-2 rounded-2xl bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700/80 backdrop-blur-md text-xs font-bold transition flex items-center gap-2 shadow-xl cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Activer le Son</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Son Actif</span>
              </>
            )}
          </button>

          {/* Badge Vidéo Haute Définition */}
          <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Extrait de la Masterclass en Direct
          </div>
        </div>

        {/* Bouton CTA d'engagement supérieur */}
        <div className="text-center space-y-3 max-w-md mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleOpenCheckout}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-base font-black transition flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/40 cursor-pointer min-h-[56px] transform-gpu"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>{campaign.ctaLabel || 'Débloquer mon Accès Immédiat'}</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Paiement Sécurisé Mobile Money
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Accès Immédiat 24/7
            </span>
          </div>
        </div>

        {/* 4. MODULE SWIPE 1 : CARROUSEL COMPÉTENCES & TRANSFORMATION (MÉMORISÉ) */}
        <FeatureTransformationCarousel learningOutcomes={learningOutcomes} />

        {/* 5. MODULE SWIPE 2 : SYLLABUS & PROGRAMME DÉTAILLÉ (MÉMORISÉ) */}
        <SyllabusPreviewCarousel modules={courseModules} />

        {/* 6. MODULE SWIPE 3 : THE BONUS STACK (MÉMORISÉ) */}
        <BonusStackCarousel
          bonusItems={campaign.bonusItems}
          originalPrice={campaign.originalPrice}
          discountPrice={campaign.discountPrice}
          totalValueCalculated={totalValueCalculated}
        />

        {/* 7. MODULE SWIPE 4 : AVIS & TÉMOIGNAGES (MÉMORISÉ + LAZY IMAGES) */}
        <TestimonialsCarousel testimonials={testimonials} />

        {/* 8. PROFIL DU FORMATEUR : IBRAHIM POUSBILA KONKOBO */}
        <motion.section 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left transform-gpu"
        >
          <img
            src={getOptimizedImageUrl(campaign.instructor.avatarUrl, 240, 75)}
            alt={campaign.instructor.name}
            loading="lazy"
            decoding="async"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-amber-500/50 shadow-xl flex-shrink-0"
          />
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                {campaign.instructor.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Expert Vérifié
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-bold">
              {campaign.instructor.title}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fondateur d'ENTREPRISE KONKOBO POUSBILA. Plus de 10 ans d'expérience dans le déploiement d'infrastructures télécoms résilientes, la passerelle USSD et les caisses connectées à travers l'Afrique de l'Ouest.
            </p>
          </div>
        </motion.section>

        {/* 9. GARANTIE SÉCURITÉ & REMBOURSEMENT */}
        <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2 max-w-xl mx-auto">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-black text-white">Garantie Sécurité & Accompagnement</h4>
          <p className="text-xs text-slate-400">
            Transactions certifiées par les protocoles Mobile Money de l'UEMOA. Assistance technique continue et déblocage immédiat de l'accès après confirmation.
          </p>
        </div>
      </main>

      {/* 10. TOASTER DE PREUVE SOCIALE EN DIRECT */}
      <AnimatePresence>
        {isPulseVisible && activePulseIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-24 left-4 z-40 max-w-xs bg-slate-900/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md hidden sm:flex items-center gap-3 transform-gpu"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
              💰
            </div>
            <div className="text-[11px] leading-tight space-y-0.5">
              <p className="text-white font-bold">
                <strong>{SOCIAL_PROOF_PULSES[activePulseIndex].name}</strong> ({SOCIAL_PROOF_PULSES[activePulseIndex].city})
              </p>
              <p className="text-slate-400">
                vient de s'inscrire via <strong className="text-emerald-400">{SOCIAL_PROOF_PULSES[activePulseIndex].provider}</strong>
              </p>
              <p className="text-[9.5px] text-slate-500 font-mono">
                {SOCIAL_PROOF_PULSES[activePulseIndex].timeAgo}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 11. STICKY MOBILE CTA BAR (Z-50 & FIXED BOTTOM-0) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-t border-emerald-500/30 p-3 sm:py-3.5 shadow-2xl transform-gpu">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Offre Promo :</span>
              <span className="text-xs text-slate-500 line-through hidden xs:inline">
                {campaign.originalPrice.toLocaleString('fr-FR')} F
              </span>
            </div>
            <div className="text-base sm:text-xl font-black text-emerald-400">
              {campaign.discountPrice.toLocaleString('fr-FR')} FCFA
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Secondaire WhatsApp si Hybride */}
            {campaign.ctaType === 'HYBRID' && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  const text = encodeURIComponent(
                    `Bonjour M. Konkobo, j'aimerais des détails sur l'offre flash ${campaign.campaignName}.`
                  );
                  window.open(`https://api.whatsapp.com/send?phone=22670000000&text=${text}`, '_blank');
                }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 transition cursor-pointer min-h-[46px] min-w-[46px] flex items-center justify-center"
                title="Poser une question sur WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleOpenCheckout}
              className="px-5 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-lg shadow-emerald-500/40 cursor-pointer min-h-[46px] transform-gpu"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Profiter de l'Offre (-{discountPercent}%)</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 12. BOTTOM SHEET CHARGÉ STRICTEMENT À LA DEMANDE VIA REACT.LAZY */}
      {isCheckoutOpen && course && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm" />}>
          <FrictionlessAfricanCheckoutBottomSheet
            isOpen={isCheckoutOpen}
            course={course}
            onClose={() => setIsCheckoutOpen(false)}
            onEnrollSuccess={(_cId) => {
              playCashChime();
              setIsCheckoutOpen(false);
              if (campaign) {
                trackCampaignConversion(campaign.id, campaign.discountPrice);
                if (onEnrollSuccess) {
                  onEnrollSuccess(campaign.courseId);
                }
              }
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default HighTechFunnelPage;
