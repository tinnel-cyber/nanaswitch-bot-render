import React, { useState, useCallback } from 'react';
import {
  LayoutTemplate,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
  Crown,
  CreditCard,
  FileText,
  Edit3,
  Database
} from 'lucide-react';
import {
  LandingPageConfig,
  LandingFeatureCard,
  LandingEliteSlide,
  LandingPricingPlan
} from '../../types';
import { formatCFA, playTapBeep } from '../../utils/audio';

interface LandingCmsTabProps {
  landingConfig: LandingPageConfig;
  onUpdateConfig: (updater: (prev: LandingPageConfig) => LandingPageConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onPreview: () => void;
  isSaving: boolean;
}

export const LandingCmsTab: React.FC<LandingCmsTabProps> = ({
  landingConfig,
  onUpdateConfig,
  onSave,
  onReset,
  onPreview,
  isSaving
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'FEATURES' | 'ELITE' | 'PRICING' | 'FOOTER'>('FEATURES');
  const [selectedFeatureCardIdx, setSelectedFeatureCardIdx] = useState<number>(0);
  const [selectedEliteSlideIdx, setSelectedEliteSlideIdx] = useState<number>(0);
  const [selectedPricingPlanIdx, setSelectedPricingPlanIdx] = useState<number>(0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barre Supérieure du CMS : Titre & Boutons d'Action Globaux */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>CMS Vitrine & Accueil Nanasore</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Personnalisation de la Page d'Accueil
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Modifiez en temps réel les cartes technologiques, les témoignages des clients Elite, les grilles de tarifs et le pied de page affichés aux visiteurs.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Rétablir les valeurs d'origine */}
          <button
            type="button"
            disabled={isSaving}
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50"
            title="Restaurer tous les contenus par défaut"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Rétablir par défaut</span>
          </button>

          {/* Voir la page d'accueil */}
          <button
            type="button"
            onClick={onPreview}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-100 text-xs font-bold transition flex items-center gap-1.5 border border-blue-500/30 cursor-pointer"
            title="Voir la vitrine publique d'accueil"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Aperçu Accueil</span>
          </button>

          {/* Enregistrer les modifications */}
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-900/40 transition flex items-center gap-2 cursor-pointer transform active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
          </button>
        </div>
      </div>

      {/* Navigation par Sous-onglets CMS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => { playTapBeep(); setActiveSubTab('FEATURES'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'FEATURES'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>1. Cartes Fonctionnalités ({landingConfig.featuresSection.cards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { playTapBeep(); setActiveSubTab('ELITE'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'ELITE'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-purple-300" />
          <span>2. Clients Elite & Stats ({landingConfig.eliteSection.slides.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { playTapBeep(); setActiveSubTab('PRICING'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'PRICING'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
          <span>3. Plans d'Abonnement ({landingConfig.pricingSection.plans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { playTapBeep(); setActiveSubTab('FOOTER'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'FOOTER'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-cyan-300" />
          <span>4. Pied de Page (Footer)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 1 : CARTES DE FONCTIONNALITÉS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'FEATURES' && (
        <div className="space-y-6">
          {/* En-tête global de la section Fonctionnalités */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Edit3 className="w-3.5 h-3.5" />
              <span>En-tête de la section « Arsenal Technologique »</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Surtitre / Badge :
                </label>
                <input
                  type="text"
                  value={landingConfig.featuresSection.badgeText}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      featuresSection: { ...prev.featuresSection, badgeText: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Texte du Bouton CTA :
                </label>
                <input
                  type="text"
                  value={landingConfig.featuresSection.ctaButtonText}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      featuresSection: { ...prev.featuresSection, ctaButtonText: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Grand Titre de la Section :
                </label>
                <input
                  type="text"
                  value={landingConfig.featuresSection.title}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      featuresSection: { ...prev.featuresSection, title: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Description / Sous-titre :
                </label>
                <textarea
                  rows={2}
                  value={landingConfig.featuresSection.description}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      featuresSection: { ...prev.featuresSection, description: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Sélecteur de carte à modifier */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Sélectionnez la carte à modifier ({selectedFeatureCardIdx + 1} / {landingConfig.featuresSection.cards.length}) :
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {landingConfig.featuresSection.cards.map((card, idx) => (
                <button
                  key={card.id || idx}
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedFeatureCardIdx(idx); }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFeatureCardIdx === idx
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-blue-400 block truncate">
                    Carte {idx + 1}
                  </span>
                  <span className="text-xs font-bold mt-1 line-clamp-1 text-white">
                    {card.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulaire de la carte sélectionnée */}
          {(() => {
            const currentCard = landingConfig.featuresSection.cards[selectedFeatureCardIdx] || landingConfig.featuresSection.cards[0];
            if (!currentCard) return null;

            const updateCurrentCard = (updates: Partial<LandingFeatureCard>) => {
              onUpdateConfig((prev) => {
                const updatedCards = [...prev.featuresSection.cards];
                updatedCards[selectedFeatureCardIdx] = {
                  ...updatedCards[selectedFeatureCardIdx],
                  ...updates,
                };
                return {
                  ...prev,
                  featuresSection: {
                    ...prev.featuresSection,
                    cards: updatedCards,
                  },
                };
              });
            };

            return (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase">
                      Carte {selectedFeatureCardIdx + 1}
                    </span>
                    <h3 className="text-base font-black text-white">{currentCard.title}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">ID: {currentCard.id}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Surtitre / Badge :
                    </label>
                    <input
                      type="text"
                      value={currentCard.badge}
                      onChange={(e) => updateCurrentCard({ badge: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Titre de la Carte :
                    </label>
                    <input
                      type="text"
                      value={currentCard.title}
                      onChange={(e) => updateCurrentCard({ title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Texte Explicatif / Copywriting Persuasif :
                    </label>
                    <textarea
                      rows={3}
                      value={currentCard.text}
                      onChange={(e) => updateCurrentCard({ text: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white leading-relaxed"
                    />
                  </div>

                  {/* Si carte d'intégrations (Carte 5) */}
                  {currentCard.isIntegrationsCard ? (
                    <div className="md:col-span-2 space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-xs font-black text-violet-400 uppercase tracking-wider block">
                        Connecteurs & Intégrations Directes ({currentCard.integrations?.length || 0}) :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentCard.integrations?.map((item, intIdx) => (
                          <div key={intIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 block">
                              Connecteur {intIdx + 1} :
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              placeholder="Nom (ex: WooCommerce)"
                              onChange={(e) => {
                                const updatedList = [...(currentCard.integrations || [])];
                                updatedList[intIdx] = { ...updatedList[intIdx], name: e.target.value };
                                updateCurrentCard({ integrations: updatedList });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                            />
                            <input
                              type="text"
                              value={item.desc}
                              placeholder="Description (ex: analyse et paiement)"
                              onChange={(e) => {
                                const updatedList = [...(currentCard.integrations || [])];
                                updatedList[intIdx] = { ...updatedList[intIdx], desc: e.target.value };
                                updateCurrentCard({ integrations: updatedList });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-300"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Badge IA Génératives :
                        </label>
                        <input
                          type="text"
                          value={currentCard.aiBadge || ''}
                          onChange={(e) => updateCurrentCard({ aiBadge: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Si carte standard (1 à 4) : Highlights */
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div>
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider block mb-2">
                          Puce Technique 1 :
                        </span>
                        <input
                          type="text"
                          placeholder="Label (ex: ⚡ Funnels 1-Clic)"
                          value={currentCard.highlights?.[0]?.label || ''}
                          onChange={(e) => {
                            const hl = [...(currentCard.highlights || [])];
                            hl[0] = { label: e.target.value, detail: hl[0]?.detail || '' };
                            updateCurrentCard({ highlights: hl });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mb-2"
                        />
                        <input
                          type="text"
                          placeholder="Détail (ex: Order Bump & Upsells)"
                          value={currentCard.highlights?.[0]?.detail || ''}
                          onChange={(e) => {
                            const hl = [...(currentCard.highlights || [])];
                            hl[0] = { label: hl[0]?.label || '', detail: e.target.value };
                            updateCurrentCard({ highlights: hl });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300"
                        />
                      </div>

                      <div>
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider block mb-2">
                          Puce Technique 2 :
                        </span>
                        <input
                          type="text"
                          placeholder="Label (ex: 📈 A/B Testing)"
                          value={currentCard.highlights?.[1]?.label || ''}
                          onChange={(e) => {
                            const hl = [...(currentCard.highlights || [])];
                            hl[1] = { label: e.target.value, detail: hl[1]?.detail || '' };
                            updateCurrentCard({ highlights: hl });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mb-2"
                        />
                        <input
                          type="text"
                          placeholder="Détail (ex: Optimisation du ROAS)"
                          value={currentCard.highlights?.[1]?.detail || ''}
                          onChange={(e) => {
                            const hl = [...(currentCard.highlights || [])];
                            hl[1] = { label: hl[1]?.label || '', detail: e.target.value };
                            updateCurrentCard({ highlights: hl });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bas de Carte / Statut */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Statut Bas de Carte :
                    </label>
                    <input
                      type="text"
                      value={currentCard.footerStatus}
                      onChange={(e) => updateCurrentCard({ footerStatus: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Badge Technique Bas de Carte :
                    </label>
                    <input
                      type="text"
                      value={currentCard.footerTag}
                      onChange={(e) => updateCurrentCard({ footerTag: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Sous-texte Bas de Carte :
                    </label>
                    <input
                      type="text"
                      value={currentCard.footerSub}
                      onChange={(e) => updateCurrentCard({ footerSub: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 2 : SLIDES CLIENTS ELITE                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'ELITE' && (
        <div className="space-y-6">
          {/* En-tête de la section Showcase Elite */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>En-tête de la vitrine « Showcase Elite »</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Surtitre / Badge :
                </label>
                <input
                  type="text"
                  value={landingConfig.eliteSection.badgeText}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      eliteSection: { ...prev.eliteSection, badgeText: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Grand Titre :
                </label>
                <input
                  type="text"
                  value={landingConfig.eliteSection.title}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      eliteSection: { ...prev.eliteSection, title: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Sous-titre / Accroche :
                </label>
                <input
                  type="text"
                  value={landingConfig.eliteSection.description}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      eliteSection: { ...prev.eliteSection, description: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Sélecteur de slide client */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Sélectionnez la slide client à modifier ({selectedEliteSlideIdx + 1} / {landingConfig.eliteSection.slides.length}) :
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {landingConfig.eliteSection.slides.map((slide, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedEliteSlideIdx(idx); }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedEliteSlideIdx === idx
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-purple-400 block truncate">
                    Client {idx + 1}
                  </span>
                  <span className="text-xs font-bold mt-1 line-clamp-1 text-white">
                    {slide.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulaire de la slide client sélectionnée */}
          {(() => {
            const currentSlide = landingConfig.eliteSection.slides[selectedEliteSlideIdx] || landingConfig.eliteSection.slides[0];
            if (!currentSlide) return null;

            const updateCurrentSlide = (updates: Partial<LandingEliteSlide>) => {
              onUpdateConfig((prev) => {
                const updatedSlides = [...prev.eliteSection.slides];
                updatedSlides[selectedEliteSlideIdx] = {
                  ...updatedSlides[selectedEliteSlideIdx],
                  ...updates,
                };
                return {
                  ...prev,
                  eliteSection: {
                    ...prev.eliteSection,
                    slides: updatedSlides,
                  },
                };
              });
            };

            return (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase">
                      Client Elite {selectedEliteSlideIdx + 1}
                    </span>
                    <h3 className="text-base font-black text-white">{currentSlide.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{currentSlide.metric}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Nom de l'Entreprise / Académie :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.name}
                      onChange={(e) => updateCurrentSlide({ name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Type d'Activité / Secteur :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.type}
                      onChange={(e) => updateCurrentSlide({ type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Ville & Pays :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.location}
                      onChange={(e) => updateCurrentSlide({ location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Badge (ex: Plan Elite) :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.badge}
                      onChange={(e) => updateCurrentSlide({ badge: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Métrique Phare (ex: 28M FCFA / mois) :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.metric}
                      onChange={(e) => updateCurrentSlide({ metric: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Détail / Preuve Sociale :
                    </label>
                    <input
                      type="text"
                      value={currentSlide.detail}
                      onChange={(e) => updateCurrentSlide({ detail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Édition des 4 Statistiques d'Impact */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <span className="text-xs font-black text-blue-400 uppercase tracking-wider block">
              Statistiques d'Impact Clés (4 métriques sous le carrousel) :
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {landingConfig.eliteSection.impactStats.map((stat, sIdx) => (
                <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    Statistique {sIdx + 1} :
                  </label>
                  <input
                    type="text"
                    placeholder="Valeur (ex: 🔒 SSL & Chiffré)"
                    value={stat.value}
                    onChange={(e) => {
                      const stats = [...landingConfig.eliteSection.impactStats];
                      stats[sIdx] = { ...stats[sIdx], value: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        eliteSection: { ...prev.eliteSection, impactStats: stats }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-black text-white"
                  />
                  <input
                    type="text"
                    placeholder="Libellé (ex: Paiements sécurisés)"
                    value={stat.label}
                    onChange={(e) => {
                      const stats = [...landingConfig.eliteSection.impactStats];
                      stats[sIdx] = { ...stats[sIdx], label: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        eliteSection: { ...prev.eliteSection, impactStats: stats }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Description hover (ex: Transactions chiffrées SSL)"
                    value={stat.description || ''}
                    onChange={(e) => {
                      const stats = [...landingConfig.eliteSection.impactStats];
                      stats[sIdx] = { ...stats[sIdx], description: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        eliteSection: { ...prev.eliteSection, impactStats: stats }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-500 italic"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 3 : PLANS D'ABONNEMENT                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'PRICING' && (
        <div className="space-y-6">
          {/* Bannière de statut & synchronisation directe vers Supabase */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <span>Publication Directe vers Supabase (PostgreSQL)</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Direct
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toute modification enregistrée ici est immédiatement persistée dans Supabase et synchronisée sur la Landing Page publique.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/40 shrink-0 disabled:opacity-50 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isSaving ? 'Publication en cours...' : 'Publier vers Supabase'}</span>
            </button>
          </div>

          {/* En-tête de section & Bannière 0% de commission */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>En-tête de la section Tarifs & Bannière 0% Commission</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Grand Titre de la Section :
                </label>
                <input
                  type="text"
                  value={landingConfig.pricingSection.title}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      pricingSection: { ...prev.pricingSection, title: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Sous-titre / Accroche :
                </label>
                <input
                  type="text"
                  value={landingConfig.pricingSection.subtitle}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      pricingSection: { ...prev.pricingSection, subtitle: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block mb-2">
                  Bannière 0% de Commission :
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Titre de la Bannière :
                </label>
                <input
                  type="text"
                  value={landingConfig.pricingSection.zeroCommissionBanner.title}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      pricingSection: {
                        ...prev.pricingSection,
                        zeroCommissionBanner: {
                          ...prev.pricingSection.zeroCommissionBanner,
                          title: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Badge Bannière (ex: Zéro Frais Cachés) :
                </label>
                <input
                  type="text"
                  value={landingConfig.pricingSection.zeroCommissionBanner.badge}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      pricingSection: {
                        ...prev.pricingSection,
                        zeroCommissionBanner: {
                          ...prev.pricingSection.zeroCommissionBanner,
                          badge: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Texte Explicatif de la Bannière :
                </label>
                <textarea
                  rows={2}
                  value={landingConfig.pricingSection.zeroCommissionBanner.description}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      pricingSection: {
                        ...prev.pricingSection,
                        zeroCommissionBanner: {
                          ...prev.pricingSection.zeroCommissionBanner,
                          description: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Sélecteur de plan (Starter, Pro, Elite) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Sélectionnez le plan d'abonnement à modifier :
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {landingConfig.pricingSection.plans.map((plan, pIdx) => (
                <button
                  key={plan.id || pIdx}
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedPricingPlanIdx(pIdx); }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedPricingPlanIdx === pIdx
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-blue-400 block">
                    Formule {pIdx + 1}
                  </span>
                  <span className="text-sm font-black mt-1 text-white">
                    {plan.name}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5">
                    {formatCFA(plan.monthlyPriceFCFA)} / mois
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulaire du plan sélectionné */}
          {(() => {
            const currentPlan = landingConfig.pricingSection.plans[selectedPricingPlanIdx] || landingConfig.pricingSection.plans[0];
            if (!currentPlan) return null;

            const updateCurrentPlan = (updates: Partial<LandingPricingPlan>) => {
              onUpdateConfig((prev) => {
                const updatedPlans = [...prev.pricingSection.plans];
                updatedPlans[selectedPricingPlanIdx] = {
                  ...updatedPlans[selectedPricingPlanIdx],
                  ...updates,
                };
                return {
                  ...prev,
                  pricingSection: {
                    ...prev.pricingSection,
                    plans: updatedPlans,
                  },
                };
              });
            };

            return (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                      Plan {currentPlan.id.toUpperCase()}
                    </span>
                    <h3 className="text-base font-black text-white">{currentPlan.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-400">{currentPlan.subtitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Nom du Plan (ex: Plan Pro) :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.name}
                      onChange={(e) => updateCurrentPlan({ name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Sous-titre (ex: Commerçant & Formateur Pro) :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.subtitle}
                      onChange={(e) => updateCurrentPlan({ subtitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Prix Mensuel (en FCFA) :
                    </label>
                    <input
                      type="number"
                      value={currentPlan.monthlyPriceFCFA}
                      onChange={(e) => updateCurrentPlan({ monthlyPriceFCFA: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Prix Annuel ramené au mois (en FCFA) :
                    </label>
                    <input
                      type="number"
                      value={currentPlan.annualPriceFCFA}
                      onChange={(e) => updateCurrentPlan({ annualPriceFCFA: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Équivalent en Euros / Accroche :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.euroEquivalent}
                      onChange={(e) => updateCurrentPlan({ euroEquivalent: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Texte du Bouton CTA :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.ctaText}
                      onChange={(e) => updateCurrentPlan({ ctaText: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Badge Mis en avant (optionnel) :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.badge || ''}
                      onChange={(e) => updateCurrentPlan({ badge: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Description du plan :
                    </label>
                    <input
                      type="text"
                      value={currentPlan.description}
                      onChange={(e) => updateCurrentPlan({ description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Liste des Fonctionnalités Incluses (1 ligne = 1 avantage avec coche) :
                    </label>
                    <textarea
                      rows={6}
                      value={currentPlan.features.join('\n')}
                      onChange={(e) => updateCurrentPlan({ features: e.target.value.split('\n').filter(f => f.trim().length > 0) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white leading-relaxed font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Chaque ligne sera affichée avec une coche verte sur la carte tarifaire.
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 4 : PIED DE PAGE (FOOTER)                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'FOOTER' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>Personnalisation du Pied de Page (Footer)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Slogan & Description de Marque (Colonne 1) :
              </label>
              <textarea
                rows={2}
                value={landingConfig.footerSection.brandDescription}
                onChange={(e) =>
                  onUpdateConfig((prev) => ({
                    ...prev,
                    footerSection: { ...prev.footerSection, brandDescription: e.target.value }
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Texte de Copyright :
              </label>
              <input
                type="text"
                value={landingConfig.footerSection.copyrightText}
                onChange={(e) =>
                  onUpdateConfig((prev) => ({
                    ...prev,
                    footerSection: { ...prev.footerSection, copyrightText: e.target.value }
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Mention de Version & Déclaration :
              </label>
              <input
                type="text"
                value={landingConfig.footerSection.versionText}
                onChange={(e) =>
                  onUpdateConfig((prev) => ({
                    ...prev,
                    footerSection: { ...prev.footerSection, versionText: e.target.value }
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            {/* Liens de la colonne Solutions */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider block">
                Liens Colonne Solutions :
              </span>
              {landingConfig.footerSection.solutionsLinks.map((link, lIdx) => (
                <div key={lIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const links = [...landingConfig.footerSection.solutionsLinks];
                      links[lIdx] = { ...links[lIdx], label: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        footerSection: { ...prev.footerSection, solutionsLinks: links }
                      }));
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => {
                      const links = [...landingConfig.footerSection.solutionsLinks];
                      links[lIdx] = { ...links[lIdx], href: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        footerSection: { ...prev.footerSection, solutionsLinks: links }
                      }));
                    }}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-400 font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Liens de la colonne Légale */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider block">
                Liens Colonne Conformité & Légal :
              </span>
              {landingConfig.footerSection.legalLinks.map((link, lIdx) => (
                <div key={lIdx}>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const links = [...landingConfig.footerSection.legalLinks];
                      links[lIdx] = { ...links[lIdx], label: e.target.value };
                      onUpdateConfig((prev) => ({
                        ...prev,
                        footerSection: { ...prev.footerSection, legalLinks: links }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingCmsTab;
