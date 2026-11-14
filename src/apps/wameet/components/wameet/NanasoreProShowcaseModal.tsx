import React from 'react';
import {
  X,
  Sparkles,
  ShoppingBag,
  Zap,
  Printer,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Boxes,
  Users,
  CheckCircle2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface NanasoreProShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchNanasore?: () => void;
}

/**
 * Page Promotionnelle Dédiée Nanasore (Prompt 43 - Section 2)
 * Présente de manière prestigieuse et isolée la valeur ajoutée de Nanasore
 * pour les créateurs et commerçants Wameet souhaitant passer Pro.
 */
export const NanasoreProShowcaseModal: React.FC<NanasoreProShowcaseModalProps> = ({
  isOpen,
  onClose,
  onLaunchNanasore
}) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: Zap,
      color: 'text-amber-500 bg-amber-50 border-amber-200',
      title: 'Caisse Magasin Ultra-Rapide (POS)',
      desc: 'Encaissement comptoir en moins de 3 secondes, scanner code-barres Bluetooth et mode 100% hors-ligne (zéro coupure internet).'
    },
    {
      icon: Boxes,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      title: 'Synchronisation des Stocks Omnicanal',
      desc: 'Vos articles Wameet Shop et votre stock en boutique physique sont reliés en temps réel. Zéro risque de double-vente.'
    },
    {
      icon: Smartphone,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      title: 'Paiements Mobile Money & Wameet Pay',
      desc: 'Orange Money, Wave, Moov Money et MTN acceptés automatiquement avec commissions affiliés et transferts instantanés.'
    },
    {
      icon: Printer,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      title: 'Tickets Thermiques 58/80mm',
      desc: 'Impression instantanée de reçus professionnels avec logo de votre boutique, QR code de vérification et coordonnées.'
    },
    {
      icon: Users,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      title: 'Gestion des Dettes & Ardoises Clients',
      desc: 'Carnet de crédit digitalisé avec relances automatiques par SMS/Wameet et suivi strict de la trésorerie.'
    },
    {
      icon: ShieldCheck,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      title: 'Séquestre Escrow & Sécurité Bancaire',
      desc: 'Chaque commande en ligne est protégée par notre tiers de confiance Wameet jusqu’à la confirmation de livraison.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header avec gradient prestige Nanasore */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border border-white/20 z-10"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Écosystème Pro Nanasore</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Passez de simple créateur Wameet à commerçant d'élite avec Nanasore 🚀
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
              Connectez votre vitrine Wameet à un véritable système de caisse pour boutique physique. Encaissez par Mobile Money, scannez vos codes-barres et gérez vos stocks en direct.
            </p>
          </div>
        </div>

        {/* Corps défilant : Les 6 piliers Pro */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Métriques clés */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-lg sm:text-xl font-black text-blue-900">+45%</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Ventes constatées</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-lg sm:text-xl font-black text-emerald-700">3 sec</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Par encaissement</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-lg sm:text-xl font-black text-indigo-900">0 rupture</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Stock synchronisé</div>
            </div>
          </div>

          {/* Grille des fonctionnalités */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider px-1">
              Tout ce que Nanasore apporte à votre activité :
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition flex items-start gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${f.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {f.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Témoignage Commerçant */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-start gap-3">
            <span className="text-2xl shrink-0">💬</span>
            <div className="text-xs leading-relaxed text-slate-700 font-medium">
              <strong className="text-blue-900 font-bold block mb-0.5">
                « Depuis que nous avons couplé nos Reels Wameet avec la caisse Nanasore : »
              </strong>
              Nos clients commandent sur Wameet et viennent récupérer leurs colis au magasin. La caisse déduit le stock automatiquement et le reçu thermique sort en 1 clic !
            </div>
          </div>
        </div>

        {/* Footer avec gros bouton d'action */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            <span>Passage Pro activable instantanément sans engagement.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Plus tard
            </button>

            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                if (onLaunchNanasore) onLaunchNanasore();
                else if (typeof window !== 'undefined') window.location.href = '/dashboard';
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🚀 Activer mon Espace Nanasore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NanasoreProShowcaseModal;
