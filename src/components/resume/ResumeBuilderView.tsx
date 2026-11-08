import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ResumeData, 
  ResumeExperience, 
  ResumeEducation, 
  StoreUser, 
  StoreSubscription 
} from '../../types';
import { 
  loadResumeData, 
  saveResumeData, 
  enhanceExperienceBullets, 
  generateCoverLetter 
} from '../../services/resumeService';
import { checkIsMerchantPro } from '../../services/marketingAiService';
import { compressImageToBase64, compressCvPhotoToBase64 } from '../../utils/imageCompressor';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { 
  FileBadge, 
  Sparkles, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Camera, 
  ArrowLeft, 
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  Globe, 
  ExternalLink, 
  Eye, 
  Edit3, 
  Printer, 
  MessageSquare, 
  Send,
  X,
  Palette,
  Phone,
  Loader2,
  Crown,
  Star,
  CheckCircle2
} from 'lucide-react';
import { StarterTemplate, ProCorporateTemplate, EliteExecutiveTemplate } from './templates';
import { exportResumeToHdPdf, printResumeDocument } from '../../utils/resumePdfExporter';
import { 
  canAccessCvPro,
  getGeneratedDocumentsCount, 
  incrementGeneratedDocumentsCount, 
  isLimitReached, 
  triggerLimitReachedUpsell 
} from '../../utils/planFeatures';

interface ResumeBuilderViewProps {
  onBackToPOS: () => void;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
}

const ACCENT_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Émeraude', value: '#059669' },
  { name: 'Bleu Océan', value: '#0284c7' },
  { name: 'Ambre Doré', value: '#d97706' },
  { name: 'Rose Rubis', value: '#db2777' },
  { name: 'Ardoise Sombre', value: '#334155' },
];

