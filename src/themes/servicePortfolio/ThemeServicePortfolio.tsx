import React, { useState, useEffect, useMemo } from 'react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { sanitizeRichHtml } from '../../utils/security';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { BuyerLiveCallButton } from '../../components/live/BuyerLiveCallButton';
import { ServiceWideDetailView } from './ServiceWideDetailView';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  Video,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Figma,
  Globe,
  Film,
  Images,
  CheckCircle2,
  Clock,
  Lock,
  Briefcase,
  X,
  ArrowRight,
  Phone,
  User,
  MessageSquare
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  kind: 'video' | 'figma' | 'web' | 'slideshow';
  title: string;
  subtitle?: string;
  url: string;
  slideshowUrls?: string[];
}

const DEFAULT_HERO_BANNERS = [
  {
    badge: 'DIRECTION ARTISTIQUE & DÉVELOPPEMENT',
    title: 'Transformez votre vision en projet d’exception',
    subtitle: 'Accompagnement sur-mesure, livrables certifiés et paiement 100% protégé sous séquestre.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80'
  },
  {
    badge: 'CONSULTATION VIDÉO DIRECTE 1-TO-1',
    title: 'Échangez en direct avant de démarrer',
    subtitle: 'Planifiez un rendez-vous ou lancez un appel vidéo immédiat pour cadrer votre besoin.',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1400&auto=format&fit=crop&q=80'
  },
  {
    badge: 'GARANTIE ESCROW MONDIALE',
    title: 'Devis clair, jalons suivis & zéro risque',
    subtitle: 'Vos fonds restent sécurisés sur la plateforme jusqu’à votre validation finale.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&auto=format&fit=crop&q=80'
  }
];

const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'pf-demo-1',
    kind: 'web',
    title: 'Plateforme SaaS & E-commerce Sur-Mesure',
    subtitle: 'Architecture complète, interface haute conversion & paiements intégrés',
    url: 'https://nanasore.com'
  },
  {
    id: 'pf-demo-2',
    kind: 'slideshow',
    title: 'Galerie Identités Visuelles & Interfaces',
    subtitle: 'Sélection de réalisations récentes',
    url: '',
    slideshowUrls: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1000&auto=format&fit=crop&q=80'
    ]
  }
];

function getEmbedVideoUrl(rawUrl: string): { type: 'iframe' | 'video' | 'link'; src: string } {
  const url = rawUrl.trim();
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt?.[1]) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo?.[1]) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'video', src: url };
  return { type: 'link', src: url };
}

function getFigmaEmbedUrl(rawUrl: string): string {
  const clean = rawUrl.trim();
  if (clean.includes('figma.com/embed')) return clean;
  return `https://www.figma.com/embed?embed_host=nanasore&url=${encodeURIComponent(clean)}`;
}

