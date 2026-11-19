/**
 * ============================================================================
 * BIBLIOTHÈQUE DE COULEURS & MOTEUR D'ADAPTATION WCAG — FUNNELS & THÈMES
 * ============================================================================
 * Source unique de vérité (100% autonome, zéro dépendance externe) pour les
 * couleurs des éditeurs (Ultimate Funnel, Funnel Modulaire, Theme Builder)
 * ET des vues publiques en ligne.
 * - Palettes modernes autonomes (sans dépendance au noir pur #000000).
 * - Combinaisons de dégradés pour les modules, cartes, boutons et textes.
 * - Adaptation automatique des couleurs de texte (titres, sous-titres, prix,
 *   badges, boutons) selon les couleurs principales et de fond choisies pour
 *   qu'aucune couleur n'efface jamais les textes (WCAG AA/AAA).
 */

// ============================================================================
// MINI-MOTEUR COLORIMÉTRIQUE NATIF (HSL / RGB / LUMINANCE / CONTRASTE WCAG 2.1)
// ============================================================================
interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
  a: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function parseColorToRgb(input: string): RGB | null {
  if (typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // Hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
  const hexMatch = str.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  // rgb() / rgba()
  const rgbMatch = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    return {
      r: clamp(parseInt(rgbMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbMatch[3], 10), 0, 255),
      a: rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1
    };
  }

  return null;
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b, a }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l, a };
}

function hslToRgb({ h, s, l, a }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 1);
  const ln = clamp(l, 0, 1);

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v, a };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
    a
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const transform = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

class NativeColor {
  private rgb: RGB;
  private valid: boolean;

  constructor(input: string | RGB) {
    if (typeof input === 'string') {
      const parsed = parseColorToRgb(input);
      this.valid = parsed !== null;
      this.rgb = parsed || { r: 37, g: 99, b: 235, a: 1 };
    } else {
      this.valid = true;
      this.rgb = input;
    }
  }

  isValid(): boolean {
    return this.valid;
  }

  toHex(): string {
    return rgbToHex(this.rgb);
  }

