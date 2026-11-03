import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight,
  Eye,
  Sliders,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

// ============================================================================
// TYPES DU MODULE SCROLLYTELLING (ANIMATION PRODUIT AU SCROLL)
// ============================================================================

export interface ScrollyFeature {
  id: string;
  badge?: string;       // ex: "INGÉNIERIE TITANE 💎"
  title: string;        // ex: "Design Monolithique en Verre Dépoli & Titane"
  description: string;  // ex: "Conçu pour résister aux conditions extrêmes..."
  accentColor?: string; // ex: "#6366f1"
  highlightStat?: string; // ex: "99.8% Résistance"
}

export interface ScrollytellingData {
  kickerBadge?: string;
  productTitle?: string;
  productSubtitle?: string;
  productImage?: string;
  features?: ScrollyFeature[];
  accentColor?: string;
  bgColor?: string;
  containerHeightVh?: number; // Hauteur totale du scroll (ex: 300vh pour 3 étapes)
  imageScaleEffect?: boolean; // Zoom subtil 3D selon l'étape
  ctaText?: string;
  ctaLink?: string;
}

export interface ScrollytellingBlockProps {
  block?: { id?: string; data?: ScrollytellingData };
  data?: ScrollytellingData;
  activeProduct?: {
    name?: string;
    image?: string;
    price?: number;
    description?: string;
  } | null;
  isBuilderMode?: boolean;
  className?: string;
}

// ============================================================================
// DONNÉES PAR DÉFAUT (STANDARDS APPLE / WEBFLOW HAUT DE GAMME)
// ============================================================================

export const DEFAULT_SCROLLY_FEATURES: ScrollyFeature[] = [
  {
    id: 'scrolly-feat-1',
    badge: '1. CHÂSSIS & MATÉRIAUX 💎',
    title: 'Structure Monolithique en Titane Brossé',
    description: 'Chaque millimètre a été sculpté pour allier légèreté extrême et robustesse industrielle. Une finition haut de gamme qui capte la lumière sous tous les angles.',
    accentColor: '#6366f1',
    highlightStat: 'Aéronautique Grade 5'
  },
  {
    id: 'scrolly-feat-2',
    badge: '2. PERFORMANCE HYBRIDE ⚡',
    title: 'Moteur Turbo 10x Plus Réactif',
    description: 'Une réactivité instantanée pensée pour l\'Afrique. Fonctionne à 100% même en basse connexion avec synchronisation automatique Wave et Orange Money.',
    accentColor: '#10b981',
    highlightStat: '0.08s Temps de Réponse'
  },
  {
    id: 'scrolly-feat-3',
    badge: '3. AUTONOMIE & LIBERTÉ 🔋',
    title: 'Batterie Longue Durée & Résistance Climat',
    description: 'Conçu pour tenir jusqu\'à 72 heures sans recharge. Protection intégrale contre la poussière et les fortes chaleurs pour une sérénité totale au quotidien.',
    accentColor: '#f59e0b',
    highlightStat: '72h d\'Autonomie'
  },
  {
    id: 'scrolly-feat-4',
    badge: '4. SÉCURITÉ & GARANTIE 🛡️',
    title: 'Garantie Totale 12 Mois & Zéro Compromis',
    description: 'Testé et certifié avec vérification du colis avant paiement. Si vous n\'êtes pas comblé dès les premiers jours, vous êtes intégralement remboursé.',
    accentColor: '#ec4899',
    highlightStat: '100% Satisfait ou Remboursé'
  }
];

export const DEFAULT_SCROLLYTELLING_DATA: ScrollytellingData = {
  kickerBadge: 'PRÉSENTATION IMMERSIVE PRODUIT 3D',
  productTitle: 'L\'Ingénierie de Précision à Son Sommet',
  productSubtitle: 'Faites défiler pour explorer chaque détail technique de conception.',
  productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
  features: DEFAULT_SCROLLY_FEATURES,
  accentColor: '#6366f1',
  bgColor: '#040714',
  containerHeightVh: 320,
  imageScaleEffect: true,
  ctaText: 'Commander Maintenant • Offre Flash ➔',
  ctaLink: '#checkout'
};

