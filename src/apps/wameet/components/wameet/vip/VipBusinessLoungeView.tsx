import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  ArrowLeft,
  Calendar,
  Video,
  ShieldCheck,
  Award,
  Users,
  TrendingUp,
  Handshake,
  DollarSign,
  Lock,
  Star,
  CheckCircle2,
  Clock,
  Radio,
  Share2,
  MessageSquare,
  Building,
  Check
} from 'lucide-react';
import {
  VipBusinessLounge,
  VipLoungeFeedPost,
  VipDealRequest,
  VipBusinessLoungeViewProps,
  Vip1to1BookingData
} from './types';
import {
  MOCK_VIP_BUSINESS_LOUNGES,
  DEFAULT_VIP_FEED_POSTS,
  DEFAULT_VIP_DEAL_REQUESTS,
  DEFAULT_VIP_LOUNGE_MEMBERS
} from './mockVipData';
import { VipExclusiveFeed } from './VipExclusiveFeed';
import { Vip1to1BookingModal } from './Vip1to1BookingModal';
import { VipDealsNetworkBoard } from './VipDealsNetworkBoard';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

type ActiveTab = 'FEED' | 'DEALS' | 'MEMBERS';

/**
 * PROMPT 29 : L'Intérieur du "Salon VIP" (Business & Networking Wameet)
 * Mission : UI/UX Premium - Intérieur du "Salon VIP" (Business Lounge)
 * 
 * Directives UI/UX au millimètre :
 * - Layout Principal : Design "Executive" (bg-slate-900 text-white avec des accents dorés).
 * - Le Feed Exclusif (Mur VIP) : Un flux d'actualités privé où le propriétaire poste des analyses, des opportunités d'investissement ou des vidéos réservées aux membres.
 * - Le Bouton "Réserver un 1-to-1" : Un gros bouton Call-to-Action permettant à un membre de réserver une consultation vidéo privée avec l'expert (connecté à un calendrier).
 * - Tableaux de Financement/Réseau : Une sous-section où les membres peuvent soumettre des requêtes (ex: "Recherche de financement", "Partenariat") validées par le propriétaire.
 */