export const ResumeBuilderView: React.FC<ResumeBuilderViewProps> = ({
  onBackToPOS,
  currentUser,
  subscription,
}) => {
  const userId = currentUser?.id || 'usr-default';
  const isPro = checkIsMerchantPro(subscription);

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isEnhancingExpId, setIsEnhancingExpId] = useState<string | null>(null);
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [targetCompany, setTargetCompany] = useState('');
  const [isCopiedLetter, setIsCopiedLetter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [exportErrorAlert, setExportErrorAlert] = useState<{ isOpen: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumePrintRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [docHeight, setDocHeight] = useState<number>(1123);

  // Mise à l'échelle automatique du rendu CV pour s'adapter au viewport mobile sans débordement
  useEffect(() => {
    const updateDimensions = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth;
        // Largeur standard A4 : 800px. Marge mobile de 24px pour la respiration.
        const targetWidth = Math.max(containerWidth - 24, 260);
        if (targetWidth < 800) {
          setPreviewScale(targetWidth / 800);
        } else {
          setPreviewScale(1);
        }
      }
      if (resumePrintRef.current) {
        setDocHeight(resumePrintRef.current.scrollHeight || 1050);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [activeTab, resume]);

  // Chargement des données du CV
  useEffect(() => {
    async function load() {
      const data = await loadResumeData(userId);
      setResume(data);
    }
    load();
  }, [userId]);

  if (!resume) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Chargement de l'atelier CV Pro...
      </div>
    );
  }

  // Sauvegarde automatique / manuelle
  const handleSave = async (updatedData: ResumeData) => {
    setResume(updatedData);
    setIsSaving(true);
    await saveResumeData(userId, updatedData);
    setTimeout(() => setIsSaving(false), 800);
  };

  // Traitement Photo avec compression Canvas invisible < 50 Ko JPEG (max 400x400)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setIsPhotoCompressing(true);
    try {
      // 1. Compression automatique via petit canvas invisible (max 600x600, JPEG 0.92, 100% net)
      const base64 = await compressCvPhotoToBase64(file, 600, 600, 0.92);
      const updated: ResumeData = {
        ...resume,
        personalInfo: {
          ...resume.personalInfo,
          photoUrl: base64,
        },
      };
      // 2. Utilisation exclusive de la chaîne Base64 légère (élimine 100% des erreurs CORS)
      await handleSave(updated);
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur compression photo :', err);
    } finally {
      setIsPhotoCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Amélioration IA des puces d'expériences via Gemini
  const handleEnhanceBullets = async (expId: string) => {
    const exp = resume.experiences.find(e => e.id === expId);
    if (!exp || exp.achievements.length === 0) return;

    playTapBeep();
    setIsEnhancingExpId(expId);

    const originalBullets = exp.achievements.join('\n');
    try {
      const enhanced = await enhanceExperienceBullets(exp.title, originalBullets);
      const newBullets = enhanced
        .split('\n')
        .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);

      const updatedExp = { ...exp, achievements: newBullets };
      const updated: ResumeData = {
        ...resume,
        experiences: resume.experiences.map(e => e.id === expId ? updatedExp : e),
      };
      await handleSave(updated);
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur amélioration IA :', err);
    } finally {
      setIsEnhancingExpId(null);
    }
  };

  // Génération de la lettre de motivation IA
  const handleOpenCoverLetter = async () => {
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'Lettre de Motivation IA (Inclus Plan Pro ou Pay-As-You-Go)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }
    playTapBeep();
    setIsCoverLetterModalOpen(true);
    setIsGeneratingLetter(true);

    try {
      const letter = await generateCoverLetter(
        resume.personalInfo.fullName,
        resume.personalInfo.title,
        resume.skills,
        targetCompany
      );
      setCoverLetter(letter);
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur lettre IA :', err);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Exportation Haute Définition via html2canvas & jsPDF avec sécurité anti-échec (Fallback Impression A4)
  const handleDownloadPdfHd = async () => {
    if (!resume) return;

    // Vérification stricte du Plan Zéro & Quotas CV Pro
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'CV Pro (Inclus Plan Pro ou 500 F CFA à l\'acte)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }

    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 0, 'CV Pro');
      return;
    }

    playTapBeep();
    setIsExportingPdf(true);
    setExportToast('Génération du PDF en cours...');

    try {
      // 1. Ciblage & cycle de rendu : s'assurer que le composant CV est actif et rendu à l'écran
      if (activeTab !== 'preview') {
        setActiveTab('preview');
      }

      // 2. Délai d'attente pour que React applique les états et que le DOM soit complètement peint
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Attendre la disponibilité et le rendu complet des polices de caractères
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch (fontErr) {
          console.warn('[CV EXPORT HD] Polices non bloquantes :', fontErr);
        }
      }

      // 4. Ciblage précis de la ref du conteneur DOM exact du CV personnalisé
      const targetElement = resumePrintRef.current || document.getElementById('printable-cv-document');
      if (!targetElement) {
        throw new Error("Le conteneur DOM exact du CV est introuvable. Veuillez basculer sur l'onglet 'Aperçu'.");
      }

      const cleanName = resume.personalInfo.fullName.trim().replace(/\s+/g, '_') || 'Professionnel';
      const filename = `CV_${cleanName}_${(resume.templateId || 'STARTER').toUpperCase()}_HD.pdf`;

      // 5. Génération PDF Haute Définition (Scale 2, 300 DPI, sans gel du navigateur)
      const result = await exportResumeToHdPdf(targetElement, {
        filename,
        quality: 2,
        onProgress: (step) => {
          if (step === 'RENDERING') setExportToast('Génération du PDF en cours...');
          if (step === 'SAVING') setExportToast('Finalisation du fichier PDF...');
        }
      });

      if (!result.success) {
        throw new Error(result.error || "Échec lors de la création directe du fichier PDF.");
      }

      incrementGeneratedDocumentsCount(currentUser?.storeId);
      playCashChime();
      setExportToast('✓ CV Haute Définition téléchargé avec succès !');
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: any) {
      console.warn('[CV EXPORT HD] Notification d\'incident export direct :', err);
      const errorMsg = err?.message || 'Une anomalie est survenue pendant la génération du PDF.';
      setExportToast(`⚠️ ${errorMsg}`);
      setExportErrorAlert({
        isOpen: true,
        message: `${errorMsg} Aucun souci : vous pouvez également utiliser le bouton "Imprimer" pour enregistrer directement votre CV au format PDF via votre navigateur.`
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Impression / Enregistrement Système (Ctrl+P / Impression Vectorielle)
  const handlePrintSystem = async () => {
    // Vérification stricte du Plan Zéro & Quotas CV Pro
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'CV Pro (Inclus Plan Pro ou 500 F CFA à l\'acte)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }

    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 0, 'CV Pro');
      return;
    }

    playTapBeep();

    try {
      // S'assurer que le composant est bien affiché dans le DOM (notamment sur mobile)
      if (activeTab !== 'preview') {
        setActiveTab('preview');
      }

      // Temporisation brève pour stabiliser l'affichage
      await new Promise((resolve) => setTimeout(resolve, 250));

      incrementGeneratedDocumentsCount(currentUser?.storeId);
      const printed = printResumeDocument();
      if (!printed) {
        throw new Error("Le navigateur n'a pas pu ouvrir la fenêtre d'impression.");
      }
    } catch (err: any) {
      console.error('[CV PRINT] Erreur déclenchement impression :', err);
      setExportErrorAlert({
        isOpen: true,
        message: "L'impression directe n'a pas pu être déclenchée. Veuillez utiliser le raccourci clavier Ctrl+P ou basculer sur l'aperçu."
      });
    }
  };

  // Ajout / Retrait Expérience
  const handleAddExperience = () => {
    const newExp: ResumeExperience = {
      id: `exp-${Date.now()}`,
      title: 'Nouveau Poste',
      company: 'Entreprise',
      location: 'Ville',
      startDate: '2023',
      endDate: 'Présent',
      isCurrent: true,
      achievements: ['Pilotage des opérations et coordination des activités de l\'équipe.'],
    };
    handleSave({
      ...resume,
      experiences: [newExp, ...resume.experiences],
    });
  };

  const handleRemoveExperience = (id: string) => {
    handleSave({
      ...resume,
      experiences: resume.experiences.filter(e => e.id !== id),
    });
  };

  // Ajout / Retrait Formation
  const handleAddEducation = () => {
    const newEdu: ResumeEducation = {
      id: `edu-${Date.now()}`,
      degree: 'Diplôme ou Certificat',
      school: 'Établissement / Université',
      year: '2022',
    };
    handleSave({
      ...resume,
      education: [...resume.education, newEdu],
    });
  };

  const handleRemoveEducation = (id: string) => {
    handleSave({
      ...resume,
      education: resume.education.filter(e => e.id !== id),
    });
  };

  // Rendu du CV dans les 3 Templates Haute Définition
  const renderResumeDocument = () => {
    return (
      <div 
        ref={resumePrintRef}
        id="printable-cv-document"
        className="w-[794px] h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-2xl relative overflow-hidden print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:shadow-none print:m-0 print:p-0"
        style={{ 
          fontFamily: 'Inter, system-ui, sans-serif',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact'
        } as React.CSSProperties}
      >
        {/* Template 1 : Starter (Clonage Pixel-Perfect de la maquette de référence) */}
        {(resume.templateId === 'starter' || resume.templateId === 'minimal') && (
          <StarterTemplate resume={resume} isPro={isPro} />
        )}

        {/* Template 2 : Pro Corporate (Silicon Valley / Hiérarchie Suisse) */}
        {(resume.templateId === 'pro' || resume.templateId === 'tech') && (
          <ProCorporateTemplate resume={resume} isPro={isPro} />
        )}

        {/* Template 3 : Elite Executive (Luxe $10K / Obsidienne, Ivoire & Or) */}
        {(resume.templateId === 'elite' || resume.templateId === 'executive') && (
          <EliteExecutiveTemplate resume={resume} isPro={isPro} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header */}
      <header className="cv-app-header sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPOS}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            title="Retour à la caisse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileBadge className="w-5 h-5 text-indigo-400" />
              <h1 className="text-base font-extrabold text-white">
                Générateur de CV Pro & Candidature
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              Assistance IA Gemini • Rendu A4 Haute Résolution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Export PDF HD (300 DPI) avec indicateur visuel */}
          <button
            type="button"
            onClick={handleDownloadPdfHd}
            disabled={isExportingPdf}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition cursor-pointer"
            title="Télécharger mon CV en Haute Définition (300 DPI - Prêt pour l'impression)"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                <span>Génération du PDF en cours...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Télécharger PDF HD</span>
                <span className="sm:hidden">Télécharger PDF</span>
              </>
            )}
          </button>

          {/* Bouton Impression Système / Ctrl+P */}
          <button
            type="button"
            onClick={handlePrintSystem}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm transition cursor-pointer"
            title="Imprimer directement ou enregistrer en PDF natif A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Imprimer</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCoverLetter}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            title="Générer lettre de motivation & Postuler sur LinkedIn"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Postuler (IA)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Mobile-only tab toggle at the top of the CV workspace (visible on sm/mobile, hidden on md/desktop with md:hidden) */}
        <div className="cv-mobile-tabs md:hidden flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('form');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Formulaire</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('preview');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aperçu du CV</span>
          </button>
        </div>

        {/* Workspace Columns: responsive flex layout */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Left Form / Customizer Column (conditionally toggled on mobile, visible on desktop) */}
          <div className={`cv-form-column flex-1 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1 pb-32 ${
            activeTab === 'form' ? 'block' : 'hidden md:block'
          }`}>
            
            {/* Template & Color Selector Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                Choix du Modèle & Couleur d'Accent
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { 
                    id: 'starter', 
                    label: 'Starter (Cloné)', 
                    sublabel: 'Pixel-Perfect (Bleu Nuit)', 
                    badge: 'Inclus', 
                    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  },
                  { 
                    id: 'pro', 
                    label: 'Pro Corporate', 
                    sublabel: 'Silicon Valley (2 Cols)', 
                    badge: 'Recommandé', 
                    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                  },
                  { 
                    id: 'elite', 
                    label: 'Elite Exécutif', 
                    sublabel: 'Prestige Luxe $10K (Or/Noir)', 
                    badge: 'Prestige VIP', 
                    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  },
                ].map((t) => {
                  const isSelected = resume.templateId === t.id || 
                    (t.id === 'starter' && resume.templateId === 'minimal') ||
                    (t.id === 'pro' && resume.templateId === 'tech') ||
                    (t.id === 'elite' && resume.templateId === 'executive');

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        handleSave({ ...resume, templateId: t.id as any });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-400 text-white ring-2 ring-indigo-500 shadow-md'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-xs">{t.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${t.badgeColor}`}>
                          {t.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{t.sublabel}</span>
                    </button>
                  );
                })}
              </div>

                            {/* Color Swatches */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold">Couleur :</span>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleSave({ ...resume, accentColor: c.value })}
                      className={`w-6 h-6 rounded-full transition transform active:scale-90 ${
                        resume.accentColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Coordonnées & Photo */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Coordonnées Personnelles & Photo
                </span>
                {isPhotoCompressing && (
                  <span className="text-[10px] text-amber-400 animate-pulse">Compression Canvas en cours...</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-400 hover:text-white transition cursor-pointer overflow-hidden shrink-0 relative group"
                >
                  {resume.personalInfo.photoUrl ? (
                    <img src={resume.personalInfo.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">Photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[9px] font-bold text-white">
                    Modifier
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={resume.personalInfo.fullName}
                    onChange={(e) => handleSave({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, fullName: e.target.value },
                    })}
                    placeholder="Nom & Prénom"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={resume.personalInfo.title}
                    onChange={(e) => handleSave({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, title: e.target.value },
                    })}
                    placeholder="Titre du poste recherché"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="email"
                  value={resume.personalInfo.email}
                  onChange={(e) => handleSave({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, email: e.target.value },
                  })}
                  placeholder="Email"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="tel"
                  value={resume.personalInfo.phone}
                  onChange={(e) => handleSave({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, phone: e.target.value },
                  })}
                  placeholder="Téléphone"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={resume.personalInfo.location}
                  onChange={(e) => handleSave({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, location: e.target.value },
                  })}
                  placeholder="Ville, Pays"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bio / Accroche Professionnelle</label>
                <textarea
                  rows={2}
                  value={resume.personalInfo.bio}
                  onChange={(e) => handleSave({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, bio: e.target.value },
                  })}
                  placeholder="Présentation percutante en 2 à 3 phrases..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Expériences avec Bouton IA */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Expériences Professionnelles
                </span>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un poste</span>
                </button>
              </div>

              <div className="space-y-3">
                {resume.experiences.map((exp) => {
                  const isEnhancing = isEnhancingExpId === exp.id;
                  return (
                    <div key={exp.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={exp.title}
                            onChange={(e) => {
                              const updated = resume.experiences.map(x => x.id === exp.id ? { ...x, title: e.target.value } : x);
                              handleSave({ ...resume, experiences: updated });
                            }}
                            placeholder="Poste (ex: Responsable Commercial)"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                          />
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => {
                              const updated = resume.experiences.map(x => x.id === exp.id ? { ...x, company: e.target.value } : x);
                              handleSave({ ...resume, experiences: updated });
                            }}
                            placeholder="Entreprise"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => {
                            const updated = resume.experiences.map(x => x.id === exp.id ? { ...x, startDate: e.target.value } : x);
                            handleSave({ ...resume, experiences: updated });
                          }}
                          placeholder="Début (ex: 2021)"
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                        />
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) => {
                            const updated = resume.experiences.map(x => x.id === exp.id ? { ...x, endDate: e.target.value } : x);
                            handleSave({ ...resume, experiences: updated });
                          }}
                          placeholder="Fin (ex: Présent)"
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                        />
                      </div>

                      {/* Réalisations */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Réalisations clés (1 par ligne)</label>
                          <button
                            type="button"
                            onClick={() => handleEnhanceBullets(exp.id)}
                            disabled={isEnhancing}
                            className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{isEnhancing ? 'Amélioration IA...' : 'Améliorer avec IA'}</span>
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={exp.achievements.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            const updated = resume.experiences.map(x => x.id === exp.id ? { ...x, achievements: lines } : x);
                            handleSave({ ...resume, experiences: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compétences & Formations */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                Compétences Clés (Séparées par des virgules)
              </span>
              <input
                type="text"
                value={resume.skills.join(', ')}
                onChange={(e) => {
                  const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  handleSave({ ...resume, skills });
                }}
                placeholder="Ex: Gestion de stock, Caisse tactile, Management d'équipe"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Right Preview Column (Always visible on desktop, conditionally rendered on mobile) */}
          <div 
            ref={previewContainerRef}
            className={`cv-preview-container flex-1 flex justify-center items-start overflow-x-hidden overflow-y-auto max-h-[calc(100vh-140px)] pb-32 ${
              activeTab === 'preview' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div 
              style={{
                width: `${800 * previewScale}px`,
                height: `${docHeight * previewScale}px`,
                position: 'relative',
              }}
              className="cv-preview-scaler shrink-0 transition-transform duration-150 origin-top mx-auto"
            >
              <div 
                style={{
                  width: '794px',
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
                className="cv-preview-wrapper"
              >
                {renderResumeDocument()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Export HD */}
      {exportToast && (
        <div className="cv-toast fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/95 border border-indigo-500/50 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
          {isExportingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{exportToast}</span>
        </div>
      )}

      {/* Style d'impression stricte A4 210mm x 297mm avec isolation et conservation des couleurs */}
      <style>{`
        @media print {
          /* 1. Masquer absolument tout par défaut dans le corps de la page */
          body * {
            visibility: hidden !important;
          }

          /* 2. Rendre visible EXCLUSIVEMENT le conteneur du CV et tous ses éléments */
          #printable-cv-document,
          #printable-cv-document * {
            visibility: visible !important;
          }

          /* 3. Masquer complètement l'interface de l'application */
          header,
          nav,
          aside,
          button,
          input,
          textarea,
          select,
          [role="navigation"],
          .no-print,
          .cv-app-header,
          .cv-mobile-tabs,
          .cv-form-column,
          .cv-toast,
          .cv-modal,
          #tab-nav-pos,
          #banner-ai-smart-alert {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 4. Réinitialiser la page et le conteneur principal */
          html,
          body,
          #root,
          .min-h-screen {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 5. Démasquer et libérer les conteneurs parents du CV pour annuler tout scale mobile */
          .cv-preview-container,
          .cv-preview-scaler,
          .cv-preview-wrapper {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            transform: none !important;
            width: 210mm !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* 6. Isoler et fixer le conteneur DOM exact du CV personnalisé */
          #printable-cv-document {
            display: block !important;
            visibility: visible !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            transform: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 0mm;
          }
        }
      `}</style>

      {/* MODAL D'ALERTE / NOTIFICATION EN CAS D'ÉCHEC DE L'EXPORT PDF */}
      {exportErrorAlert && exportErrorAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cv-modal">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-slate-100 relative animate-fade-in">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Échec de l'export automatique</h3>
                <p className="text-xs text-rose-300">Solution de secours disponible</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {exportErrorAlert.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setExportErrorAlert(null);
                  handlePrintSystem();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Sauvegarder en PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setExportErrorAlert(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : LETTRE DE MOTIVATION IA & POSTULER SUR LINKEDIN */}
      {isCoverLetterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto cv-modal">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsCoverLetterModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Postuler & Message d'Accompagnement IA</h3>
                <p className="text-xs text-slate-400">Généré sur mesure pour {resume.personalInfo.title}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Entreprise ciblée (Optionnel)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="Ex: Société Générale, Carrefour, SODECI..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleOpenCoverLetter}
                    disabled={isGeneratingLetter}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    Régénérer
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Message de candidature prêt à envoyer</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetter);
                      setIsCopiedLetter(true);
                      setTimeout(() => setIsCopiedLetter(false), 2000);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {isCopiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedLetter ? 'Copié !' : 'Copier le texte'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 leading-relaxed font-sans"
                />
              </div>

              {/* Boutons d'action directes */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href="https://www.linkedin.com/jobs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ouvrir LinkedIn Emploi</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(`Candidature au poste de ${resume.personalInfo.title}`)}&body=${encodeURIComponent(coverLetter)}`}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer par Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilderView;