// ============================================================================
// COMPOSANT PRINCIPAL : ScrollytellingBlock
// ============================================================================

export const ScrollytellingBlock: React.FC<ScrollytellingBlockProps> = ({
  block,
  data: propsData,
  activeProduct,
  isBuilderMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fusion des configurations
  const data: ScrollytellingData = useMemo(() => {
    return {
      ...DEFAULT_SCROLLYTELLING_DATA,
      ...(block?.data || {}),
      ...(propsData || {})
    };
  }, [block?.data, propsData]);

  const features = (data.features && data.features.length > 0) ? data.features : DEFAULT_SCROLLY_FEATURES;
  const totalSteps = features.length;

  const productImage = data.productImage || activeProduct?.image || DEFAULT_SCROLLYTELLING_DATA.productImage;
  const productTitle = data.productTitle || activeProduct?.name || DEFAULT_SCROLLYTELLING_DATA.productTitle;
  const baseAccentColor = data.accentColor || '#6366f1';

  // État de la progression du scroll (0 à 1)
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Écouteur de scroll haute performance via getBoundingClientRect
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;

      // Distance totale parcourable par le scroll dans cette section
      const totalScrollableDistance = rect.height - viewportHeight;

      if (totalScrollableDistance <= 0) {
        setScrollProgress(0);
        setActiveStepIndex(0);
        return;
      }

      // Distance déjà scrollée depuis le haut de la section
      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / totalScrollableDistance));
      setScrollProgress(progress);

      // Calcul de l'étape active (0 à totalSteps - 1)
      const step = Math.min(totalSteps - 1, Math.floor(progress * totalSteps));
      setActiveStepIndex(step);
    };

    // Écoute sur la fenêtre
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Si dans l'éditeur NaNa Studio, écouter également le conteneur de canvas s'il existe
    const canvasScrollParent = containerRef.current?.closest('.overflow-y-auto');
    if (canvasScrollParent) {
      canvasScrollParent.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (canvasScrollParent) {
        canvasScrollParent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [totalSteps]);

  const activeFeature = features[activeStepIndex] || features[0];
  const stepAccentColor = activeFeature.accentColor || baseAccentColor;

  // Calcul d'effets visuels pour l'image centrale selon la progression
  const imageScale = 0.92 + (activeStepIndex * 0.05);
  const imageRotation = (activeStepIndex % 2 === 0 ? 1 : -1) * (activeStepIndex * 2.5);

  const containerHeight = `${data.containerHeightVh || 320}vh`;

  return (
    <section
      ref={containerRef}
      style={{
        backgroundColor: data.bgColor || '#040714',
        minHeight: containerHeight
      }}
      className={`relative w-full text-slate-100 font-sans select-none ${className}`}
    >
      {/* ================================================================== */}
      {/* CONTENEUR STICKY QUI RESTE FIXÉ EN PLEIN ÉCRAN PENDANT LE DÉFILEMENT */}
      {/* ================================================================== */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden px-4 sm:px-8 py-6 sm:py-10 z-20">
        
        {/* Halo de lumière d'ambiance qui s'adapte à la couleur de la fonctionnalité */}
        <motion.div
          animate={{
            background: `radial-gradient(circle at 50% 50%, ${stepAccentColor}35 0%, transparent 68%)`
          }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* 1. EN-TÊTE FIXE DU SCROLLYTELLING */}
        <div className="relative z-10 max-w-5xl mx-auto w-full text-center space-y-1">
          <div
            style={{
              backgroundColor: `${stepAccentColor}18`,
              borderColor: `${stepAccentColor}50`,
              color: stepAccentColor
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider border shadow-md backdrop-blur-md transition-colors duration-300"
          >
            <Sparkles className="w-3 h-3 fill-current animate-pulse" />
            <span>{data.kickerBadge || 'PRÉSENTATION IMMERSIVE PRODUIT 3D'}</span>
          </div>

          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            {productTitle}
          </h2>

          {/* Jauge de progression du Scrollytelling façon Apple */}
          <div className="max-w-xs mx-auto pt-1 flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
              Étape {activeStepIndex + 1}/{totalSteps}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
              <div
                style={{
                  width: `${Math.round(scrollProgress * 100)}%`,
                  backgroundColor: stepAccentColor,
                  boxShadow: `0 0 10px ${stepAccentColor}90`
                }}
                className="h-full rounded-full transition-all duration-150"
              />
            </div>
            <span style={{ color: stepAccentColor }} className="text-[10px] font-mono font-bold shrink-0">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        </div>

        {/* 2. CENTRE : LAYOUT SPLIT SCROLLYTELLING (IMAGE FIXE + TEXTES GLISSANTS) */}
        <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 my-auto">
          
          {/* COLONNE GAUCHE / CENTRE : IMAGE PRINCIPALE FIXÉE */}
          <div className="w-full lg:w-1/2 flex items-center justify-center relative">
            {/* Anneaux futuristes d'aura */}
            <div
              style={{ borderColor: `${stepAccentColor}30` }}
              className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-dashed animate-[spin_60s_linear_infinite] pointer-events-none"
            />
            
            <motion.div
              animate={{
                scale: data.imageScaleEffect ? imageScale : 1,
                rotate: imageRotation
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="relative w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden p-2 bg-gradient-to-tr from-slate-900/90 via-slate-950 to-slate-900/90 border border-slate-800/80 shadow-2xl shadow-black/80"
            >
              <img
                src={productImage}
                alt={productTitle}
                className="w-full h-full object-cover rounded-2xl"
                loading="eager"
              />

              {/* Badge flottant sur l'image */}
              {activeFeature.highlightStat && (
                <motion.div
                  key={activeFeature.highlightStat}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    backgroundColor: `${stepAccentColor}25`,
                    borderColor: stepAccentColor,
                    color: '#ffffff'
                  }}
                  className="absolute bottom-4 left-4 right-4 sm:right-auto px-3.5 py-1.5 rounded-xl border backdrop-blur-md text-xs font-black shadow-xl flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>{activeFeature.highlightStat}</span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* COLONNE DROITE : CARTE DE FONCTIONNALITÉ GLISSANTE AU SCROLL */}
          <div className="w-full lg:w-1/2 max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id || activeStepIndex}
                initial={{ opacity: 0, y: 25, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -25, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  borderColor: `${stepAccentColor}50`,
                  backgroundColor: 'rgba(11, 16, 33, 0.85)'
                }}
                className="p-5 sm:p-7 rounded-3xl border shadow-2xl backdrop-blur-2xl space-y-4"
              >
                {/* Badge de l'étape */}
                {activeFeature.badge && (
                  <div
                    style={{ color: stepAccentColor }}
                    className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{activeFeature.badge}</span>
                  </div>
                )}

                {/* Titre de la fonctionnalité */}
                <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  {activeFeature.title}
                </h3>

                {/* Description fluide */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {activeFeature.description}
                </p>

                {/* Stepper Dots interactifs */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {features.map((_, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: i === activeStepIndex ? stepAccentColor : 'rgba(71, 85, 105, 0.5)',
                          width: i === activeStepIndex ? '20px' : '6px'
                        }}
                        className="h-1.5 rounded-full transition-all duration-300"
                      />
                    ))}
                  </div>

                  {activeStepIndex === totalSteps - 1 ? (
                    <a
                      href={data.ctaLink || '#checkout'}
                      style={{ backgroundColor: stepAccentColor }}
                      className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{data.ctaText || 'Commander ➔'}</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Faites défiler pour la suite ↓
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 3. PIED DE PAGE FIXE : NOTICE ET PROGRESSION GLOBALE */}
        <div className="relative z-10 text-center pb-2">
          {isBuilderMode && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10.5px] text-slate-400">
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>Scrollytelling Actif • Défilez vers le bas pour tester les {totalSteps} étapes</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ScrollytellingBlock;
