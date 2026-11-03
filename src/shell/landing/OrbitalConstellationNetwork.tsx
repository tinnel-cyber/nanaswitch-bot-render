import React from 'react';
import { 
  Store, 
  Video, 
  GraduationCap, 
  Smartphone, 
  Zap 
} from 'lucide-react';

interface SatelliteNodeConfig {
  id: string;
  Icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
  leftPercent: string;
  topPercent: string;
  gradient: string;
  shadow: string;
  dotColor: string;
  iconColor: string;
}

// 5 Nœuds satellites distribués géométriquement en orbite à R = 135px (ViewBox 400x400, Centre 200,200)
const SATELLITE_NODES: SatelliteNodeConfig[] = [
  // Nœud 0 : Sommet (-90°) - Campus Marque Blanche (Formations)
  {
    id: 'campus',
    Icon: GraduationCap,
    x: 200,
    y: 65,
    leftPercent: '50%',
    topPercent: '16.25%',
    gradient: 'from-purple-500 to-indigo-600',
    shadow: 'shadow-purple-500/40',
    dotColor: '#a855f7',
    iconColor: 'text-purple-200'
  },
  // Nœud 1 : Haut Droit (-18°) - Live Shopping 1-to-1
  {
    id: 'live',
    Icon: Video,
    x: 328.4,
    y: 158.3,
    leftPercent: '82.1%',
    topPercent: '39.58%',
    gradient: 'from-rose-500 to-red-600',
    shadow: 'shadow-rose-500/40',
    dotColor: '#f43f5e',
    iconColor: 'text-rose-200'
  },
  // Nœud 2 : Bas Droit (54°) - Tunnels 1-Clic
  {
    id: 'tunnels',
    Icon: Zap,
    x: 279.4,
    y: 309.2,
    leftPercent: '69.85%',
    topPercent: '77.3%',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/40',
    dotColor: '#10b981',
    iconColor: 'text-emerald-200'
  },
  // Nœud 3 : Bas Gauche (126°) - Caisse POS & Scan
  {
    id: 'pos',
    Icon: Store,
    x: 120.6,
    y: 309.2,
    leftPercent: '30.15%',
    topPercent: '77.3%',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/40',
    dotColor: '#f59e0b',
    iconColor: 'text-amber-200'
  },
  // Nœud 4 : Haut Gauche (198°) - Paiements Wave & OM
  {
    id: 'mobile',
    Icon: Smartphone,
    x: 71.6,
    y: 158.3,
    leftPercent: '17.9%',
    topPercent: '39.58%',
    gradient: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-cyan-500/40',
    dotColor: '#38bdf8',
    iconColor: 'text-cyan-200'
  }
];

