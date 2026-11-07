import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Eye,
  Download,
  Phone,
  Mail,
  Building2,
  User,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Briefcase,
  FileText,
  ExternalLink,
  Sparkles,
  Camera,
  X,
  Zap
} from 'lucide-react';
import {
  getAllKycRequests,
  updateKycRequestStatus,
  getAllKycSubmissions,
  approveKycSubmission,
  rejectKycSubmission,
  saveIdentificationChain,
  getIdentificationChain
} from '../../utils/kycService';
import {
  fetchKycSubmissionsFromSupabase,
  updateKycStatusInSupabase
} from '../../services/superAdminSupabaseService';
import { supabase } from '@/lib/supabase';
import { KycSubmission, KycStatus, IdentificationChain } from '../../types';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';

export const KycValidationControlPlaneView: React.FC = () => {
  const [kycList, setKycList] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'BUSINESS'>('ALL');
  const [modelFilter, setModelFilter] = useState<'ALL' | 'COMMISSION' | 'SUBSCRIPTION'>('ALL');

  // Modale d'Aperçu Haute Définition du Document
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    title: string;
    storeName: string;
  } | null>(null);

  // Modale de Rejet avec Motif
  const [rejectingItem, setRejectingItem] = useState<KycSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Document non conforme ou illisible");
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================================================
  // 1. CHARGEMENT CENTRALISÉ DES DEMANDES KYC (SUPABASE + LOCAL + FIRESTORE)
  // =========================================================================
  const loadAllKyc = async () => {
    setIsLoading(true);
    try {
      const mergedMap = new Map<string, KycSubmission>();

      // 1. Lire Supabase table account_activations
      try {
        const { data: activations } = await supabase
          .from('account_activations')
          .select('*')
          .order('created_at', { ascending: false });

        if (activations && activations.length > 0) {
          activations.forEach((act: any) => {
            const kd = act.kyc_data || {};
            const key = act.organization_id || act.user_id || act.id;
            const mappedStatus: KycStatus = 
              act.status === 'approved' ? 'verified' : act.status === 'rejected' ? 'rejected' : 'pending_approval';

            mergedMap.set(key, {
              id: act.id || `kyc-${key}`,
              storeId: act.organization_id || key,
              userId: act.user_id,
              storeName: kd.companyName || kd.fullName || `Commerce ${key.slice(0, 6)}`,
              managerFullName: kd.fullName || 'Gérant',
              whatsappPhone: kd.paymentNumber || '',
              userEmail: kd.email || '',
              activityDomain: kd.activityDomain || kd.sector || 'Commerce Général',
              briefDescription: kd.activityDescription || kd.briefDescription || '',
              activityDescription: kd.activityDescription || kd.briefDescription || '',
              monetizationModel: act.pricing_model || kd.monetizationModel || kd.pricingModel || 'commission',
              pricingModel: act.pricing_model || kd.pricingModel || kd.monetizationModel || 'commission',
              documentType: (kd.documentType || 'CNIB') as any,
              documentPhotoUrl: kd.idCardUrl || '',
              managerPhotoUrl: kd.photoCaptureUrl || '',
              businessDocumentUrl: kd.rccmDocPhotoUrl || '',
              rccmDocPhotoUrl: kd.rccmDocPhotoUrl || '',
              ifuDocPhotoUrl: kd.ifuDocPhotoUrl || '',
              rccmNumber: kd.rccmNumber || '',
              ifuNumber: kd.ifuNumber || '',
              type: kd.accountType === 'entreprise' || kd.rccmNumber ? 'business' : 'individual',
              status: mappedStatus,
              submittedAt: act.submitted_at || act.created_at || new Date().toISOString(),
              reviewedAt: act.reviewed_at || undefined,
              reviewedBy: act.reviewed_by || undefined,
              rejectionReason: act.admin_notes || undefined
            });
          });
        }
      } catch (err) {
        console.warn('[KYC_CONTROL_PLANE] Lecture Supabase account_activations:', err);
      }

      // 2. Lire le service local / Firestore (getAllKycRequests & getAllKycSubmissions)
      try {
        const [requests, submissions] = await Promise.all([
          getAllKycRequests(),
          getAllKycSubmissions()
        ]);

        [...requests, ...submissions].forEach(item => {
          const key = item.storeId || item.userId || item.id;
          if (key && !mergedMap.has(key)) {
            mergedMap.set(key, item);
          } else if (key && mergedMap.has(key)) {
            // Compléter les champs manquants (activityDomain, description, etc.)
            const existing = mergedMap.get(key)!;
            mergedMap.set(key, {
              ...item,
              ...existing,
              activityDomain: existing.activityDomain || item.activityDomain || (item as any).sector || 'Commerce Général',
              briefDescription: existing.briefDescription || item.briefDescription || (item as any).activityDescription || '',
              rccmDocPhotoUrl: existing.rccmDocPhotoUrl || item.rccmDocPhotoUrl,
              ifuDocPhotoUrl: existing.ifuDocPhotoUrl || item.ifuDocPhotoUrl
            });
          }
        });
      } catch (err) {
        console.warn('[KYC_CONTROL_PLANE] Lecture kycService:', err);
      }

      // 3. Scanner localStorage pour les clés directes nanasore_kyc_chain_
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('nanasore_kyc_chain_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const chainData = JSON.parse(raw);
              const storeId = k.replace('nanasore_kyc_chain_', '');
              if (!mergedMap.has(storeId)) {
                mergedMap.set(storeId, {
                  id: `kyc-chain-${storeId}`,
                  storeId,
                  storeName: chainData.companyName || chainData.fullName || 'Boutique Marchand',
                  managerFullName: chainData.managerName || chainData.fullName || 'Gérant Partenaire',
                  whatsappPhone: chainData.phone || '',
                  userEmail: chainData.companyEmail || '',
                  activityDomain: chainData.activityDomain || 'Commerce Général & E-commerce',
                  briefDescription: chainData.briefDescription || '',
                  activityDescription: chainData.briefDescription || '',
                  monetizationModel: chainData.monetizationModel || chainData.pricingModel || 'commission',
                  pricingModel: chainData.pricingModel || chainData.monetizationModel || 'commission',
                  documentType: 'CNIB',
                  documentPhotoUrl: chainData.cnibRectoUrl || chainData.managerCnibRectoUrl || '',
                  managerPhotoUrl: chainData.faceSelfieUrl || chainData.managerSelfieUrl || '',
                  rccmDocPhotoUrl: chainData.rccmFileUrl || '',
                  ifuDocPhotoUrl: chainData.ifuFileUrl || '',
                  rccmNumber: chainData.rccm || '',
                  ifuNumber: chainData.ifuCompany || '',
                  type: chainData.type === 'entreprise' ? 'business' : 'individual',
                  status: 'pending_approval',
                  submittedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (e) {}

      setKycList(Array.from(mergedMap.values()));
    } catch (globalErr) {
      console.error('[KYC_CONTROL_PLANE] Erreur chargement dossiers:', globalErr);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllKyc();

    const handleKycEvent = () => loadAllKyc();
    window.addEventListener('nana_kyc_status_changed', handleKycEvent);
    window.addEventListener('nana_kyc_submission_created', handleKycEvent);
    window.addEventListener('nana_kyc_submission_updated', handleKycEvent);
    window.addEventListener('nana_id_chain_updated', handleKycEvent);
    window.addEventListener('superAdminUpdated', handleKycEvent);

    return () => {
      window.removeEventListener('nana_kyc_status_changed', handleKycEvent);
      window.removeEventListener('nana_kyc_submission_created', handleKycEvent);
      window.removeEventListener('nana_kyc_submission_updated', handleKycEvent);
      window.removeEventListener('nana_id_chain_updated', handleKycEvent);
      window.removeEventListener('superAdminUpdated', handleKycEvent);
    };
  }, []);

  // =========================================================================
  // 2. FILTRAGE ET STATISTIQUES EN TEMPS RÉEL
  // =========================================================================
  const stats = useMemo(() => {
    const total = kycList.length;
    const pending = kycList.filter(k => k.status === 'pending' || k.status === 'pending_approval').length;
    const verified = kycList.filter(k => k.status === 'verified' || k.status === 'approved').length;
    const rejected = kycList.filter(k => k.status === 'rejected').length;
    return { total, pending, verified, rejected };
  }, [kycList]);

  const filteredList = useMemo(() => {
    return kycList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (item.storeName || '').toLowerCase().includes(q) ||
        (item.managerFullName || '').toLowerCase().includes(q) ||
        (item.storeId || '').toLowerCase().includes(q) ||
        (item.whatsappPhone || '').toLowerCase().includes(q) ||
        (item.userEmail || '').toLowerCase().includes(q) ||
        (item.activityDomain || '').toLowerCase().includes(q) ||
        (item.briefDescription || '').toLowerCase().includes(q);

      const isPending = item.status === 'pending' || item.status === 'pending_approval';
      const isVerified = item.status === 'verified' || item.status === 'approved';
      const isRejected = item.status === 'rejected';

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && isPending) ||
        (statusFilter === 'VERIFIED' && isVerified) ||
        (statusFilter === 'REJECTED' && isRejected);

      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'BUSINESS' && item.type === 'business') ||
        (typeFilter === 'INDIVIDUAL' && item.type !== 'business');

      const isSub = item.monetizationModel === 'subscription' || item.pricingModel === 'subscription';
      const matchesModel =
        modelFilter === 'ALL' ||
        (modelFilter === 'SUBSCRIPTION' && isSub) ||
        (modelFilter === 'COMMISSION' && !isSub);

      return matchesSearch && matchesStatus && matchesType && matchesModel;
    });
  }, [kycList, searchTerm, statusFilter, typeFilter, modelFilter]);

  // =========================================================================
  // 3. ACTION SUPER ADMIN : APPROBATION & DÉBLOCAGE MARCHAND
  // =========================================================================
  const handleApproveKyc = async (item: KycSubmission) => {
    setIsProcessing(true);
    playTapBeep();

    const storeId = item.storeId || item.id;
    const userId = item.userId || storeId;
    const adminEmail = 'Super-Admin Direction Conformité';

    try {
      // 1. Appel API Serveur sécurisé (met à jour account_activations, profiles, organizations, auth)
      try {
        await fetch('/api/admin/kyc/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            userId,
            action: 'approve',
            adminEmail,
            pricingModel: item.monetizationModel || item.pricingModel || 'commission',
            monetizationModel: item.monetizationModel || item.pricingModel || 'commission'
          })
        });
      } catch (e) {
        console.warn('API /api/admin/kyc/validate notice:', e);
      }

      // 2. Synchronisation Supabase Client directe
      await updateKycStatusInSupabase(storeId, 'verified', adminEmail);
      if (userId && userId !== storeId) {
        await updateKycStatusInSupabase(userId, 'verified', adminEmail);
      }

      // 3. Synchronisation service local & Firestore
      await updateKycRequestStatus(storeId, 'verified', undefined, adminEmail);
      if (item.id && (item.id.startsWith('kyc-sub') || item.userId)) {
        await approveKycSubmission(item.id, userId, storeId, adminEmail);
      }

      // 4. Mettre à jour la Chaîne d'Identification séquentielle du store
      const currentChain = await getIdentificationChain(storeId);
      const validatedChain: IdentificationChain = {
        ...currentChain,
        storeId,
        currentStep: 2,
        activityDomain: item.activityDomain || currentChain.activityDomain,
        briefDescription: item.briefDescription || currentChain.briefDescription,
        activityDescription: item.briefDescription || currentChain.activityDescription,
        part1Individual: {
          ...currentChain.part1Individual,
          fullName: item.managerFullName || currentChain.part1Individual.fullName,
          phone: item.whatsappPhone || currentChain.part1Individual.phone,
          status: 'VALIDATED',
          validatedAt: new Date().toISOString(),
          validatedBy: adminEmail
        },
        part2Business: {
          ...currentChain.part2Business,
          companyName: item.storeName || currentChain.part2Business.companyName,
          rccmNumber: item.rccmNumber || currentChain.part2Business.rccmNumber,
          ifuNumber: item.ifuNumber || currentChain.part2Business.ifuNumber,
          status: 'VALIDATED',
          validatedAt: new Date().toISOString(),
          validatedBy: adminEmail
        },
        overallStatus: 'FULLY_VERIFIED',
        updatedAt: new Date().toISOString()
      };
      await saveIdentificationChain(validatedChain);

      // 5. Mettre à jour le cache local du compte
      localStorage.setItem(`nana_tenant_${storeId}_kyc_status`, 'verified');

      playCashChime();
      await loadAllKyc();

    } catch (err) {
      console.error('[KYC_CONTROL_PLANE] Erreur approbation:', err);
      alert("Une erreur est survenue lors de la validation du KYC.");
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // 4. ACTION SUPER ADMIN : REJET AVEC MOTIF
  // =========================================================================
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setIsProcessing(true);
    playTapBeep();

    const storeId = rejectingItem.storeId || rejectingItem.id;
    const userId = rejectingItem.userId || storeId;
    const adminEmail = 'Super-Admin Direction Conformité';

    try {
      // 1. Appel API Serveur
      try {
        await fetch('/api/admin/kyc/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            userId,
            action: 'reject',
            rejectionReason,
            adminEmail
          })
        });
      } catch (e) {
        console.warn('API /api/admin/kyc/validate reject notice:', e);
      }

      // 2. Synchronisation Supabase Client
      await updateKycStatusInSupabase(storeId, 'rejected', adminEmail, rejectionReason);
      if (userId && userId !== storeId) {
        await updateKycStatusInSupabase(userId, 'rejected', adminEmail, rejectionReason);
      }

      // 3. Synchronisation service local & Firestore
      await updateKycRequestStatus(storeId, 'rejected', rejectionReason, adminEmail);
      if (rejectingItem.id && (rejectingItem.id.startsWith('kyc-sub') || rejectingItem.userId)) {
        await rejectKycSubmission(rejectingItem.id, userId, rejectionReason, storeId, adminEmail);
      }

      // 4. Mettre à jour la chaîne d'identification
      const currentChain = await getIdentificationChain(storeId);
      const rejectedChain: IdentificationChain = {
        ...currentChain,
        storeId,
        part1Individual: {
          ...currentChain.part1Individual,
          status: 'REJECTED',
          rejectionReason
        },
        part2Business: {
          ...currentChain.part2Business,
          status: 'REJECTED',
          rejectionReason
        },
        overallStatus: 'UNVERIFIED',
        updatedAt: new Date().toISOString()
      };
      await saveIdentificationChain(rejectedChain);
      localStorage.setItem(`nana_tenant_${storeId}_kyc_status`, 'rejected');

      setRejectingItem(null);
      await loadAllKyc();

    } catch (err) {
      console.error('[KYC_CONTROL_PLANE] Erreur rejet KYC:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // 5. ACTION SUPER ADMIN : REMETTRE EN ATTENTE
  // =========================================================================
  const handleResetPending = async (item: KycSubmission) => {
    setIsProcessing(true);
    playTapBeep();

    const storeId = item.storeId || item.id;
    const userId = item.userId || storeId;

    try {
      await fetch('/api/admin/kyc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, userId, action: 'pending' })
      });

      await updateKycRequestStatus(storeId, 'pending_approval');
      await loadAllKyc();
    } catch (e) {
      console.warn('Erreur reset pending:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* En-tête de l'Espace KYC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Espace Conformité & Validations KYC</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SUPER ADMIN SOUVERAIN
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Examen réglementaire, vérification des pièces d'identité et déblocage direct des comptes marchands Supabase & Auth.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { playTapBeep(); loadAllKyc(); }}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Actualiser les dossiers</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Dossiers</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Toutes soumissions confondues</p>
        </div>

        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">En Attente d'Examen</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{stats.pending}</p>
          <p className="text-[10px] text-amber-300/70 mt-0.5">Action Super Admin requise</p>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">Validés & Débloqués</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{stats.verified}</p>
          <p className="text-[10px] text-emerald-300/70 mt-0.5">Comptes marchands actifs</p>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300">Dossiers Rejetés</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{stats.rejected}</p>
          <p className="text-[10px] text-rose-300/70 mt-0.5">Motif notifié au gérant</p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, boutique, domaine d'activité, téléphone, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filtre Statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map(st => (
            <button
              key={st}
              onClick={() => { playTapBeep(); setStatusFilter(st); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tous' : st === 'PENDING' ? 'En Attente' : st === 'VERIFIED' ? 'Validés' : 'Rejetés'}
            </button>
          ))}
        </div>

        {/* Filtre Type de Compte */}
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <button
            onClick={() => { playTapBeep(); setTypeFilter('ALL'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous types
          </button>
          <button
            onClick={() => { playTapBeep(); setTypeFilter('INDIVIDUAL'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'INDIVIDUAL' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Particuliers
          </button>
          <button
            onClick={() => { playTapBeep(); setTypeFilter('BUSINESS'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'BUSINESS' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entreprises
          </button>
        </div>

        {/* Filtre Modèle Économique */}
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <button
            onClick={() => { playTapBeep(); setModelFilter('ALL'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              modelFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous modèles
          </button>
          <button
            onClick={() => { playTapBeep(); setModelFilter('COMMISSION'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              modelFilter === 'COMMISSION' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Commission
          </button>
          <button
            onClick={() => { playTapBeep(); setModelFilter('SUBSCRIPTION'); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              modelFilter === 'SUBSCRIPTION' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Abonnement
          </button>
        </div>
      </div>

      {/* Liste / Tableau des Dossiers */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-bold text-slate-200">Aucun dossier KYC correspondant</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? "Modifiez vos filtres de recherche pour afficher les dossiers correspondants."
                : "Toutes les demandes de vérification marchande s'afficheront ici en direct."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredList.map(item => {
              const isPending = item.status === 'pending' || item.status === 'pending_approval';
              const isVerified = item.status === 'verified' || item.status === 'approved';
              const isRejected = item.status === 'rejected';

              return (
                <div key={item.id || item.storeId} className="p-5 sm:p-6 hover:bg-slate-800/20 transition-all space-y-4">
                  {/* Ligne 1 : Titre Boutique, Type, Statut et Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        item.type === 'business'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      }`}>
                        {item.type === 'business' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-white">
                            {item.storeName || item.companyName || 'Boutique sans nom'}
                          </h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            item.type === 'business'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            {item.type === 'business' ? 'ENTREPRISE ENREGISTRÉE' : 'PARTICULIER / INDÉPENDANT'}
                          </span>

                          {/* Badge Modèle Économique Choisi */}
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            item.monetizationModel === 'subscription' || item.pricingModel === 'subscription'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {item.monetizationModel === 'subscription' || item.pricingModel === 'subscription' ? (
                              <>
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                <span>MODÈLE ABONNEMENT (FORFAIT REQUIS)</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-emerald-400" />
                                <span>MODÈLE COMMISSION (ACCÈS DIRECT)</span>
                              </>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {item.storeId}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                          <span>Gérant : <strong className="text-slate-200">{item.managerFullName || 'Non renseigné'}</strong></span>
                          {item.whatsappPhone && (
                            <a
                              href={`https://wa.me/${item.whatsappPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{item.whatsappPhone}</span>
                            </a>
                          )}
                          {item.userEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{item.userEmail}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statut Badge & Boutons d'Action Super Admin */}
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto flex-wrap">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                        isVerified
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPending
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isPending && <Clock className="w-3.5 h-3.5" />}
                        {isRejected && <XCircle className="w-3.5 h-3.5" />}
                        <span>{isVerified ? 'Dossier Validé ✓' : isPending ? 'En Attente' : 'Rejeté'}</span>
                      </span>

                      {/* Bouton Valider */}
                      {!isVerified && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApproveKyc(item)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/40 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                          title="Valider le dossier et débloquer les plafonds du marchand"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Valider & Débloquer</span>
                        </button>
                      )}

                      {/* Bouton Rejeter */}
                      {!isRejected && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            playTapBeep();
                            setRejectingItem(item);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 font-bold text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                          title="Rejeter le dossier avec motif explicatif"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Rejeter</span>
                        </button>
                      )}

                      {/* Bouton Remettre en Attente */}
                      {(isVerified || isRejected) && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleResetPending(item)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold transition cursor-pointer"
                          title="Remettre en attente d'examen"
                        >
                          Remettre en attente
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ligne 2 : Les Deux Nouveaux Champs Clés (Domaine d'Activité & Brève Description) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                    {/* Domaine d'Activité */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Domaine d'Activité</span>
                      </div>
                      <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold">
                        {item.activityDomain || 'Commerce Général & Vente en Ligne'}
                      </div>
                    </div>

                    {/* Brève Description de l'Activité */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Brève Description</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                        "{item.briefDescription || item.activityDescription || 'Aucune description rédigée par le marchand.'}"
                      </p>
                    </div>
                  </div>

                  {/* Ligne 3 : Pièces Justificatives Téléversées */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Documents & Pièces Officielles</span>
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* CNIB / Pièce Recto */}
                      {item.documentPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setPreviewDoc({
                              url: item.documentPhotoUrl!,
                              title: `Pièce d'Identité (Recto)`,
                              storeName: item.storeName || item.storeId || ''
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 text-blue-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>CNIB / Passeport Recto</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-800">
                          Recto non téléversé
                        </span>
                      )}

                      {/* Selfie Contrôle Visage */}
                      {item.managerPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setPreviewDoc({
                              url: item.managerPhotoUrl!,
                              title: `Selfie de Contrôle Visage`,
                              storeName: item.storeName || item.storeId || ''
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/15 border border-purple-500/30 hover:bg-purple-600/25 text-purple-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Selfie Visage</span>
                        </button>
                      ) : null}

                      {/* Extrait RCCM (pour Entreprise) */}
                      {item.rccmDocPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setPreviewDoc({
                              url: item.rccmDocPhotoUrl!,
                              title: `Extrait RCCM (${item.rccmNumber || 'Entreprise'})`,
                              storeName: item.storeName || item.storeId || ''
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600/15 border border-amber-500/30 hover:bg-amber-600/25 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Extrait RCCM : {item.rccmNumber || 'Voir'}</span>
                        </button>
                      ) : item.type === 'business' ? (
                        <span className="text-[11px] text-slate-500 italic bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-800">
                          RCCM non téléversé
                        </span>
                      ) : null}

                      {/* Attestation IFU */}
                      {item.ifuDocPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setPreviewDoc({
                              url: item.ifuDocPhotoUrl!,
                              title: `Attestation IFU (${item.ifuNumber || 'Numéro Fiscal'})`,
                              storeName: item.storeName || item.storeId || ''
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600/15 border border-teal-500/30 hover:bg-teal-600/25 text-teal-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Attestation IFU : {item.ifuNumber || 'Voir'}</span>
                        </button>
                      ) : item.type === 'business' ? (
                        <span className="text-[11px] text-slate-500 italic bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-800">
                          IFU non téléversé
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Motif de rejet si rejeté */}
                  {isRejected && item.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                      <strong>Motif de rejet notifié :</strong> {item.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALE 1 : APERÇU HAUTE DÉFINITION DU DOCUMENT
         ========================================================================= */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">{previewDoc.title}</h3>
                <p className="text-xs text-slate-400">{previewDoc.storeName}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download="document_kyc_nanasore"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Télécharger / Ouvrir en taille réelle"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-950/60 flex items-center justify-center min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.endsWith('.pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[600px] rounded-xl border border-slate-800" />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALE 2 : REJET DU DOSSIER AVEC MOTIF EXPLICATIF
         ========================================================================= */}
      {rejectingItem && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setRejectingItem(null)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Rejeter le Dossier KYC</h3>
                  <p className="text-xs text-slate-400">{rejectingItem.storeName} ({rejectingItem.storeId})</p>
                </div>
              </div>
              <button onClick={() => setRejectingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Sélectionnez ou saisissez le motif de rejet notifié au commerçant :
              </label>

              {/* Suggestions rapides */}
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  "Document illisible ou flou, veuillez reprendre une photo nette",
                  "Pièce d'identité expirée ou non conforme",
                  "Selfie de contrôle visage ne correspondant pas à la pièce",
                  "Extrait RCCM ou numéro IFU non vérifiable auprès du registre officiel",
                  "Informations du gérant non concordantes"
                ].map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`p-2.5 rounded-xl text-left text-xs transition cursor-pointer border ${
                      rejectionReason === reason
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Précisez les corrections requises par le commerçant..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer"
              >
                {isProcessing ? 'Enregistrement...' : 'Confirmer le Rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default KycValidationControlPlaneView;
