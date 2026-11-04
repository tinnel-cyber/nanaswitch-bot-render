import { doc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

export type ComparisonCategoryKey = 
  | 'ecommerce' 
  | 'elearning' 
  | 'payments_domains' 
  | 'marketing_live';

export interface ComparisonCategoryDefinition {
  id: ComparisonCategoryKey;
  title: string;
  description: string;
  badge: string;
  iconName: 'ShoppingBag' | 'GraduationCap' | 'CreditCard' | 'Sparkles';
}

export interface ComparisonFeatureItem {
  id: string;
  name: string;
  category: ComparisonCategoryKey;
  isVipCrown?: boolean;
  tooltip?: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  elite: boolean | string;
}

export const COMPARISON_CATEGORIES: ComparisonCategoryDefinition[] = [
  {
    id: 'ecommerce',
    title: 'E-commerce & Boutiques',
    description: 'Gestion du catalogue, tunnels de conversion, encaissements et multi-caisses.',
    badge: 'Vente & POS',
    iconName: 'ShoppingBag'
  },
  {
    id: 'elearning',
    title: 'Académie & E-learning',
    description: 'Création de cours, parcours adaptatifs, protection DRM et certifications.',
    badge: 'LMS & Savoir',
    iconName: 'GraduationCap'
  },
  {
    id: 'payments_domains',
    title: 'Paiements & Domaines',
    description: 'Nom de domaine, passerelles souveraines et encaissements sans commission.',
    badge: 'Infrastructure',
    iconName: 'CreditCard'
  },
  {
    id: 'marketing_live',
    title: 'Marketing & Live Commerce',
    description: 'Live shopping HD, synchronisation réseaux sociaux, pixels publicitaires et CRM.',
    badge: 'Croissance',
    iconName: 'Sparkles'
  }
];

export const DEFAULT_COMPARISON_MATRIX: ComparisonFeatureItem[] = [
  // --- 1. E-COMMERCE & BOUTIQUES ---
  {
    id: 'feat_products_limit',
    name: 'Nombre de Produits au Catalogue',
    category: 'ecommerce',
    isVipCrown: false,
    tooltip: 'Nombre maximal d\'articles actifs en caisse et sur votre vitrine web.',
    free: '3 produits',
    starter: 'Illimité',
    pro: 'Illimité',
    elite: 'Illimité'
  },
  {
    id: 'feat_funnels_limit',
    name: 'Tunnels de Vente Haute Conversion',
    category: 'ecommerce',
    isVipCrown: true,
    tooltip: 'Pages de capture, One-Click Upsell et Order Bump pour maximiser le panier moyen.',
    free: '1 tunnel',
    starter: '10 tunnels (Option à l\'usage)',
    pro: '10 tunnels (Option à l\'usage)',
    elite: 'Illimité'
  },
  {
    id: 'feat_pos_checkout',
    name: 'Caisse Tactile POS & Vente Directe',
    category: 'ecommerce',
    isVipCrown: false,
    tooltip: 'Interface rapide de caisse avec ticket thermique, espèces et mobile money.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_cashiers_pin',
    name: 'Multi-Vendeurs & Caissiers avec Code PIN',
    category: 'ecommerce',
    isVipCrown: true,
    tooltip: 'Comptes d\'accès dédiés avec verrouillage PIN individuel pour vos employés.',
    free: '1 caissier',
    starter: '5 caissiers',
    pro: '5 caissiers',
    elite: 'Illimité'
  },
  {
    id: 'feat_debt_book',
    name: 'Cahier de Dettes & Suivi Crédit Client',
    category: 'ecommerce',
    isVipCrown: false,
    tooltip: 'Enregistrement des créances clients avec rappels par WhatsApp en 1 clic.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_barcode_scanner',
    name: 'Scanner Code-barres Caméra & Douchette',
    category: 'ecommerce',
    isVipCrown: false,
    tooltip: 'Scan rapide des articles via la caméra de votre smartphone ou douchette USB.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_escrow_quotes',
    name: 'Devis Sécurisés & Séquestre Escrow (Tiers de Confiance)',
    category: 'ecommerce',
    isVipCrown: true,
    tooltip: 'Fonds bloqués sur compte séquestre tiers jusqu\'à la livraison validée par l\'acheteur.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },

  // --- 2. ACADÉMIE & E-LEARNING ---
  {
    id: 'feat_courses_limit',
    name: 'Nombre de Formations Hébergées',
    category: 'elearning',
    isVipCrown: false,
    tooltip: 'Nombre de cours en ligne complets avec vidéos, quiz et devoirs.',
    free: '1 cours',
    starter: '50 cours',
    pro: '50 cours',
    elite: 'Illimité'
  },
  {
    id: 'feat_node_graph_canvas',
    name: 'Constructeur de Cours par Graphe Visuel (Nodes)',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Canvas nodulaire pour créer des embranchements adaptatifs et logiques de cours.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_content_drip',
    name: 'Content Drip (Déblocage Goutte à Goutte)',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Libération progressive des leçons jour par jour pour fidéliser les étudiants.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_drm_watermark',
    name: 'Protection DRM & Filigrane Dynamique Anti-Pillage',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Incrustation de l\'email et de l\'IP de l\'élève en filigrane transparent sur la vidéo.',
    free: false,
    starter: false,
    pro: true,
    elite: true
  },
  {
    id: 'feat_level_simulator',
    name: 'Simulateur de Niveau & Quiz Diagnostiques',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Tests d\'évaluation intelligents orientant l\'élève vers le module adapté.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_certificates_generator',
    name: 'Générateur de Certificats de Réussite Signés',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Délivrance automatique d\'attestations PDF officielles avec QR-code de vérification.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_campus_social',
    name: 'Campus Social Privé & Messagerie Élèves',
    category: 'elearning',
    isVipCrown: true,
    tooltip: 'Fil communautaire de discussion et chat direct entre élèves et formateurs.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_stealth_video_player',
    name: 'Lecteur Vidéo Stealth Sans Distraction',
    category: 'elearning',
    isVipCrown: false,
    tooltip: 'Lecteur sécurisé masquant les boutons YouTube et recommandations externes.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },

  // --- 3. PAIEMENTS & DOMAINES ---
  {
    id: 'feat_subdomain',
    name: 'Sous-Domaine Offert (.nanastore.app)',
    category: 'payments_domains',
    isVipCrown: false,
    tooltip: 'URL instantanée accessible sans frais de configuration technique.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_custom_domain',
    name: 'Domaine Personnalisé (.com, .bf, .ci) & SSL Inclus',
    category: 'payments_domains',
    isVipCrown: true,
    tooltip: 'Liez votre propre nom de marque pour une crédibilité maximale auprès de vos clients.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_nanasore_pay',
    name: 'Nanasore Pay (0% de Commission sur vos ventes)',
    category: 'payments_domains',
    isVipCrown: false,
    tooltip: 'Vous conservez 100% du chiffre d\'affaires encaissé sans aucune ponction.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_sovereign_gateway',
    name: 'Passerelle Souveraine (Direct API Orange/Wave/Moov)',
    category: 'payments_domains',
    isVipCrown: true,
    tooltip: 'Connexion de vos propres clés marchandes : encaissez l\'argent directement sur vos comptes.',
    free: false,
    starter: false,
    pro: true,
    elite: true
  },
  {
    id: 'feat_international_cards',
    name: 'Encaissement Cartes Bancaires & Diaspora (Visa, MC)',
    category: 'payments_domains',
    isVipCrown: true,
    tooltip: 'Permettez à vos clients internationaux et à la diaspora de commander facilement.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_mobile_withdrawals',
    name: 'Retraits Express Mobile Money 24/7',
    category: 'payments_domains',
    isVipCrown: false,
    tooltip: 'Débloquez votre trésorerie à tout moment sans délai bancaire contraignant.',
    free: true,
    starter: true,
    pro: true,
    elite: true
  },

  // --- 4. MARKETING & LIVE COMMERCE ---
  {
    id: 'feat_buyer_live_call',
    name: 'Appels Vidéo "Voir en Direct" (WebRTC Daily.co)',
    category: 'marketing_live',
    isVipCrown: false,
    tooltip: 'L\'acheteur déclenche un appel vidéo HD instantané pour inspecter un article.',
    free: '3 appels / mois',
    starter: '10 appels / mois',
    pro: 'Illimité',
    elite: 'Illimité'
  },
  {
    id: 'feat_social_live_commerce',
    name: 'Social Live Commerce (Multi-Stream TikTok / FB / IG)',
    category: 'marketing_live',
    isVipCrown: true,
    tooltip: 'Vendez vos produits en direct simultanément sur tous vos réseaux sociaux.',
    free: false,
    starter: false,
    pro: true,
    elite: true
  },
  {
    id: 'feat_tracking_pixels',
    name: 'Pixels Publicitaires de Conversion (Meta & TikTok)',
    category: 'marketing_live',
    isVipCrown: true,
    tooltip: 'Synchronisation des événements d\'achat pour optimiser vos retours sur investissement publicitaire.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_crm_segmentation',
    name: 'CRM Avancé & Relances Paniers Abandonnés',
    category: 'marketing_live',
    isVipCrown: true,
    tooltip: 'Retargeting ciblé des clients ayant débuté une commande sans finaliser le paiement.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_sms_email_automation',
    name: 'Automatisations SMS (Twilio) & Email (Brevo)',
    category: 'marketing_live',
    isVipCrown: true,
    tooltip: 'Envois automatisés de notifications de commande et campagnes promotionnelles.',
    free: false,
    starter: true,
    pro: true,
    elite: true
  },
  {
    id: 'feat_documents_docusign',
    name: 'Génération de Documents & DocuSign / CV Pro',
    category: 'marketing_live',
    isVipCrown: false,
    tooltip: 'Bons de livraison signés, décharges certifiées et CV professionnels exportés en PDF 300 DPI.',
    free: '1 document',
    starter: '5 documents',
    pro: 'Illimité',
    elite: 'Illimité'
  },
  {
    id: 'feat_white_label',
    name: 'Marque Blanche Totale (Retirer le logo Nanasore)',
    category: 'marketing_live',
    isVipCrown: true,
    tooltip: 'Suppression complète du branding NaNa sur vos vitrines, tunnels et reçus.',
    free: false,
    starter: false,
    pro: true,
    elite: true
  },
  {
    id: 'feat_google_flow_studio',
    name: 'Studio Pub & Vidéo IA (Google Flow Studio)',
    category: 'marketing_live',
    isVipCrown: false,
    tooltip: 'Génération de vidéos publicitaires percutantes pour vos produits grâce à l\'IA.',
    free: '50 crédits/jour',
    starter: '200 crédits/jour',
    pro: '500 crédits/jour',
    elite: 'Illimité'
  }
];

const STORAGE_CACHE_KEY = 'nana_comparison_matrix_cache';

/**
 * Récupère les données en cache local pour affichage instantané
 */
export function getCachedComparisonMatrix(): ComparisonFeatureItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[COMPARISON_MATRIX] Erreur lecture cache local :', e);
  }
  return DEFAULT_COMPARISON_MATRIX;
}

/**
 * Sauvegarde dans le cache local
 */
export function setCachedComparisonMatrix(items: ComparisonFeatureItem[]) {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[COMPARISON_MATRIX] Erreur écriture cache local :', e);
  }
}

