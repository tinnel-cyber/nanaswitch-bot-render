import React from 'react';
import { Heart, Sparkles, Award } from 'lucide-react';
import { CustomThemeSection } from '../../../types';
import { MoodStyleConfig } from '../moodStyles';

export interface RichStorySectionProps {
  section: CustomThemeSection;
  mood: MoodStyleConfig;
  buttonRadiusClass?: string;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  controlBar?: React.ReactNode;
}

export const RichStorySection: React.FC<RichStorySectionProps> = ({
  section,
  mood,
  controlBar
}) => {
  const cfg = section.config || {};
  const title = section.title || cfg.title || "Notre Histoire & Nos Engagements";
  const subtitle = section.subtitle || cfg.subtitle || "L'EXCELLENCE & L'AUTHENTICITÉ AVANT TOUT";
  const content = cfg.content || "Depuis nos débuts, notre engagement est simple : dénicher des produits de haute qualité et les rendre accessibles avec un service de livraison irréprochable et un suivi personnalisé pour chaque client.";
  const imageUrl = cfg.imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80";
  const imagePosition = cfg.imagePosition || 'right'; // 'left' | 'right'

  return (
    <section className={`relative py-14 sm:py-20 ${mood.sectionBg} border-b border-black/5`}>
      {controlBar}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Bloc Image */}
          <div className={`lg:col-span-5 ${imagePosition === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
            <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-4/3 sm:aspect-square">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20">
                <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>100% Qualité Certifiée & Contrôlée</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bloc Texte */}
          <div className={`lg:col-span-7 space-y-6 ${imagePosition === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${mood.accentBadge}`}>
              {subtitle}
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight leading-tight ${mood.textPrimary}`}>
              {title}
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${mood.textSecondary}`}>
              {content}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className={`p-4 rounded-2xl border border-black/5 ${mood.cardBg}`}>
                <span className="text-2xl font-black text-blue-600 block">+15 000</span>
                <span className={`text-xs font-medium ${mood.textMuted}`}>Clients comblés</span>
              </div>
              <div className={`p-4 rounded-2xl border border-black/5 ${mood.cardBg}`}>
                <span className="text-2xl font-black text-emerald-600 block">24h / 48h</span>
                <span className={`text-xs font-medium ${mood.textMuted}`}>Délai moyen de livraison</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
