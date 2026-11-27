import React, { useCallback, useEffect, useState } from 'react';
import {
  FileSignature,
  RefreshCw,
  CheckCircle2,
  Download,
  Phone,
  Briefcase,
  User,
  Percent,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

interface CommissionContractsAdminPanelProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CommissionContractsAdminPanel: React.FC<CommissionContractsAdminPanelProps> = ({ showToast }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalAccounts: 0,
    activeAccounts: 0,
    pendingReviewCount: 0,
    totalSalesXof: 0,
    totalCommissionXof: 0,
    totalNetMerchantXof: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setErrorMsg('Session Super Admin requise pour charger les contrats.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/commission/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Erreur chargement des contrats commission.');
      }

      setAccounts(json.accounts || []);
      setTransactions(json.transactions || []);
      if (json.summary) setSummary(json.summary);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible de charger les contrats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleMarkReviewed = async (accountId: string) => {
    setReviewingId(accountId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/admin/commission/accounts/${encodeURIComponent(accountId)}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminReviewed: true, status: 'ACTIVE' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Erreur validation');
      }
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? json.account : a)));
      showToast?.('Contrat commission marqué comme vérifié par le Super Admin.', 'success');
    } catch (err: any) {
      showToast?.(err?.message || 'Erreur lors de la vérification.', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const downloadContractCopyPdf = (acc: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const rate = Number(acc.commission_rate_percent || 14);
    const signedDate = acc.contract_signed_at
      ? new Date(acc.contract_signed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR');

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.rect(10, 10, pageW - 20, 277);

    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, pageW - 20, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('COPIE SUPER ADMIN — CONTRAT NANASORE COMMISSION PLAN', 16, 21);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Réf : ${acc.contract_number || acc.id}   |   Signé le : ${signedDate}`, 16, 29);

    // Tampon
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.9);
    doc.roundedRect(pageW - 68, 42, 52, 18, 2, 2);
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('NANASORE', pageW - 42, 48, { align: 'center' });
    doc.text('COMMISSION PLAN', pageW - 42, 53, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text(`CERTIFIÉ • TAUX ${rate}%`, pageW - 42, 57.5, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DU SOUSCRIPTEUR', 16, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = [
      `Nom complet : ${acc.full_name || '—'}`,
      `Boutique / Univers : ${acc.store_name || acc.universe_id}`,
      `Email : ${acc.email || '—'}`,
      `Domaine d'activité : ${acc.business_domain || '—'}`,
      `Numéro de paiement 1 : ${acc.payment_number_1 || '—'}`,
      `Numéro de paiement 2 : ${acc.payment_number_2 || '—'}`,
      `Contact d'urgence : ${acc.emergency_contact_name || '—'} (${acc.emergency_contact_phone || '—'})`,
      `Taux contractuel : ${rate}% commission / ${100 - rate}% net marchand`,
    ];
    let y = 56;
    lines.forEach((l) => {
      doc.text(l, 16, y);
      y += 6.5;
    });

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Lu et approuvé', 16, y);
    if (acc.signature_data_url) {
      try {
        doc.addImage(acc.signature_data_url, 'PNG', 16, y + 4, 62, 26);
      } catch {}
    }

    doc.save(`Admin_Copie_Contrat_${acc.contract_number || acc.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">Contrats Plan Commission &amp; Suivi Financier</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Copies officielles des contrats signés par les marchands, numéros de paiement, contacts d'urgence et commissions encaissées.
          </p>
        </div>
        <button
          type="button"
          onClick={loadContracts}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Contrats Signés Actifs</div>
          <div className="text-2xl font-black text-white mt-1">
            {summary.activeAccounts} <span className="text-xs text-amber-400 font-bold">/ {summary.totalAccounts}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Ventes Brutes Commission</div>
          <div className="text-2xl font-black text-white mt-1">
            {Number(summary.totalSalesXof || 0).toLocaleString('fr-FR')} <span className="text-xs text-slate-400">F</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
          <div className="text-[11px] font-bold text-amber-300 uppercase">Total Commissions NaNaSore</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {Number(summary.totalCommissionXof || 0).toLocaleString('fr-FR')} <span className="text-xs text-amber-300">F</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
          <div className="text-[11px] font-bold text-emerald-300 uppercase">Revenu Net Marchands</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {Number(summary.totalNetMerchantXof || 0).toLocaleString('fr-FR')} <span className="text-xs text-emerald-300">F</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-10 flex items-center justify-center text-slate-400 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span>Chargement des contrats depuis Supabase...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
          Aucun contrat Plan Commission signé pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white">
                      {acc.full_name || acc.store_name || acc.universe_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
                      {acc.commission_rate_percent || 14}%
                    </span>
                    {acc.admin_reviewed ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                        ✓ Vérifié
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black animate-pulse">
                        Nouveau Contrat
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {acc.contract_number || acc.id} • {acc.email || 'Email non renseigné'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => downloadContractCopyPdf(acc)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{acc.business_domain || 'Domaine non précisé'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Urgence : {acc.emergency_contact_name || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Paiement 1 : {acc.payment_number_1 || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Paiement 2 : {acc.payment_number_2 || '—'}</span>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Tél. urgence : {acc.emergency_contact_phone || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  {acc.signature_data_url && (
                    <div className="bg-white rounded-lg p-1 border border-slate-700">
                      <img src={acc.signature_data_url} alt="Signature" className="h-10 w-24 object-contain" />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400">
                    <div>Brut : <strong className="text-white">{Number(acc.total_sales_xof || 0).toLocaleString('fr-FR')} F</strong></div>
                    <div>Commission : <strong className="text-amber-400">{Number(acc.total_commission_xof || 0).toLocaleString('fr-FR')} F</strong></div>
                  </div>
                </div>

                {!acc.admin_reviewed && (
                  <button
                    type="button"
                    disabled={reviewingId === acc.id}
                    onClick={() => handleMarkReviewed(acc.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{reviewingId === acc.id ? 'Validation...' : 'Valider réception'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dernières ventes soumises à commission */}
      {transactions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Percent className="w-4 h-4 text-amber-400" />
            <span>Journal Global des Commissions Prélevées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Univers / Compte</th>
                  <th className="py-2 pr-3">Réf. Commande</th>
                  <th className="py-2 pr-3 text-right">Brut</th>
                  <th className="py-2 pr-3 text-right">Commission</th>
                  <th className="py-2 text-right">Net Marchand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {transactions.slice(0, 25).map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2 pr-3 text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px]">{tx.universe_id}</td>
                    <td className="py-2 pr-3 font-mono text-white">{tx.order_ref}</td>
                    <td className="py-2 pr-3 text-right font-bold">{Number(tx.gross_amount_xof || 0).toLocaleString('fr-FR')} F</td>
                    <td className="py-2 pr-3 text-right font-black text-amber-400">
                      {Number(tx.commission_amount_xof || 0).toLocaleString('fr-FR')} F ({tx.commission_rate_percent}%)
                    </td>
                    <td className="py-2 text-right font-bold text-emerald-400">
                      {Number(tx.net_merchant_xof || 0).toLocaleString('fr-FR')} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