/**
 * Écouteur temps réel Firestore sur platform_settings/comparison_matrix
 */
export function subscribeToComparisonMatrix(
  onUpdate: (features: ComparisonFeatureItem[]) => void
): Unsubscribe {
  // Fournir immédiatement la valeur en cache pour fluidité d'affichage sans clignotement
  onUpdate(getCachedComparisonMatrix());

  try {
    return onSnapshot(
      doc(db, 'platform_settings', 'comparison_matrix'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.features) && data.features.length > 0) {
            setCachedComparisonMatrix(data.features);
            onUpdate(data.features);
            return;
          }
        }
        // Fallback valeurs par défaut si le document n'existe pas encore
        onUpdate(DEFAULT_COMPARISON_MATRIX);
      },
      (error) => {
        console.warn('[COMPARISON_MATRIX] Écouteur Firestore notice :', error);
        onUpdate(getCachedComparisonMatrix());
      }
    );
  } catch (err) {
    console.warn('[COMPARISON_MATRIX] Erreur init écouteur :', err);
    onUpdate(getCachedComparisonMatrix());
    return () => {};
  }
}

/**
 * Enregistrement de la matrice modifiée par le Super Admin sur Firestore
 */
export async function saveComparisonMatrix(
  features: ComparisonFeatureItem[],
  adminEmail?: string
): Promise<void> {
  const payload = {
    features,
    updatedAt: Date.now(),
    updatedBy: adminEmail || 'super_admin'
  };

  setCachedComparisonMatrix(features);
  await setDoc(doc(db, 'platform_settings', 'comparison_matrix'), payload, { merge: true });
}