export const ThemeServicePortfolio: React.FC<StoreThemeProps> = ({
  storeSlug = 'prestataire',
  storeConfig,
  customConfig,
  allProducts,
  filteredProducts,
  onBuyNow,
  onSelectProduct,
  isStoreAdmin,
  displayBanners,
}) => {
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'PORTFOLIO'>('SERVICES');
  const [detailService, setDetailService] = useState<StoreProductItem | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  // Portfolio items (vidéos, Figma, liens web, diaporama images)
  const portfolioStorageKey = `nana_service_portfolio_${storeSlug}`;
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(portfolioStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_PORTFOLIO_ITEMS;
  });

  // Slideshow index for image carousels in portfolio
  const [slideTick, setSlideTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideTick((prev) => prev + 1), 3500);
    return () => clearInterval(t);
  }, []);

  // Add portfolio modal/form state (admin)
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newPfKind, setNewPfKind] = useState<PortfolioItem['kind']>('video');
  const [newPfTitle, setNewPfTitle] = useState('');
  const [newPfSubtitle, setNewPfSubtitle] = useState('');
  const [newPfUrl, setNewPfUrl] = useState('');
  const [newPfSlideshowRaw, setNewPfSlideshowRaw] = useState('');

  // Modal Prise de Rendez-vous 1-to-1
  const [bookingService, setBookingService] = useState<StoreProductItem | null>(null);
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingNote, setBookingNote] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingConfirmedMsg, setBookingConfirmedMsg] = useState<string | null>(null);

  const heroSlides = useMemo(() => {
    const customSlides = (displayBanners && displayBanners.length > 0 ? displayBanners : []).slice(0, 3);
    if (customSlides.length >= 3) return customSlides;
    return [
      ...customSlides,
      ...DEFAULT_HERO_BANNERS.slice(customSlides.length, 3)
    ];
  }, [displayBanners]);

  // Carrousel infini automatique des 3 bannières Hero
  useEffect(() => {
    if (isHeroPaused || heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHeroPaused, heroSlides.length]);

  const servicesList = filteredProducts && filteredProducts.length > 0 ? filteredProducts : allProducts;
  const brandTitle = customConfig?.storeName || storeConfig?.storeName || 'Studio Prestige';
  const brandTagline = customConfig?.storeTagline || storeConfig?.welcomeText || 'Expertise & Réalisations Sur-Mesure';
  const whatsappSupport = customConfig?.whatsappNumber || storeConfig?.whatsappPhone || '+22666782920';

  const persistPortfolio = async (nextList: PortfolioItem[]) => {
    setPortfolioItems(nextList);
    try {
      localStorage.setItem(portfolioStorageKey, JSON.stringify(nextList));
      await supabase.from('app_registry').upsert({
        key: `service_portfolio_${storeSlug}`,
        name: 'service_portfolio',
        tenant_id: storeSlug,
        module_key: 'service_portfolio',
        config_json: { items: nextList, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' }).then(null, () => {});
    } catch {}
  };

  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPfTitle.trim()) return;
    const slides = newPfSlideshowRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));

    const item: PortfolioItem = {
      id: `pf_${Date.now()}`,
      kind: newPfKind,
      title: newPfTitle.trim(),
      subtitle: newPfSubtitle.trim() || undefined,
      url: newPfUrl.trim(),
      slideshowUrls: newPfKind === 'slideshow' ? slides : undefined
    };

    const nextList = [item, ...portfolioItems];
    await persistPortfolio(nextList);
    playValidationBeep();
    setNewPfTitle('');
    setNewPfSubtitle('');
    setNewPfUrl('');
    setNewPfSlideshowRaw('');
    setShowAddPortfolio(false);
  };

  const handleDeletePortfolioItem = async (id: string) => {
    playTapBeep();
    await persistPortfolio(portfolioItems.filter((it) => it.id !== id));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingService || !bookingName.trim() || !bookingPhone.trim() || !bookingDate) return;
    setIsSubmittingBooking(true);
    playTapBeep();

    try {
      const bookingId = `rdv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await supabase.from('coaching_bookings').insert({
        id: bookingId,
        coach_id: storeSlug,
        store_id: storeSlug,
        service_id: bookingService.id,
        service_name: bookingService.name,
        student_name: bookingName.trim(),
        student_phone: bookingPhone.trim(),
        scheduled_date: bookingDate,
        scheduled_time: bookingTime,
        notes: bookingNote.trim() || null,
        amount: bookingService.price || 0,
        status: 'pending',
        created_at: new Date().toISOString()
      }).then(null, () => {});

      playValidationBeep();
      setBookingConfirmedMsg(
        `Rendez-vous demandé pour « ${bookingService.name} » le ${bookingDate} à ${bookingTime}. Le prestataire vient d'être notifié en direct !`
      );
      setTimeout(() => {
        setBookingService(null);
        setBookingConfirmedMsg(null);
        setBookingNote('');
      }, 3200);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* HEADER ÉDITORIAL PRESTIGE */}
      <header className="sticky top-0 z-30 bg-[#07090E]/90 backdrop-blur-xl border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {storeConfig?.logoUrl || customConfig?.logoUrl ? (
              <img
                src={customConfig?.logoUrl || storeConfig?.logoUrl}
                alt={brandTitle}
                className="w-11 h-11 rounded-2xl object-cover border border-amber-400/50 shadow-lg"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                {brandTitle.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{brandTitle}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                  Prestataire Vérifié
                </span>
              </h1>
              <p className="text-xs text-slate-400">{brandTagline}</p>
            </div>
          </div>

          {/* Onglets Affiches Services vs Réalisations Portfolio */}
          <nav className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('SERVICES'); }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SERVICES'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Prestations & Affiches</span>
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('PORTFOLIO'); }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PORTFOLIO'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayersIconFallback />
              <span>Réalisations & Portfolio</span>
            </button>
          </nav>
        </div>
      </header>

      {/* HERO CARROUSEL INFINI DE 3 BANNIÈRES */}
      <section
        className="relative overflow-hidden border-b border-amber-500/15"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${heroIndex * 100}%)` }}
        >
          {heroSlides.map((slide, idx) => (
            <div key={idx} className="w-full shrink-0 relative min-h-[360px] sm:min-h-[440px] flex items-center">
              <img
                src={slide.image}
                alt={slide.title || `Annonce ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/85 to-transparent" />
              <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 py-12 space-y-4">
                {slide.badge && (
                  <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                    {slide.badge}
                  </span>
                )}
                <h2 className="text-3xl sm:text-5xl font-black text-white max-w-3xl leading-[1.1] tracking-tight">
                  {slide.title}
                </h2>
                <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveTab('SERVICES');
                    }}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
                  >
                    <span>Découvrir les prestations</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveTab('PORTFOLIO');
                    }}
                    className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    Voir le Portfolio
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contrôles carrousel */}
        <button
          type="button"
          onClick={() => setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center cursor-pointer transition"
          aria-label="Bannière précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center cursor-pointer transition"
          aria-label="Bannière suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setHeroIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                heroIndex === idx ? 'w-8 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* CLAUSE DE SÉCURITÉ ESCROW (ANTI-PAIEMENT HORS SITE) */}
      <div className="bg-emerald-950/40 border-b border-emerald-500/25 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-300 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Sécurité Escrow : Aucun paiement ne doit être effectué en dehors du site. Vos fonds restent protégés sous séquestre jusqu’à la validation finale de votre prestation.
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        {activeTab === 'SERVICES' ? (
          detailService ? (
            <ServiceWideDetailView
              service={detailService}
              storeConfig={storeConfig}
              brandTitle={brandTitle}
              storeSlug={storeSlug}
              whatsappSupport={whatsappSupport}
              onBack={() => setDetailService(null)}
              onBookCoaching={(svc) => setBookingService(svc)}
              onBuyNow={onBuyNow}
            />
          ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Offres & Prestations
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Nos Affiches & Services Premium
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {servicesList.length} prestation(s) disponible(s)
              </span>
            </div>

            {servicesList.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <p className="text-base font-bold text-slate-300">Aucune affiche de service publiée pour l’instant.</p>
                <p className="text-xs text-slate-500">Ajoutez vos services depuis le constructeur de produits.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {servicesList.map((service) => {
                  const isCoachingLinked = (service as any).linkedToLiveCoaching !== false;
                  const cleanHtml = service.description ? sanitizeRichHtml(service.description) : '';

                  return (
                    <article
                      key={service.id}
                      className="rounded-3xl bg-gradient-to-br from-slate-900/95 via-[#0B0F1A] to-slate-950 border border-amber-500/25 hover:border-amber-400/60 overflow-hidden shadow-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12"
                    >
                      {/* Grande Photo Affiche / Mini-Bannière */}
                      <div
                        onClick={() => {
                          playTapBeep();
                          setDetailService(service);
                        }}
                        className="lg:col-span-5 relative min-h-[240px] sm:min-h-[300px] bg-slate-950 overflow-hidden cursor-pointer group"
                      >
                        {service.image ? (
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Briefcase className="w-16 h-16" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        {service.badge && (
                          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-lg">
                            {service.badge}
                          </span>
                        )}
                        <span className="absolute bottom-4 left-4 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs font-bold text-slate-200">
                          {service.category || 'Service Pro'}
                        </span>
                      </div>

                      {/* Contenu Affiche Large + Boutons RDV, Voir Direct & Escrow */}
                      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h4
                              onClick={() => {
                                playTapBeep();
                                setDetailService(service);
                              }}
                              className="text-xl sm:text-2xl font-black text-white leading-snug hover:text-amber-300 transition cursor-pointer"
                            >
                              {service.name}
                            </h4>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-slate-400 block">Tarif indicatif</span>
                              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                                {service.price > 0 ? formatCFA(service.price) : 'Sur devis'}
                              </span>
                            </div>
                          </div>

                          {cleanHtml ? (
                            <div
                              className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed line-clamp-5"
                              dangerouslySetInnerHTML={{ __html: cleanHtml }}
                            />
                          ) : (
                            <p className="text-sm text-slate-400">
                              Prestation professionnelle sur-mesure avec suivi transparent et garantie séquestre.
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-800/80 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {isCoachingLinked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTapBeep();
                                    setBookingService(service);
                                  }}
                                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                                >
                                  <Calendar className="w-4 h-4" />
                                  <span>Prendre Rendez-vous</span>
                                </button>

                                <BuyerLiveCallButton
                                  productId={service.id}
                                  productName={service.name}
                                  productPrice={service.price}
                                  productImage={service.image}
                                  storeName={brandTitle}
                                  whatsappPhone={whatsappSupport}
                                  sellerId={storeSlug}
                                  buttonText="Voir Direct (Vidéo)"
                                  className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
                                />
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                playTapBeep();
                                onBuyNow(service, 1);
                              }}
                              className={`py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer ${
                                !isCoachingLinked ? 'sm:col-span-3' : ''
                              }`}
                            >
                              <Lock className="w-4 h-4" />
                              <span>Réserver (Escrow)</span>
                            </button>
                          </div>
                            <button
                              type="button"
                              onClick={() => {
                                playTapBeep();
                                setDetailService(service);
                              }}
                              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
                            >
                              Voir la fiche complète, médias ({(service.mediaSlides?.length || 0) + (service.image ? 1 : 0)}), FAQ & avis →
                            </button>
                          <p className="text-[11px] text-emerald-400/90 font-semibold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Aucun paiement hors site • Le prestataire envoie votre devis & accès directement dans le chat après échange.</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          )
        ) : (
          /* PAGE RÉALISATIONS & PORTFOLIO */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Portfolio & Preuves
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Nos Réalisations (Vidéos, Figma, Sites & Diaporamas)
                </h3>
              </div>

              {isStoreAdmin && (
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setShowAddPortfolio((prev) => !prev); }}
                  className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une réalisation par lien</span>
                </button>
              )}
            </div>

            {isStoreAdmin && showAddPortfolio && (
              <form
                onSubmit={handleAddPortfolioItem}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-amber-400/40 space-y-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'video', label: 'Vidéo (YouTube/MP4)', icon: Film },
                    { id: 'figma', label: 'Maquette Figma', icon: Figma },
                    { id: 'web', label: 'Lien Réalisation', icon: Globe },
                    { id: 'slideshow', label: 'Diaporama Images', icon: Images }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewPfKind(opt.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition ${
                          newPfKind === opt.id
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newPfTitle}
                    onChange={(e) => setNewPfTitle(e.target.value)}
                    placeholder="Titre de la réalisation *"
                    className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newPfSubtitle}
                    onChange={(e) => setNewPfSubtitle(e.target.value)}
                    placeholder="Sous-titre / Client / Secteur (optionnel)"
                    className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {newPfKind === 'slideshow' ? (
                  <textarea
                    rows={3}
                    required
                    value={newPfSlideshowRaw}
                    onChange={(e) => setNewPfSlideshowRaw(e.target.value)}
                    placeholder="Collez plusieurs liens d'images (un par ligne ou séparés par des virgules : ImgBB, Postimages...)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                  />
                ) : (
                  <input
                    type="url"
                    required
                    value={newPfUrl}
                    onChange={(e) => setNewPfUrl(e.target.value)}
                    placeholder={
                      newPfKind === 'figma'
                        ? 'https://www.figma.com/file/... ou /design/...'
                        : newPfKind === 'video'
                          ? 'https://youtube.com/watch?v=... ou .mp4'
                          : 'https://votre-realisation.com'
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                  />
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPortfolio(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                  >
                    Publier dans le Portfolio
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolioItems.map((item) => {
                const videoInfo = item.kind === 'video' ? getEmbedVideoUrl(item.url) : null;
                const slides = item.slideshowUrls || [];
                const activeSlideImg = slides.length > 0 ? slides[slideTick % slides.length] : '';

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/40 overflow-hidden shadow-xl flex flex-col justify-between"
                  >
                    <div className="aspect-video bg-slate-950 relative overflow-hidden">
                      {item.kind === 'video' && videoInfo && (
                        videoInfo.type === 'iframe' ? (
                          <iframe src={videoInfo.src} className="w-full h-full border-0" allowFullScreen title={item.title} />
                        ) : videoInfo.type === 'video' ? (
                          <video src={videoInfo.src} controls className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <a href={videoInfo.src} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black flex items-center gap-2">
                              <Film className="w-4 h-4" /> Ouvrir la vidéo
                            </a>
                          </div>
                        )
                      )}

                      {item.kind === 'figma' && (
                        <iframe
                          src={getFigmaEmbedUrl(item.url)}
                          className="w-full h-full border-0"
                          allowFullScreen
                          title={item.title}
                        />
                      )}

                      {item.kind === 'slideshow' && activeSlideImg && (
                        <img
                          src={activeSlideImg}
                          alt={item.title}
                          className="w-full h-full object-cover transition-opacity duration-500"
                        />
                      )}

                      {item.kind === 'web' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-indigo-950/60 space-y-3">
                          <Globe className="w-12 h-12 text-amber-400" />
                          <span className="text-xs font-mono text-slate-300 truncate max-w-full px-4">{item.url}</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5"
                          >
                            <span>Visiter la réalisation</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {isStoreAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolioItem(item.id)}
                          className="absolute top-3 right-3 p-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white cursor-pointer shadow-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-5 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-black text-white">{item.title}</h4>
                        {item.subtitle && <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>}
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 shrink-0"
                          title="Ouvrir le lien"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRISE DE RENDEZ-VOUS 1-TO-1 */}
      {bookingService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-400/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Rendez-vous Live Coaching 1-to-1
                </span>
                <h3 className="text-lg font-black text-white">{bookingService.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingService(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingConfirmedMsg ? (
              <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-200">{bookingConfirmedMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Votre nom complet *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      placeholder="Ex: Aminata Ouédraogo"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone / WhatsApp *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      placeholder="Ex: +226 70 00 00 00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Date souhaitée *</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Heure *</label>
                    <input
                      type="time"
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Détail de votre besoin</label>
                  <textarea
                    rows={2}
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Décrivez brièvement votre projet..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Aucun paiement hors site : votre devis sécurisé Escrow vous sera envoyé dans le chat.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingBooking ? 'Envoi en cours...' : 'Confirmer le Rendez-vous'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function LayersIconFallback() {
  return <Images className="w-4 h-4" />;
}

export default ThemeServicePortfolio;
