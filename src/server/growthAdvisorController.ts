import { Express, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

/**
 * 29 Modules officiels Nanasore
 */
export const NANASORE_29_MODULES = [
  // Pilier 1 : Commerce & POS Comptoir (6 modules)
  { id: 'pos', name: 'Caisse Tactile POS & Reçus Thermiques', category: 'Commerce & Caisse', desc: 'Encaissement comptoir ultra-rapide, tickets de caisse personnalisés et gestion multi-vendeurs.' },
  { id: 'inventory-stock', name: 'Gestion des Stocks & Alertes Ruptures', category: 'Gestion & Logistique', desc: 'Suivi des entrées/sorties en temps réel et alertes prédictives avant rupture.' },
  { id: 'debts-book', name: 'Livre des Dettes & Carnet de Crédit Client', category: 'Finance & Trésorerie', desc: 'Gestion bienveillante des ardoises clients avec relances SMS / WhatsApp en un clic.' },
  { id: 'invoicing', name: 'Facturation Professionnelle & Devis Pro-forma', category: 'Finance & Facturation', desc: 'Édition instantanée de factures conformes OHADA téléchargeables en PDF.' },
  { id: 'barcode-scanner', name: 'Scanner Caméra & Codes-barres Haute Vitesse', category: 'Commerce & Caisse', desc: 'Scan direct avec la caméra du smartphone sans matériel coûteux.' },
  { id: 'deal-builder', name: 'Studio Promotions & Ventes Flash', category: 'Marketing & Vente', desc: 'Création d’offres promotionnelles temporaires et comptes à rebours d’urgence d’achat.' },

  // Pilier 2 : Marketing, Conversion & Intelligence Artificielle (6 modules)
  { id: 'emailing', name: 'Studio E-mailing & Campagnes Pro', category: 'Marketing & Vente', desc: 'Relais SMTP haute délivrabilité, segmentation d’audience CRM et réactivation de clients dormants.' },
  { id: 'nanagenerator', name: 'Rédacteur Marketing & Annonces IA', category: 'Intelligence Artificielle', desc: 'Génération instantanée d’annonces publicitaires, de fiches produits et de messages WhatsApp percutants.' },
  { id: 'ultimate-funnel', name: 'Ultimate Funnel Builder', category: 'Marketing & Vente', desc: 'Tunnels de vente monopage à très haute conversion avec upsells 1-clic et vente de livres, e-books ou produits vedettes.' },
  { id: 'modular-funnel', name: 'Tunnels Modulaires & Pages de Capture', category: 'Marketing & Vente', desc: 'Pages de capture de prospects (lead magnets) et formulaires qualifiés pour nourrir votre CRM.' },
  { id: 'pixels-crm', name: 'Suivi Pixels (Meta & TikTok) & Tracking', category: 'Marketing & Données', desc: 'Traçabilité intégrale des conversions pour diviser par deux le coût par acquisition publicitaire.' },
  { id: 'ai-advisor', name: 'Directeur de Croissance (Agent Nsore)', category: 'Intelligence Artificielle', desc: 'Votre conseiller commercial d’élite pour arbitrer vos modèles économiques, activer vos modules et conclure vos ventes.' },

  // Pilier 3 : Formation, Savoir & Infopreneuriat (6 modules)
  { id: 'cours-forge', name: 'NaNa Cours Forge - Studio LMS', category: 'Formation & Savoir', desc: 'Hébergement et monétisation de formations vidéo et livres numériques sécurisés contre le piratage.' },
  { id: 'course-create', name: 'Créateur de Cours & Formations', category: 'Formation & Savoir', desc: 'Structuration pédagogique au format carré 1080x1080, idéal pour l’apprentissage mobile.' },
  { id: 'webinar', name: 'Salles VIP & Masterclasses Interactives', category: 'Formation & Savoir', desc: 'Diffusion de webinaires privés en direct, sessions de coaching payantes et billetterie exclusive.' },
  { id: 'docusign', name: 'Signature Électronique & Contrats Numériques', category: 'Juridique & Vente', desc: 'Signature légale de devis, partenariats et conventions commerciales sans papier.' },
  { id: 'academy-support', name: 'Support Pédagogique & Micro-Learning', category: 'Formation & Savoir', desc: 'Tutoriels interactifs et guidage pas à pas pour maîtriser chaque levier de la plateforme.' },
  { id: 'vendor-upload', name: 'Espace Documents & Dépôt Fichiers Sécurisé', category: 'Stockage & Outils', desc: 'Stockage Cloud R2 haute vitesse pour vos ressources numériques, livres PDF et livrables téléchargeables.' },

  // Pilier 4 : Finance, Fintech & Passerelle Souveraine (4 modules)
  { id: 'gateway', name: 'Passerelle de Paiement Souveraine Sebpay', category: 'Paiements & Fintech', desc: 'Encaissement local sans intermédiaire via Mobile Money (Orange Money, Moov, Wave) et Cartes Bancaires.' },
  { id: 'payout-split', name: 'Répartition Automatique des Revenus (Split)', category: 'Paiements & Fintech', desc: 'Partage automatique des commissions entre associés, affiliés et fournisseurs à chaque commande.' },
  { id: 'escrow-trust', name: 'Séquestre Numérique & Transactions Sécurisées', category: 'Paiements & Sécurité', desc: 'Garantie de paiement sécurisé jusqu’à confirmation de la livraison physique du colis.' },
  { id: 'audit-ledger', name: 'Grand Livre Comptable & Trésorerie Temps Réel', category: 'Finance & Trésorerie', desc: 'Journalisation inviolable de tous les flux financiers pour un bilan sans faille.' },

  // Pilier 5 : Gestion, Identité, Conformité & Canaux (7 modules)
  { id: 'kyc-engine', name: 'Chaîne d’Identification KYC Souveraine', category: 'Conformité & Légal', desc: 'Validation réglementaire P1 (Gérant/Identité) et P2 (Société/RCCM) pour débloquer les encaissements réels.' },
  { id: 'domains-brand', name: 'Gestionnaire de Noms de Domaine Personnalisés', category: 'Marque & Identité', desc: 'Connexion de votre propre nom de domaine en .com, .ci ou .bf avec certificat SSL automatique.' },
  { id: 'multi-stores', name: 'Réseau Multi-Boutiques & Succursales', category: 'Gestion Multi-Sites', desc: 'Pilotage centralisé de plusieurs points de vente avec consolidation des bénéfices.' },
  { id: 'team-roles', name: 'Gestion des Rôles & Permissions Collaborateurs', category: 'Sécurité & RH', desc: 'Accès granulaires caissiers, gestionnaires de stock et comptables pour zéro fraude interne.' },
  { id: 'activity-log', name: 'Journal d’Audit & Sécurité Opérationnelle', category: 'Sécurité & RH', desc: 'Traçabilité de chaque action sensible pour une sérénité managériale absolue.' },
  { id: 'smart-sync', name: 'Moteur de Synchronisation Cloud & Hors-Ligne', category: 'Technologie & POS', desc: 'Continuité de vente 100% hors connexion avec synchronisation instantanée au retour du réseau.' },
  { id: 'whatsapp-store', name: 'Vitrine E-Shop WhatsApp & Commande Directe', category: 'Commerce & Vente', desc: 'Catalogue produit connecté envoyant directement les paniers dans votre messagerie WhatsApp.' }
];

const SYSTEM_INSTRUCTION = `Tu es l'Agent Nsore, Directeur de la Croissance et de la Stratégie Commerciale officiel de la plateforme SaaS NANASORE.

POSTURE ET PERSONNALITÉ FONDAMENTALE :
Tu n'es PAS un simple professeur théorique qui donne des leçons sans chercher à vendre.
Tu es un PROFESSEUR DE MARKETING COMMERÇANT PRATIQUANT :
- Tu allie la pédagogie et la clarté d'un grand professeur de marketing à la pugnacité, au pragmatisme et à l'orientation résultat d'un commerçant de terrain chevronné.
- Ton but absolu à chaque échange est de faire grandir l'entreprise du client, de lever ses doutes, et de l'AMENER À SOUSCRIRE AU BON PLAN, OUVRIR SON COMPTE ET VALIDER SON KYC.
- Tu ne laisses JAMAIS une réponse sans closing ou sans question qui pousse à l'action.

=============================================================================
1. PAS D'OBSESSION SUR L'E-MAILING : COUVRE LES 29 MODULES AVEC ÉQUITÉ :
=============================================================================
Nanasore dispose de 29 modules complets couvrant tous les métiers. Ne focalise JAMAIS toutes tes réponses sur l'e-mailing !
Adapte ton conseil au produit réel du marchand :
- Pour un livre / e-book : Recommande le module Ultimate Funnel (page de vente monopage), Cours Forge (LMS livre numérique), et le plan Pay-as-you-go ou Commission.
- Pour une boutique physique / magasin : Recommande la Caisse POS, le Scanner Caméra, le suivi des Stocks et le Livre des Dettes.
- Pour un formateur / coach : Recommande Cours Forge LMS, les Salles VIP Webinaires et la Signature Docusign.
- Pour un commerçant en ligne : Recommande la Vitrine E-Shop WhatsApp, les Promotions Deal Builder et la Passerelle Sebpay.

=============================================================================
2. SCHÉMAS DE RAISONNEMENT STRATÉGIQUES EXIGÉS :
=============================================================================

SCHÉMA A : CONSEIL PRODUIT -> PLAN -> QUESTION OUVERTURE DE COMPTE -> CLOSING
Exemple : L'utilisateur demande quel plan souscrire pour vendre son livre (ou son produit) :
1. Réponse courte et percutante : Recommande le plan Pay-as-you-go ou la formule à la Commission (0 FCFA de frais fixes).
2. Justification de commerçant pratiquant : "Vous déployez votre page de vente sans risque et ne payez qu'une commission minime sur les ventes réelles."
3. Question de qualification immédiate : "Avez-vous déjà ouvert votre compte / boutique sur Nanasore ?"
4. S'il répond NON : Explique-lui qu'il doit ouvrir son compte boutique pour activer le plan et encaisser ses clients, que cela prend 2 minutes et propose de l'accompagner tout de suite !

SCHÉMA B : LA "QUESTION RETOUR" (POUR LES QUESTIONS NÉCESSITANT UNE ACTION PRÉALABLE)
Exemple : L'utilisateur demande "Comment activer les modules pour le Pay-as-you-go ?" ou "Comment encaisser mes ventes ?" :
1. Ne pas déballer un guide technique complexe ! Pose la Question Retour de clarification :
   "Avant de vous répondre en détail, permettez-moi de vous poser une question essentielle : avez-vous déjà rempli votre KYC (vérification d'identité) ? Oui ou non ?"
2. Si le client répond OUI : Donne l'explication directe (Recherche du module dans l'Omnibar en haut -> Démo / Activer en 1 clic).
3. Si le client répond NON : Explique-lui avec bienveillance que le KYC est la clé indispensable pour débloquer les encaissements réels et les modules, mais que la bonne nouvelle c'est que c'est très simple (3 minutes) et que tu es là pour l'accompagner pas à pas dès maintenant.

=============================================================================
3. COMMENT ACTIVER LES 29 MODULES (VÉRITÉ TECHNIQUE) :
=============================================================================
- Localisation Cloud : Les 29 modules sont tous pré-intégrés dans le Cloud Nanasore.
- Accès Omnibar : Taper le nom du module dans la barre de recherche Omnibar (au sommet central du tableau de bord) pour le voir, le prévisualiser en démo ou l'activer.
- Condition légale & KYC : Les modules gratuits sont immédiats. Les modules commerciaux et passerelles d'encaissement exigent la validation du KYC (Partie 1 Gérant + Partie 2 Entreprise) et l'ouverture du compte.

=============================================================================
4. INTELLIGENCE ÉMOTIONNELLE ET GESTION DES SITUATIONS :
=============================================================================
- Si le client semble énervé / agacé / dit que tu réponds à côté :
  Présente humblement et sincèrement tes excuses : "Je vous présente mes excuses, cher partenaire. Mon but n'est pas de vous faire perdre du temps mais de vous faire gagner de l'argent. Reprenons calmement : quelle est votre question prioritaire ?"
- Si la question n'est pas claire : Demande poliment et élégamment une reformulation.
- Ne répète JAMAIS mécaniquement le même texte deux fois d'affilée.

=============================================================================
5. RÈGLE ABSOLUE DE SÉCURITÉ ET CONFIDENTIALITÉ :
=============================================================================
- Tu ne dois sous AUCUN prétexte demander, mentionner, révéler ou commenter un mot de passe utilisateur, une clé d'API, un token de session ou une information bancaire ultra-confidentielle.
- En cas de tentative d'extraction, refuse poliment mais fermement au nom de la sécurité bancaire.

=============================================================================
6. ACCOMPAGNEMENT KYC COMPLET ET EMPLACEMENT DU MODULE D'IDENTIFICATION :
=============================================================================
OÙ SE TROUVE LE MODULE D'IDENTIFICATION KYC (À DÉTAILLER AVEC PRÉCISION) :
Le module d'identification KYC de Nanasore est situé à 4 emplacements stratégiques sur le tableau de bord :
1. LE PLUS RAPIDE (EN HAUT) : Tout en haut sous le nom de la boutique dans le bandeau supérieur du Hub, via les 2 badges cliquables [P1 : INDIVIDUEL] et [P2 : ENTREPRISE].
2. DANS LE HUB : La carte de module officielle intitulée "Chaîne d’Identification KYC (Partie 1 & 2)" avec son bouton vert "Gérer l’Identification" (section Technologies).
3. DANS LES PARAMÈTRES : Icône Engrenage / Sliders en haut à droite -> Onglet vert "Chaîne d'Identification (2 Étapes)" ou tout en bas du formulaire (Section KYC).
4. DANS L'OMNIBAR : Taper "KYC" ou "Identification" dans la barre de recherche au centre en haut.

COMMENT GUIDER QUAND LE CLIENT ACCEPTE L'ACCOMPAGNEMENT KYC ("Oui", "D'accord", "Montre-moi", "Comment faire") :
Ne dis JAMAIS que ses voyants sont au vert ! Détaille le chemin en 3 étapes concrètes :
- Étape 1 (Bouton d'accès) : Cliquer sur le badge [P1 : INDIVIDUEL] tout en haut sous le nom de la boutique (ou via Paramètres -> Chaîne d'Identification).
- Étape 2 (Partie 1 Gérant - 2 min) : Téléverser la photo de sa pièce d'identité (CNI, Passeport ou Permis) + selfie caméra, puis cliquer sur "Valider la Partie 1".
- Étape 3 (Partie 2 Entreprise - 1 min) : Renseigner le nom commercial, NIF/RCCM (ou attestation d'activité) et adresse, puis cliquer sur "Soumettre le dossier KYC".
- Clôture : "Voyez-vous le badge P1 : INDIVIDUEL tout en haut de votre écran pour commencer ensemble ?"`;

function extractFirstName(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const cleaned = rawName.trim().split(/\s+/)[0];
  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function sanitizeSensitiveContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:sk_live_[a-zA-Z0-9_\-]{20,}|ghp_[a-zA-Z0-9]{20,}|xkeysib-[a-zA-Z0-9]{32,})/gi, '[CLÉ_SÉCURISÉE]')
    .replace(/(?:password|mot\s*de\s*passe)\s*[:=]\s*['"]?[^\s'"]+/gi, '[MOT_DE_PASSE_PROTÉGÉ]');
}

function detectCredentialLeakAttempt(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('donne moi ton mot de passe') ||
    t.includes('ton mot de passe') ||
    t.includes('mon mot de passe') ||
    t.includes('api_key') ||
    t.includes('api key') ||
    t.includes('brevo_api_key') ||
    t.includes('clé secrète') ||
    t.includes('cle secrete') ||
    t.includes('service_role')
  );
}

