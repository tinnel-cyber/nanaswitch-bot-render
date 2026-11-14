/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * nanawallet — Écran de Paiement Instantané à l'Usage (Étape 4)
 * Design Épuré, Moderne & Chaleureux de Classe Mondiale.
 * Palette Officielle : Fond blanc cassé (#F9F8F6), Accents Bleu Royal (#1E3A8A / #2563EB).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  FileText, 
  Lock, 
  ArrowLeft,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Zap,
  Package,
  Layers,
  Check
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime, formatCFA } from '../../utils/audio';
import { supabase } from '../../lib/supabase';

export interface CheckoutServiceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  cost: number;
}

const DEFAULT_SERVICES: CheckoutServiceItem[] = [
  {
    id: 'srv_cv_pro',
    title: 'Génération CV Professionnel',
    category: "Service à l'usage",
    description: 'Accès instantané et illimité au modèle IA et export PDF certifié',
    cost: 300
  },
  {
    id: 'srv_extra_product',
    title: 'Activation Produit Supplémentaire',
    category: 'Store Studio POS',
    description: 'Ajout permanent d’un nouveau produit dans votre catalogue marchand',
    cost: 1000
  },
  {
    id: 'srv_sms_otp',
    title: 'Pack 100 Notifications SMS OTP',
    category: 'Communication Cloud',
    description: 'Envoi sécurisé de SMS de confirmation clients multi-pays',
    cost: 2500
  },
  {
    id: 'srv_docusign',
    title: 'Signature Électronique Certifiée',
    category: 'Juridique & Contrats',
    description: 'Scellement cryptographique et preuve légale horodatée',
    cost: 300
  }
];

export interface NanaWalletCheckoutProps {
  initialServiceId?: string;
  onBack?: () => void;
  onSuccess?: (service: CheckoutServiceItem, newBalance: number) => void;
  onNavigateRecharge?: () => void;
  className?: string;
}