export const VipBusinessLoungeView: React.FC<VipBusinessLoungeViewProps> = ({
  lounge: initialLounge = MOCK_VIP_BUSINESS_LOUNGES[0],
  feedPosts = DEFAULT_VIP_FEED_POSTS,
  deals = DEFAULT_VIP_DEAL_REQUESTS,
  currentUser = {
    name: 'Moussa Fofana',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    company: 'Fofana Capital Partners',
    isVipMember: true,
    isOwner: false
  },
  onBackToHub,
  className = ''
}) => {
  const lounge: VipBusinessLounge = initialLounge || MOCK_VIP_BUSINESS_LOUNGES[0];
  const [activeTab, setActiveTab] = useState<ActiveTab>('FEED');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleBookingConfirmed = (booking: Vip1to1BookingData) => {
    showToast(
      `👑 Séance 1-to-1 réservée avec succès pour le ${booking.date} (${booking.time}) !`
    );
  };

  return (
    <div
      className={`min-h-screen bg-slate-900 text-white relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200 ${className}`}
    >
      {/* =====================================================================
          FOND AMBIANT LUXE & EXECUTIVE (ONYX PROFOND ET OR IMPÉRIAL)
         ===================================================================== */}
      <div className="pointer-events-none absolute -top-40 left-1/3 w-[650px] h-[650px] bg-amber-500/10 blur-[170px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 -right-36 w-[550px] h-[550px] bg-yellow-600/10 blur-[180px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[500px] h-[500px] bg-slate-800/40 blur-[150px] rounded-full" />

      {/* Grille filigrane subtile */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.4) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Notification Toast Flottante */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle">
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_10px_35px_rgba(245,158,11,0.5)] flex items-center gap-2 border border-yellow-200">
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. BARRE SUPÉRIEURE STATUTAIRE & NAVIGATION RETOUR
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-amber-500/20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              onClick={() => {
                playTapBeep();
                onBackToHub();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Hub VIP</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Crown className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md">
                {lounge.title}
              </h1>
              <p className="text-[10px] text-amber-300/80 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Salon d'Affaires Exclusif • {lounge.coachName}
              </p>
            </div>
          </div>
        </div>

        {/* Bouton rapide Réserver 1-to-1 en entête */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playValidationBeep();
              setIsBookingModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all shadow-[0_0_18px_rgba(245,158,11,0.35)] flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Réserver un 1-to-1</span>
            <span className="sm:hidden">1-to-1</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. EN-TÊTE STATUTAIRE DU SALON (PROPRIÉTAIRE & STATISTIQUES VIP)
         ===================================================================== */}
      <section className="relative px-4 sm:px-8 pt-6 pb-4 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Lueur dorée d'arrière-plan du hero */}
          <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Infos de l'Expert & Propriétaire */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <img
                  src={lounge.coachAvatar}
                  alt={lounge.coachName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
                {lounge.isOnline && (
                  <div
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-950 shadow-md"
                    title="En Ligne Actuellement"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Propriétaire & Expert du Salon
                  </span>
                  {lounge.isLiveNow && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 animate-pulse">
                      <Radio className="w-3 h-3 text-red-400" />
                      Session Direct En Cours
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                  {lounge.coachName}
                </h2>
                <p className="text-xs sm:text-sm text-amber-200/90 font-medium mt-0.5">
                  {lounge.coachRole}
                </p>
                <p className="text-xs text-slate-400 max-w-xl mt-2 leading-relaxed">
                  {lounge.coachBio || lounge.topic}
                </p>
              </div>
            </div>

            {/* LE GROS BOUTON CTA "RÉSERVER UN 1-TO-1" */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0 lg:w-72">
              <button
                onClick={() => {
                  playValidationBeep();
                  setIsBookingModalOpen(true);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm sm:text-base hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_35px_rgba(245,158,11,0.5)] flex items-center justify-center gap-3 border border-yellow-200 group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="leading-tight">Réserver un 1-to-1</div>
                  <div className="text-[10px] uppercase font-bold text-slate-800">
                    Consultation Vidéo Privée
                  </div>
                </div>
              </button>

              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Inclus dans votre abonnement VIP Wameet
              </div>
            </div>
          </div>

          {/* Statistiques clés du Salon VIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Membres VIP Actifs</div>
              <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                {lounge.activeMembersCount} Dirigeants
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Satisfaction Vérifiée</div>
              <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {lounge.rating} / 5.0
                <span className="text-xs text-slate-400 font-normal">({lounge.reviewsCount})</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Deals Audités & Validés</div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <Handshake className="w-4 h-4 text-emerald-400" />
                12 Deals Clôturés
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Volume Co-Investi</div>
              <div className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                +240M FCFA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. BARRE D'ONGLETS EXECUTIVE (TONS OR & ONYX)
         ===================================================================== */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mt-4">
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              playTapBeep();
              setActiveTab('FEED');
            }}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'FEED'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Le Feed Exclusif (Mur VIP)
          </button>

          <button
            onClick={() => {
              playTapBeep();
              setActiveTab('DEALS');
            }}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'DEALS'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Handshake className="w-4 h-4" />
            Tableaux Financement / Réseau
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300 ml-1">
              {deals.length}
            </span>
          </button>

          <button
            onClick={() => {
              playTapBeep();
              setActiveTab('MEMBERS');
            }}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'MEMBERS'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Cercle des Membres VIP
          </button>
        </div>
      </section>

      {/* =====================================================================
          4. CONTENU DE L'ONGLET ACTIF
         ===================================================================== */}
      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {activeTab === 'FEED' && (
          <VipExclusiveFeed
            posts={feedPosts}
            ownerName={lounge.coachName}
            isOwner={currentUser.isOwner}
            onExpressInterest={(post) => {
              showToast(`💼 Votre intérêt pour "${post.title}" a été notifié à l'expert.`);
            }}
          />
        )}

        {activeTab === 'DEALS' && (
          <VipDealsNetworkBoard
            deals={deals}
            ownerName={lounge.coachName}
            isOwner={currentUser.isOwner}
            onContactAuthor={(deal) => {
              showToast(`🤝 Demande de mise en relation envoyée pour "${deal.title}".`);
            }}
          />
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Annuaire Privé des Membres du Cercle
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Accès Réservé Abonnés
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tous les membres sont soumis à un contrôle de solvabilité et d'identité KYC par Wameet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEFAULT_VIP_LOUNGE_MEMBERS.map((member) => (
                <div
                  key={member.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700"
                      />
                      {member.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white truncate">{member.name}</h4>
                      <p className="text-[11px] text-amber-300 font-medium truncate">{member.role}</p>
                      <p className="text-[10px] text-slate-400 truncate">{member.company}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{member.country}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Solvabilité Validée
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          5. MODAL DE RÉSERVATION 1-TO-1 CONNECTÉ AU CALENDRIER
         ===================================================================== */}
      <Vip1to1BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        lounge={lounge}
        onConfirmBooking={handleBookingConfirmed}
      />
    </div>
  );
};

export default VipBusinessLoungeView;
