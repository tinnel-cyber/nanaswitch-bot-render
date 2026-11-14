import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Users, Award, BookOpen, GraduationCap, Video, Sparkles, 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2, 
  Clock, ShieldCheck, UploadCloud, AlertCircle, FileText, 
  HelpCircle, Eye, EyeOff, GripVertical, Settings, ExternalLink, 
  Play, Edit3, Check, X, RefreshCw, Layers, Radio, Megaphone, 
  Bot, Briefcase, ShoppingBag, Send, ChevronRight, BarChart3,
  Calendar, CreditCard, Wallet, ArrowRight, ArrowLeft, Star, SlidersHorizontal,
  Copy, Globe, Loader2, Plus, PlusCircle
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { 
  subscribeToEnrollments, 
  subscribeToStudentRoster, 
  subscribeToSubmissions, 
  computeFinancialAnalytics, 
  clearInstructorLocalCaches,
  EnrollmentRecord, 
  ComputedFinancials, 
  FinancialDataPoint, 
  AnalyticsPeriod 
} from '../../../../services/instructorDataService';
import { getStoredFunnelsCount, triggerUpsellModal, normalizePlanId, isUnlimitedCourses, getPlanLimits } from '../../../../utils/planFeatures';
import { AssignmentSubmission, StudentRosterItem, StoreUser, StoreSubscription } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { ProCrownIcon } from '../../../../components/common/ProFeatureGuard';
import { CreateWebinarModal } from '../../../../components/CreateWebinarModal';
import { UltimateFunnelBuilder } from '../../../../components/storeBuilder/UltimateFunnelBuilder';
import { AssignmentEvaluationDrawer } from './AssignmentEvaluationDrawer';
import { createPortal } from 'react-dom';
import { 
  CampusPriveModal, 
  NanaAcademyModal, 
  AiPedagogicModal, 
  IntegrationsModal,
  VitrinePubliqueModal
} from './InstructorHubModals';
import { ProFeaturesModal, ProFeatureTab } from '../../../../components/ProFeaturesModal';
import { ThemeSwitcher } from '../../../../components/ThemeSwitcher';

const CourseForgeCanvas = React.lazy(() => 
  import('./forge/CourseForgeCanvas').then(m => ({ default: m.CourseForgeCanvas }))
);
const EscrowQuotesView = React.lazy(() => 
  import('../../../../components/quotes/EscrowQuotesView').then(m => ({ default: m.EscrowQuotesView }))
);
const ResumeBuilderView = React.lazy(() => 
  import('../../../../components/resume/ResumeBuilderView').then(m => ({ default: m.ResumeBuilderView }))
);
import { InstructorCohortRealtimeMonitor } from './InstructorCohortRealtimeMonitor';
const ExternalIntegrationsHub = React.lazy(() => 
  import('./integrations/ExternalIntegrationsHub').then(m => ({ default: m.ExternalIntegrationsHub }))
);
const CampaignConfiguratorModal = React.lazy(() => 
  import('./promo/CampaignConfiguratorModal').then(m => ({ default: m.CampaignConfiguratorModal }))
);
const SocialBlastHub = React.lazy(() => 
  import('./promo/SocialBlastHub').then(m => ({ default: m.SocialBlastHub }))
);

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type KycStatus = 'non_soumis' | 'pending_validation' | 'valide' | 'rejete';
export type ComputerSkillLevel = 'debutant' | 'novice' | 'intermediaire';
export type { AnalyticsPeriod };

export interface InstructorProfile {
  fullName: string;
  email: string;
  phone: string;
  teachingDomain: string;
  computerSkill: ComputerSkillLevel;
  bio?: string;
  kycDocName?: string;
  kycDocSize?: string;
  kycStatus: KycStatus;
  kycSubmittedAt?: string;
}

export interface InstructorDashboardViewProps {
  instructorName?: string;
  planName?: string;
  isSuperAdmin?: boolean;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  initialTab?: 'DASHBOARD' | 'PROFILE_KYC' | 'COURSE_CREATE' | 'CORRECTIONS' | 'COHORT_REALTIME' | 'VIRAL_FUNNELS' | 'INTEGRATIONS';
  onNavigateModule?: (moduleKey: string) => void;
  onBack?: () => void;
  className?: string;
}

// =============================================================================
// SOUS-COMPOSANT 1 : EN-TÊTE & VIDÉO ONBOARDING (BENTO TOP)
// =============================================================================

interface OnboardingVideoSectionProps {
  instructorName: string;
  planName: string;
  isEditMode: boolean;
}

