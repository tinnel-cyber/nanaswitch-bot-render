import React from 'react';
import { CustomThemeMood, CustomThemeMoodPreset } from '../../types';
import {
  adaptTextColorsForBg,
  readableTextOn,
  GRADIENT_COMBINATIONS
} from '../../lib/funnelColorLibrary';

export const THEME_MOOD_PRESETS: Record<CustomThemeMoodPreset, CustomThemeMood> = {
  'nanasore-royal': {
    presetId: 'nanasore-royal',
    bgColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#0F172A',
    mutedTextColor: '#475569',
    accentColor: '#2563EB',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'aurora_mesh'
  },
  'pearl-emerald': {
    presetId: 'pearl-emerald',
    bgColor: '#F4FBF9',
    surfaceColor: '#FFFFFF',
    textColor: '#064E3B',
    mutedTextColor: '#047857',
    accentColor: '#0D9488',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'glass_prism'
  },
  'hermes-sand': {
    presetId: 'hermes-sand',
    bgColor: '#FAF6F0',
    surfaceColor: '#FFFDF9',
    textColor: '#292524',
    mutedTextColor: '#78716C',
    accentColor: '#C25E00',
    buttonRadius: 'md',
    fontPairing: 'luxury-serif',
    gradientStyle: 'royal_sunset'
  },
  'cashmere-violet': {
    presetId: 'cashmere-violet',
    bgColor: '#F6F4FA',
    surfaceColor: '#FFFFFF',
    textColor: '#2E1065',
    mutedTextColor: '#6D28D9',
    accentColor: '#7C3AED',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'aurora_mesh'
  },
  'rose-couture': {
    presetId: 'rose-couture',
    bgColor: '#FFF7F9',
    surfaceColor: '#FFFFFF',
    textColor: '#4C0519',
    mutedTextColor: '#9F1239',
    accentColor: '#E11D48',
    buttonRadius: 'full',
    fontPairing: 'luxury-serif',
    gradientStyle: 'royal_sunset'
  },
  'sapphire-ocean': {
    presetId: 'sapphire-ocean',
    bgColor: '#0C192C',
    surfaceColor: '#132540',
    textColor: '#F0F9FF',
    mutedTextColor: '#7DD3FC',
    accentColor: '#0284C7',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'ocean_depth'
  },
  'imperial-plum': {
    presetId: 'imperial-plum',
    bgColor: '#1A102E',
    surfaceColor: '#261842',
    textColor: '#FAF5FF',
    mutedTextColor: '#D8B4FE',
    accentColor: '#9333EA',
    buttonRadius: 'xl',
    fontPairing: 'luxury-serif',
    gradientStyle: 'royal_sunset'
  },
  'emerald-botanic': {
    presetId: 'emerald-botanic',
    bgColor: '#091E1A',
    surfaceColor: '#10312B',
    textColor: '#ECFDF5',
    mutedTextColor: '#6EE7B7',
    accentColor: '#10B981',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'ocean_depth'
  },
  'spotify-obsidian': {
    presetId: 'spotify-obsidian',
    bgColor: '#121824',
    surfaceColor: '#1A2232',
    textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8',
    accentColor: '#10B981',
    buttonRadius: 'full',
    fontPairing: 'modern-sans',
    gradientStyle: 'aurora_mesh'
  },
  'cyber-neon': {
    presetId: 'cyber-neon',
    bgColor: '#0F152A',
    surfaceColor: '#17203D',
    textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8',
    accentColor: '#06B6D4',
    buttonRadius: 'none',
    fontPairing: 'tech-mono',
    gradientStyle: 'aurora_mesh'
  },
  'custom': {
    presetId: 'custom',
    bgColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#0F172A',
    mutedTextColor: '#475569',
    accentColor: '#4F46E5',
    buttonRadius: 'xl',
    fontPairing: 'modern-sans',
    gradientStyle: 'aurora_mesh'
  }
};

