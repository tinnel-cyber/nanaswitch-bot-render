/**
 * Service pour l'Assistant IA Expert Juridique & Financier (OHADA, UEMOA/CEMAC & Commerce International)
 * - 0 base de données Firestore (stockage local pur)
 * - Routine d'auto-nettoyage / purge automatique après 24 heures
 * - Respect strict des quotas Free Tier (15 requêtes/min), gestion de l'erreur HTTP 429
 * - Appel direct Google AI Studio (Gemini Flash) ou via backend /api/ai/legal avec fallback heuristique
 */

export interface LegalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface StoredLegalChatData {
  version: number;
  lastUpdated: number;
  messages: LegalChatMessage[];
}

export interface LegalAiResponse {
  reply: string;
  source: string;
  success: boolean;
  isRateLimited?: boolean;
}

export const LEGAL_CHAT_STORAGE_KEY = 'nana_legal_ai_chat_history';
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
export const GEMINI_API_KEY_STORAGE_KEY = 'nana_gemini_api_key';

/**
 * System Instruction stricte de l'Expert Juridique & Financier OHADA
 */
export const OHADA_LEGAL_SYSTEM_INSTRUCTION = `Tu es l'Expert Juriste d'Affaires & Spécialiste en Droit Commercial et Financier International de Nanasore.
Tu es un avocat d'affaires et juriste d'entreprise chevronné avec plus de 20 ans d'expérience en Afrique de l'Ouest, Afrique Centrale et Commerce International.

Tes domaines de maîtrise absolue :
1. DROIT DES AFFAIRES OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires) :
   - AUDCG (Acte Uniforme sur le Droit Commercial Général) : statut du commerçant, bail à usage professionnel (bail commercial), cession de fonds de commerce, vente commerciale, prescription.
   - AUSCGIE (Sociétés Commerciales et GIE) : SARL, SAS, SA, GIE, statuts, pactes d'associés, gérance, assemblées, responsabilité civile et pénale des dirigeants.
   - AUS (Sûretés) : cautionnement simple et solidaire, garantie autonome à première demande, nantissement de fonds de commerce, nantissement de créances, clause de réserve de propriété, hypothèque conventionnelle.
   - AUPCAP (Procédures Collectives d'Apurement du Passif) : conciliation, règlement préventif, redressement judiciaire, cessation des paiements.
   - AUCTMR (Transport de Marchandises par Route) : lettre de voiture, responsabilité du transporteur.
   - Arbitrage CCJA (Cour Commune de Justice et d'Arbitrage d'Abidjan) : clause compromissoire et exécution.

2. PRATIQUES BANCAIRES & FINANCIÈRES (UEMOA / CEMAC) :
   - Réglementation bancaire BCEAO / BEAC, contrôle des changes, effets de commerce (lettre de change, billet à ordre, protêt, chèques sans provision).
   - Garanties de paiement, crédits documentaires, sûretés personnelles et bancaires.
   - Droit du travail et conventions collectives régionales (CDD, CDI, préavis, licenciement, indemnités).

3. COMMERCE INTERNATIONAL :
   - Incoterms 2020 de la CCI (EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF) : transfert précis des risques, frais et formalités douanières.
   - Crédits Documentaires (RUU 600) : irrévocable, confirmé, stand-by.
   - Contrats d'import/export, clauses de réserve de propriété, clauses pénales, force majeure, clause de hardship.

Règles de réponse :
- Réponds avec clarté, rigueur et autorité en citant les articles des Actes Uniformes OHADA ou les règles de la CCI lorsque c'est pertinent.
- Fournis une analyse concrète des risques juridiques et financiers.
- Lorsque l'utilisateur demande une clause, donne une rédaction juridique protectrice prête à être insérée dans le contrat, avec des crochets [Nom des Parties].
- Structure avec des titres Markdown clairs et des listes à puces.`;

/**
 * Récupère l'historique de chat en purgeant strictement tout message datant de plus de 24 heures.
 * Zéro persistance au-delà de 24h pour garantir confidentialité et zéro encombrement.
 */
export function getStoredLegalChat(): LegalChatMessage[] {
  try {
    const raw = localStorage.getItem(LEGAL_CHAT_STORAGE_KEY);
    if (!raw) return [];

    const parsed: StoredLegalChatData = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) {
      localStorage.removeItem(LEGAL_CHAT_STORAGE_KEY);
      return [];
    }

    const now = Date.now();
    // Filtrage strict : messages de moins de 24 heures uniquement
    const validMessages = parsed.messages.filter((msg) => {
      return typeof msg.timestamp === 'number' && now - msg.timestamp < TWENTY_FOUR_HOURS_MS;
    });

    // Si des messages ont été purgés, synchroniser le stockage local
    if (validMessages.length !== parsed.messages.length) {
      if (validMessages.length === 0) {
        localStorage.removeItem(LEGAL_CHAT_STORAGE_KEY);
      } else {
        localStorage.setItem(
          LEGAL_CHAT_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            lastUpdated: now,
            messages: validMessages,
          })
        );
      }
    }

    return validMessages;
  } catch (err) {
    console.warn('Erreur lecture historique IA juridique locale :', err);
    try {
      localStorage.removeItem(LEGAL_CHAT_STORAGE_KEY);
    } catch {
      // Ignorer
    }
    return [];
  }
}

