import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  Phone,
  Sparkles,
} from 'lucide-react';
import {
  AffiliateCommissionRecord,
  listMerchantAffiliateCommissions,
  markAffiliateCommissionPaid,
} from '../../../../services/liveAffiliateService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveAffiliatePayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string;
  storeName: string;
}

export const LiveAffiliatePayoutModal: React.FC<LiveAffiliatePayoutModalProps> = ({
  isOpen,
  onClose,
  merchantId,
  storeName,
}) => {
  const [commissions, setCommissions] = useState<AffiliateCommissionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const list = await listMerchantAffiliateCommissions(merchantId);
    setCommissions(list);
    setLoading(false);
  }, [merchantId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const pendingTotal = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidTotal = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const handlePayAffiliate = async (rec: AffiliateCommissionRecord) => {
    playValidationBeep();
    await markAffiliateCommissionPaid(rec.id);
    setCommissions((prev) =>
      prev.map((c) =>
        c.id === rec.id ? { ...c, status: 'paid', paidAt: new Date().toISOString() } : c
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header Bleu Royal */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#1E40AF] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                Affiliés &amp; Commissions Live — {storeName}
              </h3>
              <p className="text-[11px] text-blue-100">
                Suivez les ventes générées par vos affiliés et validez leurs paiements Mobile Money
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                loadData();
              }}
              className="p-2 rounded-xl hover:bg-white/15 text-white cursor-pointer"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/15 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Synthèse KPI */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-[#F5F7FB] border-b border-slate-200 shrink-0">
          <div className="bg-white rounded-2xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Ventes affiliées
            </span>
            <span className="text-lg font-black text-slate-900">{commissions.length}</span>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">
              À verser (En attente)
            </span>
            <span className="text-lg font-black text-amber-600">{formatCFA(pendingTotal)}</span>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">
              Déjà payé
            </span>
            <span className="text-lg font-black text-emerald-600">{formatCFA(paidTotal)}</span>
          </div>
        </div>

        {/* Liste des commissions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {commissions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F7FB] border border-slate-200 flex items-center justify-center text-[#1D4ED8] mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">
                Aucune commission affiliée enregistrée pour le moment
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Dès qu&apos;un spectateur partage son lien de parrainage (via « Partager ») et qu&apos;un ami achète un produit avec affiliation activée, sa commission apparaît ici automatiquement.
              </p>
            </div>
          ) : (
            commissions.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-[#F5F7FB] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-[#1D4ED8] text-white text-[11px] font-black">
                      {rec.referrerCode}
                    </span>
                    {rec.referrerPhone && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                        <Phone className="w-3 h-3 text-[#1D4ED8]" />
                        {rec.referrerPhone}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.status === 'paid' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Payé
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> En attente
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {rec.productName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Vente : {formatCFA(rec.orderAmount)} • Commission {rec.commissionPercent}% ={' '}
                    <strong className="text-[#1D4ED8]">{formatCFA(rec.commissionAmount)}</strong>
                    {rec.buyerName ? ` • Client : ${rec.buyerName}` : ''}
                  </p>
                </div>

                {rec.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handlePayAffiliate(rec)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Marquer payé ({formatCFA(rec.commissionAmount)})</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAffiliatePayoutModal;
