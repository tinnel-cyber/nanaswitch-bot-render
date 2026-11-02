import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Users, Award, Clock, AlertTriangle, CheckCircle2, Search, 
  Filter, FileSpreadsheet, FileText, ArrowLeft, ExternalLink, 
  ChevronRight, Sparkles, ShieldCheck, Mail, PhoneCall, 
  Laptop, Check, User, RefreshCw, Eye, MessageSquare, ArrowUpRight,
  Rocket, Flame, Share2, DollarSign, Zap, GraduationCap
} from 'lucide-react';
import { 
  AssignmentSubmission, StudentRosterItem, InstructorKpiMetrics, 
  AssignmentSubmissionStatus, StoreUser, StoreSubscription 
} from '../../types';
import { 
  subscribeToStudentRoster, 
  subscribeToSubmissions 
} from '../../services/instructorDataService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { PromoCampaign } from '../../types/campaign';
import { MarketplaceCourse } from './marketplace/types';
import { subscribeToCampaigns } from '../../services/campaignService';
import { SEED_MARKETPLACE_COURSES, subscribeToPublishedCourses } from '../../services/marketplaceService';
import { UltimateFunnelBuilder } from '../storeBuilder/UltimateFunnelBuilder';
import { isLimitReached, triggerLimitReachedUpsell, getStoredFunnelsCount } from '../../utils/planFeatures';
import { registerSubdomainInFirebase } from '../../services/omniFunnelService';

const CourseForgeCanvas = React.lazy(() => 
  import('./forge/CourseForgeCanvas').then(m => ({ default: m.CourseForgeCanvas }))
);
const AssignmentEvaluationDrawer = React.lazy(() => 
  import('./AssignmentEvaluationDrawer').then(m => ({ default: m.AssignmentEvaluationDrawer }))
);
const CampaignConfiguratorModal = React.lazy(() => 
  import('./promo/CampaignConfiguratorModal').then(m => ({ default: m.CampaignConfiguratorModal }))
);
const SocialBlastHub = React.lazy(() => 
  import('./promo/SocialBlastHub').then(m => ({ default: m.SocialBlastHub }))
);
const ExternalIntegrationsHub = React.lazy(() => 
  import('./integrations/ExternalIntegrationsHub').then(m => ({ default: m.ExternalIntegrationsHub }))
);
import { CertificatePreviewModal } from './CertificatePreviewModal';

export interface InstructorHubViewProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onBackToHub?: () => void;
  onViewAsStudent?: (courseId: string) => void;
  onNavigateToPromo?: (campaignId: string) => void;
  className?: string;
}