export default function NanaWalletCheckout({
  initialServiceId = 'srv_cv_pro',
  onBack,
  onSuccess,
  onNavigateRecharge,
  className = ''
}: NanaWalletCheckoutProps) {
  // Service sélectionné
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [txReference, setTxReference] = useState<string>('');

  // Récupération du solde réel disponible
  const [currentBalance, setCurrentBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nana_user_wallet_balance');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return 1250;
  });

  const activeService = useMemo(() => {
    return DEFAULT_SERVICES.find(s => s.id === selectedServiceId) || DEFAULT_SERVICES[0];
  }, [selectedServiceId]);

  const serviceCost = activeService.cost;
  const isInsufficient = currentBalance < serviceCost;
  const newBalance = Math.max(0, currentBalance - serviceCost);

  // Exécution du paiement instantané
  const handlePayment = useCallback(() => {
    if (isInsufficient) {
      playTapBeep();
      if (onNavigateRecharge) onNavigateRecharge();
      return;
    }

    playTapBeep();
    setLoading(true);

    setTimeout(async () => {
      const updatedBalance = currentBalance - serviceCost;
      setCurrentBalance(updatedBalance);
      const generatedRef = `TXN-${Math.floor(1000 + Math.random() * 9000)}-NAN`;
      setTxReference(generatedRef);

      // 1. Sauvegarde locale immédiate
      try {
        localStorage.setItem('nana_user_wallet_balance', String(updatedBalance));
        window.dispatchEvent(new CustomEvent('nana_profile_synced', {
          detail: { profile: { wallet_balance: updatedBalance } }
        }));
      } catch {}

      // 2. Débit Supabase si utilisateur connecté
      (async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const uid = authData?.user?.id;
          if (uid) {
            await supabase.from('app_registry').upsert({
              key: `wallet_${uid}`,
              name: `wallet_${uid}`,
              module_key: 'user_wallet',
              config_json: {
                balance: updatedBalance,
                updatedAt: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('[CHECKOUT] Débit Supabase ignoré :', e);
        }
      })();

      setLoading(false);
      setSuccess(true);
      playValidationBeep();
    }, 1200); // Validation ultra-rapide en 1.2s
  }, [isInsufficient, currentBalance, serviceCost, onNavigateRecharge]);

  const handleFinish = useCallback(() => {
    playTapBeep();
    if (onSuccess) {
      onSuccess(activeService, newBalance);
    } else if (onBack) {
      onBack();
    }
  }, [onSuccess, onBack, activeService, newBalance]);

  return (
    <div className={`min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans antialiased flex justify-center items-center p-0 sm:p-4 select-none ${className}`}>
      {/* Conteneur simulant l'écran d'un smartphone moderne */}
      <div className="w-full max-w-md bg-[#F9F8F6] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[844px] border-0 sm:border-8 sm:border-[#1E3A8A] relative">
        
        {/* ===================================================================== */}
        {/* EN-TÊTE SUPÉRIEURE (HEADER) */}
        {/* ===================================================================== */}
        <div className="px-6 pt-6 sm:pt-8 pb-4 flex items-center justify-between bg-[#F9F8F6] border-b border-gray-100/60 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onBack) onBack();
              }}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-[#1E3A8A] cursor-pointer hover:bg-blue-50 transition active:scale-95"
              title="Retour"
            >
              {success ? <Check size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A]">
                {success ? 'Paiement Confirmé' : 'Paiement Sécurisé'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Débit direct sans intermédiaire</p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-100 text-[#1E3A8A] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-200 shadow-2xs">
            nanawallet
          </span>
        </div>

        {/* ===================================================================== */}
        {/* CONTENU PRINCIPAL (DÉFILANT) */}
        {/* ===================================================================== */}
        <div className="px-6 flex-1 overflow-y-auto space-y-4 pb-6 pt-2 flex flex-col justify-between">
          
          {!success ? (
            <>
              {/* Sélecteur de service (si l'utilisateur veut tester d'autres prestations) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Service sélectionné :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_SERVICES.slice(0, 2).map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedServiceId(srv.id);
                      }}
                      className={`p-2.5 rounded-2xl text-left border transition cursor-pointer active:scale-98 ${
                        selectedServiceId === srv.id
                          ? 'border-[#1E3A8A] bg-blue-50/60 ring-1 ring-[#1E3A8A] font-bold text-[#1E3A8A]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{srv.title}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{srv.cost} FCFA</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Carte récapitulative du service acheté */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                  <FileText size={22} />
                </div>
                <div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    {activeService.category}
                  </span>
                  <h3 className="text-base font-extrabold text-[#1A1A1A] mt-2">
                    {activeService.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {activeService.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center px-2">
                  <span className="text-xs font-medium text-gray-500">Prix du service :</span>
                  <span className="text-xl font-black text-[#1E3A8A] font-mono">
                    {serviceCost.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Détails du solde avant/après (Impact sur le Wallet) */}
              <div className="bg-blue-50/60 p-4 rounded-3xl border border-blue-200/80 space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-black text-[#1E3A8A] uppercase tracking-wider">
                    Impact sur votre Wallet
                  </p>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-bold text-gray-600 border border-blue-200">
                    Débit direct
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 font-medium">Solde disponible :</span>
                  <span className="font-bold text-[#1A1A1A] font-mono">
                    {currentBalance.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 font-medium">Montant débité :</span>
                  <span className="font-bold text-rose-600 font-mono">
                    -{serviceCost.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="border-t border-blue-200 pt-2 flex justify-between items-baseline text-xs">
                  <span className="font-extrabold text-gray-800">Nouveau solde estimé :</span>
                  <span className="font-black text-[#1E3A8A] font-mono text-sm">
                    {newBalance.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Alerte si solde insuffisant */}
              {isInsufficient && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <span>Solde insuffisant pour cet achat.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (onNavigateRecharge) onNavigateRecharge();
                    }}
                    className="px-3 py-1 bg-[#1E3A8A] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    Recharger
                  </button>
                </div>
              )}

              {/* Note de sécurité */}
              <div className="flex items-center gap-2 px-2 text-gray-400 text-[11px]">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Débit instantané et transparent sans frais de passerelle externe.</span>
              </div>
            </>
          ) : (
            /* ================================================================= */
            /* ÉCRAN DE SUCCÈS (ANIMATION APRÈS VALIDATION) */
            /* ================================================================= */
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 my-auto animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/10 animate-bounce">
                <CheckCircle2 size={44} />
              </div>
              
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Succès Immédiat
                </span>
                <h3 className="text-xl font-black text-[#1A1A1A] mt-2">
                  Paiement validé avec succès !
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  <strong className="text-slate-900">{formatCFA(serviceCost)}</strong> ont été débités de votre nanawallet pour <strong className="text-slate-900">{activeService.title}</strong>.
                </p>
              </div>

              {/* Reçu certifié */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 w-full text-left space-y-2 shadow-xs mt-3">
                <div className="flex justify-between text-xs pb-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Service activé :</span>
                  <span className="font-bold text-[#1A1A1A]">{activeService.title}</span>
                </div>
                <div className="flex justify-between text-xs pb-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Nouveau solde :</span>
                  <span className="font-bold text-[#1E3A8A] font-mono">{newBalance.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">N° Référence :</span>
                  <span className="font-mono text-[11px] font-bold text-gray-700">{txReference}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold pt-1">
                <Sparkles size={13} />
                <span>Service immédiatement débloqué sur votre espace Nanasore</span>
              </div>
            </div>
          )}

        </div>

        {/* ===================================================================== */}
        {/* BOUTON D'ACTION PRINCIPAL FIXE EN BAS */}
        {/* ===================================================================== */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shadow-xs">
          {!success ? (
            <button
              type="button"
              onClick={handlePayment}
              disabled={loading || isInsufficient}
              className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-4 rounded-2xl font-bold text-xs shadow-lg shadow-blue-950/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validation du paiement en cours...</span>
                </>
              ) : isInsufficient ? (
                <>
                  <PlusCircle size={16} />
                  <span>Recharger le solde pour payer ({serviceCost} F)</span>
                </>
              ) : (
                <>
                  <span>Payer instantanément ({serviceCost} FCFA)</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-4 rounded-2xl font-bold text-xs shadow-lg shadow-blue-950/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Retour au tableau de bord</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
