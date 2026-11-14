import React, { useState, useEffect, useCallback } from 'react';
import { 
  EscrowProject, 
  EscrowStatus, 
  ProjectMilestone, 
  StoreUser, 
  StoreSubscription,
  EscrowWithdrawalDetails
} from '../../../types';
import { 
  subscribeToStoreProjects, 
  saveEscrowProject, 
  updateEscrowStatus, 
  requestEscrowWithdrawal,
  getPublicProjectUrl,
  getQuoteWhatsAppUrl 
} from '../../../services/escrowService';
import { EscrowTripartiteChat } from './EscrowTripartiteChat';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';
import { 
  ShieldCheck, 
  FolderKanban, 
  Plus, 
  Copy, 
  Check, 
  MessageSquare, 
  Printer, 
  FileText, 
  ArrowLeft, 
  Clock, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  DollarSign, 
  Send, 
  ExternalLink,
  Trash2,
  Calendar,
  User,
  Building,
  Phone,
  Briefcase,
  X,
  CreditCard
} from 'lucide-react';

interface EscrowQuotesViewProps {
  onBackToPOS: () => void;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
}

export const EscrowQuotesView: React.FC<EscrowQuotesViewProps> = ({
  onBackToPOS,
  currentUser,
  subscription,
}) => {
  const storeId = currentUser?.storeId || 'store-nana-1';
  const storeName = currentUser?.storeName || 'Boutique Nanasore';

  const [projects, setProjects] = useState<EscrowProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<EscrowProject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [projectToWithdraw, setProjectToWithdraw] = useState<EscrowProject | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatProject, setChatProject] = useState<EscrowProject | null>(null);

  // Formulaire Nouveau Devis
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    'Acompte sécurisé sous séquestre tiers de confiance Nana Guarantee. Les fonds sont garantis et débloqués à la livraison et validation finale du client.'
  );
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; deadline: string; amount: number }>>([
    { title: 'Cadrage & Conception initiale', description: 'Validation des spécifications et maquettes', deadline: 'Dans 7 jours', amount: 50000 },
    { title: 'Développement & Réalisation', description: 'Intégration et phase de production', deadline: 'Dans 15 jours', amount: 100000 },
    { title: 'Recette & Livraison finale', description: 'Tests de conformité et remise des accès', deadline: 'Dans 21 jours', amount: 50000 },
  ]);

  // Formulaire Demande de Retrait
  const [withdrawalMethod, setWithdrawalMethod] = useState<'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [beneficiaryName, setBeneficiaryName] = useState(currentUser?.name || '');
  const [accountOrPhone, setAccountOrPhone] = useState(currentUser?.phone || '');
  const [operatorOrBank, setOperatorOrBank] = useState('Orange Money');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Abonnement aux projets temps réel
  useEffect(() => {
    const unsubscribe = subscribeToStoreProjects(storeId, (data) => {
      setProjects(data);
    });
    return () => unsubscribe();
  }, [storeId]);

  // Totaux calculés
  const totalLocked = projects
    .filter(p => p.status === 'funds_locked' || p.status === 'work_in_progress' || p.status === 'delivered')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalAvailableForWithdrawal = projects
    .filter(p => p.status === 'completed_released')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalWithdrawn = projects
    .filter(p => p.status === 'funds_withdrawn')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // Ajout / Suppression de jalon
  const handleAddMilestone = () => {
    setMilestones(prev => [
      ...prev,
      { title: `Jalon ${prev.length + 1}`, description: '', deadline: 'Dans 10 jours', amount: 25000 }
    ]);
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMilestone = (idx: number, field: string, value: any) => {
    setMilestones(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const totalCalculatedAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  // Sauvegarde d'un nouveau devis
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !projectTitle.trim() || milestones.length === 0) return;

    playTapBeep();
    const projectId = `proj-${Date.now().toString(36)}-${Math.floor(Math.random() * 899 + 100)}`;
    const newProject: EscrowProject = {
      id: projectId,
      storeId,
      storeName,
      merchantName: currentUser?.name || 'Prestataire',
      merchantPhone: currentUser?.phone || '',
      merchantEmail: currentUser?.email || '',
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientCompany: clientCompany.trim() || undefined,
      projectTitle: projectTitle.trim(),
      description: projectDescription.trim(),
      milestones: milestones.map((m, idx) => ({
        id: `ms-${idx + 1}-${Date.now()}`,
        title: m.title.trim(),
        description: m.description.trim() || undefined,
        deadline: m.deadline.trim() || undefined,
        amount: Number(m.amount) || 0,
        status: 'pending',
      })),
      totalAmount: totalCalculatedAmount,
      termsAndConditions: termsAndConditions.trim(),
      status: 'sent',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveEscrowProject(newProject);
    playValidationBeep();
    setIsCreateModalOpen(false);

    // Réinitialisation
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientCompany('');
    setProjectTitle('');
    setProjectDescription('');
  };

  // Copier le lien public
  const handleCopyLink = (projId: string) => {
    const url = getPublicProjectUrl(projId);
    navigator.clipboard.writeText(url);
    setCopiedId(projId);
    setTimeout(() => setCopiedId(null), 2000);
    playTapBeep();
  };

  // Marquer travaux comme livrés
  const handleMarkDelivered = async (project: EscrowProject) => {
    playTapBeep();
    await updateEscrowStatus(project.id, storeId, 'delivered');
    playValidationBeep();
  };

  // Valider demande de retrait
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToWithdraw || !beneficiaryName.trim() || !accountOrPhone.trim()) return;

    playTapBeep();
    setIsSubmittingWithdrawal(true);
    const details: EscrowWithdrawalDetails = {
      method: withdrawalMethod,
      beneficiaryName: beneficiaryName.trim(),
      accountOrPhone: accountOrPhone.trim(),
      operatorOrBank: operatorOrBank.trim(),
      requestedAt: Date.now(),
      status: 'REQUESTED',
    };

    await requestEscrowWithdrawal(projectToWithdraw.id, storeId, details);
    playCashChime();
    setIsSubmittingWithdrawal(false);
    setIsWithdrawModalOpen(false);
    setProjectToWithdraw(null);
  };

  // Badge Statut
  const renderStatusBadge = (status: EscrowStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Brouillon</span>;
      case 'sent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">Devis Envoyé (Attente Fonds)</span>;
      case 'funds_locked':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Fonds Séquestrés</span>;
      case 'work_in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">Travaux en cours</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">Livrable Remis (Attente Validation)</span>;
      case 'completed_released':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"><Unlock className="w-2.5 h-2.5" /> Fonds Débloqués</span>;
      case 'disputed_paused':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
            Litige / Projet Gelé
          </span>
        );
      case 'refunded_client':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Client Remboursé (Clôturé)
          </span>
        );
      case 'funds_withdrawn':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">Fonds Retirés</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
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
              <FolderKanban className="w-5 h-5 text-indigo-400" />
              <h1 className="text-base font-extrabold text-white">
                Devis, Projets & Séquestre (Escrow)
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              Paiements sécurisés par Tiers de Confiance Nana Guarantee
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setIsCreateModalOpen(true);
          }}
          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Créer un Devis / Projet</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Fonds Consignés (Sous Séquestre)</span>
              <div className="text-xl font-black text-amber-300 mt-0.5">{formatCFA(totalLocked)}</div>
              <span className="text-[10px] text-amber-400/80">Bloqués jusqu'à validation client</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Fonds Disponibles au Retrait</span>
              <div className="text-xl font-black text-emerald-300 mt-0.5">{formatCFA(totalAvailableForWithdrawal)}</div>
              <span className="text-[10px] text-emerald-400/80">Prêts à être transférés sur votre compte</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Unlock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Fonds Déjà Encaissés</span>
              <div className="text-xl font-black text-slate-200 mt-0.5">{formatCFA(totalWithdrawn)}</div>
              <span className="text-[10px] text-slate-500">{projects.length} projet(s) géré(s)</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Info Banner Tiers de Confiance */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white">Comment fonctionne le Séquestre (Escrow) ?</p>
            <p className="text-slate-400 leading-relaxed">
              1. Vous envoyez le lien sécurisé au client. 
              2. Le client effectue son règlement Mobile Money : l'argent est <strong>bloqué en sécurité sous séquestre</strong>.
              3. Vous réalisez les travaux en toute confiance.
              4. Dès que le client valide la livraison, les fonds sont immédiatement débloqués et disponibles pour votre retrait !
            </p>
          </div>
        </div>

        {/* Project List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Mes Devis & Projets ({projects.length})
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
              <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">Aucun devis ni projet pour le moment</p>
                <p className="text-xs text-slate-500">
                  Créez votre premier devis avec séquestre financier et envoyez le lien sécurisé à votre client.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Créer un premier devis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.map((project) => {
                const isCopied = copiedId === project.id;
                const isDisputed = project.status === 'disputed_paused';
                const isRefunded = project.status === 'refunded_client';
                const canWithdraw = project.status === 'completed_released' && !isDisputed;
                const canMarkDelivered = (project.status === 'funds_locked' || project.status === 'work_in_progress') && !isDisputed;

                return (
                  <div
                    key={project.id}
                    className={`p-4 rounded-2xl bg-slate-900 border transition flex flex-col justify-between space-y-3 shadow-lg ${
                      isDisputed ? 'border-rose-500/60 shadow-rose-950/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{project.clientName}</span>
                            {project.clientCompany && (
                              <span className="text-slate-500">({project.clientCompany})</span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-white mt-0.5">{project.projectTitle}</h3>
                        </div>
                        {renderStatusBadge(project.status)}
                      </div>

                      {/* Alerte Litige / Projet Gelé */}
                      {isDisputed && (
                        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 space-y-1 animate-in fade-in">
                          <div className="text-[11px] font-black text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>PROJET SUSPENDU PAR LA MÉDIATION SUPER ADMIN</span>
                          </div>
                          <p className="text-[11px] text-rose-200/90 leading-snug">
                            {project.disputeReason || "Un arbitrage conservatoire est en cours. Les déblocages et validations sont gelés."}
                          </p>
                          <p className="text-[10px] text-rose-300/70">
                            Cliquez sur "Chat & Échanges" ci-dessous pour échanger avec le client et le médiateur Super Admin.
                          </p>
                        </div>
                      )}

                      {project.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}

                      {/* Jalons Aperçu */}
                      <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Jalons ({project.milestones.length})</span>
                          <span className="text-amber-300 text-xs font-black">{formatCFA(project.totalAmount)}</span>
                        </div>
                        <div className="space-y-1">
                          {project.milestones.slice(0, 3).map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300 truncate max-w-[220px]">• {m.title}</span>
                              <span className="font-mono text-slate-400">{formatCFA(m.amount)}</span>
                            </div>
                          ))}
                          {project.milestones.length > 3 && (
                            <span className="text-[10px] text-slate-500 italic block">
                              + {project.milestones.length - 3} autre(s) jalon(s)...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                      {/* Messagerie & Échanges Tripartites */}
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setChatProject(project);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Messagerie et échanges tripartites"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Chat & Échanges</span>
                      </button>

                      {/* Copier lien public */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(project.id)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Copier le lien public pour le client"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Lien copié !' : 'Copier lien client'}</span>
                      </button>

                      {/* Partager WhatsApp */}
                      <a
                        href={getQuoteWhatsAppUrl(project)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Envoyer le devis sur WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Ouvrir la page publique client dans un nouvel onglet */}
                      <a
                        href={getPublicProjectUrl(project.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        title="Aperçu vue client"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Marquer travaux comme livrés */}
                      {canMarkDelivered && (
                        <button
                          type="button"
                          onClick={() => handleMarkDelivered(project)}
                          className="py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ml-auto"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Marquer livré</span>
                        </button>
                      )}

                      {/* Retrait des fonds si débloqués */}
                      {canWithdraw && (
                        <button
                          type="button"
                          onClick={() => {
                            setProjectToWithdraw(project);
                            setIsWithdrawModalOpen(true);
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black flex items-center gap-1 shadow-md transition cursor-pointer ml-auto"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Retirer les fonds</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL : CRÉER UN DEVIS / PROJET */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 my-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Nouveau Devis avec Séquestre (Escrow)</h3>
                <p className="text-xs text-slate-400">Renseignez les détails du client et les jalons de réalisation</p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* Client Info */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">1. Coordonnées du Client</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nom complet du client *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: M. Oumar Traoré"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Entreprise / Société</label>
                    <input
                      type="text"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      placeholder="Ex: Sahel Distribution SARL"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Numéro WhatsApp / Téléphone</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: +226 70 12 34 56"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@entreprise.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Project Title & Description */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">2. Objet de la Mission</span>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Titre de la mission / du projet *</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Ex: Aménagement & Pose Caisse Enregistreuse Tactile"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Description détaillée</label>
                  <textarea
                    rows={2}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Précisez les attentes, le contexte et les livrables principaux..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Milestones List */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    3. Jalons & Montants des Prestations
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un jalon</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Jalon #{idx + 1}</span>
                        {milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={m.title}
                            onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                            placeholder="Titre du jalon (ex: Livraison matériel)"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={m.amount}
                            onChange={(e) => handleUpdateMilestone(idx, 'amount', Number(e.target.value))}
                            placeholder="Montant FCFA"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold placeholder-slate-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => handleUpdateMilestone(idx, 'description', e.target.value)}
                          placeholder="Livrables ou détails..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-500"
                        />
                        <input
                          type="text"
                          value={m.deadline}
                          onChange={(e) => handleUpdateMilestone(idx, 'deadline', e.target.value)}
                          placeholder="Délai estimé (ex: 7 jours)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Total Global du Devis :</span>
                  <span className="text-sm font-black text-amber-300">{formatCFA(totalCalculatedAmount)}</span>
                </div>
              </div>

              {/* Terms */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Conditions générales & Garantie Tiers de Confiance</label>
                <textarea
                  rows={2}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Générer le Devis & le Lien Séquestre Client</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : RETRAIT DES FONDS DÉBLOQUÉS */}
      {isWithdrawModalOpen && projectToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Retrait des Fonds Séquestre</h3>
                <p className="text-xs text-slate-400">Livraison validée par le client {projectToWithdraw.clientName}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Projet :</span>
                <span className="font-bold text-white truncate max-w-[200px]">{projectToWithdraw.projectTitle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Montant débloqué :</span>
                <span className="font-black text-emerald-400 text-sm">{formatCFA(projectToWithdraw.totalAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Mode de réception</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawalMethod('MOBILE_MONEY')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      withdrawalMethod === 'MOBILE_MONEY'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawalMethod('BANK_TRANSFER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      withdrawalMethod === 'BANK_TRANSFER'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Compte Bancaire</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom du bénéficiaire</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Ex: Amadou Diallo"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {withdrawalMethod === 'MOBILE_MONEY' ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Opérateur Mobile</label>
                    <select
                      value={operatorOrBank}
                      onChange={(e) => setOperatorOrBank(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Orange Money">Orange Money</option>
                      <option value="Wave">Wave</option>
                      <option value="Moov Africa">Moov Africa</option>
                      <option value="MTN Mobile Money">MTN Mobile Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Numéro Mobile Money de réception</label>
                    <input
                      type="tel"
                      value={accountOrPhone}
                      onChange={(e) => setAccountOrPhone(e.target.value)}
                      placeholder="Ex: 70 12 34 56"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nom de la Banque</label>
                    <input
                      type="text"
                      value={operatorOrBank}
                      onChange={(e) => setOperatorOrBank(e.target.value)}
                      placeholder="Ex: Ecobank, BOA, Coris Bank"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Numéro de compte / RIB / IBAN</label>
                    <input
                      type="text"
                      value={accountOrPhone}
                      onChange={(e) => setAccountOrPhone(e.target.value)}
                      placeholder="Ex: CI092 01001 12345678901 23"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmittingWithdrawal}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Confirmer le Virement de {formatCFA(projectToWithdraw.totalAmount)}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : CHAT TRIPARTITE EN DIRECT */}
      {chatProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[750px] overflow-hidden">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Messagerie & Suivi de Projet
                  </span>
                  <span className="text-xs text-slate-500 font-mono">#{chatProject.id.slice(-6)}</span>
                </div>
                <h3 className="text-sm font-black text-white mt-1">{chatProject.projectTitle}</h3>
                <p className="text-[11px] text-slate-400">
                  Client : <strong className="text-slate-200">{chatProject.clientName}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setChatProject(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded Chat */}
            <div className="flex-1 overflow-hidden">
              <EscrowTripartiteChat
                projectId={chatProject.id}
                storeId={chatProject.storeId}
                currentUserRole="MERCHANT"
                currentUserName={currentUser?.name || chatProject.merchantName || 'Prestataire'}
                isDisputed={chatProject.status === 'disputed_paused'}
                disputeReason={chatProject.disputeReason}
                onClose={() => setChatProject(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowQuotesView;
