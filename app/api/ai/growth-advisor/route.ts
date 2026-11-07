import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

const SYSTEM_INSTRUCTION = `Tu es l'Agent Nsore, Directeur de la Croissance et de la Stratégie Commerciale de la plateforme SaaS Nanasore.
Ta mission est d'accompagner les entrepreneurs, marchands et e-commerçants avec l'élégance, la rigueur et la pédagogie d'un grand directeur de la croissance et d'un directeur commercial chevronné.

Règles d'or de communication :
1. Sois toujours extrêmement poli, respectueux, hautement structuré et inspirant. Utilise un vocabulaire professionnel d'élite (ex: "taux de conversion", "Customer Lifetime Value (LTV)", "ROI", "tunnel d'acquisition", "rétention client", "chiffre d'affaires incrémental", "protection des marges").
2. Maîtrise à la perfection l'écosystème Nanasore et ses 14 modules d'élite :
   - 1. Caisse Physique & Digitale POS (vente comptoir, encaissement fluide)
   - 2. Gestion des Stocks & Inventaires (alertes ruptures, réapprovisionnement)
   - 3. Studio E-mailing & Campagnes Pro (relais SMTP haute délivrabilité, segmentation d'audience)
   - 4. Campus E-learning & Formations LMS (création de cours, monétisation du savoir)
   - 5. Tunnels de Vente Modulaires & Pages de Capture (conversion à fort impact)
   - 6. Domaines Personnalisés & Marque Blanche (votre-boutique.com avec SSL instantané)
   - 7. CRM & Suivi des Commandes Clients (fiches clients, historique d'achats)
   - 8. Livre des Dettes & Crédits Clients (recouvrement intelligent)
   - 9. Passerelle de Paiement Souveraine Sebpay (Mobile Money Orange/Moov/Wave, cartes)
   - 10. Espace Partenaires & Affiliation (commissions d'apporteur d'affaires 15% à 20%)
   - 11. Suivi & Pixels de Tracking (Meta Facebook Pixel, TikTok Pixel, Google Analytics)
   - 12. NanoWallet & Trésorerie (retraits instantanés, traçabilité des flux)
   - 13. Salles VIP & Masterclasses Interactives (webinaires privés, coaching)
   - 14. Certifications & Attestations Numériques (preuves de réussite infalsifiables avec QR code)
3. Ton rôle clé est d'aider le marchand à choisir le meilleur modèle économique selon son stade de maturité :
   - PLAN ABONNEMENT (Fixe) : Idéal pour les boutiques à flux régulier et prévisible qui veulent maximiser leurs marges sans subir de frais variables.
   - PAY-AS-YOU-GO (Crédits) : Idéal pour l'envoi d'e-mails à la demande, la consommation SMS ou des services ponctuels sans engagement fixe.
   - PAIEMENT À LA COMMISSION : Idéal pour les jeunes marchands, créateurs ou lancements de produit qui débutent et souhaitent ne payer qu'en fonction de leurs ventes réelles (partage de risque et alignement total des intérêts).
4. Ne fais JAMAIS de réponses froides ou robotiques. Agis comme un mentor stratégique bienveillant qui investit son énergie pour faire grandir la trésorerie de son étudiant/partenaire.
5. Structure tes réponses avec clarté : introduction chaleureuse, analyse stratégique, recommandations chiffrées/actionnables, conclusion stimulante.`;

/**
 * Moteur Heuristique & Algorithmique de secours de l'Agent Nsore
 * Garantit une réponse stratégique brillante et immédiate même en cas de rupture de quota réseau.
 */
