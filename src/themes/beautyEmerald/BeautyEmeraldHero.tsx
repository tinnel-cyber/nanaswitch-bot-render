import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Tag, ShieldCheck, ArrowRight, Play } from 'lucide-react';
import { ThemeCustomizationConfig } from '../../types';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import {
  BOTANICAL_LEAF_PATTERN_CORNER_SVG,
  BEAUTY_HERO_PODIUM_FLACONS_SVG,
  BEAUTY_FLACON_SERUM_SVG,
  BEAUTY_FLACON_PARFUM_SVG
} from './beautyEmeraldAssets';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';

export interface BeautyEmeraldHeroProps {
  storeDescription?: string;
  bannerImage?: string;
  customBanners?: any[];
  onCtaClick?: (cat?: string) => void;
  onExploreCollection?: () => void;
  onOpenVipRoutine?: () => void;
  customConfig?: ThemeCustomizationConfig;
}

interface BeautySlideItem {
  id: number;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  priceHighlight?: string;
  ctaText: string;
  image: string;
  trustTitle: string;
  trustSubtitle: string;
}

const DEFAULT_HERO_SLIDES: BeautySlideItem[] = [
  {
    id: 1,
    eyebrow: 'Collection Haute Beauté 2026',
    titleLine1: 'Révélez la Beauté',
    titleLine2: 'de Votre Peau',
    description:
      'Des élixirs botaniques purs formulés avec des actifs précieux et pressés à froid pour sublimer votre éclat naturel dès 14 jours.',
    priceHighlight: 'À partir de 12 500 FCFA',
    ctaText: 'Découvrir la Collection',
    image: BEAUTY_HERO_PODIUM_FLACONS_SVG,
    trustTitle: 'Formule Certifiée 100% Pure',
    trustSubtitle: 'Sans parabènes • Testé dermatologiquement'
  },
  {
    id: 2,
    eyebrow: 'Sérum Concentré Éclat Or 24K',
    titleLine1: 'L’Élixir Jeunesse',
    titleLine2: '& Régénération',
    description:
      'Enrichi en Acide Hyaluronique pur et Vitamine C stabilisée pour lisser le grain de peau et offrir une hydratation veloutée 24h.',
    priceHighlight: 'Sérum C+ • 18 500 FCFA',
    ctaText: 'Explorer les Sérums',
    image: BEAUTY_FLACON_SERUM_SVG,
    trustTitle: 'Résultats Visibles en 14 Jours',
    trustSubtitle: '98% de clientes satisfaites'
  },
  {
    id: 3,
    eyebrow: 'Haute Parfumerie & Extraits',
    titleLine1: 'Sillage Rare',
    titleLine2: 'Oud & Rose d’Or',
    description:
      'Une alchimie envoûtante de rose de Damas et de bois de Oud ambré dans un flacon cristal facetté haute couture.',
    priceHighlight: 'Extrait Pur • 35 000 FCFA',
    ctaText: 'Découvrir les Parfums',
    image: BEAUTY_FLACON_PARFUM_SVG,
    trustTitle: 'Tenue Intense 24 Heures',
    trustSubtitle: 'Essences naturelles d’exception'
  }
];