  toRgbString(): string {
    const { r, g, b, a } = this.rgb;
    const roundedA = Math.round(a * 100) / 100;
    return roundedA >= 1 ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${roundedA})`;
  }

  luminance(): number {
    return relativeLuminance(this.rgb);
  }

  isLight(): boolean {
    return this.luminance() > 0.42;
  }

  contrast(other: NativeColor | string): number {
    const o = other instanceof NativeColor ? other : new NativeColor(other);
    const l1 = this.luminance();
    const l2 = o.luminance();
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  lighten(amount: number): NativeColor {
    const hsl = rgbToHsl(this.rgb);
    hsl.l = clamp(hsl.l + amount, 0, 1);
    return new NativeColor(hslToRgb(hsl));
  }

  darken(amount: number): NativeColor {
    const hsl = rgbToHsl(this.rgb);
    hsl.l = clamp(hsl.l - amount, 0, 1);
    return new NativeColor(hslToRgb(hsl));
  }

  saturate(amount: number): NativeColor {
    const hsl = rgbToHsl(this.rgb);
    hsl.s = clamp(hsl.s + amount, 0, 1);
    return new NativeColor(hslToRgb(hsl));
  }

  rotate(deg: number): NativeColor {
    const hsl = rgbToHsl(this.rgb);
    hsl.h = (hsl.h + deg + 360) % 360;
    return new NativeColor(hslToRgb(hsl));
  }

  alpha(a: number): NativeColor {
    return new NativeColor({ ...this.rgb, a: clamp(a, 0, 1) });
  }

  mix(target: NativeColor | string, ratio: number = 0.5): NativeColor {
    const t = target instanceof NativeColor ? target : new NativeColor(target);
    const w = clamp(ratio, 0, 1);
    return new NativeColor({
      r: Math.round(this.rgb.r * (1 - w) + t.rgb.r * w),
      g: Math.round(this.rgb.g * (1 - w) + t.rgb.g * w),
      b: Math.round(this.rgb.b * (1 - w) + t.rgb.b * w),
      a: this.rgb.a * (1 - w) + t.rgb.a * w
    });
  }
}

const colord = (input: string | RGB) => new NativeColor(input);

export interface FunnelPalette {
  id: string;
  name: string;
  desc: string;
  category: 'light_modern' | 'deep_vibrant' | 'gradient_prestige';
  primary: string;
  accent: string;
  bg: string;
  surface?: string;
  gradientId?: string;
  border: string;
  badge: string;
}

export interface GradientCombination {
  id: string;
  name: string;
  desc: string;
  description: string;
  moduleGradient: (primary: string, accent: string, bg: string, isLight: boolean) => string;
  textGradient: (primary: string, accent: string, bg: string, isLight: boolean) => string;
  ctaGradient: (primary: string, accent: string) => string;
  pageGradient: (primary: string, accent: string, bg: string, isLight: boolean) => string;
  buildModuleGradient: (bg: string, primary: string, accent: string) => string;
  buildTextGradient: (primary: string, accent: string, isLight: boolean) => string;
  buildCtaGradient: (primary: string, accent: string) => string;
  buildPageGradient: (bg: string, primary: string, accent: string) => string;
}

/**
 * Palettes modernes autonomes :
 * - Palettes Claires & Éditoriales (sans noir)
 * - Palettes Profondes & Vibrantes (bleu saphir, émeraude boréal, prune impérial — zéro noir pur)
 */
export const FUNNEL_PALETTES: FunnelPalette[] = [
  // --- PALETTES AUTONOMES CLAIRES & MODERNES (SANS NOIR) ---
  {
    id: 'ivory_cobalt',
    name: 'Ivoire Royal & Cobalt',
    desc: 'Clair, moderne, haute confiance & SaaS',
    category: 'light_modern',
    primary: '#2563EB',
    accent: '#0EA5E9',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    gradientId: 'aurora_mesh',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-700'
  },
  {
    id: 'pearl_emerald',
    name: 'Albâtre & Émeraude Prestige',
    desc: 'Frais, lumineux, bien-être & croissance',
    category: 'light_modern',
    primary: '#059669',
    accent: '#10B981',
    bg: '#F2FBF7',
    surface: '#FFFFFF',
    gradientId: 'glass_prism',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-800'
  },
  {
    id: 'sand_terracotta',
    name: 'Sable Champagne & Terracotta',
    desc: 'Chaleureux, éditorial, artisanal & luxe naturel',
    category: 'light_modern',
    primary: '#C2410C',
    accent: '#EA580C',
    bg: '#FAF6F0',
    surface: '#FFFDF9',
    gradientId: 'royal_sunset',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/15 text-orange-800'
  },
  {
    id: 'cashmere_violet',
    name: 'Cachemire & Lavande Moderne',
    desc: 'Créatif, coaching premium & digital',
    category: 'light_modern',
    primary: '#6D28D9',
    accent: '#8B5CF6',
    bg: '#F6F5FF',
    surface: '#FFFFFF',
    gradientId: 'aurora_mesh',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500/15 text-violet-800'
  },
  {
    id: 'blush_ruby',
    name: 'Rose Poudré & Rubis Velours',
    desc: 'Beauté, cosmétique, mode & lifestyle clair',
    category: 'light_modern',
    primary: '#E11D48',
    accent: '#F43F5E',
    bg: '#FFF5F7',
    surface: '#FFFFFF',
    gradientId: 'royal_sunset',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/15 text-rose-800'
  },
  // --- PALETTES PROFONDES & DÉGRADÉS PRESTIGE (SANS NOIR PUR) ---
  {
    id: 'sapphire_ocean',
    name: 'Saphir Océan & Cyan Lumineux',
    desc: 'Bleu océan profond, tech & masterclass',
    category: 'deep_vibrant',
    primary: '#0EA5E9',
    accent: '#38BDF8',
    bg: '#0F2342',
    surface: '#163058',
    gradientId: 'ocean_depth',
    border: 'border-sky-400/40',
    badge: 'bg-sky-500/20 text-sky-200'
  },
  {
    id: 'imperial_plum',
    name: 'Pourpre Impérial & Ambre Solaire',
    desc: 'Prune royal, prestige & haute conversion',
    category: 'gradient_prestige',
    primary: '#F59E0B',
    accent: '#A855F7',
    bg: '#1E1438',
    surface: '#291C4B',
    gradientId: 'royal_sunset',
    border: 'border-amber-400/40',
    badge: 'bg-amber-500/20 text-amber-200'
  },
  {
    id: 'boreal_forest',
    name: 'Forêt Boréale & Or Blanc',
    desc: 'Vert sapin profond, finance & investissement',
    category: 'deep_vibrant',
    primary: '#10C88A',
    accent: '#FBBF24',
    bg: '#0D261F',
    surface: '#14382E',
    gradientId: 'ocean_depth',
    border: 'border-emerald-400/40',
    badge: 'bg-emerald-500/20 text-emerald-200'
  },
  {
    id: 'indigo_cyber',
    name: 'Indigo Nuit & Nébuleuse IA',
    desc: 'Indigo cosmique, SaaS & automatisation',
    category: 'gradient_prestige',
    primary: '#6366F1',
    accent: '#22D3EE',
    bg: '#131633',
    surface: '#1B2048',
    gradientId: 'aurora_mesh',
    border: 'border-indigo-400/40',
    badge: 'bg-indigo-500/20 text-indigo-200'
  },
  {
    id: 'sunset_coral',
    name: 'Corail Crépuscule & Terracotta',
    desc: 'Énergie solaire, événementiel & vente flash',
    category: 'gradient_prestige',
    primary: '#F97316',
    accent: '#FB7185',
    bg: '#2A1215',
    surface: '#3B1A1E',
    gradientId: 'royal_sunset',
    border: 'border-orange-400/40',
    badge: 'bg-orange-500/20 text-orange-200'
  },
  {
    id: 'gold_luxury',
    name: 'Or Impérial & Bleu Minuit',
    desc: "Prestige, luxe & formation d'élite",
    category: 'deep_vibrant',
    primary: '#F5B300',
    accent: '#FFD666',
    bg: '#10172A',
    surface: '#18223C',
    gradientId: 'royal_sunset',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  {
    id: 'rose_beauty',
    name: 'Velours Framboise & Rose',
    desc: 'Cosmétique, glamour & masterclass beauté',
    category: 'deep_vibrant',
    primary: '#FF4F8B',
    accent: '#FFA3C4',
    bg: '#26101D',
    surface: '#361729',
    gradientId: 'aurora_mesh',
    border: 'border-pink-500/40',
    badge: 'bg-pink-500/20 text-pink-300'
  }
];

export const DEFAULT_PALETTE = FUNNEL_PALETTES[0];

/**
 * Combinaisons de dégradés pour les modules, cartes, boutons et textes.
 * Chaque combinaison adapte ses teintes selon que le fond est clair ou profond.
 */
export const GRADIENT_COMBINATIONS: GradientCombination[] = [
  {
    id: 'aurora_mesh',
    name: 'Aurore Cristalline',
    desc: 'Dégradé diagonal aérien entre la couleur principale et l’accent',
    description: 'Dégradé diagonal aérien entre la couleur principale et l’accent',
    moduleGradient: (primary, accent, bg, isLight) =>
      isLight
        ? `linear-gradient(135deg, ${colord(bg).lighten(0.03).toHex()} 0%, ${colord(primary).mix('#FFFFFF', 0.91).toHex()} 55%, ${colord(accent).mix('#FFFFFF', 0.88).toHex()} 100%)`
        : `linear-gradient(135deg, ${colord(bg).lighten(0.05).toHex()} 0%, ${colord(primary).mix(bg, 0.82).toHex()} 55%, ${colord(accent).mix(bg, 0.85).toHex()} 100%)`,
    textGradient: (primary, accent, bg, isLight) => {
      const pSafe = ensureContrastColor(primary, bg, isLight ? 4.2 : 4.5);
      const aSafe = ensureContrastColor(accent, bg, isLight ? 4.2 : 4.5);
      return `linear-gradient(90deg, ${pSafe} 0%, ${aSafe} 100%)`;
    },
    ctaGradient: (primary, accent) =>
      `linear-gradient(135deg, ${primary} 0%, ${colord(primary).mix(accent, 0.45).toHex()} 100%)`,
    pageGradient: (primary, accent, bg, isLight) =>
      isLight
        ? `radial-gradient(circle at 12% 15%, ${alpha(primary, 0.10)} 0%, transparent 45%), radial-gradient(circle at 88% 80%, ${alpha(accent, 0.10)} 0%, transparent 45%), linear-gradient(180deg, ${bg} 0%, ${colord(bg).mix(primary, 0.04).toHex()} 100%)`
        : `radial-gradient(circle at 12% 15%, ${alpha(primary, 0.18)} 0%, transparent 45%), radial-gradient(circle at 88% 80%, ${alpha(accent, 0.15)} 0%, transparent 45%), linear-gradient(180deg, ${bg} 0%, ${colord(bg).mix(primary, 0.08).toHex()} 100%)`,
    buildModuleGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[0].moduleGradient(primary, accent, bg, colord(bg).isLight()),
    buildTextGradient: (primary, accent, isLight) =>
      GRADIENT_COMBINATIONS[0].textGradient(primary, accent, isLight ? '#FFFFFF' : '#0F172A', isLight),
    buildCtaGradient: (primary, accent) => GRADIENT_COMBINATIONS[0].ctaGradient(primary, accent),
    buildPageGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[0].pageGradient(primary, accent, bg, colord(bg).isLight())
  },
  {
    id: 'royal_sunset',
    name: 'Éclat Impérial',
    desc: 'Fusion riche à 3 degrés pour des modules à fort impact visuel',
    description: 'Fusion riche à 3 degrés pour des modules à fort impact visuel',
    moduleGradient: (primary, accent, bg, isLight) =>
      isLight
        ? `linear-gradient(145deg, #FFFFFF 0%, ${colord(primary).mix('#FFFFFF', 0.86).toHex()} 50%, ${colord(accent).mix('#FFFFFF', 0.84).toHex()} 100%)`
        : `linear-gradient(145deg, ${colord(bg).lighten(0.06).toHex()} 0%, ${colord(primary).mix(bg, 0.76).toHex()} 52%, ${colord(accent).mix(bg, 0.78).toHex()} 100%)`,
    textGradient: (primary, accent, bg) => {
      const pSafe = ensureContrastColor(primary, bg, 4.5);
      const aSafe = ensureContrastColor(accent, bg, 4.5);
      const mid = ensureContrastColor(colord(primary).mix(accent, 0.5).toHex(), bg, 4.5);
      return `linear-gradient(90deg, ${pSafe} 0%, ${mid} 50%, ${aSafe} 100%)`;
    },
    ctaGradient: (primary, accent) =>
      `linear-gradient(95deg, ${primary} 0%, ${colord(primary).mix(accent, 0.6).toHex()} 100%)`,
    pageGradient: (primary, accent, bg, isLight) =>
      isLight
        ? `linear-gradient(160deg, ${bg} 0%, ${colord(primary).mix('#FFFFFF', 0.92).toHex()} 50%, ${colord(accent).mix('#FFFFFF', 0.92).toHex()} 100%)`
        : `linear-gradient(160deg, ${bg} 0%, ${colord(bg).mix(primary, 0.14).toHex()} 50%, ${colord(bg).mix(accent, 0.14).toHex()} 100%)`,
    buildModuleGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[1].moduleGradient(primary, accent, bg, colord(bg).isLight()),
    buildTextGradient: (primary, accent, isLight) =>
      GRADIENT_COMBINATIONS[1].textGradient(primary, accent, isLight ? '#FFFFFF' : '#0F172A', isLight),
    buildCtaGradient: (primary, accent) => GRADIENT_COMBINATIONS[1].ctaGradient(primary, accent),
    buildPageGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[1].pageGradient(primary, accent, bg, colord(bg).isLight())
  },
  {
    id: 'glass_prism',
    name: 'Prisme Satiné',
    desc: 'Surface satinée lumineuse avec reflet subtil et texte ultra-net',
    description: 'Surface satinée lumineuse avec reflet subtil et texte ultra-net',
    moduleGradient: (primary, _accent, bg, isLight) =>
      isLight
        ? `linear-gradient(180deg, #FFFFFF 0%, ${colord(bg).mix(primary, 0.06).toHex()} 100%)`
        : `linear-gradient(180deg, ${colord(bg).lighten(0.08).toHex()} 0%, ${colord(bg).lighten(0.03).mix(primary, 0.1).toHex()} 100%)`,
    textGradient: (primary, accent, bg) => {
      const pSafe = ensureContrastColor(primary, bg, 4.8);
      const aSafe = ensureContrastColor(colord(primary).mix(accent, 0.4).toHex(), bg, 4.8);
      return `linear-gradient(90deg, ${pSafe} 0%, ${aSafe} 100%)`;
    },
    ctaGradient: (primary) =>
      `linear-gradient(180deg, ${colord(primary).lighten(0.05).toHex()} 0%, ${colord(primary).darken(0.05).toHex()} 100%)`,
    pageGradient: (primary, _accent, bg) =>
      `linear-gradient(180deg, ${bg} 0%, ${colord(bg).mix(primary, 0.05).toHex()} 100%)`,
    buildModuleGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[2].moduleGradient(primary, accent, bg, colord(bg).isLight()),
    buildTextGradient: (primary, accent, isLight) =>
      GRADIENT_COMBINATIONS[2].textGradient(primary, accent, isLight ? '#FFFFFF' : '#0F172A', isLight),
    buildCtaGradient: (primary, accent) => GRADIENT_COMBINATIONS[2].ctaGradient(primary, accent),
    buildPageGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[2].pageGradient(primary, accent, bg, colord(bg).isLight())
  },
  {
    id: 'ocean_depth',
    name: 'Vague Profonde',
    desc: 'Dégradé directionnel profond donnant du relief aux cartes et sections',
    description: 'Dégradé directionnel profond donnant du relief aux cartes et sections',
    moduleGradient: (primary, accent, bg, isLight) =>
      isLight
        ? `linear-gradient(120deg, #FFFFFF 0%, ${colord(primary).mix('#FFFFFF', 0.89).toHex()} 70%, ${colord(accent).mix('#FFFFFF', 0.85).toHex()} 100%)`
        : `linear-gradient(120deg, ${colord(bg).lighten(0.05).toHex()} 0%, ${colord(bg).mix(primary, 0.22).toHex()} 70%, ${colord(bg).mix(accent, 0.25).toHex()} 100%)`,
    textGradient: (primary, accent, bg) => {
      const pSafe = ensureContrastColor(primary, bg, 4.5);
      const aSafe = ensureContrastColor(accent, bg, 4.5);
      return `linear-gradient(90deg, ${pSafe} 0%, ${aSafe} 100%)`;
    },
    ctaGradient: (primary, accent) =>
      `linear-gradient(120deg, ${primary} 0%, ${colord(primary).mix(accent, 0.5).toHex()} 100%)`,
    pageGradient: (primary, _accent, bg, isLight) =>
      isLight
        ? `radial-gradient(ellipse at top, ${colord(primary).mix('#FFFFFF', 0.88).toHex()} 0%, ${bg} 70%)`
        : `radial-gradient(ellipse at top, ${colord(bg).mix(primary, 0.2).toHex()} 0%, ${bg} 75%)`,
    buildModuleGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[3].moduleGradient(primary, accent, bg, colord(bg).isLight()),
    buildTextGradient: (primary, accent, isLight) =>
      GRADIENT_COMBINATIONS[3].textGradient(primary, accent, isLight ? '#FFFFFF' : '#0F172A', isLight),
    buildCtaGradient: (primary, accent) => GRADIENT_COMBINATIONS[3].ctaGradient(primary, accent),
    buildPageGradient: (bg, primary, accent) =>
      GRADIENT_COMBINATIONS[3].pageGradient(primary, accent, bg, colord(bg).isLight())
  }
];

