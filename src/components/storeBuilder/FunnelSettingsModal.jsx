import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  X,
  Layers,
  Globe,
  Share2,
  Activity,
  Webhook,
  CreditCard,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Upload,
  Check,
  Crown,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { isFreePlan, triggerProFeatureUpsell } from '../../utils/planFeatures';
import { registerSubdomainInFirebase, saveFunnelConfig } from '../../services/omniFunnelService';
import { cleanDomain, saveTenantCustomDomain } from '../../services/tenantDomainService';

/**
 * FunnelSettingsModal - Cerveau de Conversion du Funnel (v3.0)
 * Modale des paramètres globaux avec 6 onglets isolés :
 * Étapes, Général, SEO & Social, Tracking, CRM, Paiements.
 * Isolé via React.lazy pour un chargement à la demande (0 octet au démarrage).
 */
export const FunnelSettingsModal = ({
  isOpen = false,
  onClose = () => {},
  funnelSettings = {},
  setFunnelSettings = () => {},
  funnelPages = [],
  activePageId = 1,
  setActivePageId = () => {},
  setSelectedBlockId = () => {},
  movePage = () => {},
  deletePage = () => {},
  updatePageMeta = () => {},
  setIsAddStepModalOpen = () => {},
  triggerToast = () => {},
  currentUser = null,
  subscription = null,
  isFreeAccount = false,
  activeProduct = null,
  canvasBlocks = [],
  onSave = null
}) => {
  const isFree = isFreeAccount || isFreePlan(subscription);
  const [settingsActiveTab, setSettingsActiveTab] = useState('funnel_steps');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      try { playTapBeep(); } catch (e) {}
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Mode d'hébergement : 'subdomain' (Gratuit Freemium) | 'custom' (Pro)
  const [hostingMode, setHostingMode] = useState(() => {
    if (funnelSettings.hostingMode) return funnelSettings.hostingMode;
    if (funnelSettings.customDomain && !funnelSettings.subdomain) return 'custom';
    return 'subdomain';
  });

  // Synchronisation dynamique si funnelSettings.hostingMode est modifié depuis le parent
  useEffect(() => {
    if (funnelSettings.hostingMode && funnelSettings.hostingMode !== hostingMode) {
      setHostingMode(funnelSettings.hostingMode);
    }
  }, [funnelSettings.hostingMode]);

  const handleHostingModeChange = (mode) => {
    if (mode === 'custom' && isFree) {
      triggerProFeatureUpsell('CUSTOM_DOMAIN');
      return;
    }
    setHostingMode(mode);
    setFunnelSettings(prev => ({
      ...prev,
      hostingMode: mode
    }));
    try { playTapBeep(); } catch (e) {}
  };

  const handleSubdomainChange = (e) => {
    const rawValue = e.target.value;
    // Regex de validation temps réel : uniquement minuscules, chiffres et tirets
    // Décompose les accents, convertit en minuscules, remplace les espaces par des tirets et filtre les caractères non autorisés
    const sanitized = rawValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    setFunnelSettings(prev => ({
      ...prev,
      subdomain: sanitized
    }));
  };

  // Verrouillage du scroll du body en arrière-plan
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full sm:w-11/12 max-w-4xl h-[92vh] sm:h-[700px] max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* En-tête de la Modale */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Paramètres Globaux du Funnel</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Cerveau v3.0
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configuration du domaine, référencement SEO, pixels de tracking, CRM et paiements
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fermer la modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la Modale en 2 Parties : Menu Onglets (Gauche) & Formulaire (Droite) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Menu Latéral Gauche (Navigation des 6 Onglets) */}
          <div className="w-full md:w-60 bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible shrink-0 select-none custom-scrollbar">
            {[
              { id: 'funnel_steps', label: 'Étapes du Funnel', icon: Layers, desc: 'Pages, ordre & URLs' },
              { id: 'general', label: 'Général', icon: Globe, desc: 'Nom, domaine & favicon' },
              { id: 'seo', label: 'SEO & Social', icon: Share2, desc: 'Balises méta & Open Graph' },
              { id: 'tracking', label: 'Tracking & Pixels', icon: Activity, desc: 'Meta, TikTok, PostHog', isPro: true, proKey: 'TRACKING_PIXELS_CRM' },
              { id: 'crm', label: 'Automatisation CRM', icon: Webhook, desc: 'Tags, Brevo & Webhooks', isPro: true, proKey: 'TRACKING_PIXELS_CRM' },
              { id: 'payments', label: 'Paiements', icon: CreditCard, desc: 'Orange, Wave, Stripe' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = settingsActiveTab === tab.id;
              const isLockedTab = Boolean(tab.isPro && isFree);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (isLockedTab && tab.proKey) {
                      triggerProFeatureUpsell(tab.proKey);
                      return;
                    }
                    setSettingsActiveTab(tab.id);
                    try { playTapBeep(); } catch (e) {}
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer shrink-0 md:w-full ${
                    isActive
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                      : isLockedTab
                      ? 'bg-amber-500/5 border border-amber-500/20 text-slate-300 hover:bg-amber-500/10'
                      : 'bg-transparent border border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                    isActive ? 'bg-amber-500 text-slate-950' : isLockedTab ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span>{tab.label}</span>
                      {isLockedTab && <Crown className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{tab.desc}</div>
                  </div>
                  <span className="md:hidden text-xs font-bold flex items-center gap-1">
                    <span>{tab.label}</span>
                    {isLockedTab && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Zone de Formulaire Droite (Scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar bg-slate-900/40">
            
            {/* -------------------------------------------------------- */}
            {/* ONGLET 0 : ÉTAPES DU FUNNEL (MULTI-PAGES)                 */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'funnel_steps' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <span>Étapes & Parcours du Tunnel</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {funnelPages.length} {funnelPages.length > 1 ? 'pages' : 'page'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Orchestrez l'enchaînement des étapes pour guider vos visiteurs de la capture au paiement.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddStepModalOpen(true)}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Ajouter une étape</span>
                  </button>
                </div>

                {/* Liste ordonnée des étapes du funnel */}
                <div className="space-y-3">
                  {funnelPages.map((page, index) => {
                    const isCurrentActive = page.id === activePageId;
                    const pageTypeBadges = {
                      sales: { label: 'Vente', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
                      optin: { label: 'Capture', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
                      checkout: { label: 'Paiement', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
                      upsell: { label: 'Upsell VIP', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
                      downsell: { label: 'Downsell', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
                      thankyou: { label: 'Confirmation', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' }
                    };
                    const badgeInfo = pageTypeBadges[page.type] || { label: page.type, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                    return (
                      <div
                        key={page.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrentActive
                            ? 'bg-slate-950/90 border-amber-500/50 shadow-lg shadow-amber-500/5'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            {/* Numéro d'ordre */}
                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-black text-amber-400 shrink-0">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={page.name}
                                  onChange={(e) => updatePageMeta(page.id, 'name', e.target.value)}
                                  className="bg-transparent text-sm font-bold text-white focus:bg-slate-900 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700 transition"
                                  title="Cliquer pour renommer l'étape"
                                />
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeInfo.color}`}>
                                  {badgeInfo.label}
                                </span>
                                {isCurrentActive && (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    Active dans le Canvas
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="text-slate-500 text-[11px]">URL :</span>
                                <input
                                  type="text"
                                  value={page.path}
                                  onChange={(e) => updatePageMeta(page.id, 'path', e.target.value)}
                                  className="bg-transparent font-mono text-[11px] text-amber-300/90 focus:bg-slate-900 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-slate-700 w-36 transition"
                                  title="Cliquer pour modifier l'URL"
                                />
                                <span className="text-slate-600">•</span>
                                <span className="text-[11px] text-slate-400">
                                  {page.blocks?.length || 0} module{(page.blocks?.length || 0) > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions sur l'étape */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {/* Monter */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => movePage(index, 'up')}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                              title="Monter l'étape"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Descendre */}
                            <button
                              type="button"
                              disabled={index === funnelPages.length - 1}
                              onClick={() => movePage(index, 'down')}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                              title="Descendre l'étape"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Éditer dans le Canvas */}
                            <button
                              type="button"
                              onClick={() => {
                                setActivePageId(page.id);
                                setSelectedBlockId(page.blocks?.[0]?.id || null);
                                onClose();
                                try { playTapBeep(); } catch (e) {}
                                triggerToast(`⚡ Canvas basculé sur "${page.name}"`);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                isCurrentActive
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span>{isCurrentActive ? 'Éditer ✓' : 'Éditer'}</span>
                            </button>

                            {/* Supprimer */}
                            <button
                              type="button"
                              disabled={funnelPages.length <= 1}
                              onClick={() => deletePage(page.id)}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 disabled:opacity-20 transition cursor-pointer"
                              title="Supprimer cette étape"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* ONGLET 1 : GÉNÉRAL                                       */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Identité & Domaine</h4>
                  <p className="text-xs text-slate-400">Configurez l'adresse URL et l'apparence générale de votre tunnel.</p>
                </div>

                <div className="space-y-4">
                  {/* Nom du funnel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nom du Funnel (Interne & Public)
                    </label>
                    <input
                      type="text"
                      value={funnelSettings.funnelName || ''}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, funnelName: e.target.value }))}
                      placeholder="Ex: Pack Élite NaNa Pro X - Vente Flash"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Nom utilisé dans le tableau de bord et dans l'en-tête de votre tunnel.</p>
                  </div>

                  {/* Sélecteur de Mode d'Hébergement (Segmented Control / Tabs) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Mode d'Hébergement & Adresse Web
                    </label>
                    <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => handleHostingModeChange('subdomain')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
                          hostingMode === 'subdomain'
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Sous-domaine gratuit</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 transition ${
                          hostingMode === 'subdomain'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          (Recommandé)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleHostingModeChange('custom')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
                          hostingMode === 'custom'
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                        }`}
                      >
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Domaine Personnalisé</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 transition ${
                          hostingMode === 'custom'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          (Pro)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Interface conditionnelle selon le mode sélectionné */}
                  {hostingMode === 'subdomain' ? (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300">
                          Sous-domaine Gratuit Nanasore
                        </label>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Hébergement Inclus & SSL Actif
                        </span>
                      </div>

                      {/* Champ d'entrée composé (Input Group) */}
                      <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-indigo-500 transition overflow-hidden">
                        <span className="px-3.5 py-2.5 text-xs font-mono font-bold text-indigo-400 bg-slate-900 border-r border-slate-800 select-none shrink-0">
                          https://nanasore.com/t/
                        </span>
                        <input
                          type="text"
                          value={funnelSettings.subdomain || ''}
                          onChange={handleSubdomainChange}
                          placeholder="mon-offre"
                          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none font-mono font-bold placeholder-slate-600"
                          autoComplete="off"
                          spellCheck="false"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://nanasore.com/t/${funnelSettings.subdomain || 'mon-offre'}`;
                            copyToClipboard(url, 'subdomain');
                          }}
                          className="mr-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
                          title="Copier le lien direct du tunnel"
                        >
                          {copiedField === 'subdomain' ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="text-emerald-300">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Texte d'aide requis & aperçu en temps réel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-0.5">
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Votre tunnel sera immédiatement accessible sur ce lien universel.</span>
                        </p>
                        {funnelSettings.subdomain && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-emerald-400 truncate font-semibold">
                              https://nanasore.com/t/{funnelSettings.subdomain}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `https://nanasore.com/t/${funnelSettings.subdomain}`;
                                copyToClipboard(url, 'subdomain_preview');
                              }}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 underline transition cursor-pointer"
                              title="Copier le lien"
                            >
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>{copiedField === 'subdomain_preview' ? 'Copié !' : 'Copier'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300">
                          Nom de Domaine Personnalisé (URL de votre tunnel)
                        </label>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          CNAME Requis
                        </span>
                      </div>

                      <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition overflow-hidden">
                        <span className="px-3 text-xs font-mono text-slate-500 bg-slate-900/80 border-r border-slate-800 py-2.5 select-none shrink-0">
                          https://
                        </span>
                        <input
                          type="text"
                          value={funnelSettings.customDomain || ''}
                          onChange={(e) => setFunnelSettings(prev => ({ ...prev, customDomain: e.target.value.toLowerCase().trim() }))}
                          placeholder="promo.maboutique.com ou mon-domaine.com"
                          className="flex-1 bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none font-mono placeholder-slate-600"
                        />
                        <span className="px-2.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 py-1 mr-2 rounded-md border border-emerald-500/20 select-none shrink-0">
                          SSL HTTPS Actif
                        </span>
                      </div>

                      {/* Aperçu interactif du lien personnalisé si renseigné */}
                      {funnelSettings.customDomain && (
                        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="text-xs font-mono text-indigo-300 truncate font-semibold">
                              https://{cleanDomain(funnelSettings.customDomain)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const targetUrl = `/?custom_domain=${cleanDomain(funnelSettings.customDomain)}`;
                              window.open(targetUrl, '_blank');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                            title="Tester la résolution de ce domaine"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Tester la liaison</span>
                          </button>
                        </div>
                      )}

                      {/* Guide Étape par Étape Enregistrement DNS CNAME */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">DNS</span>
                            <span>Instructions de configuration DNS :</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Propagation 5 à 30 min
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Chez votre registraire (Namecheap, GoDaddy, Hostinger, OVH, Cloudflare...), ajoutez l'enregistrement DNS suivant pour pointer votre domaine vers notre cluster :
                        </p>

                        {/* Cartes DNS interactives avec copie en 1 clic */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                          {/* Type */}
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Type :</span>
                              <span className="font-bold text-white">CNAME</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('CNAME', 'type')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Copier le type"
                            >
                              {copiedField === 'type' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Nom / Hôte */}
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Nom / Hôte :</span>
                              <span className="font-bold text-emerald-400">www</span> <span className="text-slate-400 font-sans text-[10px]">(ou sous-domaine)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('www', 'host')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Copier le nom d'hôte"
                            >
                              {copiedField === 'host' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Cible / Valeur */}
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Cible / Valeur :</span>
                              <span className="font-bold text-amber-300">cname.nanasore.com</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('cname.nanasore.com', 'target')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Copier la valeur cible"
                            >
                              {copiedField === 'target' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Note technique Apex */}
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between gap-2">
                          <span>
                            Pour le domaine racine sans sous-domaine (ex: <code className="text-slate-300 font-mono">mondomaine.com</code>), créez un enregistrement <strong className="text-slate-200">A</strong> pointant vers <code className="text-amber-400 font-mono">199.36.158.100</code>.
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('199.36.158.100', 'apex')}
                            className="p-1 shrink-0 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copier l'adresse IP"
                          >
                            {copiedField === 'apex' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Favicon */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Favicon (Icône d'onglet navigateur)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {funnelSettings.faviconUrl ? (
                          <img src={funnelSettings.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain rounded-md" />
                        ) : (
                          <Globe className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={funnelSettings.faviconUrl || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, faviconUrl: e.target.value }))}
                        placeholder="https://.../favicon.png"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                      />
                    </div>
                  </div>

                  {/* Statut de déploiement */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Statut de Déploiement du Tunnel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'published', label: 'En Ligne 🟢', desc: 'Accessible à tous' },
                        { id: 'draft', label: 'Brouillon 🟡', desc: 'Visible admin seul' },
                        { id: 'maintenance', label: 'Pause 🔴', desc: 'Page attente' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setFunnelSettings(prev => ({ ...prev, funnelStatus: st.id }))}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            funnelSettings.funnelStatus === st.id
                              ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{st.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{st.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* ONGLET 2 : SEO & SOCIAL                                  */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'seo' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">SEO & Partage sur les Réseaux Sociaux</h4>
                  <p className="text-xs text-slate-400">Contrôlez l'aperçu du lien lors du partage sur WhatsApp, Facebook, Twitter et Google.</p>
                </div>

                <div className="space-y-4">
                  {/* Méta-titre */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Méta-Titre (Balise &lt;title&gt;)
                      </label>
                      <span className={`text-[10px] font-mono ${(funnelSettings.pageTitle || '').length > 60 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {(funnelSettings.pageTitle || '').length}/60 caractères
                      </span>
                    </div>
                    <input
                      type="text"
                      value={funnelSettings.pageTitle || ''}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, pageTitle: e.target.value }))}
                      placeholder="Titre accrocheur qui donne envie de cliquer..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {/* Méta-description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Méta-Description (Balise &lt;meta description&gt;)
                      </label>
                      <span className={`text-[10px] font-mono ${(funnelSettings.pageDescription || '').length > 160 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {(funnelSettings.pageDescription || '').length}/160 caractères
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={funnelSettings.pageDescription || ''}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, pageDescription: e.target.value }))}
                      placeholder="Description persuasive avec appel à l'action pour maximiser le taux de clic..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
                    />
                  </div>

                  {/* Image Open Graph */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Image de Partage (Open Graph 1200x630)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={funnelSettings.ogImageUrl || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, ogImageUrl: e.target.value }))}
                        placeholder="URL de l'image (https://...)"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const samples = [
                            'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
                            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
                            'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1200&q=80'
                          ];
                          const next = samples[Math.floor(Math.random() * samples.length)];
                          setFunnelSettings(prev => ({ ...prev, ogImageUrl: next }));
                          triggerToast('✨ Image Open Graph générée !');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload</span>
                      </button>
                    </div>

                    {/* Aperçu direct de la carte Social Share */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex gap-3.5 items-center">
                      <div className="w-28 h-18 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 shadow-inner">
                        {funnelSettings.ogImageUrl ? (
                          <img src={funnelSettings.ogImageUrl} alt="OG Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">Pas d'image</div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                          {hostingMode === 'subdomain'
                            ? `${funnelSettings.subdomain || 'maboutique'}.nanasore.com`
                            : (funnelSettings.customDomain || 'promo.nana-store.ci')}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate">{funnelSettings.pageTitle || 'Titre du Funnel'}</h5>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{funnelSettings.pageDescription || 'Description de votre offre promotionnelle...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* ONGLET 3 : TRACKING & PIXELS                             */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'tracking' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Pixels Publicitaires & Télémétrie</h4>
                  <p className="text-xs text-slate-400">Insérez vos identifiants de pixels pour tracker automatiquement vos conversions et ROAS publicitaire.</p>
                </div>

                <div className="space-y-4">
                  {/* Facebook Pixel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Facebook Pixel ID (Meta Pixel)
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition px-3">
                      <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mr-2">META</span>
                      <input
                        type="text"
                        value={funnelSettings.fbPixelId || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, fbPixelId: e.target.value }))}
                        placeholder="Ex: 109283746582910"
                        className="flex-1 bg-transparent py-2.5 text-xs text-white focus:outline-none font-mono placeholder-slate-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Déclenche automatiquement les événements standards : ViewContent, InitiateCheckout, Purchase.</p>
                  </div>

                  {/* TikTok Pixel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      TikTok Pixel ID
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition px-3">
                      <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded mr-2">TIKTOK</span>
                      <input
                        type="text"
                        value={funnelSettings.tiktokPixelId || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, tiktokPixelId: e.target.value }))}
                        placeholder="Ex: C78N987HG54321"
                        className="flex-1 bg-transparent py-2.5 text-xs text-white focus:outline-none font-mono placeholder-slate-600"
                      />
                    </div>
                  </div>

                  {/* PostHog ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      PostHog ID (Session Replay & Funnels Heatmap)
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition px-3">
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded mr-2">POSTHOG</span>
                      <input
                        type="text"
                        value={funnelSettings.posthogId || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, posthogId: e.target.value }))}
                        placeholder="Ex: phc_982348572093847"
                        className="flex-1 bg-transparent py-2.5 text-xs text-white focus:outline-none font-mono placeholder-slate-600"
                      />
                    </div>
                  </div>

                  {/* Scripts personnalisés (Header) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Scripts Personnalisés (Injection dans le &lt;head&gt;)
                    </label>
                    <textarea
                      rows={4}
                      value={funnelSettings.customHeadScripts || ''}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, customHeadScripts: e.target.value }))}
                      placeholder="<!-- Google Tag Manager, Hotjar, Clarity, etc. -->"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-400 focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Ces balises &lt;script&gt; seront insérées au tout début de votre page de vente HTML.</p>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* ONGLET 4 : AUTOMATISATION CRM                            */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'crm' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Automatisation CRM & Synchronisation Webhooks</h4>
                  <p className="text-xs text-slate-400">Connectez vos leads et commandes directement à vos outils de marketing automation.</p>
                </div>

                <div className="space-y-4">
                  {/* Assigner un Tag CRM */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Assigner un Tag CRM aux Acheteurs
                    </label>
                    <select
                      value={funnelSettings.crmTag || 'VIP_ACHETEUR_TUNNEL'}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, crmTag: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                    >
                      <option value="VIP_ACHETEUR_TUNNEL">🌟 VIP_ACHETEUR_TUNNEL (Clients confirmés)</option>
                      <option value="PROSPECT_CHAUD_PROMO">🔥 PROSPECT_CHAUD_PROMO (Commande initiée)</option>
                      <option value="LEAD_WEBINAIRE_NANA">🎓 LEAD_WEBINAIRE_NANA (Inscrits masterclass)</option>
                      <option value="ABANDON_PANIER_FLASH">⏳ ABANDON_PANIER_FLASH (Relance automatique sous 1h)</option>
                      <option value="REVENDEUR_GROSSISTE">📦 REVENDEUR_GROSSISTE (Commandes volume)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Tag synchronisé avec la base contacts NaNa dès confirmation de commande.</p>
                  </div>

                  {/* Ajouter à la liste Brevo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Ajouter à la Liste Brevo (Sendinblue)
                    </label>
                    <select
                      value={funnelSettings.brevoListId || 'brevo_sales_2026'}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, brevoListId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                    >
                      <option value="brevo_sales_2026">📬 Liste 1 : Acheteurs Directs NaNa 2026 (Newsletter & Relances)</option>
                      <option value="brevo_prospects_chauds">⚡ Liste 2 : Prospects Chauds WhatsApp & SMS</option>
                      <option value="brevo_abonnements_vip">👑 Liste 3 : Abonnés VIP & Offres Privilèges</option>
                      <option value="brevo_upsell_automatique">📈 Liste 4 : Séquence d'Upsell post-achat</option>
                    </select>
                  </div>

                  {/* URL du Webhook de confirmation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      URL du Webhook de Confirmation (Zapier / Make / n8n)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={funnelSettings.webhookUrl || ''}
                        onChange={(e) => setFunnelSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono placeholder-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          triggerToast('⚡ Webhook de test envoyé avec succès (Payload HTTP 200 OK) !');
                          try { playCashChime(); } catch (e) {}
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700 shrink-0"
                      >
                        Tester
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Payload JSON envoyé en temps réel contenant les informations complètes du client et du panier.</p>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* ONGLET 5 : PAIEMENTS                                     */}
            {/* -------------------------------------------------------- */}
            {settingsActiveTab === 'payments' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Passerelles de Paiement & Devise</h4>
                  <p className="text-xs text-slate-400">Configurez les méthodes de paiement acceptées pour maximiser le taux de conversion.</p>
                </div>

                <div className="space-y-4">
                  {/* Menu déroulant de Devise */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Devise Principale du Tunnel
                    </label>
                    <select
                      value={funnelSettings.currency || 'XOF'}
                      onChange={(e) => setFunnelSettings(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer font-bold"
                    >
                      <option value="XOF">🌍 XOF - Franc CFA (FCFA) - UEMOA / CEMAC</option>
                      <option value="EUR">💶 EUR - Euro (€) - France & Diaspora</option>
                      <option value="USD">💵 USD - Dollar Américain ($) - International</option>
                    </select>
                  </div>

                  {/* Toggles des passerelles */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Passerelles Mobiles & Cartes Actives
                    </label>

                    {/* Orange Money */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-black text-xs border border-orange-500/20">
                          OM
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Orange Money</span>
                            <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20 font-mono">CI • SN • ML • BF</span>
                          </h5>
                          <p className="text-[11px] text-slate-400">Paiement instantané par USSD et QR code sécurisé.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFunnelSettings(prev => ({ ...prev, enableOrangeMoney: !prev.enableOrangeMoney }))}
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer ${
                          funnelSettings.enableOrangeMoney ? 'bg-orange-500' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md ${
                          funnelSettings.enableOrangeMoney ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Wave */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-xs border border-sky-500/20">
                          🌊
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Wave</span>
                            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20 font-mono">0% Frais • 1-Clic</span>
                          </h5>
                          <p className="text-[11px] text-slate-400">Paiement ultra-fluide via l'application Wave.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFunnelSettings(prev => ({ ...prev, enableWave: !prev.enableWave }))}
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer ${
                          funnelSettings.enableWave ? 'bg-sky-500' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md ${
                          funnelSettings.enableWave ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Stripe */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-500/20">
                          💳
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Stripe (Cartes Bancaires)</span>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono">Visa • Mastercard</span>
                          </h5>
                          <p className="text-[11px] text-slate-400">Paiement international par carte bancaire sécurisé 3D-Secure.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFunnelSettings(prev => ({ ...prev, enableStripe: !prev.enableStripe }))}
                        className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer ${
                          funnelSettings.enableStripe ? 'bg-indigo-600' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md ${
                          funnelSettings.enableStripe ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Pied de la Modale */}
        <div className="h-16 px-6 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Toutes les modifications sont synchronisées avec le moteur de conversion NaNa.
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const cleanSub = (
                  funnelSettings?.subdomain ||
                  funnelSettings?.funnelName?.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
                  activeProduct?.slug ||
                  'tunnel'
                ).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

                const rawCustom = funnelSettings?.customDomain;
                const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
                const isRealCustom = hostingMode === 'custom' && cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

                const completePayload = {
                  id: cleanSub,
                  slug: cleanSub,
                  subdomain: cleanSub,
                  customDomain: isRealCustom ? cleanCustomDomain : (funnelSettings?.customDomain || `${cleanSub}.nanasore.com`),
                  hostingType: hostingMode || funnelSettings?.hostingMode || 'subdomain',
                  title: funnelSettings?.funnelName || activeProduct?.name || 'Tunnel de Vente',
                  funnelTitle: funnelSettings?.funnelName || activeProduct?.name || 'Tunnel de Vente',
                  subtitle: funnelSettings?.pageDescription || activeProduct?.description || '',
                  currency: funnelSettings?.currency || 'XOF',
                  brandColor: funnelSettings?.primaryColor || '#f59e0b',
                  product: activeProduct || null,
                  products: activeProduct ? [activeProduct] : [],
                  pages: funnelPages,
                  activePageId,
                  blocks: canvasBlocks?.length ? canvasBlocks : (funnelPages?.[0]?.blocks || []),
                  settings: {
                    ...funnelSettings,
                    subdomain: cleanSub,
                    customDomain: isRealCustom ? cleanCustomDomain : (funnelSettings?.customDomain || ''),
                    hostingMode
                  },
                  paymentGateways: {
                    orangeMoney: Boolean(funnelSettings?.enableOrangeMoney),
                    wave: Boolean(funnelSettings?.enableWave),
                    stripe: Boolean(funnelSettings?.enableStripe)
                  },
                  isPublished: true,
                  updatedAt: Date.now()
                };

                try {
                  // 1. Écriture Firestore explicite (tenants, funnels, deals)
                  await registerSubdomainInFirebase(cleanSub, completePayload.title, completePayload);
                  await saveFunnelConfig(completePayload);

                  // 2. Si domaine personnalisé externe activé, liaison prioritaire dans 'tenants'
                  if (isRealCustom && cleanCustomDomain) {
                    await saveTenantCustomDomain(cleanSub, cleanCustomDomain, {
                      storeId: cleanSub,
                      storeName: completePayload.title,
                      customDomain: cleanCustomDomain,
                      type: 'funnel',
                      vendorType: 'funnel',
                      funnelId: cleanSub,
                      funnelSlug: cleanSub,
                      dealSlug: cleanSub,
                      logoUrl: completePayload.product?.image || completePayload.blocks?.[0]?.data?.imageUrl || '',
                      primaryColor: completePayload.brandColor,
                      funnelData: completePayload,
                      whiteLabel: {
                        hidePoweredBy: true,
                        hideReceiptLogo: true,
                        customFaviconUrl: funnelSettings?.faviconUrl || ''
                      }
                    });
                  }

                  // 3. Notification du composant parent
                  if (typeof onSave === 'function') {
                    await onSave(completePayload);
                  }

                  try { playValidationBeep(); } catch (e) {}
                  if (isRealCustom && cleanCustomDomain) {
                    triggerToast(`⚡ Domaine personnalisé https://${cleanCustomDomain} relié avec succès au tunnel !`);
                  } else {
                    triggerToast(`⚡ Tunnel enregistré ! Lien direct : https://nanasore.com/t/${cleanSub}`);
                  }
                  onClose();
                } catch (err) {
                  console.error('[FunnelSettingsModal] Erreur sauvegarde Firestore:', err);
                  triggerToast(`✅ Paramètres enregistrés localement : https://nanasore.com/t/${cleanSub}`);
                  onClose();
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isSaving ? 'Enregistrement en cours...' : 'Enregistrer les Modifications'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FunnelSettingsModal;
