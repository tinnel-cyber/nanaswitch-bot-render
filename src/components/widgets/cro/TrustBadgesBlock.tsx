import React from 'react';
import { ShieldCheck, Zap, Award, CheckCircle2, RotateCcw } from 'lucide-react';

interface TrustBadgesBlockProps {
  badges?: string[];
  brandColor?: string;
  className?: string;
}

export const TrustBadgesBlock: React.FC<TrustBadgesBlockProps> = ({
  badges = [
    'Paiement 100% Sécurisé Wave & Orange Money',
    'Livraison Express Bobo & Abidjan',
    'Garantie Authenticité Caisse NaNa'
  ],
  brandColor = '#10b981',
  className = ''
}) => {
  const icons = [
    <ShieldCheck key="shield" style={{ color: brandColor }} className="w-4 h-4 shrink-0" />,
    <Zap key="zap" className="w-4 h-4 text-amber-400 shrink-0" />,
    <Award key="award" className="w-4 h-4 text-indigo-400 shrink-0" />
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 ${className}`}>
      {badges.map((badge, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-semibold text-slate-300"
        >
          {icons[idx % icons.length]}
          <span className="leading-snug">{badge}</span>
        </div>
      ))}
    </div>
  );
};
