import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RefreshCw, 
  Search, 
  Check, 
  X, 
  HelpCircle, 
  AlertCircle, 
  CheckCheck, 
  ArrowUpDown,
  ShoppingBag,
  GraduationCap,
  CreditCard,
  Sparkles,
  ChevronDown,
  Layers,
  Crown
} from 'lucide-react';
import { 
  ComparisonFeatureItem, 
  ComparisonCategoryKey, 
  COMPARISON_CATEGORIES, 
  DEFAULT_COMPARISON_MATRIX, 
  subscribeToComparisonMatrix, 
  saveComparisonMatrix 
} from '../../data/comparisonMatrixData';
import { ProCrownIcon } from '../../components/common/ProFeatureGuard';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface ComparisonMatrixAdminTabProps {
  currentUserEmail?: string;
}

export const ComparisonMatrixAdminTab: React.FC<ComparisonMatrixAdminTabProps> = ({
  currentUserEmail
}) => {
  const [features, setFeatures] = useState<ComparisonFeatureItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Modale d'ajout / modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComparisonFeatureItem | null>(null);

  // Formulaire d'édition / création
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ComparisonCategoryKey>('ecommerce');
  const [formIsVipCrown, setFormIsVipCrown] = useState(false);
  const [formTooltip, setFormTooltip] = useState('');
  
  // Types des valeurs par plan ('boolean' | 'text')
  const [formFreeType, setFormFreeType] = useState<'boolean' | 'text'>('boolean');
  const [formFreeBool, setFormFreeBool] = useState(false);
  const [formFreeText, setFormFreeText] = useState('3 produits');

  const [formStarterType, setFormStarterType] = useState<'boolean' | 'text'>('boolean');
  const [formStarterBool, setFormStarterBool] = useState(true);
  const [formStarterText, setFormStarterText] = useState('Illimité');

  const [formProType, setFormProType] = useState<'boolean' | 'text'>('boolean');
  const [formProBool, setFormProBool] = useState(true);
  const [formProText, setFormProText] = useState('Illimité');

  const [formEliteType, setFormEliteType] = useState<'boolean' | 'text'>('boolean');
  const [formEliteBool, setFormEliteBool] = useState(true);
  const [formEliteText, setFormEliteText] = useState('Illimité');

  // Chargement en temps réel depuis Firestore
  useEffect(() => {
    const unsub = subscribeToComparisonMatrix((matrix) => {
      setFeatures(matrix);
    });
    return () => unsub();
  }, []);

  // Filtrage et recherche
  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const matchCat = selectedCategoryFilter === 'ALL' || feat.category === selectedCategoryFilter;
      const matchSearch = searchQuery.trim() === '' || 
        String(feat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (feat.tooltip && String(feat.tooltip).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [features, selectedCategoryFilter, searchQuery]);

  // Ouverture modale en mode Création
  const handleOpenCreateModal = () => {
    playTapBeep();
    setEditingItem(null);
    setFormName('');
    setFormCategory('ecommerce');
    setFormIsVipCrown(false);
    setFormTooltip('');

    setFormFreeType('boolean');
    setFormFreeBool(false);
    setFormFreeText('1');

    setFormStarterType('boolean');
    setFormStarterBool(true);
    setFormStarterText('Illimité');

    setFormProType('boolean');
    setFormProBool(true);
    setFormProText('Illimité');

    setFormEliteType('boolean');
    setFormEliteBool(true);
    setFormEliteText('Illimité');

    setIsModalOpen(true);
  };

  // Ouverture modale en mode Modification
  const handleOpenEditModal = (item: ComparisonFeatureItem) => {
    playTapBeep();
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormIsVipCrown(!!item.isVipCrown);
    setFormTooltip(item.tooltip || '');

    if (typeof item.free === 'boolean') {
      setFormFreeType('boolean');
      setFormFreeBool(item.free);
      setFormFreeText('1');
    } else {
      setFormFreeType('text');
      setFormFreeBool(false);
      setFormFreeText(item.free);
    }

    if (typeof item.starter === 'boolean') {
      setFormStarterType('boolean');
      setFormStarterBool(item.starter);
      setFormStarterText('Illimité');
    } else {
      setFormStarterType('text');
      setFormStarterBool(false);
      setFormStarterText(item.starter);
    }

    if (typeof item.pro === 'boolean') {
      setFormProType('boolean');
      setFormProBool(item.pro);
      setFormProText('Illimité');
    } else {
      setFormProType('text');
      setFormProBool(false);
      setFormProText(item.pro);
    }

    if (typeof item.elite === 'boolean') {
      setFormEliteType('boolean');
      setFormEliteBool(item.elite);
      setFormEliteText('Illimité');
    } else {
      setFormEliteType('text');
      setFormEliteBool(false);
      setFormEliteText(item.elite);
    }

    setIsModalOpen(true);
  };

  // Enregistrement formulaire modal
  const handleSaveModalItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Veuillez spécifier le nom de la fonctionnalité.');
      return;
    }

    const freeVal = formFreeType === 'boolean' ? formFreeBool : formFreeText.trim();
    const starterVal = formStarterType === 'boolean' ? formStarterBool : formStarterText.trim();
    const proVal = formProType === 'boolean' ? formProBool : formProText.trim();
    const eliteVal = formEliteType === 'boolean' ? formEliteBool : formEliteText.trim();

    if (editingItem) {
      // Modification
      setFeatures(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formName.trim(),
            category: formCategory,
            isVipCrown: formIsVipCrown,
            tooltip: formTooltip.trim() || undefined,
            free: freeVal,
            starter: starterVal,
            pro: proVal,
            elite: eliteVal
          };
        }
        return item;
      }));
    } else {
      // Nouvelle entrée
      const newItem: ComparisonFeatureItem = {
        id: `feat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: formName.trim(),
        category: formCategory,
        isVipCrown: formIsVipCrown,
        tooltip: formTooltip.trim() || undefined,
        free: freeVal,
        starter: starterVal,
        pro: proVal,
        elite: eliteVal
      };
      setFeatures(prev => [...prev, newItem]);
    }

    playValidationBeep();
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Suppression d'une fonctionnalité
  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Confirmez-vous la suppression de la fonctionnalité "${name}" de la matrice ?`)) {
      playTapBeep();
      setFeatures(prev => prev.filter(item => item.id !== id));
    }
  };

  // Bascule rapide Couronne VIP directement sur la ligne
  const handleToggleVipCrown = (id: string) => {
    playTapBeep();
    setFeatures(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isVipCrown: !item.isVipCrown };
      }
      return item;
    }));
  };

  // Sauvegarde globale sur Firestore
  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      await saveComparisonMatrix(features, currentUserEmail);
      playValidationBeep();
      setSaveSuccessMessage('✓ Matrice de comparaison sauvegardée avec succès sur Firestore !');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erreur sauvegarde matrice storage :', err);
      alert("Erreur lors de la sauvegarde sur Firestore : " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialisation aux valeurs d'origine
  const handleResetToDefault = () => {
    if (confirm('Voulez-vous réinitialiser toute la matrice aux valeurs par défaut de comparisonMatrixData.ts ?')) {
      playValidationBeep();
      setFeatures(DEFAULT_COMPARISON_MATRIX);
      setSaveSuccessMessage('Matrice réinitialisée aux valeurs par défaut. Pensez à enregistrer.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          EN-TÊTE DU GESTIONNAIRE
         ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Espace Super Admin
            </span>
            <span className="text-xs text-slate-400">• Base : Supabase & Cache Local</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <span>Gestionnaire de la Matrice de Comparaison PLG</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Modifiez, ajoutez ou supprimez les fonctionnalités affichées dans le comparateur détaillé sous les cartes de prix. 
            Les modifications sont publiées instantanément sur l'ensemble de l'application sans recompiler.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            title="Restaurer la liste originelle"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Réinitialiser par défaut</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une fonctionnalité</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveToFirestore}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la matrice'}</span>
          </button>
        </div>
      </div>

      {/* Message de succès */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* =========================================================================
          BARRE D'OUTILS : FILTRES PAR CATÉGORIE & RECHERCHE
         ========================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        {/* Onglets Filtres Catégories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => { playTapBeep(); setSelectedCategoryFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Toutes ({features.length})
          </button>

          {COMPARISON_CATEGORIES.map((cat) => {
            const count = features.filter(f => f.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { playTapBeep(); setSelectedCategoryFilter(cat.id); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.title.split('&')[0].trim()} ({count})
              </button>
            );
          })}
        </div>

        {/* Barre de Recherche */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer une fonction..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* =========================================================================
          TABLEAU ÉDITABLE DES FONCTIONNALITÉS
         ========================================================================= */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left border-collapse text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 w-[34%]">Fonctionnalité / Libellé</th>
                <th className="py-3 px-2 text-center w-[12%] text-emerald-400">Gratuit</th>
                <th className="py-3 px-2 text-center w-[12%] text-blue-400">Starter</th>
                <th className="py-3 px-2 text-center w-[14%] text-amber-300">Pro 👑</th>
                <th className="py-3 px-2 text-center w-[12%] text-purple-400">Elite</th>
                <th className="py-3 px-4 text-right w-[16%]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Aucune fonctionnalité ne correspond à votre filtre.
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((item, idx) => {
                  const catDef = COMPARISON_CATEGORIES.find(c => c.id === item.category);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isEven ? 'bg-transparent' : 'bg-slate-900/20'
                      }`}
                    >
                      {/* Nom & VIP Crown */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVipCrown(item.id)}
                              className={`p-1 rounded-lg border transition cursor-pointer ${
                                item.isVipCrown
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-600 hover:text-slate-400'
                              }`}
                              title={item.isVipCrown ? 'Désactiver la Couronne VIP' : 'Activer la Couronne VIP dorée'}
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>

                            <span className="font-bold text-white text-xs">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {catDef ? catDef.title.split('&')[0].trim() : item.category}
                            </span>
                            {item.tooltip && (
                              <span className="truncate max-w-[280px]" title={item.tooltip}>
                                • {item.tooltip}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Gratuit */}
                      <td className="py-3 px-2 text-center">
                        {typeof item.free === 'boolean' ? (
                          item.free ? (
                            <span className="inline-flex p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-slate-800 text-slate-500">
                              <X className="w-3 h-3" />
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            {item.free}
                          </span>
                        )}
                      </td>

                      {/* Starter */}
                      <td className="py-3 px-2 text-center">
                        {typeof item.starter === 'boolean' ? (
                          item.starter ? (
                            <span className="inline-flex p-1 rounded-full bg-blue-500/20 text-blue-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-slate-800 text-slate-500">
                              <X className="w-3 h-3" />
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-blue-200 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-500/30">
                            {item.starter}
                          </span>
                        )}
                      </td>

                      {/* Pro */}
                      <td className="py-3 px-2 text-center bg-amber-500/5">
                        {typeof item.pro === 'boolean' ? (
                          item.pro ? (
                            <span className="inline-flex p-1 rounded-full bg-amber-500/20 text-amber-300">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-slate-800 text-slate-500">
                              <X className="w-3 h-3" />
                            </span>
                          )
                        ) : (
                          <span className="font-extrabold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                            {item.pro}
                          </span>
                        )}
                      </td>

                      {/* Elite */}
                      <td className="py-3 px-2 text-center">
                        {typeof item.elite === 'boolean' ? (
                          item.elite ? (
                            <span className="inline-flex p-1 rounded-full bg-purple-500/20 text-purple-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-slate-800 text-slate-500">
                              <X className="w-3 h-3" />
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/30">
                            {item.elite}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition cursor-pointer"
                            title="Modifier cette fonctionnalité"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODALE AJOUT / MODIFICATION D'UNE FONCTIONNALITÉ
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>{editingItem ? 'Modifier la fonctionnalité' : 'Ajouter une nouvelle fonctionnalité'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom de la fonctionnalité *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Domaine Personnalisé & SSL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Catégorie & Couronne VIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ComparisonCategoryKey)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {COMPARISON_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Exclusivité VIP 👑
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsVipCrown}
                      onChange={(e) => setFormIsVipCrown(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Afficher la Couronne Dorée</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Tooltip / Explication */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Infobulle / Explication (Optionnel)
                </label>
                <input
                  type="text"
                  value={formTooltip}
                  onChange={(e) => setFormTooltip(e.target.value)}
                  placeholder="Ex: Synchronisation automatique avec votre nom de marque"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Configuration des 4 Plans */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Valeurs par Formule
                </span>

                {/* Plan Gratuit */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-emerald-400 w-24">Gratuit :</span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={formFreeType}
                      onChange={(e) => setFormFreeType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="boolean">Inclus / Exclu</option>
                      <option value="text">Texte / Limite</option>
                    </select>

                    {formFreeType === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() => setFormFreeBool(!formFreeBool)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formFreeBool ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {formFreeBool ? '✓ Inclus' : '✕ Exclu'}
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={formFreeText}
                        onChange={(e) => setFormFreeText(e.target.value)}
                        placeholder="Ex: 3 produits"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                {/* Plan Starter */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-400 w-24">Starter :</span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={formStarterType}
                      onChange={(e) => setFormStarterType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="boolean">Inclus / Exclu</option>
                      <option value="text">Texte / Limite</option>
                    </select>

                    {formStarterType === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() => setFormStarterBool(!formStarterBool)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formStarterBool ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {formStarterBool ? '✓ Inclus' : '✕ Exclu'}
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={formStarterText}
                        onChange={(e) => setFormStarterText(e.target.value)}
                        placeholder="Ex: 3 tunnels"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                {/* Plan Pro */}
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-amber-300 w-24">Pro 👑 :</span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={formProType}
                      onChange={(e) => setFormProType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="boolean">Inclus / Exclu</option>
                      <option value="text">Texte / Limite</option>
                    </select>

                    {formProType === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() => setFormProBool(!formProBool)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formProBool ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {formProBool ? '✓ Inclus' : '✕ Exclu'}
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={formProText}
                        onChange={(e) => setFormProText(e.target.value)}
                        placeholder="Ex: Illimité"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                {/* Plan Elite */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-purple-400 w-24">Elite :</span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={formEliteType}
                      onChange={(e) => setFormEliteType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="boolean">Inclus / Exclu</option>
                      <option value="text">Texte / Limite</option>
                    </select>

                    {formEliteType === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() => setFormEliteBool(!formEliteBool)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formEliteBool ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {formEliteBool ? '✓ Inclus' : '✕ Exclu'}
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={formEliteText}
                        onChange={(e) => setFormEliteText(e.target.value)}
                        placeholder="Ex: Illimité"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-900/40 transition active:scale-95 cursor-pointer"
                >
                  {editingItem ? 'Mettre à jour' : 'Ajouter la fonctionnalité'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonMatrixAdminTab;