export const BeautyEmeraldHero: React.FC<BeautyEmeraldHeroProps> = ({
  storeDescription,
  bannerImage,
  customBanners,
  onCtaClick,
  onExploreCollection,
  onOpenVipRoutine,
  customConfig
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const slides = useMemo<BeautySlideItem[]>(() => {
    const firstCustomBanner = customBanners && customBanners.length > 0 ? customBanners[0] : null;
    const firstSlide: BeautySlideItem = {
      ...DEFAULT_HERO_SLIDES[0],
      eyebrow: customConfig?.heroSubtitle || firstCustomBanner?.subtitle || DEFAULT_HERO_SLIDES[0].eyebrow,
      titleLine1: customConfig?.heroTitle || firstCustomBanner?.title || DEFAULT_HERO_SLIDES[0].titleLine1,
      titleLine2: (customConfig?.heroTitle || firstCustomBanner?.title) ? '' : DEFAULT_HERO_SLIDES[0].titleLine2,
      description:
        customConfig?.heroDescription ||
        storeDescription ||
        DEFAULT_HERO_SLIDES[0].description,
      priceHighlight:
        customConfig?.heroPriceHighlight || DEFAULT_HERO_SLIDES[0].priceHighlight,
      ctaText: customConfig?.heroCtaText || firstCustomBanner?.cta || DEFAULT_HERO_SLIDES[0].ctaText,
      image:
        customConfig?.heroBannerImageUrl ||
        bannerImage ||
        firstCustomBanner?.imageUrl ||
        DEFAULT_HERO_SLIDES[0].image,
      trustTitle:
        customConfig?.reassurance3Title || DEFAULT_HERO_SLIDES[0].trustTitle,
      trustSubtitle:
        customConfig?.reassurance3Desc || DEFAULT_HERO_SLIDES[0].trustSubtitle
    };
    return [firstSlide, DEFAULT_HERO_SLIDES[1], DEFAULT_HERO_SLIDES[2]];
  }, [
    customConfig?.heroSubtitle,
    customConfig?.heroTitle,
    customConfig?.heroDescription,
    customConfig?.heroPriceHighlight,
    customConfig?.heroCtaText,
    customConfig?.heroBannerImageUrl,
    customConfig?.reassurance3Title,
    customConfig?.reassurance3Desc,
    storeDescription,
    bannerImage,
    customBanners
  ]);

  // Reset sur la slide 0 dès qu'une personnalisation Hero est modifiée dans le Customizer
  useEffect(() => {
    setActiveSlideIndex(0);
  }, [
    customConfig?.heroSubtitle,
    customConfig?.heroTitle,
    customConfig?.heroDescription,
    customConfig?.heroBannerImageUrl,
    customConfig?.heroCtaText,
    customConfig?.heroPriceHighlight
  ]);

  const currentSlide = slides[activeSlideIndex] || slides[0];
  const heroVideoUrl = customConfig?.heroVideoUrl;

  const handlePrev = () => {
    playTapBeep();
    setActiveSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    playTapBeep();
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleCtaAction = () => {
    playValidationBeep();
    if (customConfig?.heroCtaUrl && customConfig.heroCtaUrl.startsWith('http')) {
      window.open(customConfig.heroCtaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    if (onExploreCollection) {
      onExploreCollection();
    }
  };

  return (
    <section className="beauty-emerald-hero" aria-label="Bannière Principale Haute Beauté">
      {/* Motifs botaniques subtils aux coins */}
      <img
        src={BOTANICAL_LEAF_PATTERN_CORNER_SVG}
        alt=""
        aria-hidden="true"
        className="beauty-botanical-corner beauty-botanical-top-left"
      />
      <img
        src={BOTANICAL_LEAF_PATTERN_CORNER_SVG}
        alt=""
        aria-hidden="true"
        className="beauty-botanical-corner beauty-botanical-bottom-right"
      />

      {/* Grille 50/50 Éditoriale */}
      {/* Grille 50/50 Éditoriale */}
      <div className="beauty-emerald-hero-grid">
        {/* Colonne Gauche : Typographie Haute Couture & Actions */}
        <div className="beauty-emerald-hero-content">
          <LiveEditable
            label="Accroche / Catégorie Hero"
            field="heroSubtitle"
            value={customConfig?.heroSubtitle || currentSlide.eyebrow}
            targetAccordion={2}
            isInline={true}
          >
            <span className="emerald-eyebrow">{customConfig?.heroSubtitle || currentSlide.eyebrow}</span>
          </LiveEditable>

          <LiveEditable
            label="Titre Principal Hero"
            field="heroTitle"
            value={customConfig?.heroTitle || `${currentSlide.titleLine1} ${currentSlide.titleLine2 || ''}`}
            targetAccordion={2}
          >
            <h1 className="emerald-title-giant">
              {customConfig?.heroTitle || (
                <>
                  {currentSlide.titleLine1}
                  {currentSlide.titleLine2 && (
                    <>
                      <br />
                      <span>{currentSlide.titleLine2}</span>
                    </>
                  )}
                </>
              )}
            </h1>
          </LiveEditable>

          <LiveEditable
            label="Description Hero"
            field="heroDescription"
            value={customConfig?.heroDescription || currentSlide.description}
            type="textarea"
            targetAccordion={2}
          >
            <p className="beauty-emerald-hero-desc">{customConfig?.heroDescription || currentSlide.description}</p>
          </LiveEditable>

          {currentSlide.priceHighlight && (
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F4C3A]/8 border border-[#C59B27]/40 text-[#0F4C3A] text-xs font-bold tracking-wider uppercase w-fit">
              <Tag className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{currentSlide.priceHighlight}</span>
            </div>
          )}

          <div className="beauty-emerald-hero-actions">
            <LiveEditable
              label="Bouton CTA Hero"
              field="heroCtaText"
              value={customConfig?.heroCtaText || currentSlide.ctaText}
              targetAccordion={2}
              isInline={true}
            >
              <button
                type="button"
                onClick={handleCtaAction}
                className="emerald-btn-strict flex items-center gap-2.5 cursor-pointer"
                style={
                  customConfig?.primaryAccentColor
                    ? { backgroundColor: customConfig.primaryAccentColor }
                    : undefined
                }
              >
                <span>{customConfig?.heroCtaText || currentSlide.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </LiveEditable>

            {onOpenVipRoutine && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenVipRoutine();
                }}
                className="px-6 py-4 rounded-[2px] border border-[#0F4C3A]/30 hover:border-[#0F4C3A] text-[#111C18] font-['Outfit'] font-semibold text-xs uppercase tracking-[0.12em] transition flex items-center gap-2 cursor-pointer bg-white/60 backdrop-blur-xs"
              >
                <Play className="w-3.5 h-3.5 text-[#0F4C3A] fill-[#0F4C3A]" />
                <span> Diagnostic & Routine VIP</span>
              </button>
            )}
          </div>
        </div>

        {/* Colonne Droite : Composition Visuelle Podium & Contrôles Carrousel */}
        <div className="beauty-emerald-hero-visual">
          <div className="beauty-emerald-hero-image-card">
            {/* Bouton Précédent */}
            <button
              type="button"
              onClick={handlePrev}
              className="beauty-emerald-slider-btn prev"
              aria-label="Diapositive précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Vidéo Hero ou Image Podium */}
            <LiveEditable
              label="Visuel Flacon / Podium Hero"
              field="heroBannerImageUrl"
              value={customConfig?.heroBannerImageUrl || currentSlide.image}
              type="image"
              targetAccordion={2}
            >
              {heroVideoUrl && activeSlideIndex === 0 ? (
                <video
                  src={heroVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={currentSlide.image}
                  className="beauty-emerald-hero-img object-cover"
                />
              ) : (
                <img
                  src={customConfig?.heroBannerImageUrl || currentSlide.image}
                  alt={currentSlide.titleLine1}
                  className="beauty-emerald-hero-img"
                  loading="eager"
                />
              )}
            </LiveEditable>

            {/* Bouton Suivant */}
            <button
              type="button"
              onClick={handleNext}
              className="beauty-emerald-slider-btn next"
              aria-label="Diapositive suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pilule de réassurance flottante en bas à gauche */}
            <div className="beauty-emerald-trust-pill">
              <div className="w-9 h-9 rounded-full bg-[#0F4C3A] text-[#C59B27] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-['Outfit'] font-bold text-xs text-[#111C18] leading-tight">
                  {currentSlide.trustTitle}
                </div>
                <div className="font-['Outfit'] text-[11px] text-[#525E58] leading-tight mt-0.5">
                  {currentSlide.trustSubtitle}
                </div>
              </div>
            </div>

            {/* Indicateurs de pagination (dots) */}
            <div className="beauty-emerald-slider-dots">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveSlideIndex(idx);
                  }}
                  className={`beauty-emerald-dot ${activeSlideIndex === idx ? 'active' : ''}`}
                  aria-label={`Aller à la diapositive ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
