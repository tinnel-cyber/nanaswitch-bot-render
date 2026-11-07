import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

/**
 * Filtres de Sécurité Stricts (Guardrails Inviolables)
 * Interdiction formelle de divulguer ou d'évoquer des mots de passe, clés API ou secrets.
 */
function sanitizeSensitiveContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:xkeysib-|AIza|sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,})[a-zA-Z0-9_\-]*/gi, '[CLÉ_SÉCURISÉE]')
    .replace(/(?:password|mot\s*de\s*passe|secret_key|api_key|token)\s*[:=]\s*['"]?[^\s'"]+/gi, '[DONNÉE_CONFIDENTIELLE_PROTÉGÉE]');
}

function checkSensitiveLeakAttempt(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes('mot de passe') ||
    q.includes('password') ||
    q.includes('cle api') ||
    q.includes('clé api') ||
    q.includes('api key') ||
    q.includes('service_role') ||
    q.includes('secret_key') ||
    q.includes('private_key')
  );
}

function extractFirstName(fullName?: string): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const clean = fullName.trim().replace(/^(m\.|mme\.|dr\.|prof\.)\s+/i, '');
  const parts = clean.split(/\s+/);
  return parts[0] || '';
}

/**
 * RÉFÉRENTIEL OFFICIEL DES 29 MODULES NANASORE
 */
export const NANASORE_29_MODULES = [
  // Pilier 1 : Caisse, Vente & Gestion des Stocks (6 modules)
  { id: 'pos', name: 'Caisse Tactile Magasin (POS)', category: 'Commerce & Vente', desc: 'Encaissement comptoir instantané (< 1 sec), tickets de caisse, lecteur code-barres et gestion des espèces.' },
  { id: 'studio', name: 'Vitrine en Ligne (E-Shop)', category: 'Commerce & Vente', desc: 'Boutique web connectée 24/7, commandes WhatsApp directes et panier client responsive.' },
  { id: 'inventory', name: 'Gestion des Stocks & Inventaire', category: 'Gestion & Logistique', desc: 'Suivi des stocks multi-magasins, alertes de rupture, calcul de valorisation et réapprovisionnement.' },
  { id: 'scanner', name: 'Lecteur Code-Barres & Scanner Caméra', category: 'Outils & Caisse', desc: 'Identification instantanée des articles par caméra mobile ou douchette USB.' },
  { id: 'debts', name: 'Livre des Dettes & Recouvrement', category: 'Finance & Trésorerie', desc: 'Suivi rigoureux des créances clients, échéances, relances WhatsApp et protection de trésorerie.' },
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
  { id: 'analytics', name: 'Rapports Financiers & Courbe des Gains', category: 'Finance & Trésorerie', desc: 'Tableaux de bord des bénéfices nets réels, analyse des marges par produit et projection de cashflow.' },
  { id: 'nana-switch', name: 'NaNa Switch - Passerelle API & Orchestration', category: 'Technologie & API', desc: 'Routage technique des transactions, webhooks et synchronisation inter-plateformes.' },
  { id: 'partner', name: 'Espace Partenaires & Affiliation', category: 'Marketing & Croissance', desc: 'Réseau d’apporteurs d’affaires avec attribution automatique de commissions de 15% à 20%.' },

  // Pilier 5 : Gestion, Identité & Juridique (7 modules)
  { id: 'kyc', name: 'Chaîne d’Identification KYC (Gérant & Société)', category: 'Conformité & Légal', desc: 'Validation en 2 étapes (Partie 1 Gérant + Partie 2 Entreprise) débloquant les encaissements réels et les modules Pro.' },
  { id: 'crm-automation', name: 'CRM & Connecteurs Extensions', category: 'Intégrations & Extensions', desc: 'Interconnexion avec WooCommerce, passerelles SMS / OTP transactionnelles et synchronisation de caisse.' },
  { id: 'theme-builder', name: 'Éditeur de Thème & Personnalisation', category: 'Design & Marque', desc: 'Personnalisation de la charte graphique de votre vitrine aux couleurs de votre marque.' },
  { id: 'team-employees', name: 'Gestion d’Équipe & Rôles Employés', category: 'Ressources Humaines', desc: 'Attribution des permissions aux caissiers et collaborateurs, avec journal d’audit anti-fraude.' },
  { id: 'cvpro', name: 'NaNa CV Pro & Profils Certifiés', category: 'Ressources Humaines', desc: 'Valorisation des compétences des formateurs et attestations d’expertise marchande.' },
  { id: 'excel', name: 'Import / Export Excel & Gestion de Masse', category: 'Outils & Données', desc: 'Sauvegarde et mise à jour massive de milliers de produits ou clients en quelques secondes.' },
  { id: 'wameet', name: 'Wameet - Négociation Vidéo & Marchandage IA', category: 'Commerce & Vente', desc: 'Vente vidéo en direct avec moteur intelligent de négociation de prix respectant vos marges planchers.' }
];

