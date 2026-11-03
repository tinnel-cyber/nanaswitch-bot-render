import React, { useState, useCallback } from 'react';
import { 
  X, Sparkles, Rocket, Clock, DollarSign, Tag, 
  CheckCircle2, Flame, Gift, ArrowRight, ShieldCheck, 
  HelpCircle, ChevronRight, AlertCircle, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketplaceCourse } from '../marketplace/types';
import { PromoCampaign, CampaignBonusItem, CampaignCtaType } from '../../../../../types/campaign';
import { 
  AVAILABLE_BONUS_ITEMS, 
  HIGH_CONVERTING_HOOKS, 
  saveCampaign 
} from '../../../../../services/campaignService';
import { SocialBlastHub } from './SocialBlastHub';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

interface CampaignConfiguratorModalProps {
  course: MarketplaceCourse;
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated?: (campaign: PromoCampaign) => void;
  onNavigateToFunnel?: (campaignId: string) => void;
}

export const CampaignConfiguratorModal: React.FC<CampaignConfiguratorModalProps> = ({
  course,
  isOpen,
  onClose,
  onCampaignCreated,
  onNavigateToFunnel
}) => {
  const [step, setStep] = useState<'FORM' | 'GENERATING' | 'SUCCESS'>('FORM');
  const [campaignName, setCampaignName] = useState(`Vente Flash 48H • ${course.title.split(':')[0] || 'Masterclass'}`);
  const [headline, setHeadline] = useState(HIGH_CONVERTING_HOOKS[0].hook);
  const [discountPrice, setDiscountPrice] = useState(
    Math.round((course.discountPrice || course.price) * 0.6 / 1000) * 1000 || 25000
  );
  const [durationHours, setDurationHours] = useState<number>(48);
  const [ctaType, setCtaType] = useState<CampaignCtaType>('HYBRID');
  const [selectedBonusIds, setSelectedBonusIds] = useState<string[]>([
    'bonus-ussd-scripts',
    'bonus-vip-whatsapp'
  ]);
  const [generatedCampaign, setGeneratedCampaign] = useState<PromoCampaign | null>(null);

  if (!isOpen) return null;

  const originalPrice = course.originalPrice || course.price || 75000;
  const discountPercent = Math.max(5, Math.round(((originalPrice - discountPrice) / originalPrice) * 100));

  // Toggle bonus
  const toggleBonus = (bonusId: string) => {
    playTapBeep();
    setSelectedBonusIds(prev => 
      prev.includes(bonusId) 
        ? prev.filter(id => id !== bonusId) 
        : [...prev, bonusId]
    );
  };

  // Calcul valeur totale des bonus sélectionnés
  const totalBonusValue = AVAILABLE_BONUS_ITEMS
    .filter(b => selectedBonusIds.includes(b.id))
    .reduce((acc, curr) => acc + curr.valueCFA, 0);

  // Soumission et génération du Funnel
  const handleGenerateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    setStep('GENERATING');

    const slug = campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 24);

    const newCampaignId = `camp_${Date.now().toString(36)}_${slug || 'promo'}`;
    const deadlineTimestamp = Date.now() + durationHours * 3600 * 1000;

    const selectedBonuses = AVAILABLE_BONUS_ITEMS.filter(b => selectedBonusIds.includes(b.id));

    const newCampaign: PromoCampaign = {
      id: newCampaignId,
      courseId: course.id,
      courseTitle: course.title,
      courseCoverImage: course.coverImage,
      courseTrailerVideoUrl: course.trailerVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      category: course.category,
      campaignName,
      headline,
      subheadline: course.tagline,
      originalPrice,
      discountPrice,
      currency: 'FCFA',
      deadlineTimestamp,
      ctaType,
      ctaLabel: ctaType === 'WHATSAPP' 
        ? 'Contacter Ibrahim P. Konkobo sur WhatsApp' 
        : `S'inscrire Maintenant (${discountPrice.toLocaleString('fr-FR')} FCFA)`,
      bonusItems: selectedBonuses,
      instructor: {
        name: course.instructor?.name || 'Ibrahim Pousbila Konkobo',
        title: course.instructor?.title || 'Fondateur & Expert Télécom / Mobile Money UEMOA',
        avatarUrl: course.instructor?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        phoneWhatsApp: '+22670000000'
      },
      urgencyScarcity: {
        totalSeats: 30,
        remainingSeats: 7
      },
      stats: {
        viewsCount: 0,
        clicksCount: 0,
        conversionsCount: 0,
        totalRevenueCFA: 0
      },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Simulation de génération visuelle cyber
    setTimeout(async () => {
      const saved = await saveCampaign(newCampaign);
      setGeneratedCampaign(saved);
      setStep('SUCCESS');
      if (onCampaignCreated) onCampaignCreated(saved);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl overflow-hidden">
      <div className="relative w-full max-w-4xl bg-[#070b14] border border-slate-800 rounded-3xl shadow-2xl shadow-purple-950/30 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal - Fixed */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-md">
              <Rocket className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  VIRAL PROMO ENGINE
                </span>
                <span className="text-xs text-slate-400">Tunnel de Vente Autonome</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Générateur de Funnel Neuro-Marketing & Vente Flash
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps du Modal selon l'étape - Fluid Internal Scrolling */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain scrollbar-hide space-y-6 flex-1 text-slate-100 touch-pan-y">
          {/* Étape 1 : Formulaire de configuration */}
          {step === 'FORM' && (
            <form id="campaign-config-form" onSubmit={handleGenerateFunnel} className="space-y-6">
              {/* Carte Récapitulative du Cours Sélectionné */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-4">
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block truncate">
                    {course.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">
                    {course.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Prix catalogue : <strong className="text-white">{originalPrice.toLocaleString('fr-FR')} FCFA</strong></span>
                    <span>•</span>
                    <span>{course.durationLabel || 'Masterclass certifiante'}</span>
                  </div>
                </div>
              </div>

              {/* Champ 1 : Nom de la Campagne */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Nom de la Campagne (Identifiant interne)
                </label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Vente Flash 48H Spéciale Ramadan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none min-h-[42px]"
                />
              </div>

              {/* Champ 2 : Accroche Neuro-Marketing (Headline) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Accroche Promotionnelle Haute-Conversion (Titre du Funnel)
                  </label>
                  <span className="text-[10px] text-purple-300 font-bold">Suggestions IA</span>
                </div>

                {/* Pilules de templates d'accroches avec défilement tactile horizontal fluide sur mobile */}
                <div className="flex sm:grid sm:grid-cols-2 gap-2 overflow-x-auto sm:overflow-visible scrollbar-hide overscroll-contain snap-x snap-mandatory pb-1">
                  {HIGH_CONVERTING_HOOKS.map((h, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { playTapBeep(); setHeadline(h.hook); }}
                      className={`p-2.5 rounded-xl border text-left text-[11px] leading-snug transition cursor-pointer flex-shrink-0 w-[260px] sm:w-auto snap-start ${
                        headline === h.hook
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-sm'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[9.5px] font-black uppercase text-amber-400 block mb-0.5">
                        {h.category}
                      </span>
                      {h.hook}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Personnalisez votre accroche..."
                />
              </div>

              {/* Grille 2 Colonnes : Prix Promo & Compte à Rebours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prix Promo & Économie */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Tarif Promotionnel (FCFA)
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                      -{discountPercent}% ÉCONOMIE
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1000}
                      step={1000}
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-emerald-400 focus:border-emerald-500 focus:outline-none min-h-[42px]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      FCFA
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Prix d'origine : ~{originalPrice.toLocaleString('fr-FR')} F~</span>
                    <span className="text-emerald-400 font-bold">
                      Gain : {(originalPrice - discountPrice).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {/* Délai d'Urgence (Compte à Rebours) */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Délai d'Urgence du Compte à Rebours
                  </label>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[12, 24, 48, 72].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => { playTapBeep(); setDurationHours(hours); }}
                        className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                          durationHours === hours
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>

                  <p className="text-[10.5px] text-slate-400">
                    Le décompte sera affiché en continu avec millisecondes pour déclencher le réflexe FOMO de décision immédiate.
                  </p>
                </div>
              </div>

              {/* Champ 4 : Stratégie de Call-to-Action */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">
                  Stratégie de Conversion (Bouton Principal)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setCtaType('HYBRID'); }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      ctaType === 'HYBRID'
                        ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black text-purple-300 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Hybride (Recommandé)
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Mobile Money 1-clic direct + bouton secondaire WhatsApp VIP
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setCtaType('MOBILE_MONEY'); }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      ctaType === 'MOBILE_MONEY'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-400 mb-1">
                      Mobile Money Pur
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Wave, Orange Money, Moov, MTN avec prompt Push USSD immédiat
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setCtaType('WHATSAPP'); }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      ctaType === 'WHATSAPP'
                        ? 'bg-green-500/20 border-green-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black text-green-400 mb-1">
                      WhatsApp Direct
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Ouvre directement la conversation WhatsApp avec le message de commande
                    </p>
                  </button>
                </div>
              </div>

              {/* Champ 5 : Échelle de Valeur & Bonus Empilés (The Bonus Stack) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">
                      Bonus Exclusifs Offerts (The Bonus Stack)
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-400">
                    Valeur cumulée offerte : {totalBonusValue.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="flex sm:grid sm:grid-cols-2 gap-2.5 overflow-x-auto sm:overflow-visible scrollbar-hide overscroll-contain snap-x snap-mandatory pb-1">
                  {AVAILABLE_BONUS_ITEMS.map((b) => {
                    const isSelected = selectedBonusIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBonus(b.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start justify-between gap-2 flex-shrink-0 w-[260px] sm:w-auto snap-start ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-white">{b.title}</p>
                          <p className="text-[10.5px] text-slate-400 line-clamp-2">{b.description}</p>
                          <span className="text-[10px] font-bold text-amber-400 inline-block pt-1">
                            Valeur : {b.valueCFA.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bouton de Soumission Principal - Sticky Footer */}
              <div className="sticky bottom-0 -mx-5 -mb-6 sm:-mx-6 p-4 border-t border-slate-800 bg-[#070b14]/95 backdrop-blur-md flex items-center justify-end gap-3 z-10 shadow-lg">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:via-purple-500 hover:to-indigo-500 text-white text-xs font-black transition flex items-center gap-2 shadow-xl shadow-purple-950/60 cursor-pointer min-h-[44px]"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Générer le Funnel Cyber-Premium (1-Clic)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Étape 2 : Animation de Génération Cyber */}
          {step === 'GENERATING' && (
            <div className="p-12 text-center space-y-4 my-auto">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-400 animate-spin" style={{ animationDirection: 'reverse' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-white">
                  Assemblage Cyber-Premium du Funnel...
                </h4>
                <p className="text-xs text-slate-400">
                  Injection des balises Open Graph, isolation totale de navigation et calcul du tracking pixel.
                </p>
              </div>
            </div>
          )}

          {/* Étape 3 : Hub de Diffusion Virale (Success) */}
          {step === 'SUCCESS' && generatedCampaign && (
            <SocialBlastHub
              campaign={generatedCampaign}
              onNavigateToFunnel={(id) => {
                if (onNavigateToFunnel) {
                  onNavigateToFunnel(id);
                  onClose();
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignConfiguratorModal;
