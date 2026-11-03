import React from 'react';

export interface WameetLogoProps {
  /** Taille de l'icône squircle */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Afficher le texte "Wameet" à côté ou en dessous */
  showWordmark?: boolean;
  /** Afficher la signature "Viens, on se retrouve • Idées, Reels, Chat & Shop" */
  showTagline?: boolean;
  /** Disposition horizontale (en-tête, boutons) ou verticale centrée (chargement, PIN, landing) */
  layout?: 'horizontal' | 'vertical';
  /** Mode de fond : 'dark-pill' encapsule le texte dans un écrin bleu nuit profond pour que "meet" en blanc pur ressorte sur fond clair */
  theme?: 'on-dark' | 'on-light-pill' | 'auto';
  className?: string;
}

const ICON_SIZES: Record<NonNullable<WameetLogoProps['size']>, number> = {
  xs: 24,
  sm: 36,
  md: 46,
  lg: 68,
  xl: 96
};

/**
 * Icône Vectorielle Officielle Wameet (Fidèle à image_2.png) :
 * - Écrin carré aux coins ultra-arrondis (squircle) avec double contour métallique et lumineux bleu et blanc
 * - Grand « W » en bleu royal 3D au centre
 * - Deux bras/mains en blanc pur qui enlacent le « W » et le médaillon central
 * - Bouton Play central et ses ondes d'interactions vibrantes en blanc éclatant
 */
export const WameetSquircleIcon: React.FC<{ pixelSize?: number; className?: string }> = ({
  pixelSize = 46,
  className = ''
}) => {
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Logo Wameet"
    >
      <defs>
        {/* Fond Bleu Nuit Royal de l'écrin */}
        <radialGradient id={`bgGrad-${uid}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#0D2B6B" />
          <stop offset="55%" stopColor="#06163E" />
          <stop offset="100%" stopColor="#030B24" />
        </radialGradient>

        {/* Contour Externe Métallique & Lumineux Bleu Royal / Cyan */}
        <linearGradient id={`outerRim-${uid}`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="30%" stopColor="#2563EB" />
          <stop offset="70%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        {/* Dégradé 3D du Grand « W » en Bleu Royal */}
        <linearGradient id={`wMainGrad-${uid}`} x1="20" y1="22" x2="100" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        <linearGradient id={`wDarkFacet-${uid}`} x1="20" y1="25" x2="95" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        {/* Dégradé Blanc Pur / Argenté pour les deux bras/mains */}
        <linearGradient id={`handGrad-${uid}`} x1="0" y1="30" x2="110" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="75%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Ombre portée douce */}
        <filter id={`glow-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#2563EB" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* 1. ÉCRIN SQUIRCLE : Contour externe Bleu Royal lumineux */}
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="28"
        fill={`url(#bgGrad-${uid})`}
        stroke={`url(#outerRim-${uid})`}
        strokeWidth="5"
        filter={`url(#glow-${uid})`}
      />

      {/* 2. DOUBLE CONTOUR MÉTALLIQUE BLANC PUR INTÉRIEUR */}
      <rect
        x="10.5"
        y="10.5"
        width="99"
        height="99"
        rx="22.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeOpacity="0.95"
      />

      {/* 3. GRAND « W » EN BLEU ROYAL AU CENTRE */}
      {/* Structure principale du W */}
      <path
        d="M22 28 H37 L47 76 L55 26 H65 L73 76 L83 28 H98 L82 95 H66 L60 58 L54 95 H38 L22 28 Z"
        fill={`url(#wMainGrad-${uid})`}
        stroke="#60A5FA"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Facette 3D intérieure du W */}
      <path
        d="M28 31 H35 L46 84 L56 31 H64 L74 84 L85 31 H92 L79 91 H68 L60 49 L52 91 H41 L28 31 Z"
        fill={`url(#wDarkFacet-${uid})`}
        opacity="0.55"
      />

      {/* 4. BRAS / MAIN GAUCHE EN BLANC PUR ENLAÇANT LE « W » */}
      <path
        d="M36 93 C24 85, 22 68, 31 56 C35 50, 41 45, 45 43 C47 42, 49 44, 47 47 C45 50, 43 52, 41 54 C45 52, 49 51, 50 53 C51 55, 47 57, 44 59 C48 58, 51 58, 51 60 C51 62, 47 64, 44 65 C47 65, 49 66, 48 68 C47 70, 42 71, 37 72 C32 74, 32 84, 38 92 Z"
        fill={`url(#handGrad-${uid})`}
        stroke="#0F172A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* 5. BRAS / MAIN DROITE EN BLANC PUR S'ÉLEVANT EN AILE DYNAMIQUE */}
      <path
        d="M95 30 C105 42, 104 60, 91 71 C85 76, 78 80, 72 82 C70 82, 69 80, 71 78 C74 75, 76 73, 78 71 C74 72, 71 72, 70 70 C69 68, 73 66, 76 64 C72 65, 70 64, 70 62 C70 60, 74 58, 78 56 C86 52, 93 42, 93 31 Z"
        fill={`url(#handGrad-${uid})`}
        stroke="#0F172A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* 6. MÉDAILLON CENTRAL PLAY & ONDES D'INTERACTIONS VIBRANTES EN BLANC ÉCLATANT */}
      <circle
        cx="60"
        cy="61"
        r="21"
        fill="#051338"
        stroke="#FFFFFF"
        strokeWidth="2.6"
      />

      {/* Arcs d'ondes intérieurs haut/bas */}
      <path
        d="M46 51 A17 17 0 0 1 74 51"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M46 71 A17 17 0 0 0 74 71"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Ondes d'interactions vibrantes gauche ((( */}
      <path
        d="M45 55 A11 11 0 0 0 45 67"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M41.5 52.5 A15 15 0 0 0 41.5 69.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Ondes d'interactions vibrantes droite ))) */}
      <path
        d="M75 55 A11 11 0 0 1 75 67"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M78.5 52.5 A15 15 0 0 1 78.5 69.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Bouton Play Central en Blanc Éclatant */}
      <path
        d="M55.5 53.5 C55.5 52.2, 57 51.4, 58.1 52.1 L68.2 58.6 C69.2 59.3, 69.2 60.7, 68.2 61.4 L58.1 67.9 C57 68.6, 55.5 67.8, 55.5 66.5 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

