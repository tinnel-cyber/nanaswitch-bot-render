import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  Zap,
  Globe,
  Tag,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Sliders,
  RotateCcw
} from 'lucide-react';

// ============================================================================
// TYPES POUR LE BLOC DE PERSONNALISATION PRÉDICTIVE (TEXTE DYNAMIQUE)
// ============================================================================

export interface DynamicParamFallback {
  key: string;       // e.g. 'ville', 'source', 'nom', 'promo'
  fallback: string;  // e.g. 'votre ville', 'nos visiteurs VIP'
}

export interface DynamicHeadingData {
  tagLevel?: 'h1' | 'h2' | 'h3';
  kickerBadgeTemplate?: string;   // e.g. "📍 LIVRAISON DISPONIBLE POUR [ville]"
  headlineTemplate?: string;      // e.g. "Recevez Votre Colis Express à [ville] en Moins de 24h"
  subheadlineTemplate?: string;   // e.g. "Offre exclusive réservée aux utilisateurs venant de [source] avec paiement Wave ou à la livraison."
  fallbacks?: Record<string, string>; // { ville: 'votre région', source: 'nos partenaires' }
  accentColor?: string;
  bgColor?: string;
  alignment?: 'center' | 'left' | 'right';
  showGeoPinBadge?: boolean;
  highlightDynamicWord?: boolean; // Applique un dégradé lumineux sur les mots injectés
  simulationParams?: Record<string, string>; // Permet au marchand de tester dans l'éditeur
}

export interface DynamicHeadingBlockProps {
  block?: { id?: string; data?: DynamicHeadingData };
  data?: DynamicHeadingData;
  isBuilderMode?: boolean;
  className?: string;
}

// ============================================================================
// VALEURS PAR DÉFAUT (NIVEAU ENTERPRISE - CRO & LOCALISATION)
// ============================================================================

export const DEFAULT_DYNAMIC_HEADING_DATA: DynamicHeadingData = {
  tagLevel: 'h1',
  kickerBadgeTemplate: '📍 EXPÉDITION EXPRESS DIRECTE POUR [ville]',
  headlineTemplate: 'La Solution N°1 Plébiscitée à [ville] Pour Multiplier Vos Ventes',
  subheadlineTemplate: 'Profitez de notre offre exclusive dédiée à notre communauté [source] : stock physique disponible, livraison sécurisée et vérification avant paiement.',
  fallbacks: {
    ville: 'votre région',
    source: 'nos membres privilégiés',
    nom: 'cher client',
    pays: 'votre pays'
  },
  accentColor: '#10b981', // Émeraude haute conversion
  bgColor: 'transparent',
  alignment: 'center',
  showGeoPinBadge: true,
  highlightDynamicWord: true,
  simulationParams: {}
};

// ============================================================================
// UTILITAIRE DE PARSING D'URL ET D'INJECTION DE PARAMÈTRES
// ============================================================================

/**
 * Nettoie et formate une valeur de paramètre d'URL (Capitalize, anti-XSS, trim)
 */
function sanitizeAndFormatValue(raw: string): string {
  if (!raw) return '';
  const decoded = decodeURIComponent(raw).trim();
  // Protection anti-injection simple
  const sanitized = decoded.replace(/[<>'"/\\;]/g, '');
  if (!sanitized) return '';
  // Mettre la première lettre en majuscule pour chaque mot (ex: 'ouagadougou' -> 'Ouagadougou', 'abidjan lagunes' -> 'Abidjan Lagunes')
  return sanitized
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
    .join(' ');
}

/**
 * Extrait les paramètres de l'URL du navigateur (window.location.search)
 */
export function getUrlQueryParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((val, key) => {
      const cleanKey = key.toLowerCase().trim();
      result[cleanKey] = sanitizeAndFormatValue(val);
    });
    return result;
  } catch (e) {
    console.warn('[DynamicHeadingBlock] Erreur de lecture des paramètres URL:', e);
    return {};
  }
}

