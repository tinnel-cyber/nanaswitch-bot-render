import React from 'react';

/**
 * HeroAbstractFloatingBackground - "Matrice Hybride" (Animation 3D, Liquide et Ascension)
 * 
 * Thème : "L'Usine Digitale" où le Commerce (Cartes Blanches) et le Savoir (Diplômes)
 * naissent d'un fluide technologique lumineux et s'élèvent vers la surface.
 * 
 * 1. Décor 3D Cyber-Profondeur :
 *    - Fond Bleu Nuit profond (from-slate-950 via-blue-950 to-slate-900).
 *    - Grille matricielle 3D en perspective au sol (rotateX 72deg) avec effet de fuite vers l'horizon.
 *    - Faisceau laser atmosphérique subtil marquant la ligne d'horizon numérique.
 * 
 * 2. Réservoir Liquide (Le Cœur du Moteur) :
 *    - Bassin de fluide technologique en bas d'écran.
 *    - Vagues SVG et CSS liquides ondulant perpétuellement en cyan/bleu clair translucide.
 *    - Crête lumineuse réactive et bulles énergétiques bioluminescentes.
 * 
 * 3. L'Ascension des Cartes & Diplômes (L'Écosystème) :
 *    - A. Cartes Blanches (Commerce/Business) : cartes bancaires et vitrines en verre dépoli (Glassmorphism).
 *    - B. Diplômes (Savoir/Académie) : toques d'étudiant (mortarboard) et parchemins roulés avec rubans.
 *    - Mouvement d'apesanteur & poussée d'Archimède : tangage doux de gauche à droite couplé à une montée linéaire.
 * 
 * 4. Hiérarchie Visuelle :
 *    - Opacités équilibrées (0.30 à 0.65) et z-index calibré pour laisser le titre et les boutons au premier plan.
 */
