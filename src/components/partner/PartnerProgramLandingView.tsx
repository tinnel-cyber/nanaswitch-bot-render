import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Gift, 
  Share2, 
  ShieldCheck, 
  DollarSign, 
  Flame, 
  Award, 
  Rocket, 
  HelpCircle, 
  ChevronRight,
  Zap,
  Check,
  Smartphone
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

export interface PartnerProgramLandingViewProps {
  onBack?: () => void;
  onRegisterPartner?: () => void;
  onOpenLogin?: () => void;
  onOpenInternalPartner?: () => void;
}

export const PartnerProgramLandingView: React.FC<PartnerProgramLandingViewProps> = ({
  onBack,
  onRegisterPartner,
  onOpenLogin,
  onOpenInternalPartner
}) => {
  // Simulateur de gains interactif (paliers officiels unifiés : 15% Starter, 18% Pro dès 5, 20% Élite dès 10)
  const [storesCount, setStoresCount] = useState<number>(15);
  const averageMonthlySubFCFA = 10000; // Plan Starter / Pro moyen
  const commissionRate = storesCount >= 10 ? 0.20 : storesCount >= 5 ? 0.18 : 0.15;
  const tierLabel = storesCount >= 10 ? 'Palier Élite (20%)' : storesCount >= 5 ? 'Palier Pro (18%)' : 'Palier Starter (15%)';
  const monthlyEarnings = Math.round(storesCount * averageMonthlySubFCFA * commissionRate);
  const annualEarnings = monthlyEarnings * 12;

  const handleRegister = () => {
    playValidationBeep();
    if (onRegisterPartner) {
      onRegisterPartner();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({ intent: 'partner' }, '', '/register?intent=partner');
      window.location.href = '/register?intent=partner';
    }
  };

  const handleBack = () => {
    playTapBeep();
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header Minimaliste */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour à l'accueil</span>
          </button>
          <Logo size="sm" accentColor="text-blue-500" />
        </div>

        <div className="flex items-center gap-3">
          {onOpenInternalPartner && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onOpenInternalPartner(); }}
              className="text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 px-3 py-2 transition cursor-pointer flex items-center gap-1.5"
            >
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Espace Partenaire</span>
            </button>
          )}

          {onOpenLogin && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onOpenLogin(); }}
              className="text-xs sm:text-sm font-bold text-slate-300 hover:text-white px-3 py-2 transition cursor-pointer"
            >
              Déjà affilié ? Connexion
            </button>
          )}

          <button
            type="button"
            onClick={handleRegister}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>Devenir Partenaire</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section d'Impact */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-radial-gradient">
        {/* Halos d'ambiance */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-wide uppercase mb-6">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Programme Partenaire & Affiliation Officiel</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Gagnez <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">15% à 20%</span> de commissions récurrentes à vie.
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Aidez les e-commerçants, boutiquiers et formateurs africains à digitaliser leur activité avec Nanasore. Encaissez des revenus récurrents chaque mois directement sur votre compte Mobile Money.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleRegister}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-blue-600/25 transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4 text-amber-300" />
              <span>Créer mon compte Partenaire (Gratuit)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenInternalPartner && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenInternalPartner();
                }}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-black text-sm shadow-xl transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4 text-emerald-400" />
                <span>Accéder à l'Espace Partenaire</span>
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              100% Gratuit & Sans engagement
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Retraits instantanés par Wave / OM dès 5 000 F
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Commissions versées chaque mois
            </span>
          </div>
        </div>
      </section>

      {/* 3. Les 3 Piliers du Programme */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Comment fonctionne le programme ?
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Un modèle simple, transparent et hautement rémunérateur pour récompenser votre réseau.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pilier 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Étape 1
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                Partagez votre lien ou QR code
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Obtenez instantanément votre code affilié unique, vos bannières prêtes à l'emploi et vos fiches de présentation à partager sur WhatsApp, TikTok, Facebook ou en direct.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Kit marketing et scripts de vente fournis
            </div>
          </div>

          {/* Pilier 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Étape 2
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                Vos filleuls s'abonnent
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Dès qu'un entrepreneur, commerçant ou formateur crée son compte via votre lien et souscrit à un abonnement (Starter, Pro ou Elite), il vous est automatiquement rattaché.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Traçabilité multi-tenant étanche et garantie
            </div>
          </div>

          {/* Pilier 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Étape 3
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                Touchez 15% à 20% chaque mois
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Chaque mois de renouvellement de vos filleuls génère votre commission. Retirez vos gains en 1-clic par Wave, Orange Money, MTN Moov ou virement dès 5 000 FCFA.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Paiements instantanés automatisés
            </div>
          </div>
        </div>
      </section>

      {/* 4. Simulateur de Gains Interactif */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Calculateur de Rentabilité
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-3">
              Combien pouvez-vous gagner ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Ajustez le curseur pour simuler vos commissions mensuelles récurrentes.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-300">
                  Boutiques ou Académies actives parrainées :
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-400">
                  {storesCount} {storesCount > 1 ? 'vendeurs' : 'vendeur'}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                value={storesCount}
                onChange={(e) => setStoresCount(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />

              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                <span>1 vendeur</span>
                <span>25 vendeurs</span>
                <span>50 vendeurs</span>
                <span>100 vendeurs</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800 text-center">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-bold block">Taux de Commission</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {Math.round(commissionRate * 100)}%
                </span>
                <span className="text-[10px] text-slate-500">
                  {tierLabel}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-blue-500/30">
                <span className="text-[11px] text-blue-400 font-bold block">Revenu Mensuel Récurrent</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {monthlyEarnings.toLocaleString('fr-FR')} <span className="text-xs text-slate-400">FCFA</span>
                </span>
                <span className="text-[10px] text-slate-500">Versé chaque mois sans limite</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-bold block">Revenu Annuel Projeté</span>
                <span className="text-2xl font-black text-indigo-400 mt-1 block">
                  {annualEarnings.toLocaleString('fr-FR')} <span className="text-xs text-slate-400">FCFA</span>
                </span>
                <span className="text-[10px] text-slate-500">Sur la base des abonnements</span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleRegister}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <span>Rejoindre le Programme Partenaire</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Partenaire */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight text-center mb-10">
          Questions Fréquentes sur l'Affiliation
        </h2>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
              L'inscription au programme partenaire est-elle payante ?
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Non, l'inscription est 100% gratuite. Vous n'avez pas besoin d'avoir une boutique active ou de souscrire à un abonnement payant pour devenir apporteur d'affaires Nanasore.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              Comment et quand mes commissions sont-elles payées ?
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Dès que votre solde atteint le seuil minimum de 5 000 FCFA, vous pouvez initier un retrait instantané par Wave, Orange Money, MTN Moov ou virement bancaire depuis votre tableau de bord affilié.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              Pendant combien de temps touche-t-on les commissions ?
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              À vie ! Tant que le commerçant ou formateur que vous avez parrainé reste abonné à Nanasore, vous continuez de toucher votre pourcentage sur chaque mensualité.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Footer de la page partenaire */}
      <footer className="py-8 px-4 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 Nanasore Technologies Inc. • Programme Partenaire & Affiliation Officiel</p>
      </footer>
    </div>
  );
};
