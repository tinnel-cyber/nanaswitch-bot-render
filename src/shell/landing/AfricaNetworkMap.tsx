import React from 'react';
import { 
  Store, 
  Video, 
  GraduationCap, 
  Smartphone, 
  Zap, 
  Sparkles 
} from 'lucide-react';

export const AfricaNetworkMap: React.FC = () => {
  return (
    <div className="relative w-full max-w-[520px] aspect-[520/540] mx-auto select-none flex items-center justify-center">
      {/* Halo d'ambiance cosmique derrière la carte */}
      <div className="absolute inset-0 bg-radial from-sky-400/20 via-blue-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Rendu SVG vectoriel haute précision et ultra-léger */}
      <svg
        viewBox="0 0 520 540"
        className="w-full h-full drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dégradés pour les halos et flux */}
          <linearGradient id="hubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>

          <linearGradient id="glowLine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
          </linearGradient>

          {/* Filtre de lueur néon */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Étoiles & Particules d'arrière-plan */}
        <g opacity="0.6">
          <circle cx="60" cy="80" r="1.5" fill="#ffffff" opacity="0.5" />
          <circle cx="110" cy="40" r="1.2" fill="#38bdf8" opacity="0.7" />
          <circle cx="480" cy="120" r="1.8" fill="#ffffff" opacity="0.6" />
          <circle cx="450" cy="380" r="1.2" fill="#38bdf8" opacity="0.4" />
          <circle cx="90" cy="420" r="1.5" fill="#ffffff" opacity="0.5" />
          <circle cx="40" cy="270" r="1.2" fill="#38bdf8" opacity="0.6" />
          <circle cx="490" cy="230" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="210" cy="25" r="1.2" fill="#ffffff" opacity="0.7" />
          <circle cx="340" cy="510" r="1.4" fill="#38bdf8" opacity="0.5" />
          <circle cx="150" cy="490" r="1.2" fill="#ffffff" opacity="0.4" />
        </g>

        {/* Contour Continent Africain (Ligne fine lumineuse style PayDunya) */}
        <path
          d="M 125,78 
             C 155,62 195,55 240,50 
             C 275,46 295,55 330,68 
             C 365,82 400,88 420,105 
             C 432,118 418,138 395,150 
             C 375,162 368,180 382,205 
             C 398,230 450,250 472,282 
             C 485,302 468,328 435,342 
             C 412,352 402,375 398,412 
             C 392,458 362,502 320,530 
             C 298,542 278,532 262,500 
             C 248,468 238,425 232,380 
             C 225,342 205,322 175,312 
             C 142,302 110,280 88,248 
             C 65,215 60,175 80,138 
             C 95,112 110,95 125,78 Z"
          fill="rgba(8, 47, 94, 0.25)"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neonGlow)"
        />

        {/* Ligne pointillée décorative d'onde concentrique autour de l'Afrique */}
        <path
          d="M 120,72 
             C 152,55 195,48 242,42 
             C 280,38 300,48 338,62 
             C 375,76 412,82 432,100 
             C 445,115 428,140 405,152 
             C 382,165 375,185 390,212 
             C 408,238 460,258 482,292 
             C 498,315 478,340 442,355 
             C 420,365 410,388 405,425 
             C 398,472 368,518 322,546 
             C 295,558 272,548 255,512 
             C 240,478 230,432 222,388 
             C 215,348 192,328 162,318 
             C 130,308 95,285 72,252 
             C 48,218 42,175 65,132 
             C 82,105 102,88 120,72 Z"
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />

        {/* Madagascar */}
        <path
          d="M 435,395 C 450,410 455,442 440,475 C 430,480 422,465 425,432 C 428,405 430,395 435,395 Z"
          fill="rgba(56, 189, 248, 0.2)"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1.5"
        />

        {/* Lignes de flux rayonnantes du HUB vers les satellites */}
        <g stroke="url(#glowLine)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85">
          {/* Ligne 1 : Hub vers Sénégal (Wave / OM) */}
          <line x1="285" y1="285" x2="115" y2="200" />
          {/* Ligne 2 : Hub vers Côte d'Ivoire (Caisse POS) */}
          <line x1="285" y1="285" x2="175" y2="320" />
          {/* Ligne 3 : Hub vers Maroc / Maghreb (Campus Marque Blanche) */}
          <line x1="285" y1="285" x2="225" y2="85" />
          {/* Ligne 4 : Hub vers Kenya / Est (Live Shopping) */}
          <line x1="285" y1="285" x2="415" y2="270" />
          {/* Ligne 5 : Hub vers Afrique du Sud (Tunnels 1-Clic) */}
          <line x1="285" y1="285" x2="310" y2="480" />
        </g>

        {/* Points d'impact lumineux sur la carte */}
        <circle cx="115" cy="200" r="4" fill="#38bdf8" />
        <circle cx="175" cy="320" r="4" fill="#f59e0b" />
        <circle cx="225" cy="85" r="4" fill="#a855f7" />
        <circle cx="415" cy="270" r="4" fill="#f43f5e" />
        <circle cx="310" cy="480" r="4" fill="#10b981" />

        {/* Effet d'impulsion au niveau du HUB central (285, 285) */}
        <circle cx="285" cy="285" r="32" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1">
          <animate attributeName="r" values="24;48;24" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="285" cy="285" r="24" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" />
      </svg>

      {/* =====================================================================
          NŒUDS SATELLITES INTERACTIFS (HTML / TAILWIND ABSOLUS)
          ===================================================================== */}

      {/* 1. Nœud Central : Le Cœur Nanasore */}
      <div 
        className="absolute z-20 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '54.8%', top: '52.7%' }}
      >
        <div className="relative group cursor-pointer">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-700 via-sky-500 to-indigo-600 p-0.5 shadow-xl shadow-sky-500/40 flex items-center justify-center animate-pulse">
            <div className="w-full h-full rounded-full bg-[#05264c] flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-sky-400">∞</span >
            </div>
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-white/95 text-[#041c38] text-[10px] font-black uppercase tracking-wider shadow-md border border-white">
            Nanasore Hub
          </div>
        </div>
      </div>

      {/* 2. Nœud Dakar / Ouest : Paiements Wave & OM */}
      <div 
        className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '22.1%', top: '37%' }}
      >
        <div className="relative group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-cyan-300">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#031d3d]/90 border border-cyan-400/30 text-cyan-200 text-[9px] font-bold shadow-md">
            Wave & OM • 0%
          </div>
        </div>
      </div>

      {/* 3. Nœud Abidjan / Côte d'Ivoire : Caisse POS */}
      <div 
        className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '33.6%', top: '59.2%' }}
      >
        <div className="relative group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-amber-300">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#031d3d]/90 border border-amber-400/30 text-amber-200 text-[9px] font-bold shadow-md">
            Caisse POS & Scan
          </div>
        </div>
      </div>

      {/* 4. Nœud Maghreb / Nord : Campus Marque Blanche */}
      <div 
        className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '43.2%', top: '15.7%' }}
      >
        <div className="relative group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-purple-300">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#031d3d]/90 border border-purple-400/30 text-purple-200 text-[9px] font-bold shadow-md">
            Campus Marque Blanche
          </div>
        </div>
      </div>

      {/* 5. Nœud Nairobi / Est : Live Shopping 1-to-1 */}
      <div 
        className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '79.8%', top: '50%' }}
      >
        <div className="relative group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 p-0.5 shadow-lg shadow-rose-500/30 flex items-center justify-center hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-rose-300">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#031d3d]/90 border border-rose-400/30 text-rose-200 text-[9px] font-bold shadow-md">
            Live Shopping 1-to-1
          </div>
        </div>
      </div>

      {/* 6. Nœud Sud : Tunnels 1-Clic */}
      <div 
        className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '59.6%', top: '88.8%' }}
      >
        <div className="relative group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-emerald-300">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#031d3d]/90 border border-emerald-400/30 text-emerald-200 text-[9px] font-bold shadow-md">
            Tunnels 1-Clic
          </div>
        </div>
      </div>

    </div>
  );
};

export default AfricaNetworkMap;
