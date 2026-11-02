/**
 * @file appRegistrySyncService.ts
 * @description Service de synchronisation bi-directionnelle pour les 38 modules de l'App Registry
 * Assure la synchronisation atomique et en direct entre Supabase (table app_registry) et Firebase (Firestore & RTDB).
 */

import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, get as rtdbGet } from 'firebase/database';
import { db, rtdb } from '../firebase';

export interface AppRegistryModule {
  id?: string;
  num: number;
  key: string;
  name: string;
  defaultName: string;
  description: string;
  category: string;
  section: 1 | 2 | 3 | 4;
  sectionName: string;
  edgeFile: string;
  routes: string[];
  is_active: boolean;
  is_public: boolean;
  updated_at?: string;
}

export const DEFAULT_38_MODULES: AppRegistryModule[] = [
  // SECTION 1 : Front-Office & Applications Métiers (Modules 1 à 13)
  {
    num: 1,
    key: 'app_pos',
    name: 'Caisse Tactile Magasin (NaNa POS)',
    defaultName: 'Caisse Tactile Magasin (NaNa POS)',
    description: 'Gestion du tiroir-caisse, encaissement rapide et tickets de caisse.',
    category: 'Commerce',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-pos.js',
    routes: ['/api/pos/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 2,
    key: 'app_studio',
    name: 'Vitrine en Ligne E-Shop (*.nsore.shop)',
    defaultName: 'Vitrine en Ligne E-Shop (*.nsore.shop)',
    description: 'Boutique e-commerce personnalisable et catalogues marchands.',
    category: 'Commerce',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-studio.js',
    routes: ['*.nsore.shop', '/api/studio/*', '/shop/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 3,
    key: 'app_wameet',
    name: 'WaMeet Réseau Pro & Messagerie',
    defaultName: 'WaMeet Réseau Pro & Messagerie',
    description: 'Salons audio/vidéo professionnels, networking et messagerie instantanée.',
    category: 'Communication',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-wameet.js',
    routes: ['/wameet/*', '/api/wameet/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 4,
    key: 'app_nanagenerator',
    name: 'NaNa Générateur IA',
    defaultName: 'NaNa Générateur IA',
    description: 'Génération de fiches produits, visuels et descriptions marketing par IA.',
    category: 'IA & Création',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-nanagenerator.js',
    routes: ['/api/nanagenerator/*', '/api/ai/nanagenerator*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 5,
    key: 'app_tinnela',
    name: 'NaNa AI Studio & Avatars',
    defaultName: 'NaNa AI Studio & Avatars',
    description: 'Studio d’assistants IA conversationnels et tuteurs virtuels interactifs.',
    category: 'IA & Création',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-tinnela.js',
    routes: ['/api/tinnela/*', '/api/nana-ai/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 6,
    key: 'app_liveshopping',
    name: 'Live Shopping & Ventes Flash',
    defaultName: 'Live Shopping & Ventes Flash',
    description: 'Diffusion en direct avec achat interactif et enchères/farotage.',
    category: 'Vente Directe',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-liveshopping.js',
    routes: ['/api/liveshopping/*', '/live/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 7,
    key: 'app_signature',
    name: 'Signature Numérique & Contrats',
    defaultName: 'Signature Numérique & Contrats',
    description: 'Émargement légal électronique et génération de documents probants.',
    category: 'Juridique',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-signature.js',
    routes: ['/api/signature/*', '/sign/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 8,
    key: 'app_lms',
    name: 'Académie & Formation LMS',
    defaultName: 'Académie & Formation LMS',
    description: 'Plateforme e-learning, modules de cours, quiz et certifications.',
    category: 'Formation',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-lms.js',
    routes: ['/api/lms/*', '/api/courses/*', '/academy/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 9,
    key: 'app_funnels',
    name: 'Tunnels de Vente & Funnels (12 Blocs)',
    defaultName: 'Tunnels de Vente & Funnels (12 Blocs)',
    description: 'Tunnels de conversion optimisés pour la commande 1-clic.',
    category: 'Conversion',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-funnels.js',
    routes: ['/api/funnels/*', '/funnel/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 10,
    key: 'app_scanner',
    name: 'Scanner Douchette & Code-Barres KV',
    defaultName: 'Scanner Douchette & Code-Barres KV',
    description: 'Vérification ultra-rapide des stocks (< 5 ms) par lecture de code-barres.',
    category: 'Logistique',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-scanner.js',
    routes: ['/api/pos/scan*', '/api/scanner/*', '/api/barcode/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 11,
    key: 'app_webinar',
    name: 'Studio Live & Webinaires',
    defaultName: 'Studio Live & Webinaires',
    description: 'Salles de conférence et masterclasses en direct pour créateurs.',
    category: 'Événements',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-webinar.js',
    routes: ['/api/webinar/*', '/webinar/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 12,
    key: 'app_docusign',
    name: 'DocuSign Hub & Contrats Signés',
    defaultName: 'DocuSign Hub & Contrats Signés',
    description: 'Stockage, vérification d’authenticité et archivage des accords.',
    category: 'Juridique',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-docusign.js',
    routes: ['/api/docusign/*', '/docusign/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 13,
    key: 'app_invoices_orders',
    name: 'Bons de Commande, Devis & Facturation',
    defaultName: 'Bons de Commande, Devis & Facturation',
    description: 'Émission et suivi des devis, factures normalisées et commandes clients.',
    category: 'Finance',
    section: 1,
    sectionName: 'Front-Office & Applications Métiers',
    edgeFile: 'app-invoices-orders.js',
    routes: ['/api/invoices-orders/*', '/quote/*', '/order/*'],
    is_active: true,
    is_public: true,
  },

  // SECTION 2 : Services & Intégrations Plateforme (Modules 14 à 22)
  {
    num: 14,
    key: 'srv_crm_automation',
    name: 'CRM Commercial & Automatisation',
    defaultName: 'CRM Commercial & Automatisation',
    description: 'Suivi du pipeline de vente, segmentation et relances clients.',
    category: 'Marketing',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-crm-automation.js',
    routes: ['/api/crm/*', '/webhooks/crm/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 15,
    key: 'srv_theme_builder',
    name: 'Choix & Construction de Thèmes',
    defaultName: 'Choix & Construction de Thèmes',
    description: 'Moteur de personnalisation graphique (couleurs, polices, vitrines).',
    category: 'Personnalisation',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-theme-builder.js',
    routes: ['/api/themes/*', '/api/theme-builder/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 16,
    key: 'srv_sms',
    name: 'Campagnes Marketing & SMS Directs',
    defaultName: 'Campagnes Marketing & SMS Directs',
    description: 'Envoi de SMS transactionnels, alertes de solde et blast marketing.',
    category: 'Marketing',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-sms.js',
    routes: ['/api/sms/*', '/api/marketing/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 17,
    key: 'srv_delivery',
    name: 'Livraisons & Suivi Heatmap en Direct',
    defaultName: 'Livraisons & Suivi Heatmap en Direct',
    description: 'Cartographie interactive des courses, livreurs et zones chaudes.',
    category: 'Logistique',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-delivery.js',
    routes: ['/api/delivery/*', '/delivery/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 18,
    key: 'srv_payment',
    name: 'Passerelles Mobile Money & Paiement',
    defaultName: 'Passerelles Mobile Money & Paiement',
    description: 'Intégration Wave, Orange Money, MTN MoMo, Moov et cartes bancaires.',
    category: 'Paiement',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-payment.js',
    routes: ['/api/payment/*', '/api/mobile-money/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 19,
    key: 'srv_partner',
    name: 'Espace Partenaire & Affiliation',
    defaultName: 'Espace Partenaire & Affiliation',
    description: 'Gestion des liens affiliés, parrainage et calcul des commissions.',
    category: 'Partenariat',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-partner.js',
    routes: ['/api/partner/*', '/ref/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 20,
    key: 'srv_course_create',
    name: 'Création de Cours & Structuration LMS',
    defaultName: 'Création de Cours & Structuration LMS',
    description: 'Studio de conception pédagogique pour formateurs et instructeurs.',
    category: 'Formation',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-course-create.js',
    routes: ['/api/course-create/*', '/courses/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 21,
    key: 'srv_nana_switch',
    name: 'NaNa Switch Cloud Multi-Comptes',
    defaultName: 'NaNa Switch Cloud Multi-Comptes',
    description: 'Bascule instantanée entre différentes boutiques et organisations.',
    category: 'Multi-Tenant',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-nana-switch.js',
    routes: ['/api/nana-switch/*', '/switch-store/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 22,
    key: 'srv_wameet_media',
    name: 'Streaming Vidéo WaMeet & Support VIP',
    defaultName: 'Streaming Vidéo WaMeet & Support VIP',
    description: 'Amorçage vidéo instantané à l’Edge (HLS) et billetterie de support prioritaire.',
    category: 'Media & Support',
    section: 2,
    sectionName: 'Services & Intégrations Plateforme',
    edgeFile: 'srv-wameet-media.js',
    routes: ['/api/wameet/*', '/wameet/reels*', '/support/vip/*'],
    is_active: true,
    is_public: true,
  },

  // SECTION 3 : Gestion & Back-Office Marchand (Modules 23 à 32)
  {
    num: 23,
    key: 'mod_inventory',
    name: 'Stock & Inventaire Intelligent',
    defaultName: 'Stock & Inventaire Intelligent',
    description: 'Alertes de réapprovisionnement, alertes péremption et mouvements de stocks.',
    category: 'Gestion Stock',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-inventory.js',
    routes: ['/api/inventory/*', '/inventory/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 24,
    key: 'mod_booking',
    name: 'Système de Réservation & Rendez-vous',
    defaultName: 'Système de Réservation & Rendez-vous',
    description: 'Calendrier en ligne, créneaux horaires pour prestations et services.',
    category: 'Agenda',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-booking.js',
    routes: ['/api/booking/*', '/booking/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 25,
    key: 'mod_subscriptions',
    name: 'Facturation Récurrente & Abonnements',
    defaultName: 'Facturation Récurrente & Abonnements',
    description: 'Gestion des plans d’adhésion, renouvellements et accès membres.',
    category: 'Abonnements',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-subscriptions.js',
    routes: ['/api/subscriptions/*', '/subscriptions/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 26,
    key: 'mod_debts',
    name: 'Gestion des Dettes & Cahier d’Ardoises',
    defaultName: 'Gestion des Dettes & Cahier d’Ardoises',
    description: 'Suivi des créances clients, échéances et rappels automatiques.',
    category: 'Finance Client',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-debts.js',
    routes: ['/api/debts/*', '/debts/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 27,
    key: 'mod_ads_manager',
    name: 'Campagnes d’Affichage & Ads',
    defaultName: 'Campagnes d’Affichage & Ads',
    description: 'Régie publicitaire interne, bannières et mise en avant de produits.',
    category: 'Publicité',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-ads-manager.js',
    routes: ['/api/ads/*', '/ads/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 28,
    key: 'mod_contracts',
    name: 'Modèles de Contrats & CGV Juridiques',
    defaultName: 'Modèles de Contrats & CGV Juridiques',
    description: 'Bibliothèque de clauses types, contrats de vente et accords de partenariat.',
    category: 'Juridique',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-contracts.js',
    routes: ['/api/contracts/*', '/contracts/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 29,
    key: 'mod_suppliers',
    name: 'Fournisseurs & Achats Grossistes',
    defaultName: 'Fournisseurs & Achats Grossistes',
    description: 'Annuaire des grossistes, bons d’achat et approvisionnements groupés.',
    category: 'Achats',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-suppliers.js',
    routes: ['/api/suppliers/*', '/suppliers/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 30,
    key: 'mod_payroll',
    name: 'Gestion de la Paie & Pointage Présences',
    defaultName: 'Gestion de la Paie & Pointage Présences',
    description: 'Fiches de paie, avances sur salaire et pointage des caissiers/employés.',
    category: 'RH',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-payroll.js',
    routes: ['/api/payroll/*', '/payroll/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 31,
    key: 'mod_treasury',
    name: 'Suivi Budgétaire & Trésorerie',
    defaultName: 'Suivi Budgétaire & Trésorerie',
    description: 'Flux de trésorerie quotidien, entrées/sorties et prévisionnel financier.',
    category: 'Trésorerie',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-treasury.js',
    routes: ['/api/treasury/*', '/treasury/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 32,
    key: 'mod_loyalty',
    name: 'Fidélisation & Récompenses VIP',
    defaultName: 'Fidélisation & Récompenses VIP',
    description: 'Barèmes de points de fidélité, paliers clients et remises exclusives.',
    category: 'Fidélité',
    section: 3,
    sectionName: 'Gestion & Back-Office Marchand',
    edgeFile: 'mod-loyalty.js',
    routes: ['/api/loyalty/*', '/loyalty/*'],
    is_active: true,
    is_public: true,
  },

  // SECTION 4 : Analytique, Sécurité & Automatisation (Modules 33 à 38)
  {
    num: 33,
    key: 'srv_analytics',
    name: 'Tableau de Bord Analytique & Stats',
    defaultName: 'Tableau de Bord Analytique & Stats',
    description: 'Distribution des KPI, rapports de ventes agrégés et métriques marchandes.',
    category: 'Analytique',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-analytics.js',
    routes: ['/api/analytics/*', '/analytics/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 34,
    key: 'srv_search_engine',
    name: 'Moteur de Recherche Global & Indexation',
    defaultName: 'Moteur de Recherche Global & Indexation',
    description: 'Recherche ultra-rapide des catalogues et articles directement à l’Edge.',
    category: 'Recherche',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-search-engine.js',
    routes: ['/api/search/*', '/search/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 35,
    key: 'srv_workflows',
    name: 'Workflows & Déclencheurs Cloud',
    defaultName: 'Workflows & Déclencheurs Cloud',
    description: 'Déclencheurs d’actions automatisées (ex: vente ➔ SMS ➔ déstockage).',
    category: 'Automatisation',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-workflows.js',
    routes: ['/api/workflows/*', '/workflows/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 36,
    key: 'srv_webhooks',
    name: 'Gestion des Événements & Webhooks Sortants',
    defaultName: 'Gestion des Événements & Webhooks Sortants',
    description: 'Envoi de notifications HTTP vers les systèmes externes des marchands.',
    category: 'Intégration',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-webhooks.js',
    routes: ['/api/webhooks/*', '/webhooks/*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 37,
    key: 'srv_health',
    name: 'Monitoring de Santé & Health Checks',
    defaultName: 'Monitoring de Santé & Health Checks',
    description: 'Circuit breaker et statut de disponibilité générale du système (< 5 ms).',
    category: 'Surveillance',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-health.js',
    routes: ['/health', '/ping', '/api/health*'],
    is_active: true,
    is_public: true,
  },
  {
    num: 38,
    key: 'srv_router',
    name: 'Routeur Global & Failover d’Urgence',
    defaultName: 'Routeur Global & Failover d’Urgence',
    description: 'Filet de sécurité global, bascule en mode dégradé ou catalogue statique.',
    category: 'Infrastructure',
    section: 4,
    sectionName: 'Analytique, Sécurité & Automatisation',
    edgeFile: 'srv-router.js',
    routes: ['/*', '/api/*'],
    is_active: true,
    is_public: true,
  },
];

const LOCAL_STORAGE_KEY = 'nanasore_app_registry_custom_modules';

/**
 * Charge les 38 modules avec fusion des personnalisations depuis :
 * 1. Supabase (/api/modules)
 * 2. Firebase Firestore (collection 'app_registry')
 * 3. LocalStorage (cache hors-ligne)
 */
export async function loadAppRegistryModules(): Promise<{
  modules: AppRegistryModule[];
  source: 'SUPABASE' | 'FIREBASE' | 'LOCAL';
  supabaseOnline: boolean;
  firebaseOnline: boolean;
}> {
  let supabaseOnline = false;
  let firebaseOnline = false;
  const mergedMap = new Map<string, Partial<AppRegistryModule>>();

  // 1. Charger depuis le cache local pour réactivité immédiate
  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        parsed.forEach((m: any) => {
          if (m?.key) mergedMap.set(m.key, m);
        });
      }
    }
  } catch (e) {
    console.warn('[AppRegistry] Erreur lecture cache local :', e);
  }

  // 2. Charger depuis Supabase via l'API Express
  try {
    const resp = await fetch('/api/modules');
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.registry)) {
        json.registry.forEach((item: any) => {
          if (item?.key) {
            mergedMap.set(item.key, {
              ...mergedMap.get(item.key),
              name: item.name,
              description: item.description,
              category: item.category,
              is_public: item.is_public ?? true,
              updated_at: item.updated_at,
            });
          }
        });
        supabaseOnline = true;
      }
    }
  } catch (err) {
    console.warn('[AppRegistry] Supabase API injoignable :', err);
  }

  // 3. Charger depuis Firebase Firestore
  try {
    const querySnapshot = await getDocs(collection(db, 'app_registry'));
    if (!querySnapshot.empty) {
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const key = docSnap.id || data.key;
        if (key) {
          mergedMap.set(key, {
            ...mergedMap.get(key),
            name: data.name,
            description: data.description,
            category: data.category,
            is_active: data.is_active ?? true,
            is_public: data.is_public ?? true,
            updated_at: data.updatedAt || data.updated_at,
          });
        }
      });
      firebaseOnline = true;
    } else {
      firebaseOnline = true; // Connexion OK mais collection vide pour le moment
    }
  } catch (err) {
    console.warn('[AppRegistry] Firestore injoignable :', err);
  }

  // 4. Assembler la liste complète des 38 modules
  const finalModules = DEFAULT_38_MODULES.map((base) => {
    const custom = mergedMap.get(base.key);
    return {
      ...base,
      name: custom?.name || base.name,
      description: custom?.description || base.description,
      category: custom?.category || base.category,
      is_active: custom?.is_active ?? base.is_active,
      is_public: custom?.is_public ?? base.is_public,
      updated_at: custom?.updated_at,
    };
  });

  return {
    modules: finalModules,
    source: supabaseOnline ? 'SUPABASE' : firebaseOnline ? 'FIREBASE' : 'LOCAL',
    supabaseOnline,
    firebaseOnline,
  };
}

/**
 * Sauvegarde et synchronise un module simultanément dans Supabase et Firebase
 */
export async function syncAppRegistryModule(mod: AppRegistryModule): Promise<{
  success: boolean;
  supabaseSynced: boolean;
  firebaseSynced: boolean;
  error?: string;
}> {
  let supabaseSynced = false;
  let firebaseSynced = false;
  const nowIso = new Date().toISOString();

  // 1. Sauvegarde dans Firebase Firestore
  try {
    const docRef = doc(db, 'app_registry', mod.key);
    await setDoc(
      docRef,
      {
        key: mod.key,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        num: mod.num,
        section: mod.section,
        edgeFile: mod.edgeFile,
        routes: mod.routes,
        is_active: mod.is_active,
        is_public: mod.is_public,
        updatedAt: nowIso,
        serverTimestamp: serverTimestamp(),
      },
      { merge: true }
    );

    // Synchronisation miroir dans Firebase RTDB pour l'Omnibar
    try {
      const rtdbNode = rtdbRef(rtdb, `app_registry/${mod.key}`);
      await rtdbSet(rtdbNode, {
        key: mod.key,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        updatedAt: nowIso,
      });
    } catch (rtdbErr) {
      console.warn('[AppRegistry RTDB Sync Warning]', rtdbErr);
    }

    firebaseSynced = true;
  } catch (fbErr: any) {
    console.error('[AppRegistry Firebase Error]', fbErr);
  }

  // 2. Sauvegarde dans Supabase via l'API Express
  try {
    const resp = await fetch('/api/modules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blockKey: mod.key,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        isActive: mod.is_active,
        is_public: mod.is_public,
        settings: {
          num: mod.num,
          section: mod.section,
          edgeFile: mod.edgeFile,
          routes: mod.routes,
        },
      }),
    });

    if (resp.ok) {
      const json = await resp.json();
      if (json.success) {
        supabaseSynced = true;
      }
    }
  } catch (sbErr: any) {
    console.error('[AppRegistry Supabase Error]', sbErr);
  }

  // 3. Mise à jour du cache local
  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: AppRegistryModule[] = rawLocal ? JSON.parse(rawLocal) : [];
    const index = list.findIndex((m) => m.key === mod.key);
    const updatedMod = { ...mod, updated_at: nowIso };
    if (index >= 0) {
      list[index] = updatedMod;
    } else {
      list.push(updatedMod);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (locErr) {
    console.warn('[AppRegistry Local Cache Error]', locErr);
  }

  return {
    success: supabaseSynced || firebaseSynced,
    supabaseSynced,
    firebaseSynced,
  };
}

/**
 * Sauvegarde l'ensemble des 38 modules en une seule opération
 */
export async function syncAllAppRegistryModules(modules: AppRegistryModule[]): Promise<{
  success: boolean;
  total: number;
  syncedCount: number;
  supabaseSynced: boolean;
  firebaseSynced: boolean;
}> {
  let count = 0;
  let allSb = true;
  let allFb = true;

  for (const mod of modules) {
    const res = await syncAppRegistryModule(mod);
    if (res.success) count++;
    if (!res.supabaseSynced) allSb = false;
    if (!res.firebaseSynced) allFb = false;
  }

  return {
    success: count > 0,
    total: modules.length,
    syncedCount: count,
    supabaseSynced: allSb,
    firebaseSynced: allFb,
  };
}