function generateStrategicFallback(query: string, merchantContext?: any): string {
  const q = query.toLowerCase();
  const storeName = merchantContext?.storeName || 'votre prestigieuse enseigne';
  const currency = merchantContext?.currency || 'FCFA';

  if (q.includes('commission') || q.includes('pourcentage') || q.includes('partage')) {
    return `Cher entrepreneur visionnaire de **${storeName}**,

Le modèle de **Paiement à la Commission** est une merveille d'ingénierie financière conçue pour éliminer toute barrière à l'entrée.

### 💎 Pourquoi cette formule est une aubaine stratégique :
1. **Risque Zéro & Zéro Dépense Initiale :** Vous ne déboursez aucun frais fixe tant que vous ne réalisez pas de chiffre d'affaires. C'est l'incarnation même du partenariat gagnant-gagnant.
2. **Accès Total aux 14 Modules :** Vous bénéficiez immédiatement de la Caisse POS, de l'inventaire en temps réel, des tunnels de conversion et de notre passerelle de paiement souveraine.
3. **Alignement des Intérêts :** Notre succès financier dépend exclusivement du vôtre.

> **Recommandation de l'Agent Nsore :** Idéal si vous lancez votre activité ou testez de nouvelles gammes. Dès que votre volume de vente mensuel dépasse un seuil de rentabilité critique, nous opérerons une bascule mathématique vers l'**Abonnement Fixe** pour blinder vos marges !`;
  }

  if (q.includes('plan') || q.includes('abonnement') || q.includes('choisir') || q.includes('tarif')) {
    return `Salutations distinguées. En tant que Directeur de la Stratégie, laissez-moi vous guider avec rigueur vers le choix le plus rentable pour **${storeName}**.

### 📊 Grille d'Arbitrage Économique Nanasore :
- **1. Le Modèle à la Commission (Démarrage & Test) :** Zéro frais d'abonnement. Prélèvement modéré uniquement lors des transactions validées.
- **2. L'Abonnement Fixe Pro (Maturité & Répétition) :** Un forfait prévisible qui vous garantit **100% de conservation de marge** sur chaque vente additionnelle.
- **3. Le Pay-as-you-go (Quotas E-mailing & SMS) :** Des packs de crédits ajustables à la volée, sans abonnement contraignant, vous permettant de lancer vos campagnes avec un coût unitaire dégressif.

> **Mon conseil stratégique :** Si votre chiffre d'affaires mensuel est encore fluctuant, conservez le modèle à la commission. Dès lors que votre flux de trésorerie devient stable, souscrivez à l'abonnement mensuel pour capturer l'intégralité de votre surplus de valeur.`;
  }

  if (q.includes('email') || q.includes('campagne') || q.includes('newsletter') || q.includes('brevo') || q.includes('marketing')) {
    return `Excellente initiative ! L'e-mailing demeure, d'un point de vue empirique, le canal affichant le **ROI (Retour sur Investissement)** le plus fulgurant du commerce moderne (en moyenne 36 à 40 € de retour pour 1 € investi).

### 🚀 Vos 3 leviers prioritaires avec notre Studio Pro :
1. **Segmentation Précise :** Isolez vos acheteurs récurrents de vos prospects froids directement depuis notre table CRM Supabase.
2. **Personnalisation Dynamique :** Insérez les balises de prénoms et d'offres spécifiques pour porter votre taux d'ouverture au-delà de 35%.
3. **Délivrabilité d'Élite :** Grâce à notre infrastructure SMTP Pro, vos messages atterrissent directement dans la boîte principale de vos clients, évitant les filtres spams.

> **Action recommandée :** Lancez une campagne éclair le jeudi soir avec notre template épuré Blanc Cassé (#FBF9F5) et Bleu Royal (#2563EB). Vous observerez un pic de conversions mesurable en moins de 48 heures.`;
  }

  if (q.includes('module') || q.includes('14') || q.includes('fonctionnalit') || q.includes('catalogue')) {
    return `C'est avec un grand plaisir pédagogique que je vous présente la force intégrée de l'architecture Nanasore pour **${storeName}**.

Là où d'autres plateformes vous obligent à empiler 10 abonnements hétérogènes (Shopify + Mailchimp + Teachable + Stripe...), Nanasore réunit **14 modules souverains** dans un seul QG :
- **Omni-Commerce :** Caisse POS rapide, gestion d'inventaire multi-emplacements, vitrine connectée.
- **Acquisition & Rétention :** Tunnels de conversion, Studio E-mailing Pro, pixels de tracking (Meta & TikTok).
- **Savoir & Influence :** Académie LMS, Salles VIP en direct, délivrance automatique de certificats QR code.
- **Fintech Locale :** Passerelle de paiement Mobile Money Orange/Moov/Wave et NanoWallet sécurisé.

Chaque module nourrit les autres : une vente en Caisse POS alimente instantanément votre CRM et ouvre des droits de relance dans votre Studio d'e-mailing !`;
  }

  return `C'est une réflexion stratégique de premier ordre pour **${storeName}**.

Dans la conduite de votre stratégie d'entreprise, chaque décision d'allocation de capital doit répondre à une équation fondamentale : **Maximiser la Valeur Vie Client (LTV) tout en compressant le Coût d'Acquisition Client (CAC)**.

Grâce aux modules interconnectés de Nanasore (Caisse POS, Studio E-mailing Pro, Tunnels et Passerelle Souveraine), vous disposez d'un avantage concurrentiel décisif sur votre marché.

Souhaitez-vous que nous examinions plus précisément :
1. **L'optimisation de vos marges** via nos modèles de tarification ?
2. **La stratégie de relance de vos clients inactifs** via des campagnes ciblées ?
3. **La mise en place d'un nom de domaine personnalisé** pour asseoir la notoriété de votre marque ?

Je demeure à votre entière disposition pour porter votre entreprise vers son plein potentiel.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], query, merchantContext } = body;

    // Dernière question posée
    const currentQuery = query || (messages.length > 0 ? messages[messages.length - 1].text || messages[messages.length - 1].content : '');

    if (!currentQuery || !currentQuery.trim()) {
      return NextResponse.json({ error: 'La requête ne peut pas être vide.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Si pas de clé ou clé exemple, fallback stratégique haute qualité
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      const fallbackResponse = generateStrategicFallback(currentQuery, merchantContext);
      return NextResponse.json({
        reply: fallbackResponse,
        provider: 'fallback_heuristic',
        author: 'Agent Nsore'
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Historique des messages récents pour conserver la cohérence conversationnelle
      const conversationHistory = messages.slice(-6).map((m: any) => {
        const isUser = m.sender === 'user' || m.role === 'user';
        return `${isUser ? 'Marchand' : 'Agent Nsore'}: ${m.text || m.content}`;
      }).join('\n\n');

      const fullPrompt = `${SYSTEM_INSTRUCTION}

Contexte du Marchand :
- Nom de la boutique : ${merchantContext?.storeName || 'Boutique Partenaire'}
- Devise : ${merchantContext?.currency || 'FCFA'}
- Modèle commercial actuel : ${merchantContext?.sellerMode || 'E-commerce & Services'}

Historique des échanges récents :
${conversationHistory}

Dernière intervention du Marchand :
"${currentQuery}"

Réponds avec ta voix d'élite, bienveillante, pédagogique et hautement stratégique.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          temperature: 0.7,
        }
      });

      const replyText = response.text?.trim();

      if (replyText) {
        return NextResponse.json({
          reply: replyText,
          provider: 'gemini',
          author: 'Agent Nsore'
        });
      }

      // En cas de texte vide
      const fallback = generateStrategicFallback(currentQuery, merchantContext);
      return NextResponse.json({
        reply: fallback,
        provider: 'fallback_empty',
        author: 'Agent Nsore'
      });

    } catch (genAiError: any) {
      console.warn('[GROWTH_DIRECTOR_AI] Erreur Gemini, bascule sur fallback stratégique:', genAiError?.message);
      const fallback = generateStrategicFallback(currentQuery, merchantContext);
      return NextResponse.json({
        reply: fallback,
        provider: 'fallback_on_error',
        author: 'Agent Nsore'
      });
    }

  } catch (err: any) {
    console.error('[GROWTH_DIRECTOR_ROUTE] Erreur fatale:', err);
    return NextResponse.json(
      { error: "Une perturbation est survenue lors de l'analyse de votre requête." },
      { status: 500 }
    );
  }
}
