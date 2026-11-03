import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Save, 
  RotateCcw, 
  Trash2, 
  Download, 
  Upload, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Layers, 
  Palette, 
  ShieldCheck, 
  FileText,
  AlertCircle,
  Copy,
  Edit2
} from 'lucide-react';
import { ThemeCustomizationConfig, SavedThemePreset } from '../../../../types';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface ThemePresetsAndDraftManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentConfig: ThemeCustomizationConfig;
  onApplyPreset: (preset: SavedThemePreset) => void;
  onSavePresetsList?: (presets: SavedThemePreset[]) => void;
  storeSlug?: string;
  storeId?: string;
  isInline?: boolean;
  onToast?: (message: string) => void;
}

// 3 Slots de Variantes Rapides par défaut
const DEFAULT_THEME_SLOTS = [
  { id: 'slot_1_main', defaultName: '🏪 Mon Thème Principal (Normal)', icon: '🏪' },
  { id: 'slot_2_promo', defaultName: '🔥 Mon Thème Promo / Fêtes', icon: '🔥' },
  { id: 'slot_3_live', defaultName: '🔴 Mon Thème Live Shopping', icon: '🔴' }
];

export const ThemePresetsAndDraftManager: React.FC<ThemePresetsAndDraftManagerProps> = ({
  isOpen = true,
  onClose,
  currentConfig,
  onApplyPreset,
  onSavePresetsList,
  storeSlug = 'boutique',
  storeId = 'store-boutique',
  isInline = false,
  onToast
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newThemeName, setNewThemeName] = useState<string>('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);

  // Clé de stockage locale
  const storageKey = useMemo(() => {
    return `nanasore_saved_presets_${storeId || storeSlug}`;
  }, [storeId, storeSlug]);

  // Initialisation et persistance des presets
  const [presets, setPresets] = useState<SavedThemePreset[]>(() => {
    if (currentConfig.savedPresets && currentConfig.savedPresets.length > 0) {
      return currentConfig.savedPresets;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Synchronisation avec currentConfig.savedPresets si mis à jour depuis le cloud
  useEffect(() => {
    if (currentConfig.savedPresets && currentConfig.savedPresets.length > 0) {
      setPresets(currentConfig.savedPresets);
    }
  }, [currentConfig.savedPresets]);

  // Sauvegarde globale de la liste
  const persistPresets = useCallback((newList: SavedThemePreset[]) => {
    setPresets(newList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newList));
      } catch (err) {
        console.warn('Erreur persistance presets localStorage:', err);
      }
    }
    if (onSavePresetsList) {
      onSavePresetsList(newList);
    }
  }, [storageKey, onSavePresetsList]);

  // Toast éphémère local
  const showFeedback = useCallback((msg: string, success = true) => {
    setStatusMessage(msg);
    setIsSuccess(success);
    if (onToast) onToast(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }, [onToast]);

  // Création d'un instantané propre depuis la configuration actuelle
  const createCurrentSnapshot = useCallback((name: string, customId?: string): SavedThemePreset => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const sections = (currentConfig.customSections as any[]) || [];

    return {
      id: customId || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      savedAt: formattedDate,
      createdAt: now.toISOString(),
      headerStyle: currentConfig.headerStyle || 'mega_hub_marketplace',
      footerStyle: currentConfig.footerStyle || 'bento_map_trust_footer',
      customMood: currentConfig.customMood?.presetId || 'sapphire-pure',
      sectionsCount: sections.length,
      configSnapshot: JSON.parse(JSON.stringify(currentConfig)),
      config: JSON.parse(JSON.stringify(currentConfig)),
      sections: JSON.parse(JSON.stringify(sections)),
      description: `${sections.length} modules • En-tête ${currentConfig.headerStyle || 'standard'} • Footer ${currentConfig.footerStyle || 'standard'}`
    };
  }, [currentConfig]);

  // Action : Sauvegarder dans un des 3 Slots Rapides (Écraser ou Créer)
  const handleSaveToSlot = useCallback((slotId: string, defaultName: string) => {
    playValidationBeep();
    const existingIndex = presets.findIndex(p => p.id === slotId);
    const targetName = existingIndex >= 0 ? presets[existingIndex].name : defaultName;
    const newPreset = createCurrentSnapshot(targetName, slotId);

    let updated: SavedThemePreset[];
    if (existingIndex >= 0) {
      updated = [...presets];
      updated[existingIndex] = newPreset;
    } else {
      updated = [newPreset, ...presets];
    }

    persistPresets(updated);
    showFeedback(`✅ Thème enregistré dans : ${targetName}`);
  }, [presets, createCurrentSnapshot, persistPresets, showFeedback]);

  // Action : Enregistrer une nouvelle variante personnalisée
  const handleSaveNewCustomTheme = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newThemeName.trim()) return;

    playValidationBeep();
    const newPreset = createCurrentSnapshot(newThemeName.trim());
    const updated = [newPreset, ...presets];
    persistPresets(updated);
    setNewThemeName('');
    showFeedback(`💾 Thème "${newPreset.name}" sauvegardé avec succès !`);
  }, [newThemeName, createCurrentSnapshot, presets, persistPresets, showFeedback]);

  // Action : Activer en 1 clic
  const handleApply = useCallback((preset: SavedThemePreset) => {
    playValidationBeep();
    onApplyPreset(preset);
    showFeedback(`⚡ Thème "${preset.name}" activé dans le Studio !`);
    if (onClose && !isInline) {
      onClose();
    }
  }, [onApplyPreset, showFeedback, onClose, isInline]);

  // Action : Supprimer un preset
  const handleDelete = useCallback((presetId: string, presetName: string) => {
    playTapBeep();
    const updated = presets.filter(p => p.id !== presetId);
    persistPresets(updated);
    showFeedback(`🗑️ Thème "${presetName}" supprimé`);
  }, [presets, persistPresets, showFeedback]);

  // Action : Renommer un preset
  const handleStartRename = useCallback((preset: SavedThemePreset) => {
    playTapBeep();
    setEditingPresetId(preset.id);
    setEditingNameValue(preset.name);
  }, []);

  const handleSaveRename = useCallback((presetId: string) => {
    playValidationBeep();
    if (!editingNameValue.trim()) {
      setEditingPresetId(null);
      return;
    }
    const updated = presets.map(p => p.id === presetId ? { ...p, name: editingNameValue.trim() } : p);
    persistPresets(updated);
    setEditingPresetId(null);
    showFeedback(`✏️ Renommé en "${editingNameValue.trim()}"`);
  }, [editingNameValue, presets, persistPresets, showFeedback]);

  // Action : 📥 Export du Thème en JSON
  const handleExportJson = useCallback(() => {
    playTapBeep();
    try {
      const exportData = {
        nanasoreVersion: '2.0',
        exportedAt: new Date().toISOString(),
        storeSlug,
        themeConfig: currentConfig
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nanasore-theme-${storeSlug || 'boutique'}-${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showFeedback('📥 Fichier thème .json téléchargé avec succès !');
    } catch (err) {
      console.error('Erreur export JSON:', err);
      showFeedback('Erreur lors de l\'export du fichier', false);
    }
  }, [storeSlug, currentConfig, showFeedback]);

  // Action : 📤 Import d'un Thème depuis un JSON
  const handleImportJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const importedConfig = parsed.themeConfig || parsed;

        if (!importedConfig || typeof importedConfig !== 'object') {
          throw new Error('Format de fichier invalide');
        }

        const importedPreset: SavedThemePreset = {
          id: `imported_${Date.now()}`,
          name: `📤 Thème Importé (${file.name.replace(/\.json$/i, '')})`,
          savedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
          headerStyle: importedConfig.headerStyle || 'mega_hub_marketplace',
          footerStyle: importedConfig.footerStyle || 'bento_map_trust_footer',
          customMood: importedConfig.customMood?.presetId || 'sapphire-pure',
          sectionsCount: (importedConfig.customSections || []).length,
          configSnapshot: importedConfig,
          config: importedConfig,
          sections: importedConfig.customSections || []
        };

        const updated = [importedPreset, ...presets];
        persistPresets(updated);
        onApplyPreset(importedPreset);
        showFeedback(`🎉 Thème "${importedPreset.name}" importé et activé !`);
      } catch (err) {
        console.error('Erreur import fichier JSON:', err);
        showFeedback('Fichier .json corrompu ou invalide', false);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [presets, persistPresets, onApplyPreset, showFeedback]);

  if (!isOpen && !isInline) return null;

  // =========================================================================
  // 2. RENDU DU PANNEAU (BLANC PUR & BLEU ROYAL NANASORE)
  // =========================================================================

  const content = (
    <div className="space-y-4">
      {/* Toast Feedback interne */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-150 ${
          isSuccess 
            ? 'bg-blue-50 text-blue-800 border-blue-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {isSuccess ? <Check className="w-4 h-4 text-blue-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 1. LES 3 SLOTS DE VARIANTES RAPIDES */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>Mes 3 Thèmes Rapides de Saison</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">1 Clic pour basculer</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {DEFAULT_THEME_SLOTS.map((slot) => {
            const existing = presets.find(p => p.id === slot.id);
            const isPopulated = Boolean(existing);

            return (
              <div
                key={slot.id}
                className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                  isPopulated 
                    ? 'bg-white border-blue-200 shadow-sm' 
                    : 'bg-slate-50 border-dashed border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{slot.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {existing?.name || slot.defaultName}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {isPopulated ? `Enregistré le ${existing?.savedAt}` : 'Slot vide • Enregistrez votre design actuel'}
                      </p>
                    </div>
                  </div>

                  {isPopulated && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Prêt
                    </span>
                  )}
                </div>

                {/* Badges du contenu si enregistré */}
                {existing && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      📦 {existing.sectionsCount} Modules
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[150px]">
                      En-tête: {existing.headerStyle || 'standard'}
                    </span>
                  </div>
                )}

                {/* Boutons d'Action du Slot */}
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                  {isPopulated ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApply(existing!)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-2 px-3 rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Activer ce thème immédiatement"
                      >
                        <span>⚡ Activer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveToSlot(slot.id, slot.defaultName)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 px-2.5 rounded-xl border border-blue-200 active:scale-95 transition flex items-center gap-1 cursor-pointer"
                        title="Écraser ce slot avec le design en cours"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mettre à jour</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveToSlot(slot.id, slot.defaultName)}
                      className="w-full bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-xs font-bold py-2 px-3 rounded-xl border border-blue-300 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>💾 Enregistrer mon design ici</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. FORMULAIRE : ENREGISTRER SOUS UN NOUVEAU NOM */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
        <label className="text-[11px] font-black uppercase text-blue-700 block mb-1.5">
          💾 Sauvegarder cette version comme nouveau Thème
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="Ex : Campagne Ramadan, Black Friday..."
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-blue-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewCustomTheme();
            }}
          />
          <button
            type="button"
            onClick={() => handleSaveNewCustomTheme()}
            disabled={!newThemeName.trim()}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              newThemeName.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sauvegarder</span>
          </button>
        </div>
      </div>

      {/* 3. LISTE DES SAUVEGARDES PERSONNALISÉES & HISTORIQUE */}
      {presets.filter(p => !DEFAULT_THEME_SLOTS.some(s => s.id === p.id)).length > 0 && (
        <div>
          <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block mb-2">
            📂 Autres Thèmes Enregistrés ({presets.filter(p => !DEFAULT_THEME_SLOTS.some(s => s.id === p.id)).length})
          </span>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {presets
              .filter(p => !DEFAULT_THEME_SLOTS.some(s => s.id === p.id))
              .map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    {editingPresetId === preset.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-blue-400 text-xs font-bold text-slate-900 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(preset.id);
                            if (e.key === 'Escape') setEditingPresetId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(preset.id)}
                          className="p-1 rounded bg-blue-600 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {preset.name}
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleStartRename(preset)}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Renommer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {preset.savedAt} • {preset.sectionsCount} modules
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApply(preset)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
                    >
                      ⚡ Activer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id, preset.name)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. IMPORT & EXPORT JSON (BACKUP EXTERNE) */}
      <div className="pt-3 border-t border-slate-200">
        <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider block mb-2">
          📦 Sauvegarde & Partage Externe (.json)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Télécharger une copie de secours sur votre appareil"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>📥 Exporter (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Charger un fichier de thème sauvegardé"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>📤 Importer (.json)</span>
          </button>
        </div>

        {/* Input fichier caché pour l'import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJson}
          className="hidden"
        />
      </div>
    </div>
  );

  // Rendu en mode inline (dans la sidebar)
  if (isInline) {
    return (
      <div className="p-4 bg-white text-slate-900 rounded-3xl border border-blue-100 shadow-md">
        {content}
      </div>
    );
  }

  // Rendu en mode modale (depuis le bouton de la VendorCommandBar)
  return (
    <div className="fixed inset-0 z-[5000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl border border-blue-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header de la Modale */}
        <div className="p-4 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-600/30">
              💾
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                Mes Thèmes & Variantes Sauvegardées
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Brouillon automatique & protection anti-perte
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de la modale défilant */}
        <div className="p-5 overflow-y-auto flex-1">
          {content}
        </div>
      </div>
    </div>
  );
};

export default ThemePresetsAndDraftManager;
