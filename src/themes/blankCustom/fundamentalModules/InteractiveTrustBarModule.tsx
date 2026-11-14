import React, { useState } from 'react';
import { Truck, ShieldCheck, MessageCircle, RotateCcw, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { MoodStyleConfig } from '../moodStyles';
import { LiveEditable } from '../../../components/storeBuilder/LiveEditable';
import { playTapBeep } from '../../../utils/audio';

export interface InteractiveTrustBarModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  isAdminPreview?: boolean;
}

export const InteractiveTrustBarModule: React.FC<InteractiveTrustBarModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  isAdminPreview
}) => {
  const cfg = section.settings || section.config || {};
  const title = section.title || cfg.title || "Pourquoi Commander Chez Nous ?";
  const subtitle = section.subtitle || cfg.subtitle;

  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);

  const defaultCards = [
    {
      icon: 'truck',
      title: "Livraison Express 24-48h",
      desc: "Expédition soignée directement à votre porte",
      popup: "Nos livreurs vous contactent par téléphone avant leur arrivée pour convenir de l'heure exacte. Aucune mauvaise surprise !"
    },
    {
      icon: 'shield',
      title: "Paiement à la Livraison",
      desc: "Cash, Wave & Orange Money acceptés",
      popup: "Vous avez le droit légitime de vérifier le contenu de votre colis en présence du livreur avant de payer le moindre franc."
    },
    {
      icon: 'rotate',
      title: "Garantie 100% Satisfait",
      desc: "Échange facile sous 7 jours ouvrés",
      popup: "Si un article présente le moindre défaut ou non-conformité, notre service SAV vous le remplace immédiatement sans frais supplémentaires."
    },
    {
      icon: 'wameet',
      title: "Support Wameet 24/7",
      desc: "Une équipe dédiée toujours disponible",
      popup: "Pas de robots ! Discutez directement avec un conseiller humain basé à Abidjan pour un suivi personnalisé de votre commande."
    }
  ];

  const cards = cfg.cards || defaultCards;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'truck':
        return <Truck className="w-6 h-6 text-blue-600" />;
      case 'shield':
        return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      case 'rotate':
        return <RotateCcw className="w-6 h-6 text-amber-600" />;
      case 'wameet':
      case 'w':
      default:
        return <MessageCircle className="w-6 h-6 text-green-600" />;
    }
  };

  const toggleTooltip = (idx: number) => {
    playTapBeep();
    setActiveTooltipIndex(prev => prev === idx ? null : idx);
  };

  return (
    <section className={`relative py-12 sm:py-16 ${moodStyle.sectionAltBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-1">
            <LiveEditable
              label="Titre Barre de Confiance"
              sectionId={section.id}
              sectionField="title"
              value={title}
              isAdminPreview={isAdminPreview}
            >
              <h2 className={`text-xl sm:text-2xl font-black ${moodStyle.textPrimary}`}>
                {title}
              </h2>
            </LiveEditable>
            {subtitle && (
              <LiveEditable
                label="Sous-titre Barre de Confiance"
                sectionId={section.id}
                sectionField="subtitle"
                value={subtitle}
                isAdminPreview={isAdminPreview}
              >
                <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
                  {subtitle}
                </p>
              </LiveEditable>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {cards.map((card: any, idx: number) => {
            const isTooltipOpen = activeTooltipIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => toggleTooltip(idx)}
                onMouseEnter={() => setActiveTooltipIndex(idx)}
                onMouseLeave={() => setActiveTooltipIndex(null)}
                className={`relative p-6 rounded-3xl transition-all duration-300 border border-black/5 flex flex-col justify-between space-y-3 cursor-pointer group hover:shadow-xl hover:scale-[1.02] ${moodStyle.cardBg}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                      {renderIcon(card.icon)}
                    </div>
                    <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Détails</span>
                      <Info className="w-3 h-3" />
                    </span>
                  </div>

                  <h3 className={`text-sm sm:text-base font-black ${moodStyle.textPrimary}`}>
                    {card.title}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${moodStyle.textSecondary}`}>
                    {card.desc}
                  </p>
                </div>

                {/* Bulle d'Information Rassurante Dépliable / Tooltip */}
                {card.popup && (
                  <div className={`pt-2 border-t border-black/5 transition-all duration-200 ${
                    isTooltipOpen ? 'block opacity-100' : 'hidden sm:hidden opacity-0'
                  }`}>
                    <p className="text-[11px] leading-relaxed text-blue-600 dark:text-blue-400 font-medium bg-blue-50/60 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/50">
                      💡 {card.popup}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InteractiveTrustBarModule;