/** Anciennes couleurs codées en dur, considérées comme « non personnalisées ». */
const LEGACY_DEFAULT_COLORS = new Set(['#f59e0b', '#fbbf24', '#090d16', '#070b14', '#0b0f19']);

export const isValidColor = (c?: unknown): c is string =>
  typeof c === 'string' && c.trim() !== '' && colord(c.trim()).isValid();

const pick = (...cands: unknown[]): string | undefined => {
  for (const c of cands) if (isValidColor(c)) return colord(c.trim()).toHex();
  return undefined;
};

/**
 * Texte optimal sur un fond donné, teinté avec la nuance du fond
 * (évite le noir pur #000000 dur tout en garantissant un contraste maximal ≥ 10:1).
 */
export const readableTextOn = (bg: string): string => {
  if (!isValidColor(bg)) return '#0F172A';
  const c = colord(bg);
  if (c.isLight()) {
    return c.mix('#0F172A', 0.92).darken(0.15).toHex();
  }
  return '#FFFFFF';
};

/**
 * Ajuste automatiquement n'importe quelle couleur de premier plan (texte, prix, icône, badge)
 * pour garantir un rapport de contraste WCAG >= minContrast par rapport à `bg`.
 * Empêche totalement qu'une couleur principale claire efface le texte sur fond clair,
 * ou qu'une couleur sombre disparaisse sur fond profond.
 */
