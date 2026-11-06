import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Mail,
  Send,
  MessageCircle,
  Copy,
  Check,
  CheckCircle2,
  X,
  ExternalLink,
  Phone,
  Sparkles,
  Search,
  Filter,
  Users,
  Flame,
  Radio,
  Package,
  FileCheck2,
  DollarSign,
  Crown,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { TenantUpsellCandidate } from '../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';

export interface UpsellOpportunitiesWidgetProps {
  className?: string;
  onContactCandidate?: (candidate: TenantUpsellCandidate) => void;
}

// Données initiales des opportunités d'upsell — zéro mock hardcodé
export const INITIAL_UPSELL_CANDIDATES: TenantUpsellCandidate[] = [];

export const UpsellOpportunitiesWidget: React.FC<UpsellOpportunitiesWidgetProps> = ({
  className = '',
  onContactCandidate
}) => {
  const [candidates, setCandidates] = useState<TenantUpsellCandidate[]>(INITIAL_UPSELL_CANDIDATES);
  const [filterType, setFilterType] = useState<'ALL' | 'SATURATED_100' | 'CRITICAL_80'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modale de contact commercial
  const [selectedCandidate, setSelectedCandidate] = useState<TenantUpsellCandidate | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtrage des candidats
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        c.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.criticalQuota.formatted.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'SATURATED_100') {
        return c.criticalQuota.percentage >= 100;
      }
      if (filterType === 'CRITICAL_80') {
        return c.criticalQuota.percentage >= 80 && c.criticalQuota.percentage < 100;
      }
      return true;
    });
  }, [candidates, filterType, searchQuery]);

  // Calculs KPI du Super Admin
  const metrics = useMemo(() => {
    const totalCount = candidates.length;
    const saturatedCount = candidates.filter((c) => c.criticalQuota.percentage >= 100).length;
    const critical80Count = candidates.filter((c) => c.criticalQuota.percentage >= 80 && c.criticalQuota.percentage < 100).length;
    const totalMrrPotential = candidates.reduce((sum, c) => sum + c.mrrPotential, 0);

    return {
      totalCount,
      saturatedCount,
      critical80Count,
      totalMrrPotential
    };
  }, [candidates]);

  // Ouverture de la modale de contact
  const handleOpenContactModal = (candidate: TenantUpsellCandidate) => {
    playTapBeep();
    setSelectedCandidate(candidate);

    const is100 = candidate.criticalQuota.percentage >= 100;
    const subject = `[NaNa POS Pro] Débloquez vos plafonds et passez au Plan Pro sur ${candidate.storeName}`;
    const body = `Bonjour ${candidate.managerName},

Nous remarquons que votre boutique "${candidate.storeName}" a atteint ${candidate.criticalQuota.formatted} (${candidate.criticalQuota.percentage}% de votre quota mensuel) sur votre formule ${candidate.currentPlan}.

${is100 ? "Vos diffusions en direct ou ajouts de produits sont temporairement bloqués par la limite Starter." : "Vous approchez rapidement de votre limite mensuelle."}

Pour éviter tout ralentissement de vos ventes et débloquer les fonctionnalités illimitées (Lives Flash illimités, catalogue infini, IA marketing avancée) :
👉 Passez directement au Plan Pro NaNa POS pour seulement 12 000 F CFA/mois.

En tant que client prioritaire, nous vous offrons 15% de réduction sur votre premier trimestre avec le code VIPPRO15.

Puis-je vous activer l'accès Pro dès aujourd'hui ?

Bien cordialement,
L'équipe Commerciale NaNa POS
Contact direct : +226 70 00 00 00`;

    setEmailSubject(subject);
    setEmailBody(body);

    if (onContactCandidate) {
      onContactCandidate(candidate);
    }
  };

  // Envoi de l'email via mailto
  const handleSendMailto = () => {
    if (!selectedCandidate) return;
    playValidationBeep();

    const mailtoUrl = `mailto:${selectedCandidate.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;

    markAsContacted(selectedCandidate.id);
  };

  // Envoi via WhatsApp
  const handleSendWhatsApp = () => {
    if (!selectedCandidate) return;
    playValidationBeep();

    const cleanPhone = selectedCandidate.phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(emailBody)}`;
    window.open(waUrl, '_blank');

    markAsContacted(selectedCandidate.id);
  };

  // Copier le texte
  const handleCopyBody = () => {
    playTapBeep();
    navigator.clipboard.writeText(`${emailSubject}\n\n${emailBody}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const markAsContacted = (id: string) => {
    playCashChime();
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, contactStatus: 'CONTACTED' } : c))
    );
    setToastMessage(`✓ Proposition commerciale envoyée à ${selectedCandidate?.managerName} !`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedCandidate(null);
  };

  return (
    <div className={`w-full bg-[#FFFFFF] border-2 border-[#2563EB] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden text-slate-900 ${className}`}>
      {/* Halo discret cockpit Super Admin */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* ── Toast de confirmation ── */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ── En-tête : Titre & Métriques de Chasse à l'Upsell ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Opportunités d'Upsell & Friction Quotas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-700 font-black text-[10.5px]">
              Super Admin Cockpit
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Clients atteignant 80% ou 100% de leurs quotas dans le mois. Relancez-les manuellement si l'upsell automatique ne convertit pas immédiatement.
          </p>
        </div>

        {/* Badge MRR Potentiel */}
        <div className="bg-blue-50 border-2 border-[#2563EB]/30 rounded-2xl px-4 py-2 flex items-center gap-3 shrink-0 shadow-inner">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">MRR Potentiel Immédiat</span>
            <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
              +{formatCFA(metrics.totalMrrPotential)}/mois
            </span>
          </div>
        </div>
      </div>

      {/* ── 3 KPIs de Synthèse ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* KPI 1 */}
        <div className="bg-blue-50/70 border-2 border-[#2563EB]/25 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-600">Opportunités Détectées</span>
              <p className="text-lg font-black text-slate-900">{metrics.totalCount} Gérants</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 border border-[#2563EB]/30 text-[#2563EB]">
            SaaS Leads
          </span>
        </div>

        {/* KPI 2 */}
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-600">Quotas Saturés (100%)</span>
              <p className="text-lg font-black text-rose-600">{metrics.saturatedCount} Bloqués</p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-700 animate-pulse">
            Friction Max
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-600">Alerte Seuil (80% - 99%)</span>
              <p className="text-lg font-black text-amber-700">{metrics.critical80Count} Gérants</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800">
            Chaud
          </span>
        </div>
      </div>

      {/* ── Barre d'outils : Recherche & Filtres Rapides ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par gérant, boutique ou quota..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border-2 border-[#2563EB]/30 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Filtres Pilules */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterType('ALL'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterType === 'ALL'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-[#2563EB] border border-slate-200'
            }`}
          >
            Tous ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterType('SATURATED_100'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterType === 'SATURATED_100'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-rose-600 border border-slate-200'
            }`}
          >
            100% Saturés ({metrics.saturatedCount})
          </button>
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterType('CRITICAL_80'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filterType === 'CRITICAL_80'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-amber-300 border border-slate-800'
            }`}
          >
            80% - 99% ({metrics.critical80Count})
          </button>
        </div>
      </div>

      {/* ── LE TABLEAU DE MONITORING DES OPPORTUNITÉS D'UPSELL ── */}
      <div className="w-full overflow-x-auto border border-slate-800/90 rounded-2xl bg-slate-950/60 shadow-inner">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-black uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Nom du Gérant</th>
              <th className="py-3 px-4">Plan Actuel</th>
              <th className="py-3 px-4">Quota Critique</th>
              <th className="py-3 px-4 text-right">Action Commerciale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400">
                  <Flame className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-slate-300">Aucun gérant en dépassement de quota</p>
                  <p className="text-xs text-slate-500 mt-1">Tous les marchands opèrent dans les limites normales de leurs forfaits.</p>
                </td>
              </tr>
            ) : (
              filteredCandidates.map((c) => {
                const is100 = c.criticalQuota.percentage >= 100;

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      is100 ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Colonne 1 : Nom du Gérant */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.avatarUrl}
                          alt={c.managerName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white truncate">{c.managerName}</span>
                            <span className="text-xs" title={c.country}>{c.countryFlag}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-semibold truncate">{c.storeName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{c.city} • {c.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Colonne 2 : Plan Actuel */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black text-[11px] inline-flex items-center gap-1">
                          <span>{c.currentPlan}</span>
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono">Actif : {c.lastActive}</p>
                      </div>
                    </td>

                    {/* Colonne 3 : Quota Critique */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5 max-w-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-slate-200 text-xs truncate">
                            {c.criticalQuota.formatted}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md font-black text-[9px] uppercase tracking-wide shrink-0 ${
                              is100
                                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 animate-pulse'
                                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {is100 ? '100% SATURÉ' : `${c.criticalQuota.percentage}%`}
                          </span>
                        </div>

                        {/* Barre miniature */}
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              is100
                                ? 'bg-gradient-to-r from-rose-600 to-red-500'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.min(c.criticalQuota.percentage, 100)}%` }}
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 truncate">
                          {c.criticalQuota.name}
                        </p>
                      </div>
                    </td>

                    {/* Colonne 4 : Bouton d'action "Contacter" */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.contactStatus === 'CONTACTED' ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10.5px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Contacté ✓</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenContactModal(c)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs transition shadow-md shadow-indigo-950/40 flex items-center gap-1.5 cursor-pointer"
                            title={`Contacter ${c.managerName} pour lui proposer le Plan Pro`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Contacter</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODALE DE CONTACT COMMERCIAL (OUTREACH PROPOSALS) ── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c1220] border border-indigo-500/40 w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Bouton fermeture */}
            <button
              type="button"
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* En-tête Modale */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-black text-white tracking-tight">
                  Proposition Commerciale d'Upsell Pro
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Destinataire : <strong className="text-indigo-300">{selectedCandidate.managerName}</strong> ({selectedCandidate.storeName})
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10.5px]">
                  <span className="px-2 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold">
                    Quota Saturé : {selectedCandidate.criticalQuota.formatted}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-bold">MRR cible : +35 000 F CFA/mois</span>
                </div>
              </div>
            </div>

            {/* Objet du mail */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Objet de l'email
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Corps du message pré-rédigé */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Message Commercial Personnalisé
              </label>
              <textarea
                rows={9}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* Actions d'envoi 1-clic */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyBody}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copié dans le presse-papier !' : 'Copier le pitch'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Bouton WhatsApp */}
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/40"
                  title="Ouvrir WhatsApp pour envoyer la proposition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Bouton Email Direct */}
                <button
                  type="button"
                  onClick={handleSendMailto}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-950/40"
                  title="Ouvrir votre messagerie par défaut (Mailto)"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Ouvrir Email (Mailto)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpsellOpportunitiesWidget;
