import React from 'react';
import { Award, ShieldCheck, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { MoodStyleConfig } from '../moodStyles';

export interface ParallaxBrandStoryModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  storeName?: string;
}

export const ParallaxBrandStoryModule: React.FC<ParallaxBrandStoryModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  storeName = "Notre Boutique"
}) => {
  const cfg = section.settings || section.config || {};
  const title = section.title || cfg.title || "Notre Histoire & Nos Engagements";
  const subtitle = section.subtitle || cfg.subtitle || "L'EXCELLENCE & L'AUTHENTICITÉ AVANT TOUT";
  const content = cfg.content || "Fondée avec la volonté d'offrir des produits authentiques et irréprochables en Afrique de l'Ouest, notre boutique sélectionne chaque référence avec un contrôle rigoureux pour garantir votre satisfaction complète à chaque commande.";
  const quote = cfg.quote || "« La confiance de nos clients ne se négocie pas : chaque colis livré doit être une expérience parfaite. »";
  const founderName = cfg.founderName || "Le Fondateur & L'Équipe Nanasore";
  const imageUrl = cfg.imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80";

  // 3 Chiffres clés configurables
  const stats = cfg.stats || [
    { value: "98%", label: "Clients Recommandent", desc: "Avis vérifiés après livraison" },
    { value: "24h / 48h", label: "Délai Express", desc: "Partout à Abidjan & intérieur" },
    { value: "100%", label: "Garantie Conforme", desc: "Contrôle physique avant paiement" }
  ];

  return (
    <section className={`relative py-16 sm:py-24 ${moodStyle.sectionBg} border-b border-black/5 overflow-hidden`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Colonne Gauche : Image Encadrée & Sceau de Garantie */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] sm:aspect-square border border-black/10 group">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

              {/* Sceau de Garantie Flottant */}
              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 shadow-2xl space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Certifié Vendeur d'Élite Nanasore
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Engagement sur l'authenticité et la traçabilité des produits.
                </p>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Titre Éditorial, Citation & 3 Chiffres Clés */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
                {subtitle}
              </span>
              <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight ${moodStyle.textPrimary}`}>
                {title}
              </h2>
            </div>

            <p className={`text-sm sm:text-base leading-relaxed ${moodStyle.textSecondary}`}>
              {content}
            </p>

            {/* Citation Stylisée */}
            <div className={`p-5 rounded-2xl border-l-4 border-blue-600 bg-blue-50/50 dark:bg-slate-900/50 space-y-2`}>
              <p className={`text-xs sm:text-sm font-semibold italic ${moodStyle.textPrimary}`}>
                {quote}
              </p>
              <span className="text-[11px] font-bold text-blue-600 block">
                — {founderName}
              </span>
            </div>

            {/* 3 Chiffres Clés Personnalisables */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              {stats.map((st: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border border-black/5 ${moodStyle.cardBg} space-y-1`}
                >
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 block">
                    {st.value}
                  </span>
                  <h4 className={`text-xs font-bold ${moodStyle.textPrimary}`}>
                    {st.label}
                  </h4>
                  <p className={`text-[10px] ${moodStyle.textMuted}`}>
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxBrandStoryModule;
