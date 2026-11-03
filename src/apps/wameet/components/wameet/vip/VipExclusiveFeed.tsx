import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  TrendingUp,
  FileText,
  Video,
  Download,
  Lock,
  ShieldCheck,
  Heart,
  MessageSquare,
  Share2,
  Calendar,
  DollarSign,
  Clock,
  ArrowUpRight,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Play
} from 'lucide-react';
import {
  VipLoungeFeedPost,
  VipLoungePostType,
  VipInvestmentMetrics
} from './types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface VipExclusiveFeedProps {
  posts: VipLoungeFeedPost[];
  ownerName: string;
  isOwner?: boolean;
  onExpressInterest?: (post: VipLoungeFeedPost) => void;
  className?: string;
}

export const VipExclusiveFeed: React.FC<VipExclusiveFeedProps> = ({
  posts: initialPosts,
  ownerName,
  isOwner = false,
  onExpressInterest,
  className = ''
}) => {
  const [posts, setPosts] = useState<VipLoungeFeedPost[]>(initialPosts);
  const [activeFilter, setActiveFilter] = useState<'ALL' | VipLoungePostType>('ALL');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [interestedPostIds, setInterestedPostIds] = useState<Record<string, boolean>>({});

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'ALL') return true;
    return post.type === activeFilter;
  });

  const handleLike = (postId: string) => {
    playTapBeep();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likesCount: hasLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
          };
        }
        return p;
      })
    );
  };

  const handleSendComment = (postId: string) => {
    if (!newCommentText.trim()) return;
    playValidationBeep();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newComment = {
            id: `c-${Date.now()}`,
            authorName: 'Vous (Membre VIP)',
            authorRole: 'Investisseur / Dirigeant',
            authorAvatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            content: newCommentText.trim(),
            createdAt: 'À l’instant'
          };
          return {
            ...p,
            comments: [...(p.comments || []), newComment]
          };
        }
        return p;
      })
    );
    setNewCommentText('');
  };

  const handleInterestClick = (post: VipLoungeFeedPost) => {
    playValidationBeep();
    setInterestedPostIds((prev) => ({ ...prev, [post.id]: true }));
    onExpressInterest?.(post);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =====================================================================
          1. BANDEAU DE BIENVENUE & FILTRES EXECUTIVE (TONS OR & ONYX)
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
            <Crown className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              Mur Confidentiel du Salon
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Accès Restreint VIP
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Publications exclusives, analyses de marché et opportunités partagées par {ownerName}.
            </p>
          </div>
        </div>

        {/* Filtres par type */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => {
              playTapBeep();
              setActiveFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
            }`}
          >
            Tous les flux
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setActiveFilter('INVESTMENT_OPPORTUNITY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'INVESTMENT_OPPORTUNITY'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Investissements
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setActiveFilter('ANALYSIS');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'ANALYSIS'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Analyses
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setActiveFilter('PRIVATE_VIDEO');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'PRIVATE_VIDEO'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Vidéos Privées
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. FLUX DES POSTS EXCLUSIFS
         ===================================================================== */}
      <div className="space-y-6">
        {filteredPosts.map((post) => {
          const isInterested = interestedPostIds[post.id];
          const isCommentsOpen = activeCommentPostId === post.id;

          return (
            <article
              key={post.id}
              className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 overflow-hidden shadow-2xl backdrop-blur-sm relative group"
            >
              {/* Effet lueur dorée latérale */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600" />

              {/* Header du Post */}
              <div className="p-5 sm:p-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400/50"
                      />
                      {post.isOwner && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                          <Crown className="w-3 h-3 fill-slate-950" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-white">
                          {post.authorName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Propriétaire du Salon
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {post.authorRole} • <span className="text-slate-500">{post.createdAt}</span>
                      </p>
                    </div>
                  </div>

                  {/* Badge type de post */}
                  <div className="flex items-center gap-2">
                    {post.type === 'INVESTMENT_OPPORTUNITY' && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Opportunité d'Investissement
                      </span>
                    )}
                    {post.type === 'ANALYSIS' && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Note Stratégique
                      </span>
                    )}
                    {post.type === 'PRIVATE_VIDEO' && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        Vidéo Réservée
                      </span>
                    )}
                  </div>
                </div>

                {/* Titre & Contenu */}
                <h3 className="text-base sm:text-lg font-black text-amber-100 mt-4 leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-3 whitespace-pre-line leading-relaxed">
                  {post.content}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* =====================================================================
                  BLOC SPÉCIFIQUE : MÉTRIQUES FINANCIÈRES D'INVESTISSEMENT
                 ===================================================================== */}
              {post.investmentMetrics && (
                <div className="mx-5 sm:mx-6 my-2 p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Fiche de Synthèse d'Investissement Sécurisée
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Strictement Confidentiel • Membres Salon
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Ticket Minimum</div>
                      <div className="text-sm sm:text-base font-black text-amber-400 mt-0.5">
                        {post.investmentMetrics.ticketMin}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Rendement Estimé</div>
                      <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                        {post.investmentMetrics.roiEstimated}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Horizon d'Échéance</div>
                      <div className="text-sm sm:text-base font-black text-white mt-0.5">
                        {post.investmentMetrics.termMonths} mois
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Garantie & Sûreté</div>
                      <div className="text-xs font-black text-cyan-300 mt-0.5 truncate">
                        {post.investmentMetrics.capitalSecured}
                      </div>
                    </div>
                  </div>

                  {/* Jauge de souscription */}
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-300">
                        Objectif du tour : <strong className="text-white">{post.investmentMetrics.totalTarget}</strong>
                      </span>
                      <span className="font-black text-amber-400">
                        {post.investmentMetrics.committedPercentage}% souscrit
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                        style={{ width: `${post.investmentMetrics.committedPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Bouton d'action manifester un intérêt */}
                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-amber-500/15">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Clôture du tour le {post.investmentMetrics.deadline}
                    </div>

                    <button
                      onClick={() => handleInterestClick(post)}
                      disabled={isInterested}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isInterested
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                      }`}
                    >
                      {isInterested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Intérêt Transmis au Propriétaire
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 fill-slate-950" />
                          Manifester mon Intérêt (Confidentiel)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  BLOC SPÉCIFIQUE : VIDÉO PRIVÉE
                 ===================================================================== */}
              {post.videoUrl && (
                <div className="mx-5 sm:mx-6 my-2 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video relative group/vid">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10 flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-400 mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      Vidéo Débriefing Réservée aux Abonnés
                    </div>
                    <p className="text-xs text-slate-300">
                      Cliquez pour démarrer la lecture du débriefing stratégique en direct.
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <button
                      onClick={() => playValidationBeep()}
                      className="w-16 h-16 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.6)] group-hover/vid:scale-110 transition-transform"
                    >
                      <Play className="w-7 h-7 fill-slate-950 translate-x-0.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  PIÈCES JOINTES CONFIDENTIELLES (PDF, EXCEL)
                 ===================================================================== */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="px-5 sm:px-6 py-2 space-y-2">
                  <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Documents & Modèles Téléchargeables (Membres Uniquement)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {post.attachments.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.type === 'excel' ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{file.title}</p>
                            <p className="text-[10px] text-slate-400">{file.size || 'Document protégé'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => playValidationBeep()}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-amber-400 hover:text-slate-950 text-slate-200 transition-colors shrink-0"
                          title="Télécharger le document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  BARRE D'INTERACTIONS VIP (LIKES, COMMENTAIRES PRIVÉS)
                 ===================================================================== */}
              <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/80 flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      post.hasLiked
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${post.hasLiked ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      playTapBeep();
                      setActiveCommentPostId(isCommentsOpen ? null : post.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isCommentsOpen
                        ? 'bg-slate-750 text-white border border-slate-600'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments ? post.comments.length : 0} échanges</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  Visible uniquement par les VIP de ce salon
                </div>
              </div>

              {/* =====================================================================
                  SECTION COMMENTAIRES PRIVÉS DÉPLIABLE
                 ===================================================================== */}
              {isCommentsOpen && (
                <div className="p-5 bg-slate-950/70 border-t border-slate-800 space-y-4 animate-fade-in">
                  <div className="space-y-3">
                    {post.comments && post.comments.length > 0 ? (
                      post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3"
                        >
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-white truncate">
                                {comment.authorName}
                              </h5>
                              <span className="text-[10px] text-slate-500 shrink-0">
                                {comment.createdAt}
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-300/80 font-medium">
                              {comment.authorRole}
                            </p>
                            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        Aucun échange confidentiel pour le moment. Soyez le premier membre à poser une question.
                      </p>
                    )}
                  </div>

                  {/* Formulaire de réponse privée */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                      placeholder="Poser une question confidentielle au propriétaire ou aux pairs..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <button
                      onClick={() => handleSendComment(post.id)}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default VipExclusiveFeed;