const OnboardingVideoSection: React.FC<OnboardingVideoSectionProps> = ({
  instructorName,
  planName,
  isEditMode
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/embed/dQw4w9WgXcQ');
  const [tempUrl, setTempUrl] = useState<string>('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/courses` : 'https://nanasore.com/courses';

  const handleCopyStoreLink = async () => {
    playValidationBeep();
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: 'Catalogue de Formations Nanasore',
          url: storeUrl,
        });
        return;
      } catch (err) {}
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    if (tempUrl.trim()) {
      let finalUrl = tempUrl.trim();
      // Formatage simple YouTube embed si lien standard
      if (finalUrl.includes('watch?v=')) {
        finalUrl = finalUrl.replace('watch?v=', 'embed/');
      } else if (finalUrl.includes('youtu.be/')) {
        finalUrl = finalUrl.replace('youtu.be/', 'www.youtube.com/embed/');
      }
      setVideoUrl(finalUrl);
    }
    setIsEditingUrl(false);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 sm:p-8 shadow-xl">
      {/* Halo décoratif d'arrière-plan */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Colonne Gauche : Accueil Formateur & Informations */}
        <div className="lg:col-span-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wide">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Votre Académie Privée en Marque Blanche</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Bienvenue, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-emerald-300 to-teal-200">{instructorName}</span> 👋
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Pilotez votre propre empire de formation en marque blanche, encaissez 100% de vos ventes directes sans commission, et animez votre campus indépendant.
            </p>
          </div>

          {/* Badge du Plan, Statuts & URL du Campus Privé */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-black shadow-md shadow-indigo-950/50">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{planName}</span>
            </span>

            {/* URL du Campus Privé Formateur avec Bouton Copier */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/90 text-xs shadow-inner">
              <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-mono text-slate-200 font-bold">{storeUrl}</span>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 active:scale-95"
                title="Copier le lien de ma boutique"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-bold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                    <span className="text-[10px] text-slate-400 hover:text-white font-medium">Copier</span>
                  </>
                )}
              </button>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Campus Actif & Isolé</span>
            </span>
          </div>
        </div>

        {/* Colonne Droite : Lecteur Vidéo d'Onboarding & Tutoriel */}
        <div className="lg:col-span-6">
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden group">
            {/* Barre de contrôle supérieure de la vidéo */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-slate-200">
                  Tutoriel d'intégration & Guide de démarrage
                </span>
              </div>

              {/* Bouton pour changer l'URL de la vidéo */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setTempUrl(videoUrl);
                  setIsEditingUrl(!isEditingUrl);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition cursor-pointer border border-slate-700"
                title="Modifier l'URL de la vidéo"
              >
                <Edit3 className="w-3 h-3 text-indigo-400" />
                <span>{isEditingUrl ? 'Fermer' : 'Éditer URL'}</span>
              </button>
            </div>

            {/* Formulaire d'édition de l'URL vidéo (affiché si isEditingUrl) */}
            {isEditingUrl && (
              <form onSubmit={handleSaveVideoUrl} className="p-3 bg-slate-900/95 border-b border-indigo-500/40 flex items-center gap-2">
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  required
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </form>
            )}

            {/* Lecteur Vidéo Responsive avec Poster ou Iframe */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {isPlaying ? (
                <iframe
                  src={`${videoUrl}?autoplay=1&rel=0`}
                  title="Tutoriel Formateur"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950">
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setIsPlaying(true);
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-indigo-950/60 transition duration-300 hover:scale-110 active:scale-95 cursor-pointer group-hover:shadow-indigo-500/30"
                  >
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 ml-1 fill-white" />
                  </button>
                  <p className="text-xs text-slate-300 font-bold mt-3">
                    Cliquez pour lancer le guide formateur (3 min)
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Découvrez comment configurer vos cours et encaisser en Mobile Money
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANT 2 : PROFIL & KYC FORMATEUR (SECTION / PARAMÈTRES)
// =============================================================================

interface KycSectionProps {
  profile: InstructorProfile;
  onUpdateProfile: (updated: Partial<InstructorProfile>) => void;
  onSubmitKyc: () => void;
}

const KycSection: React.FC<KycSectionProps> = ({
  profile,
  onUpdateProfile,
  onSubmitKyc
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onUpdateProfile({
        kycDocName: file.name,
        kycDocSize: `${(file.size / 1024).toFixed(0)} Ko`
      });
      playTapBeep();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onUpdateProfile({
        kycDocName: file.name,
        kycDocSize: `${(file.size / 1024).toFixed(0)} Ko`
      });
      playTapBeep();
    }
  };

  const getKycBadge = () => {
    switch (profile.kycStatus) {
      case 'valide':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>KYC Validé par le Super Admin</span>
          </span>
        );
      case 'pending_validation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>En attente de validation Super Admin</span>
          </span>
        );
      case 'rejete':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Document rejeté - Veuillez resoumettre</span>
          </span>
        );
      case 'non_soumis':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>KYC non soumis (Validation requise pour retraits)</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Profil Enseignant & Conformité KYC</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complétez votre fiche formateur et fournissez votre pièce d'identité (CNIB) pour débloquer les retraits instantanés Mobile Money.
          </p>
        </div>
        <div>{getKycBadge()}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulaire Informations de base & Enseignement */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nom Complet :</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => onUpdateProfile({ fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email Professionnel :</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => onUpdateProfile({ email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Téléphone (WhatsApp Reçu) :</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => onUpdateProfile({ phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Domaine d'enseignement / Métier :</label>
              <input
                type="text"
                value={profile.teachingDomain}
                onChange={(e) => onUpdateProfile({ teachingDomain: e.target.value })}
                placeholder="Ex: FinTech, Télécoms, IA, E-commerce"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Niveau de Maîtrise Informatique (3 options exigées) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Niveau de maîtrise informatique :</label>
            <select
              value={profile.computerSkill}
              onChange={(e) => onUpdateProfile({ computerSkill: e.target.value as ComputerSkillLevel })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="debutant">Débutant (Besoins d'assistance pour créer des cours)</option>
              <option value="novice">Novice (Navigation web basique et bureautique)</option>
              <option value="intermediaire">Intermédiaire (Autonome sur les plateformes digitales et outils SaaS)</option>
            </select>
          </div>
        </div>

        {/* Zone de Dépôt Drag & Drop pour le KYC (CNIB) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Pièce d'Identité (CNIB / Passeport) :</span>
              <span className="text-[11px] text-indigo-400">JPG, PNG ou PDF</span>
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                isDragging 
                  ? 'border-indigo-400 bg-indigo-500/10' 
                  : 'border-slate-700/80 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {profile.kycDocName ? (
                <div className="space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white truncate max-w-[220px]">
                    {profile.kycDocName}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {profile.kycDocSize || 'Fichier prêt'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">
                    Glissez votre CNIB ici ou <span className="text-indigo-400 underline">parcourez</span>
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    Photo lisible recto/verso requise
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton d'action principal : Soumettre au Super Admin */}
          <button
            type="button"
            onClick={onSubmitKyc}
            disabled={profile.kycStatus === 'pending_validation'}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 ${
              profile.kycStatus === 'pending_validation'
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-950/40'
            }`}
          >
            {profile.kycStatus === 'pending_validation' ? (
              <>
                <Clock className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Dossier transmis au Super Admin (En examen)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Soumettre au Super Admin pour validation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANT 3 : ANALYTIQUE FINANCIÈRE (GRAPHIQUES ÉLÉGANTS)
// =============================================================================

interface FinancialAnalyticsProps {
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  financials: ComputedFinancials;
  onNavigateModule?: (key: string) => void;
  onRequestWithdrawal?: () => void;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({
  period,
  onPeriodChange,
  financials,
  onNavigateModule,
  onRequestWithdrawal
}) => {
  const data = financials.data;
  const totalGains = financials.totalGains;
  const totalRetraits = financials.totalRetraits;
  const totalBonus = financials.totalBonus;
  const soldeDisponible = financials.soldeDisponible;
  const maxVal = Math.max(...data.map(d => d.gains), 1);

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-6 sm:p-8 shadow-xl space-y-6">
      {/* En-tête de la section financière */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Analytique Financière & Rémunération</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Suivi en temps réel de vos ventes de cours, commissions affiliés et retraits Mobile Money.
          </p>
        </div>

        {/* Sélecteur de période & synchronisation temps réel */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
            {(['7j', '30j', '12m'] as AnalyticsPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  playTapBeep();
                  onPeriodChange(p);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  period === p 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === '7j' ? '7 Jours' : p === '30j' ? '30 Jours' : '12 Mois'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              clearInstructorLocalCaches();
              window.location.reload();
            }}
            title="Actualiser et synchroniser avec Firestore"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cartes de totaux analytiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gains */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Évolution des gains
          </span>
          <div className="text-xl font-black text-white">
            {totalGains.toLocaleString('fr-FR')} <span className="text-xs font-bold text-emerald-400">FCFA</span>
          </div>
          <div className="text-[10.5px] text-emerald-400 flex items-center gap-1 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{financials.hasSales ? 'Ventes en direct 0% commission' : 'Prêt à encaisser'}</span>
          </div>
        </div>

        {/* Retraits effectués */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Retraits effectués
          </span>
          <div className="text-xl font-black text-white">
            {totalRetraits.toLocaleString('fr-FR')} <span className="text-xs font-bold text-indigo-400">FCFA</span>
          </div>
          <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Vers Wave / Orange Money</span>
          </div>
        </div>

        {/* Bonus partenaires */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Bonus partenaires
          </span>
          <div className="text-xl font-black text-white">
            {totalBonus.toLocaleString('fr-FR')} <span className="text-xs font-bold text-amber-400">FCFA</span>
          </div>
          <div className="text-[10.5px] text-amber-400 flex items-center gap-1 font-bold">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Programme affilié 0% commission</span>
          </div>
        </div>

        {/* Solde disponible pour retrait */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-950/60 to-slate-950 border border-indigo-500/40 space-y-1">
          <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-indigo-400" />
            Solde disponible
          </span>
          <div className="text-xl font-black text-emerald-300">
            {soldeDisponible.toLocaleString('fr-FR')} <span className="text-xs font-bold text-emerald-400">FCFA</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              if (onRequestWithdrawal) {
                onRequestWithdrawal();
              }
            }}
            disabled={soldeDisponible <= 0}
            className={`w-full mt-1 py-1 px-2 rounded-lg text-white text-[10px] font-black tracking-wide transition text-center ${
              soldeDisponible > 0 
                ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-md' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {soldeDisponible > 0 ? 'Demander un retrait' : 'Solde nul'}
          </button>
        </div>
      </div>

      {/* Phrase Inspirante Motivatrice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200 italic">
              « Le secret pour avancer est de commencer. Votre savoir a une valeur inestimable, partagez votre passion et formez vos premiers apprenants dès aujourd'hui ! »
            </p>
            <span className="text-[10.5px] text-indigo-300 font-bold tracking-wide mt-0.5 block">
              {financials.hasSales ? '📈 Vos revenus augmentent en temps réel' : '🌱 Courbe prête pour vos premières inscriptions et règlements Mobile Money (0% commission)'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              if (navigator.clipboard) {
                navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.origin + '/courses' : '');
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Copier le lien public de votre catalogue de formations"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copier mon lien Académie</span>
          </button>
        </div>
      </div>

      {/* Visualisation Graphique Continue de la Courbe Analytique */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 rounded-full bg-emerald-400" />
              <span>Gains réels {totalGains === 0 ? '(0 FCFA)' : `(${totalGains.toLocaleString('fr-FR')} FCFA)`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 rounded-full bg-indigo-400" />
              <span>Retraits ({totalRetraits.toLocaleString('fr-FR')} FCFA)</span>
            </div>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">Valeurs en FCFA • 0% Commission</span>
        </div>

        <div className="h-56 w-full relative">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
            <defs>
              <linearGradient id="gainsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="retraitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 50, 100, 150].map((y, idx) => (
              <line 
                key={idx} 
                x1="0" 
                y1={y} 
                x2="700" 
                y2={y} 
                stroke="#1e293b" 
                strokeDasharray="4 4" 
                strokeWidth="1" 
              />
            ))}

            {(() => {
              const stepX = 700 / (data.length - 1 || 1);
              const pointsGains = data.map((d, i) => `${i * stepX},${180 - (d.gains / maxVal) * 150}`).join(' ');
              const pointsRetraits = data.map((d, i) => `${i * stepX},${180 - (d.retraits / maxVal) * 150}`).join(' ');

              const areaGains = `0,190 ${pointsGains} ${(data.length - 1) * stepX},190`;
              const areaRetraits = `0,190 ${pointsRetraits} ${(data.length - 1) * stepX},190`;

              return (
                <>
                  <polygon points={areaGains} fill="url(#gainsGrad)" />
                  <polygon points={areaRetraits} fill="url(#retraitsGrad)" />

                  <polyline fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsGains} />
                  <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsRetraits} />

                  {data.map((d, i) => {
                    const cx = i * stepX;
                    const cyGains = 180 - (d.gains / maxVal) * 150;
                    return (
                      <g key={i} className="group cursor-pointer">
                        <circle cx={cx} cy={cyGains} r="4.5" fill="#10b981" stroke="#020617" strokeWidth="2" />
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-2">
            {data.map((d, i) => (
              <span key={i}>{d.date}</span>
            ))}
          </div>
        </div>

        {/* Incitation contextuelle si 0 vente */}
        {!financials.hasSales && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="text-xs text-slate-400">
              <span className="text-white font-bold">0 vente enregistrée sur cette période.</span> Partagez vos liens de formations ou diffusez un webinaire pour déclencher vos premières inscriptions.
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule?.('LIVE_WEBINAR')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Lancer un Live Flash</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANT 4 : KPIS ET MÉTRIQUES DE L'ACADÉMIE (STAT CARDS BENTO)
// =============================================================================

interface KpiGridProps {
  totalSalesCount: number;
  totalEarnings: number;
  activeStudentsCount: number;
  certificatesCount: number;
  pendingSubmissionsCount: number;
  gradedSubmissionsCount: number;
  funnelsCount: number;
  coursesCount?: number;
  isUnlimitedCourses?: boolean;
  planId?: string;
}

const KpiGrid: React.FC<KpiGridProps> = ({
  totalSalesCount,
  totalEarnings,
  activeStudentsCount,
  certificatesCount,
  pendingSubmissionsCount,
  gradedSubmissionsCount,
  funnelsCount,
  coursesCount = 1,
  isUnlimitedCourses = false,
  planId = 'free'
}) => {
  const maxAllowedCourses = planId === 'starter' ? 5 : 1;
  const kpiItems = [
    {
      title: 'Formations & Cours Hébergés',
      value: isUnlimitedCourses 
        ? `${coursesCount} (Illimité)` 
        : `${coursesCount} / ${maxAllowedCourses} cours`,
      subtitle: isUnlimitedCourses 
        ? '👑 Formule Pro : Hébergement de cours illimité sans restriction' 
        : `Formule ${planId === 'starter' ? 'Starter' : 'Gratuite'} : ${coursesCount}/${maxAllowedCourses} cours utilisé. Passez à Pro pour l\'illimité.`,
      badge: isUnlimitedCourses ? '👑 Cours Illimités' : `Limite : ${maxAllowedCourses} cours max`,
      badgeColor: isUnlimitedCourses 
        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30 font-bold' 
        : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      icon: BookOpen,
      iconColor: isUnlimitedCourses ? 'text-amber-400' : 'text-indigo-400'
    },
    {
      title: 'Visiteurs Uniques (Mon Campus)',
      value: activeStudentsCount > 0 ? (activeStudentsCount * 5).toLocaleString('fr-FR') : '0',
      subtitle: activeStudentsCount > 0 ? 'Trafic direct & liens partagés' : '0 visiteur • Partagez votre lien Académie pour attirer vos premiers visiteurs',
      badge: 'Trafic Direct',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      icon: Globe,
      iconColor: 'text-sky-400'
    },
    {
      title: 'Ventes Directes (Sans commission)',
      value: totalSalesCount > 0 ? `${totalSalesCount} vente${totalSalesCount > 1 ? 's' : ''}` : '0 vente',
      subtitle: totalSalesCount > 0 
        ? `${totalEarnings.toLocaleString('fr-FR')} FCFA • 0% commission` 
        : '0 FCFA généré • Publiez un cours ou lancez un live pour déclencher votre 1ère vente !',
      badge: '0% Commission',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: DollarSign,
      iconColor: 'text-emerald-400'
    },
    {
      title: 'Étudiants Inscrits',
      value: activeStudentsCount > 0 ? `${activeStudentsCount} apprenant${activeStudentsCount > 1 ? 's' : ''}` : '0 apprenant',
      subtitle: activeStudentsCount > 0 
        ? `${activeStudentsCount} inscrit${activeStudentsCount > 1 ? 's' : ''} confirmé${activeStudentsCount > 1 ? 's' : ''}` 
        : '0 apprenant - Partagez votre lien pour obtenir votre premier inscrit 🚀',
      badge: 'Campus Privé',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      icon: Users,
      iconColor: 'text-indigo-400'
    },
    {
      title: 'Certificats Délivrés',
      value: `${certificatesCount}`,
      subtitle: certificatesCount > 0 ? 'Attestations QR Code officielles délivrées' : '0 certificat • Délivrés automatiquement lors de la complétion',
      badge: 'Éligibles',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: Award,
      iconColor: 'text-amber-400'
    },
    {
      title: 'Devoirs Académie',
      value: `${gradedSubmissionsCount} corrigés`,
      subtitle: pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} en attente de correction` : '0 devoir en attente',
      badge: 'Inbox',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      icon: FileText,
      iconColor: 'text-rose-400'
    },
    {
      title: 'Tunnels de Vente (Funnels)',
      value: `${funnelsCount} configurés`,
      subtitle: funnelsCount > 0 ? 'Tunnels de capture et d\'achat direct' : '0 tunnel • Créez votre 1ère page de vente',
      badge: 'CRO Viral',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      icon: Layers,
      iconColor: 'text-purple-400'
    },
    {
      title: 'Live Webinaires',
      value: '0 tenu',
      subtitle: 'Webinaires et Lives interactifs',
      badge: 'Daily WebRTC',
      badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      icon: Radio,
      iconColor: 'text-pink-400'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span>Métriques Clés & Performance de l'Académie</span>
        </h2>
        <span className="text-xs text-slate-400 font-mono">Temps réel</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiItems.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-200 shadow-md flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center ${item.iconColor} group-hover:scale-105 transition-transform`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block">{item.title}</span>
                <div className="text-lg font-black text-white mt-0.5 tracking-tight">{item.value}</div>
                <span className="text-[11px] text-slate-400 block mt-1">{item.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANT 5 : HUB DE NAVIGATION (10 MODULES CLÉS DE L'ÉCOSYSTÈME)
// =============================================================================

interface NavigationHubProps {
  onNavigate: (moduleKey: string) => void;
  isFree?: boolean;
}

const NavigationHub: React.FC<NavigationHubProps> = ({ onNavigate, isFree = false }) => {
  const modules = [
    {
      key: 'COURSE_CREATE',
      title: 'Créer un nouveau cours',
      desc: 'Atelier complet Course Forge : concevez vos programmes, structurez les modules, ajoutez vos vidéos, quiz et devoirs.',
      icon: PlusCircle,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Atelier Forge',
      isProOnly: false
    },
    {
      key: 'CAMPUS_VIRTUEL',
      title: 'Mon Campus Privé (Marque Blanche)',
      desc: 'Votre école 100% personnalisée : nom de domaine dédié, charte graphique propre et étudiants exclusifs.',
      icon: GraduationCap,
      color: 'from-indigo-600 to-purple-600',
      badge: '100% Marque Blanche',
      isProOnly: false
    },
    {
      key: 'NANA_ACADEMY_RESSOURCES',
      title: 'NaNa Academy (Formations & Ressources)',
      desc: 'Apprenez à booster vos ventes avec nos experts et découvrez les secrets pédagogiques des tops formateurs.',
      icon: BookOpen,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Boost Ventes',
      isProOnly: false
    },
    {
      key: 'VITRINE_PUBLIQUE_NANA',
      title: 'Visibilité sur la Vitrine Publique NaNa',
      desc: 'Propulsez vos cours sur la vitrine officielle NaNa pour capter des milliers d’étudiants qualifiés.',
      icon: Globe,
      color: 'from-amber-600 to-rose-600',
      badge: 'Exclusivité Plan Elite',
      isProOnly: false
    },
    {
      key: 'FORUM_CORRECTION',
      title: 'Espace Formateur & Correction',
      desc: 'Évaluez les devoirs, fournissez des retours audio/vidéo et notez les étudiants.',
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Prioritaire',
      isProOnly: false
    },
    {
      key: 'LIVE_WEBINAR',
      title: 'Live Webinaire & Campagnes',
      desc: 'Planifiez des lives Daily.co, diffusez des blasts WhatsApp et animez vos sessions.',
      icon: Radio,
      color: 'from-rose-600 to-amber-600',
      badge: isFree ? '3 max / mois' : 'Direct Illimité',
      isProOnly: false
    },
    {
      key: 'CV_PRO',
      title: 'CV Pro Certifié',
      desc: 'Générez des curriculums vitæ certifiés NaNa pour vos diplômés.',
      icon: Briefcase,
      color: 'from-amber-600 to-orange-600',
      badge: 'Carrière',
      isProOnly: false
    },
    {
      key: 'AGENT_IA',
      title: 'Agent IA Pédagogique',
      desc: 'Tuteur intelligent 24/7 pour assister les étudiants et rédiger des quiz.',
      icon: Bot,
      color: 'from-fuchsia-600 to-indigo-600',
      badge: isFree ? 'Pro 👑' : 'Intelligence',
      isProOnly: true
    },
    {
      key: 'DEVIS_PROJETS',
      title: 'Devis / Projets Séquestre',
      desc: 'Gérez les devis de formation B2B et les paiements bloqués en séquestre Escrow.',
      icon: CreditCard,
      color: 'from-teal-600 to-emerald-600',
      badge: 'Séquestre',
      isProOnly: false
    },
    {
      key: 'INTEGRATIONS',
      title: 'Intégrations Externes',
      desc: 'Connectez vos comptes WooCommerce, Brevo emailing et passerelles Twilio SMS.',
      icon: Settings,
      color: 'from-slate-700 to-slate-900',
      badge: 'API',
      isProOnly: false
    },
    {
      key: 'FUNNEL_BUILDER',
      title: 'Funnel Builder Haute Conversion',
      desc: 'Constructeur drag & drop de pages de vente ultra-rapides optimisées pour le mobile.',
      icon: Layers,
      color: 'from-purple-600 to-indigo-700',
      badge: isFree ? '1 funnel actif' : 'CRO Illimité',
      isProOnly: false
    },
    {
      key: 'VIDEO_PUB_GOOGLE_FLOW',
      title: 'Création Vidéo Pub (Google Flow)',
      desc: 'Studio d’animation IA pour concevoir des spots publicitaires viraux.',
      icon: Sparkles,
      color: 'from-pink-600 to-rose-600',
      badge: isFree ? 'Pro 👑' : 'Studio Pub',
      isProOnly: true
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Hub de Navigation & Modules de l'Écosystème</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Accédez rapidement à tous les outils de création pédagogique, de conversion commerciale et de diffusion.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {modules.map((mod) => {
          const IconComp = mod.icon;
          return (
            <button
              key={mod.key}
              type="button"
              onClick={() => {
                playTapBeep();
                if (mod.isProOnly && isFree) {
                  triggerUpsellModal({
                    mode: 'FEATURE_LOCKED',
                    featureLabel: mod.title,
                    customTitle: `Débloquez ${mod.title} 👑`,
                    customMessage: `Cette fonctionnalité avancée est réservée aux abonnés du Plan Pro. Débloquez-la dès maintenant pour faire décoller votre Académie !`
                  });
                  return;
                }
                onNavigate(mod.key);
              }}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-left transition-all duration-300 shadow-md hover:shadow-indigo-950/50 group flex flex-col justify-between cursor-pointer relative overflow-hidden"
            >
              {/* Effet lumineux discret au hover */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/15 transition duration-500" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${mod.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    mod.isProOnly && isFree 
                      ? 'bg-amber-950/60 text-amber-300 border-amber-500/40' 
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}>
                    {mod.isProOnly && isFree && <ProCrownIcon className="w-3 h-3 text-amber-400" />}
                    <span>{mod.badge}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                    <span>{mod.title}</span>
                    {mod.isProOnly && isFree && <ProCrownIcon className="w-3 h-3 text-amber-400 shrink-0" />}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 pt-3 group-hover:translate-x-1 transition-transform">
                <span>{mod.isProOnly && isFree ? 'Débloquer 👑' : 'Accéder'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// SOUS-COMPOSANT 6 : BARRE D'OUTILS ET BANDEAU SUPER ADMIN (MODE ÉDITION)
// =============================================================================

interface SuperAdminToolbarProps {
  isSuperAdmin: boolean;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  hiddenWidgets: Record<string, boolean>;
  onToggleWidgetVisibility: (widgetKey: string) => void;
}

const SuperAdminToolbar: React.FC<SuperAdminToolbarProps> = ({
  isSuperAdmin,
  isEditMode,
  onToggleEditMode,
  hiddenWidgets,
  onToggleWidgetVisibility
}) => {
  if (!isSuperAdmin) return null;

  return (
    <>
      {/* Bandeau supérieur indicateur de Mode Édition */}
      {isEditMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-amber-200 shrink-0" />
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                Mode Édition Super Admin Actif
              </span>
              <span className="text-[11px] text-amber-100">
                Vous pouvez réorganiser ou masquer les blocs pour simplifier la vue du formateur.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onToggleEditMode();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs transition cursor-pointer"
            >
              Terminer l'édition
            </button>
          </div>
        </div>
      )}

      {/* Bouton Flottant en bas à droite */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onToggleEditMode();
          }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-black text-xs shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 border ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-amber-950/60'
              : 'bg-slate-900/95 hover:bg-slate-850 text-white border-slate-700 shadow-black/80'
          }`}
          title="Permet au Super Admin de personnaliser et réorganiser la vue formateur"
        >
          <GripVertical className="w-4 h-4 text-indigo-400" />
          <span>{isEditMode ? 'Enregistrer la disposition' : 'Réorganiser le tableau de bord'}</span>
        </button>
      </div>
    </>
  );
};

// =============================================================================
// COMPOSANT PRINCIPAL : TABLEAU DE BORD ENSEIGNANT / FORMATEUR
// =============================================================================

export const InstructorDashboardView: React.FC<InstructorDashboardViewProps> = ({
  instructorName = 'Prof. Ibrahim Konkobo',
  planName = 'Plan Pro (Académie Illimitée)',
  isSuperAdmin = false,
  currentUser,
  subscription,
  initialTab = 'DASHBOARD',
  onNavigateModule,
  onBack,
  className = ''
}) => {
  const authContext = useAuth();
  const activeUser = currentUser || authContext?.user;
  const resolvedPlanId = normalizePlanId(subscription || activeUser?.plan || activeUser);
  const isUnlimited = isUnlimitedCourses(resolvedPlanId);
  const isFree = resolvedPlanId === 'free';

  const [coursesCount, setCoursesCount] = useState<number>(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('nana_published_courses_cache') : null;
      if (cached) {
        const list = JSON.parse(cached);
        return Array.isArray(list) ? list.length : 1;
      }
    } catch {}
    return 1;
  });

  useEffect(() => {
    const updateCourseCount = () => {
      try {
        const cached = localStorage.getItem('nana_published_courses_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) setCoursesCount(list.length);
        }
      } catch {}
    };
    updateCourseCount();
    window.addEventListener('storage', updateCourseCount);
    return () => window.removeEventListener('storage', updateCourseCount);
  }, []);

  // Nettoyage proactif automatique des anciens caches de transactions fictives
  useEffect(() => {
    try {
      const cached = localStorage.getItem('nana_enrollments_cache');
      if (cached && (cached.includes('tx_wave_1789751200053') || cached.includes('125000'))) {
        clearInstructorLocalCaches();
      }
    } catch {}
  }, []);

  // Onglet actif : vue d'ensemble du tableau de bord, atelier Course Forge, corrections, supervision realtime, tunnels viraux ou intégrations
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PROFILE_KYC' | 'COURSE_CREATE' | 'CORRECTIONS' | 'COHORT_REALTIME' | 'VIRAL_FUNNELS' | 'INTEGRATIONS'>(initialTab || 'DASHBOARD');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Période analytique financière
  const [financialPeriod, setFinancialPeriod] = useState<AnalyticsPeriod>('7j');

  // Flux de données réelles synchronisées Firestore (scopées par formateur)
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Devoirs effectifs (uniquement les soumissions réelles Firestore)
  const effectiveSubmissions = useMemo(() => {
    return submissions;
  }, [submissions]);

  const pendingSubmissionsCount = useMemo(() => {
    return effectiveSubmissions.filter(s => s.status === 'PENDING').length;
  }, [effectiveSubmissions]);

  // Modales et tiroirs interactifs pour les modules opérationnels
  const [isWebinarModalOpen, setIsWebinarModalOpen] = useState(false);
  const [isFunnelBuilderOpen, setIsFunnelBuilderOpen] = useState(false);
  const [isCorrectionDrawerOpen, setIsCorrectionDrawerOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [correctionFilter, setCorrectionFilter] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalProvider, setWithdrawalProvider] = useState<'wave' | 'orange' | 'moov' | 'mtn'>('wave');
  const [withdrawalPhone, setWithdrawalPhone] = useState<string>('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Modales interactives de l'Écosystème Formateur
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [isNanaAcademyModalOpen, setIsNanaAcademyModalOpen] = useState(false);
  const [isAiPedagogicModalOpen, setIsAiPedagogicModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isVitrineModalOpen, setIsVitrineModalOpen] = useState(false);
  const [isEscrowQuotesModalOpen, setIsEscrowQuotesModalOpen] = useState(false);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalTab, setProModalTab] = useState<ProFeatureTab>('WHITE_LABEL');

  useEffect(() => {
    const unsubEnroll = subscribeToEnrollments((list) => {
      setEnrollments(list);
      setIsLoadingData(false);
    }, { instructorId: activeUser?.id });
    const unsubStudents = subscribeToStudentRoster((list) => {
      setStudents(list);
    }, { instructorId: activeUser?.id });
    const unsubSubmissions = subscribeToSubmissions((list) => {
      setSubmissions(list);
    }, { instructorId: activeUser?.id });

    return () => {
      unsubEnroll();
      unsubStudents();
      unsubSubmissions();
    };
  }, [activeUser?.id]);

  const financials = useMemo(() => {
    return computeFinancialAnalytics(enrollments, financialPeriod);
  }, [enrollments, financialPeriod]);

  // Mode Édition Super Admin
  const [isSuperAdminEditMode, setIsSuperAdminEditMode] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState<Record<string, boolean>>({});

  // État du profil & KYC
  const [profile, setProfile] = useState<InstructorProfile>({
    fullName: activeUser?.name || instructorName,
    email: activeUser?.email || 'konkobo.telecom@gmail.com',
    phone: activeUser?.phone || '+226 70 00 00 00',
    teachingDomain: 'FinTech, Télécoms & Intelligence Artificielle',
    computerSkill: 'intermediaire',
    kycStatus: isSuperAdmin ? 'valide' : 'non_soumis'
  });

  const [kycSuccessNotice, setKycSuccessNotice] = useState(false);

  const handleUpdateProfile = (updated: Partial<InstructorProfile>) => {
    setProfile(prev => ({ ...prev, ...updated }));
  };

  const handleSubmitKyc = () => {
    playValidationBeep();
    setProfile(prev => ({
      ...prev,
      kycStatus: 'pending_validation',
      kycSubmittedAt: new Date().toISOString()
    }));
    setKycSuccessNotice(true);
    setTimeout(() => setKycSuccessNotice(false), 5000);
  };

  const handleToggleWidgetVisibility = (widgetKey: string) => {
    playTapBeep();
    setHiddenWidgets(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey]
    }));
  };

  const handleNavigate = (key: string) => {
    playTapBeep();

    if (key === 'LIVE_WEBINAR') {
      setIsWebinarModalOpen(true);
      return;
    }
    if (key === 'FUNNEL_BUILDER') {
      setIsFunnelBuilderOpen(true);
      return;
    }
    if (key === 'FORUM_CORRECTION' || key === 'forum_correction') {
      setActiveTab('CORRECTIONS');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/dashboard/academy/corrections');
      }
      return;
    }

    if (key === 'CREATE_COURSE' || key === 'COURSE_CREATE' || key === 'course_create') {
      setActiveTab('COURSE_CREATE');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/dashboard/courses/create');
      }
      return;
    }

    // Mon Campus Privé (Marque Blanche) → Modale dédiée avec accès direct salle de classe et réglages marque blanche
    if (key === 'CAMPUS_VIRTUEL' || key === 'campus_virtuel') {
      setIsCampusModalOpen(true);
      return;
    }

    // NaNa Academy Ressources → Modale dédiée Formations & Ressources Ventes pour formateurs
    if (key === 'NANA_ACADEMY_RESSOURCES' || key === 'nana_academy_ressources') {
      setIsNanaAcademyModalOpen(true);
      return;
    }

    // Agent IA Pédagogique → Modale dédiée Tuteur IA 24/7 & Générateur de Quiz
    if (key === 'AGENT_IA' || key === 'agent_ia') {
      if (isFree) {
        triggerUpsellModal({
          mode: 'FEATURE_LOCKED',
          featureLabel: 'Agent IA Pédagogique 👑',
          customTitle: 'Débloquez l\'Agent IA Pédagogique 👑',
          customMessage: 'L\'Agent IA génère vos quiz, résume vos cours et répond aux questions des apprenants 24/7. Passez au plan Pro pour l\'activer !'
        });
        return;
      }
      setIsAiPedagogicModalOpen(true);
      return;
    }

    // Intégrations Externes → Modale connecteurs API WooCommerce, Brevo, Twilio, Daily.co
    if (key === 'INTEGRATIONS' || key === 'integrations' || key === 'SETTINGS_EXTENSIONS') {
      setIsIntegrationsModalOpen(true);
      return;
    }

    // CV Pro Certifié → Modale dédiée ResumeBuilderView
    if (key === 'CV_PRO' || key === 'cv_pro') {
      setIsCvModalOpen(true);
      return;
    }

    // Devis / Projets Séquestre → Modale EscrowQuotesView (Devis B2B et séquestre Escrow)
    if (key === 'DEVIS_PROJETS' || key === 'devis_projets' || key === 'DOCUSIGN_HUB') {
      setIsEscrowQuotesModalOpen(true);
      return;
    }

    // Studio Vidéo IA (Vidnoz / Google Flow) → vue AiStudioView
    if (key === 'VIDEO_PUB_GOOGLE_FLOW') {
      if (isFree) {
        triggerUpsellModal({
          mode: 'FEATURE_LOCKED',
          featureLabel: 'Studio Vidéo Pub IA 👑',
          customTitle: 'Débloquez le Studio Vidéo Pub IA 👑',
          customMessage: 'Créez des vidéos publicitaires haute conversion propulsées par l\'IA Google Flow. Réservé aux comptes Pro.'
        });
        return;
      }
      // Redirection vers le vrai Studio IA (contient la section Vidéo/Avatar)
      if (onNavigateModule) onNavigateModule('AI_STUDIO');
      return;
    }

    if (key === 'VITRINE_PUBLIQUE_NANA' || key === 'vitrine_publique_nana') {
      setIsVitrineModalOpen(true);
      return;
    }

    if (onNavigateModule) {
      onNavigateModule(key);
    } else {
      console.info(`[INSTRUCTOR DASHBOARD] Redirection vers le module : ${key}`);
    }
  };

  return (
    <div className={`min-h-screen bg-primary text-body p-4 sm:p-6 lg:p-8 space-y-8 font-sans transition-colors duration-200 ${className}`}>
      
      {/* 1. Barre de supervision Super Admin (si isSuperAdmin actif) */}
      <SuperAdminToolbar
        isSuperAdmin={isSuperAdmin}
        isEditMode={isSuperAdminEditMode}
        onToggleEditMode={() => setIsSuperAdminEditMode(prev => !prev)}
        hiddenWidgets={hiddenWidgets}
        onToggleWidgetVisibility={handleToggleWidgetVisibility}
      />

      {/* Notification Toast KYC Soumis */}
      {kycSuccessNotice && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Dossier KYC transmis au Super Admin ! Vos retraits seront débloqués après vérification.</span>
        </div>
      )}

      {/* 2. Navigation d'onglets supérieure : Création de cours & Correction au premier plan */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex-wrap">
          {/* 1. Interface de Création de Cours (Premier Plan) */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              setActiveTab('COURSE_CREATE');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard/courses/create');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COURSE_CREATE'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Création de Cours (Course Forge)</span>
            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-1">Studio</span>
          </button>

          {/* 2. Espace de Correction (Premier Plan) */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('CORRECTIONS');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CORRECTIONS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Espace de Correction</span>
            {pendingSubmissionsCount > 0 && (
              <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black animate-pulse ml-1">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>

          {/* 3. Vue d'Ensemble & Analytique */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('DASHBOARD');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/instructor');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tableau de Bord & Analytique
          </button>

          {/* 4. Supervision Cohorte Realtime Supabase */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveTab('COHORT_REALTIME'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COHORT_REALTIME'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                : 'text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Cohorte Live</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          </button>

          {/* 5. Tunnels Viraux & Campagnes Promo */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveTab('VIRAL_FUNNELS'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VIRAL_FUNNELS'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Tunnels &amp; Promo</span>
          </button>

          {/* 6. Intégrations & Connecteurs LMS */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveTab('INTEGRATIONS'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'INTEGRATIONS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Connecteurs LMS</span>
          </button>

          {/* 7. Profil & KYC */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveTab('PROFILE_KYC'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PROFILE_KYC'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Profil &amp; KYC</span>
            {profile.kycStatus === 'pending_validation' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Indicateur de Plan, Sélecteur de Thème & Bouton Quitter */}
        <div className="flex items-center gap-3">
          <ThemeSwitcher variant="dropdown" />
          {onBack && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700/80 cursor-pointer shadow-sm active:scale-95"
              title="Retourner à l'accueil"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              <span>Quitter l'Espace</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-400">Statut SaaS :</span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              Multi-Tenant Actif
            </span>
          </div>
        </div>
      </div>

      {/* 3. VUE PRINCIPALE DU TABLEAU DE BORD */}
      {activeTab === 'DASHBOARD' ? (
        <div className="space-y-8">
          {/* ================================================================ */}
          {/* 🌟 MODULES ESSENTIELS AU PREMIER PLAN : CRÉATION DE COURS & CORRECTION */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* CARTE 1 : INTERFACE DÉDIÉE À LA CRÉATION DE COURS (COURSE FORGE) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-emerald-500/70 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 shadow-sm">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ATELIER DE CRÉATION DE COURS 🎓</span>
                  </div>
                  {isUnlimited ? (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 shadow-xs">
                      <span>👑 Plan Pro : Cours Illimités</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1">
                      <span>Plan {resolvedPlanId === 'starter' ? 'Starter (5 cours max)' : 'Gratuit (1 cours max)'}</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Créateur &amp; Éditeur de Cours</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    Construisez vos cursus complets, leçons vidéo HD, devoirs à rendre, quiz interactifs et simulations orales pilotées par IA.
                  </p>
                </div>

                {/* Raccourcis Rapides Pédagogiques */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setActiveTab('COURSE_CREATE');
                    }}
                    className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition group/btn cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouveau Module</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Ajouter une leçon vidéo ou texte</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsWebinarModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition group/btn cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-rose-400">
                      <Video className="w-3.5 h-3.5" />
                      <span>Live Classroom</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Programmer un direct interactif</p>
                  </button>
                </div>
              </div>

              {/* Bouton d'action principal au premier plan */}
              <div className="pt-6 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    setActiveTab('COURSE_CREATE');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard/courses/create');
                    }
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/60 hover:shadow-emerald-900/80 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-emerald-400/40"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Accéder à l'Interface de Création de Cours (Course Forge)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CARTE 2 : ESPACE DE CORRECTION & ÉVALUATION DES DEVOIRS (VISIBLE IMMÉDIATEMENT) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/40 p-6 sm:p-7 shadow-2xl flex flex-col justify-between group hover:border-indigo-500/70 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/40 shadow-sm">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ESPACE DE CORRECTION &amp; NOTATION ✍️</span>
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                    pendingSubmissionsCount > 0 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {pendingSubmissionsCount} en attente
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Copies &amp; Travaux des Étudiants</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    Évaluez directement les travaux pratiques soumis, attribuez des notes certifiées et enregistrez des feedbacks vocaux instantanés.
                  </p>
                </div>

                {/* Aperçu direct des devoirs récents à corriger */}
                <div className="space-y-2 pt-1 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                  {effectiveSubmissions.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-300">Aucun devoir à corriger</p>
                      <p className="text-[10.5px] text-slate-400">Les travaux soumis par vos étudiants s'afficheront ici en temps réel.</p>
                    </div>
                  ) : (
                    effectiveSubmissions.slice(0, 3).map((sub) => {
                    const isPending = sub.status === 'PENDING';
                    return (
                      <div
                        key={sub.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0 overflow-hidden">
                            {sub.studentAvatarUrl ? (
                              <img src={sub.studentAvatarUrl} alt={sub.studentName} className="w-full h-full object-cover" />
                            ) : (
                              sub.studentName.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white block truncate">
                              {sub.studentName}
                            </span>
                            <span className="text-[10.5px] text-slate-400 block truncate">
                              {sub.assignmentTitle || sub.fileName}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSelectedSubmission(sub);
                            setIsCorrectionDrawerOpen(true);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isPending
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isPending ? 'Corriger' : `Noté ${sub.grade ?? 18}/20`}</span>
                        </button>
                      </div>
                    );
                  }))}
                </div>
              </div>

              {/* Bouton d'action principal de l'espace de correction */}
              <div className="pt-4 relative z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveTab('CORRECTIONS');
                  }}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-950/60 hover:shadow-indigo-900/80 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-indigo-400/40"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ouvrir l'Espace de Correction Complet</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {/* Section A : En-tête & Vidéo d'Onboarding */}
          {!hiddenWidgets['ONBOARDING_TOP'] && (
            <div className="relative group">
              {isSuperAdminEditMode && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500 text-amber-300 text-xs font-bold">
                  <GripVertical className="w-4 h-4 cursor-grab" />
                  <span>Widget Onboarding</span>
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetVisibility('ONBOARDING_TOP')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <OnboardingVideoSection
                instructorName={profile.fullName}
                planName={planName}
                isEditMode={isSuperAdminEditMode}
              />
            </div>
          )}

          {/* Section B : KPIs et Métriques de l'Académie */}
          {!hiddenWidgets['KPIS_GRID'] && (
            <div className="relative group">
              {isSuperAdminEditMode && (
                <div className="absolute top-0 right-0 z-30 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500 text-amber-300 text-xs font-bold">
                  <GripVertical className="w-4 h-4 cursor-grab" />
                  <span>Widget Métriques</span>
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetVisibility('KPIS_GRID')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <KpiGrid
                totalSalesCount={enrollments.length}
                totalEarnings={financials.totalGains}
                activeStudentsCount={students.length}
                certificatesCount={students.filter(s => s.certificateIssued).length}
                pendingSubmissionsCount={submissions.filter(s => s.status === 'PENDING').length}
                gradedSubmissionsCount={submissions.filter(s => s.status === 'GRADED').length}
                funnelsCount={getStoredFunnelsCount()}
                coursesCount={coursesCount}
                isUnlimitedCourses={isUnlimited}
                planId={resolvedPlanId}
              />
            </div>
          )}

          {/* Section C : Analytique Financière & Rémunération */}
          {!hiddenWidgets['FINANCE_CHART'] && (
            <div className="relative group">
              {isSuperAdminEditMode && (
                <div className="absolute top-0 right-0 z-30 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500 text-amber-300 text-xs font-bold">
                  <GripVertical className="w-4 h-4 cursor-grab" />
                  <span>Widget Financier</span>
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetVisibility('FINANCE_CHART')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <FinancialAnalytics
                period={financialPeriod}
                onPeriodChange={setFinancialPeriod}
                financials={financials}
                onNavigateModule={handleNavigate}
                onRequestWithdrawal={() => setIsWithdrawalModalOpen(true)}
              />
            </div>
          )}

          {/* Section D : Hub de Navigation (10 modules de l'écosystème) */}
          {!hiddenWidgets['NAVIGATION_HUB'] && (
            <div className="relative group">
              {isSuperAdminEditMode && (
                <div className="absolute top-0 right-0 z-30 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500 text-amber-300 text-xs font-bold">
                  <GripVertical className="w-4 h-4 cursor-grab" />
                  <span>Widget Navigation</span>
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetVisibility('NAVIGATION_HUB')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <NavigationHub onNavigate={handleNavigate} isFree={isFree} />
            </div>
          )}
        </div>
      ) : activeTab === 'COURSE_CREATE' ? (
        /* 4. VUE ONGLET CRÉATION / ÉDITION DE COURS (COURSE FORGE) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Créateur &amp; Éditeur de Cours (Course Forge)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-black border border-emerald-500/30">
                    STUDIO PÉDAGOGIQUE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Concevez l'arborescence, organisez vos modules, leçons vidéo, devoirs et sessions interactives.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('DASHBOARD');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/instructor');
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Retour au Tableau de Bord</span>
            </button>
          </div>

          <React.Suspense fallback={
            <div className="w-full h-[600px] rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400">Ouverture de l'atelier visuel Course Forge...</span>
            </div>
          }>
            <CourseForgeCanvas currentUser={activeUser} subscription={subscription} />
          </React.Suspense>
        </div>
      ) : activeTab === 'CORRECTIONS' ? (
        /* 4 bis. VUE COMPLÈTE ESPACE DE CORRECTION DES DEVOIRS */
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
          {/* Header Espace Correction */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Espace de Correction &amp; Évaluation Pédagogique
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10.5px] font-black border border-indigo-500/30">
                    CENTRE D'ÉVALUATION
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Corrigez les devoirs, notez les projets pratiques et délivrez des feedbacks vocaux ou écrits personnalisés.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('DASHBOARD');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/instructor');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer self-start md:self-auto shrink-0 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Retour au Tableau de Bord</span>
            </button>
          </div>

          {/* Filtres et KPIs rapides */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 self-start">
              <button
                type="button"
                onClick={() => setCorrectionFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  correctionFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Tous les devoirs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {effectiveSubmissions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCorrectionFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  correctionFilter === 'PENDING'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>En attente de notation</span>
                {pendingSubmissionsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
                    {pendingSubmissionsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCorrectionFilter('GRADED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  correctionFilter === 'GRADED'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Déjà évalués</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {effectiveSubmissions.filter(s => s.status !== 'PENDING').length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Délai moyen de correction recommandé : &lt; 24 heures</span>
            </div>
          </div>

          {/* Grille des devoirs */}
          {(() => {
            const filteredList = effectiveSubmissions.filter(sub => {
              if (correctionFilter === 'PENDING') return sub.status === 'PENDING';
              if (correctionFilter === 'GRADED') return sub.status !== 'PENDING';
              return true;
            });

            if (filteredList.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-black text-white">Aucun devoir dans cette sélection</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Tous les travaux des étudiants sous ce filtre ont été traités ou aucun travail n'a encore été déposé.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredList.map((sub) => {
                  const isPending = sub.status === 'PENDING';
                  return (
                    <div
                      key={sub.id}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                    >
                      <div className="space-y-3">
                        {/* En-tête carte étudiant */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-400/40 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden shadow">
                              {sub.studentAvatarUrl ? (
                                <img src={sub.studentAvatarUrl} alt={sub.studentName} className="w-full h-full object-cover" />
                              ) : (
                                sub.studentName.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-white truncate group-hover:text-indigo-300 transition">
                                {sub.studentName}
                              </h4>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Récemment'}
                              </span>
                            </div>
                          </div>

                          {/* Badge de statut */}
                          {isPending ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black shrink-0 animate-pulse">
                              À corriger
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black shrink-0 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-emerald-400" />
                              {sub.grade ?? 18}/20
                            </span>
                          )}
                        </div>

                        {/* Titre du devoir et fichier joint */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                          <div className="text-xs font-bold text-slate-200">
                            {sub.assignmentTitle || 'Projet pratique & Étude de cas'}
                          </div>
                          {sub.fileName && (
                            <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-medium truncate">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.fileName}</span>
                            </div>
                          )}
                        </div>

                        {/* Feedback déjà formulé si noté */}
                        {!isPending && sub.feedback && (
                          <div className="text-xs text-slate-400 italic bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 line-clamp-2">
                            "{sub.feedback}"
                          </div>
                        )}
                      </div>

                      {/* Bouton d'action */}
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSubmission(sub);
                          setIsCorrectionDrawerOpen(true);
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                          isPending
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-98'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-98'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isPending ? 'Corriger & Noter ce devoir' : 'Modifier la note & Feedback'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : activeTab === 'COHORT_REALTIME' ? (
        /* VUE SUPERVISION COHORTE REALTIME SUPABASE */
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-950/50 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Supervision Temps Réel de la Cohorte
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10.5px] font-black border border-blue-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    SUPABASE REALTIME
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suivez en direct la progression, les leçons validées et la dernière activité de chaque apprenant inscrit.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-bold">
              {students.length} étudiant(s) synchronisé(s)
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Aucun étudiant n'a encore rejoint cette cohorte</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Partagez le lien de votre vitrine de cours pour enregistrer vos premières inscriptions avec suivi en direct.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <InstructorCohortRealtimeMonitor
                  key={student.studentId}
                  userId={student.studentId}
                  courseId="telecom-fintech-masterclass"
                  studentName={student.studentName}
                  studentEmail={student.studentEmail}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'VIRAL_FUNNELS' ? (
        /* VUE TUNNELS VIRAUX & SOCIAL BLAST */
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-950/50 shrink-0">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Tunnels de Vente Viraux &amp; Campagnes Promo
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10.5px] font-black border border-amber-500/30">
                    MARKETING CONVERSION
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lancez des ventes flash, configurez des bonus irrésistibles et diffusez en 1-clic sur WhatsApp &amp; réseaux.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsFunnelBuilderOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs transition shadow-lg shadow-amber-900/40 flex items-center gap-2 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Tunnel de Vente</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement du configurateur...</div>}>
              <SocialBlastHub
                campaign={{
                  id: 'camp_demo_masterclass',
                  courseId: 'telecom-fintech-masterclass',
                  courseTitle: 'Masterclass Télécom & Fintech UEMOA',
                  campaignName: 'Vente Flash 48H • Spéciale Rentrée',
                  headline: 'Maîtrisez les flux Mobile Money et la vente hybride POS',
                  subheadline: 'Accès instantané avec 4 bonus exclusifs',
                  originalPrice: 75000,
                  discountPrice: 45000,
                  currency: 'FCFA',
                  deadlineTimestamp: Date.now() + 48 * 3600 * 1000,
                  ctaType: 'HYBRID',
                  ctaLabel: 'Rejoindre la promotion maintenant',
                  bonusItems: [
                    { id: 'b1', title: 'Pack Code Source Sync Offline', valueCFA: 25000 },
                    { id: 'b2', title: 'Support VIP WhatsApp 30 jours', valueCFA: 35000 }
                  ]
                }}
                onNavigateToFunnel={() => setIsFunnelBuilderOpen(true)}
              />
            </React.Suspense>
          </div>
        </div>
      ) : activeTab === 'INTEGRATIONS' ? (
        /* VUE INTÉGRATIONS & CONNECTEURS LMS */
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950/50 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Connecteurs LMS &amp; Webhooks Externes
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10.5px] font-black border border-purple-500/30">
                    AUTOMATION
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronisez vos inscrits avec Google Sheets, Mailchimp, Brevo, Zapier et les Pixels de conversion publicitaires.
                </p>
              </div>
            </div>
          </div>

          <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement des connecteurs...</div>}>
            <ExternalIntegrationsHub />
          </React.Suspense>
        </div>
      ) : (
        /* 5. VUE ONGLET PROFIL & KYC FORMATEUR */
        <div className="max-w-5xl mx-auto space-y-6">
          <KycSection
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onSubmitKyc={handleSubmitKyc}
          />
        </div>
      )}

      {/* =========================================================================
          MODALES ET TIROIRS D'INTERACTION DIRECTE (TOUS LES BOUTONS OPÉRATIONNELS)
         ========================================================================= */}

      {/* 1. Modal Webinaire / Live Direct Daily.co */}
      {isWebinarModalOpen && (
        <CreateWebinarModal
          isOpen={isWebinarModalOpen}
          merchantId={activeUser?.id || 'instructor-default'}
          storeName={profile.fullName}
          onClose={() => setIsWebinarModalOpen(false)}
          isPublicView={false}
        />
      )}

      {/* 2. Modal Funnel Builder Haute-Conversion Drag & Drop */}
      {isFunnelBuilderOpen && (
        <UltimateFunnelBuilder
          isOpen={isFunnelBuilderOpen}
          initialData={null}
          sourceType="course"
          onClose={() => setIsFunnelBuilderOpen(false)}
        />
      )}

      {/* 3. Tiroir de Correction de Devoir des Apprenants */}
      {isCorrectionDrawerOpen && selectedSubmission && (
        <AssignmentEvaluationDrawer
          isOpen={isCorrectionDrawerOpen}
          submission={selectedSubmission}
          instructorName={profile.fullName}
          onClose={() => setIsCorrectionDrawerOpen(false)}
          onGradedSuccess={(updated) => {
            setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s));
            setIsCorrectionDrawerOpen(false);
          }}
        />
      )}

      {/* 3 bis. Modal Espace Correction si aucun devoir en attente */}
      {isCorrectionDrawerOpen && !selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Espace Correction & Devoirs</h3>
                  <span className="text-[11px] text-slate-400">Évaluation des étudiants</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCorrectionDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-white">0 devoir en attente de correction</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dès qu'un étudiant téléverse un travail pratique ou un examen dans votre campus, il apparaîtra ici instantanément. Vous pourrez lui attribuer une note sur 20 et lui enregistrer un feedback vocal interactif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCorrectionDrawerOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
      {/* 9. Modal Demande de Retrait Mobile Money */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Demande de Retrait Mobile Money</h3>
                  <span className="text-[11px] text-slate-400">Paiement direct en FCFA (0% frais)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawalModalOpen(false);
                  setWithdrawalSuccess(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {withdrawalSuccess ? (
              <div className="p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-white">Demande de Retrait Transmise !</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Votre demande a été envoyée au Super Admin pour décaissement direct sur votre numéro {withdrawalPhone}. Les fonds seront crédités sous quelques minutes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsWithdrawalModalOpen(false);
                    setWithdrawalSuccess(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Solde disponible à décaisser :</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {financials.soldeDisponible.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                  </div>
                </div>

                {profile.kycStatus !== 'valide' && !isSuperAdmin && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      {profile.kycStatus === 'pending_validation'
                        ? 'Votre KYC est en cours d\'examen par le Super Admin. Le décaissement sera exécuté dès validation.'
                        : 'Veuillez valider votre KYC dans l\'onglet "Profil & KYC" pour recevoir vos paiements.'}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Réseau de paiement</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['wave', 'orange', 'moov', 'mtn'] as const).map(provider => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setWithdrawalProvider(provider)}
                        className={`py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer border ${
                          withdrawalProvider === provider
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Numéro de téléphone bénéficiaire</label>
                  <input
                    type="tel"
                    value={withdrawalPhone}
                    onChange={(e) => setWithdrawalPhone(e.target.value)}
                    placeholder="+226 70 00 00 00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    setWithdrawalSuccess(true);
                  }}
                  disabled={financials.soldeDisponible <= 0 || !withdrawalPhone.trim()}
                  className={`w-full py-3 rounded-xl text-xs font-black transition cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                    financials.soldeDisponible > 0 && withdrawalPhone.trim()
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Confirmer la demande de retrait</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. Modale Mon Campus Privé (100% Marque Blanche) */}
      <CampusPriveModal
        isOpen={isCampusModalOpen}
        onClose={() => setIsCampusModalOpen(false)}
        onEnterCampus={() => {
          if (onNavigateModule) {
            onNavigateModule('CAMPUS_VIRTUEL');
          }
        }}
        onOpenWhiteLabel={() => {
          setProModalTab('WHITE_LABEL');
          setIsProModalOpen(true);
        }}
        schoolName={profile.fullName}
      />

      {/* 11. Modale NaNa Academy (Formations & Ressources Formateurs) */}
      <NanaAcademyModal
        isOpen={isNanaAcademyModalOpen}
        onClose={() => setIsNanaAcademyModalOpen(false)}
        onExploreCatalog={() => {
          if (onNavigateModule) {
            onNavigateModule('VITRINE_PUBLIQUE_NANA');
          }
        }}
      />

      {/* 12. Modale Agent IA Pédagogique (Tuteur 24/7 & Générateur de Quiz) */}
      <AiPedagogicModal
        isOpen={isAiPedagogicModalOpen}
        onClose={() => setIsAiPedagogicModalOpen(false)}
        instructorName={profile.fullName}
        onOpenForge={() => {
          setActiveTab('COURSE_CREATE');
        }}
      />

      {/* 13. Modale Intégrations Externes */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        instructorId={activeUser?.id || 'instructor-default'}
      />

      {/* 14. Modale Fonctionnalités Pro & Marque Blanche */}
      <ProFeaturesModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        initialTab={proModalTab}
        currentUser={currentUser}
        subscription={subscription}
      />

      {/* 15. Modale Vitrine Publique NaNa */}
      <VitrinePubliqueModal
        isOpen={isVitrineModalOpen}
        onClose={() => setIsVitrineModalOpen(false)}
        onOpenCatalog={() => {
          if (onNavigateModule) {
            onNavigateModule('VITRINE_PUBLIQUE_NANA');
          } else if (typeof window !== 'undefined') {
            window.location.href = '/catalog';
          }
        }}
      />

      {/* 16. Modale / Vue Complète Devis & Projets Séquestre Escrow */}
      {isEscrowQuotesModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen text-slate-300 gap-3 bg-slate-950">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-semibold">Chargement du module Devis / Projets Séquestre...</p>
            </div>
          }>
            <EscrowQuotesView
              onBackToPOS={() => setIsEscrowQuotesModalOpen(false)}
              currentUser={currentUser}
              subscription={subscription}
            />
          </React.Suspense>
        </div>,
        document.body
      )}

      {/* 17. Modale / Vue Complète CV Pro Certifié & Lettre de Motivation IA */}
      {isCvModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen text-slate-300 gap-3 bg-slate-950">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-semibold">Chargement du module CV Pro Certifié...</p>
            </div>
          }>
            <ResumeBuilderView
              onBackToPOS={() => setIsCvModalOpen(false)}
              currentUser={currentUser}
              subscription={subscription}
            />
          </React.Suspense>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InstructorDashboardView;