/**
 * Remplace les variables [cle] ou {cle} dans le texte par la valeur d'URL ou le fallback
 */
export function parseDynamicTemplate(
  template: string,
  queryParams: Record<string, string>,
  fallbacks: Record<string, string> = {},
  simulationParams: Record<string, string> = {}
): {
  parsedText: string;
  hasReplaced: boolean;
  replacedKeys: string[];
} {
  if (!template) return { parsedText: '', hasReplaced: false, replacedKeys: [] };

  let hasReplaced = false;
  const replacedKeys: string[] = [];

  // Les paramètres simulés priment si présents, puis les paramètres réels de l'URL
  const effectiveParams: Record<string, string> = {
    ...queryParams,
    ...simulationParams
  };

  // Regex pour matcher [cle] ou {cle} (insensible à la casse)
  const regex = /(\[|\{)([a-zA-Z0-9_\-]+)(\]|\})/g;

  const parsedText = template.replace(regex, (_match, _open, key) => {
    const lowerKey = key.toLowerCase().trim();
    const foundValue = effectiveParams[lowerKey];

    if (foundValue && foundValue.trim().length > 0) {
      hasReplaced = true;
      if (!replacedKeys.includes(lowerKey)) replacedKeys.push(lowerKey);
      return foundValue;
    }

    // Valeur de repli (Fallback) configurée
    const fallbackValue = fallbacks[lowerKey] || fallbacks[key] || `votre région`;
    return fallbackValue;
  });

  return { parsedText, hasReplaced, replacedKeys };
}

// ============================================================================
// COMPOSANT PRINCIPAL : DynamicHeadingBlock
// ============================================================================

