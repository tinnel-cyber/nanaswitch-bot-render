const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/shell/landing/NaNaLandingPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Injecter Eye dans les imports lucide-react si non présent
if (!content.includes(' Eye,') && !content.includes(', Eye')) {
  content = content.replace(
    /import\s*\{\s*Rocket,/,
    'import {\n  Eye,\n  Rocket,'
  );
}

// 2. Remplacer le début de PricingSection pour ajouter le sélecteur à 3 onglets
const oldPricingSectionStart = `const PricingSection: React.FC<PricingSectionProps> = ({
  onOpenModal,
  onCheckout,
  config,
  onSelectFreePlan,
  onOpenPartnerProgram,
}) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const title = config?.title || "Des tarifs simples pour bâtir sans limites.";
  const subtitle = config?.subtitle || "Démarrez petit et évoluez à votre rythme. Changez de plan à tout moment en un clic.";
  const zeroBanner = config?.zeroCommissionBanner || DEFAULT_LANDING_PAGE_CONFIG.pricingSection.zeroCommissionBanner;`;

const newPricingSectionStart = `type PricingTab = 'SUBSCRIPTION' | 'CREATOR' | 'PAY_AS_YOU_GO';

const PricingSection: React.FC<PricingSectionProps> = ({
  onOpenModal,
  onCheckout,
  config,
  onSelectFreePlan,
  onOpenPartnerProgram,
}) => {
  const [pricingTab, setPricingTab] = useState<PricingTab>('SUBSCRIPTION');
  const [isAnnual, setIsAnnual] = useState(false);
  const title = config?.title || "Des tarifs simples, transparents et sans surprise.";
  const subtitle = config?.subtitle || "Choisissez votre formule selon votre modèle : abonnement 0% commission, création gratuite à la performance, ou services à l'acte.";
  const zeroBanner = config?.zeroCommissionBanner || DEFAULT_LANDING_PAGE_CONFIG.pricingSection.zeroCommissionBanner;`;

content = content.replace(oldPricingSectionStart, newPricingSectionStart);

// 3. Remplacer le header de la section pricing pour insérer les 3 onglets interactifs
const oldHeaderSnippet = `        {/* Titre & Sélecteur Mensuel / Annuel */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6">
            {subtitle}
          </p>

          {/* Toggle Mensuel / Annuel */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { playTapBeep(); setIsAnnual(false); }}
              className={\`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer \${
                !isAnnual ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }\`}
            >
              Facturation Mensuelle
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setIsAnnual(true); }}
              className={\`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 \${
                isAnnual ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }\`}
            >
              <span>Facturation Annuelle</span>
              <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>`;

const newHeaderSnippet = `        {/* Titre & Sélecteur à 3 Piliers de Tarification */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>

          {/* SÉLECTEUR DE MODÈLE TARIFAIRE (3 ONGLETS INTERACTIFS) */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-2 rounded-3xl bg-slate-100 border border-slate-300/80 shadow-inner mb-6">
            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('SUBSCRIPTION'); }}
              className={\`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 \${
                pricingTab === 'SUBSCRIPTION'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-102 ring-2 ring-blue-400'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }\`}
            >
              <Store className="w-4 h-4" />
              <span>Abonnements Fixes (0% Commission)</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('CREATOR'); }}
              className={\`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 \${
                pricingTab === 'CREATOR'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 scale-102 ring-2 ring-purple-400'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }\`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Créateurs & Formateurs (0F Création • 14% Vente)</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('PAY_AS_YOU_GO'); }}
              className={\`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 \${
                pricingTab === 'PAY_AS_YOU_GO'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-lg shadow-amber-500/30 scale-102 ring-2 ring-amber-300'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }\`}
            >
              <Zap className="w-4 h-4" />
              <span>Services à l'Acte (Pay-As-You-Go)</span>
            </button>
          </div>

          {/* Toggle Mensuel / Annuel (visible uniquement sous l'onglet Abonnements) */}
          {pricingTab === 'SUBSCRIPTION' && (
            <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300 mt-2 animate-fadeIn">
              <button
                type="button"
                onClick={() => { playTapBeep(); setIsAnnual(false); }}
                className={\`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer \${
                  !isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }\`}
              >
                Facturation Mensuelle
              </button>
              <button
                type="button"
                onClick={() => { playTapBeep(); setIsAnnual(true); }}
                className={\`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 \${
                  isAnnual ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                }\`}
              >
                <span>Facturation Annuelle</span>
                <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">
                  -20%
                </span>
              </button>
            </div>
          )}
        </div>`;

content = content.replace(oldHeaderSnippet, newHeaderSnippet);

// 4. Conditionner l'affichage de la grille des 4 abonnements et insérer les vues Créateur & Pay-As-You-Go
const oldGridWrapper = `        {/* Indication visuelle de balayage sur Mobile & Tablette */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 text-xs text-slate-500 mb-4 font-medium">
          <span>← Glissez pour comparer les 4 formules →</span>
        </div>

        {/* Grille Responsive : Scroll Snap horizontal fluide sur Mobile/Tablette & Grille 4 Colonnes sur Desktop */}
        <div className="flex lg:grid overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory lg:snap-none gap-4 lg:gap-3 xl:gap-5 pb-6 lg:pb-0 px-4 sm:px-6 lg:px-0 -mx-4 sm:-mx-6 lg:mx-auto max-w-7xl lg:grid-cols-4 items-stretch scroll-smooth no-scrollbar">`;

const newGridWrapper = `        {/* =======================================================================
            VOLET 1 : GRILLE DES ABONNEMENTS FIXES (0% COMMISSION)
           ======================================================================= */}
        {pricingTab === 'SUBSCRIPTION' && (
          <>
            {/* Indication visuelle de balayage sur Mobile & Tablette */}
            <div className="flex lg:hidden items-center justify-center gap-1.5 text-xs text-slate-500 mb-4 font-medium">
              <span>← Glissez pour comparer les 4 formules →</span>
            </div>

            {/* Grille Responsive : Scroll Snap horizontal fluide sur Mobile/Tablette & Grille 4 Colonnes sur Desktop */}
            <div className="flex lg:grid overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory lg:snap-none gap-4 lg:gap-3 xl:gap-5 pb-6 lg:pb-0 px-4 sm:px-6 lg:px-0 -mx-4 sm:-mx-6 lg:mx-auto max-w-7xl lg:grid-cols-4 items-stretch scroll-smooth no-scrollbar">`;

content = content.replace(oldGridWrapper, newGridWrapper);

// Fermer le volet SUBSCRIPTION après la matrice comparative et ajouter les volets CREATOR & PAY_AS_YOU_GO
const oldMatrixClose = `        {/* Matrice de Comparaison Détaillée Déployable */}
        <div className="max-w-7xl mx-auto mt-6">
          <PricingComparisonMatrix
            selectedPlanId="pro"
            onSelectPlan={(planId) => {
              const matchedPlan = plans.find(p => p.id === planId);
              const price = planId === 'free' ? 0 : (isAnnual ? matchedPlan?.annualPriceFCFA : matchedPlan?.monthlyPriceFCFA) || 0;
              handleCheckout(planId, price);
            }}
          />
        </div>`;

const newMatrixAndTabs = `        {/* Matrice de Comparaison Détaillée Déployable */}
        <div className="max-w-7xl mx-auto mt-6">
          <PricingComparisonMatrix
            selectedPlanId="pro"
            onSelectPlan={(planId) => {
              const matchedPlan = plans.find(p => p.id === planId);
              const price = planId === 'free' ? 0 : (isAnnual ? matchedPlan?.annualPriceFCFA : matchedPlan?.monthlyPriceFCFA) || 0;
              handleCheckout(planId, price);
            }}
          />
        </div>
          </>
        )}

        {/* =======================================================================
            VOLET 2 : FORMULE CRÉATEUR & FORMATEUR (100% GRATUIT • 14% COMMISSION VENTE)
           ======================================================================= */}
        {pricingTab === 'CREATOR' && (
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 sm:p-10 text-white shadow-2xl animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-8 border-b border-white/10">
              <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-black uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4" />
                  <span>Modèle 100% Gagnant - Gagnant pour Formateurs & Créateurs</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Créez tout gratuitement. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
                    Ne payez que si vous vendez.
                  </span>
                </h3>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  Zéro abonnement mensuel. Aucun risque financier. Hébergez vos cours vidéo, fiches pédagogiques et formations sans débourser un centime. Nous prélevons uniquement une commission de 14% sur les ventes effectives.
                </p>
              </div>

              <div className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-6 text-center w-full sm:w-auto">
                <div className="text-xs uppercase font-extrabold text-purple-300 tracking-wider">Abonnement Mensuel Fixe</div>
                <div className="text-4xl sm:text-5xl font-black text-emerald-400 my-1">0 F CFA</div>
                <div className="text-xs text-slate-400 font-medium">Pour toujours • Sans carte bancaire</div>
                <div className="mt-4 pt-4 border-t border-white/10 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Commission : 14% par vente réussie</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-8">
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">Hébergement Vidéo & PDF Illimité</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Importez vos leçons vidéo, tutoriels, supports de cours et fichiers sans limitation d\\'espace disque.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">Séquestre Escrow Automatique</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sécurisation intégrale des paiements clients jusqu\\'à la livraison pédagogique avec déblocage sous 48h.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">Encaissement Mobile Money Multi-Pays</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Recevez les paiements de vos étudiants par Wave, Orange Money, Moov, MTN et carte bancaire en Afrique et diaspora.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                💡 <em>Astuce rentabilité : Dès que vous dépassez 110 000 F CFA de ventes par mois, basculez en 1 clic sur le Plan Pro (15 000 F) pour passer à 0% de commission !</em>
              </div>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  if (typeof window !== 'undefined') {
                    window.location.href = '/register?intent=instructor&plan=creator';
                  }
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-sm shadow-xl shadow-purple-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Commencer à Créer Gratuitement (0 F)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =======================================================================
            VOLET 3 : SERVICES EXPRESS À L'USAGE (PAY-AS-YOU-GO • SANS ABONNEMENT)
           ======================================================================= */}
        {pricingTab === 'PAY_AS_YOU_GO' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
            {/* Header du volet Pay-As-You-Go */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-300 text-xs font-black uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Paiement à l\\'Acte • Zéro Engagement • Zéro Abonnement</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Venez, utilisez votre service en 1 clic, et repartez satisfait.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Vous avez un besoin ponctuel ? Aucun abonnement mensuel requis. Payez uniquement l\\'acte consommé directement par Mobile Money ou via votre portefeuille.
              </p>
            </div>

            {/* Service Vedette : VOIR DIRECT & ACHAT IMMÉDIAT (100 F CFA) */}
            <div className="bg-gradient-to-r from-[#0d1f4d] via-[#102a6b] to-[#0d1f4d] border-2 border-cyan-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-300/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-lg">
                  <Eye className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-400 text-slate-950">
                      ⚡ NOUVEAU & EN VEDETTE
                    </span>
                    <span className="text-xs font-bold text-cyan-300">Option Live Instantanée</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    Option « Voir Direct » &amp; Achat Immédiat
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
                    Activez la vue vidéo directe sur votre article : votre client clique sur le produit, le visualise en direct vidéo interactif et peut l\\'acheter instantanément en 1 clic !
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center sm:items-end justify-center gap-2 w-full md:w-auto text-center md:text-right">
                <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono">
                  100 F CFA
                </div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Par produit activé
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    if (typeof window !== 'undefined') window.location.href = '/register?intent=vendor';
                  }}
                  className="mt-1 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition shadow-md cursor-pointer"
                >
                  Activer sur mes Produits →
                </button>
              </div>
            </div>

            {/* Grille des autres services à l'acte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. CV Pro */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      📄
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">500 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Générateur CV Pro &amp; Lettre IA</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Créez un CV A4 Haute Définition (300 DPI) au design suisse avec lettre de motivation générée par IA.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par document exporté</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.location.href = '/dashboard/cv';
                    }}
                    className="font-black text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Créer mon CV →
                  </button>
                </div>
              </div>

              {/* 2. DocuSign */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      ✍️
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">300 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Signature Électronique Certifiée</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Faites signer électroniquement un devis, bon de commande ou contrat avec valeur juridique et certificat d\\'audit.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par contrat signé</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.location.href = '/dashboard/apps/docusign';
                    }}
                    className="font-black text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    Signer un contrat →
                  </button>
                </div>
              </div>

              {/* 3. SMS Pro */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      📱
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">25 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Passerelle SMS Pro (Brevo / Twilio)</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Envoi instantané de SMS d\\'authentification OTP, confirmations de commande et notifications d\\'expédition.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par SMS délivré</span>
                  <span className="font-bold text-sky-600">Recharge libre</span>
                </div>
              </div>

              {/* 4. WhatsApp Business */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      💬
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">35 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Notifications WhatsApp Business</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Transmission de tickets thermiques interactifs, alertes et liens de commande en direct sur WhatsApp.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par message interactif</span>
                  <span className="font-bold text-emerald-600">Automatisé</span>
                </div>
              </div>

              {/* 5. IA Médias */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      🎨
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">150 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Studio Vidéo &amp; Visuel IA</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Générez une image publicitaire 4K ou une animation vidéo courte pour vos campagnes TikTok et Instagram.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par visuel 4K généré</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.location.href = '/dashboard/apps/nanagenerator';
                    }}
                    className="font-black text-purple-600 hover:text-purple-700 cursor-pointer"
                  >
                    Ouvrir Studio IA →
                  </button>
                </div>
              </div>

              {/* 6. Vente Flash */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      🔥
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">1 000 F CFA</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Session Vente Flash en Direct</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Activez un compte à rebours immersif sur votre boutique en ligne pour créer l\\'urgence et déstocker rapidement.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Par session activée</span>
                  <span className="font-bold text-rose-600">Booster de vente</span>
                </div>
              </div>
            </div>
          </div>
        )}`;

content = content.replace(oldMatrixClose, newMatrixAndTabs);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✓ NaNaLandingPage.tsx mis à jour avec les 3 onglets et le service Voir Direct à 100 F !');
