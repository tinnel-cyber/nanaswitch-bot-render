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
    // Masquage strict des clés API (Brevo, Gemini, OpenAI, Supabase, JWT)
    .replace(/(?:xkeysib-|AIza|sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,})[a-zA-Z0-9_\-]*/gi, '[CLÉ_SÉCURISÉE]')
    // Masquage strict des mots de passe et credentials sensibles
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

/**
 * Extraction intelligente et propre du prénom d'un marchand
 */
function extractFirstName(fullName?: string): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const clean = fullName.trim().replace(/^(m\.|mme\.|dr\.|prof\.)\s+/i, '');
  const parts = clean.split(/\s+/);
  return parts[0] || '';
}

/**
 * System Prompt Élite de l'Agent Nsore incorporant les 7 Techniques Secrètes
 */
const SYSTEM_INSTRUCTION = `Tu es l'Agent Nsore, Directeur de la Croissance et de la Stratégie Commerciale de Nanasore.
Tu n'es PAS un assistant virtuel ordinaire ni un chatbot froid. Tu te comportes comme un véritable directeur commercial humain de classe mondiale : chaleureux, perspicace, doté d'une autorité bienveillante et obsédé par le succès financier de ton partenaire marchand.

=============================================================================
LES 7 TECHNIQUES SECRÈTES DE VENTE HUMAINE (À RESPECTER STRICTEMENT) :
=============================================================================

1. RÈGLE DU PING-PONG CONVERSATIONNEL :
   - Ne rédige JAMAIS de longs pavés exhaustifs ni de listes interminables. Un vrai humain échange par touches légères.
   - Limite tes réponses à 2 ou 3 phrases percutantes (4 maximum lors d'un arbitrage de plan).
   - Termine TOUJOURS ta prise de parole par UNE SEULE question stratégique engageante.

2. LE MONOLOGUE INTÉRIEUR INVISIBLE (<analyse_interne>) :
   - Avant de répondre, génère obligatoirement un bloc <analyse_interne>...</analyse_interne> où tu décortiques :
     * Statut de l'interlocuteur (Nouveau inscrit vs Ancien client)
     * Peur sous-jacente ou objection masquée (ex: peur des coûts fixes, surcharge technique)
     * Angle tactique choisi (rassurer, challenger poliment, valoriser la marge)
     * La question finale de relance
   - Ce bloc sera masqué pour l'utilisateur et sert à calibrer ta psychologie humaine.

3. CHALLENGER SALE & AUTORITÉ BIENVEILLANTE (Savoir dire "Non") :
   - Ne sois pas un robot flatteur servile. Si le marchand envisage une formule inadéquate, dis-le-lui franchement avec bienveillance :
     "Entre nous, à votre stade, souscrire à ce forfait serait prématuré et grèverait votre trésorerie. Commençons plutôt par la commission à 0 FCFA."
   - Refuser une mauvaise vente bâtit une confiance inébranlable.

4. MIRRORING & LABELING ÉMOTIONNEL (Méthode Chris Voss) :
   - Répète subtilement un mot clé du marchand avec empathie.
   - Nomme ses contraintes avant lui : "J'ai le sentiment que votre priorité immédiate, c'est de tester sans prendre le moindre risque financier ?"

5. RYTHME NATUREL & TICS DE LANGAGE HUMAINS :
   - Emploie des amorces orales élégantes : "Entre nous...", "Regardons les chiffres concrètement", "Voyons voir...", "Pour être tout à fait franc avec vous".
   - Tonalité : Professionnelle, vive, encourageante, hautement respectueuse.

6. FERMETURE PAR CHOIX ALTERNATIF (ALTERNATIVE CLOSE) :
   - Ne pose jamais de question fermée ("Voulez-vous ?"). Propose toujours un choix entre 2 issues positives.
   - Exemple : "Préférez-vous débuter à la commission sans aucun frais fixe, ou souhaitez-vous d'abord tester un envoi d'e-mails avec vos crédits offerts ?"

7. SÉCURITÉ & CONFIDENTIALITÉ ABSOLUE :
   - Ne mentionne, ne demande et ne révèle JAMAIS de mot de passe, de clés API, de tokens ou de secrets internes.
   - Si un utilisateur aborde ces sujets, rappelle poliment que ces éléments sont scellés sous chiffrement et n'ont pas leur place dans un échange stratégique.

=============================================================================
GESTION DÉDIÉE DE L'ACCUEIL (ÉCOUTE À L'ENTRÉE) :
=============================================================================
- SI NOUVEL INSCRIT :
  * Salue-le chaleureusement et personnellement par son PRÉNOM.
  * Demande-lui poliment s'il t'autorise à le guider vers le plan le plus profitable ou à lui présenter les modules Nanasore taillés pour son business.
- SI ANCIEN CLIENT / CLIENT ACTIF :
  * Salue-le par son PRÉNOM en reconnaissant son enseigne et son activité.
  * Adopte une posture d'accélération : maximisation du panier moyen, relance de clients via le Studio E-mailing Pro, optimisation de la caisse POS.`;

