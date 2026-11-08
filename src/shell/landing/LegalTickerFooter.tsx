import React from 'react';
import { playTapBeep } from '../../utils/audio';
import { ShieldCheck, FileText } from 'lucide-react';

interface LegalTickerFooterProps {
  tickerText?: string;
  showTicker?: boolean;
  onOpenDoc: (doc: 'LEGAL_MENTIONS' | 'PRIVACY_POLICY') => void;
  className?: string;
}

export const LegalTickerFooter: React.FC<LegalTickerFooterProps> = ({
  tickerText = "© 2026 Nanasore. Tous droits réservés. • Mentions Légales • Politique de Confidentialité • Sécurité & protection des données marchandes.",
  showTicker = true,
  onOpenDoc,
  className = '',
}) => {
  // Découpe le texte pour rendre les termes "Mentions Légales" et "Politique de Confidentialité" cliquables
  const renderInteractiveText = (text: string) => {
    // Regex pour détecter "Mentions Légales" et "Politique de Confidentialité" (insensible à la casse)
    const regex = /(Mentions [Ll]égales|Politique de [Cc]onfidentialité)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      const lower = part.toLowerCase();
      if (lower.includes('mentions') && lower.includes('légales')) {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTapBeep();
              onOpenDoc('LEGAL_MENTIONS');
            }}
            className="inline-flex items-center gap-1 mx-1 text-blue-400 hover:text-blue-300 underline underline-offset-2 font-semibold cursor-pointer transition active:scale-95 pointer-events-auto"
            title="Consulter les Mentions Légales"
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span>{part}</span>
          </button>
        );
      }
      if (lower.includes('politique') && lower.includes('confidentialité')) {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTapBeep();
              onOpenDoc('PRIVACY_POLICY');
            }}
            className="inline-flex items-center gap-1 mx-1 text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-semibold cursor-pointer transition active:scale-95 pointer-events-auto"
            title="Consulter la Politique de Confidentialité"
          >
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>{part}</span>
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className={`w-full pointer-events-none select-none z-20 ${className}`}>
      <style>{`
        @keyframes tickerMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .legal-ticker-track {
          display: inline-flex;
          white-space: nowrap;
          animation: tickerMarquee 42s linear infinite;
          will-change: transform;
        }
        .legal-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 py-2.5 px-3 overflow-hidden flex items-center">
        {showTicker ? (
          // Mode Défilant (CSS Marquee lent & fluide, pause au survol)
          <div className="w-full overflow-hidden flex items-center">
            <div className="legal-ticker-track text-[11px] sm:text-xs text-[#94A3B8] font-medium tracking-wide">
              {/* Premier segment */}
              <div className="inline-flex items-center pr-12">
                {renderInteractiveText(tickerText)}
              </div>
              {/* Deuxième segment pour boucle infinie sans saut */}
              <div className="inline-flex items-center pr-12" aria-hidden="true">
                {renderInteractiveText(tickerText)}
              </div>
            </div>
          </div>
        ) : (
          // Mode Statique (Centré discret)
          <div className="w-full text-center text-[11px] sm:text-xs text-[#94A3B8] font-medium tracking-wide flex items-center justify-center flex-wrap gap-1">
            {renderInteractiveText(tickerText)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalTickerFooter;
