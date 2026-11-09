import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RefreshCw, 
  Video, 
  ExternalLink, 
  Check, 
  Clock, 
  Sparkles, 
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Tv
} from 'lucide-react';
import { 
  TutorialItem, 
  TutorialCategory, 
  TUTORIAL_CATEGORIES, 
  DEFAULT_TUTORIALS,
  getTutorials, 
  saveTutorialsEverywhere,
  loadTutorialsFromFirebase,
  formatVideoEmbedUrl
} from '../../services/tutorialService';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';

export const AdminTutorialsTab: React.FC = () => {
  const [tutorials, setTutorials] = useState<TutorialItem[]>(() => getTutorials());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | 'ALL'>('ALL');
  
  // État du formulaire d'édition / création
  const [editingTutorial, setEditingTutorial] = useState<TutorialItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form inputs pour l'édition
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TutorialCategory>('POS_STOCK');
  const [formDuration, setFormDuration] = useState('1 min 30');
  const [formLevel, setFormLevel] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Débutant');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStep1, setFormStep1] = useState('');
  const [formStep2, setFormStep2] = useState('');
  const [formStep3, setFormStep3] = useState('');
  const [formContextViews, setFormContextViews] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formExternalLabel, setFormExternalLabel] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Recharger depuis Firebase
  const handleReloadFromFirebase = async () => {
    setIsSyncing(true);
    playTapBeep();
    try {
      const data = await loadTutorialsFromFirebase();
      setTutorials(data);
      showToast('✅ Tutoriels synchronisés');
      playValidationBeep();
    } catch (e) {
      showToast('❌ Erreur de chargement des tutoriels');
    } finally {
      setIsSyncing(false);
    }
  };

  // Réinitialiser avec le catalogue par défaut
  const handleResetToDefaults = async () => {
    if (!window.confirm('Voulez-vous restaurer les 18 tutoriels complets par défaut ? Vos modifications personnalisées seront écrasées.')) {
      return;
    }
    setIsSaving(true);
    playTapBeep();
    try {
      await saveTutorialsEverywhere(DEFAULT_TUTORIALS);
      setTutorials(DEFAULT_TUTORIALS);
      showToast('✅ Catalogue par défaut (18 tutoriels) restauré avec succès');
      playValidationBeep();
    } catch (e) {
      showToast('❌ Erreur lors de la réinitialisation');
    } finally {
      setIsSaving(false);
    }
  };

  // Ouvrir formulaire pour nouveau tutoriel
  const handleStartCreate = () => {
    playTapBeep();
    setEditingTutorial(null);
    setIsCreatingNew(true);
    setFormTitle('');
    setFormCategory('POS_STOCK');
    setFormDuration('1 min 30');
    setFormLevel('Débutant');
    setFormVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    setFormDescription('');
    setFormStep1('');
    setFormStep2('');
    setFormStep3('');
    setFormContextViews('POS');
    setFormExternalUrl('');
    setFormExternalLabel('');
  };

  // Ouvrir formulaire pour modifier un tutoriel existant
  const handleStartEdit = (tuto: TutorialItem) => {
    playTapBeep();
    setEditingTutorial(tuto);
    setIsCreatingNew(false);
    setFormTitle(tuto.title);
    setFormCategory(tuto.category);
    setFormDuration(tuto.duration);
    setFormLevel(tuto.level);
    setFormVideoUrl(tuto.videoUrl);
    setFormDescription(tuto.description);
    setFormStep1(tuto.steps[0] || '');
    setFormStep2(tuto.steps[1] || '');
    setFormStep3(tuto.steps[2] || '');
    setFormContextViews((tuto.contextualViews || []).join(', '));
    setFormExternalUrl(tuto.externalActionUrl || '');
    setFormExternalLabel(tuto.externalActionLabel || '');
  };

  // Supprimer un tutoriel
  const handleDeleteTutorial = async (id: string, title: string) => {
    if (!window.confirm(`Supprimer définitivement le tutoriel "${title}" ?`)) return;
    playCancelSound();

    const updated = tutorials.filter(t => t.id !== id);
    setTutorials(updated);
    setIsSaving(true);
    const ok = await saveTutorialsEverywhere(updated);
    setIsSaving(false);
    if (ok) {
      showToast('🗑️ Tutoriel supprimé et sauvegardé partout');
      playValidationBeep();
    }
  };

  // Sauvegarder le formulaire (création ou édition)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Veuillez renseigner un titre pour le tutoriel.');
      return;
    }

    const catObj = TUTORIAL_CATEGORIES.find(c => c.id === formCategory);
    const catLabel = catObj ? catObj.label : 'Module';

    const stepsArray = [
      formStep1.trim() || 'Étape 1',
      formStep2.trim() || 'Étape 2',
      formStep3.trim() || 'Étape 3'
    ];

    const viewsArray = formContextViews
      .split(',')
      .map(v => v.trim().toUpperCase())
      .filter(Boolean);

    let updatedList: TutorialItem[];

    if (isCreatingNew) {
      const newTuto: TutorialItem = {
        id: `tuto-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        category: formCategory,
        categoryLabel: catLabel,
        duration: formDuration.trim() || '1 min',
        level: formLevel,
        videoUrl: formVideoUrl.trim(),
        description: formDescription.trim(),
        steps: stepsArray,
        contextualViews: viewsArray,
        externalActionUrl: formExternalUrl.trim() || undefined,
        externalActionLabel: formExternalLabel.trim() || undefined
      };
      updatedList = [newTuto, ...tutorials];
    } else if (editingTutorial) {
      updatedList = tutorials.map(t => {
        if (t.id === editingTutorial.id) {
          return {
            ...t,
            title: formTitle.trim(),
            category: formCategory,
            categoryLabel: catLabel,
            duration: formDuration.trim() || '1 min',
            level: formLevel,
            videoUrl: formVideoUrl.trim(),
            description: formDescription.trim(),
            steps: stepsArray,
            contextualViews: viewsArray,
            externalActionUrl: formExternalUrl.trim() || undefined,
            externalActionLabel: formExternalLabel.trim() || undefined
          };
        }
        return t;
      });
    } else {
      return;
    }

    setIsSaving(true);
    const success = await saveTutorialsEverywhere(updatedList);
    setIsSaving(false);

    if (success) {
      setTutorials(updatedList);
      setIsCreatingNew(false);
      setEditingTutorial(null);
      playValidationBeep();
      showToast('🎉 Tutoriel enregistré et synchronisé avec succès !');
    } else {
      showToast('⚠️ Erreur réseau lors de la synchronisation');
    }
  };

  // Filtrage
  const filteredList = tutorials.filter(t => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(t.title || '').toLowerCase().includes(q) ||
      String(t.description || '').toLowerCase().includes(q) ||
      String(t.categoryLabel || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* EN-TÊTE DE LA SECTION GESTION ACADÉMIE */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-5 rounded-3xl border border-indigo-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-400/40">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Gestion des Tutoriels NaNa Académie
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black">
                {tutorials.length} tutoriels actifs
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajoutez des vidéos YouTube/MP4, configurez les étapes résumées et les suggestions contextuelles par module.
            </p>
          </div>
        </div>

        {/* Boutons d'actions globales */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReloadFromFirebase}
            disabled={isSyncing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Recharger les tutoriels"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Restaurer les 18 tutoriels complets par défaut"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Catalogue 18 Tutos</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Tutoriel</span>
          </button>
        </div>
      </div>

      {/* FORMULAIRE D'AJOUT / ÉDITION (SI ACTIF) */}
      {(isCreatingNew || editingTutorial) && (
        <form 
          onSubmit={handleSaveForm}
          className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-black text-white">
                {isCreatingNew ? 'Créer un nouveau Tutoriel Micro-Learning' : `Modifier : ${editingTutorial?.title}`}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setEditingTutorial(null);
              }}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Titre */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300">Titre de la formation / vidéo *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Encaisser une vente rapide en caisse et imprimer le ticket"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Catégorie */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Catégorie de module *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as TutorialCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {TUTORIAL_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Durée & Niveau */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Durée (ex: 1 min 30)</label>
                <input
                  type="text"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="1 min 30"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Niveau</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            </div>

            {/* URL Vidéo (YouTube / MP4) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-300">
                URL Vidéo (Lien YouTube standard watch, raccourci youtu.be, embed ou fichier direct MP4)
              </label>
              <input
                type="text"
                value={formVideoUrl}
                onChange={(e) => setFormVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {formVideoUrl && (
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-semibold text-emerald-400">Embed détecté :</span>
                  <span className="font-mono truncate">{formatVideoEmbedUrl(formVideoUrl)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-300">Description / Objectif pédagogique</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Expliquez en 1 ou 2 phrases ce que le commerçant va apprendre..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Guide Express en 3 Étapes */}
            <div className="md:col-span-2 space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Guide Express Pas à Pas (3 étapes clés résumées) :
              </label>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <input
                    type="text"
                    value={formStep1}
                    onChange={(e) => setFormStep1(e.target.value)}
                    placeholder="Étape 1 : Action initiale du commerçant..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <input
                    type="text"
                    value={formStep2}
                    onChange={(e) => setFormStep2(e.target.value)}
                    placeholder="Étape 2 : Manipulation ou saisie..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <input
                    type="text"
                    value={formStep3}
                    onChange={(e) => setFormStep3(e.target.value)}
                    placeholder="Étape 3 : Validation et résultat obtenu..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Vues contextuelles associées */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-300">
                Modules / Vues applicatives associées (séparées par des virgules)
              </label>
              <input
                type="text"
                value={formContextViews}
                onChange={(e) => setFormContextViews(e.target.value)}
                placeholder="POS, INVENTORY, STORE, DEBT_BOOK, AI_STUDIO, CUSTOMER_ORDERS, etc."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Permet à NaNa Académie de recommander ce tutoriel en haut du tiroir quand le commerçant navigue sur ce module.
              </p>
            </div>

            {/* Lien d'action externe (ex: inscription Gmail) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Lien d'action externe (optionnel, ex: https://accounts.google.com/signup)
              </label>
              <input
                type="text"
                value={formExternalUrl}
                onChange={(e) => setFormExternalUrl(e.target.value)}
                placeholder="https://accounts.google.com/signup"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Libellé du bouton d'action (optionnel, ex: 🔗 Créer mon adresse Gmail)
              </label>
              <input
                type="text"
                value={formExternalLabel}
                onChange={(e) => setFormExternalLabel(e.target.value)}
                placeholder="🔗 Créer mon adresse Gmail"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setEditingTutorial(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement partout...' : 'Enregistrer dans Firebase & Local'}</span>
            </button>
          </div>
        </form>
      )}

      {/* FILTRES & BARRE DE RECHERCHE */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, description ou module..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tous ({tutorials.length})
          </button>
          {TUTORIAL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label} ({tutorials.filter(t => t.category === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* TABLEAU / GRILLE DES TUTORIELS */}
      <div className="grid grid-cols-1 gap-3">
        {filteredList.map((tuto) => (
          <div
            key={tuto.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  {tuto.categoryLabel}
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  {tuto.duration}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                  {tuto.level}
                </span>
                {tuto.contextualViews && tuto.contextualViews.length > 0 && (
                  <span className="text-[10px] text-amber-300 font-mono">
                    [{tuto.contextualViews.join(', ')}]
                  </span>
                )}
              </div>

              <h4 className="text-sm font-black text-white">
                {tuto.title}
              </h4>

              <p className="text-xs text-slate-400 line-clamp-2">
                {tuto.description}
              </p>

              {/* 3 Étapes */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                {tuto.steps.map((st, i) => (
                  <span key={i} className="flex items-center gap-1 truncate max-w-[280px]">
                    <strong className="text-indigo-400">{i + 1}.</strong> {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions sur la carte */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {tuto.videoUrl && (
                <a
                  href={tuto.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Prévisualiser la vidéo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => handleStartEdit(tuto)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTutorial(tuto.id, tuto.title)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                title="Supprimer ce tutoriel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTutorialsTab;
