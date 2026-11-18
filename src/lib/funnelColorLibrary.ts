/**
 * ============================================================================
 * BIBLIOTHÈQUE DE COULEURS — ULTIMATE FUNNEL
 * ============================================================================
 * Source unique de vérité pour les couleurs de l'éditeur ET de la vue en ligne.
 * - Palettes curatées, contraste vérifié (WCAG AA) via la librairie `colord`.
 * - `resolveFunnelTheme()` normalise n'importe quel payload (ancien ou nouveau)
 *   et garantit des couleurs valides + un texte toujours lisible.
 */
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import mixPlugin from 'colord/plugins/mix';

extend([a11yPlugin, mixPlugin]);

export interface FunnelPalette {
  id: string;
  name: string;
  desc: string;
  primary: string;
  accent: string;
  bg: string;
  border: string;
  badge: string;
}

/** Palettes officielles (fond sombre, CTA contrasté ≥ 4.5:1 sur le fond). */
export const FUNNEL_PALETTES: FunnelPalette[] = [
  {
    id: 'gold_luxury',
    name: 'Or Impérial & Sombre',
    desc: "Prestige, luxe & formation d'élite",
    primary: '#F5B300',
    accent: '#FFD666',
    bg: '#0B0F19',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  {
    id: 'indigo_cyber',
    name: 'Indigo Cyber IA',
    desc: 'High-Tech, SaaS & Automatisation',
    primary: '#7C83FF',
    accent: '#B4B8FF',
    bg: '#0A0C1E',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300'
  },
  {
    id: 'emerald_fintech',
    name: 'Émeraude Fintech',
    desc: 'Finance, Investissement & Croissance',
    primary: '#10C88A',
    accent: '#6EE7B7',
    bg: '#06140F',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  {
    id: 'afro_solar',
    name: 'Orange Solaire & Feu',
    desc: 'Vibrant, Chaleureux & Haute Conversion',
    primary: '#FF7A1A',
    accent: '#FFB070',
    bg: '#150B05',
    border: 'border-orange-500/40',
    badge: 'bg-orange-500/20 text-orange-300'
  },
  {
    id: 'electric_blue',
    name: 'Bleu Électrique & Tech',
    desc: 'Moderne, Confiance & Professionnel',
    primary: '#1EA7F5',
    accent: '#7DD3FC',
    bg: '#06111F',
    border: 'border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300'
  },
  {
    id: 'rose_beauty',
    name: 'Rose Beauté & Mode',
    desc: 'Cosmétique, Mode & Lifestyle',
    primary: '#FF4F8B',
    accent: '#FFA3C4',
    bg: '#14070D',
    border: 'border-pink-500/40',
    badge: 'bg-pink-500/20 text-pink-300'
  }
];

export const DEFAULT_PALETTE = FUNNEL_PALETTES[0];

/** Anciennes couleurs codées en dur, considérées comme « non personnalisées ». */
const LEGACY_DEFAULT_COLORS = new Set(['#f59e0b', '#fbbf24', '#090d16', '#070b14']);

export const isValidColor = (c?: unknown): c is string =>
  typeof c === 'string' && c.trim() !== '' && colord(c.trim()).isValid();

const pick = (...cands: unknown[]): string | undefined => {
  for (const c of cands) if (isValidColor(c)) return colord(c.trim()).toHex();
  return undefined;
};

/** Texte lisible (noir ou blanc) sur un fond donné. */
export const readableTextOn = (bg: string): string =>
  colord(bg).isLight() ? '#0B0F19' : '#FFFFFF';

/** Ajoute une transparence à une couleur (remplace les concaténations `${hex}20`). */
export const alpha = (c: string, a: number): string => colord(c).alpha(a).toRgbString();

export interface ResolvedFunnelTheme {
  paletteId: string;
  primary: string;
  accent: string;
  bg: string;
  isLightBg: boolean;
  surface: string;
  surfaceBorder: string;
  text: string;
  mutedText: string;
  onPrimary: string;
}

/**
 * Résout le thème d'un tunnel à partir de n'importe quelle forme de données
 * (settings du builder, payload Supabase, ancien format localStorage).
 */
export function resolveFunnelTheme(src: any = {}): ResolvedFunnelTheme {
  const s = src?.settings || src?.funnelData?.settings || {};
  const presetId = s.themePreset || src?.themePreset;
  const preset = FUNNEL_PALETTES.find((p) => p.id === presetId);

  let primary = pick(s.primaryColor, src?.primaryColor, s.brandColor, src?.brandColor) || preset?.primary || DEFAULT_PALETTE.primary;
  let accent = pick(s.accentColor, src?.accentColor) || preset?.accent || DEFAULT_PALETTE.accent;
  let bg = pick(s.bgColor, src?.bgColor) || preset?.bg || DEFAULT_PALETTE.bg;

  // Un preset connu ne doit jamais être « pollué » par les anciennes valeurs par défaut.
  if (preset) {
    if (LEGACY_DEFAULT_COLORS.has(primary.toLowerCase())) primary = preset.primary;
    if (LEGACY_DEFAULT_COLORS.has(accent.toLowerCase())) accent = preset.accent;
    if (LEGACY_DEFAULT_COLORS.has(bg.toLowerCase())) bg = preset.bg;
  }

  const isLightBg = colord(bg).isLight();
  const surface = isLightBg
    ? colord(bg).mix('#000000', 0.04).toHex()
    : colord(bg).mix('#FFFFFF', 0.06).toHex();
  const surfaceBorder = isLightBg ? alpha('#000000', 0.1) : alpha('#FFFFFF', 0.1);
  const text = isLightBg ? '#0B0F19' : '#F8FAFC';
  const mutedText = isLightBg ? '#475569' : '#94A3B8';

  // Si la couleur principale est illisible sur le fond, on l'ajuste (WCAG ≥ 3:1).
  let guard = 0;
  while (colord(primary).contrast(bg) < 3 && guard < 10) {
    primary = isLightBg ? colord(primary).darken(0.06).toHex() : colord(primary).lighten(0.06).toHex();
    guard++;
  }

  return {
    paletteId: preset?.id || 'custom',
    primary,
    accent,
    bg,
    isLightBg,
    surface,
    surfaceBorder,
    text,
    mutedText,
    onPrimary: readableTextOn(primary)
  };
}

/** Couleur de bouton d'un bloc : personnalisée uniquement si explicitement activée. */
export function resolveBlockButton(blockData: any = {}, theme: ResolvedFunnelTheme) {
  const custom = blockData?.customBtnColor === true && isValidColor(blockData?.btnBgColor);
  const bg = custom ? colord(blockData.btnBgColor).toHex() : theme.primary;
  const text = custom && isValidColor(blockData?.btnTextColor) ? blockData.btnTextColor : readableTextOn(bg);
  return { bg, text };
}