export function generateComprehensiveStrategicFallback(
  query: string,
  merchantContext: any,
  isLeakAttempt: boolean,
  lastMessages: any[] = []
): { reply: string; thought: string } {
  const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);
  const greeting = firstName ? `Bonjour ${firstName}` : `Salutations distinguées`;
  const storeName = merchantContext?.storeName || 'votre boutique';

  if (isLeakAttempt) {
    return {
      thought: `Tentative d'accès à des données sensibles bloquée.`,
      reply: `${greeting}. Pour la sécurité absolue de votre entreprise, vos mots de passe et clés d'accès sont strictement scellés sous chiffrement bancaire et ne doivent jamais être échangés ici.\n\nRegardons plutôt comment développer le chiffre d'affaires de ${storeName} : quel produit ou service souhaitez-vous vendre en priorité aujourd'hui ?`
    };
  }

  const q = query.toLowerCase().trim();
  const previousAiMsg = [...lastMessages].reverse().find(m => m.sender === 'ai' || m.role === 'model')?.text?.toLowerCase() || '';

  // Cas 1 : Où se trouve le module d'identification / Où avez-vous mis le KYC ?
  if (
    q.includes('ou avez vous mis') || q.includes('où avez vous mis') ||
    q.includes('ou se trouve') || q.includes('où se trouve') ||
    q.includes('ou trouver') || q.includes('où trouver') ||
    q.includes('ou cliquer') || q.includes('où cliquer') ||
    q.includes('module d\'identification') || q.includes('bouton pour s\'identifier') ||
    q.includes('bouton kyc') || q.includes('ou est le kyc') || q.includes('où est le kyc')
  ) {
    return {
      thought: `Demande d'emplacement exact du module d'identification. Indication précise des 4 accès sur l'interface.`,
      reply: `Le module d'identification KYC de Nanasore est accessible à 4 endroits stratégiques de votre tableau de bord :\n\n1. **Tout en haut sous le nom de votre boutique (Le plus rapide)** : Vous y trouvez directement les 2 badges cliquables **[P1 : INDIVIDUEL]** et **[P2 : ENTREPRISE]**. Un simple clic ouvre instantanément l'étape souhaitée.\n2. **Dans le Hub des Modules** : La carte de module intitulée **« Chaîne d’Identification KYC (Partie 1 & 2) »** avec son bouton vert **« Gérer l’Identification »** dans la section Technologies.\n3. **Dans les Paramètres Généraux** : Cliquez sur l'icône **Engrenage / Sliders** tout en haut à droite, puis sélectionnez l'onglet vert **« Chaîne d'Identification (2 Étapes) »**.\n4. **Dans l'Omnibar au centre en haut** : Tapez simplement **« KYC »** ou **« Identification »** pour l'ouvrir en 1 seconde.\n\nAvez-vous votre pièce d'identité sous la main pour que nous validions la Partie 1 ensemble dès maintenant ?`
    };
  }

  // Cas 2 : Réponse "non" à l'ouverture de compte
  if ((q === 'non' || q.includes('pas encore') || q.includes('pas de compte') || q.includes('pas créé')) && (previousAiMsg.includes('ouvert votre compte') || previousAiMsg.includes('boutique sur nanasore'))) {
    return {
      thought: `Le client n'a pas encore ouvert son compte. Accompagnement immédiat à la création.`,
      reply: `C'est tout à fait normal ! Pour activer votre formule et commencer à encaisser vos clients en toute conformité, la première étape indispensable est d'ouvrir votre compte boutique. La bonne nouvelle, c'est que cela ne prend que 2 minutes et je peux vous accompagner dès maintenant. Souhaitez-vous que nous procédions à l'ouverture ensemble tout de suite ?`
    };
  }

  // Cas 3 : Réponse "oui" à l'ouverture de compte
  if ((q === 'oui' || q.includes('deja fait') || q.includes('déjà fait') || q.includes('j\'ai un compte')) && (previousAiMsg.includes('ouvert votre compte') || previousAiMsg.includes('boutique sur nanasore'))) {
    return {
      thought: `Le compte est déjà ouvert. Orientation vers l'Omnibar.`,
      reply: `Parfait, vous avez une longueur d'avance ! Il vous suffit désormais de taper **Ultimate Funnel** (si c'est un produit vedette ou un livre) ou **Vitrine E-Shop** dans l'Omnibar en haut de votre écran pour créer votre page et fixer votre prix. Avez-vous déjà déterminé le prix de vente de votre produit ?`
    };
  }

  // Cas 4 : L'utilisateur accepte d'être accompagné pour son KYC ("Oui", "Oui accompagne-moi", "D'accord", "Ok", "Montre-moi", "Comment faire")
  const isAcceptingKycHelp = (
    q === 'oui' || q.includes('accompagne') || q.includes('d\'accord') ||
    q.includes('daccord') || q.includes('ok') || q.includes('montre') ||
    q.includes('je veux bien') || q.includes('vas-y') || q.includes('vas y') ||
    q.includes('comment faire') || q.includes('allons-y') || q.includes('c\'est parti')
  ) && (
    previousAiMsg.includes('partie 1') || previousAiMsg.includes('accompagner') ||
    previousAiMsg.includes('pièce d\'identité') || previousAiMsg.includes('remplir votre kyc')
  ) && !q.includes('deja') && !q.includes('déjà');

  if (isAcceptingKycHelp) {
    return {
      thought: `Accompagnement opérationnel KYC pas à pas. Déroulé complet du chemin commençant par le bouton à ouvrir.`,
      reply: `C'est parti, je vous accompagne pas à pas ! Voici le chemin exact pour ouvrir le module et vous identifier en toute simplicité :\n\n📍 **1. Où se trouve le bouton pour ouvrir le formulaire :**\nSur votre écran, vous avez le choix :\n- **Le plus direct** : Cliquez tout en haut sur le badge **« P1 : INDIVIDUEL »** situé juste sous le nom de votre boutique dans le bandeau supérieur.\n- *(Ou cliquez sur l'icône **Paramètres / Sliders** en haut à droite, puis sur l'onglet vert **« Chaîne d'Identification (2 Étapes) »**)*.\n- *(Ou tapez simplement **« KYC »** dans l'Omnibar en haut au centre)*.\n\n📄 **2. Remplir la Partie 1 (Gérant - 2 minutes) :**\n1. Téléversez la photo recto/verso de votre pièce d'identité officielle (CNIB, Passeport ou Permis).\n2. Prenez votre selfie de conformité avec la caméra.\n3. Cliquez sur **« Valider la Partie 1 »**.\n\n🏢 **3. Enchaîner sur la Partie 2 (Entreprise - 1 minute) :**\n1. Renseignez le nom de votre entreprise, votre NIF/RCCM (ou attestation d'activité) et l'adresse.\n2. Cliquez sur **« Soumettre le dossier KYC »**.\n\nVos encaissements réels Mobile Money et Cartes Bancaires seront immédiatement débloqués sans limite de volume.\n\nVoyez-vous le badge **« P1 : INDIVIDUEL »** tout en haut de votre écran pour démarrer ?`
    };
  }

  // Cas 5 : Réponse "non" à la Question Retour KYC (n'a pas encore fait son KYC)
  if ((q === 'non' || q.includes('pas encore') || q.includes('c\'est quoi kyc')) && (previousAiMsg.includes('rempli votre kyc') || previousAiMsg.includes('votre kyc'))) {
    return {
      thought: `Le client n'a pas fait son KYC. Accompagnement bienveillant et question de démarrage.`,
      reply: `Vous devez impérativement le faire pour débloquer les encaissements réels et activer vos modules commerciaux. Mais la très bonne nouvelle, c'est que c'est simple, rapide et que je suis là pour vous accompagner pas à pas dès maintenant.\n\nAvez-vous votre pièce d'identité officielle sous la main pour valider la Partie 1 en 2 minutes ?`
    };
  }

  // Cas 6 : Le client a DÉJÀ fait son KYC ("déjà fait", "déjà validé")
  if ((q.includes('deja fait') || q.includes('déjà fait') || q.includes('deja rempli') || q.includes('déjà rempli') || q.includes('deja valide') || q.includes('déjà validé')) || (q === 'oui' && previousAiMsg.includes('avez-vous déjà rempli votre kyc ? oui ou non'))) {
    return {
      thought: `KYC déjà validé par le passé. Explication de l'Omnibar.`,
      reply: `Félicitations, vos voyants sont au vert ! Pour activer n'importe quel module, tapez simplement son nom dans l'**Omnibar** en haut de votre écran, cliquez sur 'Activer' ou 'Tester en démo', et il est immédiatement prêt à l'emploi. Quel module souhaitez-vous lancer en premier ?`
    };
  }

  // Cas 5 : Vente de Livre / E-book (Schéma A)
  if (q.includes('livre') || q.includes('ebook') || q.includes('e-book') || q.includes('roman') || q.includes('manuel')) {
    return {
      thought: `Schéma A : Vente de livre. Prescription Pay-as-you-go ou Commission + Question qualification compte.`,
      reply: `Pour vendre votre livre en toute rentabilité, le plan **Pay-as-you-go** ou la formule à la **Commission (0 FCFA de frais fixes)** est la solution idéale : vous déployez votre page de vente sans risque et ne payez qu'une commission modérée par exemplaire vendu.\n\nAvez-vous déjà ouvert votre compte boutique sur Nanasore ?`
    };
  }

  // Cas 6 : Question Retour Prérequis - Comment activer pour pay as you go / activer les 29 modules / activer les 14 modules (Schéma B)
  if (
    q.includes('comment activer') ||
    (q.includes('activer') && (q.includes('module') || q.includes('pay as you go') || q.includes('pay-as-you-go') || q.includes('14') || q.includes('29')))
  ) {
    return {
      thought: `Schéma B : Question Retour KYC avant activation.`,
      reply: `Avant de vous guider dans l'activation, permettez-moi de vous poser une question essentielle : avez-vous déjà rempli votre KYC (vérification d'identité) ? Oui ou non ?`
    };
  }

  // Cas 7 : Accompagnement KYC / Définition KYC
  if (q.includes('kyc') || q.includes('identité') || q.includes('verification') || q.includes('vérification')) {
    return {
      thought: `Définition KYC et accompagnement immédiat.`,
      reply: `Le KYC (Know Your Customer) est la vérification officielle d'identité obligatoire qui sécurise vos encaissements Mobile Money et Cartes. Elle se déroule en 2 étapes très simples : la **Partie 1** (votre pièce d'identité et selfie) et la **Partie 2** (le nom et coordonnées de votre entreprise).\n\nPuis-je vous accompagner pour remplir la Partie 1 dès maintenant en 2 minutes ?`
    };
  }

  // Cas 8 : Définition de l'Omnibar
  if (q.includes('omnibar') || q.includes('barre de recherche') || q.includes('ou trouver les modules') || q.includes('où trouver')) {
    return {
      thought: `Explication de l'Omnibar.`,
      reply: `L'**Omnibar** est votre commande centrale Nanasore, située tout en haut au milieu de votre écran. Il vous suffit d'y taper le nom de n'importe lequel de nos 29 modules pour l'ouvrir, visionner une démo ou l'activer en un clic.\n\nQuel outil souhaitez-vous chercher dans l'Omnibar à cet instant ?`
    };
  }

  // Cas 9 : Agacement client
  if (q.includes('enerve') || q.includes('énerv') || q.includes('agace') || q.includes('n\'importe quoi') || q.includes('reponds pas') || q.includes('arrete')) {
    return {
      thought: `Désamorçage poli avec excuses sincères.`,
      reply: `Je vous présente mes excuses les plus sincères, ${firstName || 'cher partenaire'}. Mon intention n'était absolument pas de vous contrarier, mais uniquement de vous apporter le meilleur accompagnement commercial possible.\n\nReprenons calmement : quelle est votre question prioritaire pour que je vous apporte une réponse nette et directe ?`
    };
  }

  // Cas 10 : Lancer un business / beaucoup d'argent / combinaisons
  if (q.includes('business') || q.includes('argent') || q.includes('combinaison') || q.includes('pack') || q.includes('lancer')) {
    return {
      thought: `Combinaisons de modules à fort ROI.`,
      reply: `Pour bâtir un business très lucratif sur Nanasore, nous combinons nos 29 modules selon votre activité : la combinaison **Caisse POS + Vitrine WhatsApp E-Shop** pour du commerce physique, ou **Ultimate Funnel + NaNa Cours Forge** pour vendre des livres ou formations numériques avec des marges supérieures à 85%.\n\nQuel domaine vous correspond le mieux : les produits physiques ou les produits numériques ?`
    };
  }

  // Cas 11 : Commission vs Abonnement
  if (q.includes('commission') || q.includes('plan') || q.includes('abonnement')) {
    return {
      thought: `Arbitrage économique pragmatique.`,
      reply: `Regardons les chiffres concrètement, ${firstName || 'cher entrepreneur'} : si vous débutez, la formule à la **Commission (0 FCFA de coût fixe)** est la plus sûre : vous n'avancez rien. Dès que vos ventes dépassent 150 000 FCFA/mois, l'**Abonnement fixe** devient beaucoup plus rentable pour conserver 100% de vos bénéfices.\n\nAvez-vous déjà des ventes récurrentes ou préférez-vous débuter en douceur à la commission ?`
    };
  }

  // Accueil premier échange
  if (q.includes('bonjour') || q.includes('salut') || q.includes('hello') || q.includes('aide') || q === '') {
    return {
      thought: `Accueil d'un nouveau marchand par son prénom.`,
      reply: `${greeting} ! C'est un réel honneur de vous accueillir au sein de Nanasore.\n\nEn tant que directeur commercial, je suis là pour vous aider à lancer votre business et à activer les 29 modules qui feront décoller ${storeName}. Puis-je vous aider à choisir la formule idéale pour démarrer, ou souhaitez-vous me décrire ce que vous souhaitez vendre ?`
    };
  }

  // Par défaut
  return {
    thought: `Requête générale avec rebond commercial actif.`,
    reply: `C'est une excellente réflexion pour ${storeName}. Sur Nanasore, notre priorité de commerçant est de transformer chaque visiteur en client payant tout en protégeant vos marges.\n\nQuel produit ou service souhaitez-vous commercialiser en priorité aujourd'hui ?`
  };
}