export interface MoodStyleConfig {
  name: string;
  badgeLabel: string;
  bg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  sectionBg: string;
  sectionAltBg: string;
  accentButton: string;
  accentBadge: string;
  accentBorder: string;
  accentText: string;
  headerBg: string;
  footerBg: string;
  announcementBg: string;
  announcementText: string;
  isLightBg?: boolean;
  pageGradient?: string;
  moduleGradient?: string;
  textGradient?: string;
  ctaGradient?: string;
}

export const resolveCustomThemeMood = (moodInput?: CustomThemeMood | string): CustomThemeMood => {
  if (moodInput && typeof moodInput === 'object' && moodInput.presetId) {
    const base = THEME_MOOD_PRESETS[moodInput.presetId] || THEME_MOOD_PRESETS['nanasore-royal'];
    const mergedBg = moodInput.bgColor || base.bgColor;
    const mergedAccent = moodInput.accentColor || base.accentColor;
    const adaptive = adaptTextColorsForBg(mergedBg, mergedAccent, mergedAccent);
    return {
      ...base,
      ...moodInput,
      bgColor: mergedBg,
      surfaceColor: moodInput.surfaceColor || adaptive.surface,
      textColor: adaptive.headingText,
      mutedTextColor: adaptive.mutedText,
      accentColor: mergedAccent,
      gradientStyle: moodInput.gradientStyle || base.gradientStyle || 'aurora_mesh'
    };
  }
  if (typeof moodInput === 'string') {
    if (moodInput === 'blue_white') return THEME_MOOD_PRESETS['nanasore-royal'];
    if (moodInput === 'spotify_dark') return THEME_MOOD_PRESETS['spotify-obsidian'];
    if (moodInput === 'sand_nature') return THEME_MOOD_PRESETS['hermes-sand'];
    if (moodInput === 'luxury_gold') return THEME_MOOD_PRESETS['emerald-botanic'];
    if (moodInput in THEME_MOOD_PRESETS) return THEME_MOOD_PRESETS[moodInput as CustomThemeMoodPreset];
  }
  return THEME_MOOD_PRESETS['nanasore-royal'];
};

export const getMoodCssVariables = (mood: CustomThemeMood): React.CSSProperties => {
  const radiusMap: Record<string, string> = {
    'none': '0px',
    'md': '8px',
    'xl': '16px',
    'full': '9999px'
  };

  const adaptive = adaptTextColorsForBg(mood.bgColor, mood.accentColor, mood.accentColor);
  const gradCombo =
    GRADIENT_COMBINATIONS.find((g) => g.id === mood.gradientStyle) || GRADIENT_COMBINATIONS[0];

  return {
    '--theme-bg': mood.bgColor,
    '--theme-surface': adaptive.surface,
    '--theme-surface-alt': adaptive.surfaceAlt,
    '--theme-text': adaptive.headingText,
    '--theme-body-text': adaptive.bodyText,
    '--theme-muted': adaptive.mutedText,
    '--theme-accent': mood.accentColor,
    '--theme-accent-readable': adaptive.primaryReadable,
    '--theme-on-accent': readableTextOn(mood.accentColor),
    '--theme-border': adaptive.border,
    '--theme-page-gradient': gradCombo.buildPageGradient(mood.bgColor, mood.accentColor, mood.accentColor),
    '--theme-module-gradient': gradCombo.buildModuleGradient(mood.bgColor, mood.accentColor, mood.accentColor),
    '--theme-text-gradient': gradCombo.buildTextGradient(mood.accentColor, mood.accentColor, adaptive.isLightBg),
    '--theme-cta-gradient': gradCombo.buildCtaGradient(mood.accentColor, mood.accentColor),
    '--theme-radius': radiusMap[mood.buttonRadius] || '16px'
  } as React.CSSProperties;
};

export const getButtonRadiusClass = (radius?: string): string => {
  switch (radius) {
    case 'full':
    case 'rounded-full':
      return 'rounded-full';
    case 'none':
    case 'rounded-none':
      return 'rounded-none';
    case 'md':
      return 'rounded-lg';
    case 'xl':
    case 'rounded-xl':
    default:
      return 'rounded-2xl';
  }
};