export const ensureContrastColor = (
  fg: string,
  bg: string,
  minContrast: number = 4.5
): string => {
  if (!isValidColor(fg) || !isValidColor(bg)) return isValidColor(fg) ? fg : '#2563EB';
  let current = colord(fg);
  const bgCol = colord(bg);
  const isLightBg = bgCol.isLight();

  let guard = 0;
  while (current.contrast(bgCol) < minContrast && guard < 24) {
    current = isLightBg
      ? current.darken(0.05).saturate(0.02)
      : current.lighten(0.05).saturate(0.02);
    guard++;
  }
  return current.toHex();
};

/**
 * Calcule une palette complète de textes adaptés (titre, corps, sous-titre, couleur primaire lisible,
 * couleur d'accent lisible, bordure, surface) en fonction de n'importe quel fond et couleur principale.
 */
export function adaptTextColorsForBg(bg: string, primary: string = '#2563EB', accent?: string) {
  const safeBg = isValidColor(bg) ? colord(bg).toHex() : '#F8FAFC';
  const safePrimary = isValidColor(primary) ? colord(primary).toHex() : '#2563EB';
  const safeAccent = isValidColor(accent) ? colord(accent!).toHex() : colord(safePrimary).lighten(0.12).toHex();

  const bgCol = colord(safeBg);
  const isLightBg = bgCol.isLight();

  const headingText = isLightBg
    ? ensureContrastColor(colord(safePrimary).mix('#0F172A', 0.86).toHex(), safeBg, 9)
    : ensureContrastColor(colord(safePrimary).mix('#F8FAFC', 0.92).toHex(), safeBg, 9);

  const bodyText = isLightBg
    ? ensureContrastColor(colord(safePrimary).mix('#1E293B', 0.85).toHex(), safeBg, 7)
    : ensureContrastColor(colord(safePrimary).mix('#F1F5F9', 0.90).toHex(), safeBg, 7);

  const mutedText = isLightBg
    ? ensureContrastColor(colord(safePrimary).mix('#475569', 0.82).toHex(), safeBg, 4.6)
    : ensureContrastColor(colord(safePrimary).mix('#CBD5E1', 0.82).toHex(), safeBg, 4.6);

  const primaryTextOnBg = ensureContrastColor(safePrimary, safeBg, 4.5);
  const accentTextOnBg = ensureContrastColor(safeAccent, safeBg, 4.5);

  const surface = isLightBg
    ? bgCol.luminance() > 0.94
      ? colord(safeBg).mix(safePrimary, 0.03).toHex()
      : '#FFFFFF'
    : colord(safeBg).lighten(0.05).mix(safePrimary, 0.06).toHex();

  const surfaceElevated = isLightBg
    ? '#FFFFFF'
    : colord(safeBg).lighten(0.09).mix(safePrimary, 0.08).toHex();

  const surfaceBorder = isLightBg
    ? alpha(colord(safePrimary).mix('#0F172A', 0.5).toHex(), 0.14)
    : alpha(colord(safePrimary).mix('#FFFFFF', 0.6).toHex(), 0.18);

  return {
    bg: safeBg,
    isLightBg,
    text: headingText,
    headingText,
    bodyText,
    mutedText,
    primaryTextOnBg,
    primaryReadable: primaryTextOnBg,
    accentTextOnBg,
    accentReadable: accentTextOnBg,
    surface,
    surfaceAlt: surfaceElevated,
    surfaceElevated,
    surfaceBorder,
    border: surfaceBorder,
    onPrimary: readableTextOn(safePrimary),
    onAccent: readableTextOn(safeAccent)
  };
}