/**
 * Composant Global <WameetLogo /> :
 * - Icône Squircle officielle + Typographie "Wa" (Bleu Royal) + "meet" (Blanc Pur) + Point d'activité vert 🟢
 * - Signature optionnelle : "Viens, on se retrouve • Idées, Reels, Chat & Shop"
 */
export const WameetLogo: React.FC<WameetLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  layout = 'horizontal',
  theme = 'on-light-pill',
  className = ''
}) => {
  const px = ICON_SIZES[size] || 46;

  const wordmarkSizeClass =
    size === 'xs'
      ? 'text-sm'
      : size === 'sm'
        ? 'text-lg'
        : size === 'md'
          ? 'text-xl sm:text-2xl'
          : size === 'lg'
            ? 'text-2xl sm:text-3xl'
            : 'text-3xl sm:text-4xl';

  const dotSizeClass =
    size === 'xs'
      ? 'w-2 h-2 -top-0.5 -right-2'
      : size === 'sm'
        ? 'w-2.5 h-2.5 -top-0.5 -right-2.5'
        : 'w-3 h-3 -top-0.5 -right-3';

  return (
    <div
      className={`inline-flex ${
        layout === 'vertical'
          ? 'flex-col items-center text-center gap-2.5'
          : 'items-center gap-2.5'
      } select-none ${className}`}
    >
      {/* Icône Squircle Officielle */}
      <WameetSquircleIcon pixelSize={px} />

      {/* Typographie "Wameet" + Point Vert 🟢 + Signature */}
      {showWordmark && (
        <div
          className={`flex flex-col ${
            layout === 'vertical' ? 'items-center' : 'items-start'
          }`}
        >
          <div
            className={`inline-flex items-center ${
              theme === 'on-light-pill'
                ? 'px-3 py-1 rounded-2xl bg-gradient-to-r from-[#04102E] via-[#091E4C] to-[#051336] border border-blue-500/50 shadow-md'
                : ''
            }`}
          >
            <span
              className={`font-black tracking-tight leading-none inline-flex items-baseline ${wordmarkSizeClass}`}
            >
              {/* "Wa" en Bleu Royal */}
              <span className="text-[#2563EB] drop-shadow-[0_1px_8px_rgba(37,99,235,0.45)]">
                Wa
              </span>
              {/* "meet" en Blanc Pur + Point d'activité vert 🟢 en haut à droite */}
              <span className="text-white relative pr-1">
                meet
                <span
                  className={`absolute ${dotSizeClass} rounded-full bg-[#22C55E] ring-2 ring-[#22C55E]/40 shadow-[0_0_10px_#22C55E]`}
                  title="🟢 Actif sur Wameet"
                />
              </span>
            </span>
          </div>

          {showTagline && (
            <span
              className={`font-bold tracking-wide mt-1 ${
                size === 'xl' || size === 'lg' ? 'text-xs' : 'text-[10px]'
              } ${
                theme === 'on-dark' ? 'text-blue-100/90' : 'text-slate-600'
              }`}
            >
              Viens, on se retrouve • Idées, Reels, Chat &amp; Shop
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default WameetLogo;
