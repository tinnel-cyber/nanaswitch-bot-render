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
  { id: 'emailing', name: 'Studio E-mailing & Campagnes Pro', category: 'Marketing & Vente', desc: 'Relais SMTP haute délivrabilité, segmentation d’audience CRM et rentabilité moyenne de 38 € pour 1 € investi.' },
  { id: 'nanagenerator', name: 'Rédacteur Marketing & Annonces IA', category: 'Intelligence Artificielle', desc: 'Génération instantanée d’annonces publicitaires, de fiches produits et de messages WhatsApp percutants.' },
  { id: 'ultimate-funnel', name: 'Ultimate Funnel Builder', category: 'Marketing & Vente', desc: 'Tunnels de vente monopage à très haute conversion avec upsells 1-clic et checkout express.' },
  { id: 'modular-funnel', name: 'Tunnels Modulaires & Pages de Capture', category: 'Marketing & Vente', desc: 'Pages de capture de prospects (lead magnets) et formulaires qualifiés pour nourrir votre CRM.' },
  { id: 'pixels-crm', name: 'Suivi Pixels (Meta & TikTok) & Tracking', category: 'Marketing & Données', desc: 'Traçabilité intégrale des conversions pour diviser par deux le coût par acquisition publicitaire.' },
  { id: 'ai-advisor', name: 'Directeur de Croissance (Agent Nsore)', category: 'Intelligence Artificielle', desc: 'Votre conseiller commercial d’élite pour arbitrer vos modèles économiques, activer vos modules et maximiser vos profits.' },

  // Pilier 3 : Formation, Savoir & Infopreneuriat (6 modules)
  { id: 'cours-forge', name: 'NaNa Cours Forge - Studio LMS', category: 'Formation & Savoir', desc: 'Hébergement et monétisation de formations vidéo et PDF sécurisés contre le piratage.' },
  { id: 'course-create', name: 'Créateur de Cours & Formations', category: 'Formation & Savoir', desc: 'Structuration pédagogique au format carré 1080x1080, idéal pour l’apprentissage mobile.' },
  { id: 'webinar', name: 'Salles VIP & Masterclasses Interactives', category: 'Formation & Savoir', desc: 'Diffusion de webinaires privés en direct, sessions de coaching payantes et billetterie exclusive.' },
  { id: 'docusign', name: 'Signature Électronique & Contrats Numériques', category: 'Juridique & Vente', desc: 'Signature légale de devis, partenariats et conventions commerciales sans papier.' },
  { id: 'academy-support', name: 'Support Pédagogique & Micro-Learning', category: 'Formation & Savoir', desc: 'Tutoriels interactifs et guidage pas à pas pour maîtriser chaque levier de la plateforme.' },
  { id: 'vendor-upload', name: 'Espace Documents & Dépôt Fichiers Sécurisé', category: 'Stockage & Outils', desc: 'Stockage Cloud R2 haute vitesse pour vos ressources numériques, fiches et supports téléchargeables.' },

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
const SYSTEM_INSTRUCTION = `Tu es l'Agent Nsore, Directeur de la Croissance et de la Stratégie Commerciale officiel de la plateforme SaaS NANASORE (et non d'une société tierce).
Ton rôle : Guider, convaincre et accompagner avec brio chaque entrepreneur vers le succès commercial et la souscription au plan idéal sur Nanasore.

=============================================================================
1. CONNAISSANCE PARFAITE DES 29 MODULES DE NANASORE :
=============================================================================
Nanasore compte EXACTEMENT 29 MODULES pré-intégrés dans le Cloud, répartis en 5 piliers :
- Pilier Caisse & Vente (6) : Caisse POS, Vitrine E-Shop, Stocks/Inventaire, Scanner Code-barres, Livre des Dettes, Promotions/Deal Builder.
- Pilier Marketing, Conversion & IA (6) : Studio E-mailing Pro, Rédacteur IA Nanagenerator, Ultimate Funnel Builder, Tunnels Modulaires, Pixels CRM (Meta/TikTok), Directeur de Croissance (Agent Nsore).
- Pilier Formation, Savoir & LMS (6) : Cours Forge LMS, Créateur 1080x1080, Salles VIP Webinaires, Signature Docusign, Support Académie, Dépôt Fichiers R2.
- Pilier Fintech & Paiements (4) : Passerelle Souveraine Sebpay (Orange Money/Moov/Wave), Analytics/Courbe des gains, NaNa Switch API, Espace Affiliation Partenaires (15-20%).
- Pilier Gestion, Identité & Juridique (7) : Chaîne KYC (P1 Gérant + P2 Société), CRM & Connecteurs (WooCommerce/SMS), Éditeur de Thème, Gestion d’Équipe/Caissiers, NaNa CV Pro, Import/Export Excel, Wameet Négociation Vidéo.

=============================================================================
2. COMMENT RÉPONDRE À : "COMMENT ACTIVER LES MODULES ?" :
=============================================================================
Lorsque l'utilisateur demande comment activer les modules, réponds avec précision chirurgicale :
1. LOCALISATION CLOUD : Tous les 29 modules sont déjà hébergés et prêts à l'emploi dans le Cloud Nanasore.
2. ACCÈS INSTANTANÉ VIA L'OMNIBAR : Il lui suffit de taper le nom d'un service, application, module ou outil dans la barre de recherche Omnibar (au sommet central du tableau de bord) pour l'ouvrir, le tester en démo ou l'activer.
3. CONDITION LÉGALE & KYC : Les modules gratuits et Pay-as-you-go (ex: quotas e-mails) sont utilisables immédiatement. Mais pour activer les modules commerciaux avancés et commencer à encaisser de l'argent réel sur son compte marchand, il doit OBLIGATOIREMENT finaliser sa Chaîne d'Identification KYC (Partie 1 Gérant + Partie 2 Entreprise) et ouvrir son compte boutique.
4. ACCOMPAGNEMENT PROACTIF : Propose-lui immédiatement de l'accompagner pas à pas à remplir son KYC en moins de 3 minutes chrono !

=============================================================================
3. RAISONNEMENT COMPLET DE VENTE : DU DIAGNOSTIC AU CLOSING :
=============================================================================
Chaque prise de parole doit conduire logiquement à une conclusion (closing) :
- Diagnostic du profil : Commerçant physique ? E-commerçant ? Formateur / Infopreneur ?
- Proposition d'un Pack Lucratif combinant plusieurs modules :
  * Pack E-commerce : Caisse POS + E-Shop WhatsApp + Studio E-mailing Pro + Dettes.
  * Pack Formateur : Cours Forge LMS + Webinaires VIP + Certificats + Affiliation 20%.
  * Pack Agence : Ultimate Funnel + Pixels Meta/TikTok + Campagnes E-mailing Pro.
- Conclusion vers le Plan Économique :
  * Démarrage / Test : Modèle à la Commission (0 FCFA de coût fixe, Nanasore gagne seulement quand il vend).
  * Vitesse de croisière : Abonnement Fixe Pro (pour protéger 100% de sa marge nette).
  * Besoins ponctuels : Pay-as-you-go (crédits e-mails à la demande).

=============================================================================
4. RÈGLES DE PSYCHOLOGIE COMMERCIALE & COMPORTEMENT HUMAIN :
=============================================================================
- RÈGLE DU PING-PONG : Messages concis (2 à 4 phrases percutantes). Termine TOUJOURS par UNE SEULE question de relance engageante.
- SI L'UTILISATEUR S'AGACE : Fais preuve d'une humilité exemplaire. Présente des excuses sincères : explique que ton intention n'était aucunement de le vexer, mais uniquement de le propulser vers la réussite. Demande-lui comment il préfère orienter l'échange.
- SI LA QUESTION EST CONFUSE : Ne réponds pas à côté ! Dis poliment que tu veux t'assurer de lui offrir la solution la plus lucrative et invite-le à reformuler son besoin.
- FACE À UNE CRITIQUE OU DÉVALORISATION : Ne sois jamais agressif. Recadre élégamment en rappelant que Nanasore réunit 29 modules souverains sans dépendre de solutions étrangères fragiles, garantissant pérennité et souveraineté.
- FACE À UN COMPLIMENT : Remercie chaleureusement et complimente en retour la vision business de l'entrepreneur.
- FACE AU DOUTE : Rassure avec force, chiffres et arguments concrets sur la rentabilité.
- SÉCURITÉ ABSOLUE : Zéro mot de passe, zéro clé API, zéro donnée confidentielle.

Format obligatoire : Rédige d'abord ton bloc <analyse_interne>...</analyse_interne>, puis ton message humain.`;

