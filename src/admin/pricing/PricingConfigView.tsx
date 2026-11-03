import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Save, 
  Check, 
  Sliders, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard,
  Zap,
  Info
} from 'lucide-react';
import { 
  getSuperAdminSettingsLocal, 
  saveSuperAdminSettings, 
  fetchSuperAdminSettingsFromFirebase,
  SuperAdminSettings
} from '../../services/superAdminService';
import { formatCFA } from '../../utils/audio';

export const PricingConfigView: React.FC = () => {
  const [settings, setSettings] = useState<SuperAdminSettings>(() => getSuperAdminSettingsLocal() || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form State
  const [orangeNumber, setOrangeNumber] = useState('');
  const [moovNumber, setMoovNumber] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [mtnNumber, setMtnNumber] = useState('');

  // Plans prices
  const [zeroFeePercent, setZeroFeePercent] = useState(3.5);
  const [creatorMonthlyPrice, setCreatorMonthlyPrice] = useState(9900);
  const [merchantMonthlyPrice, setMerchantMonthlyPrice] = useState(19900);

  useEffect(() => {
    fetchSuperAdminSettingsFromFirebase().then((data) => {
      if (data) {
        setSettings(data);
        if (data.paymentRouting) {
          setOrangeNumber(data.paymentRouting.orangeNumber || '');
          setMoovNumber(data.paymentRouting.moovNumber || '');
          setWaveNumber(data.paymentRouting.waveNumber || '');
          setMtnNumber(data.paymentRouting.mtnNumber || '');
        }
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedRouting = {
        ...(settings.paymentRouting || {}),
        orangeNumber,
        moovNumber,
        waveNumber,
        mtnNumber
      };

      await saveSuperAdminSettings({
        paymentRouting: updatedRouting
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde tarifs & passerelle:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            <span>Tarification & Passerelle Financière Centrale</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez les grilles tarifaires marchandes (Zéro, Créateur, Commerçant) et les coordonnées de paiement Mobile Money.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Modifications Enregistrées !</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder les Paramètres'}</span>
            </>
          )}
        </button>
      </div>

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Zéro */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-3">
              Modèle à l'Usage
            </div>
            <h3 className="text-xl font-black text-white">Plan Zéro (Gratuit)</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Pour les commerces débutants. 0 FCFA/mois avec prélèvement d'une commission sur les ventes encaissées.
            </p>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Commission par Vente (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={zeroFeePercent}
                  onChange={(e) => setZeroFeePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-3 border-t border-slate-800">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Plafond : jusqu'à 30 produits en catalogue.</span>
          </div>
        </div>

        {/* Plan Créateur */}
        <div className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-6 relative flex flex-col justify-between shadow-lg shadow-indigo-500/5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Zap className="w-3 h-3" /> Populaire Formations & Vitrines
            </div>
            <h3 className="text-xl font-black text-white">Plan Créateur</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Pour les infopreneurs, créateurs de cours et boutiques en ligne avec tunnels de vente.
            </p>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Abonnement Mensuel (CFA)
              </label>
              <input
                type="number"
                step="500"
                value={creatorMonthlyPrice}
                onChange={(e) => setCreatorMonthlyPrice(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-3 border-t border-slate-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Tunnels illimités, commissions réduites à 1.5%.</span>
          </div>
        </div>

        {/* Plan Commerçant */}
        <div className="bg-slate-900/40 border border-emerald-500/30 rounded-2xl p-6 relative flex flex-col justify-between shadow-lg shadow-emerald-500/5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3 h-3" /> Recommandé Boutiques
            </div>
            <h3 className="text-xl font-black text-white">Plan Commerçant</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              POS caisse tactile illimité, multi-caissiers PIN, stock temps réel et 0% de commission.
            </p>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Abonnement Mensuel (CFA)
              </label>
              <input
                type="number"
                step="1000"
                value={merchantMonthlyPrice}
                onChange={(e) => setMerchantMonthlyPrice(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-3 border-t border-slate-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>0% commission, encaissement direct au comptoir.</span>
          </div>
        </div>
      </div>

      {/* Central Payment Routing (Mobile Money Numbers) */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-400" />
          <span>Numéros d'Encaissement Mobile Money Nanasore (Souveraineté)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Numéros officiels vers lesquels les marchands règlent leurs abonnements SaaS ou activations de crédits.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <label className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block mb-1.5">
              Orange Money
            </label>
            <input
              type="text"
              placeholder="+226 76 XX XX XX"
              value={orangeNumber}
              onChange={(e) => setOrangeNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <label className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1.5">
              Moov Money
            </label>
            <input
              type="text"
              placeholder="+226 60 XX XX XX"
              value={moovNumber}
              onChange={(e) => setMoovNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">
              Wave Digital
            </label>
            <input
              type="text"
              placeholder="+226 XX XX XX XX"
              value={waveNumber}
              onChange={(e) => setWaveNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <label className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider block mb-1.5">
              MTN MoMo
            </label>
            <input
              type="text"
              placeholder="+229 XX XX XX XX"
              value={mtnNumber}
              onChange={(e) => setMtnNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingConfigView;