export const HeroAbstractFloatingBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 bg-gradient-to-b from-slate-950 via-[#060e24] to-[#03091e]">
      
      {/* =====================================================================
          STYLES D'ANIMATION : CYBER-PERSPECTIVE, LIQUIDE & POUSSÉE D'ARCHIMÈDE
          ===================================================================== */}
      <style>{`
        /* 1. GRILLE CYBER EN PERSPECTIVE 3D AU SOL */
        .cyber-grid-perspective {
          perspective: 650px;
          perspective-origin: 50% 40%;
        }
        
        .cyber-grid-floor {
          transform: rotateX(72deg) translateY(0);
          transform-origin: center bottom;
          background-image: 
            linear-gradient(to right, rgba(56, 189, 248, 0.16) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.16) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: cyberGridForward 14s linear infinite;
          mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 95%);
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 95%);
        }

        @keyframes cyberGridForward {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 48px;
          }
        }

        /* 2. ONDULATION DU RÉSERVOIR LIQUIDE ÉNERGÉTIQUE */
        @keyframes liquidWaveFlow1 {
          0% {
            transform: translate3d(-3%, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(3%, -8px, 0) scaleY(1.08);
          }
          100% {
            transform: translate3d(-3%, 0, 0) scaleY(1);
          }
        }

        @keyframes liquidWaveFlow2 {
          0% {
            transform: translate3d(4%, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(-4%, 10px, 0) scaleY(0.92);
          }
          100% {
            transform: translate3d(4%, 0, 0) scaleY(1);
          }
        }

        @keyframes liquidPulseGlow {
          0%, 100% {
            opacity: 0.35;
            filter: drop-shadow(0 -4px 12px rgba(56,189,248,0.4));
          }
          50% {
            opacity: 0.55;
            filter: drop-shadow(0 -6px 20px rgba(56,189,248,0.7));
          }
        }

        /* 3. ASCENSION LINÉAIRE CONSTANTE (DEPUIS LE LIQUIDE JUSQU'EN HAUT) */
        @keyframes archimedesRise1 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.45;
          }
          88% {
            opacity: 0.45;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        @keyframes archimedesRise2 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.40;
          }
          88% {
            opacity: 0.40;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        @keyframes archimedesRise3 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.48;
          }
          88% {
            opacity: 0.48;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        @keyframes archimedesRise4 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.42;
          }
          88% {
            opacity: 0.42;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        @keyframes archimedesRise5 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.38;
          }
          88% {
            opacity: 0.38;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        @keyframes archimedesRise6 {
          0% {
            transform: translate3d(0, 110vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.36;
          }
          88% {
            opacity: 0.36;
          }
          100% {
            transform: translate3d(0, -125vh, 0);
            opacity: 0;
          }
        }

        /* 4. BALANCIER D'ARCHIMÈDE (TANGAGE GAUCHE/DROITE & MICRO-ROTATION) */
        @keyframes archimedesSway1 {
          0% {
            transform: translate3d(-24px, 0, 0) rotate(-4deg);
          }
          50% {
            transform: translate3d(28px, 0, 0) rotate(3.5deg);
          }
          100% {
            transform: translate3d(-24px, 0, 0) rotate(-4deg);
          }
        }

        @keyframes archimedesSway2 {
          0% {
            transform: translate3d(26px, 0, 0) rotate(3deg);
          }
          50% {
            transform: translate3d(-30px, 0, 0) rotate(-4deg);
          }
          100% {
            transform: translate3d(26px, 0, 0) rotate(3deg);
          }
        }

        @keyframes archimedesSway3 {
          0% {
            transform: translate3d(-22px, 0, 0) rotate(-3.5deg);
          }
          50% {
            transform: translate3d(25px, 0, 0) rotate(3deg);
          }
          100% {
            transform: translate3d(-22px, 0, 0) rotate(-3.5deg);
          }
        }

        @keyframes archimedesSway4 {
          0% {
            transform: translate3d(20px, 0, 0) rotate(3.5deg);
          }
          50% {
            transform: translate3d(-24px, 0, 0) rotate(-3deg);
          }
          100% {
            transform: translate3d(20px, 0, 0) rotate(3.5deg);
          }
        }

        @keyframes archimedesSway5 {
          0% {
            transform: translate3d(-18px, 0, 0) rotate(-2.5deg);
          }
          50% {
            transform: translate3d(22px, 0, 0) rotate(3deg);
          }
          100% {
            transform: translate3d(-18px, 0, 0) rotate(-2.5deg);
          }
        }

        @keyframes archimedesSway6 {
          0% {
            transform: translate3d(16px, 0, 0) rotate(2.5deg);
          }
          50% {
            transform: translate3d(-20px, 0, 0) rotate(-3deg);
          }
          100% {
            transform: translate3d(16px, 0, 0) rotate(2.5deg);
          }
        }

        /* 5. ÉTINCELLES ET BULLES BIOLUMINESCENTES NAISSANT DU LIQUIDE */
        @keyframes sparkBubbleAscend {
          0% {
            transform: translate3d(0, 100%, 0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(18px, -120px, 0) scale(1.1);
            opacity: 0;
          }
        }

        /* CLASSES DE LIAISON */
        .anim-wave-1 {
          animation: liquidWaveFlow1 11s ease-in-out infinite;
          will-change: transform;
        }
        .anim-wave-2 {
          animation: liquidWaveFlow2 15s ease-in-out infinite;
          will-change: transform;
        }
        .anim-liquid-pulse {
          animation: liquidPulseGlow 6s ease-in-out infinite;
          will-change: opacity, filter;
        }

        /* DÉCOUPLAGE DES OBJETS D'ARCHIMÈDE */
        .rise-obj-1 {
          animation: archimedesRise1 30s linear infinite;
          animation-delay: -6s;
          will-change: transform, opacity;
        }
        .sway-obj-1 {
          animation: archimedesSway1 6.5s ease-in-out infinite;
          will-change: transform;
        }

        .rise-obj-2 {
          animation: archimedesRise2 34s linear infinite;
          animation-delay: -19s;
          will-change: transform, opacity;
        }
        .sway-obj-2 {
          animation: archimedesSway2 7.2s ease-in-out infinite;
          will-change: transform;
        }

        .rise-obj-3 {
          animation: archimedesRise3 28s linear infinite;
          animation-delay: -13s;
          will-change: transform, opacity;
        }
        .sway-obj-3 {
          animation: archimedesSway3 5.8s ease-in-out infinite;
          will-change: transform;
        }

        .rise-obj-4 {
          animation: archimedesRise4 36s linear infinite;
          animation-delay: -26s;
          will-change: transform, opacity;
        }
        .sway-obj-4 {
          animation: archimedesSway4 6.8s ease-in-out infinite;
          will-change: transform;
        }

        .rise-obj-5 {
          animation: archimedesRise5 32s linear infinite;
          animation-delay: -3s;
          will-change: transform, opacity;
        }
        .sway-obj-5 {
          animation: archimedesSway5 7.8s ease-in-out infinite;
          will-change: transform;
        }

        .rise-obj-6 {
          animation: archimedesRise6 38s linear infinite;
          animation-delay: -16s;
          will-change: transform, opacity;
        }
        .sway-obj-6 {
          animation: archimedesSway6 6.2s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* =====================================================================
          1. DÉCOR 3D : PERSPECTIVE CYBER-PROFONDEUR & HORIZON LUMINEUX
          ===================================================================== */}
      {/* Conteneur de perspective 3D au sol */}
      <div className="absolute inset-x-0 bottom-0 top-[35%] cyber-grid-perspective overflow-hidden pointer-events-none">
        <div className="w-[180%] -left-[40%] h-[160%] absolute bottom-0 cyber-grid-floor" />
      </div>

      {/* Ligne d'horizon numérique et halo d'énergie à l'infini */}
      <div className="absolute top-[52%] inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.7)] pointer-events-none" />
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[700px] h-[90px] rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />

      {/* Halos abyssaux lointains créant du relief chromatique */}
      <div className="absolute top-1/4 -left-1/6 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-1/6 w-[650px] h-[650px] rounded-full bg-indigo-600/20 blur-[140px] pointer-events-none" />

      {/* =====================================================================
          2. LE RÉSERVOIR LIQUIDE (LE CŒUR DU MOTEUR ÉNERGÉTIQUE EN BAS D'ÉCRAN)
          ===================================================================== */}
      <div className="absolute bottom-0 inset-x-0 h-[170px] sm:h-[220px] pointer-events-none overflow-hidden z-[5]">
        
        {/* Nappe lumineuse de base du bassin */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/80 via-sky-950/50 to-transparent" />

        {/* Vague Liquide 1 : Fluide Cyan Lumineux Ondulant */}
        <div className="absolute -bottom-6 -left-[10%] w-[120%] h-[140px] anim-wave-1">
          <svg 
            className="w-full h-full anim-liquid-pulse" 
            viewBox="0 0 1440 240" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path 
              d="M0,80 C260,140 480,20 720,70 C960,120 1200,40 1440,80 L1440,240 L0,240 Z" 
              fill="url(#liquidGrad1)" 
            />
            {/* Crête lumineuse de la vague */}
            <path 
              d="M0,80 C260,140 480,20 720,70 C960,120 1200,40 1440,80" 
              stroke="url(#crestGrad1)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="liquidGrad1" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#0369a1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#082f49" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="crestGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                <stop offset="35%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Vague Liquide 2 : Contre-Onde Translucide Cyan/Bleu Roi */}
        <div className="absolute -bottom-10 -left-[10%] w-[120%] h-[160px] anim-wave-2">
          <svg 
            className="w-full h-full opacity-65" 
            viewBox="0 0 1440 240" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path 
              d="M0,110 C320,50 600,130 880,90 C1140,50 1340,110 1440,100 L1440,240 L0,240 Z" 
              fill="url(#liquidGrad2)" 
            />
            <path 
              d="M0,110 C320,50 600,130 880,90 C1140,50 1340,110 1440,100" 
              stroke="#38bdf8" 
              strokeOpacity="0.6" 
              strokeWidth="2" 
            />
            <defs>
              <linearGradient id="liquidGrad2" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#1e3a8a" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Halo incandescent au fond du réservoir */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-cyan-500/25 via-blue-500/10 to-transparent blur-md" />

        {/* Bulles d'énergie bioluminescentes montant de la crête */}
        {[
          { left: '15%', size: 'w-2 h-2', delay: '0s', dur: '4.2s' },
          { left: '32%', size: 'w-1.5 h-1.5', delay: '1.2s', dur: '3.8s' },
          { left: '48%', size: 'w-2 h-2', delay: '2.4s', dur: '4.6s' },
          { left: '67%', size: 'w-1.5 h-1.5', delay: '0.8s', dur: '3.5s' },
          { left: '82%', size: 'w-2 h-2', delay: '2.1s', dur: '4.1s' },
        ].map((spark, idx) => (
          <div
            key={`spark-${idx}`}
            className={`absolute bottom-6 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.9)] ${spark.size}`}
            style={{
              left: spark.left,
              animation: `sparkBubbleAscend ${spark.dur} ease-out infinite`,
              animationDelay: spark.delay
            }}
          />
        ))}

      </div>

      {/* =====================================================================
          3. L'ASCENSION DES CARTES (COMMERCE) & DIPLÔMES (SAVOIR)
             POUSSÉE D'ARCHIMÈDE & TANGAGE
          ===================================================================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        
        {/* -----------------------------------------------------------------
            OBJET 1 : CARTE BLANCHE GLASSMORPHISM (COMMERCE / CARTE BANCAIRE)
            Flanc Gauche Extérieur
            ----------------------------------------------------------------- */}
        <div className="absolute left-[3%] sm:left-[6%] bottom-0 rise-obj-1">
          <div className="sway-obj-1">
            <div className="w-[185px] sm:w-[215px] p-3.5 rounded-2xl bg-white/[0.08] border border-white/20 backdrop-blur-md shadow-2xl shadow-cyan-950/40 relative overflow-hidden group">
              {/* Reflet de verre supérieur */}
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-cyan-400/15 blur-xl pointer-events-none" />
              
              {/* Header : Puce Dorée & Contactless */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  {/* Puce de carte de crédit */}
                  <div className="w-5 h-4 rounded-md bg-gradient-to-tr from-amber-300/80 to-amber-200/50 border border-amber-300/40 flex items-center justify-center">
                    <div className="w-2.5 h-2 border-t border-b border-amber-900/40" />
                  </div>
                  {/* Ondes sans contact */}
                  <div className="flex items-center gap-0.5 opacity-60">
                    <div className="w-1 h-2 rounded-full border-r border-white/60" />
                    <div className="w-1.5 h-3 rounded-full border-r border-white/60" />
                  </div>
                </div>
                {/* Badge marque */}
                <div className="px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-[9px] font-mono text-cyan-300 font-bold tracking-wider">
                  NANAPAY
                </div>
              </div>

              {/* Numéro de carte abstrait */}
              <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono tracking-widest mb-2.5 relative z-10">
                <span>••••</span>
                <span>••••</span>
                <span className="text-white/80 font-bold">8842</span>
              </div>

              {/* Footer : Porteur & Solde d'Encaissement */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 relative z-10 text-[9px] font-mono">
                <div className="text-white/60 uppercase tracking-wider">Business Pro</div>
                <div className="text-emerald-300 font-bold">+ 1 250 €</div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            OBJET 2 : DIPLÔME GLASSMORPHISM (SAVOIR / TOQUE D'ÉTUDIANT MORTARBOARD)
            Flanc Droit Extérieur
            ----------------------------------------------------------------- */}
        <div className="absolute right-[4%] sm:right-[7%] bottom-0 rise-obj-2">
          <div className="sway-obj-2">
            <div className="w-[180px] sm:w-[210px] p-3.5 rounded-2xl bg-white/[0.08] border border-cyan-300/30 backdrop-blur-md shadow-2xl shadow-blue-950/40 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-blue-500/20 blur-lg pointer-events-none" />
              
              {/* Illustration SVG : Toque d'étudiant (Mortarboard) */}
              <div className="flex items-center justify-center py-1 mb-2">
                <svg className="w-14 h-11" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Calotte sous la toque */}
                  <path d="M28,40 Q50,60 72,40 L72,48 Q50,68 28,48 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  {/* Carré de la toque (vue diamant 3D) */}
                  <polygon points="50,12 88,32 50,52 12,32" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="2" />
                  {/* Bouton central */}
                  <circle cx="50" cy="32" r="3" fill="#38bdf8" />
                  {/* Cordon et pompon doré */}
                  <path d="M50,32 Q78,36 82,56" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  <rect x="79" y="56" width="6" height="10" rx="1" fill="#fbbf24" />
                </svg>
              </div>

              {/* Titre Diplôme / Académie */}
              <div className="text-center space-y-1">
                <div className="text-[11px] font-bold text-white tracking-wide">Certification Master</div>
                <div className="text-[9px] text-cyan-300 font-mono">Nana Académie • 100%</div>
              </div>

              {/* Sceau doré de validation */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/50">
                <span>Diplômé 2026</span>
                <span className="text-amber-300 font-bold flex items-center gap-0.5">
                  ★ Validé
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            OBJET 3 : DIPLÔME ROULÉ AVEC RUBAN (SAVOIR / PARCHEMIN OFFICIEL)
            Centre-Gauche
            ----------------------------------------------------------------- */}
        <div className="absolute left-[16%] sm:left-[21%] bottom-0 rise-obj-3">
          <div className="sway-obj-3">
            <div className="w-[170px] sm:w-[195px] p-3 rounded-2xl bg-white/[0.07] border border-white/20 backdrop-blur-md shadow-2xl shadow-cyan-900/30 relative">
              {/* Illustration SVG : Diplôme Roulé avec Sceau et Ruban */}
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10 shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Rouleau de parchemin principal */}
                  <rect x="12" y="16" width="40" height="20" rx="4" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                  {/* Bouts roulés */}
                  <ellipse cx="12" cy="26" rx="4" ry="10" fill="rgba(56,189,248,0.25)" stroke="#38bdf8" strokeWidth="1.5" />
                  <ellipse cx="52" cy="26" rx="4" ry="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                  {/* Ruban noué rouge/cyan */}
                  <rect x="30" y="15" width="6" height="22" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                  {/* Sceau rond avec rubans descendants */}
                  <circle cx="33" cy="38" r="5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1" />
                  <path d="M30,42 L27,52 L33,48 L39,52 L36,42" fill="#d97706" />
                </svg>

                <div className="flex-1 space-y-1">
                  <div className="text-[10px] font-bold text-white leading-tight">Diplôme d'Expert</div>
                  <div className="w-14 h-1.5 rounded-full bg-cyan-400/40" />
                  <div className="w-10 h-1.5 rounded-full bg-white/20" />
                </div>
              </div>

              {/* Badge d'accréditation */}
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] font-mono text-cyan-200">
                <span>ID: #EDU-994</span>
                <span className="text-emerald-400">Accrédité</span>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            OBJET 4 : CARTE BLANCHE VITRINE COMMERCE (COMMERCE / COMMANDE E-COM)
            Centre-Droit
            ----------------------------------------------------------------- */}
        <div className="absolute right-[15%] sm:right-[20%] bottom-0 rise-obj-4">
          <div className="sway-obj-4">
            <div className="w-[185px] sm:w-[210px] p-3 rounded-2xl bg-white/[0.08] border border-white/20 backdrop-blur-md shadow-2xl shadow-blue-950/40 relative">
              {/* Header vitrine e-commerce */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="text-[9px] font-mono font-bold text-emerald-300">Vente Réalisée</span>
                </div>
                <span className="text-[9px] font-mono text-white/50">1-Clic</span>
              </div>

              {/* Ligne produit abstraite */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400/30 to-blue-600/40 border border-white/20 flex items-center justify-center text-[10px]">
                  🛍️
                </div>
                <div className="flex-1 space-y-1">
                  <div className="w-18 h-2 rounded bg-white/40" />
                  <div className="w-12 h-1.5 rounded bg-white/20" />
                </div>
                <div className="text-[11px] font-bold text-white font-mono">49,00 €</div>
              </div>

              {/* Barre de paiement instantané validé */}
              <div className="h-5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center gap-1.5 text-[9px] font-mono text-emerald-300 font-semibold">
                <span>✓ Paiement Reçu</span>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            OBJET 5 : CARTE BLANCHE PASS BUSINESS / TERMINAL (COMMERCE FOND)
            Fond Gauche
            ----------------------------------------------------------------- */}
        <div className="hidden lg:block absolute left-[37%] bottom-0 rise-obj-5">
          <div className="sway-obj-5">
            <div className="w-[165px] p-3 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-md shadow-2xl shadow-blue-950/40">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-2 rounded bg-white/30" />
                <div className="px-1.5 py-0.5 rounded bg-sky-400/20 text-[8px] font-mono text-sky-300">
                  PASS VIP
                </div>
              </div>
              <div className="space-y-1.5 mb-2">
                <div className="w-full h-1.5 rounded bg-white/20" />
                <div className="w-3/4 h-1.5 rounded bg-white/15" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[8px] font-mono text-white/50">
                <span>Accès Illimité</span>
                <span className="text-cyan-400">● Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            OBJET 6 : DIPLÔME SCEAU D'EXCELLENCE ACADÉMIQUE (SAVOIR FOND)
            Fond Droit
            ----------------------------------------------------------------- */}
        <div className="hidden md:block absolute right-[35%] bottom-0 rise-obj-6">
          <div className="sway-obj-6">
            <div className="w-[170px] p-3 rounded-2xl bg-white/[0.06] border border-cyan-400/20 backdrop-blur-md shadow-2xl shadow-blue-950/40">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400/30 to-amber-200/20 border border-amber-300/40 flex items-center justify-center text-[10px]">
                  🎓
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] font-bold text-white">Certificat IA</div>
                  <div className="w-14 h-1.5 rounded bg-cyan-300/30" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[8px] font-mono text-white/50 pt-1 border-t border-white/10">
                <span>Mention Très Bien</span>
                <span className="text-amber-300 font-bold">100%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default HeroAbstractFloatingBackground;
