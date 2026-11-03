import React from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Sliders, 
  Sparkles, 
  ShoppingBag, 
  Image as ImageIcon, 
  Volume2, 
  Clock, 
  Percent, 
  Check, 
  Layers 
} from 'lucide-react';
import { CustomSectionInstance, CustomSectionType } from '../../../../types';
import { StoreProductItem } from './types';
import { ARCHITECT_MODULES } from './CustomThemeArchitectSidebar';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface CustomSectionInspectorProps {
  section: CustomSectionInstance;
  onUpdateSection: (updated: CustomSectionInstance) => void;
  onClose: () => void;
  onDeleteSection?: () => void;
  onDuplicateSection?: () => void;
  products: StoreProductItem[];
  categories: string[];
}

export const CustomSectionInspector: React.FC<CustomSectionInspectorProps> = ({
  section,
  onUpdateSection,
  onClose,
  onDeleteSection,
  onDuplicateSection,
  products = [],
  categories = []
}) => {
  const meta = ARCHITECT_MODULES.find(m => m.type === section.type);
  const cfg = section.settings || section.config || {};

  const updateSetting = (key: string, value: any) => {
    onUpdateSection({
      ...section,
      settings: {
        ...(section.settings || {}),
        [key]: value
      }
    });
  };

  const updateField = (field: keyof CustomSectionInstance, value: any) => {
    onUpdateSection({
      ...section,
      [field]: value
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none animate-in slide-in-from-right-4 duration-200">
      {/* 1. Header de l'Inspecteur avec retour direct à la liste */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Arborescence</span>
        </button>

        {/* Actions Rapides en haut */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              updateField('visible', !section.visible);
            }}
            title={section.visible ? "Masquer ce bloc" : "Afficher ce bloc"}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              section.visible ? 'text-slate-400 hover:text-white' : 'text-amber-400 bg-amber-950/40'
            }`}
          >
            {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {onDuplicateSection && (
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onDuplicateSection();
              }}
              title="Dupliquer ce bloc"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onDeleteSection && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onDeleteSection();
              }}
              title="Supprimer ce bloc"
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Badge & Identifiant du Bloc */}
      <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2.5 shrink-0">
        <span className="text-2xl">{meta?.icon || '📦'}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-black text-white truncate">
              {meta?.title || section.type}
            </h3>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
              meta?.category === 'nanasore_original'
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                : 'bg-blue-950/60 text-blue-300 border-blue-500/40'
            }`}>
              {meta?.badge || 'MODULE'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            ID: {section.id}
          </p>
        </div>
      </div>

      {/* 3. Formulaire de Configuration */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-left scrollbar-thin">
        {/* GROUPE 1 : PARAMÈTRES GÉNÉRAUX DE LA SECTION */}
        <div className="space-y-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-wider text-[10px]">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Réglages Généraux</span>
          </div>

          {/* Titre */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">
              Titre du Bloc :
            </label>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ex: La Révolution de Votre Quotidien"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Sous-titre */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">
              Sous-titre / Badge Supérieur :
            </label>
            <input
              type="text"
              value={section.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="Ex: ÉDITION LIMITÉE • DISPONIBLE EN 24H"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Style de Fond */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">
              Ambiance d'Arrière-Plan :
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'default', label: 'Défaut Thème' },
                { id: 'surface', label: 'Surface Contrastée' },
                { id: 'accent_gradient', label: 'Dégradé Accent' },
                { id: 'dark_glass', label: 'Dark Glassmorphism' }
              ].map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    updateField('backgroundStyle', bg.id);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer ${
                    (section.backgroundStyle || 'default') === bg.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Espacement Vertical */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">
              Espacement Vertical (Padding) :
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sm', label: 'Compact' },
                { id: 'md', label: 'Normal' },
                { id: 'lg', label: 'Aéré' }
              ].map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    updateField('spacingTop', sp.id);
                    updateField('spacingBottom', sp.id);
                  }}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                    (section.spacingTop || 'md') === sp.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GROUPE 2 : RÉGLAGES SPÉCIFIQUES SELON LE TYPE DE MODULE */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-wider text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Options Spécifiques du Bloc</span>
          </div>

          {/* A. BENTO HERO */}
          {(section.type === 'bento_hero' || section.type === 'hero_split_banner') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Disposition Bento :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bento_3_cards', label: '3 Cartes (70/30)' },
                    { id: 'split_cinema', label: 'Split Cinéma' },
                    { id: 'center_minimal', label: 'Centré Minimal' }
                  ].map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('layout', l.id);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold transition cursor-pointer text-center ${
                        (cfg.layout || 'bento_3_cards') === l.id
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Produit vedette */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit Vedette Principal :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              {/* Bouton CTA */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Texte du Bouton d'Action :</label>
                <input
                  type="text"
                  value={cfg.ctaText || 'Commander maintenant'}
                  onChange={(e) => updateSetting('ctaText', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>

              {/* Surlignage de Prix */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Texte Surligné de Prix :</label>
                <input
                  type="text"
                  value={cfg.priceHighlight || ''}
                  onChange={(e) => updateSetting('priceHighlight', e.target.value)}
                  placeholder="Ex: À partir de 15 000 FCFA"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>
            </div>
          )}

          {/* B. FLASH DEAL VAULT */}
          {(section.type === 'flash_deal_vault' || section.type === 'spotlight_deal_countdown') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit en Vente Flash :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Durée Chrono (Heures) :</label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={cfg.countdownHours || 12}
                    onChange={(e) => updateSetting('countdownHours', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Stock Restant Affiché :</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={cfg.stockLeft || 7}
                    onChange={(e) => updateSetting('stockLeft', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* C. NOTE VOCALE DU FONDATEUR (EXCLUSIVITÉ NANASORE) */}
          {section.type === 'voice_note_pitch' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit Recommandé dans l'Audio :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Nom de l'Auteur :</label>
                  <input
                    type="text"
                    value={cfg.founderName || 'Mamadou K. • Fondateur'}
                    onChange={(e) => updateSetting('founderName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Durée Affichée :</label>
                  <input
                    type="text"
                    value={cfg.durationLabel || '0:38'}
                    onChange={(e) => updateSetting('durationLabel', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">URL Audio MP3 (Optionnel) :</label>
                <input
                  type="url"
                  value={cfg.audioUrl || ''}
                  onChange={(e) => updateSetting('audioUrl', e.target.value)}
                  placeholder="https://... (laisser vide pour synthèse vocale)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Script du Pitch Vocal (Synthèse vocale IA) :</label>
                <textarea
                  rows={4}
                  value={cfg.pitchScript || ''}
                  onChange={(e) => updateSetting('pitchScript', e.target.value)}
                  placeholder="Texte lu avec fluidité en français si aucun fichier audio MP3 n'est configuré..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* D. LIVE HAGGLE OFFER (NÉGOCIATEUR FLASH IA) */}
          {section.type === 'live_haggle_offer' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit à Négocier :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Remise Plancher Max (%) :</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={cfg.floorDiscountPercent || 15}
                    onChange={(e) => updateSetting('floorDiscountPercent', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Seuil secret validé par le système</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Timer de Réservation (Min) :</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={cfg.timerMinutes || 10}
                    onChange={(e) => updateSetting('timerMinutes', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Temps alloué pour commander</span>
                </div>
              </div>
            </div>
          )}

          {/* E. BEFORE AFTER SLIDER */}
          {section.type === 'before_after_slider' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit Lié au Résultat :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">URL Image "AVANT" :</label>
                <input
                  type="url"
                  value={cfg.beforeImage || ''}
                  onChange={(e) => updateSetting('beforeImage', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">URL Image "APRÈS" :</label>
                <input
                  type="url"
                  value={cfg.afterImage || ''}
                  onChange={(e) => updateSetting('afterImage', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Libellé Avant :</label>
                  <input
                    type="text"
                    value={cfg.beforeLabel || 'AVANT (Sans le produit)'}
                    onChange={(e) => updateSetting('beforeLabel', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Libellé Après :</label>
                  <input
                    type="text"
                    value={cfg.afterLabel || 'APRÈS (Résultat visible)'}
                    onChange={(e) => updateSetting('afterLabel', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* F. INTERACTIVE BUNDLE LAB */}
          {section.type === 'interactive_bundle_lab' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Remise 2 Articles (%) :</label>
                  <input
                    type="number"
                    min={5}
                    max={25}
                    value={cfg.discountTier2 || 10}
                    onChange={(e) => updateSetting('discountTier2', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Remise 3 Articles (%) :</label>
                  <input
                    type="number"
                    min={10}
                    max={40}
                    value={cfg.discountTier3 || 20}
                    onChange={(e) => updateSetting('discountTier3', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Libellé Cadeau VIP Offert :</label>
                <input
                  type="text"
                  value={cfg.giftLabel || '🎁 Cadeau Surprise VIP Offert (Échantillon / Accessoire)'}
                  onChange={(e) => updateSetting('giftLabel', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>
            </div>
          )}

          {/* G. VIP MYSTERY SCRATCH */}
          {section.type === 'vip_mystery_scratch' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Produit Vedette du Tirage :</label>
                <select
                  value={cfg.productId || products[0]?.id || ''}
                  onChange={(e) => updateSetting('productId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Remise Débloquée (%) :</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={cfg.discountPercent || 15}
                    onChange={(e) => updateSetting('discountPercent', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Code Privilège Affiché :</label>
                  <input
                    type="text"
                    value={cfg.privilegeCode || 'VIP-CHANCE15'}
                    onChange={(e) => updateSetting('privilegeCode', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* H. SMART MASONRY GRID */}
          {(section.type === 'smart_masonry_grid' || section.type === 'product_grid_custom') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nombre de Colonnes :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('columns', c);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        (Number(cfg.columns) || 3) === c
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {c} Colonnes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Style Graphique des Cartes :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bordered', label: 'Bordé' },
                    { id: 'minimal', label: 'Minimal' },
                    { id: 'glass', label: 'Glass' }
                  ].map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('cardStyle', cs.id);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        (cfg.cardStyle || 'bordered') === cs.id
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {cs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-300">Barre de Recherche en Direct :</span>
                <input
                  type="checkbox"
                  checked={cfg.showSearch !== false}
                  onChange={(e) => updateSetting('showSearch', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Commutateur Carrousel Infini Sens Contraire (Couches de 5) */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>🎠</span> Double Carrousel Infini (Couches de 5)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Défilement continu des couches de 5 en sens alternés (⬅️ / ➡️)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cfg.enableCounterCarousel !== false}
                    onChange={(e) => updateSetting('enableCounterCarousel', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                  />
                </div>

                {cfg.enableCounterCarousel !== false && (
                  <div className="space-y-3 pt-2.5 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Nombre de Couches de 5 Produits :
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 2, label: '2 (5x2)' },
                          { id: 3, label: '3 (5x3)' },
                          { id: 4, label: '4 (5x4)' },
                          { id: 'auto', label: 'Auto' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselRowsCount', opt.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselRowsCount || 2) === opt.id
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Vitesse de Défilement :
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'slow', label: 'Douce (55s)' },
                          { id: 'normal', label: 'Normale (40s)' },
                          { id: 'fast', label: 'Rapide (28s)' }
                        ].map(spd => (
                          <button
                            key={spd.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselSpeed', spd.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselSpeed || 'normal') === spd.id
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {spd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* H2. GRILLE COSMÉTIQUE GLOWING */}
          {section.type === 'glowing_cosmetics_grid' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nombre de Colonnes (Bureau) :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('columns', c);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        (Number(cfg.columns) || 4) === c
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {c} Colonnes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Catégorie Ciblée :</label>
                <select
                  value={cfg.category || 'Tous les produits'}
                  onChange={(e) => updateSetting('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  <option value="Tous les produits">Tous les produits</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-300">Badges "New" &amp; "Sale" :</span>
                <input
                  type="checkbox"
                  checked={cfg.showBadges !== false}
                  onChange={(e) => updateSetting('showBadges', e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-300">Pastilles de Teintes / Nuances :</span>
                <input
                  type="checkbox"
                  checked={cfg.showColorSwatches !== false}
                  onChange={(e) => updateSetting('showColorSwatches', e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Commutateur Carrousel Infini Sens Contraire (Couches de 5) pour Glowing */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>🎠</span> Double Carrousel Infini (Couches de 5)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Défilement continu des couches de 5 en sens alternés (⬅️ / ➡️)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cfg.enableCounterCarousel !== false}
                    onChange={(e) => updateSetting('enableCounterCarousel', e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </div>

                {cfg.enableCounterCarousel !== false && (
                  <div className="space-y-3 pt-2.5 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Nombre de Couches de 5 Produits :
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 2, label: '2 (5x2)' },
                          { id: 3, label: '3 (5x3)' },
                          { id: 4, label: '4 (5x4)' },
                          { id: 'auto', label: 'Auto' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselRowsCount', opt.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselRowsCount || 2) === opt.id
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Vitesse de Défilement :
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'slow', label: 'Douce (55s)' },
                          { id: 'normal', label: 'Normale (40s)' },
                          { id: 'fast', label: 'Rapide (28s)' }
                        ].map(spd => (
                          <button
                            key={spd.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselSpeed', spd.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselSpeed || 'normal') === spd.id
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {spd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* H3. GRILLE PRODUITS NUMÉRIQUES & FORMATIONS (1080x1080) */}
          {section.type === 'digital_square_grid' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-2.5">
                <span className="text-xl">🎓</span>
                <div className="text-xs">
                  <p className="font-bold text-blue-200">Mode Digital &amp; Masterclass</p>
                  <p className="text-slate-400">Affiches 1080×1080, Vue Vidéo &amp; Compte à Rebours Bleu Royal</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nombre de Colonnes (Grille Statique) :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('columns', c);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        (Number(cfg.columns) || 3) === c
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {c} Colonnes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Catégorie Ciblée :</label>
                <select
                  value={cfg.category || 'Tous les produits'}
                  onChange={(e) => updateSetting('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none focus:border-blue-500"
                >
                  <option value="Tous les produits">Tous les produits</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Titre & Durée du Compte à Rebours */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <label className="text-slate-300 font-bold block text-xs flex items-center gap-1.5">
                  <span>⏱️</span> Texte du Compte à Rebours :
                </label>
                <input
                  type="text"
                  value={cfg.countdownTitle || '⏳ Offre & Accès Prioritaire expirent dans :'}
                  onChange={(e) => updateSetting('countdownTitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-blue-500"
                  placeholder="ex: ⏳ Offre Spéciale se termine dans :"
                />

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Durée du Chrono (Heures) :</span>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={cfg.countdownHours || 24}
                    onChange={(e) => updateSetting('countdownHours', Number(e.target.value) || 24)}
                    className="w-20 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs text-center font-bold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Commutateur Carrousel Infini Sens Contraire (Couches de 5) pour Digital Square */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>🎠</span> Double Carrousel Infini (Couches de 5)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Défilement continu des couches de 5 en sens alternés (⬅️ / ➡️)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cfg.enableCounterCarousel !== false}
                    onChange={(e) => updateSetting('enableCounterCarousel', e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded cursor-pointer shrink-0"
                  />
                </div>

                {cfg.enableCounterCarousel !== false && (
                  <div className="space-y-3 pt-2.5 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Nombre de Couches de 5 Affiches :
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 2, label: '2 (5x2)' },
                          { id: 3, label: '3 (5x3)' },
                          { id: 4, label: '4 (5x4)' },
                          { id: 'auto', label: 'Auto' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselRowsCount', opt.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselRowsCount || 2) === opt.id
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Vitesse de Défilement :
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'slow', label: 'Douce (55s)' },
                          { id: 'normal', label: 'Normale (40s)' },
                          { id: 'fast', label: 'Rapide (28s)' }
                        ].map(spd => (
                          <button
                            key={spd.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateSetting('carouselSpeed', spd.id);
                            }}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer text-center ${
                              (cfg.carouselSpeed || 'normal') === spd.id
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {spd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* H4. STUDIO LIVE OS, WEBINAIRE & COACHING 1-TO-1 */}
          {section.type === 'omni_live_studio' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-2.5">
                <span className="text-xl">🔴</span>
                <div className="text-xs">
                  <p className="font-bold text-blue-200">Nanasore Live Studio OS</p>
                  <p className="text-slate-400">Lecteur Caméléon, WebRTC &amp; Vente en Direct</p>
                </div>
              </div>

              {/* Mode de Session */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">Mode de la Session Live :</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'live_shopping', label: '🛍️ Live Shopping' },
                    { id: 'webinar_training', label: '🎓 Webinaire' },
                    { id: 'coaching_1to1', label: '🤝 Coaching 1-to-1' },
                    { id: 'interactive_class', label: '🏫 Classe Groupe' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('sessionMode', m.id);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition cursor-pointer text-left ${
                        (cfg.sessionMode || 'live_shopping') === m.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Caméléon par défaut */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">Format Caméléon Initial :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '16:9', label: '📺 16:9 Cinéma' },
                    { id: '9:16', label: '📱 9:16 Mobile' },
                    { id: '1:1', label: '⬛ 1:1 Carré' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateSetting('aspectRatio', r.id);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        (cfg.aspectRatio || '16:9') === r.id
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL du flux en direct */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  Lien du Stream (YouTube Live, FB, Twitch ou MP4) :
                </label>
                <input
                  type="text"
                  value={cfg.streamUrl || ''}
                  onChange={(e) => updateSetting('streamUrl', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-blue-500 font-mono"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-[10px] text-slate-400">
                  Laissez vide pour utiliser la caméra native WebRTC en 1 clic.
                </p>
              </div>

              {/* Titre du compte à rebours */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  Texte du Compte à Rebours du Live :
                </label>
                <input
                  type="text"
                  value={cfg.countdownTitle || '⏳ Tarif Flash du Direct garanti pendant :'}
                  onChange={(e) => updateSetting('countdownTitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Produit Épinglé Par Défaut */}
              {products && products.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block text-xs">
                    📌 Produit Flash Épinglé par Défaut :
                  </label>
                  <select
                    value={cfg.pinnedProductId || ''}
                    onChange={(e) => updateSetting('pinnedProductId', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-blue-500"
                  >
                    <option value="">Aucun produit épinglé</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lien Unique Nanasore & Accès Direct à la Salle */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">🔗 Lien Unique Nanasore Live :</span>
                  <span className="text-[10px] text-blue-400 font-bold">1-Clic Partageable</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://nsore.shop'}/live/${cfg.sessionSlug || 'masterclass-direct'}`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black text-slate-300 text-[11px] font-mono border border-slate-800 select-all"
                  />
                  <a
                    href={`/live/${cfg.sessionSlug || 'masterclass-direct'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/30 shrink-0"
                  >
                    Ouvrir la Salle 🚀
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* I. SPOTIFY SHELF */}
          {(section.type === 'spotify_shelf' || section.type === 'spotify_product_shelf') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Catégorie / Rayon Initial :</label>
                <select
                  value={cfg.category || 'Tous les produits'}
                  onChange={(e) => updateSetting('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* J. BRAND STORY */}
          {(section.type === 'parallax_brand_story' || section.type === 'rich_story_banner') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Citation du Fondateur :</label>
                <textarea
                  rows={2}
                  value={cfg.quote || ''}
                  onChange={(e) => updateSetting('quote', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nom & Titre de Signature :</label>
                <input
                  type="text"
                  value={cfg.founderName || ''}
                  onChange={(e) => updateSetting('founderName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">URL Image Encadrée :</label>
                <input
                  type="url"
                  value={cfg.imageUrl || ''}
                  onChange={(e) => updateSetting('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>
            </div>
          )}

          {/* K. SMART FAQ CONCIERGE */}
          {(section.type === 'smart_faq_concierge' || section.type === 'faq_accordion_section') && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Numéro WhatsApp du Concierge :</label>
                <input
                  type="text"
                  value={cfg.whatsappPhone || ''}
                  onChange={(e) => updateSetting('whatsappPhone', e.target.value)}
                  placeholder="+225 07..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomSectionInspector;