export const DynamicHeadingBlock: React.FC<DynamicHeadingBlockProps> = ({
  block,
  data: propsData,
  isBuilderMode = false,
  className = ''
}) => {
  // Fusion des configurations
  const data: DynamicHeadingData = useMemo(() => {
    return {
      ...DEFAULT_DYNAMIC_HEADING_DATA,
      ...(block?.data || {}),
      ...(propsData || {})
    };
  }, [block?.data, propsData]);

  // État des paramètres de l'URL
  const [currentUrlParams, setCurrentUrlParams] = useState<Record<string, string>>({});
  const [activeSimulationParam, setActiveSimulationParam] = useState<string>('');
  const [activeSimulationValue, setActiveSimulationValue] = useState<string>('');

  // Lecture réactive des paramètres de l'URL
  useEffect(() => {
    const updateParams = () => {
      setCurrentUrlParams(getUrlQueryParams());
    };

    updateParams();

    // Écoute des changements d'historique (popstate / navigation client)
    window.addEventListener('popstate', updateParams);
    window.addEventListener('pushstate', updateParams);
    window.addEventListener('replacestate', updateParams);

    return () => {
      window.removeEventListener('popstate', updateParams);
      window.removeEventListener('pushstate', updateParams);
      window.removeEventListener('replacestate', updateParams);
    };
  }, []);

  const accentColor = data.accentColor || '#10b981';
  const tagLevel = data.tagLevel || 'h1';
  const alignment = data.alignment || 'center';
  const fallbacks = data.fallbacks || DEFAULT_DYNAMIC_HEADING_DATA.fallbacks || {};

  // Résolution des 3 niveaux de texte : Kicker, Headline, Subheadline
  const kickerResult = useMemo(() => {
    return parseDynamicTemplate(
      data.kickerBadgeTemplate || '',
      currentUrlParams,
      fallbacks,
      data.simulationParams
    );
  }, [data.kickerBadgeTemplate, currentUrlParams, fallbacks, data.simulationParams]);

  const headlineResult = useMemo(() => {
    return parseDynamicTemplate(
      data.headlineTemplate || '',
      currentUrlParams,
      fallbacks,
      data.simulationParams
    );
  }, [data.headlineTemplate, currentUrlParams, fallbacks, data.simulationParams]);

  const subheadlineResult = useMemo(() => {
    return parseDynamicTemplate(
      data.subheadlineTemplate || '',
      currentUrlParams,
      fallbacks,
      data.simulationParams
    );
  }, [data.subheadlineTemplate, currentUrlParams, fallbacks, data.simulationParams]);

  // Détection de géolocalisation ou personnalisation active
  const isPersonalized = kickerResult.hasReplaced || headlineResult.hasReplaced || subheadlineResult.hasReplaced;
  const activeDetectedCity = currentUrlParams['ville'] || data.simulationParams?.['ville'] || null;

  // Alignement Tailwind
  const alignClass = alignment === 'left' ? 'text-left items-start' : alignment === 'right' ? 'text-right items-end' : 'text-center items-center';

  return (
    <section
      style={{ backgroundColor: data.bgColor || 'transparent' }}
      className={`relative w-full py-6 sm:py-10 px-4 sm:px-8 select-none font-sans text-slate-100 ${className}`}
    >
      {/* Halo discret de focus */}
      <div
        style={{
          background: `radial-gradient(circle at 50% 30%, ${accentColor}18 0%, transparent 65%)`
        }}
        className="absolute inset-0 pointer-events-none"
      />

      <div className={`max-w-4xl mx-auto relative z-10 flex flex-col ${alignClass} space-y-3 sm:space-y-4`}>
        
        {/* ================================================================ */}
        {/* 1. KICKER BADGE DYNAMIQUE (GÉO / SOURCE / PERSONNALISÉ)          */}
        {/* ================================================================ */}
        {kickerResult.parsedText && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              color: accentColor
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-md backdrop-blur-md"
          >
            {activeDetectedCity && data.showGeoPinBadge ? (
              <MapPin className="w-3.5 h-3.5 fill-current animate-bounce text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
            )}
            <span>{kickerResult.parsedText}</span>

            {/* Pastille Live Active si paramètre détecté */}
            {isPersonalized && (
              <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* 2. TITRE PRINCIPAL DYNAMIQUE (H1 / H2 / H3)                      */}
        {/* ================================================================ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={headlineResult.parsedText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="w-full"
          >
            {tagLevel === 'h1' && (
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {headlineResult.parsedText}
              </h1>
            )}
            {tagLevel === 'h2' && (
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                {headlineResult.parsedText}
              </h2>
            )}
            {tagLevel === 'h3' && (
              <h3 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {headlineResult.parsedText}
              </h3>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ================================================================ */}
        {/* 3. SOUS-TITRE DYNAMIQUE                                          */}
        {/* ================================================================ */}
        {subheadlineResult.parsedText && (
          <AnimatePresence mode="wait">
            <motion.p
              key={subheadlineResult.parsedText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-xs sm:text-base text-slate-300 max-w-2xl leading-relaxed"
            >
              {subheadlineResult.parsedText}
            </motion.p>
          </AnimatePresence>
        )}

        {/* ================================================================ */}
        {/* BANDEAU INDICATEUR EN MODE ÉDITEUR (AIDE À LA VALIDATION CRO)     */}
        {/* ================================================================ */}
        {isBuilderMode && (
          <div className="pt-3 w-full max-w-xl">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Moteur de Personnalisation Prédictive Actif</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {isPersonalized ? 'Paramètre URL Détecté' : 'Mode Fallback Actif'}
                </span>
              </div>

              {/* Paramètres actuels détectés */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-slate-400">Variables reconnues :</span>
                {['ville', 'source', 'nom'].map(key => {
                  const val = currentUrlParams[key] || data.simulationParams?.[key];
                  const fallback = fallbacks[key] || 'défaut';
                  return (
                    <span
                      key={key}
                      className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] border ${
                        val
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      [{key}] = {val || `"${fallback}"`}
                    </span>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-500 italic">
                💡 Testez en direct en ajoutant <span className="font-mono text-indigo-300">?ville=Ouagadougou&source=Facebook</span> dans l'URL de votre navigateur.
              </p>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default DynamicHeadingBlock;