/** Ajoute une transparence à une couleur (remplace les concaténations `${hex}20`). */
export const alpha = (c: string, a: number): string =>
  colord(isValidColor(c) ? c : '#2563EB').alpha(a).toRgbString();

export interface ResolvedFunnelTheme {
  paletteId: string;
  gradientId: string;
  primary: string;
  accent: string;
  bg: string;
  isLightBg: boolean;
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;
  border: string;
  text: string;
  bodyText: string;
  mutedText: string;
  primaryTextOnBg: string;
  accentTextOnBg: string;
  onPrimary: string;
  onAccent: string;
  pageGradient: string;
  moduleGradient: string;
  textGradient: string;
  ctaGradient: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
}

/**
 * Résout le thème d'un tunnel à partir de n'importe quelle forme de données
 * (settings du builder, payload Supabase, ancien format localStorage).
 */
export function resolveFunnelTheme(src: any = {}): ResolvedFunnelTheme {
  const s = src?.settings || src?.funnelData?.settings || {};
  const presetId = s.themePreset || src?.themePreset;
  const preset = FUNNEL_PALETTES.find((p) => p.id === presetId || p.name === presetId);

  let primary =
    pick(s.primaryColor, src?.primaryColor, s.brandColor, src?.brandColor) ||
    preset?.primary ||
    DEFAULT_PALETTE.primary;
  let accent =
    pick(s.accentColor, src?.accentColor) ||
    preset?.accent ||
    colord(primary).rotate(18).lighten(0.1).toHex();
  let bg = pick(s.bgColor, src?.bgColor) || preset?.bg || DEFAULT_PALETTE.bg;

  if (preset) {
    if (LEGACY_DEFAULT_COLORS.has(primary.toLowerCase())) primary = preset.primary;
    if (LEGACY_DEFAULT_COLORS.has(accent.toLowerCase())) accent = preset.accent;
    if (LEGACY_DEFAULT_COLORS.has(bg.toLowerCase())) bg = preset.bg;
  }

  const adapted = adaptTextColorsForBg(bg, primary, accent);

  const gradientId = s.gradientStyle || src?.gradientStyle || preset?.gradientId || 'aurora_mesh';
  const gradCombo =
    GRADIENT_COMBINATIONS.find((g) => g.id === gradientId) || GRADIENT_COMBINATIONS[0];

  const surface = preset?.surface && bg.toLowerCase() === preset.bg.toLowerCase()
    ? preset.surface
    : adapted.surface;

  const inputBg = adapted.isLightBg
    ? '#FFFFFF'
    : colord(bg).lighten(0.04).mix(primary, 0.05).toHex();
  const inputBorder = adapted.isLightBg
    ? alpha(colord(primary).mix('#334155', 0.6).toHex(), 0.22)
    : alpha('#FFFFFF', 0.16);

  return {
    paletteId: preset?.id || 'custom',
    gradientId: gradCombo.id,
    primary,
    accent,
    bg: adapted.bg,
    isLightBg: adapted.isLightBg,
    surface,
    surfaceElevated: adapted.surfaceElevated,
    surfaceBorder: adapted.surfaceBorder,
    border: adapted.surfaceBorder,
    text: adapted.text,
    bodyText: adapted.bodyText,
    mutedText: adapted.mutedText,
    primaryTextOnBg: adapted.primaryTextOnBg,
    accentTextOnBg: adapted.accentTextOnBg,
    onPrimary: adapted.onPrimary,
    onAccent: adapted.onAccent,
    pageGradient: gradCombo.pageGradient(primary, accent, adapted.bg, adapted.isLightBg),
    moduleGradient: gradCombo.moduleGradient(primary, accent, adapted.bg, adapted.isLightBg),
    textGradient: gradCombo.textGradient(primary, accent, surface, colord(surface).isLight()),
    ctaGradient: gradCombo.ctaGradient(primary, accent),
    inputBg,
    inputBorder,
    inputText: adapted.text
  };
}