/**
 * Moteur Heuristique & Algorithmique Complet de l'Agent Nsore
 */
function generateComprehensiveStrategicFallback(
  query: string,
  merchantContext: any,
  isLeakAttempt: boolean
): { reply: string; thought: string } {
  const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);
  const greeting = firstName ? `Bonjour ${firstName}` : `Salutations distinguées`;
  const storeName = merchantContext?.storeName || 'votre boutique';
  const isNew = Boolean(merchantContext?.isNewUser);

  if (isLeakAttempt) {
    return {
      thought: `Tentative d'accès à des données de sécurité sensibles. Rappel de la confidentialité bancaire et recentrage sur la stratégie.`,
      reply: `${greeting}. Pour la sécurité absolue de votre entreprise, vos mots de passe et clés d'accès sont strictement scellés sous chiffrement bancaire et ne doivent jamais être échangés dans cet espace.\n\nRegardons plutôt comment développer le chiffre d'affaires de ${storeName} : sur quel module souhaitez-vous que nous travaillions aujourd'hui ?`
    };
  }

  const q = query.toLowerCase();

  // Scénario A : Comment activer les modules ?
  if (q.includes('activer') || q.includes('activation') || q.includes('comment activer') || (q.includes('module') && q.includes('comment'))) {
    return {
      thought: `Question explicite sur l'activation des 29 modules. Explication : Omnibar pour chercher + KYC pour débloquer les modules commerciaux et encaissements réels. Proposition d'accompagnement KYC immédiat.`,
      reply: `Les 29 modules de Nanasore sont déjà hébergés et prêts à l'emploi dans notre Cloud ! Il vous suffit de saisir le nom de n'importe quel service ou outil dans l'**Omnibar** (la barre de recherche située en haut de votre écran) pour le tester en démo ou l'activer en un clic.\n\nPour débloquer les encaissements réels et les modules commerciaux avancés, vous devez simplement finaliser votre **Chaîne d'Identification KYC** (Partie 1 Gérant + Partie 2 Entreprise). Puis-je vous accompagner pas à pas pour remplir votre KYC en 3 minutes chrono dès maintenant ?`
    };
  }

  // Scénario B : Accompagnement KYC / Ouverture de compte
  if (q.includes('kyc') || q.includes('identité') || q.includes('ouvrir compte') || q.includes('verification') || q.includes('vérification')) {
    return {
      thought: `Accompagnement KYC. Rassurer sur la rapidité (3 minutes), expliquer P1 (CNIB/Passeport gérant) et P2 (Entreprise/IFU), et lancer l'action.`,
      reply: `La validation KYC sur Nanasore est un gage de sécurité juridique et financière qui protège vos encaissements Mobile Money et Cartes. Elle se déroule en 2 étapes très simples : la **Partie 1** (votre pièce d'identité officielle et selfie) et la **Partie 2** (le nom et coordonnées de votre entreprise).\n\nAvez-vous votre pièce d'identité sous la main pour que nous validions la Partie 1 ensemble en 2 minutes ?`
    };
  }

  // Scénario C : Agacement / Irritation de l'utilisateur
  if (q.includes('enerve') || q.includes('énerv') || q.includes('agace') || q.includes('n\'importe quoi') || q.includes('rien a voir') || q.includes('reponds pas')) {
    return {
      thought: `Détection d'agacement client. Excuses sincères, humilité, désamorçage immédiat et reprise en main bienveillante.`,
      reply: `Je vous présente mes excuses les plus sincères, ${firstName || 'cher partenaire'}. Mon intention n'était absolument pas de vous contrarier, mais uniquement de vous apporter le meilleur accompagnement commercial.\n\nReprenons calmement : quelle est votre question prioritaire à cet instant précis pour que je vous réponde de manière directe et limpide ?`
    };
  }

  // Scénario D : Question confuse / Incompréhension
  if (q.length < 3 || q.includes('quoi ?') || q.includes('hein') || q.includes('pas compris') || q.includes('reexplique')) {
    return {
      thought: `Incompréhension ou question confuse. Demande polie de clarification sans prétention.`,
      reply: `Pardonnez-moi, je veux m'assurer de vous apporter la réponse la plus rentable et la plus précise possible. Pourriez-vous me préciser votre besoin sous un autre angle ou me décrire l'objectif immédiat de votre entreprise ?`
    };
  }

  // Scénario E : Question dévalorisante / Scepticisme
  if (q.includes('arnaque') || q.includes('cher') || q.includes('nul') || q.includes('pourquoi vous') || q.includes('mieux ailleurs')) {
    return {
      thought: `Question sceptique ou critique. Défense élégante : 29 modules tout-en-un, souveraineté des paiements locaux, zéro frais cachés.`,
      reply: `C'est une excellente question, et votre esprit critique est la marque des grands entrepreneurs. Là où d'autres solutions vous obligent à empiler 10 abonnements coûteux et dépendants de banques étrangères, Nanasore réunit **29 modules souverains** dans un seul écosystème avec encaissement Mobile Money direct et formule à la commission à risque zéro.\n\nSouhaitez-vous que nous fassions une simulation chiffrée de vos économies mensuelles par rapport à vos outils actuels ?`
    };
  }

  // Scénario F : Compliment de l'utilisateur
  if (q.includes('bravo') || q.includes('merci') || q.includes('super') || q.includes('intelligent') || q.includes('top') || q.includes('genial')) {
    return {
      thought: `Compliment reçu. Remerciement élégant et renvoi du compliment vers l'ambition du marchand.`,
      reply: `Je vous remercie chaleureusement pour vos mots, ${firstName || 'cher entrepreneur'} ! C'est un véritable privilège de collaborer avec des bâtisseurs qui ont votre vision. Chez Nanasore, votre réussite est notre seule métrique de succès.\n\nQuel nouveau levier souhaiteriez-vous que nous déployions ensemble pour passer un cap de chiffre d'affaires cette semaine ?`
    };
  }

  // Scénario G : Lancer un business / Gagner beaucoup d'argent
  if (q.includes('business') || q.includes('argent') || q.includes('riche') || q.includes('lancer') || q.includes('rentable') || q.includes('combinaison')) {
    return {
      thought: `Lancement de business rentable. Proposer une combinaison gagnante adaptée (ex: POS + WhatsApp Shop + E-mailing Pro). Closing vers l'activation.`,
      reply: `Pour bâtir un business hautement lucratif sur Nanasore, la clé réside dans la synergie de nos 29 modules. Par exemple, la combinaison **Caisse POS + E-Shop WhatsApp + Studio E-mailing Pro** vous permet d'encaisser au comptoir, de vendre en ligne 24/7 et de relancer automatiquement vos clients pour générer 35% de ventes récurrentes sans dépense publicitaire.\n\nQuel domaine vous passionne le plus pour démarrer : le commerce de produits physiques ou la vente de formations et services digitaux ?`
    };
  }

  // Scénario H : Les 29 modules et leur importance
  if (q.includes('29') || q.includes('modules') || q.includes('catalogue') || q.includes('services') || q.includes('application')) {
    return {
      thought: `Présentation synthétique des 29 modules organisés par valeur business. Closing vers l'exploration dans l'Omnibar.`,
      reply: `Nanasore intègre **29 modules d'élite** couvrant l'intégralité de votre chaîne de valeur : Caisse tactile POS, Vitrine E-Shop, Stocks en temps réel, Studio E-mailing Pro, Tunnels de vente Ultimate Funnel, Académie LMS, Salles VIP Webinaires et Passerelle Souveraine Sebpay.\n\nChaque module est accessible instantanément via l'**Omnibar** en haut de votre écran. Souhaitez-vous que je vous détaille le module qui correspond précisément à votre activité actuelle ?`
    };
  }

  // Scénario I : Choix du plan & Modèle économique (Abonnement vs Commission)
  if (q.includes('plan') || q.includes('abonnement') || q.includes('tarif') || q.includes('commission') || q.includes('prix')) {
    return {
      thought: `Arbitrage économique et closing de plan.`,
      reply: `Regardons les chiffres en toute transparence, ${firstName || 'cher entrepreneur'} : si vous lancez votre activité, le modèle de **Paiement à la Commission** à 0 FCFA de frais fixe est mathématiquement le plus sûr. Dès que votre volume de vente devient régulier, l'**Abonnement Fixe Pro** vous permet de conserver 100% de votre marge nette.\n\nPréférez-vous débuter en toute sécurité à la commission, ou souhaitez-vous que nous calibrions votre formule selon votre chiffre d'affaires prévisionnel ?`
    };
  }

  // Accueil par défaut si premier contact
  if (isNew) {
    return {
      thought: `Nouveau marchand. Accueil chaleureux par le prénom, mention de Nanasore et proposition d'orientation.`,
      reply: `${greeting} ! C'est un réel honneur de vous accueillir au sein de Nanasore.\n\nJe suis à vos côtés pour vous guider vers la formule la plus rentable et activer les 29 modules qui propulseront ${storeName}. Puis-je vous aider à choisir votre modèle économique, ou préférez-vous que je vous montre comment activer vos premiers outils via l'Omnibar ?`
    };
  }

  // Par défaut : boucle Ping-Pong constructive
  return {
    thought: `Requête générale. Reformulation empathique, mention de Nanasore et clôture par choix alternatif.`,
    reply: `C'est une excellente réflexion pour le développement de ${storeName}. Sur Nanasore, notre priorité est de transformer chaque visiteur en client fidèle tout en protégeant vos marges nettes.\n\nPréférez-vous que nous examinions l'activation de nouveaux canaux de vente via l'Omnibar, ou souhaitons-nous auditer votre rentabilité actuelle ?`
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

    // Si tentative suspecte ou pas de clé API valide
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '' || isLeakAttempt) {
      const fallbackResult = generateComprehensiveStrategicFallback(currentQuery, merchantContext, isLeakAttempt);
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
1. Rédige d'abord ton bloc <analyse_interne>...</analyse_interne> pour décider de ta stratégie.
2. Rédige ta réponse commerciale d'élite :
   - Réponds directement et précisément à la question posée (ex: si on demande comment activer les modules, mentionne obligatoirement l'Omnibar et la finalisation du KYC).
   - Style concis et humain (2 à 4 phrases max).
   - Termine impérativement par UNE SEULE question de relance stratégique (closing ou choix alternatif).`;

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
        const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false);
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
      const fallback = generateComprehensiveStrategicFallback(currentQuery, merchantContext, false);
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
