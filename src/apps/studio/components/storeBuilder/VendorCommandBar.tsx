import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  SlidersHorizontal, 
  Palette, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeft, 
  Globe, 
  Package, 
  Undo2, 
  Redo2,
  Sparkles,
  Play
} from 'lucide-react';
import { buildPublicShopUrl } from '../../../../config/domains';
import { getThemeRoutePrefix } from '../../../../utils/themeRoutePrefix';
import { getThemeDefinition } from '../../../../themes/themeRegistry';
import { playTapBeep } from '../../../../utils/audio';
import { NanasorePasserelleIcon } from '../../../../components/common/NanasoreLogo';

export interface VendorCommandBarProps {
  storeSlug: string;
  storeName?: string;
  activeThemeId: string;
  viewportMode: 'desktop' | 'mobile';
  onViewportChange: (mode: 'desktop' | 'mobile') => void;
  isCustomizerOpen: boolean;
  onToggleCustomizer: () => void;
  onOpenThemes: () => void;
  onOpenAddProduct: () => void;
  onOpenQuickCatalog?: () => void;
  productCount?: number;
  onOpenKyc: () => void;
  kycStatus?: string;
  onBack?: () => void;
  onToast?: (message: string) => void;
  hasUnsavedChanges?: boolean;
  autoSaveStatus?: {
    lastSavedTime?: string;
    isSaving?: boolean;
  };
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenPresets?: () => void;
  savedPresetsCount?: number;
}

