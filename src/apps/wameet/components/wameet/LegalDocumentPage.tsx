import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Share2,
  Printer,
  Calendar,
  ExternalLink,
  Scale,
  Building,
  HelpCircle
} from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export type LegalDocumentType = 'terms' | 'privacy';

export interface LegalDocumentPageProps {
  /**
   * Type de document initial à afficher ('terms' pour CGU, 'privacy' pour Confidentialité)
   */
  initialDocument?: LegalDocumentType;
  /**
   * Callback déclenché au clic sur le bouton Retour
   */
  onBack?: () => void;
  /**
   * Classe CSS additionnelle
   */
  className?: string;
}

/**
 * PROMPT 33 : Les Pages Légales (Conditions et Confidentialité)
 * Mission : UI/UX des Pages Légales "Conditions & Confidentialité" (Wameet)
 * 
 * Directives UI/UX au millimètre :
 * - Layout (LegalDocumentPage) : Page très propre et typographique optimisée mobile (bg-white h-screen overflow-y-auto).
 * - Navigation : Header simple et fixe en haut avec bouton flèche "Retour" (absolute top-0 left-0 right-0 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 z-10).
 * - Typographie : Classe prose prose-sm prose-slate mx-auto pt-16 pb-10 px-5.
 * - Titres : Foncés (text-slate-900 font-semibold), Paragraphes : Gris moyen (text-slate-600 text-xs md:text-sm).
 * - Contenu Structuré : 3 sections pour les "Conditions d'utilisation" et 3 sections pour la "Confidentialité".
 */
