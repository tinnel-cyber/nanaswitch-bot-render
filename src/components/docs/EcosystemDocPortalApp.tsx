/**
 * @file EcosystemDocPortalApp.tsx
 * @description Portail de Documentation Officiel et Interactif de l'Écosystème Nanasore.
 * Clôné et épuré de toute référence technique de paiement tierce ou obsolète.
 * 100% PUBLIC - SOUVERAIN - ACCÈS LIBRE SANS RESTRICTION D'AUTHENTIFICATION.
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  ShoppingCart,
  Palette,
  Award,
  Zap,
  Tag,
  CheckCircle2,
  Users,
  Compass,
  FileText,
  Boxes,
  BookMarked,
  BarChart2,
  Activity,
  QrCode,
  FileSpreadsheet,
  Key,
  Smartphone,
  ChevronRight,
  Clock,
  PhoneCall,
  Coins,
  Store,
  Video,
  UploadCloud,
  FileCheck,
  Mail
} from 'lucide-react';

import {
  KYC_ONBOARDING_GUIDE,
  PRICING_PLANS_GUIDE,
  THEMES_DOCUMENTATION_CATALOG,
  ECOSYSTEM_COMPONENTS_DOCUMENTATION,
  ComponentDocItem,
  ThemeDocItem
} from './ecosystemDocumentationData';

interface EcosystemDocPortalAppProps {
  onClose?: () => void;
  copyToClipboard?: (text?: string, label?: string) => void;
  initialSection?: string;
  isPublicPortal?: boolean;
}

export const EcosystemDocPortalApp: React.FC<EcosystemDocPortalAppProps> = ({
  onClose,
  copyToClipboard,
  initialSection = 'hub'
}) => {
  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTaxonomyFilter, setSelectedTaxonomyFilter] = useState<'ALL' | 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Recherche et filtrage
  const filteredComponents = useMemo(() => {
    return ECOSYSTEM_COMPONENTS_DOCUMENTATION.filter((item) => {
      const matchesTaxonomy = selectedTaxonomyFilter === 'ALL' || item.taxonomy === selectedTaxonomyFilter;
      if (!matchesTaxonomy) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shortDescription.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q)
      );
    });
  }, [selectedTaxonomyFilter, searchQuery]);

  const activeComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    return ECOSYSTEM_COMPONENTS_DOCUMENTATION.find((c) => c.id === selectedComponentId) || null;
  }, [selectedComponentId]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (copyToClipboard) {
      copyToClipboard(text, 'Résumé copié dans le presse-papier !');
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTaxonomyIcon = (taxonomy: string) => {
    switch (taxonomy) {
      case 'APPLICATION':
        return ShoppingCart;
      case 'SERVICE':
        return Compass;
      case 'MODULE':
        return Boxes;
      case 'OUTIL':
        return Key;
      default:
        return Layers;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-20">
      {/* Barre Supérieure de Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveSection('hub');
                setSelectedComponentId(null);
              }}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E40AF] to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base group-hover:text-blue-600 transition">
                    Centre Documentaire
                  </span>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-blue-200">
                    SOUVERAIN
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Écosystème Nanasore • Guide & Manuel Opérationnel
                </p>
              </div>
            </button>
          </div>

          {/* Recherche Rapide Centrale */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une application, un module, un thème ou un outil..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Liens de Sections Principales */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                setActiveSection('hub');
                setSelectedComponentId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSection === 'hub' && !selectedComponentId
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vue Globale
            </button>

            <button
              onClick={() => {
                setActiveSection('kyc');
                setSelectedComponentId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSection === 'kyc'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Compte & KYC
            </button>

            <button
              onClick={() => {
                setActiveSection('pricing');
                setSelectedComponentId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSection === 'pricing'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Plans Tarifaires
            </button>

            <button
              onClick={() => {
                setActiveSection('themes');
                setSelectedComponentId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSection === 'themes'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Les 8 Thèmes
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 transition shadow-xs"
              >
                Retour Dashboard
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* =====================================================================
          VUE 1 : ACCUEIL & VUE GLOBALE (HUB PRINCIPAL)
      ====================================================================== */}
      {activeSection === 'hub' && !selectedComponentId && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
          {/* Bannière Hero Souveraine */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#1E3A8A] to-slate-950 text-white p-8 md:p-12 shadow-xl shadow-blue-950/10">
            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Documentation Officielle & Manuel Opérationnel d'Entreprise</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Architecture, Manuel & Stratégies d'Affaires Nanasore
              </h1>
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                Explorez l'ensemble des solutions de l'écosystème commercial souverain. Maîtrisez le parcours de conformité KYC, 
                choisissez votre modèle d'usage (Commission vs Abonnement) et découvrez comment combiner nos applications et modules 
                pour concevoir des business récurrents et hautement rentables.
              </p>

              {/* Raccourcis Métriques Clés */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-white">14</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Applications Métier</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-emerald-400">5 Services</span>
                  <span className="text-[11px] text-blue-200 font-semibold">& Infrastructures</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-amber-300">5 Modules</span>
                  <span className="text-[11px] text-blue-200 font-semibold">& 3 Outils Intégrés</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-purple-300">8 Thèmes</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Vitrine Haute Conversion</span>
                </div>
              </div>
            </div>

            {/* Éléments Graphiques d'Arrière-Plan */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Cartes d'Accès Rapide aux 3 Guides Majeurs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              onClick={() => setActiveSection('kyc')}
              className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                Création de Compte & Chaîne KYC
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Plafonds légaux (1M Particulier vs 5M Entreprise), pièces justificatives, sécurité et accompagnement réactif 24/7.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span>Consulter le guide KYC</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveSection('pricing')}
              className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                Plans Tarifaires & Modèle d'Usage
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Différence stricte entre Plan Commission (zéro frais fixe) et Plan Abonnement (Caisse POS & commerces physiques).
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <span>Comparer les plans</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveSection('themes')}
              className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                Les 8 Thèmes Spécialisés
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Rôle de chaque thème de vitrine (Architect, LiveStream, Émeraude Prestige, Mega-Store, Electro, Digital Pro).
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <span>Découvrir les thèmes</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Barre de Filtrage par Taxonomie */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Filtrer par nature :</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Toutes les Solutions' },
                  { id: 'APPLICATION', label: 'Applications (14)' },
                  { id: 'SERVICE', label: 'Services (5)' },
                  { id: 'MODULE', label: 'Modules (5)' },
                  { id: 'OUTIL', label: 'Outils (3)' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTaxonomyFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      selectedTaxonomyFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Affichage de <strong>{filteredComponents.length}</strong> composants documentés
            </div>
          </div>

          {/* Grille des Composants Documentés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComponents.map((item) => {
              const IconComp = getTaxonomyIcon(item.taxonomy);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedComponentId(item.id)}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          {item.taxonomy} • {item.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.shortDescription}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-slate-700">Domaine d'application :</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.domain}</div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>Explorer la fiche complète (7 volets)</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* =====================================================================
          VUE 2 : FICHE DÉTAILLÉE D'UN COMPOSANT (7 VOLETS RIGOUREUX)
      ====================================================================== */}
      {selectedComponentId && activeComponent && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Fil d'Ariane & Bouton Retour */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedComponentId(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la liste des solutions</span>
            </button>

            <button
              onClick={() => handleCopyText(`${activeComponent.name}\n${activeComponent.definition}`, activeComponent.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-xs font-bold transition border border-slate-200"
            >
              {copiedId === activeComponent.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === activeComponent.id ? 'Copié !' : 'Copier la fiche'}</span>
            </button>
          </div>

          {/* En-tête de la Fiche */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${activeComponent.badgeColor}`}>
                {activeComponent.badge}
              </span>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                Modèle : {activeComponent.pricingPlan.replace('_', ' ')}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeComponent.name}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-400 mt-1 uppercase tracking-wide">
                Taxonomie : {activeComponent.taxonomy} • Catégorie : {activeComponent.category}
              </p>
            </div>

            <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {activeComponent.shortDescription}
            </p>
          </div>

          {/* Les 7 Volets Standardisés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Définition */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>1. Sa Définition</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeComponent.definition}
              </p>
            </div>

            {/* 2. Fonction */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>2. Sa Fonction Concrète</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeComponent.function}
              </p>
            </div>

            {/* 3. Domaine */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm uppercase tracking-wider">
                <Store className="w-4 h-4" />
                <span>3. Son Domaine d'Application</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeComponent.domain}
              </p>
            </div>

            {/* 4. Intérêt & Proposition de Valeur */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>4. Son Intérêt & Valeur Ajoutée</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeComponent.businessValue}
              </p>
            </div>
          </div>

          {/* 5. Manière d'Utilisation (Workflow Pas à Pas) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>5. Manière d'Utilisation (Workflow Opérationnel)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeComponent.workflow.map((step, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* 6. Paramétrage */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
              <Tag className="w-5 h-5 text-purple-600" />
              <span>6. Paramétrage Technique & Configuration Requise</span>
            </div>
            <ul className="space-y-2.5 pt-1">
              {activeComponent.configuration.map((conf, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{conf}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 7. Synergies & Recette Business Hautement Rentable */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl border border-blue-900 shadow-lg space-y-4">
            <div className="flex items-center gap-2 font-black text-lg text-emerald-400">
              <Sparkles className="w-5 h-5" />
              <span>7. Recette Business & Synergies Ultra-Rentables</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pour bâtir un modèle économique solide et dégager des bénéfices récurrents, voici comment interconnecter cette solution avec le reste de l'écosystème :
            </p>
            <div className="space-y-3 pt-2">
              {activeComponent.synergiesAndMonetization.map((syn, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/10 border border-white/10 text-xs text-white leading-relaxed">
                  {syn}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 3 : PARCOURS KYC & OUVERTURE DE COMPTE
      ====================================================================== */}
      {activeSection === 'kyc' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
              <span>Conformité Réglementaire Souveraine</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">{KYC_ONBOARDING_GUIDE.title}</h1>
            <p className="text-sm text-slate-600">{KYC_ONBOARDING_GUIDE.subtitle}</p>
          </div>

          {/* Les 3 Étapes Pas à Pas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {KYC_ONBOARDING_GUIDE.steps.map((st) => (
              <div key={st.number} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                  {st.number}
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{st.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  {st.keyPoints.map((kp, idx) => (
                    <div key={idx} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{kp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Les Deux Types de Comptes & Plafonds Mensuels */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Les Profils Légaux & Différence des Plafonds</h2>
              <p className="text-xs text-slate-500">
                La distinction fondamentale entre un compte particulier et un compte entreprise repose strictement sur le plafond mensuel d'encaissement et les justificatifs juridiques exigés.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {KYC_ONBOARDING_GUIDE.accountTypes.map((acc) => (
                <div key={acc.type} className="p-6 rounded-3xl border border-slate-200 bg-slate-50 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{acc.label}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                      {acc.monthlyCap}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong>Destiné à :</strong> {acc.intendedFor}
                  </p>

                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-800">Documents exigés pour validation :</div>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {acc.documentsRequired.map((doc, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[11px] text-blue-700 font-bold pt-2 border-t border-slate-200">
                    Délai de traitement : {acc.activationDelay}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Support Réactif */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-950 text-white rounded-3xl p-8 shadow-md space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase">
              <PhoneCall className="w-4 h-4" />
              <span>{KYC_ONBOARDING_GUIDE.supportCommitment.title}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
              {KYC_ONBOARDING_GUIDE.supportCommitment.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <span className="block text-xl font-black text-white">{KYC_ONBOARDING_GUIDE.supportCommitment.responseTime}</span>
                <span className="text-xs text-blue-200">Temps de réponse moyen</span>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <span className="block text-xl font-black text-white">{KYC_ONBOARDING_GUIDE.supportCommitment.availability}</span>
                <span className="text-xs text-blue-200">Disponibilité d'astreinte</span>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <span className="block text-xl font-black text-emerald-300">100% Humain</span>
                <span className="text-xs text-blue-200">Chargé de compte dédié</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 4 : PLANS TARIFAIRES & MODÈLE D'USAGE
      ====================================================================== */}
      {activeSection === 'pricing' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              <Coins className="w-4 h-4" />
              <span>Modèles d'Usage & Tarification Équitable</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">{PRICING_PLANS_GUIDE.title}</h1>
            <p className="text-sm text-slate-600">{PRICING_PLANS_GUIDE.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PRICING_PLANS_GUIDE.plans.map((pl) => (
              <div
                key={pl.id}
                className={`rounded-3xl p-8 border flex flex-col justify-between space-y-6 ${
                  pl.id === 'plan-abonnement'
                    ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-xl'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 text-white">
                      {pl.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{pl.name}</h2>
                    <p className="text-xs font-bold text-blue-700 mt-1">{pl.commissionRateOrFee}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{pl.businessModel}</p>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="text-xs font-bold text-slate-800">Public cible recommandé :</div>
                    <div className="text-xs text-slate-600">{pl.targetAudience}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-800">Modules inclus & accessibles :</div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {pl.accessibleModules.map((mod, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pl.excludedModules.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="text-xs font-bold text-rose-800">Exclusions d'office :</div>
                      <ul className="space-y-1 text-xs text-slate-500">
                        {pl.excludedModules.map((ex, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="text-rose-500 font-bold">✕</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-900 font-semibold">
                  Avantage clé : {pl.advantages[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 5 : LES 8 THÈMES DE LA VITRINE & LEUR RÔLE COMMERCIAL
      ====================================================================== */}
      {activeSection === 'themes' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              <Palette className="w-4 h-4" />
              <span>Studio de Thèmes Haute Conversion</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">Les 8 Thèmes Spécialisés de la Vitrine</h1>
            <p className="text-sm text-slate-600">
              Chaque thème a été minutieusement modélisé pour répondre aux spécificités psychologiques et logistiques d'un secteur commercial précis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {THEMES_DOCUMENTATION_CATALOG.map((thm) => (
              <div key={thm.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                      {thm.badge}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Thème Officiel</span>
                  </div>

                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{thm.name}</h2>
                    <p className="text-xs text-purple-700 font-bold">{thm.subtitle}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                    <strong>Secteur cible :</strong> {thm.targetSector}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800">Rôle commercial & psychologie de vente :</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{thm.role}</p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-slate-800">Fonctionnalités natives incluses :</div>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {thm.keyFeatures.map((kf, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{kf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1 mt-4">
                  <div className="font-bold">Angle Marketing Clé :</div>
                  <div>{thm.marketingAngle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EcosystemDocPortalApp;