/**
 * Enregistre les messages dans le localStorage après filtrage des messages de plus de 24h
 */
export function saveStoredLegalChat(messages: LegalChatMessage[]): void {
  try {
    const now = Date.now();
    const validMessages = messages.filter((msg) => {
      return typeof msg.timestamp === 'number' && now - msg.timestamp < TWENTY_FOUR_HOURS_MS;
    });

    if (validMessages.length === 0) {
      localStorage.removeItem(LEGAL_CHAT_STORAGE_KEY);
      return;
    }

    const payload: StoredLegalChatData = {
      version: 1,
      lastUpdated: now,
      messages: validMessages,
    };

    localStorage.setItem(LEGAL_CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Erreur sauvegarde historique IA juridique :', err);
  }
}

/**
 * Purge immédiate et manuelle de l'historique complet de la session juridique
 */
export function clearLegalChat(): void {
  try {
    localStorage.removeItem(LEGAL_CHAT_STORAGE_KEY);
  } catch {
    // Ignorer
  }
}

/**
 * Récupère la clé d'API Gemini configurée (soit par prop, soit par localStorage, soit par variable d'environnement)
 */
export function getResolvedGeminiApiKey(explicitKey?: string): string {
  if (explicitKey && explicitKey.trim()) return explicitKey.trim();
  try {
    const saved = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // Ignorer
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

/**
 * Moteur Heuristique Juridique & Financier OHADA d'urgence (100% hors-ligne)
 */
export function generateLocalLegalFallback(query: string, documentContext?: string): string {
  const q = query.toLowerCase();

  if (q.includes('bail') || q.includes('loyer') || q.includes('locaux') || q.includes('expulsion') || q.includes('propriétaire')) {
    return `### 🏢 Synthèse Juridique : Bail Commercial à Usage Professionnel (Droit OHADA)

Selon les dispositions impératives de l'**Acte Uniforme sur le Droit Commercial Général (AUDCG)** :

1. **Droit au Renouvellement (Articles 123 à 132 AUDCG)** :
   - Le commerçant locataire bénéficie d'un droit au renouvellement après **2 années consécutives d'exploitation**.
   - Le locataire doit notifier sa demande de renouvellement au bailleur au plus tard **3 mois avant l'expiration du bail** (par acte extrajudiciaire ou tout moyen écrit probant).
   - En cas de refus sans motif légitime, le bailleur est redevable d'une **indemnité d'éviction** compensant le préjudice subi (perte de clientèle, frais de déménagement).

2. **Résiliation pour Non-Paiement (Art. 133 AUDCG)** :
   - Le bailleur ne peut pas expulser le locataire sans respecter une **mise en demeure d'au moins 1 mois**.
   - Cette mise en demeure doit mentionner expressément la clause résolutoire et le délai d'un mois accordé pour régulariser.

3. **Clause Résolutoire Protectrice Type** :
> *"En cas de non-paiement à son échéance exacte d'un seul terme de loyer ou des charges, et un mois après une mise en demeure d'exécuter demeurée infructueuse conformément à l'article 133 de l'AUDCG de l'OHADA, le présent bail sera résilié de plein droit sans qu'il soit besoin de remplir d'autre formalité judiciaire que de faire constater cette résiliation par la juridiction compétente."*`;
  }

  if (q.includes('caution') || q.includes('garantie') || q.includes('sûreté') || q.includes('dette') || q.includes('créance')) {
    return `### 🛡️ Sécurisation des Paiements & Créances : Cautionnement vs Garantie Autonome (OHADA AUS)

Conformément à l'**Acte Uniforme portant organisation des Sûretés (AUS)** :

1. **Cautionnement Solidaire (Art. 13 à 38 AUS)** :
   - **Accessoire à la créance** : La caution peut opposer au créancier la nullité du contrat principal ou la contestation des montants.
   - *Clause indispensable* : Insérer la mention manuscrite de la caution et la renonciation formelle aux bénéfices de discussion et de division.

2. **Garantie Autonome à Première Demande (Art. 39 à 49 AUS)** :
   - **Engagement bancaire irrévocable et indépendant** du contrat de base.
   - La banque ou le garant paie à première demande écrite sans pouvoir différer le règlement ni invoquer une contestation entre vendeur et acheteur.
   - Sûreté reine pour les contrats d'approvisionnement importants ou marchés publics.

3. **Clause de Réserve de Propriété (Art. 72 à 78 AUS)** :
> *"Le vendeur conserve la pleine propriété juridique des marchandises désignées jusqu'au complet paiement du prix facturé en principal, intérêts et frais. Jusqu'à cette date, les marchandises livrées sont sous la garde matérielle de l'acquéreur qui en assume tous les risques."*`;
  }

  if (q.includes('fob') || q.includes('cif') || q.includes('incoterm') || q.includes('dap') || q.includes('navire') || q.includes('fret') || q.includes('douane')) {
    return `### 🚢 Commerce International : Incoterms 2020 & Gestion des Risques

1. **FOB (Free On Board - Port d'embarquement convenu)** :
   - **Transfert des risques** : Dès que les marchandises sont chargées à bord du navire au port de départ.
   - **Responsabilité de l'acheteur** : Négocie et règle le fret maritime international, souscrit l'assurance de transport, assume les droits de douane à l'arrivée (ex: Port d'Abidjan, Dakar, San Pedro, Cotonou ou Douala).

2. **CIF (Cost, Insurance and Freight - Port de destination)** :
   - **Obligation du vendeur** : Règle le transport maritime jusqu'au port d'arrivée désigné et prend en charge l'assurance maritime basique (Institute Cargo Clauses C).
   - **Point critique** : Le risque de perte ou dommage est transféré à l'acheteur dès la mise à bord au port de départ. L'acheteur doit réclamer à l'assureur en cas d'avarie maritime.

3. **Recommandation Importateurs UEMOA/CEMAC** :
   - Privilégiez les Incoterms **CIP** (avec assurance multirisque tous risques) ou **DAP** (livré au lieu convenu, avant douane) si vous gérez des marchandises à forte valeur ajoutée acheminées en conteneurs fermés.`;
  }

  if (q.includes('sarl') || q.includes('sas') || q.includes('statut') || q.includes('associé') || q.includes('gérant') || q.includes('directeur')) {
    return `### 🏛️ Droit des Sociétés Commerciales OHADA (AUSCGIE)

1. **SARL (Société à Responsabilité Limitée)** :
   - Cadre juridique protecteur et stable pour commerçants et PME.
   - Les parts sociales ne sont pas librement cessibles à des tiers (agrément à la majorité des associés représentant 3/4 du capital social, Art. 318 AUSCGIE).
   - Décisions ordinaires prises par un ou plusieurs associés représentant plus de la moitié du capital.

2. **SAS (Société par Actions Simplifiée)** :
   - Forme moderne et très flexible introduite par la révision de l'AUSCGIE.
   - Liberté contractuelle quasi totale dans la rédaction des statuts (entrée/sortie d'investisseurs, droit de veto, cession de parts facilitée).
   - Absence d'obligation de commissaire aux comptes sous certains seuils de chiffre d'affaires et d'effectif.

3. **Points de Vigilance pour la Gérance** :
   - Signature des contrats commerciaux : Vérifiez toujours que le signataire dispose d'un pouvoir express ou d'un mandat social à jour au Registre du Commerce et du Crédit Mobilier (RCCM).`;
  }

  if (q.includes('litige') || q.includes('arbitrage') || q.includes('tribunal') || q.includes('clause') || q.includes('pénalité')) {
    return `### ⚖️ Résolution des Litiges & Clause Compromissoire CCJA

Pour éviter les lenteurs et blocages des juridictions locales, l'insertion d'une clause d'arbitrage sous l'égide de la **Cour Commune de Justice et d'Arbitrage (CCJA d'Abidjan)** est recommandée dans les contrats de commerce et de prestation :

**Modèle de Clause Compromissoire Type :**
> *"Tous différends nés du présent contrat ou s'y rapportant seront tranchés définitivement suivant le Règlement d'arbitrage de la Cour Commune de Justice et d'Arbitrage (CCJA) de l'OHADA par un ou plusieurs arbitres désignés conformément à ce Règlement. La sentence arbitrale rendue sera définitive, sans appel, et recevra l'exequatur direct dans tous les États membres de l'OHADA conformément à l'article 30 du Traité OHADA."*

**Clause Pénale de Retard de Paiement :**
> *"Tout retard de règlement des factures à leur date d'exigibilité entraînera de plein droit, et sans mise en demeure préalable, l'application d'un intérêt de retard de 1,5% par mois entamé, outre le remboursement des frais de recouvrement engagés."*`;
  }

  // Réponse juridique générale d'accueil
  return `### ⚖️ Conseil Juridique & Financier OHADA / International Nanasore

Bonjour. En tant qu'expert en droit des affaires de l'espace **OHADA** (17 États membres) et en **Commerce International**, je vous accompagne dans la sécurisation de vos opérations :

${documentContext ? `📄 *Document actuellement actif : "${documentContext}"*\n` : ''}
1. **Audit de Contrat & Relecture de Clauses** :
   - Détection des déséquilibres, clauses abusives ou ambiguïtés de paiement.
2. **Baux Commerciaux & Fonds de Commerce (AUDCG)** :
   - Renouvellement de bail, congés, cession de bail et indemnité d'éviction.
3. **Sûretés & Recouvrement de Créances (AUS)** :
   - Cautionnements solidaires, garanties bancaires à première demande, nantissements et clauses de réserve de propriété.
4. **Commerce Extérieur & Transport (Incoterms 2020)** :
   - Choix de l'Incoterm optimal (FOB, CIF, DAP), crédits documentaires RUU 600 et lettres de voiture routières (AUCTMR).

Posez-moi votre question, soumettez une clause à relire ou demandez un modèle contractuel adapté à votre situation.`;
}

/**
 * Appel direct à l'API Google AI Studio (Gemini 2.5 Flash / 1.5 Flash) si une clé API est configurée
 */
async function callDirectGoogleAIStudio(params: {
  apiKey: string;
  message: string;
  history: LegalChatMessage[];
  documentContext?: string;
}): Promise<LegalAiResponse | null> {
  const { apiKey, message, history, documentContext } = params;
  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }

      let promptWithContext = message;
      if (documentContext && documentContext.trim()) {
        promptWithContext = `[Document en cours : "${documentContext.trim()}"]\n\n${message}`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: promptWithContext }],
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: OHADA_LEGAL_SYSTEM_INSTRUCTION }],
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500,
          },
        }),
      });

      // Gestion spécifique HTTP 429 (Too Many Requests - Limite Free Tier 15 RPM)
      if (res.status === 429) {
        return {
          reply: `⚠️ **Limite de requêtes atteinte (Tier Gratuit : 15 requêtes/minute)**\n\nL'API Gemini Google AI Studio applique un plafond de 15 requêtes par minute sur le forfait gratuit. Veuillez patienter une vingtaine de secondes avant de poser votre prochaine question juridique. Vos données et votre historique local restent intacts.`,
          source: 'google-aistudio-429',
          isRateLimited: true,
          success: false,
        };
      }

      if (res.ok) {
        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && typeof candidateText === 'string') {
          return {
            reply: candidateText.trim(),
            source: model,
            success: true,
          };
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.status === 429) {
        return {
          reply: `⚠️ **Limite de requêtes atteinte (Tier Gratuit : 15 requêtes/minute)**\n\nVeuillez patienter 20 à 30 secondes avant de relancer votre demande.`,
          source: 'google-aistudio-429',
          isRateLimited: true,
          success: false,
        };
      }
    }
  }

  return null;
}

