import React, { useState, useEffect } from 'react';
import { 
  X, Check, Milestone, Layout, Smartphone, CheckCircle2, 
  ExternalLink, Palette, ShieldCheck, Eye, Layers, ArrowRight, RefreshCw 
} from 'lucide-react';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../../themes/themeRegistry';
import { ThemeDefinition, ThemeId } from '../../types/theme';
import { db, auth } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { buildPublicShopUrl } from '../../config/domains';
import { getThemeRoutePrefix } from '../../utils/themeRoutePrefix';
import { ensureAndPersistTenantSlug } from '../../utils/slugService';
import { supabase } from '@/lib/supabase';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId?: string;
  targetStoreId: string;
  onThemeActivated: (newThemeId: string) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId = DEFAULT_THEME_ID,
  targetStoreId,
  onThemeActivated
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentThemeId);
  const [savingThemeId, setSavingThemeId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [activatedShopUrl, setActivatedShopUrl] = useState<string | null>(null);

  // Synchronisation réactive au cas où currentThemeId change depuis le parent
  useEffect(() => {
    if (currentThemeId && !savingThemeId) {
      setSelectedThemeId(currentThemeId);
    }
  }, [currentThemeId, savingThemeId]);

  if (!isOpen) return null;

  const handlePreviewTheme = (theme: ThemeDefinition) => {
    playTapBeep();
    if (typeof window === 'undefined') return;

    const storeSlug = (targetStoreId || 'boutique').replace(/^store-/, '');
    const previewUrl = buildPublicShopUrl(storeSlug, { previewTheme: theme.id });

    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleActivateTheme = async (theme: ThemeDefinition) => {
    if (theme.id === selectedThemeId) return;
    
    playTapBeep();
    setSavingThemeId(theme.id);

    const authUid = auth?.currentUser?.uid;
    const storeId = targetStoreId || authUid || 'store-konkobo-telecom';
    const cleanStoreSlug = (typeof window !== 'undefined' && (window as any).storeSlug)
      ? (window as any).storeSlug
      : storeId.replace(/^store-/, '');
    const themePrefix = getThemeRoutePrefix(theme.id);
    const publicShopUrl = buildPublicShopUrl(cleanStoreSlug, { themeId: theme.id });

    // 1. Mise à jour immédiate et optimiste du state applicatif et notification sonore/visuelle
    setSelectedThemeId(theme.id);
    onThemeActivated(theme.id);
    setActivatedShopUrl(publicShopUrl);
    playValidationBeep();
    setSuccessToast(`Le thème « ${theme.name} » est activé ! Lien public : nsore.shop/${themePrefix}/${cleanStoreSlug}`);
    setTimeout(() => setSuccessToast(null), 5000);

    // 2. Persistance instantanée dans les caches locaux (pour le dashboard vendeur et le studio)
    try {
      if (typeof window !== 'undefined') {
        (window as any).activeThemeId = theme.id;
        (window as any).activeThemePrefix = themePrefix;
        (window as any).publicShopUrl = publicShopUrl;
      }

      localStorage.setItem('nana_active_theme_id', theme.id);
      localStorage.setItem('nana_boutique_theme_id', theme.id);
      localStorage.setItem(`nana_boutique_theme_id_${storeId}`, theme.id);
      if (authUid) {
        localStorage.setItem(`nana_boutique_theme_id_${authUid}`, theme.id);
      }
      localStorage.setItem('nana_active_theme_prefix', themePrefix);
      localStorage.setItem('nana_public_shop_url', publicShopUrl);

      const updateConfigObj = (key: string) => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            parsed.active_theme_id = theme.id;
            parsed.activeThemeId = theme.id;
            parsed.themeId = theme.id;
            parsed.activeThemePrefix = themePrefix;
            parsed.publicShopUrl = publicShopUrl;
            localStorage.setItem(key, JSON.stringify(parsed));
          } catch {}
        }
      };

      updateConfigObj(`nana_tenant_${storeId}_store_config`);
      if (authUid) updateConfigObj(`nana_tenant_${authUid}_store_config`);
      updateConfigObj('nana_store_hub_config');
    } catch (cacheErr) {
      console.warn('[THEMES] Cache local update error:', cacheErr);
    }

    // 3. Persistance Cloud Absolue et Officielle dans Firebase Firestore & RTDB
    try {
      console.log(`[THEMES ACTIVATION] Début persistance pour ${theme.id} sur storeId=${storeId}`);
      await ensureAndPersistTenantSlug(storeId, {
        activeThemeId: theme.id,
        active_theme_id: theme.id,
        themeId: theme.id,
        activeThemePrefix: themePrefix,
        publicShopUrl: publicShopUrl
      }, authUid, { themeId: theme.id });
      console.log(`[THEMES ACTIVATION] Persistance réussie pour ${theme.id}`);

      // 4. Synchronisation instantanée Supabase Realtime (app_registry)
      try {
        await supabase
          .from('app_registry')
          .upsert({
            tenant_id: storeId,
            module_key: 'theme_config',
            theme_key: theme.id,
            config_json: {
              activeThemeId: theme.id,
              active_theme_id: theme.id,
              themeId: theme.id,
              themePrefix,
              publicShopUrl,
              themeName: theme.name,
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,module_key' });
      } catch (sbErr) {
        console.warn('[THEMES ACTIVATION] Synchronisation Supabase app_registry:', sbErr);
      }
    } catch (error: any) {
      console.error('[THEMES ACTIVATION ERROR] Échec complet de synchronisation Firebase :', error);
      setErrorToast(`Échec d'enregistrement Firebase : ${error?.message || error || 'Erreur réseau/permissions'}`);
      setTimeout(() => setErrorToast(null), 6000);
    } finally {
      setSavingThemeId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la galerie de thèmes */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
                <Palette className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Galerie de Thèmes Storefront
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Multi-Layouts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Transformez instantanément la structure d'affichage de votre vitrine. Choisissez une mise en page adaptée à votre secteur d'activité pour booster vos conversions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer shrink-0"
            aria-label="Fermer la galerie de thèmes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast d'erreur lors de l'enregistrement Firebase */}
        {errorToast && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-5 py-3 flex items-center justify-between gap-3 text-rose-300 text-xs font-bold animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>⚠️ {errorToast}</span>
            </div>
            <button 
              type="button"
              onClick={() => setErrorToast(null)}
              className="text-rose-400 hover:text-rose-200 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}
        {successToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-300 text-xs font-bold animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            {activatedShopUrl && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(activatedShopUrl);
                      setSuccessToast(`✅ Lien copié : ${activatedShopUrl}`);
                      setTimeout(() => setSuccessToast(null), 3000);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
                >
                  <span>📋 Copier le lien</span>
                </button>
                <a
                  href={activatedShopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playTapBeep()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition border border-slate-600"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  <span>↗️ Voir en ligne</span>
                </a>
                <button 
                  type="button"
                  onClick={() => setSuccessToast(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grille des thèmes disponibles */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {AVAILABLE_THEMES.map((theme) => {
              const isActive = (selectedThemeId || DEFAULT_THEME_ID) === theme.id;
              const isSaving = savingThemeId === theme.id;

              return (
                <div
                  key={theme.id}
                  className={`relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                    isActive
                      ? 'border-blue-500/80 bg-slate-900/95 ring-2 ring-blue-500/30 shadow-xl shadow-blue-950/20'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {/* Badge Statut en haut à droite */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Actif
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {theme.badge}
                      </span>
                    )}
                  </div>

                  {/* Mockup Visuel de la structure du Thème */}
                  <div 
                    onClick={() => handlePreviewTheme(theme)}
                    className="relative w-full h-44 bg-slate-950/80 border-b border-slate-800/80 p-3 flex flex-col justify-between overflow-hidden select-none cursor-pointer group/mockup"
                    title={`Cliquer pour prévisualiser le thème ${theme.name}`}
                  >
                    {/* Overlay d'aperçu rapide au survol du mockup */}
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover/mockup:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-600/95 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-blue-950/60 border border-blue-400/40 transform group-hover/mockup:scale-105 transition-transform">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voir la démo</span>
                      </span>
                    </div>
                    {/* Mockup Layout Dynamique */}
                    {theme.id === 'theme-blank-custom' && (
                      <div className="w-full h-full flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 rounded-xl p-2 border border-blue-500/40">
                        {/* Barre supérieure modulaire */}
                        <div className="w-full h-4 bg-white/10 rounded flex items-center justify-between px-2 border border-white/10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[7px] font-black text-white tracking-wider">PAGE BLANCHE • MODULAIRE</span>
                          </div>
                          <span className="text-[6px] font-bold text-blue-300 bg-blue-900/60 px-1 py-0.2 rounded border border-blue-500/30">+ 8 SECTIONS</span>
                        </div>
                        {/* Bloc 1 : Hero Split Banner */}
                        <div className="w-full h-11 rounded-lg bg-blue-600/20 border border-blue-500/30 p-1.5 flex items-center justify-between gap-1">
                          <div className="space-y-0.5">
                            <div className="w-16 h-1.5 bg-white font-black rounded" />
                            <div className="w-10 h-1 bg-blue-300/80 rounded" />
                            <div className="w-8 h-2 bg-blue-600 rounded-sm mt-0.5" />
                          </div>
                          <div className="w-10 h-8 rounded bg-blue-500/20 border border-blue-400/20 flex items-center justify-center text-[7px]">🖼️</div>
                        </div>
                        {/* Bloc 2 : Rayon Spotify sous le pouce */}
                        <div className="w-full flex-1 rounded bg-black/30 border border-white/10 p-1 flex items-center gap-1 overflow-hidden">
                          <div className="w-9 h-7 rounded bg-white/10 shrink-0 border border-white/10" />
                          <div className="w-9 h-7 rounded bg-white/10 shrink-0 border border-white/10" />
                          <div className="w-9 h-7 rounded bg-white/10 shrink-0 border border-white/10" />
                          <div className="w-9 h-7 rounded bg-white/10 shrink-0 border border-white/10" />
                        </div>
                      </div>
                    )}
                    {theme.id === 'theme-livestream-pro' && (
                      <div className="w-full h-full flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-opacity bg-[#090A0F] rounded-xl p-1.5 border border-indigo-500/40">
                        {/* Header Broadcast 75px avec badge pulsant ● LIVE STUDIO et Multistream */}
                        <div className="w-full h-4 bg-white/[0.06] rounded flex items-center justify-between px-1.5 border border-white/[0.08]">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2A54] animate-ping" />
                            <span className="text-[6.5px] font-black text-white leading-none">LIVE STUDIO</span>
                          </div>
                          {/* Mini Multistream pill */}
                          <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.2 rounded-full border border-white/10">
                            <span className="w-1 h-1 rounded-full bg-[#1877F2]" />
                            <span className="w-1 h-1 rounded-full bg-[#FF0000]" />
                            <span className="w-1 h-1 rounded-full bg-[#E1306C]" />
                            <span className="text-[5px] text-slate-300 font-bold ml-0.5">👁️ 1.4k</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded bg-amber-500/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FF2A54] text-[5px] text-white flex items-center justify-center font-bold">1</div>
                          </div>
                        </div>

                        {/* Scène Live 70/30 : Zone Vidéo (gauche) + Chat Column (droite) */}
                        <div className="flex gap-1 flex-1">
                          {/* Zone Vidéo 70% */}
                          <div className="flex-1 rounded-lg bg-black border border-indigo-500/30 p-1 flex flex-col justify-between relative overflow-hidden shadow-inner">
                            {/* Badges vidéo en haut */}
                            <div className="flex items-center justify-between">
                              <span className="px-1 py-0.2 rounded-full bg-[#FF2A54] text-[5px] font-black text-white">● EN DIRECT</span>
                              <span className="text-[5px] font-bold text-sky-400 bg-black/60 px-1 rounded">4K UHD</span>
                            </div>

                            {/* Center Sound Button */}
                            <div className="mx-auto px-2 py-0.5 rounded-md bg-indigo-600/80 text-[5px] font-extrabold text-white flex items-center gap-0.5 shadow">
                              <span>🔊 Activer son</span>
                            </div>

                            {/* HUD Offre Épinglée (bas gauche) */}
                            <div className="w-3/4 rounded bg-black/80 border border-white/20 p-1 flex items-center justify-between gap-1 shadow-lg backdrop-blur-xs">
                              <div className="w-3.5 h-3.5 rounded bg-indigo-600/40 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="w-12 h-1 bg-white/90 rounded" />
                                <div className="w-8 h-1 bg-amber-400 rounded mt-0.5" />
                              </div>
                              <div className="w-5 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded text-[4.5px] font-bold flex items-center justify-center text-white">⚡</div>
                            </div>
                          </div>

                          {/* Chat Interactif 30% */}
                          <div className="w-16 h-full rounded-lg bg-white/[0.04] border border-white/[0.08] p-1 flex flex-col justify-between">
                            {/* Onglets chat/produits */}
                            <div className="flex gap-0.5 pb-0.5 border-b border-white/[0.08]">
                              <div className="w-6 h-1 rounded bg-indigo-400" />
                              <div className="w-6 h-1 rounded bg-slate-600" />
                            </div>

                            {/* Messages mockés */}
                            <div className="space-y-1 flex-1 py-0.5">
                              <div className="w-full h-1 bg-slate-600 rounded" />
                              <div className="w-10 h-1 bg-slate-500 rounded" />
                              {/* Bannière achat dorée */}
                              <div className="w-full h-2 rounded bg-amber-400/30 border border-amber-400/50" />
                            </div>

                            {/* Quick reactions */}
                            <div className="flex justify-between text-[6px]">
                              <span>🔥</span>
                              <span>❤️</span>
                              <span>👏</span>
                            </div>
                          </div>
                        </div>

                        {/* Bandeau de réassurance en bas */}
                        <div className="w-full h-2.5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-around px-1">
                          <div className="w-10 h-0.5 bg-indigo-400 rounded" />
                          <div className="w-10 h-0.5 bg-emerald-400 rounded" />
                          <div className="w-10 h-0.5 bg-amber-400 rounded" />
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-default' && (
                      <div className="w-full h-full flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {/* Carrousel Hero Mockup */}
                        <div className="w-full h-16 rounded-xl bg-gradient-to-r from-emerald-900/60 via-slate-800 to-blue-900/60 p-2 flex flex-col justify-end border border-slate-700/50">
                          <div className="w-16 h-2 rounded bg-emerald-400 mb-1" />
                          <div className="w-28 h-2.5 rounded bg-white" />
                        </div>
                        {/* Marquee Ticker Mockup */}
                        <div className="w-full h-4 rounded-lg bg-orange-600/60 flex items-center px-2">
                          <div className="w-32 h-1.5 rounded bg-white/80" />
                        </div>
                        {/* 2 Colonnes Produit Mockup */}
                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                          <div className="rounded-lg bg-slate-800/80 p-1 flex flex-col justify-between border border-slate-700/30">
                            <div className="w-full h-7 rounded bg-slate-700/60" />
                            <div className="w-10 h-1.5 rounded bg-emerald-400 mt-1" />
                          </div>
                          <div className="rounded-lg bg-slate-800/80 p-1 flex flex-col justify-between border border-slate-700/30">
                            <div className="w-full h-7 rounded bg-slate-700/60" />
                            <div className="w-10 h-1.5 rounded bg-emerald-400 mt-1" />
                          </div>
                          <div className="rounded-lg bg-slate-800/80 p-1 flex flex-col justify-between border border-slate-700/30">
                            <div className="w-full h-7 rounded bg-slate-700/60" />
                            <div className="w-10 h-1.5 rounded bg-emerald-400 mt-1" />
                          </div>
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-beauty-emerald' && (
                      <div className="w-full h-full flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-opacity bg-[#FFFFFF] rounded-xl p-1.5 border border-[#0F4C3A]/30">
                        {/* Header Minimaliste 85px blanc avec Micro-Badges */}
                        <div className="w-full h-4 bg-white rounded flex items-center justify-between px-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-0.5">
                            <span className="text-[7.5px] font-black text-[#111C18] leading-none" style={{ fontFamily: 'Syne, sans-serif' }}>Glow</span>
                            <span className="w-1 h-1 rounded-full bg-[#C59B27]" />
                          </div>
                          {/* Micro-Badges Header Mockup */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex flex-col items-center">
                              <span className="text-[5px] font-bold px-1 py-0.2 rounded-xs bg-[#0F4C3A] text-white leading-none">NEW</span>
                              <div className="w-3 h-0.5 bg-slate-400 rounded-full mt-0.5" />
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[5px] font-bold px-1 py-0.2 rounded-xs bg-[#C59B27] text-white leading-none">SALE</span>
                              <div className="w-3 h-0.5 bg-slate-400 rounded-full mt-0.5" />
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[5px] font-bold px-1 py-0.2 rounded-xs bg-[#D9381E] text-white leading-none">HOT</span>
                              <div className="w-3 h-0.5 bg-slate-400 rounded-full mt-0.5" />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full border border-[#111C18]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#0F4C3A] text-[5px] text-white flex items-center justify-center font-bold">1</div>
                          </div>
                        </div>

                        {/* Hero 50/50 Style Magazine avec Dégradé Doux & Flacons */}
                        <div className="flex-1 rounded bg-gradient-to-br from-[#F4F7F4] via-[#FFFFFF] to-[#EFECE6] p-1.5 flex items-center justify-between border border-[#C59B27]/20 relative overflow-hidden">
                          {/* Motif botanique subtil coin */}
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#0F4C3A]/20 rounded-tl" />
                          
                          <div className="space-y-0.5 z-10">
                            <div className="text-[6.5px] italic text-[#C59B27] font-serif font-bold">Collection Botanique</div>
                            <div className="text-[8px] font-black text-[#111C18] leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>Face Cleanser</div>
                            <div className="w-14 h-1 bg-slate-300 rounded-full mt-0.5" />
                            <div className="w-10 h-2 bg-[#0F4C3A] rounded-none mt-1 flex items-center justify-center">
                              <span className="text-[4.5px] font-bold text-white tracking-wider">SHOP</span>
                            </div>
                          </div>

                          {/* Image Flacon sur Podium Doré */}
                          <div className="w-12 h-14 bg-[#EFECE6] rounded-xs border border-[#C59B27]/30 flex flex-col items-center justify-end p-1 relative shadow-sm">
                            <div className="w-4 h-7 bg-[#1A2823] rounded-xs relative">
                              <div className="w-1.5 h-2 bg-[#C59B27] mx-auto -mt-1.5 rounded-t-xs" />
                            </div>
                            <div className="w-9 h-1.5 bg-[#FFFFFF] rounded-full border border-[#C59B27] mt-0.5" />
                          </div>

                          {/* Boutons slider gauche/droite */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0F4C3A] text-white flex items-center justify-center text-[5px] font-bold">&lt;</div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0F4C3A] text-white flex items-center justify-center text-[5px] font-bold">&gt;</div>
                        </div>

                        {/* 3 Cartes Produits Sable Chaud #EFECE6 */}
                        <div className="grid grid-cols-3 gap-1 h-8 shrink-0">
                          <div className="bg-[#EFECE6] border border-slate-200/80 rounded-none p-0.5 flex flex-col justify-between items-center">
                            <div className="w-2.5 h-4 bg-[#0F4C3A] rounded-xs mt-0.5" />
                            <div className="w-6 h-0.5 bg-[#C59B27] rounded-full" />
                          </div>
                          <div className="bg-[#EFECE6] border border-slate-200/80 rounded-none p-0.5 flex flex-col justify-between items-center">
                            <div className="w-3.5 h-3.5 bg-[#5C4B41] rounded-xs mt-0.5" />
                            <div className="w-6 h-0.5 bg-[#C59B27] rounded-full" />
                          </div>
                          <div className="bg-[#EFECE6] border border-slate-200/80 rounded-none p-0.5 flex flex-col justify-between items-center">
                            <div className="w-3 h-4 bg-[#DFBF60] rounded-xs mt-0.5" />
                            <div className="w-6 h-0.5 bg-[#C59B27] rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-electro-orange' && (
                      <div className="w-full h-full flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-opacity bg-white/5 rounded-xl p-1.5 border border-orange-500/40">
                        {/* Top Bar Grise & Pill Search Bar Orange */}
                        <div className="w-full space-y-0.5">
                          <div className="w-full h-1.5 rounded-t bg-[#F5F5F5] flex items-center justify-between px-1">
                            <div className="w-10 h-0.5 bg-slate-400 rounded" />
                            <div className="w-8 h-0.5 bg-slate-400 rounded" />
                          </div>
                          <div className="w-full h-4 bg-white rounded flex items-center justify-between px-1 gap-1 border border-slate-200">
                            <div className="flex items-center gap-0.5">
                              <span className="text-[7px] font-black text-slate-900 leading-none">electro</span>
                              <span className="w-1 h-1 rounded-full bg-[#FF6A00]" />
                            </div>
                            {/* Pilule de recherche avec bordure Orange */}
                            <div className="flex-1 h-3 rounded-full border border-[#FF6A00] flex items-center justify-between px-1 bg-white">
                              <div className="w-10 h-1 bg-slate-200 rounded" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6A00]" />
                            </div>
                            <div className="w-3 h-2 bg-slate-200 rounded-xs" />
                          </div>
                        </div>

                        {/* Layout : Bouton Orange "Tous départements" + Hero 50/50 */}
                        <div className="flex gap-1 flex-1">
                          {/* Sidebar Verticale à gauche sous onglet Orange */}
                          <div className="w-10 h-full bg-white rounded flex flex-col justify-between p-0.5 border border-slate-200">
                            <div className="w-full h-1.5 bg-[#FF6A00] rounded-t-xs" />
                            <div className="w-full h-1 bg-slate-200 rounded" />
                            <div className="w-full h-1 bg-slate-200 rounded" />
                            <div className="w-full h-1 bg-slate-200 rounded" />
                            <div className="w-full h-1 bg-slate-200 rounded" />
                          </div>

                          {/* Hero 50/50 Fond Clair + Smartwatch Duo */}
                          <div className="flex-1 rounded bg-[#F9F9F9] p-1.5 flex items-center justify-between border border-slate-200">
                            <div className="space-y-1">
                              <div className="w-12 h-1 bg-slate-400 rounded" />
                              <div className="w-16 h-2 bg-slate-900 rounded font-bold" />
                              <div className="w-8 h-1.5 rounded-full bg-[#FF6A00]" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-[#FF6A00]" />
                            </div>
                          </div>
                        </div>

                        {/* 4 Mini Cartes Promo en bas */}
                        <div className="grid grid-cols-4 gap-1 h-3.5 shrink-0">
                          <div className="bg-[#F7F7F7] border border-slate-200 rounded-xs flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[#FF6A00]" />
                          </div>
                          <div className="bg-[#F7F7F7] border border-slate-200 rounded-xs flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[#FF6A00]" />
                          </div>
                          <div className="bg-[#F7F7F7] border border-slate-200 rounded-xs flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[#FF6A00]" />
                          </div>
                          <div className="bg-[#F7F7F7] border border-slate-200 rounded-xs flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[#FF6A00]" />
                          </div>
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-mega-store-pro' && (
                      <div className="w-full h-full flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-opacity bg-white/5 rounded-xl p-1.5 border border-blue-500/30">
                        {/* Top Bar Foncée & Middle Search Bar */}
                        <div className="w-full space-y-0.5">
                          <div className="w-full h-1.5 rounded-t bg-[#0B132A] flex items-center justify-between px-1">
                            <div className="w-8 h-0.5 bg-slate-400 rounded" />
                            <div className="w-10 h-0.5 bg-slate-400 rounded" />
                          </div>
                          <div className="w-full h-4 bg-white rounded flex items-center justify-between px-1 gap-1 border border-slate-300">
                            <div className="w-4 h-2 bg-[#0056D2] rounded-xs" />
                            <div className="flex-1 h-2.5 rounded-xs border border-blue-400 flex items-center justify-between px-0.5">
                              <div className="w-6 h-1 bg-slate-300 rounded" />
                              <div className="w-2 h-2 bg-[#0056D2] rounded-xs" />
                            </div>
                            <div className="w-3 h-2 bg-slate-200 rounded-xs" />
                          </div>
                        </div>

                        {/* Layout Asymétrique : Sidebar Verticale (gauche) + Hero 70/30 (droite) */}
                        <div className="flex gap-1 flex-1">
                          {/* Sidebar Verticale à gauche */}
                          <div className="w-10 h-full bg-slate-800 rounded flex flex-col justify-between p-0.5 border border-slate-700/60">
                            <div className="w-full h-1 bg-blue-400 rounded" />
                            <div className="w-full h-1 bg-slate-600 rounded" />
                            <div className="w-full h-1 bg-slate-600 rounded" />
                            <div className="w-full h-1 bg-slate-600 rounded" />
                            <div className="w-full h-1 bg-slate-600 rounded" />
                          </div>

                          {/* Hero Asymétrique : Grand bloc 70% + 2 Petits blocs empilés 30% */}
                          <div className="flex-1 grid grid-cols-3 gap-1">
                            {/* Bloc Principal 70% (2 colonnes) */}
                            <div className="col-span-2 rounded bg-gradient-to-br from-purple-200 via-purple-100 to-indigo-100 p-1 flex flex-col justify-between border border-purple-300/60">
                              <div className="space-y-0.5">
                                <div className="w-8 h-1 rounded bg-purple-400" />
                                <div className="w-12 h-2 rounded bg-purple-900" />
                              </div>
                              <div className="w-6 h-1.5 rounded bg-white border border-purple-300" />
                            </div>

                            {/* 2 Blocs Empilés 30% (1 colonne) */}
                            <div className="col-span-1 flex flex-col gap-1 justify-between">
                              <div className="h-full rounded bg-[#0056D2] p-0.5 flex flex-col justify-between border border-blue-400">
                                <div className="w-5 h-0.5 bg-yellow-300 rounded" />
                                <div className="w-4 h-1 bg-white rounded" />
                              </div>
                              <div className="h-full rounded bg-[#0056D2] p-0.5 flex flex-col justify-between border border-blue-400">
                                <div className="w-5 h-0.5 bg-yellow-300 rounded" />
                                <div className="w-4 h-1 bg-white rounded" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4 Mini Cartes Promo en bas */}
                        <div className="grid grid-cols-4 gap-1 h-3 shrink-0">
                          <div className="bg-[#0056D2] rounded-xs" />
                          <div className="bg-[#0056D2] rounded-xs" />
                          <div className="bg-[#0056D2] rounded-xs" />
                          <div className="bg-[#0056D2] rounded-xs" />
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-electro-tech' && (
                      <div className="w-full h-full flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-white/5 rounded-xl p-1.5 border border-blue-500/30">
                        {/* Hero 50/50 Mockup Tech */}
                        <div className="w-full h-14 rounded-lg bg-gradient-to-r from-blue-950/90 via-slate-900 to-blue-950/80 p-1.5 flex items-center justify-between border border-blue-400/30">
                          <div className="space-y-1">
                            <div className="w-20 h-2 rounded bg-blue-300" />
                            <div className="w-16 h-1.5 rounded bg-slate-300" />
                            <div className="flex items-center gap-1 bg-white/10 rounded-full px-1.5 py-0.5 border border-white/20">
                              <div className="w-10 h-1 rounded bg-slate-300" />
                              <div className="w-6 h-1.5 rounded bg-[#0056D2]" />
                            </div>
                          </div>
                          {/* Showcase Écran Incurvé & VR 3D */}
                          <div className="w-12 h-10 rounded-lg bg-blue-600/20 border border-blue-400/40 flex items-center justify-center relative">
                            <div className="w-8 h-4 rounded-sm bg-gradient-to-r from-amber-400 to-rose-500 opacity-90" />
                            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-slate-800 border border-blue-400" />
                          </div>
                        </div>

                        {/* 3 Cartes Produits 4:3 avec Fond #F9F9FB, Badges Orange Pastel et Boutons Duos */}
                        <div className="grid grid-cols-3 gap-1 flex-1">
                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/50">
                            <div className="w-full aspect-[4/3] bg-slate-800/90 relative rounded-t-[6px] overflow-hidden flex items-center justify-center">
                              {/* Badge Orange Pastel en bas à gauche */}
                              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[6px] font-bold text-amber-800">
                                24h
                              </div>
                              <div className="w-5 h-3.5 rounded-sm bg-slate-700" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-8 h-1 rounded bg-slate-200" />
                              <div className="w-5 h-1 rounded bg-white font-bold mt-0.5" />
                              <div className="flex items-center gap-0.5 mt-1">
                                <div className="w-3.5 h-1.5 rounded bg-slate-700 border border-slate-600" />
                                <div className="w-3.5 h-1.5 rounded bg-[#0056D2]" />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/50">
                            <div className="w-full aspect-[4/3] bg-slate-800/90 relative rounded-t-[6px] overflow-hidden flex items-center justify-center">
                              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[6px] font-bold text-amber-800">
                                2 Ans
                              </div>
                              <div className="w-6 h-3 rounded-sm bg-gradient-to-r from-red-500 to-amber-500" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-8 h-1 rounded bg-slate-200" />
                              <div className="w-5 h-1 rounded bg-white font-bold mt-0.5" />
                              <div className="flex items-center gap-0.5 mt-1">
                                <div className="w-3.5 h-1.5 rounded bg-slate-700 border border-slate-600" />
                                <div className="w-3.5 h-1.5 rounded bg-[#0056D2]" />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/50">
                            <div className="w-full aspect-[4/3] bg-slate-800/90 relative rounded-t-[6px] overflow-hidden flex items-center justify-center">
                              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[6px] font-bold text-amber-800">
                                Top
                              </div>
                              <div className="w-4 h-4 rounded-full bg-slate-700" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-8 h-1 rounded bg-slate-200" />
                              <div className="w-5 h-1 rounded bg-white font-bold mt-0.5" />
                              <div className="flex items-center gap-0.5 mt-1">
                                <div className="w-3.5 h-1.5 rounded bg-slate-700 border border-slate-600" />
                                <div className="w-3.5 h-1.5 rounded bg-[#0056D2]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Barre de Réassurance Mockup */}
                        <div className="w-full h-2.5 rounded bg-slate-800/80 flex items-center justify-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-amber-400" />
                          <div className="w-20 h-1 rounded bg-slate-300" />
                          <div className="w-1 h-1 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-digital-pro' && (
                      <div className="w-full h-full flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-white/5 rounded-xl p-1.5 border border-blue-500/20">
                        {/* Hero 50/50 Mockup */}
                        <div className="w-full h-14 rounded-lg bg-gradient-to-r from-blue-950/80 via-slate-900 to-blue-900/60 p-1.5 flex items-center justify-between border border-blue-500/30">
                          <div className="space-y-1">
                            <div className="w-16 h-2 rounded bg-blue-400" />
                            <div className="w-20 h-1.5 rounded bg-slate-300" />
                            <div className="w-12 h-2 rounded bg-[#0056D2]" />
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                            <div className="w-6 h-4 rounded bg-blue-400/80" />
                          </div>
                        </div>
                        {/* 3 Cartes Produits Carrées 1:1 (Social Ads) avec Badges et Boutons Duos */}
                        <div className="grid grid-cols-3 gap-1 flex-1">
                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full aspect-square bg-slate-800 relative rounded-t-[6px] overflow-hidden">
                              <div className="absolute top-0.5 right-0.5 w-3 h-1 rounded-full bg-amber-300" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-7 h-1 rounded bg-slate-300" />
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="w-3.5 h-1 rounded bg-blue-400" />
                                <div className="w-2.5 h-1 rounded bg-blue-600" />
                              </div>
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full aspect-square bg-slate-800 relative rounded-t-[6px] overflow-hidden">
                              <div className="absolute top-0.5 right-0.5 w-3 h-1 rounded-full bg-amber-300" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-7 h-1 rounded bg-slate-300" />
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="w-3.5 h-1 rounded bg-blue-400" />
                                <div className="w-2.5 h-1 rounded bg-blue-600" />
                              </div>
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-900/90 overflow-hidden flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full aspect-square bg-slate-800 relative rounded-t-[6px] overflow-hidden">
                              <div className="absolute top-0.5 right-0.5 w-3 h-1 rounded-full bg-amber-300" />
                            </div>
                            <div className="p-0.5">
                              <div className="w-7 h-1 rounded bg-slate-300" />
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="w-3.5 h-1 rounded bg-blue-400" />
                                <div className="w-2.5 h-1 rounded bg-blue-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Barre de Réassurance Mockup */}
                        <div className="w-full h-2.5 rounded bg-slate-800/70 flex items-center justify-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-amber-400" />
                          <div className="w-16 h-1 rounded bg-slate-400" />
                          <div className="w-1 h-1 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-minimal' && (
                      <div className="w-full h-full flex flex-col gap-2 p-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        {/* Large Clean Minimal Hero */}
                        <div className="w-full h-20 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 p-3 flex flex-col justify-center items-center border border-slate-700/40 text-center">
                          <div className="w-24 h-2 rounded bg-blue-300 mb-1.5" />
                          <div className="w-36 h-3 rounded bg-white" />
                        </div>
                        {/* 2 Big Clean Photo Cards */}
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div className="rounded-xl bg-slate-800/70 p-1.5 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-9 rounded-lg bg-slate-700/40" />
                            <div className="w-14 h-2 rounded bg-white/90 mt-1" />
                          </div>
                          <div className="rounded-xl bg-slate-800/70 p-1.5 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-9 rounded-lg bg-slate-700/40" />
                            <div className="w-14 h-2 rounded bg-white/90 mt-1" />
                          </div>
                        </div>
                      </div>
                    )}

                    {theme.id === 'theme-grid' && (
                      <div className="w-full h-full flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {/* Sidebar Mockup */}
                        <div className="w-12 h-full rounded-xl bg-slate-800/50 p-1 flex flex-col gap-1 border border-slate-700/30">
                          <div className="w-full h-2 rounded bg-slate-600" />
                          <div className="w-full h-2 rounded bg-slate-600" />
                          <div className="w-full h-2 rounded bg-slate-600" />
                        </div>
                        {/* Dense Grid Mockup */}
                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                          <div className="rounded-lg bg-slate-800 p-1 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-8 rounded bg-slate-700/60" />
                            <div className="w-8 h-1.5 rounded bg-blue-400 mt-1" />
                          </div>
                          <div className="rounded-lg bg-slate-800 p-1 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-8 rounded bg-slate-700/60" />
                            <div className="w-8 h-1.5 rounded bg-blue-400 mt-1" />
                          </div>
                          <div className="rounded-lg bg-slate-800 p-1 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-8 rounded bg-slate-700/60" />
                            <div className="w-8 h-1.5 rounded bg-blue-400 mt-1" />
                          </div>
                          <div className="rounded-lg bg-slate-800 p-1 flex flex-col justify-between border border-slate-700/40">
                            <div className="w-full h-8 rounded bg-slate-700/60" />
                            <div className="w-8 h-1.5 rounded bg-blue-400 mt-1" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contenu et Détails du Thème */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-black text-white flex items-center gap-1.5">
                            {theme.name}
                          </h3>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0" title={`Préfixe public officiel : nsore.shop/${getThemeRoutePrefix(theme.id)}/...`}>
                            nsore.shop/{getThemeRoutePrefix(theme.id)}/
                          </span>
                        </div>
                        <p className="text-xs text-blue-400 font-bold mt-0.5">
                          {theme.subtitle}
                        </p>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {theme.description}
                      </p>

                      {/* Liste des fonctionnalités structurelles */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        {theme.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="line-clamp-1">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Boutons d'action : Prévisualiser & Activer */}
                    <div className="pt-2 space-y-2">
                      {/* Bouton secondaire outline : Prévisualisation Live Demo */}
                      <button
                        type="button"
                        onClick={() => handlePreviewTheme(theme)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-700/80 hover:border-blue-400/60 bg-slate-800/40 hover:bg-blue-500/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 group/preview"
                        title={`Prévisualiser le thème ${theme.name} avec les produits de votre boutique`}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/preview:text-blue-400 transition-colors" />
                        <span>👁️ Prévisualiser</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover/preview:text-blue-400 transition-colors ml-auto opacity-70 group-hover/preview:opacity-100" />
                      </button>

                      {/* Bouton d'action principal Activer / Déjà actif */}
                      {theme.id === 'theme-blank-custom' ? (
                        isActive ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-black text-xs flex items-center justify-center gap-2 shadow-inner">
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                            <span>🛠️ Architecte Actif • En Ligne</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateTheme(theme)}
                            disabled={isSaving}
                            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950/40 transition cursor-pointer active:scale-95 disabled:opacity-60"
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Activation de l'Architecte...</span>
                              </>
                            ) : (
                              <>
                                <span>🛠️ Ouvrir l'Architecte de Thème</span>
                              </>
                            )}
                          </button>
                        )
                      ) : isActive ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-black text-xs flex items-center justify-center gap-2 shadow-inner">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          <span>Thème actuellement en ligne</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivateTheme(theme)}
                          disabled={isSaving}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950/40 transition cursor-pointer active:scale-95 disabled:opacity-60"
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Activation en cours...</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5" />
                              <span>Activer ce thème</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Encart explicatif sur l'architecture multi-thèmes */}
          <div className="rounded-2xl p-4 bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5" title="Signe de sens">
              <Milestone className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-black text-white">
                Véritable architecture multi-layouts
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Chaque thème redéfinit la structure complète d'affichage de la boutique, le comportement des rayons et l'immersion des visiteurs. Vos produits, votre panier et vos paiements Wameet restent 100% synchronisés quel que soit le thème sélectionné.
              </p>
            </div>
          </div>
        </div>

        {/* Footer avec bouton fermer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400">
            Thème actuel : <strong className="text-white">{AVAILABLE_THEMES.find(t => t.id === selectedThemeId)?.name || 'Standard Élite'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