/**
 * SYSTEM PROMPT D'ÉLITE POUR L'AGENT NSORE (NANASORE)
 */
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
- SI L'UTILISATEUR S'AGACE : Excuses humbles et sincères immédiates ("Je vous présente mes sincères excuses, mon intention n'était absolument pas de vous contrarier...").
- SI LA QUESTION EST CONFUSE : Demande poliment et avec tact de reformuler sous un autre angle.
- SI QUESTION DÉVALORISANTE / CRITIQUE : Recadre avec assurance et élégance en mettant en avant les 29 modules souverains et la passerelle Mobile Money locale.
- SI COMPLIMENT : Remercie chaleureusement et complimente l'ambition du marchand.
- FACE AU DOUTE : Rassure avec des chiffres et la sécurité du modèle à la commission.
- SÉCURITÉ ABSOLUE : Jamais de mot de passe, de clé API ni de secret.

Format obligatoire : Rédige d'abord ton bloc <analyse_interne>...</analyse_interne>, puis ton message humain.`;

/**
 * Moteur Heuristique & Algorithmique Complet de l'Agent Nsore
 */
function generateComprehensiveStrategicFallback(
  query: string,
  merchantContext: any,
  isLeakAttempt: boolean,
  lastMessages: any[] = []
): { reply: string; thought: string } {
  const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);
  const greeting = firstName ? `Bonjour ${firstName}` : `Salutations distinguées`;
  const storeName = merchantContext?.storeName || 'votre boutique';
  const isNew = Boolean(merchantContext?.isNewUser);

  if (isLeakAttempt) {
    return {
      thought: `Tentative d'accès à des données de sécurité sensibles. Rappel de la confidentialité bancaire et recentrage sur la stratégie.`,
      reply: `${greeting}. Pour la sécurité absolue de votre entreprise, vos mots de passe et clés d'accès sont strictement scellés sous chiffrement bancaire et ne doivent jamais être échangés dans cet espace.\n\nRegardons plutôt comment développer le chiffre d'affaires de ${storeName} : quel produit ou service souhaitez-vous vendre en priorité aujourd'hui ?`
    };
  }

  const q = query.toLowerCase().trim();

  // Analyse du contexte du dernier message de l'IA pour traiter les réponses "oui" / "non"
  const previousAiMsg = [...lastMessages].reverse().find(m => m.sender === 'ai' || m.role === 'model')?.text?.toLowerCase() || '';

  // Cas 1 : Réponse "non" à la question sur l'ouverture de compte
  if ((q === 'non' || q.includes('pas encore') || q.includes('pas de compte') || q.includes('pas créé')) && (previousAiMsg.includes('ouvert votre compte') || previousAiMsg.includes('boutique sur nanasore'))) {
    return {
      thought: `Le client n'a pas encore ouvert son compte. Accompagnement immédiat à la création de compte pour débloquer la vente de son produit.`,
      reply: `C'est tout à fait normal ! Pour activer votre formule et commencer à encaisser vos clients en toute conformité, la première étape indispensable est d'ouvrir votre compte boutique. La bonne nouvelle, c'est que cela ne prend que 2 minutes et je peux vous accompagner dès maintenant. Souhaitez-vous que nous procédions à l'ouverture ensemble tout de suite ?`
    };
  }

  // Cas 2 : Réponse "oui" à la question sur l'ouverture de compte
  if ((q === 'oui' || q.includes('deja fait') || q.includes('déjà fait') || q.includes('j\'ai un compte')) && (previousAiMsg.includes('ouvert votre compte') || previousAiMsg.includes('boutique sur nanasore'))) {
    return {
      thought: `Le compte est déjà ouvert. Orientation directe vers l'Omnibar pour activer le module de vente et fixer le prix.`,
      reply: `Parfait, vous avez une longueur d'avance ! Il vous suffit désormais de taper **Ultimate Funnel** (si c'est un produit vedette ou un livre) ou **Vitrine E-Shop** dans l'Omnibar en haut de votre écran pour créer votre page et fixer votre prix. Avez-vous déjà déterminé le prix de vente de votre produit ?`
    };
  }

  // Cas 3 : Réponse "non" à la Question Retour KYC
  if ((q === 'non' || q.includes('pas encore') || q.includes('c\'est quoi kyc')) && (previousAiMsg.includes('rempli votre kyc') || previousAiMsg.includes('votre kyc'))) {
    return {
      thought: `Le client n'a pas encore fait son KYC. Explication bienveillante de la nécessité légale et proposition d'accompagnement immédiat en 3 minutes.`,
      reply: `Vous devez impérativement le faire pour débloquer les encaissements réels et activer vos modules commerciaux. Mais la très bonne nouvelle, c'est que c'est simple, rapide et que je suis là pour vous accompagner pas à pas dès maintenant. Avez-vous votre pièce d'identité officielle sous la main pour valider la Partie 1 en 2 minutes ?`
    };
  }

  // Cas 4 : Réponse "oui" à la Question Retour KYC
  if ((q === 'oui' || q.includes('deja fait') || q.includes('déjà fait')) && (previousAiMsg.includes('rempli votre kyc') || previousAiMsg.includes('votre kyc'))) {
    return {
      thought: `KYC validé. Explication directe de l'activation des modules via l'Omnibar.`,
      reply: `Félicitations, vos voyants sont au vert ! Pour activer n'importe quel module, tapez simplement son nom dans l'**Omnibar** en haut de votre écran, cliquez sur 'Activer' ou 'Tester en démo', et il est immédiatement prêt à l'emploi. Quel module souhaitez-vous lancer en premier ?`
    };
  }

  // Cas 5 : Vente de Livre / E-book / Produit spécifique (Schéma A)
  if (q.includes('livre') || q.includes('ebook') || q.includes('e-book') || q.includes('roman') || q.includes('manuel')) {
    return {
      thought: `Schéma A : Vente de livre. Prescription Pay-as-you-go ou Commission + Question de qualification immédiate sur l'ouverture de compte.`,
      reply: `Pour vendre votre livre en toute rentabilité, le plan **Pay-as-you-go** ou la formule à la **Commission (0 FCFA de frais fixes)** est la solution idéale : vous déployez votre page de vente sans risque et ne payez qu'une commission modérée par exemplaire vendu.\n\nAvez-vous déjà ouvert votre compte boutique sur Nanasore ?`
    };
  }

  // Cas 6 : Question Retour Prérequis - Comment activer pour pay as you go / comment activer modules (Schéma B)
  if (q.includes('comment activer') || (q.includes('activer') && (q.includes('pay as you go') || q.includes('pay-as-you-go') || q.includes('module')))) {
    return {
      thought: `Schéma B : Question Retour. Avant d'expliquer l'activation, poser la question de clarification KYC oui ou non.`,
      reply: `Avant de vous guider dans l'activation, permettez-moi de vous poser une question essentielle : avez-vous déjà rempli votre KYC (vérification d'identité) ? Oui ou non ?`
    };
  }

  // Cas 7 : Accompagnement KYC / Définition KYC
  if (q.includes('kyc') || q.includes('identité') || q.includes('verification') || q.includes('vérification')) {
    return {
      thought: `Définition claire du KYC et accompagnement pas à pas P1 (Gérant) et P2 (Société).`,
      reply: `Le KYC (Know Your Customer) est la vérification officielle d'identité obligatoire qui sécurise vos encaissements Mobile Money et Cartes. Elle se déroule en 2 étapes très simples : la **Partie 1** (votre pièce d'identité et selfie) et la **Partie 2** (le nom et coordonnées de votre entreprise).\n\nPuis-je vous accompagner pour remplir la Partie 1 dès maintenant en 2 minutes ?`
    };
  }

  // Cas 8 : Définition de l'Omnibar
  if (q.includes('omnibar') || q.includes('barre de recherche') || q.includes('ou trouver les modules') || q.includes('où trouver')) {
    return {
      thought: `Définition limpide de l'Omnibar comme moteur de recherche et lanceur universel des 29 modules.`,
      reply: `L'**Omnibar** est votre commande centrale Nanasore, située tout en haut au milieu de votre écran. Il vous suffit d'y taper le nom de n'importe lequel de nos 29 modules pour l'ouvrir, visionner une démo ou l'activer en un clic.\n\nQuel outil souhaitez-vous chercher dans l'Omnibar à cet instant ?`
    };
  }

  // Cas 9 : Client agacé / contrarié
  if (q.includes('enerve') || q.includes('énerv') || q.includes('agace') || q.includes('n\'importe quoi') || q.includes('reponds pas') || q.includes('arrete')) {
    return {
      thought: `Désamorçage humble et sincère d'une contrariété client. Présentation d'excuses et écoute active.`,
      reply: `Je vous présente mes excuses les plus sincères, ${firstName || 'cher partenaire'}. Mon intention n'était absolument pas de vous contrarier, mais uniquement de vous apporter le meilleur accompagnement commercial possible.\n\nReprenons calmement : quelle est votre question prioritaire pour que je vous apporte une réponse nette et directe ?`
    };
  }

  // Cas 10 : Question confuse / incomprise
  if (q.length < 3 || q.includes('hein') || q.includes('pas compris') || q.includes('reexplique')) {
    return {
      thought: `Clarification polie suite à incompréhension.`,
      reply: `Pardonnez-moi, je veux m'assurer de vous donner la recommandation la plus rentable possible : pourriez-vous me préciser votre besoin sous un autre angle ou m'indiquer quel produit vous souhaitez commercialiser ?`
    };
  }

  // Cas 11 : Question dévalorisante / Scepticisme
  if (q.includes('arnaque') || q.includes('cher') || q.includes('nul') || q.includes('mieux ailleurs')) {
    return {
      thought: `Recadrage élégant face à une critique. Mise en avant des 29 modules souverains tout-en-un et paiements locaux Sebpay.`,
      reply: `C'est une excellente question, et votre esprit critique est la marque des grands entrepreneurs. Là où d'autres plateformes vous obligent à empiler 10 abonnements coûteux et dépendants de banques étrangères, Nanasore réunit **29 modules souverains** dans un seul écosystème avec encaissement Mobile Money direct et formule à la commission à risque zéro.\n\nSouhaitez-vous que nous fassions une simulation chiffrée de vos économies mensuelles ?`
    };
  }

  // Cas 12 : Compliments
  if (q.includes('bravo') || q.includes('merci') || q.includes('super') || q.includes('intelligent') || q.includes('top') || q.includes('genial')) {
    return {
      thought: `Compliment reçu. Remerciements et valorisation du partenaire.`,
      reply: `Je vous remercie chaleureusement, ${firstName || 'cher entrepreneur'} ! C'est un véritable privilège de collaborer avec des bâtisseurs qui ont votre vision. Chez Nanasore, votre succès est notre seule priorité.\n\nQuel prochain cap commercial souhaitez-vous franchir cette semaine ?`
    };
  }

  // Cas 13 : Lancer un business rentable / Gagner beaucoup d'argent (Packs métiers diversifiés)
  if (q.includes('business') || q.includes('argent') || q.includes('riche') || q.includes('lancer') || q.includes('rentable') || q.includes('combinaison')) {
    return {
      thought: `Combinaisons de business rentables diversifiées (Commerce, Formation, Vente digitale).`,
      reply: `Pour bâtir un business très lucratif sur Nanasore, la clé réside dans la synergie de nos modules : par exemple, le pack **Vitrine E-Shop + WhatsApp + Tunnels Ultimate Funnel** pour les produits physiques, ou **Cours Forge LMS + Salles VIP Webinaires** pour les formations et e-books (avec 90%+ de marge nette).\n\nQuel domaine vous intéresse le plus : la vente de produits physiques ou la vente de savoir et produits digitaux ?`
    };
  }

  // Cas 14 : Choix du plan général
  if (q.includes('plan') || q.includes('abonnement') || q.includes('tarif') || q.includes('commission') || q.includes('prix')) {
    return {
      thought: `Arbitrage économique et closing de plan.`,
      reply: `Regardons les chiffres en commerçant de terrain, ${firstName || 'cher entrepreneur'} : si vous lancez votre activité, le modèle de **Paiement à la Commission** à 0 FCFA de frais fixes est le plus sécurisant. Dès que vos ventes deviennent régulières, l'**Abonnement Fixe Pro** vous permet de conserver 100% de votre marge nette.\n\nAvez-vous déjà un volume de ventes prévisible, ou préférez-vous débuter à la commission sans aucun risque ?`
    };
  }

  // Accueil si premier contact
  if (isNew) {
    return {
      thought: `Accueil d'un nouveau marchand par son prénom.`,
      reply: `${greeting} ! C'est un réel honneur de vous accueillir au sein de Nanasore.\n\nEn tant que directeur commercial, je suis là pour vous aider à lancer votre business et à activer les 29 modules qui feront décoller ${storeName}. Puis-je vous aider à choisir la formule idéale pour démarrer, ou souhaitez-vous me décrire ce que vous souhaitez vendre ?`
    };
  }

  // Par défaut
  return {
    thought: `Requête générale avec rebond commercial actif.`,
    reply: `C'est une excellente réflexion pour ${storeName}. Sur Nanasore, notre priorité de commerçant est de transformer chaque visiteur en client payant tout en protégeant vos marges.\n\nQuel produit ou service souhaitez-vous mettre en avant en priorité aujourd'hui ?`
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], query, merchantContext } = body;

    const currentQuery = query || (messages.length > 0 ? messages[messages.length - 1].text || messages[messages.length - 1].content : '');

    const isLeakAttempt = checkSensitiveLeakAttempt(currentQuery);
    const apiKey = process.env.GEMINI_API_KEY;
    const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '' || isLeakAttempt) {
      const fallbackResult = generateComprehensiveStrategicFallback(currentQuery, merchantContext, isLeakAttempt, messages);
      return NextResponse.json({
        reply: sanitizeSensitiveContent(fallbackResult.reply),
        internalThought: fallbackResult.thought,
        author: 'Agent Nsore',
        provider: isLeakAttempt ? 'security_guard' : 'fallback_heuristic'
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const conversationHistory = messages.slice(-6).map((m: any) => {
        const isUser = m.sender === 'user' || m.role === 'user';
        const roleLabel = isUser ? (firstName || 'Marchand') : 'Agent Nsore';
        return `${roleLabel}: ${sanitizeSensitiveContent(m.text || m.content || '')}`;
      }).join('\n\n');

      const isNew = Boolean(merchantContext?.isNewUser);
      const userProfileDescription = isNew
        ? `STATUT : NOUVEL INSCRIT sur NANASORE. Prénom : "${firstName || 'Cher entrepreneur'}". Boutique : "${merchantContext?.storeName || 'Nouvelle Enseigne'}". Ventes : 0. Modules actifs : Aucun pour le moment.`
        : `STATUT : MARCHAND ANCIEN / ACTIF sur NANASORE. Prénom : "${firstName || 'Cher partenaire'}". Boutique : "${merchantContext?.storeName || 'Boutique Partenaire'}". Plan : "${merchantContext?.currentPlan || 'Actif'}". Ventes enregistrées : ${merchantContext?.salesCount || 0}. Produits en stock : ${merchantContext?.productsCount || 0}.`;

      const modulesSummary = NANASORE_29_MODULES.map(m => `- ${m.name} (${m.id}) : ${m.desc}`).join('\n');

      const fullPrompt = `${SYSTEM_INSTRUCTION}

=============================================================================
CATALOGUE DES 29 MODULES DE NANASORE (SOURCE DE VÉRITÉ ABSOLUE) :
=============================================================================
${modulesSummary}

=============================================================================
CONTEXTE MARCHAND EN TEMPS RÉEL (ÉCOUTE À L'ENTRÉE) :
=============================================================================
${userProfileDescription}
Devise : ${merchantContext?.currency || 'FCFA'}
Mode de vente : ${merchantContext?.sellerMode || 'E-commerce & Vente physique'}

HISTORIQUE CONVERSATIONNEL RÉCENT :
${conversationHistory}

DERNIÈRE DEMANDE DU MARCHAND :
"${sanitizeSensitiveContent(currentQuery)}"

CONSIGNES STRICTES DE RÉDACTION :
1. Rédige d'abord ton bloc <analyse_interne>...</analyse_interne> pour décider de ta stratégie de commerçant pratiquant.
2. Rédige ta réponse commerciale d'élite :
   - Si la question porte sur un produit spécifique (ex: livre, formation, cosmétique), donne le plan approprié (Pay-as-you-go ou Commission) et demande immédiatement s'il a ouvert son compte pour l'amener à l'ouvrir !
   - Si la question nécessite une action préalable (activer pay-as-you-go, encaisser), applique la QUESTION RETOUR : demande s'il a déjà rempli son KYC (oui ou non) !
   - Ne parle PAS que d'e-mailing, varie avec les 29 modules pertinents !
   - Style concis et humain (2 à 4 phrases max).
   - Termine impérativement par UNE SEULE question de relance stratégique orientée closing.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          temperature: 0.65,
        }
      });

      const rawResponse = response.text?.trim() || '';

      let internalThought = '';
      let cleanReply = rawResponse;

      const thoughtMatch = rawResponse.match(/<analyse_interne>([\s\S]*?)<\/analyse_interne>/i);
      if (thoughtMatch) {
        internalThought = thoughtMatch[1].trim();
        cleanReply = rawResponse.replace(/<analyse_interne>[\s\S]*?<\/analyse_interne>/i, '').trim();
      }

      if (!cleanReply) {
        const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false, messages);
        cleanReply = fallback.reply;
        internalThought = fallback.thought;
      }

      cleanReply = sanitizeSensitiveContent(cleanReply);

      return NextResponse.json({
        reply: cleanReply,
        internalThought: internalThought || 'Stratégie commerciale Nanasore validée.',
        provider: 'gemini-2.5-flash',
        author: 'Agent Nsore'
      });

    } catch (genAiError: any) {
      console.warn('[AGENT_NSORE_API] Repli heuristique après latence API:', genAiError?.message);
      const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false, messages);
      return NextResponse.json({
        reply: sanitizeSensitiveContent(fallback.reply),
        internalThought: fallback.thought,
        provider: 'fallback_resilient',
        author: 'Agent Nsore'
      });
    }

  } catch (err: any) {
    console.error('[AGENT_NSORE_API] Erreur serveur:', err);
    return NextResponse.json(
      { error: "Une perturbation temporaire est survenue. L'Agent Nsore demeure à vos côtés sur Nanasore." },
      { status: 500 }
    );
  }
}