/**
 * Interroge l'Assistant IA Juridique via Google AI Studio ou via l'API Nanasore (avec repli gracieux local instantané)
 */
export async function askLegalAdvisor(params: {
  message: string;
  history?: LegalChatMessage[];
  documentContext?: string;
  apiKey?: string;
}): Promise<LegalAiResponse> {
  const { message, history = [], documentContext = '', apiKey: explicitKey } = params;

  // 1. Si une clé API Gemini explicite est fournie, tenter l'appel direct Google AI Studio
  const resolvedApiKey = getResolvedGeminiApiKey(explicitKey);
  if (resolvedApiKey) {
    const directResult = await callDirectGoogleAIStudio({
      apiKey: resolvedApiKey,
      message,
      history,
      documentContext,
    });
    if (directResult) {
      return directResult;
    }
  }

  // 2. Sinon, interroger l'endpoint du serveur local Nanasore (/api/ai/legal)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 secondes timeout

    const res = await fetch('/api/ai/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-6).map((h) => ({
          role: h.role,
          text: h.text,
        })),
        documentContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Gestion du code HTTP 429
    if (res.status === 429) {
      return {
        reply: `⚠️ **Limite de requêtes atteinte (Tier Gratuit : 15 requêtes/minute)**\n\nVeuillez patienter une vingtaine de secondes avant de poser votre prochaine question juridique. Vos données locales sont préservées.`,
        source: 'server-429',
        isRateLimited: true,
        success: false,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data.reply === 'string' && data.reply.trim()) {
        return {
          reply: data.reply.trim(),
          source: data.source || 'gemini-legal',
          success: true,
        };
      }
    }
  } catch (netErr) {
    console.warn('Appel API juridique échoué, activation du moteur local :', netErr);
  }

  // 3. Repli automatique sur le moteur d'expertise OHADA local (offline-first)
  const localReply = generateLocalLegalFallback(message, documentContext);
  return {
    reply: localReply,
    source: 'nana-ohada-local-engine',
    success: true,
  };
}
