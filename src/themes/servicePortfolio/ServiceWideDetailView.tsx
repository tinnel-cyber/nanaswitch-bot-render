import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquare,
  Play,
  ShieldCheck,
  ShoppingCart,
  Star,
  ThumbsDown,
  ThumbsUp,
  Video,
} from 'lucide-react';
import { StoreConfig, StoreProductItem } from '../../types/theme';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { sanitizeRichHtml } from '../../utils/security';
import { BuyerLiveCallButton } from '../../components/live/BuyerLiveCallButton';

interface ServiceReview {
  id: string;
  author: string;
  rating: number;
  isPositive: boolean;
  comment: string;
  createdAt: number;
}

interface MediaSlideItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
}

interface ServiceWideDetailViewProps {
  service: StoreProductItem;
  storeConfig?: StoreConfig;
  brandTitle: string;
  storeSlug: string;
  whatsappSupport?: string;
  onBack: () => void;
  onBookCoaching: (service: StoreProductItem) => void;
  onBuyNow: (service: StoreProductItem, qty: number) => void;
}

function toEmbedVideoUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.includes('/shorts/')) {
        const id = u.pathname.split('/shorts/')[1]?.split('/')[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

export const ServiceWideDetailView: React.FC<ServiceWideDetailViewProps> = ({
  service,
  storeConfig,
  brandTitle,
  storeSlug,
  whatsappSupport,
  onBack,
  onBookCoaching,
  onBuyNow,
}) => {
  const isCoachingLinked = (service as any).linkedToLiveCoaching !== false;

  // Construction du carrousel unifié (Image principale + mediaSlides + videoUrl)
  const slides = useMemo<MediaSlideItem[]>(() => {
    const list: MediaSlideItem[] = [];
    const seen = new Set<string>();

    const pushUnique = (item: MediaSlideItem) => {
      if (!item.url || seen.has(item.url)) return;
      seen.add(item.url);
      list.push(item);
    };

    if (service.image) {
      pushUnique({ id: 'main-cover', type: 'image', url: service.image, title: service.name });
    }
    if (Array.isArray(service.mediaSlides)) {
      service.mediaSlides.forEach((s, idx) => {
        pushUnique({
          id: s.id || `slide-${idx}`,
          type: s.type === 'video' ? 'video' : 'image',
          url: s.url,
          title: s.title,
        });
      });
    }
    if (service.videoUrl) {
      pushUnique({ id: 'service-video', type: 'video', url: service.videoUrl, title: 'Présentation vidéo' });
    }
    if (Array.isArray(service.images)) {
      service.images.forEach((img, idx) => {
        pushUnique({ id: `extra-img-${idx}`, type: 'image', url: img });
      });
    }
    return list;
  }, [service]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = slides[activeSlideIndex] || slides[0];
  const imageCount = slides.filter((s) => s.type === 'image').length;
  const videoCount = slides.filter((s) => s.type === 'video').length;

  // FAQ accordéon
  const faqs = useMemo(() => (Array.isArray(service.faqs) ? service.faqs : []), [service.faqs]);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Collecteur d'avis clients (localStorage + service.reviews)
  const reviewsStorageKey = `nana_service_reviews_${service.id}`;
  const [localReviews, setLocalReviews] = useState<ServiceReview[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(reviewsStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const allReviews = useMemo<ServiceReview[]>(() => {
    const base = Array.isArray(service.reviews) ? service.reviews : [];
    return [...localReviews, ...base];
  }, [localReviews, service.reviews]);

  const positiveCount = allReviews.filter((r) => r.isPositive).length;
  const negativeCount = allReviews.filter((r) => !r.isPositive).length;
  const avgRating =
    allReviews.length > 0
      ? (allReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / allReviews.length).toFixed(1)
      : (service.rating || 5.0).toFixed(1);

  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPositive, setReviewPositive] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;
    playValidationBeep();
    const newReview: ServiceReview = {
      id: `rev-${Date.now()}`,
      author: reviewAuthor.trim(),
      rating: reviewRating,
      isPositive: reviewPositive,
      comment: reviewComment.trim(),
      createdAt: Date.now(),
    };
    const next = [newReview, ...localReviews];
    setLocalReviews(next);
    try {
      localStorage.setItem(reviewsStorageKey, JSON.stringify(next));
    } catch {}
    setReviewAuthor('');
    setReviewComment('');
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3500);
  };

  const cleanRichHtml = useMemo(
    () => sanitizeRichHtml(service.richDescription || service.description || ''),
    [service.richDescription, service.description]
  );

  const whatsappContactHref = whatsappSupport
    ? `https://wa.me/${whatsappSupport.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
        `Bonjour ${brandTitle}, je souhaite discuter de votre offre "${service.name}" avant de réserver sur la plateforme.`
      )}`
    : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barre supérieure retour + note */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Retour aux offres</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" />
            {avgRating} ({allReviews.length} avis)
          </span>
          {service.salesCount ? (
            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              {service.salesCount} commande(s)
            </span>
          ) : null}
          {service.badge && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[10px]">
              {service.badge}
            </span>
          )}
        </div>
      </div>

      {/* GRILLE PRINCIPALE : GAUCHE (Médias + Prestataire collé + Description illimitée + FAQ + Avis) | DROITE EN HAUT (Commande) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. BLOC MÉDIA SLIDE + MINIATURES JUSTE À CÔTÉ + PRESTATAIRE COLLÉ EN BAS */}
          <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="p-3 sm:p-4 bg-[#070B14] grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Vue principale (Image ou Vidéo) */}
              <div className="md:col-span-9 relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                {activeSlide ? (
                  activeSlide.type === 'video' ? (
                    toEmbedVideoUrl(activeSlide.url) ? (
                      <iframe
                        src={toEmbedVideoUrl(activeSlide.url)!}
                        title={activeSlide.title || service.name}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={activeSlide.url} controls className="w-full h-full object-contain bg-black" />
                    )
                  ) : (
                    <img
                      src={activeSlide.url}
                      alt={activeSlide.title || service.name}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    Aucun média ajouté
                  </div>
                )}

                {/* Compteur explicite Images + Vidéos */}
                {slides.length > 0 && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-black text-white flex items-center gap-2">
                    <span>
                      {activeSlideIndex + 1} / {slides.length}
                    </span>
                    <span className="text-amber-300">
                      • {imageCount} image{imageCount > 1 ? 's' : ''}
                      {videoCount > 0 ? ` • ${videoCount} vidéo${videoCount > 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                )}

                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)
                      }
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/65 hover:bg-black text-white border border-white/15 cursor-pointer"
                      aria-label="Média précédent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((prev) => (prev + 1) % slides.length)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/65 hover:bg-black text-white border border-white/15 cursor-pointer"
                      aria-label="Média suivant"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Bande verticale de vignettes juste à côté */}
              <div className="md:col-span-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[340px] pr-0.5">
                {slides.map((slide, idx) => {
                  const isActive = idx === activeSlideIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setActiveSlideIndex(idx);
                      }}
                      className={`relative shrink-0 w-28 md:w-full h-16 md:h-20 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        isActive
                          ? 'border-amber-400 ring-2 ring-amber-400/30'
                          : 'border-slate-800 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {slide.type === 'video' ? (
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-amber-300 gap-1">
                          <Play className="w-5 h-5 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold truncate max-w-[90%]">
                            {slide.title || `Vidéo #${idx + 1}`}
                          </span>
                        </div>
                      ) : (
                        <img src={slide.url} alt={slide.title || `Vue ${idx + 1}`} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-black text-white">
                        {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARRE PRESTATAIRE DIRECTEMENT COLLÉE À L'IMAGE */}
            <div className="px-5 py-4 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {storeConfig?.logoUrl ? (
                  <img
                    src={storeConfig.logoUrl}
                    alt={brandTitle}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-400/70 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-300 font-black text-lg shrink-0">
                    {brandTitle.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white">{brandTitle}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> Prestataire Vérifié
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {storeConfig?.description ||
                      storeConfig?.welcomeText ||
                      'Expertise professionnelle dédiée avec accompagnement et livraison sécurisée sous séquestre.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DESCRIPTION ILLIMITÉE RICH TEXT (Tableaux colorés, icônes SVG, titres, listes) */}
          <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-white border-b border-slate-800 pb-3">
              Description détaillée de la prestation
            </h2>
            {cleanRichHtml ? (
              <div
                className="prose prose-invert max-w-none text-slate-200 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:text-left"
                dangerouslySetInnerHTML={{ __html: cleanRichHtml }}
              />
            ) : (
              <p className="text-sm text-slate-400">
                Prestation professionnelle réalisée sur mesure selon vos objectifs.
              </p>
            )}
          </section>

          {/* 3. FAQ ACCORDÉON (si configurée) */}
          {faqs.length > 0 && (
            <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-white">Questions fréquentes (FAQ)</h3>
              <div className="space-y-2.5">
                {faqs.map((item, idx) => {
                  const id = item.id || `faq-${idx}`;
                  const isOpen = openFaqId === id;
                  return (
                    <div key={id} className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : id)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3 cursor-pointer"
                      >
                        <span className="text-sm font-bold text-white">{item.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-amber-400 transition-transform shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80 pt-3">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. GARANTIE SÉQUESTRE 3 ÉTAPES */}
          <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 text-center">
            <div className="space-y-2">
              <div className="w-9 h-9 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm flex items-center justify-center">
                1
              </div>
              <ShoppingCart className="w-6 h-6 mx-auto text-slate-200" />
              <p className="text-xs font-semibold text-slate-300">
                Commandez le service de votre choix en toute sécurité
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-9 h-9 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm flex items-center justify-center">
                2
              </div>
              <MessageSquare className="w-6 h-6 mx-auto text-slate-200" />
              <p className="text-xs font-semibold text-slate-300">
                Échangez par chat sur le site jusqu&apos;à la livraison
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-9 h-9 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm flex items-center justify-center">
                3
              </div>
              <ShieldCheck className="w-6 h-6 mx-auto text-emerald-400" />
              <p className="text-xs font-semibold text-slate-300">
                Le prestataire n&apos;est payé que lorsque vous validez la livraison
              </p>
            </div>
          </section>

          {/* 5. AVIS DES CLIENTS + COLLECTEUR D'AVIS */}
          <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-black text-white">Avis des clients</h3>

            {/* Bandeau sombre récapitulatif */}
            <div className="rounded-2xl bg-black border border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-center gap-4 sm:gap-0">
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-black text-white">
                  {avgRating} ({allReviews.length})
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 pt-3 sm:pt-0">
                <ThumbsUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black text-white">{positiveCount} avis positif(s)</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 pt-3 sm:pt-0">
                <ThumbsDown className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-black text-white">
                  {negativeCount === 0 ? 'Aucun avis négatif' : `${negativeCount} avis négatif(s)`}
                </span>
              </div>
            </div>

            {/* Formulaire Collecteur d'avis */}
            <form onSubmit={handleReviewSubmit} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Donner votre avis sur cette prestation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  placeholder="Votre nom ou entreprise"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                >
                  <option value={5}>★★★★★ 5 / 5</option>
                  <option value={4}>★★★★☆ 4 / 5</option>
                  <option value={3}>★★★☆☆ 3 / 5</option>
                  <option value={2}>★★☆☆☆ 2 / 5</option>
                  <option value={1}>★☆☆☆☆ 1 / 5</option>
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReviewPositive(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                      reviewPositive
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Positif
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewPositive(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                      !reviewPositive
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Négatif
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre retour d'expérience..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shrink-0"
                >
                  Publier l&apos;avis
                </button>
              </div>
              {reviewSubmitted && (
                <p className="text-xs text-emerald-400 font-bold">Merci ! Votre avis a bien été enregistré.</p>
              )}
            </form>

            {allReviews.length > 0 && (
              <div className="space-y-2.5">
                {allReviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white">{rev.author}</span>
                      <span className="text-[11px] font-bold text-amber-400">
                        {'★'.repeat(rev.rating)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* COLONNE DROITE EN HAUT (BOUTONS DE COMMANDE STICKY) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-3">
          <div className="rounded-3xl bg-slate-900/95 border border-amber-500/35 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                {service.category || 'Prestation Pro'}
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-snug">{service.name}</h1>
              {service.shortDescription && (
                <p className="text-xs text-slate-400">{service.shortDescription}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBuyNow(service, 1);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-slate-950 border border-amber-400/60 text-white font-black text-sm flex items-center justify-between gap-3 shadow-lg transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Commander
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-mono text-xs font-black">
                {service.price > 0 ? formatCFA(service.price) : 'Sur devis'}
              </span>
            </button>

            {isCoachingLinked && (
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onBookCoaching(service);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  Prendre Rendez-vous (1-to-1)
                </button>

                <BuyerLiveCallButton
                  productId={service.id}
                  productName={service.name}
                  productPrice={service.price}
                  productImage={service.image}
                  storeName={brandTitle}
                  whatsappPhone={whatsappSupport}
                  sellerId={storeSlug}
                  buttonText="Voir Direct (Appel Vidéo)"
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                />
              </div>
            )}

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
                <ShieldCheck className="w-4 h-4" /> Paiement Sécurisé (Séquestre)
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Aucun paiement ne doit être effectué en dehors du site.
              </p>
            </div>

            {whatsappContactHref && (
              <a
                href={whatsappContactHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Video className="w-4 h-4 text-amber-400" />
                Contacter le prestataire
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