export const VendorCommandBar: React.FC<VendorCommandBarProps> = ({
  storeSlug,
  storeName,
  activeThemeId,
  viewportMode,
  onViewportChange,
  isCustomizerOpen,
  onToggleCustomizer,
  onOpenThemes,
  onOpenAddProduct,
  onOpenQuickCatalog,
  productCount,
  onOpenKyc,
  kycStatus = 'verified',
  onBack,
  onToast,
  hasUnsavedChanges = false,
  autoSaveStatus,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenPresets,
  savedPresetsCount
}) => {
  const [copied, setCopied] = useState(false);
  const [showLocalToast, setShowLocalToast] = useState(false);

  const cleanStoreSlug = (storeSlug || 'boutique').trim().replace(/^store-/, '');
  const themePrefix = getThemeRoutePrefix(activeThemeId);
  const publicShopUrl = buildPublicShopUrl(cleanStoreSlug, { themeId: activeThemeId });
  const sandboxUrl = `/${themePrefix}/sandbox`;
  const activeThemeDef = getThemeDefinition(activeThemeId);
  const rawThemeName = activeThemeDef?.name || 'Standard Élite';
  const themeDisplayName = rawThemeName.includes('(') ? rawThemeName.split('(')[0].trim() : rawThemeName;
  const storeDisplayName = storeName || cleanStoreSlug || 'Ma Boutique';

  const handleCopyUrl = async () => {
    playTapBeep();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicShopUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = publicShopUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setShowLocalToast(true);
      if (onToast) {
        onToast('✅ Lien nsore.shop copié !');
      }
      setTimeout(() => {
        setCopied(false);
        setShowLocalToast(false);
      }, 2500);
    } catch (err) {
      console.warn('[VendorCommandBar] Copy failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-[1000] bg-slate-950/95 backdrop-blur-xl text-white border-b border-slate-800/80 shadow-2xl transition-all">
      {/* Niveau Supérieur Conditionnel (La Bannière KYC & Statut) */}
      {kycStatus !== 'verified' && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 px-6 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">
              🛡️ Votre identité vendeur (KYC) n'est pas encore vérifiée. Vérifiez votre compte pour débloquer les retraits sans limite.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenKyc();
            }}
            className="text-amber-300 hover:text-amber-100 font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-4 hover:underline text-xs"
          >
            <span>Compléter mon KYC →</span>
          </button>
        </div>
      )}

      {/* Niveau Principal (Hauteur 64px, px-6 flex items-center justify-between gap-4) */}
      <div className="h-16 px-6 flex items-center justify-between gap-4">
        {/* Zone Gauche (Identité & Sélecteur de Viewport Temps Réel) */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBack();
              }}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors text-xs font-medium cursor-pointer shrink-0"
              title="Retour au Dashboard général"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          <NanasorePasserelleIcon pixelSize={28} className="shrink-0" />

          <span 
            className="font-semibold text-sm text-white truncate max-w-[130px] sm:max-w-[180px] lg:max-w-xs"
            title={storeDisplayName}
          >
            {storeDisplayName}
          </span>

          <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-slate-700 hidden md:inline-flex items-center gap-1 font-medium shrink-0">
            🎨 {themeDisplayName}
          </span>

          {/* Indicateur de Sauvegarde Automatique en Brouillon Bleu & Blanc */}
          <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            {autoSaveStatus?.isSaving ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>🔄 Sauvegarde du brouillon...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>☁️ Brouillon sauvegardé automatiquement {autoSaveStatus?.lastSavedTime ? `à ${autoSaveStatus.lastSavedTime}` : ''}</span>
              </>
            )}
          </div>

          {/* Le Switcher de Vue 💻 Desktop | 📱 Mobile */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-0.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onViewportChange('desktop');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                viewportMode === 'desktop'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue Bureau (100% de largeur)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Desktop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onViewportChange('mobile');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                viewportMode === 'mobile'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue Mobile (iPhone 412px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Mobile</span>
            </button>
          </div>

          {/* Boutons ↩️ Annuler (Undo) et ↪️ Rétablir (Redo) */}
          {(onUndo || onRedo) && (
            <div className="flex items-center gap-0.5 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0 ml-1">
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => {
                  playTapBeep();
                  if (onUndo) onUndo();
                }}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  canUndo
                    ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-90'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
                title="Annuler la dernière modification (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={!canRedo}
                onClick={() => {
                  playTapBeep();
                  if (onRedo) onRedo();
                }}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  canRedo
                    ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-90'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
                title="Rétablir la modification (Redo)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Zone Centrale Desktop (Les Piliers d'Action Vendeur) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Bouton Personnaliser la vitrine (Sans étoile IA) */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onToggleCustomizer();
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 cursor-pointer ${
              isCustomizerOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/50'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
            }`}
            title="Ouvrir / fermer le panneau de personnalisation en direct"
          >
            <SlidersHorizontal className={`w-4 h-4 ${isCustomizerOpen ? 'text-white' : 'text-blue-400'}`} />
            <span>Personnaliser la vitrine</span>
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1" title="Modifications en direct non publiées">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                <span>Non publié</span>
              </span>
            )}
          </button>

          {/* Bouton 💾 Mes Thèmes */}
          {onOpenPresets && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenPresets();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 px-3 sm:px-3.5 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Gérer mes variantes et sauvegardes de thèmes"
            >
              <span>💾</span>
              <span>Mes Thèmes{savedPresetsCount ? ` (${savedPresetsCount})` : ''}</span>
            </button>
          )}

          {/* Bouton 🎨 Thèmes */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenThemes();
            }}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 sm:px-3.5 py-2 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
            title="Choisir et activer un thème visuel"
          >
            <Palette className="w-4 h-4 text-blue-400" />
            <span>🎨 Thèmes</span>
          </button>

          {/* Bouton 📦 Mes Produits */}
          {onOpenQuickCatalog && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenQuickCatalog();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 sm:px-3.5 py-2 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
              title="Ouvrir le catalogue express des produits"
            >
              <Package className="w-4 h-4 text-blue-400" />
              <span>📦 Mes Produits{productCount !== undefined ? ` (${productCount})` : ''}</span>
            </button>
          )}

          {/* Bouton ➕ Nouveau Produit / Tunnel */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenAddProduct();
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 sm:px-4 py-2 rounded-lg text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Créer un nouveau produit ou tunnel de vente"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Nouveau Produit / Tunnel</span>
          </button>
        </div>

        {/* Zone Droite (Domaine Court nsore.shop & Partage) */}
        <div className="flex items-center gap-2.5 shrink-0 relative">
          <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[170px] font-sans text-slate-300">
              nsore.shop/{themePrefix}/{cleanStoreSlug}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800 cursor-pointer ml-0.5"
              title="Copier le lien nsore.shop"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyUrl}
            className="xl:hidden bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 p-2 rounded-lg cursor-pointer transition-colors"
            title="Copier le lien nsore.shop"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Bouton Sandbox Super-Admin / Prévisualisation Brouillon sans tenant */}
          <a
            href={sandboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Tester le brouillon en direct en mode Sandbox Super-Admin (ex: /et/sandbox) sans être bloqué par un tenant"
          >
            <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="hidden md:inline">🧪 Tester en direct</span>
            <span className="md:hidden">🧪 Sandbox</span>
          </a>

          <a
            href={publicShopUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Ouvrir la vitrine en direct sur nsore.shop"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">↗️ Voir en direct</span>
          </a>

          {showLocalToast && (
            <div className="absolute top-full right-0 mt-2 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>✅ Lien nsore.shop copié !</span>
            </div>
          )}
        </div>
      </div>

      {/* Ruban d'actions Mobile (Horizontalement défilable, tous les boutons 100% visibles et accessibles) */}
      <div className="md:hidden overflow-x-auto no-scrollbar flex items-center gap-2 px-3 py-2 bg-slate-900/95 border-t border-slate-800/80">
        {/* Bouton Personnaliser la vitrine */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onToggleCustomizer();
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            isCustomizerOpen
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Personnaliser</span>
          {hasUnsavedChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
          )}
        </button>

        {/* Bouton Mes Thèmes */}
        {onOpenPresets && (
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenPresets();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
          >
            <span>💾</span>
            <span>Mes Thèmes{savedPresetsCount ? ` (${savedPresetsCount})` : ''}</span>
          </button>
        )}

        {/* Bouton Thèmes */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onOpenThemes();
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
        >
          <Palette className="w-3.5 h-3.5 text-blue-400" />
          <span>Thèmes</span>
        </button>

        {/* Bouton Mes Produits */}
        {onOpenQuickCatalog && (
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenQuickCatalog();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span>Produits{productCount !== undefined ? ` (${productCount})` : ''}</span>
          </button>
        )}

        {/* Bouton Nouveau Produit / Tunnel */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onOpenAddProduct();
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-md shadow-blue-600/30 flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Produit</span>
        </button>
      </div>
    </header>
  );
};

export default VendorCommandBar;