/**
 * Fallback Stratégique de l'Agent Nsore (Haute Qualité Humaine)
 */
function generateStrategicFallback(
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
      thought: `Tentative d'évocation de mot de passe ou clé API détectée. Réponse protectrice et bienveillante sans rompre la confiance.`,
      reply: `${greeting}. Pour la sécurité absolue de votre entreprise, vos mots de passe et clés d'accès sont strictement scellés sous chiffrement bancaire et ne doivent jamais être partagés dans notre échange. 

Comment puis-je vous accompagner plus efficacement sur le développement commercial de ${storeName} aujourd'hui ?`
    };
  }

  const q = query.toLowerCase();

  // 1. Accueil initial si premier échange
  if (q.includes('bonjour') || q.includes('salut') || q.includes('hello') || !q.trim() || q === 'start') {
    if (isNew) {
      return {
        thought: `Nouveau marchand détecté (${firstName || 'Inconnu'}). Accueil chaleureux par le prénom, mise en confiance et proposition d'orientation non intrusive.`,
        reply: `${greeting} ! C'est un réel plaisir de vous accueillir au sein de Nanasore.

Puis-je vous aider à choisir la formule idéale pour lancer ${storeName} en toute rentabilité, ou préférez-vous que je vous présente les outils qui correspondent le mieux à votre activité ?`
      };
    } else {
      return {
        thought: `Client actif / ancien reconnu. Tonalité de partenaire d'affaires, orientation optimisation du cash et fidélisation.`,
        reply: `Heureux de vous retrouver, ${firstName || 'cher partenaire'} ! 

Les indicateurs de ${storeName} sont au vert. Souhaitez-vous que nous optimisions vos marges avec une campagne ciblée sur le Studio E-mailing Pro, ou regardons-nous la gestion de vos stocks comptoir ?`
      };
    }
  }

  // 2. Modèle à la commission
  if (q.includes('commission') || q.includes('pourcentage') || q.includes('sans frais')) {
    return {
      thought: `Question sur le modèle commission. Validation de l'absence de risque, cadrage de rentabilité et question alternative.`,
      reply: `Entre nous, le **Paiement à la Commission** est l'option la plus intelligente si vous lancez une nouvelle gamme sur ${storeName} : vous bénéficiez de nos 14 modules sans débourser un seul centime de coût fixe. Nous ne prélevons une commission modérée que lorsque vous encaissez réellement.

Préférez-vous démarrer sous ce modèle sans engagement, ou souhaitez-vous comparer avec l'abonnement fixe pour évaluer vos marges ?`
    };
  }

  // 3. Choix du plan d'abonnement
  if (q.includes('plan') || q.includes('abonnement') || q.includes('tarif') || q.includes('prix')) {
    return {
      thought: `Arbitrage économique. Règle du challenger sale : conseiller la commission si débutant, l'abonnement si flux stable.`,
      reply: `Regardons les choses concrètement, ${firstName || 'cher entrepreneur'} : si vos ventes sont encore en phase de décollage, optez pour la commission à 0 FCFA de frais fixes. En revanche, dès que votre flux devient régulier, l'abonnement fixe vous permettra de conserver 100% de votre marge nette.

Avez-vous déjà un volume de ventes prévisible ce mois-ci, ou préférez-vous sécuriser votre trésorerie avec la formule commission ?`
    };
  }

  // 4. E-mailing et campagnes Pro
  if (q.includes('email') || q.includes('campagne') || q.includes('newsletter') || q.includes('marketing')) {
    return {
      thought: `E-mailing Pro. Rappel du ROI exceptionnel, valorisation des crédits offerts, question de closing.`,
      reply: `L'e-mailing est votre canal le plus rentable : en moyenne 38 € de retour pour 1 € engagé. Avec notre Studio Pro, vos e-mails arrivent directement en boîte principale sans atterrir dans les spams.

Souhaitez-vous que nous préparions votre première campagne pour vos clients avec vos crédits offerts, ou préférez-vous d'abord segmenter vos contacts ?`
    };
  }

  // Réponse par défaut Ping-Pong
  return {
    thought: `Requête générale. Reformulation empathique, cadrage de valeur et question ouverte engageante.`,
    reply: `C'est une excellente réflexion stratégique pour ${storeName}. L'important est de maximiser chaque opportunité de vente tout en protégeant votre temps et votre trésorerie.

Sur quel aspect souhaitez-vous que nous mettions l'accent en priorité : l'acquisition de nouveaux clients ou l'augmentation de votre panier moyen ?`
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], query, merchantContext } = body;

    const currentQuery = query || (messages.length > 0 ? messages[messages.length - 1].text || messages[messages.length - 1].content : '');

    // 1. Garde-fou de sécurité : filtrage des tentatives d'accès aux mots de passe ou secrets
    const isLeakAttempt = checkSensitiveLeakAttempt(currentQuery);

    const apiKey = process.env.GEMINI_API_KEY;
    const firstName = extractFirstName(merchantContext?.userFullName || merchantContext?.userName);

    // Fallback immédiat si pas de clé API valide ou tentative suspecte de leak
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '' || isLeakAttempt) {
      const fallbackResult = generateStrategicFallback(currentQuery, merchantContext, isLeakAttempt);
      return NextResponse.json({
        reply: sanitizeSensitiveContent(fallbackResult.reply),
        internalThought: fallbackResult.thought,
        author: 'Agent Nsore',
        provider: isLeakAttempt ? 'security_guard' : 'fallback_heuristic'
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Historique récent nettoyé des informations confidentielles
      const conversationHistory = messages.slice(-6).map((m: any) => {
        const isUser = m.sender === 'user' || m.role === 'user';
        const roleLabel = isUser ? (firstName || 'Marchand') : 'Agent Nsore';
        return `${roleLabel}: ${sanitizeSensitiveContent(m.text || m.content || '')}`;
      }).join('\n\n');

      const isNew = Boolean(merchantContext?.isNewUser);
      const userProfileDescription = isNew
        ? `NOUVEL INSCRIT sur Nanasore. Prénom : "${firstName || 'Cher entrepreneur'}". Boutique : "${merchantContext?.storeName || 'Nouvelle Boutique'}". Services actifs : Aucun pour le moment. Accueille-le chaleureusement et demande-lui poliment s'il veut de l'aide pour choisir un plan ou découvrir les services adaptés à son profil.`
        : `CLIENT ANCIEN / ACTIF sur Nanasore. Prénom : "${firstName || 'Cher partenaire'}". Boutique : "${merchantContext?.storeName || 'Boutique Partenaire'}". Plan actuel : "${merchantContext?.currentPlan || 'Actif'}". Ventes enregistrées : ${merchantContext?.salesCount || 0}. Salue-le comme un partenaire de confiance et oriente-le vers la rentabilité et l'expansion.`;

      const fullPrompt = `${SYSTEM_INSTRUCTION}

=============================================================================
CONTEXTE MARCHAND EN TEMPS RÉEL (ÉCOUTE À L'ENTRÉE) :
=============================================================================
${userProfileDescription}
Devise : ${merchantContext?.currency || 'FCFA'}
Mode de vente : ${merchantContext?.sellerMode || 'E-commerce & Services'}

HISTORIQUE CONVERSATIONNEL :
${conversationHistory}

DERNIÈRE DEMANDE DU MARCHAND :
"${sanitizeSensitiveContent(currentQuery)}"

CONSIGNE STRICTE D'EXÉCUTION :
Rédige en premier lieu ton bloc <analyse_interne>...</analyse_interne>, puis ta réponse commerciale polie, concise (2 à 3 phrases max) se terminant par UNE SEULE question de relance.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          temperature: 0.65,
        }
      });

      const rawResponse = response.text?.trim() || '';

      // Extraction du monologue intérieur invisible
      let internalThought = '';
      let cleanReply = rawResponse;

      const thoughtMatch = rawResponse.match(/<analyse_interne>([\s\S]*?)<\/analyse_interne>/i);
      if (thoughtMatch) {
        internalThought = thoughtMatch[1].trim();
        cleanReply = rawResponse.replace(/<analyse_interne>[\s\S]*?<\/analyse_interne>/i, '').trim();
      }

      // Si l'IA a répondu de façon vide après extraction
      if (!cleanReply) {
        const fallback = generateStrategicFallback(currentQuery, merchantContext, false);
        cleanReply = fallback.reply;
        internalThought = fallback.thought;
      }

      // Sanitization finale de sécurité
      cleanReply = sanitizeSensitiveContent(cleanReply);

      return NextResponse.json({
        reply: cleanReply,
        internalThought: internalThought || 'Analyse comportementale et commerciale validée.',
        provider: 'gemini-2.5-flash',
        author: 'Agent Nsore'
      });

    } catch (genAiError: any) {
      console.warn('[AGENT_NSORE_API] Repli heuristique après latence API:', genAiError?.message);
      const fallback = generateStrategicFallback(currentQuery, merchantContext, false);
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
      { error: "Une perturbation temporaire est survenue. L'Agent Nsore demeure à vos côtés." },
      { status: 500 }
    );
  }
}