/**
 * Résout les couleurs adaptatives d'un bloc/module individuel.
 * Si un bloc a sa propre couleur de fond (`blockData.bgColor`), TOUS ses textes
 * (titres, sous-titres, prix, badges) s'adaptent automatiquement à ce fond !
 */
export function resolveBlockTheme(blockData: any = {}, globalTheme: ResolvedFunnelTheme) {
  const hasCustomBg =
    isValidColor(blockData?.bgColor) &&
    !LEGACY_DEFAULT_COLORS.has(String(blockData.bgColor).trim().toLowerCase());

  const blockBg = hasCustomBg ? colord(blockData.bgColor).toHex() : globalTheme.surface;
  const blockAccent = isValidColor(blockData?.accentColor)
    ? colord(blockData.accentColor).toHex()
    : globalTheme.primary;

  const adapted = adaptTextColorsForBg(blockBg, blockAccent, globalTheme.accent);
  const gradCombo =
    GRADIENT_COMBINATIONS.find((g) => g.id === (blockData?.gradientStyle || globalTheme.gradientId)) ||
    GRADIENT_COMBINATIONS[0];

  const useGradient = blockData?.useGradient !== false;

  return {
    bg: blockBg,
    isLightBg: adapted.isLightBg,
    surface: adapted.surfaceElevated,
    cardBg: adapted.isLightBg
      ? alpha(colord(blockBg).mix(blockAccent, 0.04).toHex(), 0.92)
      : alpha(colord(blockBg).lighten(0.06).toHex(), 0.88),
    border: isValidColor(blockData?.borderColor)
      ? blockData.borderColor
      : adapted.surfaceBorder,
    text: isValidColor(blockData?.textColor)
      ? ensureContrastColor(blockData.textColor, blockBg, 4.5)
      : adapted.text,
    bodyText: adapted.bodyText,
    mutedText: adapted.mutedText,
    primaryText: adapted.primaryTextOnBg,
    accentText: adapted.accentTextOnBg,
    moduleGradient: useGradient
      ? gradCombo.moduleGradient(blockAccent, globalTheme.accent, blockBg, adapted.isLightBg)
      : blockBg,
    textGradient: gradCombo.textGradient(blockAccent, globalTheme.accent, blockBg, adapted.isLightBg),
    ctaGradient: gradCombo.ctaGradient(blockAccent, globalTheme.accent),
    inputBg: adapted.isLightBg ? '#FFFFFF' : colord(blockBg).darken(0.04).toHex(),
    inputBorder: adapted.surfaceBorder,
    inputText: adapted.text
  };
}

/** Couleur de bouton d'un bloc : personnalisée uniquement si explicitement activée, avec texte toujours lisible. */
export function resolveBlockButton(blockData: any = {}, theme: ResolvedFunnelTheme) {
  const custom = blockData?.customBtnColor === true && isValidColor(blockData?.btnBgColor);
  const bg = custom ? colord(blockData.btnBgColor).toHex() : theme.primary;
  const rawText = custom && isValidColor(blockData?.btnTextColor) ? blockData.btnTextColor : readableTextOn(bg);
  const text = ensureContrastColor(rawText, bg, 4.5);
  const gradient = custom
    ? `linear-gradient(135deg, ${bg} 0%, ${colord(bg).lighten(0.08).toHex()} 100%)`
    : theme.ctaGradient;
  return { bg, text, gradient };
}