export const getMoodStyle = (moodInput?: CustomThemeMood | string): MoodStyleConfig => {
  const resolved = resolveCustomThemeMood(moodInput);
  const preset = resolved.presetId;
  const adaptive = adaptTextColorsForBg(resolved.bgColor, resolved.accentColor, resolved.accentColor);
  const gradCombo =
    GRADIENT_COMBINATIONS.find((g) => g.id === resolved.gradientStyle) || GRADIENT_COMBINATIONS[0];
  const baseGradTokens = {
    isLightBg: adaptive.isLightBg,
    pageGradient: gradCombo.buildPageGradient(resolved.bgColor, resolved.accentColor, resolved.accentColor),
    moduleGradient: gradCombo.buildModuleGradient(resolved.bgColor, resolved.accentColor, resolved.accentColor),
    textGradient: gradCombo.buildTextGradient(resolved.accentColor, resolved.accentColor, adaptive.isLightBg),
    ctaGradient: gradCombo.buildCtaGradient(resolved.accentColor, resolved.accentColor)
  };

  if (preset === 'pearl-emerald') {
    return {
      ...baseGradTokens,
      name: 'Albâtre & Émeraude',
      badgeLabel: 'CLAIR • MINIMALISTE',
      bg: 'bg-[#F4FBF9]',
      textPrimary: 'text-[#064E3B]',
      textSecondary: 'text-[#065F46]',
      textMuted: 'text-[#047857]',
      cardBg: 'bg-white border border-teal-200/80 hover:border-teal-500/50 shadow-sm hover:shadow-md',
      sectionBg: 'bg-[#F4FBF9]',
      sectionAltBg: 'bg-[#E6F7F2] border-y border-teal-200/60',
      accentButton: 'bg-[#0D9488] hover:bg-[#0F766E] text-white font-black shadow-md shadow-teal-600/20 active:scale-95',
      accentBadge: 'bg-teal-100/80 text-teal-900 border border-teal-300',
      accentBorder: 'border-teal-600',
      accentText: 'text-teal-700',
      headerBg: 'bg-[#F4FBF9]/95 backdrop-blur-md border-b border-teal-200/70 text-[#064E3B]',
      footerBg: 'bg-[#064E3B] text-teal-50 border-t border-teal-800',
      announcementBg: 'bg-[#0D9488] text-white',
      announcementText: 'text-white'
    };
  }

  if (preset === 'cashmere-violet') {
    return {
      ...baseGradTokens,
      name: 'Cachemire & Lavande',
      badgeLabel: 'CRÉATIF • MODERNE',
      bg: 'bg-[#F6F4FA]',
      textPrimary: 'text-[#2E1065]',
      textSecondary: 'text-[#4C1D95]',
      textMuted: 'text-[#6D28D9]',
      cardBg: 'bg-white border border-violet-200/80 hover:border-violet-500/50 shadow-sm hover:shadow-md',
      sectionBg: 'bg-[#F6F4FA]',
      sectionAltBg: 'bg-[#EDE9FE] border-y border-violet-200/60',
      accentButton: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black shadow-md shadow-violet-600/20 active:scale-95',
      accentBadge: 'bg-violet-100 text-violet-900 border border-violet-300',
      accentBorder: 'border-violet-600',
      accentText: 'text-violet-700',
      headerBg: 'bg-[#F6F4FA]/95 backdrop-blur-md border-b border-violet-200/70 text-[#2E1065]',
      footerBg: 'bg-[#2E1065] text-violet-50 border-t border-violet-800',
      announcementBg: 'bg-[#7C3AED] text-white',
      announcementText: 'text-white'
    };
  }

  if (preset === 'rose-couture') {
    return {
      ...baseGradTokens,
      name: 'Rose Poudré & Rubis',
      badgeLabel: 'BEAUTÉ • COUTURE',
      bg: 'bg-[#FFF7F9]',
      textPrimary: 'text-[#4C0519]',
      textSecondary: 'text-[#881337]',
      textMuted: 'text-[#9F1239]',
      cardBg: 'bg-white border border-rose-200/80 hover:border-rose-500/50 shadow-sm hover:shadow-md',
      sectionBg: 'bg-[#FFF7F9]',
      sectionAltBg: 'bg-[#FFE4E6]/60 border-y border-rose-200/60',
      accentButton: 'bg-[#E11D48] hover:bg-[#BE123C] text-white font-black shadow-md shadow-rose-600/20 active:scale-95',
      accentBadge: 'bg-rose-100 text-rose-900 border border-rose-300',
      accentBorder: 'border-rose-600',
      accentText: 'text-rose-700',
      headerBg: 'bg-[#FFF7F9]/95 backdrop-blur-md border-b border-rose-200/70 text-[#4C0519]',
      footerBg: 'bg-[#4C0519] text-rose-50 border-t border-rose-900',
      announcementBg: 'bg-[#E11D48] text-white',
      announcementText: 'text-white'
    };
  }

  if (preset === 'sapphire-ocean') {
    return {
      ...baseGradTokens,
      name: 'Saphir Océan & Azur',
      badgeLabel: 'PROFOND • SANS NOIR',
      bg: 'bg-[#0C192C]',
      textPrimary: 'text-[#F0F9FF]',
      textSecondary: 'text-sky-200/80',
      textMuted: 'text-sky-300/60',
      cardBg: 'bg-[#132540] border border-sky-500/25 hover:border-sky-400/50 shadow-xl hover:bg-[#193052]',
      sectionBg: 'bg-[#0C192C]',
      sectionAltBg: 'bg-[#132540] border-y border-sky-500/15',
      accentButton: 'bg-[#0284C7] hover:bg-[#0369A1] text-white font-black shadow-lg shadow-sky-500/25 active:scale-95',
      accentBadge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
      accentBorder: 'border-sky-400',
      accentText: 'text-sky-300',
      headerBg: 'bg-[#0C192C]/95 backdrop-blur-md border-b border-sky-500/20 text-sky-50',
      footerBg: 'bg-[#08111E] text-sky-200/80 border-t border-sky-500/20',
      announcementBg: 'bg-sky-500 text-slate-950 font-black',
      announcementText: 'text-slate-950 font-black'
    };
  }

  if (preset === 'imperial-plum') {
    return {
      ...baseGradTokens,
      name: 'Pourpre Impérial & Ambre',
      badgeLabel: 'VIP • PRESTIGE',
      bg: 'bg-[#1A102E]',
      textPrimary: 'text-[#FAF5FF]',
      textSecondary: 'text-purple-200/80',
      textMuted: 'text-purple-300/60',
      cardBg: 'bg-[#261842] border border-purple-500/25 hover:border-purple-400/50 shadow-xl hover:bg-[#2E1D50]',
      sectionBg: 'bg-[#1A102E]',
      sectionAltBg: 'bg-[#261842] border-y border-purple-500/15',
      accentButton: 'bg-[#9333EA] hover:bg-[#7E22CE] text-white font-black shadow-lg shadow-purple-500/25 active:scale-95',
      accentBadge: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
      accentBorder: 'border-purple-400',
      accentText: 'text-purple-300',
      headerBg: 'bg-[#1A102E]/95 backdrop-blur-md border-b border-purple-500/20 text-purple-50',
      footerBg: 'bg-[#120A21] text-purple-200/80 border-t border-purple-500/20',
      announcementBg: 'bg-amber-500 text-slate-950 font-black',
      announcementText: 'text-slate-950 font-black'
    };
  }

  if (preset === 'spotify-obsidian') {
    return {
      ...baseGradTokens,
      name: 'Ardoise & Émeraude',
      badgeLabel: 'ARDOISE • ÉMERAUDE',
      bg: 'bg-[#121824]',
      textPrimary: 'text-slate-50',
      textSecondary: 'text-slate-300',
      textMuted: 'text-slate-400',
      cardBg: 'bg-[#1A2232] border border-slate-700/60 hover:border-emerald-500/40 hover:bg-[#202A3D] shadow-xl',
      sectionBg: 'bg-[#121824]',
      sectionAltBg: 'bg-[#1A2232] border-y border-slate-800',
      accentButton: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 active:scale-95',
      accentBadge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      accentBorder: 'border-emerald-500',
      accentText: 'text-emerald-400',
      headerBg: 'bg-[#121824]/95 backdrop-blur-md border-b border-slate-800 text-slate-50',
      footerBg: 'bg-[#0D121C] text-slate-200 border-t border-slate-800',
      announcementBg: 'bg-emerald-950 text-emerald-300 border-b border-emerald-800/40',
      announcementText: 'text-emerald-300'
    };
  }

  if (preset === 'hermes-sand') {
    return {
      ...baseGradTokens,
      name: 'Sable Champagne & Terracotta',
      badgeLabel: 'NATUREL • BOTANIQUE',
      bg: 'bg-[#FAF6F0]',
      textPrimary: 'text-[#292524]',
      textSecondary: 'text-[#57534E]',
      textMuted: 'text-[#78716C]',
      cardBg: 'bg-[#FFFDF9] border border-[#E7E1D8] hover:border-amber-700/40 shadow-sm hover:shadow-md',
      sectionBg: 'bg-[#FAF6F0]',
      sectionAltBg: 'bg-[#F3EFEA] border-y border-[#E7E1D8]',
      accentButton: 'bg-[#C25E00] hover:bg-[#A85100] text-white shadow-md shadow-amber-950/20 active:scale-95',
      accentBadge: 'bg-amber-100/80 text-amber-900 border border-amber-200',
      accentBorder: 'border-[#C25E00]',
      accentText: 'text-[#C25E00]',
      headerBg: 'bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E7E1D8] text-[#292524]',
      footerBg: 'bg-[#292524] text-amber-50 border-t border-amber-900/20',
      announcementBg: 'bg-[#C25E00] text-amber-100',
      announcementText: 'text-amber-100'
    };
  }

  if (preset === 'emerald-botanic') {
    return {
      ...baseGradTokens,
      name: 'Forêt Boréale & Menthe',
      badgeLabel: 'PRESTIGE • BIO',
      bg: 'bg-[#091E1A]',
      textPrimary: 'text-[#ECFDF5]',
      textSecondary: 'text-emerald-200/80',
      textMuted: 'text-emerald-300/60',
      cardBg: 'bg-[#10312B] border border-emerald-500/25 hover:border-emerald-400/50 shadow-2xl hover:bg-[#143B30]',
      sectionBg: 'bg-[#091E1A]',
      sectionAltBg: 'bg-[#10312B] border-y border-emerald-500/15',
      accentButton: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25 active:scale-95',
      accentBadge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      accentBorder: 'border-emerald-400',
      accentText: 'text-emerald-300',
      headerBg: 'bg-[#091E1A]/95 backdrop-blur-md border-b border-emerald-500/20 text-emerald-50',
      footerBg: 'bg-[#061512] text-emerald-200/80 border-t border-emerald-500/20',
      announcementBg: 'bg-emerald-500 text-slate-950 font-black',
      announcementText: 'text-slate-950 font-black'
    };
  }

  if (preset === 'cyber-neon') {
    return {
      ...baseGradTokens,
      name: 'Indigo Céleste & Cyan',
      badgeLabel: 'TECH • FUTURISTE',
      bg: 'bg-[#0F152A]',
      textPrimary: 'text-[#F8FAFC]',
      textSecondary: 'text-slate-300',
      textMuted: 'text-slate-400',
      cardBg: 'bg-[#17203D] border border-cyan-500/25 hover:border-cyan-400/50 shadow-2xl hover:bg-[#1D284D]',
      sectionBg: 'bg-[#0F152A]',
      sectionAltBg: 'bg-[#17203D] border-y border-cyan-500/15',
      accentButton: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25 active:scale-95',
      accentBadge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
      accentBorder: 'border-cyan-400',
      accentText: 'text-cyan-300',
      headerBg: 'bg-[#0F152A]/95 backdrop-blur-md border-b border-cyan-500/20 text-slate-100',
      footerBg: 'bg-[#0A0E1C] text-slate-300 border-t border-cyan-500/20',
      announcementBg: 'bg-cyan-500 text-slate-950 font-black',
      announcementText: 'text-slate-950 font-black'
    };
  }

  if (preset === 'custom') {
    if (!adaptive.isLightBg) {
      return {
        ...baseGradTokens,
        name: 'Palette Sur-Mesure (Profonde)',
        badgeLabel: 'SUR-MESURE • ADAPTATIF',
        bg: 'bg-[var(--theme-bg)]',
        textPrimary: 'text-[var(--theme-text)]',
        textSecondary: 'text-[var(--theme-body-text)]',
        textMuted: 'text-[var(--theme-muted)]',
        cardBg: 'bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl',
        sectionBg: 'bg-[var(--theme-bg)]',
        sectionAltBg: 'bg-[var(--theme-surface)] border-y border-[var(--theme-border)]',
        accentButton: 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] font-black shadow-lg active:scale-95',
        accentBadge: 'bg-[var(--theme-surface)] text-[var(--theme-accent-readable)] border border-[var(--theme-border)]',
        accentBorder: 'border-[var(--theme-accent-readable)]',
        accentText: 'text-[var(--theme-accent-readable)]',
        headerBg: 'bg-[var(--theme-bg)]/95 backdrop-blur-md border-b border-[var(--theme-border)] text-[var(--theme-text)]',
        footerBg: 'bg-[var(--theme-surface)] text-[var(--theme-text)] border-t border-[var(--theme-border)]',
        announcementBg: 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] font-black',
        announcementText: 'text-[var(--theme-on-accent)] font-black'
      };
    }
    return {
      ...baseGradTokens,
      name: 'Palette Sur-Mesure (Claire)',
      badgeLabel: 'SUR-MESURE • ADAPTATIF',
      bg: 'bg-[var(--theme-bg)]',
      textPrimary: 'text-[var(--theme-text)]',
      textSecondary: 'text-[var(--theme-body-text)]',
      textMuted: 'text-[var(--theme-muted)]',
      cardBg: 'bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm hover:shadow-md',
      sectionBg: 'bg-[var(--theme-bg)]',
      sectionAltBg: 'bg-[var(--theme-surface-alt)] border-y border-[var(--theme-border)]',
      accentButton: 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] font-black shadow-md active:scale-95',
      accentBadge: 'bg-[var(--theme-surface-alt)] text-[var(--theme-accent-readable)] border border-[var(--theme-border)]',
      accentBorder: 'border-[var(--theme-accent-readable)]',
      accentText: 'text-[var(--theme-accent-readable)]',
      headerBg: 'bg-[var(--theme-bg)]/95 backdrop-blur-md border-b border-[var(--theme-border)] text-[var(--theme-text)]',
      footerBg: 'bg-slate-900 text-slate-50 border-t border-slate-800',
      announcementBg: 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] font-black',
      announcementText: 'text-[var(--theme-on-accent)] font-black'
    };
  }

  // Défaut : Ivoire Royal & Cobalt (Bleu Nanasore Original)
  return {
    ...baseGradTokens,
    name: 'Ivoire Royal & Cobalt',
    badgeLabel: 'OFFICIEL • ADN NSOURÉ',
    bg: 'bg-[#F8FAFC]',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    cardBg: 'bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300',
    sectionBg: 'bg-[#F8FAFC]',
    sectionAltBg: 'bg-white border-y border-slate-100',
    accentButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95',
    accentBadge: 'bg-blue-50 text-blue-700 border border-blue-200',
    accentBorder: 'border-blue-600',
    accentText: 'text-blue-600',
    headerBg: 'bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900',
    footerBg: 'bg-[#0F172A] text-white border-t border-slate-800',
    announcementBg: 'bg-blue-600 text-white',
    announcementText: 'text-white'
  };
};