export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
  initialDocument = 'terms',
  onBack,
  className = ''
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocumentType>(initialDocument);

  const handleBack = () => {
    playTapBeep();
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  const handlePrint = () => {
    playTapBeep();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={`bg-white h-screen overflow-y-auto relative text-slate-900 selection:bg-blue-100 selection:text-blue-900 ${className}`}>
      {/* =====================================================================
          1. HEADER FIXE EN HAUT AVEC BOUTON FLÈCHE "RETOUR"
         ===================================================================== */}
      <header className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {activeDoc === 'terms' ? "Conditions d'utilisation" : 'Politique de confidentialité'}
            </h1>
            <p className="text-[10px] text-slate-400">Documentation Légale Wameet</p>
          </div>
        </div>

        {/* Bascule Rapide ToS / Privacy */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveDoc('terms');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeDoc === 'terms'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Conditions
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveDoc('privacy');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeDoc === 'privacy'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Confidentialité
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. CORPS TYPOGRAPHIQUE PRINCIPAL (PROSE-SM PROSE-SLATE)
         ===================================================================== */}
      <main className="prose prose-sm prose-slate mx-auto pt-16 pb-12 px-5 max-w-2xl">
        {/* Bandeau d'en-tête du document */}
        <div className="not-prose mb-6 pb-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Dernière mise à jour : 15 Octobre 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 text-[10px] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Version Officielle 2.4
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              title="Imprimer ce document"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            DOCUMENT 1 : CONDITIONS D'UTILISATION (3 SECTIONS STRUCTURÉES)
           ===================================================================== */}
        {activeDoc === 'terms' && (
          <article className="space-y-6">
            <header className="not-prose mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                <Scale className="w-3.5 h-3.5" />
                Contrat d'Accès aux Services Wameet
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Conditions Générales d'Utilisation (CGU)
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Veuillez lire attentivement ces conditions régissant votre utilisation de la plateforme Wameet,
                des Espaces VIP, des visioconférences et des services financiers Wameet.
              </p>
            </header>

            {/* Encadré synthétique des points clés */}
            <div className="not-prose p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Points Clés en Bref :
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
                <li>Vos échanges sont chiffrés de bout en bout et protégés par le secret des affaires.</li>
                <li>Les abonnements aux Salles de cours et Salons VIP sont nominatifs et strictement personnels.</li>
                <li>Les transactions financières sont régies par le droit commercial harmonisé OHADA et sécurisées par Wameet.</li>
              </ul>
            </div>

            {/* SECTION 1 */}
            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                1. Acceptation des Conditions & Définition des Services
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                En créant un compte sur Wameet ou en accédant à nos services, vous acceptez sans réserve d’être lié
                par les présentes Conditions Générales d’Utilisation. Wameet est une plateforme hybride combinant
                messagerie instantanée chiffrée, commerce phygital en direct, et Espaces VIP dédiés à l'éducation
                (Salles de Cours LMS) et au networking stratégique (Salons d'Affaires).
              </p>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Les services incluent également des passerelles de paiement opérées par Wameet, permettant
                le blocage de fonds en séquestre (Smart Escrow), les abonnements mensuels récurrents et les paiements
                instantanés en devises locales (FCFA, XOF, XAF, GHS, NGN).
              </p>
            </section>

            {/* SECTION 2 */}
            <section className="space-y-2.5 pt-4 border-t border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                2. Règles de Conduite, Espaces VIP & Séquestres Phygitaux
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                L’accès aux Salons VIP d’Affaires et Salles de Masterclass impose un respect rigoureux de la déontologie
                professionnelle et du secret des affaires. Tout utilisateur s’interdit formellement :
              </p>
              <ul className="text-slate-600 text-xs md:text-sm space-y-1 list-disc pl-5 leading-relaxed">
                <li>Le partage ou la revente d'identifiants d'accès à des tiers non abonnés.</li>
                <li>Le piratage, l'extraction massive ou la rediffusion non autorisée des vidéos et supports de cours.</li>
                <li>La soumission de faux projets ou de demandes de financement non garanties sur les Tableaux de Réseau.</li>
                <li>Toute tentative de manipulation de marché ou d'usurpation d'identité d'avocats ou d'experts.</li>
              </ul>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Toute violation entraîne la révocation immédiate de l’accès aux espaces VIP sans droit à indemnisation
                ni remboursement des sommes versées.
              </p>
            </section>

            {/* SECTION 3 */}
            <section className="space-y-2.5 pt-4 border-t border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                3. Responsabilité, Propriété Intellectuelle & Droit Applicable
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                L’ensemble des contenus, marques, algorithmes de négociation, interfaces visuelles et supports pédagogiques
                demeurent la propriété exclusive de Wameet et de ses créateurs partenaires certifiés.
              </p>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Les présentes Conditions sont soumises aux dispositions de l’Acte Uniforme de l’OHADA relatif au droit commercial
                général et aux réglementations applicables dans les pays de l’UEMOA et de la CEMAC. En cas de litige,
                les parties conviennent de privilégier une médiation amiable avant toute saisine des juridictions compétentes.
              </p>
            </section>
          </article>
        )}

        {/* =====================================================================
            DOCUMENT 2 : POLITIQUE DE CONFIDENTIALITÉ (3 SECTIONS STRUCTURÉES)
           ===================================================================== */}
        {activeDoc === 'privacy' && (
          <article className="space-y-6">
            <header className="not-prose mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
                <Lock className="w-3.5 h-3.5" />
                Protection Absolue de la Vie Privée
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Politique de Confidentialité & Données Personnelles
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Découvrez comment Wameet garantit la confidentialité stricte de vos échanges, de vos identifiants
                et de vos transactions financières.
              </p>
            </header>

            {/* Encadré de confiance */}
            <div className="not-prose p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 mb-6 space-y-2">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Notre Engagement Invariable :
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                Wameet ne commercialise jamais vos données personnelles ni vos listes de contacts.
                Vos discussions, notes vocales et appels vidéo sont chiffrés de bout en bout et inaccessibles
                à nos propres équipes techniques.
              </p>
            </div>

            {/* SECTION 1 */}
            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                1. Données Collectées & Chiffrement de Bout en Bout
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Pour assurer le fonctionnement du service, Wameet collecte uniquement les informations strictement indispensables :
              </p>
              <ul className="text-slate-600 text-xs md:text-sm space-y-1 list-disc pl-5 leading-relaxed">
                <li>Votre numéro de téléphone mobile (nécessaire à la vérification OTP sécurisée par SMS).</li>
                <li>Vos données publiques de profil (nom ou raison sociale, identifiant @pseudo, photo de profil).</li>
                <li>Les empreintes cryptographiques générées pour appairer les sessions de discussion chiffrées.</li>
              </ul>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Vos messages textuels, documents attachés et flux audio/vidéo sont protégés par un protocole de chiffrement
                de bout en bout. Seuls les terminaux de l’émetteur et du destinataire possèdent les clés de déchiffrement.
              </p>
            </section>

            {/* SECTION 2 */}
            <section className="space-y-2.5 pt-4 border-t border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                2. Finalités du Traitement & Refus de Monétisation
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Vos données sont utilisées exclusivement pour :
              </p>
              <ul className="text-slate-600 text-xs md:text-sm space-y-1 list-disc pl-5 leading-relaxed">
                <li>Permettre la mise en relation avec vos contacts ayant également installé Wameet.</li>
                <li>Valider vos inscriptions aux Salles VIP et certifier vos complétions de modules de cours.</li>
                <li>Prévenir les fraudes et sécuriser les ordres de paiement séquestre Wameet.</li>
              </ul>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Aucun profilage comportemental à visée publicitaire n'est réalisé. Wameet n'intègre aucun tracker
                de régies publicitaires tierces.
              </p>
            </section>

            {/* SECTION 3 */}
            <section className="space-y-2.5 pt-4 border-t border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                3. Conservation, Droit de Rectification & Suppression
              </h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Conformément aux législations de protection des données personnelles en vigueur en Afrique de l'Ouest
                et aux standards internationaux, vous disposez à tout moment :
              </p>
              <ul className="text-slate-600 text-xs md:text-sm space-y-1 list-disc pl-5 leading-relaxed">
                <li>D'un droit d'accès et d'export de l'ensemble de vos données de compte.</li>
                <li>D'un droit de rectification immédiate via les paramètres de votre application.</li>
                <li>D'un droit à l'effacement définitif (« droit à l'oubli »), supprimant toutes vos traces de nos registres sous 72 heures.</li>
              </ul>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                Pour toute question ou exercice de vos droits, vous pouvez contacter notre Délégué à la Protection des Données (DPO)
                à l'adresse officielle : <strong className="text-slate-800">privacy@wameet.africa</strong>.
              </p>
            </section>
          </article>
        )}

        {/* Pied de page institutionnel */}
        <footer className="not-prose mt-12 pt-6 border-t border-gray-100 text-center text-[11px] text-slate-400 space-y-1">
          <p>© 2026 Wameet Inc. • Écosystème Panafricain Sécurisé • Tous droits réservés.</p>
          <p className="text-[10px] text-slate-400">Siège Régional : Abidjan, Côte d'Ivoire & Ouagadougou, Burkina Faso.</p>
        </footer>
      </main>
    </div>
  );
};

export default LegalDocumentPage;