export const InstructorHubView: React.FC<InstructorHubViewProps> = ({
  currentUser,
  subscription,
  onBackToHub,
  onViewAsStudent,
  onNavigateToPromo,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'GRADING_INBOX' | 'STUDENT_ROSTER' | 'STUDIO_FORGE' | 'VIRAL_FUNNELS' | 'INTEGRATIONS'>('STUDIO_FORGE');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);

  // État des cours et campagnes promotionnelles
  const [courses, setCourses] = useState<MarketplaceCourse[]>(SEED_MARKETPLACE_COURSES);
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [selectedCourseForPromo, setSelectedCourseForPromo] = useState<MarketplaceCourse | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [activeCampaignForBlast, setActiveCampaignForBlast] = useState<PromoCampaign | null>(null);
  const [selectedFunnelCourse, setSelectedFunnelCourse] = useState<MarketplaceCourse | null>(null);
  const [isFunnelBuilderOpen, setIsFunnelBuilderOpen] = useState(false);

  useEffect(() => {
    const unsubCourses = subscribeToPublishedCourses((list) => setCourses(list));
    const unsubCampaigns = subscribeToCampaigns((camps) => setCampaigns(camps));
    const unsubRoster = subscribeToStudentRoster((list) => setStudents(list));
    const unsubSubs = subscribeToSubmissions((list) => setSubmissions(list));
    return () => {
      unsubCourses();
      unsubCampaigns();
      unsubRoster();
      unsubSubs();
    };
  }, []);

  // Filtre d'Inbox de correction : 'ALL' | 'PENDING' | 'GRADED' | 'NEEDS_REVISION'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'NEEDS_REVISION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Soumission sélectionnée pour le drawer / split-screen
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCertificatePreviewOpen, setIsCertificatePreviewOpen] = useState(false);

  // Calcul dynamique des KPIs réels
  const pendingCount = useMemo(() => {
    return submissions.filter(s => s.status === 'PENDING').length;
  }, [submissions]);

  const gradedCount = useMemo(() => {
    return submissions.filter(s => s.status === 'GRADED').length;
  }, [submissions]);

  const totalActiveStudents = useMemo(() => {
    return students.length;
  }, [students]);

  const averageCourseScore = useMemo(() => {
    const graded = submissions.filter(s => s.status === 'GRADED' && typeof s.grade === 'number');
    if (graded.length === 0) return 0;
    const sum = graded.reduce((acc, curr) => acc + (curr.grade || 0), 0);
    return Math.round((sum / (graded.length * 20)) * 100);
  }, [submissions]);

  const completionRatePercentage = useMemo(() => {
    if (students.length === 0) return 0;
    const completed = students.filter(s => s.progressPercentage === 100 || s.certificateIssued).length;
    return Math.round((completed / students.length) * 100);
  }, [students]);

  // Filtrage des soumissions Inbox
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // Filtre de statut
      if (statusFilter === 'PENDING' && sub.status !== 'PENDING') return false;
      if (statusFilter === 'GRADED' && sub.status !== 'GRADED') return false;
      if (statusFilter === 'NEEDS_REVISION' && sub.status !== 'NEEDS_REVISION') return false;

      // Recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sub.studentName.toLowerCase().includes(q);
        const matchTitle = (sub.assignmentTitle || '').toLowerCase().includes(q);
        const matchLesson = (sub.lessonTitle || '').toLowerCase().includes(q);
        return matchName || matchTitle || matchLesson;
      }
      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Filtrage du Roster des étudiants
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(std => 
      std.studentName.toLowerCase().includes(q) || 
      std.studentEmail.toLowerCase().includes(q) ||
      (std.currentLessonTitle || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Clic sur une soumission dans l'Inbox (ZERO PAGE RELOAD)
  const handleSelectSubmission = (sub: AssignmentSubmission) => {
    playTapBeep();
    setSelectedSubmission(sub);
    setIsDrawerOpen(true);
  };

  // Callback après notation réussie
  const handleGradedSuccess = (updatedSub: AssignmentSubmission) => {
    setSubmissions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    setSelectedSubmission(updatedSub);

    // Mettre à jour le statut dans le roster de l'étudiant
    setStudents(prev => prev.map(std => {
      if (std.studentId === updatedSub.studentId) {
        return {
          ...std,
          pendingAssignmentsCount: Math.max(0, std.pendingAssignmentsCount - 1),
          completedLessonsCount: Math.min(std.totalLessonsCount, std.completedLessonsCount + 1),
          progressPercentage: Math.min(100, Math.round(((std.completedLessonsCount + 1) / std.totalLessonsCount) * 100))
        };
      }
      return std;
    }));
  };

  return (
    <div className={`h-full w-full bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-hidden ${className}`}>
      {/* 1. Header SaaS de l'Instructeur */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToHub(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
              title="Retour au Master Hub Central"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Hub Central</span>
            </button>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10.5px] font-black border border-amber-500/30">
                ESPACE ENSEIGNANT
              </span>
              <h1 className="text-sm sm:text-base font-black text-white">
                Centre de Correction & Roster Pédagogique
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              ENTREPRISE KONKOBO POUSBILA • Formateur : Ibrahim Pousbila Konkobo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bouton Tester / Prévisualiser le Certificat Officiel */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsCertificatePreviewOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm min-h-[38px]"
            title="Tester / Prévisualiser le Certificat Officiel avec QR Code & Téléchargement"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tester le Certificat</span>
            <span className="sm:hidden">Certificat</span>
          </button>

          {onViewAsStudent && (
            <button
              type="button"
              onClick={() => onViewAsStudent('telecom-fintech-masterclass')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 min-h-[38px]"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Vue Étudiant</span>
            </button>
          )}

          <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Ibrahim Pousbila Konkobo"
              className="w-7 h-7 rounded-lg object-cover border border-amber-500/40"
            />
            <span className="text-xs font-bold text-white pr-1 hidden lg:inline">
              Ibrahim P. Konkobo
            </span>
          </div>
        </div>
      </header>

      {/* 2. Tableau de Bord Supérieur : Cartes Métriques KPI */}
      <section className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1 : Total Étudiants */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Étudiants Inscrits
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalActiveStudents}
            </div>
            <div className="text-[10.5px] text-emerald-400 font-bold flex items-center gap-1">
              <span>{totalActiveStudents > 0 ? `${totalActiveStudents} inscrits réels` : 'Prêt à accueillir des élèves'}</span>
              <span>• UEMOA</span>
            </div>
          </div>

          {/* KPI 2 : Devoirs en Attente (Alerte Highlight) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-950/40 to-slate-900 border-2 border-rose-500/40 shadow-xl space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                Devoirs en Attente
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center animate-pulse">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 flex items-center gap-2">
              <span>{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold animate-ping" />
              )}
            </div>
            <p className="text-[10.5px] text-slate-300 font-semibold">
              Action requise pour débloquer les modules
            </p>
          </div>

          {/* KPI 3 : Score Moyen */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Moyenne du Cursus
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {averageCourseScore}%
            </div>
            <div className="text-[10.5px] text-slate-400 font-bold">
              Évaluations QCM & Devoirs
            </div>
          </div>

          {/* KPI 4 : Taux de Complétion */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Taux de Réussite
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {completionRatePercentage}%
            </div>
            <div className="text-[10.5px] text-amber-300 font-bold">
              {gradedCount} devoirs notés au total
            </div>
          </div>
        </div>

        {/* 3. Navigation Principale par Onglets : Centre de Correction vs Roster vs Studio Forge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('STUDIO_FORGE'); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'STUDIO_FORGE'
                  ? 'bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-indigo-500/20 text-purple-200 border border-purple-500/50 shadow-lg shadow-purple-950/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>NaNa Course Forge</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('GRADING_INBOX'); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'GRADING_INBOX'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-rose-400" />
              <span>Centre de Correction (Inbox)</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-rose-500 text-white font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('STUDENT_ROSTER'); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'STUDIO_FORGE'
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : activeTab === 'STUDENT_ROSTER'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Roster des Étudiants</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-slate-800 text-slate-300">
                {students.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('VIRAL_FUNNELS'); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'VIRAL_FUNNELS'
                  ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Rocket className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Funnels & Campagnes Virales</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] bg-emerald-500 text-slate-950 font-black">
                {campaigns.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('INTEGRATIONS'); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'INTEGRATIONS'
                  ? 'bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Hub d'Intégrations Externes</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] bg-cyan-500 text-slate-950 font-black">
                Zoom • Jitsi • Meet
              </span>
            </button>
          </div>

          {/* Barre de Recherche Rapide (active pour l'inbox et le roster) */}
          {activeTab !== 'STUDIO_FORGE' && activeTab !== 'INTEGRATIONS' && (
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher apprenant, devoir..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none min-h-[38px]"
              />
            </div>
          )}
        </div>

        {/* 4. VUE 1 : LE CENTRE DE CORRECTION (INBOX-STYLE UI) */}
        {activeTab === 'GRADING_INBOX' && (
          <div className="space-y-4">
            {/* Filtres de la Boîte de Réception */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { playTapBeep(); setStatusFilter('ALL'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tous ({submissions.length})
              </button>

              <button
                type="button"
                onClick={() => { playTapBeep(); setStatusFilter('PENDING'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'PENDING'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>En Attente de Correction ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => { playTapBeep(); setStatusFilter('GRADED'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'GRADED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Notés & Validés ({gradedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => { playTapBeep(); setStatusFilter('NEEDS_REVISION'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'NEEDS_REVISION'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Révision Demandée ({submissions.filter(s => s.status === 'NEEDS_REVISION').length})</span>
              </button>
            </div>

            {/* Liste Inbox des Soumissions */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl divide-y divide-slate-800/60">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedSubmission?.id === sub.id;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition select-none ${
                        isSelected 
                          ? 'bg-indigo-500/15 border-l-4 border-indigo-500' 
                          : sub.status === 'PENDING'
                            ? 'bg-slate-950/70 hover:bg-slate-800/40'
                            : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={sub.studentAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                            alt={sub.studentName}
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-800"
                          />
                          {sub.status === 'PENDING' && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-slate-900" title="À corriger" />
                          )}
                        </div>

                        {/* Informations Apprenant & Devoir */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                              {sub.studentName}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                              • {sub.studentEmail}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-indigo-300 truncate">
                            {sub.assignmentTitle}
                          </p>

                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                            <span>{sub.fileName}</span>
                            <span>•</span>
                            <span>{Math.round(sub.fileSize / 1024)} Ko</span>
                            <span>•</span>
                            <span>{new Date(sub.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Statut & Note */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {sub.status === 'GRADED' && (
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-400">
                              {sub.grade} / {sub.maxScore || 20}
                            </span>
                            <span className="block text-[10px] text-slate-500">Note validée ✓</span>
                          </div>
                        )}

                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          sub.status === 'PENDING'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : sub.status === 'GRADED'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}>
                          {sub.status === 'PENDING' ? 'En Attente' : sub.status === 'GRADED' ? 'Noté' : 'À Réviser'}
                        </span>

                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Aucun devoir dans cette sélection</h4>
                  <p className="text-xs text-slate-400">Tous les devoirs soumis ont été traités avec succès.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. VUE 2 : LE STUDENT ROSTER (TABLEAU DES ÉTUDIANTS & PROGRESSION) */}
        {activeTab === 'STUDENT_ROSTER' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-white">
                Liste des Apprenants Inscrits à la Masterclass ({filteredStudents.length})
              </h3>
              <span className="text-xs text-slate-400">Suivi individuel de progression</span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Aucun apprenant inscrit pour le moment</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Dès qu'un étudiant rejoint votre cours ou s'inscrit sur votre campus, sa progression et ses statistiques apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4">Apprenant</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Progression (0-100%)</th>
                      <th className="p-4">Chapitre Actuel</th>
                      <th className="p-4">Moyenne Quiz</th>
                      <th className="p-4">Certificat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStudents.map((std) => (
                      <tr key={std.studentId} className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={std.studentAvatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                                alt={std.studentName}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                              />
                              <span 
                                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                  std.status === 'ONLINE' ? 'bg-emerald-500' : std.status === 'IDLE' ? 'bg-amber-500' : 'bg-slate-600'
                                }`} 
                                title={std.status}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{std.studentName}</p>
                              <p className="text-[10.5px] text-slate-400">{std.studentEmail}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            std.status === 'ONLINE' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : std.status === 'IDLE' 
                                ? 'bg-amber-500/20 text-amber-300' 
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {std.status === 'ONLINE' ? 'En ligne' : std.status === 'IDLE' ? 'Inactif' : 'Hors-ligne'}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1 w-36">
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-black text-white">{std.progressPercentage}%</span>
                              <span className="text-slate-400">{std.completedLessonsCount} / {std.totalLessonsCount}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  std.progressPercentage === 100
                                    ? 'bg-emerald-500'
                                    : std.progressPercentage > 50
                                      ? 'bg-indigo-500'
                                      : 'bg-amber-500'
                                }`}
                                style={{ width: `${std.progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="text-xs text-slate-300 truncate max-w-[180px] block">
                            {std.currentLessonTitle || 'En cours...'}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-black text-indigo-300 text-xs">
                            {std.averageQuizScore}%
                          </span>
                        </td>

                        <td className="p-4">
                          {std.certificateIssued ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              <Award className="w-3.5 h-3.5" />
                              Délivré ✓
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              En apprentissage
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. VUE 3 : NANA AI COURSE FORGE (CANVAS VISUEL & IRT) */}
        {activeTab === 'STUDIO_FORGE' && (
          <div className="space-y-4">
            <React.Suspense fallback={
              <div className="w-full h-[600px] rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-3">
                <div className="w-9 h-9 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400">Chargement de l'atelier visuel Course Forge...</span>
              </div>
            }>
              <CourseForgeCanvas currentUser={currentUser} subscription={subscription} />
            </React.Suspense>
          </div>
        )}

        {/* 6. VUE 4 : MOTEUR VIRAL & FUNNELS DE VENTE */}
        {activeTab === 'VIRAL_FUNNELS' && (
          <div className="space-y-6">
            {/* Bannière d'introduction */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-black border border-emerald-500/30 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    VIRAL PROMO ENGINE & NEURO-MARKETING
                  </span>
                  <span className="text-xs text-slate-400">Conversion Haute Fréquence</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Funnels de Vente Dédiés & Diffusion 1-Clic
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Sélectionnez n'importe quel cours publié pour générer un tunnel de vente autonome sans menu ni distractions, avec compte à rebours FOMO, vidéo hero et diffusion instantanée sur WhatsApp et les réseaux.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    const funnelsCount = getStoredFunnelsCount(currentUser?.storeId);
                    if (isLimitReached(subscription, 'FUNNELS', funnelsCount)) {
                      triggerLimitReachedUpsell('FUNNELS', funnelsCount, 1, 'tunnel de vente');
                      return;
                    }
                    setSelectedFunnelCourse(courses[0] || null);
                    setIsFunnelBuilderOpen(true);
                  }}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-xl shadow-amber-950/50 cursor-pointer whitespace-nowrap min-h-[44px] active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Créer un Funnel ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (courses.length > 0) {
                      setSelectedCourseForPromo(courses[0]);
                      setIsPromoModalOpen(true);
                    }
                  }}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Campagne Rapide</span>
                </button>
              </div>
            </div>

            {/* Section 1 : Catalogue des Cours Publiés Prêts à Promouvoir */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Cours Disponibles pour Lancement de Funnel ({courses.length})
                </h4>
                <span className="text-[11px] text-slate-500">Cliquez sur Promouvoir pour créer la page de vente</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                        <img
                          src={course.coverImage}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-slate-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                          {course.category}
                        </span>
                        <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-950/90 text-white border border-slate-700">
                          {course.price.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div>
                        <h5 className="text-xs font-black text-white line-clamp-2 leading-snug">
                          {course.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {course.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {course.durationLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            const funnelsCount = getStoredFunnelsCount(currentUser?.storeId);
                            if (isLimitReached(subscription, 'FUNNELS', funnelsCount)) {
                              triggerLimitReachedUpsell('FUNNELS', funnelsCount, 1, 'tunnel de vente');
                              return;
                            }
                            setSelectedFunnelCourse(course);
                            setIsFunnelBuilderOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer min-h-[38px] active:scale-95"
                          title="Créer un Funnel ⚡ pour ce cours"
                        >
                          <Zap className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Créer un Funnel ⚡</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseForPromo(course);
                            setIsPromoModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[38px]"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Campagne</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 : Campagnes Actives & Métriques de Performance */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                Funnels Actifs & Métriques de Conversion ({campaigns.length})
              </h4>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                        <th className="p-4">Campagne & Accroche</th>
                        <th className="p-4">Tarif Promo</th>
                        <th className="p-4">Vues Trackées</th>
                        <th className="p-4">Conversions</th>
                        <th className="p-4">Chiffre d'Affaires</th>
                        <th className="p-4 text-right">Actions Diffusion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4">
                            <div className="space-y-0.5 max-w-sm">
                              <p className="font-black text-white text-xs">{camp.campaignName}</p>
                              <p className="text-[10.5px] text-slate-400 truncate">{camp.headline}</p>
                              <span className="text-[9.5px] text-emerald-400 font-mono">/promo/{camp.id}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-black text-emerald-400 text-xs">
                                {camp.discountPrice.toLocaleString('fr-FR')} FCFA
                              </span>
                              <span className="line-through text-slate-500 text-[10.5px] block">
                                {camp.originalPrice.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-black text-slate-200">
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{camp.stats?.viewsCount || 0}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {camp.stats?.conversionsCount || 0} inscrits
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="font-black text-amber-300 text-xs">
                              {(camp.stats?.totalRevenueCFA || 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveCampaignForBlast(camp)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer min-h-[36px]"
                                title="Ouvrir le Hub de Diffusion Social & WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Diffuser</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToPromo) {
                                    onNavigateToPromo(camp.id);
                                  } else if (typeof window !== 'undefined') {
                                    window.open(`/promo/${camp.id}`, '_blank');
                                  }
                                }}
                                className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Tester le Funnel en direct"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. VUE 5 : HUB D'INTÉGRATIONS EXTERNES */}
        {activeTab === 'INTEGRATIONS' && (
          <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement du Hub d'Intégrations...</div>}>
            <ExternalIntegrationsHub instructorId="telecom-master-instructor" />
          </React.Suspense>
        )}
      </section>

      {/* 7. Le Slide-over Drawer / Panneau d'Évaluation (Code-Split) */}
      <React.Suspense fallback={null}>
        <AssignmentEvaluationDrawer
          submission={selectedSubmission}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onGradedSuccess={handleGradedSuccess}
        />
      </React.Suspense>

      {/* 8. Modal de Configuration de Campagne Promo (Code-Split) */}
      {selectedCourseForPromo && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm" />}>
          <CampaignConfiguratorModal
            course={selectedCourseForPromo}
            isOpen={isPromoModalOpen}
            onClose={() => {
              setIsPromoModalOpen(false);
              setSelectedCourseForPromo(null);
            }}
            onNavigateToFunnel={(campId) => {
              setIsPromoModalOpen(false);
              setSelectedCourseForPromo(null);
              if (onNavigateToPromo) {
                onNavigateToPromo(campId);
              }
            }}
          />
        </React.Suspense>
      )}

      {/* 9. Modal autonome du Social Blast Hub (Code-Split) */}
      {activeCampaignForBlast && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
          <div className="relative w-full max-w-2xl bg-[#070b14] border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setActiveCampaignForBlast(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement du Hub...</div>}>
              <SocialBlastHub
                campaign={activeCampaignForBlast}
                onNavigateToFunnel={(id) => {
                  setActiveCampaignForBlast(null);
                  if (onNavigateToPromo) onNavigateToPromo(id);
                }}
              />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* Constructeur de Pages Drag-and-Drop UltimateFunnelBuilder */}
      {isFunnelBuilderOpen && (
        <UltimateFunnelBuilder
          isOpen={isFunnelBuilderOpen}
          initialData={selectedFunnelCourse ? {
            id: selectedFunnelCourse.id,
            title: selectedFunnelCourse.title,
            subtitle: selectedFunnelCourse.tagline,
            image: selectedFunnelCourse.coverImage,
            price: selectedFunnelCourse.price,
            originalPrice: Math.round(selectedFunnelCourse.price * 1.8),
            instructor: (selectedFunnelCourse as any).instructorName || (selectedFunnelCourse as any).instructor || 'Prof. Enseignant NaNa',
            instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            category: selectedFunnelCourse.category,
            duration: selectedFunnelCourse.durationLabel,
            type: 'course'
          } : null}
          sourceType="course"
          onClose={() => {
            setIsFunnelBuilderOpen(false);
            setSelectedFunnelCourse(null);
          }}
          onSave={async (payload: any) => {
            if (payload?.subdomain) {
              await registerSubdomainInFirebase(payload.subdomain, payload.title, payload);
            }
          }}
        />
      )}

      {/* Modale de Test & Prévisualisation du Certificat Officiel */}
      <CertificatePreviewModal
        isOpen={isCertificatePreviewOpen}
        onClose={() => setIsCertificatePreviewOpen(false)}
      />
    </div>
  );
};

export default InstructorHubView;
