import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  Phone,
  Edit3,
} from 'lucide-react';
import {
  getSavedAffiliateProfile,
  saveAffiliateProfile,
  buildAffiliateLiveLink,
  subscribeAffiliateCommissionsByCode,
  type AffiliateCommissionRecord,
} from '../../../../services/liveAffiliateService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveAffiliateMiniWalletProps {
  sessionSlug: string;
  sessionTitle?: string;
  defaultDisplayName?: string;
  className?: string;
}

/**
 * Mini-Wallet Affiliation en temps réel côté Acheteurs & Étudiants.
 * Permet à chaque participant/affilié de :
 * - Configurer son code affilié + numéro Mobile Money
 * - Copier / partager son lien d'affiliation (?ref=CODE) en 1 clic
 * - Voir ses gains cumulés, commissions en attente et paiements reçus en temps réel (Supabase Realtime)
 */
export const LiveAffiliateMiniWallet: React.FC<LiveAffiliateMiniWalletProps> = ({
  sessionSlug,
  sessionTitle = 'Ce Live Nanasore',
  defaultDisplayName = '',
  className = '',
}) => {
  const saved = useMemo(() => getSavedAffiliateProfile(), []);

  const [affiliateCode, setAffiliateCode] = useState<string>(saved.code || '');
  const [affiliatePhone, setAffiliatePhone] = useState<string>(saved.phone || '');
  const [codeDraft, setCodeDraft] = useState<string>(
    saved.code ||
      (defaultDisplayName
        ? defaultDisplayName
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 8) + '26'
        : '')
  );
  const [phoneDraft, setPhoneDraft] = useState<string>(saved.phone || '');
  const [commissions, setCommissions] = useState<AffiliateCommissionRecord[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(!saved.code);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Abonnement Supabase Realtime aux commissions de cet affilié
  useEffect(() => {
    if (!affiliateCode) {
      setCommissions([]);
      return;
    }
    const unsub = subscribeAffiliateCommissionsByCode(affiliateCode, (rows) => {
      setCommissions(rows);
    });
    return () => unsub();
  }, [affiliateCode]);

  const stats = useMemo(() => {
    let totalEarned = 0;
    let pendingAmount = 0;
    let paidAmount = 0;
    for (const c of commissions) {
      totalEarned += c.commissionAmount;
      if (c.status === 'paid') paidAmount += c.commissionAmount;
      else pendingAmount += c.commissionAmount;
    }
    return {
      totalEarned,
      pendingAmount,
      paidAmount,
      salesCount: commissions.length,
    };
  }, [commissions]);

  const myAffiliateUrl = useMemo(() => {
    if (!affiliateCode) return '';
    return buildAffiliateLiveLink(sessionSlug, affiliateCode, affiliatePhone);
  }, [sessionSlug, affiliateCode, affiliatePhone]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeDraft.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!clean) return;
    playValidationBeep();
    saveAffiliateProfile(clean, phoneDraft.trim());
    setAffiliateCode(clean);
    setAffiliatePhone(phoneDraft.trim());
    setIsEditingProfile(false);
  };

  const handleCopyLink = () => {
    if (!myAffiliateUrl) {
      setIsDrawerOpen(true);
      setIsEditingProfile(true);
      return;
    }
    playValidationBeep();
    navigator.clipboard?.writeText(myAffiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const handleShareWhatsApp = () => {
    if (!myAffiliateUrl) {
      setIsDrawerOpen(true);
      setIsEditingProfile(true);
      return;
    }
    playTapBeep();
    const msg = `🔥 Rejoins "${sessionTitle}" en direct ici : ${myAffiliateUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* BARRE COMPACTE MINI-WALLET AFFILIÉ (TOUJOURS VISIBLE CÔTÉ ACHETEUR / ÉTUDIANT) */}
      <div
        className={`w-full bg-white border border-blue-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm shadow-blue-950/5 flex flex-wrap items-center justify-between gap-2.5 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Mini-Wallet Affilié
              </span>
              {affiliateCode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {affiliateCode}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-slate-900">
                {formatCFA(stats.totalEarned)}
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                {stats.salesCount} vente{stats.salesCount > 1 ? 's' : ''}
              </span>
              {stats.pendingAmount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                  En attente : {formatCFA(stats.pendingAmount)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-[#F5F7FB] hover:bg-blue-50 text-[#1D4ED8] border border-blue-200 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Lien copié !' : affiliateCode ? 'Mon lien affilié' : 'Activer mon lien'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsDrawerOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Mes gains</span>
          </button>
        </div>
      </div>

      {/* MODALE / TIROIR DÉTAILLÉ DU MINI-WALLET AFFILIÉ TEMPS RÉEL */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#1D4ED8] to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">Mon Mini-Wallet Affilié (Temps Réel)</h3>
                  <p className="text-[11px] text-blue-100">
                    Partagez ce live et suivez vos commissions en direct
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Cartes KPI temps réel */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] font-bold uppercase text-blue-700">Total Gagné</p>
                  <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                    {formatCFA(stats.totalEarned)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-bold uppercase text-amber-700">En attente</p>
                  <p className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
                    {formatCFA(stats.pendingAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Déjà Payé</p>
                  <p className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                    {formatCFA(stats.paidAmount)}
                  </p>
                </div>
              </div>

              {/* Profil & Lien Affilié */}
              {isEditingProfile || !affiliateCode ? (
                <form
                  onSubmit={handleSaveProfile}
                  className="p-4 rounded-2xl bg-[#F5F7FB] border border-slate-200 space-y-3"
                >
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Configurer mon compte affilié</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Votre Code Affilié *
                      </label>
                      <input
                        type="text"
                        required
                        value={codeDraft}
                        onChange={(e) => setCodeDraft(e.target.value)}
                        placeholder="ex: AMINA26"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold uppercase focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Numéro Mobile Money (pour recevoir vos gains)
                      </label>
                      <input
                        type="tel"
                        value={phoneDraft}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                        placeholder="ex: +226 70 00 00 00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-black transition cursor-pointer"
                  >
                    Enregistrer &amp; Générer mon Lien Affilié
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F5F7FB] border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">Code : {affiliateCode}</span>
                      {affiliatePhone && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <Phone className="w-3 h-3" /> {affiliatePhone}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeDraft(affiliateCode);
                        setPhoneDraft(affiliatePhone);
                        setIsEditingProfile(true);
                      }}
                      className="text-[11px] font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Modifier
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700 truncate select-all">
                    {myAffiliateUrl}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="flex-1 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Partager WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Historique en temps réel des commissions */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Historique de vos commissions ({commissions.length})</span>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Temps réel
                  </span>
                </h4>

                {commissions.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-600">Aucune commission enregistrée pour l'instant</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dès qu'un acheteur ou étudiant commande via votre lien, votre gain apparaît ici instantanément.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {commissions.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{rec.productName}</p>
                          <p className="text-[10px] text-slate-500">
                            Commande : {formatCFA(rec.orderAmount)} • {rec.commissionPercent}% •{' '}
                            {new Date(rec.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-emerald-700">+{formatCFA(rec.commissionAmount)}</p>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              rec.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.status === 'paid' ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" /> Payé
                              </>
                            ) : (
                              <>
                                <Clock className="w-2.5 h-2.5" /> En attente
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveAffiliateMiniWallet;
