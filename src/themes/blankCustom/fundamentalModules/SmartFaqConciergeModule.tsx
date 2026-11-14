import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Phone, Sparkles, HelpCircle } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { MoodStyleConfig } from '../moodStyles';
import { LiveEditable } from '../../../components/storeBuilder/LiveEditable';
import { playTapBeep } from '../../../utils/audio';

export interface SmartFaqConciergeModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  wPhone?: string;
  whatsappPhone?: string;
  storeName?: string;
  isAdminPreview?: boolean;
}

export const SmartFaqConciergeModule: React.FC<SmartFaqConciergeModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  wPhone = "",
  whatsappPhone = "",
  storeName = "Notre Boutique",
  isAdminPreview
}) => {
  const cfg = section.settings || section.config || {};
  const title = section.title || cfg.title || "Questions Fréquentes";
  const subtitle = section.subtitle || cfg.subtitle || "Tout ce que vous devez savoir avant de passer commande";

  const effectivePhone = wPhone || whatsappPhone;

  const defaultItems = [
    {
      q: "Comment se déroule la livraison ?",
      a: "Dès validation de votre panier, notre équipe prépare votre colis. Notre livreur partenaire vous appelle personnellement pour caler un créneau de livraison adapté directement à votre domicile ou bureau."
    },
    {
      q: "Quels sont les modes de paiement acceptés à la livraison ?",
      a: "Vous pouvez payer en espèces (Cash) ou par Mobile Money (Orange Money, Wave, MTN MoMo, Moov) directement auprès du livreur à la réception de votre colis."
    },
    {
      q: "Puis-je vérifier le produit avant de régler la commande ?",
      a: "Oui, à 100% ! Nous exigeons de nos livreurs qu'ils vous laissent contrôler l'état et la conformité du produit avant tout encaissement."
    },
    {
      q: "Que se passe-t-il si un article ne me convient pas ?",
      a: "Notre service après-vente vous assiste 7j/7 sur Wameet Direct. Nous effectuons l'échange ou le remplacement immédiat sans aucune friction."
    }
  ];

  const items = cfg.items || defaultItems;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    playTapBeep();
    setOpenIndex(prev => prev === idx ? null : idx);
  };

  const wClean = effectivePhone.replace(/[^0-9]/g, '');
  const wUrl = `https://wa.me/${wClean || '22507000000'}?text=${encodeURIComponent("Bonjour ! J'ai une question sur un produit avant de passer commande.")}`;

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            AIDE & SERVICE CLIENT
          </span>
          <LiveEditable
            label="Titre FAQ"
            sectionId={section.id}
            sectionField="title"
            value={title}
            isAdminPreview={isAdminPreview}
          >
            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
              {title}
            </h2>
          </LiveEditable>
          <LiveEditable
            label="Sous-titre FAQ"
            sectionId={section.id}
            sectionField="subtitle"
            value={subtitle}
            isAdminPreview={isAdminPreview}
          >
            <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
              {subtitle}
            </p>
          </LiveEditable>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonne Gauche : Liste de Questions / Réponses Pliables (7 cols sur 12) */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item: any, idx: number) => {
              const isOpen = openIndex === idx;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl transition border border-black/5 overflow-hidden ${moodStyle.cardBg}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full px-5 py-4 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className={`text-xs sm:text-sm font-bold ${moodStyle.textPrimary}`}>
                      {item.q}
                    </span>
                    <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed border-t border-black/5 animate-in fade-in duration-200">
                      <p className={moodStyle.textSecondary}>
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Colonne Droite : Carte Concierge Wameet Direct (5 cols sur 12) */}
          <div className="lg:col-span-4">
            <div className={`p-6 sm:p-7 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 shadow-xl space-y-5 text-left`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                  CONCIERGE DÉDIÉ
                </span>
                <h3 className={`text-lg font-black ${moodStyle.textPrimary}`}>
                  Une question précise ?
                </h3>
                <p className={`text-xs leading-relaxed ${moodStyle.textSecondary}`}>
                  Notre équipe vous répond directement sur Wameet Direct en moins de 5 minutes pour vous guider.
                </p>
              </div>

              <a
                href={wUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer active:scale-95`}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Discuter en direct sur Wameet Direct</span>
              </a>

              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Conseiller en ligne
                </span>
                <span>Réponse rapide 7j/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartFaqConciergeModule;