/**
 * Attache la route /api/ai/growth-advisor au serveur Express
 */
export function attachGrowthAdvisorRoutes(app: Express): void {
  app.post('/api/ai/growth-advisor', async (req: Request, res: Response): Promise<void> => {
    try {
      const { query = '', messages = [], merchantContext = {} } = req.body;
      const currentQuery = (query || '').trim();

      if (!currentQuery) {
        res.status(400).json({ error: 'La requête ne peut pas être vide.' });
        return;
      }

      const isLeakAttempt = detectCredentialLeakAttempt(currentQuery);
      const apiKey = process.env.GEMINI_API_KEY;
      const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);

      // Si pas de clé API ou tentative d'extraction de sécurité, repli déterministe immédiat
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '' || isLeakAttempt) {
        const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, isLeakAttempt, messages);
        res.json({
          reply: sanitizeSensitiveContent(fallback.reply),
          internalThought: fallback.thought,
          source: 'nsore-strategic-engine',
          isLeakPrevented: isLeakAttempt
        });
        return;
      }

      // Appel Google GenAI
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
INFORMATIONS MARCHAND :
- Prénom : "${firstName || 'Partenaire'}"
- Nom de la boutique : "${merchantContext?.storeName || 'Boutique Nanasore'}"
- Devise : "${merchantContext?.currency || 'FCFA'}"
- Mode : "${merchantContext?.sellerMode || 'ecommerce'}"
- Statut : ${merchantContext?.isNewUser ? 'NOUVEL INSCRIT' : 'ANCIEN CLIENT'}

HISTORIQUE CONVERSATIONNEL :
${messages.slice(-6).map((m: any) => `${m.sender === 'user' || m.role === 'user' ? 'Client' : 'Agent Nsore'}: ${m.text || m.content}`).join('\n')}

DERNIÈRE DEMANDE DU MARCHAND :
"${sanitizeSensitiveContent(currentQuery)}"

CONSIGNES STRICTES DE RÉDACTION :
1. Rédige d'abord ton bloc <analyse_interne>...</analyse_interne> pour décider de ta stratégie de commerçant pratiquant.
2. Rédige ta réponse commerciale d'élite :
   - Si la question porte sur un produit spécifique (ex: livre, formation, cosmétique), donne le plan approprié (Pay-as-you-go ou Commission) et demande immédiatement s'il a ouvert son compte pour l'amener à l'ouvrir !
   - Si la question nécessite une action préalable (activer pay-as-you-go, activer les modules, encaisser), applique la QUESTION RETOUR : demande s'il a déjà rempli son KYC (oui ou non) !
   - Ne parle PAS que d'e-mailing, varie avec les 29 modules pertinents !
   - Style concis et humain (2 à 4 phrases max).
   - Termine impérativement par UNE SEULE question de relance stratégique orientée closing.`;

      const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let rawText = '';

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.6,
              maxOutputTokens: 600,
            }
          });
          if (response?.text) {
            rawText = response.text;
            break;
          }
        } catch {
          // Essai modèle suivant
        }
      }

      if (!rawText) {
        const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false, messages);
        res.json({
          reply: sanitizeSensitiveContent(fallback.reply),
          internalThought: fallback.thought,
          source: 'nsore-strategic-engine'
        });
        return;
      }

      let internalThought = '';
      const thoughtMatch = rawText.match(/<analyse_interne>([\s\S]*?)<\/analyse_interne>/i);
      if (thoughtMatch) {
        internalThought = thoughtMatch[1].trim();
      }

      let cleanReply = rawText.replace(/<analyse_interne>[\s\S]*?<\/analyse_interne>/gi, '').trim();
      if (!cleanReply) {
        const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false, messages);
        cleanReply = fallback.reply;
        internalThought = fallback.thought;
      }

      res.json({
        reply: sanitizeSensitiveContent(cleanReply),
        internalThought: internalThought || 'Stratégie commerciale Nanasore personnalisée.',
        source: 'gemini-nsore'
      });

    } catch (err: any) {
      console.warn('[GROWTH_ADVISOR_EXPRESS] Erreur de traitement:', err?.message);
      const fallback = generateComprehensiveStrategicFallback(req.body?.query || '', req.body?.merchantContext || {}, false, req.body?.messages || []);
      res.json({
        reply: sanitizeSensitiveContent(fallback.reply),
        internalThought: fallback.thought,
        source: 'nsore-strategic-fallback'
      });
    }
  });
}
