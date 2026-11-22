import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Compass,
  Palette,
  Globe,
  Copy,
  Check,
  BarChart3,
  Plus,
  ExternalLink,
  CheckCircle2,
  MousePointerClick,
  Users,
  Wallet
} from 'lucide-react';
import { formatCFA } from '../../../../../utils/audio';

export interface CourseDestinationItem {
  id?: string;
  destinationType: string;
  destinationId: string;
  destinationLabel: string;
  themeSlug?: string;
  trackingCode?: string;
  trackingUrl?: string;
  targetUrl: string;
  isActive?: boolean;
  clicksCount?: number;
  enrollmentsCount?: number;
  revenueFcfa?: number;
  conversionRate?: number;
  badge?: string;
}

export interface CourseDestinationSelectorModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onDestinationsUpdated?: (activeCount: number) => void;
}

export const CourseDestinationSelectorModal: React.FC<CourseDestinationSelectorModalProps> = ({
  isOpen,
  courseId,
  courseTitle,
  onClose,
  onDestinationsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'selector' | 'analytics'>('selector');
  const [themesCatalog, setThemesCatalog] = useState<CourseDestinationItem[]>([]);
  const [placesCatalog, setPlacesCatalog] = useState<CourseDestinationItem[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<CourseDestinationItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    activeCount: 0,
    totalClicks: 0,
    totalEnrollments: 0,
    totalRevenueFcfa: 0
  });

  // Ajout d'un thème digital généré via le Constructeur de Thèmes
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const loadDestinations = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/destinations`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success) return;

      const saved: CourseDestinationItem[] = Array.isArray(json.destinations) ? json.destinations : [];
      setSavedDestinations(saved);
      setSelectedIds(saved.filter((d) => d.isActive !== false).map((d) => d.destinationId));
      setThemesCatalog(Array.isArray(json.catalog?.themes) ? json.catalog.themes : []);
      setPlacesCatalog(Array.isArray(json.catalog?.places) ? json.catalog.places : []);
      if (json.summary) {
        setSummary(json.summary);
        onDestinationsUpdated?.(json.summary.activeCount || 0);
      }
    } catch {}
  }, [courseId, onDestinationsUpdated]);

  useEffect(() => {
    if (isOpen) {
      loadDestinations();
    }
  }, [isOpen, loadDestinations]);

  if (!isOpen) return null;

  const allCatalog = [...themesCatalog, ...placesCatalog];

  const toggleDestination = (destId: string) => {
    setSelectedIds((prev) =>
      prev.includes(destId) ? prev.filter((id) => id !== destId) : [...prev, destId]
    );
  };

  const handleAddGeneratedTheme = async () => {
    if (!newThemeName.trim()) return;
    const rawSlug =
      (newThemeSlug.trim() || newThemeName.trim())
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `theme-${Date.now().toString(36)}`;

    const newItem: CourseDestinationItem = {
      destinationType: 'custom_digital_theme',
      destinationId: `custom_theme_${rawSlug}`,
      destinationLabel: newThemeName.trim(),
      themeSlug: rawSlug,
      targetUrl: `/boutique/${encodeURIComponent(rawSlug)}?course=${encodeURIComponent(courseId)}`,
      badge: 'Thème Digital Généré',
      isActive: true
    };

    setThemesCatalog((prev) => [newItem, ...prev.filter((t) => t.destinationId !== newItem.destinationId)]);
    setSelectedIds((prev) => (prev.includes(newItem.destinationId) ? prev : [newItem.destinationId, ...prev]));
    setNewThemeName('');
    setNewThemeSlug('');
    setStatusToast(`Thème digital généré "${newItem.destinationLabel}" ajouté — cliquez sur Enregistrer pour persister.`);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadItems = selectedIds.map((id) => {
        const found =
          allCatalog.find((c) => c.destinationId === id) ||
          savedDestinations.find((s) => s.destinationId === id);
        return (
          found || {
            destinationType: 'custom_digital_theme',
            destinationId: id,
            destinationLabel: id,
            targetUrl: `/boutique?course=${encodeURIComponent(courseId)}`,
            isActive: true
          }
        );
      });

      const customThemesToPersist = themesCatalog.find(
        (t) => t.destinationType === 'custom_digital_theme' && selectedIds.includes(t.destinationId)
      );

      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: payloadItems,
          customDigitalTheme: customThemesToPersist
            ? { name: customThemesToPersist.destinationLabel, slug: customThemesToPersist.themeSlug }
            : undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        await loadDestinations();
        setStatusToast(`✅ ${payloadItems.length} destination(s) enregistrée(s) et tracée(s) dans le Cloud !`);
        setTimeout(() => setStatusToast(null), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTrackingLink = (code: string, pathUrl: string) => {
    const full = `${window.location.origin}${pathUrl}`;
    navigator.clipboard?.writeText(full);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                🎯 Sélecteur de Destinations, Thèmes Digitaux &amp; Analytique
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Cours : <strong className="text-emerald-300">{courseTitle}</strong> • Persistant &amp; traçable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Onglets */}
        <div className="px-6 pt-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('selector')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'selector'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Thèmes &amp; Lieux reliés ({selectedIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'border-indigo-400 text-indigo-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Traçabilité &amp; Analytique ({summary.totalClicks} clics)</span>
          </button>
        </div>

        {statusToast && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusToast}</span>
          </div>
        )}

        {/* Contenu */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'selector' ? (
            <>
              {/* Section 1 : Thèmes officiels + Thèmes digitaux générés (Constructeur de Thèmes) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Thèmes Boutiques &amp; Thèmes Digitaux Générés</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Constructeur de Thèmes inclus</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {themesCatalog.map((t) => {
                    const checked = selectedIds.includes(t.destinationId);
                    return (
                      <label
                        key={t.destinationId}
                        className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition ${
                          checked
                            ? 'bg-indigo-600/20 border-indigo-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDestination(t.destinationId)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{t.destinationLabel}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">
                              {t.badge || 'Thème Digital'}
                            </span>
                            {t.themeSlug && (
                              <span className="text-[10px] text-slate-500 font-mono truncate">/{t.themeSlug}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Ajouter un Thème Digital généré depuis le Constructeur de Thèmes */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-dashed border-indigo-500/40 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Relier un Thème Digital généré par votre Constructeur de Thèmes</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Nom (ex: Académie IA Pro)"
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={newThemeSlug}
                      onChange={(e) => setNewThemeSlug(e.target.value)}
                      placeholder="Slug (ex: academie-ia-pro)"
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddGeneratedTheme}
                      disabled={!newThemeName.trim()}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs disabled:opacity-40 cursor-pointer"
                    >
                      + Ajouter ce Thème
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2 : Lieux de publication (Marketplace, Campus Privé, Salles VIP, Campus Social) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Lieux de Diffusion (Marketplace, Campus Privé, Salles VIP &amp; Salons)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {placesCatalog.map((p) => {
                    const checked = selectedIds.includes(p.destinationId);
                    return (
                      <label
                        key={p.destinationId}
                        className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition ${
                          checked
                            ? 'bg-emerald-500/15 border-emerald-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDestination(p.destinationId)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{p.destinationLabel}</div>
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold">
                            {p.badge || p.destinationType}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ONGLET 2 : ANALYTIQUE & LIENS DE RÉORIENTATION TRAÇABLES */
            <div className="space-y-4">
              {/* KPIs Globaux */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" /> Clics Tracés
                  </div>
                  <div className="text-xl font-black text-white mt-1">{summary.totalClicks}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Inscriptions
                  </div>
                  <div className="text-xl font-black text-emerald-300 mt-1">{summary.totalEnrollments}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" /> Revenus Attribués
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1">{formatCFA(summary.totalRevenueFcfa)}</div>
                </div>
              </div>

              {savedDestinations.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  Aucune destination enregistrée pour le moment. Cochez vos thèmes &amp; lieux dans le premier onglet pour générer vos liens traçables.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedDestinations.map((d) => (
                    <div
                      key={d.destinationId}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">{d.destinationLabel}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <code className="text-[11px] font-mono text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
                            {d.trackingUrl || `/r/course/${d.trackingCode}`}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyTrackingLink(d.trackingCode || '', d.trackingUrl || `/r/course/${d.trackingCode}`)}
                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedCode === d.trackingCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode === d.trackingCode ? 'Copié' : 'Copier'}</span>
                          </button>
                          <a
                            href={d.trackingUrl || `/r/course/${d.trackingCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                          >
                            <span>Tester</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <div className="text-center">
                          <div className="font-black text-white">{d.clicksCount || 0}</div>
                          <div className="text-[10px] text-slate-500">Clics</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-emerald-300">{d.enrollmentsCount || 0}</div>
                          <div className="text-[10px] text-slate-500">Inscrits</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-indigo-300">{d.conversionRate || 0}%</div>
                          <div className="text-[10px] text-slate-500">Conv.</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-amber-300">{formatCFA(d.revenueFcfa || 0)}</div>
                          <div className="text-[10px] text-slate-500">Revenus</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Chaque destination génère un code traçable unique (<code className="text-indigo-300">/r/course/TRK-...</code>).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              Fermer
            </button>
            {activeTab === 'selector' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:opacity-95 text-white font-black text-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Sauvegarde...' : 'Enregistrer & Tracer les Destinations'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDestinationSelectorModal;
