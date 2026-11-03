import React, { useId } from 'react';

export interface NaNaSwitchLogoProps {
  /**
   * - 'mark' : Emblème Pur — ZÉRO TEXTE (Bouclier + Maillage + Cloud + Flèches de Routage plein cadre viewBox="0 0 100 100")
   * - 'mobile-header' : Spécial Barre Supérieure Téléphone (h-8 / h-9 max, Bouclier mark + NaNaSwitch + badge CLOUD sur 1 ligne)
   * - 'full' : Desktop, Page /nana-switch/auth, Écran PIN & Sidebar PC (Bouclier + NaNaSwitch + CLOUD + Smart API Router)
   */
  variant?: 'mark' | 'mobile-header' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * 'dark' = texte NaNa en Blanc Pur (#FFFFFF) pour fonds sombres
   * 'light' = texte NaNa en Bleu Nuit (#0F172A) pour fonds clairs
   */
  theme?: 'dark' | 'light';
  /**
   * Orientation pour variant="full" : 'horizontal' (défaut) ou 'vertical' (centré empilé pour écrans PIN / Auth)
   */
  layout?: 'horizontal' | 'vertical';
  className?: string;
  iconSize?: number;
}

const MARK_SIZE_MAP: Record<NonNullable<NaNaSwitchLogoProps['size']>, number> = {
  xs: 28,
  sm: 34,
  md: 44,
  lg: 58,
  xl: 76,
};

/**
 * Emblème Vectoriel Pur — "Le Cœur de Routage" (viewBox="0 0 100 100")
 * 1. Le Bouclier Protecteur à double bordure métallique/lumineuse (#2563EB, #38BDF8, #FFFFFF) + éclats sur les arêtes
 * 2. Le Maillage Réseau Interne (constellation API sur fond bleu nuit profond #0F172A / #1E3A8A)
 * 3. Le Cloud en Blanc Pur (#FFFFFF) & Les Flèches Courbes Dynamiques de Routage (Switch)
 */
export const NaNaSwitchShieldMark: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 44, className = '' }) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      role="img"
      aria-label="NaNaSwitch Cloud — Le Cœur de Routage"
    >
      <defs>
        {/* Halo externe du bouclier */}
        <filter id={`nsShieldGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#0284C7" floodOpacity="0.45" />
        </filter>

        {/* Ombre portée interne des flèches et du cloud */}
        <filter id={`nsInnerShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#020617" floodOpacity="0.75" />
        </filter>

        {/* Bordure extérieure métallique Gauche (Blanc Pur -> Cyan -> Bleu Royal) */}
        <linearGradient id={`nsOuterLeft_${uid}`} x1="14" y1="8" x2="50" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="28%" stopColor="#7DD3FC" />
          <stop offset="65%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* Bordure extérieure métallique Droite (Bleu Royal -> Cyan -> Bleu Profond) */}
        <linearGradient id={`nsOuterRight_${uid}`} x1="50" y1="8" x2="86" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="30%" stopColor="#38BDF8" />
          <stop offset="70%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Deuxième liseré interne lumineux du bouclier */}
        <linearGradient id={`nsInnerRim_${uid}`} x1="20" y1="14" x2="80" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="35%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Fond Bleu Nuit Profond de la cavité du bouclier */}
        <radialGradient id={`nsCoreBg_${uid}`} cx="50" cy="46" r="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="55%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#050B18" />
        </radialGradient>

        {/* Dégradé Nuage Cloud Blanc Pur 3D */}
        <linearGradient id={`nsCloudGrad_${uid}`} x1="30" y1="32" x2="72" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="78%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>

        {/* Dégradé Flèche de Routage Cyan -> Bleu Royal (Gauche / Bas -> Centre) */}
        <linearGradient id={`nsArrowCyanA_${uid}`} x1="33" y1="68" x2="52" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="85%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>

        {/* Dégradé Flèche de Routage Cyan -> Bleu Royal (Haut / Droite -> Centre) */}
        <linearGradient id={`nsArrowCyanB_${uid}`} x1="66" y1="33" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="45%" stopColor="#38BDF8" />
          <stop offset="85%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Dégradé Flèche de Routage Blanc Pur (Bas -> Droite/Extérieur) */}
        <linearGradient id={`nsArrowWhite_${uid}`} x1="37" y1="66" x2="60" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* ClipPath de la cavité interne du bouclier pour le maillage réseau */}
        <clipPath id={`nsShieldInnerClip_${uid}`}>
          <path d="M50 16.5 L78.5 27.5 C78.5 53.5 68.5 73 50 84.5 C31.5 73 21.5 53.5 21.5 27.5 Z" />
        </clipPath>
      </defs>

      {/* =================================================================== */}
      {/* 1. LE BOUCLIER PROTECTEUR À DOUBLE BORDURE MÉTALLIQUE & LUMINEUSE   */}
      {/* =================================================================== */}
      <g filter={`url(#nsShieldGlow_${uid})`}>
        {/* Moitié Gauche du biseau extérieur métallique */}
        <path
          d="M50 7 L14 21.5 C14 53.5 26.5 77.5 50 93 L50 7 Z"
          fill={`url(#nsOuterLeft_${uid})`}
        />
        {/* Moitié Droite du biseau extérieur métallique */}
        <path
          d="M50 7 L86 21.5 C86 53.5 73.5 77.5 50 93 L50 7 Z"
          fill={`url(#nsOuterRight_${uid})`}
        />

        {/* Gorge intermédiaire sombre pour effet double-cadre */}
        <path
          d="M50 11.5 L81.8 24.2 C81.8 53.5 70.6 75.2 50 88.8 C29.4 75.2 18.2 53.5 18.2 24.2 Z"
          fill="#091938"
        />

        {/* Second cadre intérieur biseauté Cyan & Blanc Pur */}
        <path
          d="M50 13.5 L80.2 25.6 C80.2 53.5 69.5 74.2 50 86.8 C30.5 74.2 19.8 53.5 19.8 25.6 Z"
          fill={`url(#nsInnerRim_${uid})`}
        />

        {/* Cavité centrale Bleu Nuit Profond (#0F172A / #1E3A8A) */}
        <path
          d="M50 16.5 L78.5 27.5 C78.5 53.5 68.5 73 50 84.5 C31.5 73 21.5 53.5 21.5 27.5 Z"
          fill={`url(#nsCoreBg_${uid})`}
        />
      </g>

      {/* =================================================================== */}
      {/* 2. LE MAILLAGE RÉSEAU INTERNE (CONSTELLATION API)                   */}
      {/* =================================================================== */}
      <g clipPath={`url(#nsShieldInnerClip_${uid})`} opacity="0.72">
        {/* Lignes de connexion du maillage réseau */}
        <g stroke="#38BDF8" strokeWidth="0.9" strokeOpacity="0.55">
          {/* Couronne périphérique dans le bouclier */}
          <line x1="50" y1="22" x2="36" y2="27" />
          <line x1="50" y1="22" x2="64" y2="27" />
          <line x1="36" y1="27" x2="26" y2="32" />
          <line x1="64" y1="27" x2="74" y2="32" />
          <line x1="26" y1="32" x2="28" y2="48" />
          <line x1="74" y1="32" x2="72" y2="48" />
          <line x1="28" y1="48" x2="34" y2="62" />
          <line x1="72" y1="48" x2="66" y2="62" />
          <line x1="34" y1="62" x2="40" y2="71" />
          <line x1="66" y1="62" x2="60" y2="71" />
          <line x1="40" y1="71" x2="50" y2="78" />
          <line x1="60" y1="71" x2="50" y2="78" />

          {/* Triangulations internes vers le cœur de routage */}
          <line x1="50" y1="22" x2="43" y2="34" />
          <line x1="50" y1="22" x2="57" y2="34" />
          <line x1="36" y1="27" x2="43" y2="34" />
          <line x1="64" y1="27" x2="57" y2="34" />
          <line x1="36" y1="27" x2="33" y2="38" />
          <line x1="64" y1="27" x2="67" y2="38" />
          <line x1="26" y1="32" x2="33" y2="38" />
          <line x1="74" y1="32" x2="67" y2="38" />
          <line x1="28" y1="48" x2="33" y2="38" />
          <line x1="72" y1="48" x2="67" y2="38" />
          <line x1="43" y1="34" x2="57" y2="34" />
          <line x1="34" y1="62" x2="50" y2="67" />
          <line x1="66" y1="62" x2="50" y2="67" />
          <line x1="50" y1="67" x2="40" y2="71" />
          <line x1="50" y1="67" x2="60" y2="71" />
          <line x1="50" y1="67" x2="50" y2="78" />
        </g>

        {/* Nœuds lumineux de la constellation API */}
        <g fill="#38BDF8">
          <circle cx="50" cy="22" r="1.9" fill="#7DD3FC" />
          <circle cx="36" cy="27" r="1.8" />
          <circle cx="64" cy="27" r="1.8" />
          <circle cx="26" cy="32" r="1.7" />
          <circle cx="74" cy="32" r="1.7" />
          <circle cx="43" cy="34" r="1.7" fill="#7DD3FC" />
          <circle cx="57" cy="34" r="1.7" fill="#7DD3FC" />
          <circle cx="33" cy="38" r="1.8" />
          <circle cx="67" cy="38" r="1.8" />
          <circle cx="28" cy="48" r="1.7" />
          <circle cx="72" cy="48" r="1.7" />
          <circle cx="34" cy="62" r="1.7" />
          <circle cx="66" cy="62" r="1.7" />
          <circle cx="50" cy="67" r="1.9" fill="#7DD3FC" />
          <circle cx="40" cy="71" r="1.6" />
          <circle cx="60" cy="71" r="1.6" />
          <circle cx="50" cy="78" r="1.8" />
        </g>
      </g>

      {/* =================================================================== */}
      {/* 3. LE CLOUD BLANC PUR & LES FLÈCHES COURBES DE ROUTAGE (SWITCH)     */}
      {/* =================================================================== */}
      <g filter={`url(#nsInnerShadow_${uid})`}>
        {/* A. Nuage Cloud Central en Blanc Pur (#FFFFFF) */}
        <path
          d="M34.5 56.5
             C29.8 56.5 26.5 53.1 26.5 48.6
             C26.5 44.6 29.3 41.3 33.1 40.7
             C34.2 36.2 38.2 33 43 33
             C44.5 33 45.9 33.3 47.2 33.9
             C49.5 30.2 53.6 28 58.2 28
             C65.1 28 70.7 33.3 71.1 40.1
             C75.3 41.1 78.3 44.8 78.3 49.2
             C78.3 54.4 74.1 56.5 69.2 56.5
             Z"
          fill={`url(#nsCloudGrad_${uid})`}
        />

        {/* B. Flèche Courbe Supérieure-Droite (Dégradé Cyan -> Bleu Royal allant vers le centre) */}
        <path
          d="M55.5 32.5
             C63.5 29.8 69.2 34.2 66.2 41.5
             C64.2 46.2 59.8 50.2 55.2 52.8
             L58.4 55.4
             L46.8 54.2
             L50.8 43.2
             L53.2 46.5
             C57.5 44.2 61.2 40.8 62.2 37.2
             C63.0 34.4 60.0 33.0 55.5 32.5 Z"
          fill={`url(#nsArrowCyanB_${uid})`}
          stroke="#07142B"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* C. Flèche Courbe Inférieure-Gauche (Dégradé Bleu Royal -> Cyan Lumineux montant vers le centre) */}
        <path
          d="M35.5 67.8
             C31.2 65.5 32.5 58.2 39.2 51.8
             L36.2 48.8
             L48.5 46.8
             L45.2 57.8
             L42.5 55.0
             C37.6 59.8 36.2 64.5 38.2 66.8
             Z"
          fill={`url(#nsArrowCyanA_${uid})`}
          stroke="#07142B"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* D. Flèche Courbe Inférieure-Droite en Blanc Pur (#FFFFFF allant vers la droite/extérieur) */}
        <path
          d="M36.8 66.2
             C40.5 69.5 48.8 67.2 55.5 60.2
             L58.2 62.6
             L61.2 51.5
             L50.0 54.4
             L52.6 56.8
             C47.2 62.0 41.0 64.2 37.8 63.0
             Z"
          fill={`url(#nsArrowWhite_${uid})`}
          stroke="#07142B"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </g>

      {/* =================================================================== */}
      {/* 4. ÉCLATS LUMINEUX SUR LES ARÊTES DU BOUCLIER                       */}
      {/* =================================================================== */}
      {/* Éclat Arête Supérieure Gauche */}
      <g transform="translate(15.5, 22)">
        <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
        <path d="M-6 0 L6 0 M0 -6 L0 6" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      {/* Éclat Arête Supérieure Droite */}
      <g transform="translate(84.5, 22)">
        <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
        <path d="M-6 0 L6 0 M0 -6 L0 6" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      {/* Éclat Flanc Inférieur Gauche */}
      <g transform="translate(24, 68)">
        <circle cx="0" cy="0" r="1.6" fill="#E0F2FE" />
        <path d="M-4.5 0 L4.5 0 M0 -4.5 L0 4.5" stroke="#E0F2FE" strokeWidth="0.9" strokeLinecap="round" />
      </g>
      {/* Éclat Flanc Inférieur Droit */}
      <g transform="translate(76, 68)">
        <circle cx="0" cy="0" r="1.6" fill="#E0F2FE" />
        <path d="M-4.5 0 L4.5 0 M0 -4.5 L0 4.5" stroke="#E0F2FE" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/**
 * Composant Officiel <NaNaSwitchLogo />
 * Implémente les 3 variantes strictes :
 * 1. variant="mark" : Emblème Pur (ZÉRO TEXTE)
 * 2. variant="mobile-header" : Spécial Barre Supérieure Téléphone (ultra-compact sur 1 seule ligne)
 * 3. variant="full" : Desktop, Page /nana-switch/auth, Écran PIN & Sidebar PC
 */
export const NaNaSwitchLogo: React.FC<NaNaSwitchLogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'light',
  layout = 'horizontal',
  className = '',
  iconSize,
}) => {
  const resolvedMarkSize = iconSize || MARK_SIZE_MAP[size];
  const nanaColor = theme === 'dark' ? 'text-white' : 'text-[#0F172A]';
  const switchColor = theme === 'dark' ? 'text-[#38BDF8]' : 'text-[#2563EB]';
  const subtitleColor = theme === 'dark' ? 'text-sky-200/85' : 'text-slate-500';

  // -------------------------------------------------------------------------
  // VARIANTE 1 : "mark" (Emblème Pur — ZÉRO TEXTE)
  // -------------------------------------------------------------------------
  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <NaNaSwitchShieldMark size={resolvedMarkSize} />
      </span>
    );
  }

  // -------------------------------------------------------------------------
  // VARIANTE 2 : "mobile-header" (Spécial Barre Supérieure Téléphone)
  // Alignement horizontal ultra-compact (h-8 / h-9 max, flex items-center gap-2 shrink-0)
  // -------------------------------------------------------------------------
  if (variant === 'mobile-header') {
    const mobileIconPx = iconSize || 32;
    return (
      <div className={`h-8 sm:h-9 flex items-center gap-2 shrink-0 select-none ${className}`}>
        <NaNaSwitchShieldMark size={mobileIconPx} />
        <div className="flex items-center gap-1.5 leading-none whitespace-nowrap">
          <span className="text-sm sm:text-base font-black tracking-tight">
            <span className={nanaColor}>NaNa</span>
            <span className={switchColor}>Switch</span>
          </span>
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
              theme === 'dark'
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            CLOUD
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // VARIANTE 3 : "full" (Desktop, /nana-switch/auth, Écran PIN & Sidebar PC)
  // Le Bouclier + NaNaSwitch + CLOUD + Smart API Router
  // -------------------------------------------------------------------------
  if (layout === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center text-center select-none gap-2 ${className}`}>
        <NaNaSwitchShieldMark size={iconSize || Math.max(resolvedMarkSize, 56)} />
        <div className="flex flex-col items-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight">
              <span className={nanaColor}>NaNa</span>
              <span className={switchColor}>Switch</span>
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                theme === 'dark'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              CLOUD
            </span>
          </div>
          <span className={`text-[10px] sm:text-[11px] font-bold tracking-wide mt-0.5 ${subtitleColor}`}>
            Smart API Router
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      <NaNaSwitchShieldMark size={resolvedMarkSize} />
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={`${
              size === 'xs'
                ? 'text-sm'
                : size === 'sm'
                ? 'text-base'
                : size === 'lg'
                ? 'text-xl'
                : size === 'xl'
                ? 'text-2xl'
                : 'text-lg'
            } font-black tracking-tight`}
          >
            <span className={nanaColor}>NaNa</span>
            <span className={switchColor}>Switch</span>
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              theme === 'dark'
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            CLOUD
          </span>
        </div>
        <span className={`text-[10px] sm:text-[11px] font-bold tracking-wide ${subtitleColor}`}>
          Smart API Router
        </span>
      </div>
    </div>
  );
};

export default NaNaSwitchLogo;
