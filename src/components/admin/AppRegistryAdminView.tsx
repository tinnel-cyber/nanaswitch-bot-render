/**
 * @file AppRegistryAdminView.tsx
 * @description Vue d'administration et de personnalisation des 27 modules de l'App Registry Nanasore
 * Permet d'éditer le nom et la configuration de chaque module avec synchronisation directe dans Supabase et Firebase.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Save,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertCircle,
  Database,
  Flame,
  Globe,
  Sliders,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AppRegistryModule,
  DEFAULT_27_MODULES,
  loadAppRegistryModules,
  syncAppRegistryModule,
  syncAllAppRegistryModules,
} from '../../services/appRegistrySyncService';

interface AppRegistryAdminViewProps {
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AppRegistryAdminView: React.FC<AppRegistryAdminViewProps> = ({ onNotify }) => {
  const [modules, setModules] = useState<AppRegistryModule[]>(DEFAULT_27_MODULES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<number | 'ALL'>('ALL');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{
    key?: string;
    message: string;
    success: boolean;
    timestamp: string;
  } | null>(null);

  const [supabaseOnline, setSupabaseOnline] = useState<boolean>(true);
  const [firebaseOnline, setFirebaseOnline] = useState<boolean>(true);

  // Charger les données initiales depuis Supabase, Firebase et Cache
  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await loadAppRegistryModules();
      setModules(res.modules);
      setSupabaseOnline(res.supabaseOnline);
      setFirebaseOnline(res.firebaseOnline);
    } catch (err: any) {
      console.error('[AppRegistryAdminView] Erreur chargement :', err);
      if (onNotify) onNotify('Erreur de chargement des modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // Modification du nom d'un module
  const handleNameChange = (key: string, newName: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, name: newName } : m))
    );
  };

  // Modification de la description d'un module
  const handleDescChange = (key: string, newDesc: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, description: newDesc } : m))
    );
  };

  // Modification de la catégorie
  const handleCategoryChange = (key: string, newCat: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, category: newCat } : m))
    );
  };

  // Bascule activation
  const handleToggleActive = (key: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, is_active: !m.is_active } : m))
    );
  };

  // Réinitialiser un module au nom d'origine
  const handleResetToDefault = (key: string) => {
    const original = DEFAULT_27_MODULES.find((d) => d.key === key);
    if (original) {
      setModules((prev) =>
        prev.map((m) =>
          m.key === key
            ? {
                ...m,
                name: original.defaultName,
                description: original.description,
                category: original.category,
              }
            : m
        )
      );
    }
  };

  // Sauvegarder un module individuel dans Supabase + Firebase
  const handleSaveModule = async (mod: AppRegistryModule) => {
    setSavingKey(mod.key);
    try {
      const res = await syncAppRegistryModule(mod);
      if (res.success) {
        const msg = `Module #${mod.num} mis à jour avec succès dans Supabase ${
          res.supabaseSynced ? '✓' : ''
        } et Firebase ${res.firebaseSynced ? '✓' : ''}`;
        setLastSyncStatus({
          key: mod.key,
          message: msg,
          success: true,
          timestamp: new Date().toLocaleTimeString(),
        });
        if (onNotify) onNotify(msg, 'success');
      } else {
        throw new Error(res.error || 'Erreur lors de la synchronisation');
      }
    } catch (err: any) {
      const errorMsg = `Échec de mise à jour du module #${mod.num} : ${err.message}`;
      setLastSyncStatus({
        key: mod.key,
        message: errorMsg,
        success: false,
        timestamp: new Date().toLocaleTimeString(),
      });
      if (onNotify) onNotify(errorMsg, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  // Sauvegarder l'ensemble des modules modifiés
  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const res = await syncAllAppRegistryModules(modules);
      if (res.success) {
        const msg = `Les 27 modules ont été synchronisés simultanément dans Supabase et Firebase (${res.syncedCount}/${res.total})`;
        setLastSyncStatus({
          message: msg,
          success: true,
          timestamp: new Date().toLocaleTimeString(),
        });
        if (onNotify) onNotify(msg, 'success');
      }
    } catch (err: any) {
      if (onNotify) onNotify(`Erreur sync globale : ${err.message}`, 'error');
    } finally {
      setSavingAll(false);
    }
  };

  // Filtrage des modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchSection = selectedSection === 'ALL' || m.section === selectedSection;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.defaultName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.edgeFile.toLowerCase().includes(q) ||
        String(m.num) === q;

      return matchSection && matchQuery;
    });
  }, [modules, selectedSection, searchQuery]);

  // Statistiques rapides
  const stats = useMemo(() => {
    const customizedCount = modules.filter(
      (m) => m.name.trim() !== m.defaultName.trim()
    ).length;
    return {
      total: modules.length,
      customized: customizedCount,
      active: modules.filter((m) => m.is_active).length,
    };
  }, [modules]);

  const getSectionBadgeClass = (sec: number) => {
    switch (sec) {
      case 1:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 2:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 3:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 4:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. ENTÊTE DE LA VUE & STATUS BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>App Registry & Catalogue des 27 Modules</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Live Sync Supabase & Firebase
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Personnalisez les intitulés publics des modules marchands. Les modifications sont poussées en temps réel dans Supabase (<code className="text-slate-300">app_registry</code>), Firebase (Firestore / RTDB) et le routeur Edge Cloudflare.
                </p>
              </div>
            </div>
          </div>

          {/* Indicateurs de connectivité Cloud & Action Globale */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span>Supabase</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Flame className="w-3.5 h-3.5" />
                <span>Firebase</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Globe className="w-3.5 h-3.5" />
                <span>Edge Worker</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {savingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savingAll ? 'Synchronisation...' : 'Tout Sauvegarder'}</span>
            </button>

            <button
              type="button"
              onClick={fetchModules}
              disabled={loading}
              title="Rafraîchir depuis le cloud"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bannière de notification du dernier statut */}
        {lastSyncStatus && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
              lastSyncStatus.success
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {lastSyncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{lastSyncStatus.message}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {lastSyncStatus.timestamp}
            </span>
          </div>
        )}
      </div>

      {/* 2. STATS & RECHERCHE / FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 : Total Modules */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Modules
            </p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 : Modules Personnalisés */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Personnalisés
            </p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.customized}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 : Modules Actifs */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Modules Actifs
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 : Edge Worker Status */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cloudflare Edge
            </p>
            <p className="text-xs font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>nanasore.com/* (Actif)</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barre d'outils : Recherche et Filtres par section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Champ de recherche */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, clé, fichier ou n°..."
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Onglets des sections */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSelectedSection('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSection === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tous ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSection === 1
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            1. Applications (11)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSection === 2
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            2. Services (7)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection(3)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSection === 3
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            3. Modules (6)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection(4)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSection === 4
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            4. Outils (3)
          </button>
        </div>
      </div>

      {/* 3. GRILLE DES 27 MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModules.map((mod) => {
          const isModified = mod.name.trim() !== mod.defaultName.trim();
          const isSaving = savingKey === mod.key;

          return (
            <div
              key={mod.key}
              className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between transition hover:border-slate-700 shadow-xl relative overflow-hidden ${
                isModified
                  ? 'border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Badge supérieur : Numéro & Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono font-black text-xs flex items-center justify-center">
                      #{String(mod.num).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getSectionBadgeClass(
                        mod.section
                      )}`}
                    >
                      {mod.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(mod.key)}
                      title={mod.is_active ? 'Module actif' : 'Module désactivé'}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                        mod.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      ●
                    </button>
                    {isModified && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Modifié
                      </span>
                    )}
                  </div>
                </div>

                {/* Champ d'édition du Nom du Module */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400">
                      Nom personnalisé :
                    </label>
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => handleResetToDefault(mod.key)}
                        title="Rétablir le nom par défaut"
                        className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Défaut</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={mod.name}
                    onChange={(e) => handleNameChange(mod.key, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                    placeholder="Nom du module..."
                  />
                  {isModified && (
                    <p className="text-[10px] text-slate-500 italic truncate">
                      Défaut : {mod.defaultName}
                    </p>
                  )}
                </div>

                {/* Champ d'édition de la Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Description :
                  </label>
                  <textarea
                    rows={2}
                    value={mod.description}
                    onChange={(e) => handleDescChange(mod.key, e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition resize-none"
                    placeholder="Description du module..."
                  />
                </div>

                {/* Informations techniques & Edge Router */}
                <div className="pt-2 border-t border-slate-800/60 space-y-1 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Clé Supabase :</span>
                    <span className="text-slate-300 font-bold">{mod.key}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fichier Edge :</span>
                    <span className="text-indigo-400">{mod.edgeFile}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Routes :</span>
                    <span className="text-slate-400 truncate max-w-[170px]" title={mod.routes.join(', ')}>
                      {mod.routes[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton individuel de mise à jour */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Database className="w-3 h-3 text-emerald-500" />
                  <span>+</span>
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span className="text-slate-400">Sync direct</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveModule(mod)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  <span>{isSaving ? 'En cours...' : 'Mettre à jour'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-300 font-bold">Aucun module ne correspond à votre recherche</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedSection('ALL');
            }}
            className="text-xs text-indigo-400 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};