export const OrbitalConstellationNetwork: React.FC = () => {
  return (
    <div className="relative w-[270px] h-[270px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px] max-w-full aspect-square mx-auto select-none flex items-center justify-center overflow-visible">
      
      {/* Styles d'animation CSS intégrés pour une rotation orbitale parfaite & contre-rotation droite des icônes */}
      <style>{`
        @keyframes orbitalConstellationRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes counterConstellationRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-orbit-rotate {
          animation: orbitalConstellationRotate 35s linear infinite;
          will-change: transform;
        }
        .animate-counter-rotate {
          animation: counterConstellationRotate 35s linear infinite;
          will-change: transform;
        }
      `}</style>

      {/* Halo cosmique diffus d'arrière-plan */}
      <div className="absolute inset-0 bg-radial from-sky-400/25 via-blue-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* =====================================================================
          CONTENEUR EN ROTATION ORBITALE INFINIE (Lignes & Positions des Nœuds)
          ===================================================================== */}
      <div className="absolute inset-0 w-full h-full animate-orbit-rotate pointer-events-none">
        
        {/* Rendu SVG des lignes de la constellation géodésique */}
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="constellationSpoke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.25" />
            </linearGradient>

            <filter id="neonGlowDot" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Guide orbital circulaire discontinu */}
          <circle 
            cx="200" 
            cy="200" 
            r="135" 
            fill="none" 
            stroke="rgba(56, 189, 248, 0.22)" 
            strokeWidth="1.2" 
            strokeDasharray="4 6" 
          />
          <circle 
            cx="200" 
            cy="200" 
            r="75" 
            fill="none" 
            stroke="rgba(56, 189, 248, 0.12)" 
            strokeWidth="0.8" 
            strokeDasharray="2 4" 
          />

          {/* 1. Lignes du polygone externe reliant les nœuds adjacents en constellation */}
          {SATELLITE_NODES.map((node, i) => {
            const nextNode = SATELLITE_NODES[(i + 1) % SATELLITE_NODES.length];
            return (
              <line
                key={`poly-${node.id}`}
                x1={node.x}
                y1={node.y}
                x2={nextNode.x}
                y2={nextNode.y}
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* 2. Diagonales en étoile de la constellation */}
          {SATELLITE_NODES.map((node, i) => {
            const diagNode = SATELLITE_NODES[(i + 2) % SATELLITE_NODES.length];
            return (
              <line
                key={`diag-${node.id}`}
                x1={node.x}
                y1={node.y}
                x2={diagNode.x}
                y2={diagNode.y}
                stroke="rgba(129, 140, 248, 0.2)"
                strokeWidth="1"
                strokeDasharray="2 5"
              />
            );
          })}

          {/* 3. Lignes rayonnantes reliant le Hub central à chaque satellite */}
          {SATELLITE_NODES.map((node) => (
            <line
              key={`spoke-${node.id}`}
              x1="200"
              y1="200"
              x2={node.x}
              y2={node.y}
              stroke="url(#constellationSpoke)"
              strokeWidth="1.4"
              strokeDasharray="5 4"
            />
          ))}

          {/* 4. Points lumineux scintillants aux intersections des nœuds */}
          {SATELLITE_NODES.map((node) => (
            <circle
              key={`dot-${node.id}`}
              cx={node.x}
              cy={node.y}
              r="3.5"
              fill={node.dotColor}
              filter="url(#neonGlowDot)"
            />
          ))}
        </svg>

        {/* Nœuds Satellites Interactifs avec Contre-Rotation Droite (Pointer Events réactivés) */}
        {SATELLITE_NODES.map((node) => (
          <div
            key={node.id}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ left: node.leftPercent, top: node.topPercent }}
          >
            {/* Contre-rotation pour garder l'icône pure toujours droite sans jamais tourner sur elle-même */}
            <div className="animate-counter-rotate flex items-center justify-center">
              <div 
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr ${node.gradient} p-0.5 shadow-lg ${node.shadow} flex items-center justify-center transition-transform hover:scale-115 cursor-pointer`}
              >
                <div className="w-full h-full rounded-full bg-[#041c38] flex items-center justify-center text-white">
                  <node.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${node.iconColor}`} />
                </div>
              </div>
            </div>
          </div>
        ))}

      </div>

      {/* =====================================================================
          NŒUD CENTRAL STATIONNAIRE (Hub Nanasore avec Favicon Officiel & onde de choc)
          ===================================================================== */}
      <div className="relative z-20 flex items-center justify-center pointer-events-auto cursor-pointer group">
        {/* Ondes pulsées */}
        <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-sky-400/25 animate-ping pointer-events-none" />
        <div className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-sky-400/35 pointer-events-none" />

        {/* Cœur Nanasore Hub */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-700 via-sky-400 to-indigo-600 p-0.5 shadow-2xl shadow-sky-400/50 flex items-center justify-center animate-pulse group-hover:scale-105 transition-transform">
          <div className="w-full h-full rounded-full bg-[#05264c] border border-sky-400/30 flex items-center justify-center p-2.5 sm:p-3 overflow-hidden">
            <img 
              src="/favicon.svg" 
              alt="Logo Officiel Nanasore" 
              className="w-full h-full object-contain rounded-lg drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" 
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default OrbitalConstellationNetwork;
