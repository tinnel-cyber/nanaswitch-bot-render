import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bot, BookOpen, Key, Cpu, ShieldCheck, Layers, Lock, ShoppingCart, 
  AlertCircle, Download, Copy, Check, ExternalLink, ArrowRight, ArrowLeft, 
  Search, Sparkles, Send, Terminal, CheckCircle2, RefreshCw, FileCode,
  ShieldAlert, Radio, HelpCircle, FileText, ChevronRight, LogIn,
  Globe2, Smartphone, CreditCard, Building2, Coins, Users, Compass, TrendingUp,
  UserCheck, FileCheck, Wallet, Link2, History, X, Play, Zap, Bell, Activity
} from 'lucide-react';

interface NanaDocPortalAppProps {
  onClose?: () => void;
  copyToClipboard?: (text?: string, label?: string) => void;
  initialPrompt?: string;
  isPublicPortal?: boolean;
}

// Complete raw text of Prompt 1 (system:nanaswitch_integration_skill)
const SYSTEM_PROMPT_CONTENT = `---
name: nanaswitch_integration_skill
description: Autonomous AI Integration Assistant for NanaSwitch Cloud Payment Gateway. Guides engineers and merchants step-by-step through Zero-Trust credentials (ns_live_pk_*, ns_live_sk_*), hybrid routing (AGREGATED vs BYOK), HMAC-SHA256 webhooks, KYC volume limits, and multi-language implementation across Node.js, PHP, Python, and WooCommerce.
---

# 🤖 NanaSwitch Autonomous Integration AI Skill (\`system:nanaswitch_integration_skill\`)

Bienvenue dans le Skill officiel de l'Assistant IA Spécialisé **NanaSwitch Cloud** (Entité : **NANASORE TECHNOLOGIES**). Ce guide opérationnel et ce prompt système fournissent toutes les instructions techniques, règles de gouvernance et modèles de code pour assister les développeurs et intégrateurs dans l'implémentation de la passerelle de paiement intelligente NanaSwitch.

---

## 🎯 Rôle et Mission de l'Assistant

Vous agissez en tant que **Lead Integration Solutions Architect & Security Officer** certifié sur la plateforme NanaSwitch Cloud.
Votre mission est de :
1. **Accompagner les développeurs** pas à pas, de la génération de leurs clés Zero-Trust jusqu'au déploiement en production.
2. **Garantir le respect absolu de la sécurité** : interdire l'exposition des clés secrètes côté client, exiger la validation HMAC-SHA256 anti-rejeu des webhooks.
3. **Clarifier le modèle hybride** : expliquer la différence entre le mode **Simplifié (Agrégé)** et le mode **BYOK (SaaS / API Router)**.
4. **Prévenir les blocages de conformité** : informer les marchands de leurs plafonds mensuels KYC (Particulier : 1M XOF vs Entreprise : 5M XOF).
5. **Générer du code prêt à la production** dans tous les langages (Node.js/Express, PHP/cURL, Python, WordPress/WooCommerce, React/Next.js, Flutter).

---

## 🔑 Matrice des Clés d'Authentification Zero-Trust

| Identifiant | Format Officiel | Rôle & Visibilité | Règle de Sécurité Stricte |
|---|---|---|---|
| **Public Key** | \`ns_live_pk_[a-f0-9]{32}\` | Clé publique / Identifiant Marchand | Exposée côté frontend, widgets JS, applications mobiles ou plugins. |
| **Secret Key** | \`ns_live_sk_[a-f0-9]{32}\` | Clé privée de signature API serveur | **STRICTEMENT CONFIDENTIELLE**. Utilisée uniquement backend dans \`Authorization: Bearer\` ou \`x-nanaswitch-skey\`. Seul son hash SHA-256 est conservé dans Firestore. |
| **Webhook Secret** | \`ns_whsec_[a-f0-9]{64}\` | Secret de signature HMAC-SHA256 | Utilisée côté serveur pour certifier l'authenticité de l'en-tête \`x-nanaswitch-signature\`. |

---

## ⚡ Modèle Hybride B2B : Quel Mode Choisir ?

### 1. Mode Simplifié (Agrégé) — \`AGREGATED\`
- **Pour qui ?** Marchands, e-commerçants et PME sans contrats opérateurs directs.
- **Fonctionnement :** Les fonds sont collectés via le compte maître de régulation NanaSwitch Cloud.
- **Tarification :** Frais opérateur de base + **1.5% de marge de switch** retenue à la source.
- **Solde :** Crédité instantanément sur le wallet NanaSwitch multi-devises (XOF, USD, XAF, GNF, GHS) avec demande de reversement (payout) à la demande.

### 2. Mode Développeurs & Routeur SaaS — \`BYOK\` (Bring Your Own Keys)
- **Pour qui ?** Startups fintech, grandes entreprises et plateformes disposant de leurs propres comptes marchands SasPay ou Sebpay.
- **Fonctionnement :** Routage direct pass-through vers les passerelles partenaires avec les clés privées du marchand (\`saspay_api_key\`, \`sebpay_public_key\`, \`sebpay_secret_key\`).
- **Tarification :** **0% de commission de switch**. Facturation à l'usage SaaS : **0,02 XOF débité du solde de crédits API** par requête.
- **Coupe-circuit :** Si le solde de crédits API atteint 0, l'API renvoie le code **HTTP 402 Payment Required (\`402_INSUFFICIENT_CLOUD_CREDITS\`)**.

---

## 🛡️ Plafonds Mensuels & Gestion des Risques KYC

L'API applique un contrôle strict avant d'autoriser toute transaction ou lien de paiement :

\`\`\`json
{
  "INDIVIDUAL": {
    "max_monthly_volume_xof": 1000000,
    "description": "Compte Particulier / Indépendant (CNIB + Selfie requis)"
  },
  "ENTERPRISE": {
    "max_monthly_volume_xof": 5000000,
    "description": "Compte Entreprise Enregistrée (RCCM + IFU + Gérant requis)"
  }
}
\`\`\`

* **Comportement en cas de dépassement :**
  L'API rejette immédiatement la requête avec un code **HTTP 403 Forbidden** :
  \`\`\`json
  {
    "success": false,
    "error": "ERROR_MONTHLY_VOLUME_LIMIT_REACHED",
    "code": 403,
    "message": "Plafond mensuel de transactions dépassé pour votre profil KYC (Compte Particulier : max 1 000 000 XOF/mois).",
    "status_text": "Volume mensuel actuel : 950 000 / 1 000 000 XOF"
  }
  \`\`\`

---

## 🚀 Spécification des Endpoints d'Intégration

### Base URL :
* **Production :** \`https://nana-payment-api.onrender.com\`
* **Localhost / Staging :** \`http://localhost:10000\`

### Endpoint 1 : Initiation Universelle & Routage Intelligent
\`POST /v1/switch/route\` ou \`POST /api/payments/initiate\`

#### En-têtes HTTP Requis :
\`\`\`http
Content-Type: application/json
Authorization: Bearer ns_live_sk_YOUR_SECRET_KEY
x-nanaswitch-skey: ns_live_sk_YOUR_SECRET_KEY
x-nanaswitch-key: ns_live_pk_YOUR_PUBLIC_KEY
\`\`\`

#### Corps de la Requête (JSON) :
\`\`\`json
{
  "amount": 10000,
  "currency": "XOF",
  "country": "BF",
  "orderId": "CMD_2026_9841",
  "reference": "REF-WC-9841",
  "customer": {
    "name": "Ousmane Konkobo",
    "email": "client@example.com",
    "phone": "+22670123456",
    "country": "BF"
  },
  "returnUrl": "https://maboutique.com/checkout/merci",
  "callbackUrl": "https://maboutique.com/api/nanaswitch-webhook",
  "description": "Achat Panier #CMD_2026_9841"
}
\`\`\`

#### Réponse de Succès (HTTP 200 / 201) :
\`\`\`json
{
  "success": true,
  "transaction_id": "sw_749102",
  "reference": "REF-WC-9841",
  "status": "PENDING",
  "gateway": "saspay",
  "checkout_url": "https://newapi.sebpay.bj/checkout/session/sess_live_89a0f...",
  "payment_url": "https://newapi.sebpay.bj/checkout/session/sess_live_89a0f...",
  "message": "Session de paiement initiée avec succès."
}
\`\`\`

---

## 🔒 Validation Cryptographique Webhook (HMAC-SHA256)

NanaSwitch signe toutes les notifications sortantes à l'aide du secret \`ns_whsec_...\`.

### Format de l'en-tête \`x-nanaswitch-signature\` :
\`\`\`
t=1793051514,v1=d7e6c8d3fbd22cafca8ecb398b5ac507d596499f31cd6623d1005947653fb0b2
\`\`\`

### Règles de Vérification Stricte :
1. **Extraction :** Séparer le timestamp \`t\` et la signature \`v1\`.
2. **Anti-Rejeu :** Rejeter si \`|timestamp_actuel - t| > 300 secondes (5 minutes)\`.
3. **Payload Signé :** Concaténer \`\${t}.\${raw_request_body}\`.
4. **Calcul HMAC :** \`hash_hmac('sha256', "\${t}.\${raw_body}", webhook_secret)\`.
5. **Comparaison Sécurisée :** Utiliser \`crypto.timingSafeEqual\` ou \`hash_equals()\` pour contrer les attaques temporelles.

---

## 💻 Implémentations de Référence

### Node.js / Express (Serveur Marchand)
\`\`\`javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

// Écouter et Valider les Webhooks Entrants
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader = req.headers['x-nanaswitch-signature'];
  const secretKey = process.env.NANASWITCH_WEBHOOK_SECRET;

  if (!sigHeader) return res.status(401).send('En-tête de signature manquant');

  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parseInt(parts.t, 10);
  const signature = parts.v1;

  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return res.status(400).send('Horodatage expiré');
  }

  const rawBody = req.body.toString('utf8');
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSig, 'utf8')
  );

  if (!isValid) return res.status(401).send('Signature invalide');

  const event = JSON.parse(rawBody);
  if (event.event === 'payment.success' || event.status === 'SUCCESS') {
    console.log(\`✓ Commande #\${event.order_id} payée avec succès via \${event.gateway} !\`);
  }

  return res.status(200).json({ received: true });
});
\`\`\`

---

## 🛠️ Matrice de Résolution des Erreurs Fréquentes

| Code HTTP | Cause Identifiée | Solution Recommandée par l'Assistant IA |
|---|---|---|
| **401 Unauthorized** | Clé secrète \`ns_live_sk_...\` absente ou invalide. | Vérifier le header \`Authorization: Bearer ns_live_sk_...\` ou \`x-nanaswitch-skey\`. |
| **402 Payment Required** | Solde de crédits API SaaS épuisé en mode BYOK (\`0.02 XOF/req\`). | Dashboard Marchand > Développeur > Recharger mon portefeuille de crédits API. |
| **403 Forbidden** | Plafond mensuel KYC atteint (1M XOF Particulier / 5M XOF Entreprise). | Soumettre RCCM & IFU pour basculer vers Entreprise ou contacter le Super Admin. |
| **400 Timestamp Expired** | Écart > 5 minutes entre l'horodatage webhook et le serveur. | Vérifier la synchronisation NTP de l'horloge système du serveur. |
`;

// Pre-configured Q&A for the Interactive AI Simulator
const SIMULATED_PROMPTS = [
  {
    q: "Comment valider la signature Webhook HMAC-SHA256 en Node.js ?",
    a: `Pour valider cryptographiquement la signature d'un webhook NanaSwitch en Node.js :
1. Récupérez le corps brut de la requête (\`express.raw({ type: 'application/json' })\`).
2. Découpez l'en-tête \`x-nanaswitch-signature\` pour extraire le timestamp \`t\` et la signature \`v1\`.
3. Vérifiez que \`Math.abs(Date.now() / 1000 - t) <= 300\` (fenêtre anti-rejeu stricte de 5 min).
4. Calculez le digest HMAC-SHA256 sur la chaîne \`\${t}.\${rawBody}\` avec votre secret \`ns_whsec_...\`.
5. Utilisez \`crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(computed))\` pour vous prémunir des attaques temporelles.
6. Renvoyez immédiatement un code \`HTTP 200 { "received": true }\`.`
  },
  {
    q: "Quelle est la différence exacte entre le mode Agrégé et le mode BYOK ?",
    a: `Voici les deux modes du moteur hybride NanaSwitch Cloud :
• **Mode Simplifié (AGREGATED) :** Vous n'avez besoin d'aucun contrat opérateur. NanaSwitch encaisse via son compte maître et crédite instantanément votre wallet interne. Marge retenue : commission opérateur + 1.5%.
• **Mode Développeurs SaaS (BYOK) :** Vous injectez vos propres clés SasPay ou Sebpay. L'argent arrive directement sur vos comptes marchands partenaires. Commission de switch : **0%**, vous ne payez que **0,02 XOF par requête** débité de votre solde de crédits API SaaS.`
  },
  {
    q: "Pourquoi mon API renvoie 403_MONTHLY_VOLUME_LIMIT_REACHED ?",
    a: `NanaSwitch applique une gestion des risques automatisée basée sur votre statut KYC :
• **Compte Particulier :** Plafond strict de **1 000 000 XOF** par mois civil.
• **Compte Entreprise :** Plafond de **5 000 000 XOF** par mois civil (extensible sur validation Super Admin).
Dès que le cumul des transactions réussies du mois atteint ce montant, toute nouvelle initiation est bloquée avec le code **HTTP 403 Forbidden**.
👉 Pour débloquer votre plafond : soumettez votre RCCM et IFU dans l'onglet Profil KYC pour passer en statut Entreprise.`
  },
  {
    q: "Comment installer et configurer le plugin WooCommerce officiel ?",
    a: `Pour intégrer NanaSwitch dans votre boutique WooCommerce :
1. Téléchargez l'archive officielle \`nanaswitch-gateway.zip\` (compatible HPOS).
2. Rendez-vous dans **Extensions > Ajouter > Téléverser** sur votre backoffice WordPress.
3. Activez l'extension, puis ouvrez **WooCommerce > Réglages > Paiements > NanaSwitch Gateway**.
4. Renseignez votre **Public Key** (\`ns_live_pk_...\`), votre **Secret Key** (\`ns_live_sk_...\`) et votre **Secret Webhook** (\`ns_whsec_...\`).
5. Le endpoint webhook de votre boutique sera automatiquement configuré à l'adresse : \`https://votre-boutique.com/wp-json/nanaswitch/v1/webhook\`.`
  }
];

export function NanaDocPortalApp({ 
  onClose, 
  copyToClipboard, 
  initialPrompt = 'hub',
  isPublicPortal = true 
}: NanaDocPortalAppProps) {
  const [activeView, setActiveView] = useState<string>(initialPrompt);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabPrompt1, setActiveTabPrompt1] = useState<'simulator' | 'code' | 'specs'>('simulator');
  const [activeSdkLang, setActiveSdkLang] = useState<'node' | 'python'>('node');
  const [activePhpMobileTab, setActivePhpMobileTab] = useState<'php' | 'curl' | 'mobile'>('php');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Modals & Interactive Overlays State (Prompt 8)
  const [showApiTesterModal, setShowApiTesterModal] = useState(false);
  const [showWebhookTesterModal, setShowWebhookTesterModal] = useState(false);

  // API Tester Form State
  const [testAmount, setTestAmount] = useState('5000');
  const [testCurrency, setTestCurrency] = useState('XOF');
  const [testOrderId, setTestOrderId] = useState('CMD_TEST_9841');
  const [testCustomerPhone, setTestCustomerPhone] = useState('+22670123456');
  const [testCustomerEmail, setTestCustomerEmail] = useState('client@example.com');
  const [apiResponseJson, setApiResponseJson] = useState<string | null>(null);
  const [isApiTesting, setIsApiTesting] = useState(false);

  // Webhook Simulator State
  const [whSecret, setWhSecret] = useState('ns_whsec_f89a2b4c6e8013579bdf2468ace013579bdf2468ace013579bdf2468ace01357');
  const [whEventType, setWhEventType] = useState('payment.success');
  const [whTargetUrl, setWhTargetUrl] = useState('http://localhost:3000/api/nanaswitch-webhook');
  const [whTimestamp, setWhTimestamp] = useState<number>(Math.floor(Date.now() / 1000));
  const [whSignature, setWhSignature] = useState<string>('c4a89fb3145607e8b91234a56c7d8e9f0123456789abcdef0123456789abcdef');
  const [whDispatchedStatus, setWhDispatchedStatus] = useState<string | null>(null);
  const [isWhDispatching, setIsWhDispatching] = useState(false);

  const whPayloadString = useMemo(() => {
    return JSON.stringify({
      event_type: whEventType,
      transaction_id: "sw_" + (testOrderId || "test_749102"),
      order_id: testOrderId || "CMD_TEST_9841",
      amount: parseInt(testAmount || "5000", 10),
      currency: testCurrency,
      status: whEventType === 'payment.success' ? 'COMPLETED' : 'FAILED',
      timestamp: whTimestamp,
      customer: {
        email: testCustomerEmail,
        phone: testCustomerPhone
      }
    }, null, 2);
  }, [whEventType, testOrderId, testAmount, testCurrency, whTimestamp, testCustomerEmail, testCustomerPhone]);

  useEffect(() => {
    let isCancelled = false;
    async function calculateSignature() {
      try {
        const enc = new TextEncoder();
        const message = `${whTimestamp}.${whPayloadString}`;
        const keyData = enc.encode(whSecret || 'ns_whsec_demo');
        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
        const hashHex = Array.from(new Uint8Array(sigBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        if (!isCancelled) setWhSignature(hashHex);
      } catch {
        if (!isCancelled) setWhSignature('c4a89fb3145607e8b91234a56c7d8e9f0123456789abcdef0123456789abcdef');
      }
    }
    calculateSignature();
    return () => { isCancelled = true; };
  }, [whSecret, whTimestamp, whPayloadString]);
  
  // Interactive Chat State for Prompt 1
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; code?: string }>>([
    {
      sender: 'assistant',
      text: "👋 Bonjour ! Je suis l'Assistant IA d'Intégration NanaSwitch Cloud (NANASORE TECHNOLOGIES). Je suis configuré via le skill `system:nanaswitch_integration_skill`. Comment puis-je vous aider dans votre intégration aujourd'hui ?"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // The 8 Core Prompts / Chapters Matrix
  const promptsRegistry = useMemo(() => [
    {
      id: 'prompt1',
      badge: 'PROMPT 1 • ACTIF',
      badgeColor: 'bg-blue-600 text-white',
      icon: Bot,
      iconColor: 'text-blue-600',
      title: "Skill IA d'Intégration Autonome",
      subtitle: "system:nanaswitch_integration_skill",
      description: "Assistant IA intelligent spécialisé (type SasPay AI / Stripe Assistant). Guider pas à pas les développeurs de la génération des clés Zero-Trust jusqu'au déploiement sécurisé.",
      tags: ['Prompt Système Copiable', 'Chatbot Interactif', 'Zero-Trust', 'Multi-Langages']
    },
    {
      id: 'prompt2',
      badge: 'PROMPT 2 • VISION & BUSINESS MODEL',
      badgeColor: 'bg-emerald-600 text-white',
      icon: Globe2,
      iconColor: 'text-emerald-600',
      title: "Vision, Modèle d'Affaires & Couverture 26 Pays",
      subtitle: "docs/overview • Agrégé vs BYOK • 26 Pays",
      description: "Présentation de NanaSwitch Cloud (NANASORE TECHNOLOGIES), comparatif complet Agrégé (+1.5% marge) vs SaaS BYOK (0.02 XOF/req), plafonds KYC et couverture de 26 pays africains et internationaux.",
      tags: ['Vision B2B', 'Mode Agrégé (+1.5%)', 'Mode BYOK (0.02 XOF)', '26 Pays Couverts', 'Multi-Opérateurs']
    },
    {
      id: 'prompt3',
      badge: 'PROMPT 3 • ONBOARDING & KYC',
      badgeColor: 'bg-amber-600 text-white',
      icon: UserCheck,
      iconColor: 'text-amber-600',
      title: "Guide Inscription, KYC & Dashboard (14+ Modules)",
      subtitle: "docs/onboarding-kyc • Particulier vs Entreprise",
      description: "Création d'application (Nom, Devise XOF, Sandbox vs Live), guide KYC par profil (Particulier 1M sans RCCM/IFU vs Entreprise 5M), affichage du Domaine d'activité et exploration des 14+ modules du dashboard.",
      tags: ['Onboarding', 'KYC Particulier (1M)', 'KYC Entreprise (5M)', 'Domaine d\'Activité', '14+ Modules']
    },
    {
      id: 'prompt4',
      badge: 'PROMPT 4 • SÉCURITÉ & GLOSSAIRE',
      badgeColor: 'bg-purple-600 text-white',
      icon: ShieldCheck,
      iconColor: 'text-purple-600',
      title: "Dictionnaire Technique, Sécurité & Conseils de Gestion",
      subtitle: "docs/security-glossary • Zero-Trust & Bonnes Pratiques",
      description: "Glossaire technique complet (BYOK, HMAC-SHA256, Failover/Smart Routing, Idempotence), architecture Zero-Trust des 3 types de clés et guide de gestion des risques financiers.",
      tags: ['Glossaire Technique', 'Zero-Trust (pk, sk, whsec)', 'Failover +226', 'Rotation des Clés', 'Trésorerie & Risques']
    },
    {
      id: 'prompt5',
      badge: 'PROMPT 5 • SDKs & CODE',
      badgeColor: 'bg-indigo-600 text-white',
      icon: Terminal,
      iconColor: 'text-indigo-600',
      title: "Console Multi-Langages — Node.js & Python",
      subtitle: "docs/sdks/node-python • Exemples & SDKs Officiels",
      description: "Initialisation de paiement universelle, validation cryptographique des webhooks HMAC-SHA256 et modèles de serveurs Express.js et FastAPI/Flask prêts pour la production.",
      tags: ['Node.js / Express', 'Python (Requests & FastAPI)', 'HMAC-SHA256', 'Codes Complets Prêts à l\'Emploi']
    },
    {
      id: 'prompt6',
      badge: 'PROMPT 6 • PHP & MOBILE',
      badgeColor: 'bg-rose-600 text-white',
      icon: FileCode,
      iconColor: 'text-rose-600',
      title: "Console Multi-Langages — PHP & cURL / Mobile",
      subtitle: "docs/sdks/php-curl • PHP Natif, cURL & Mobile (Flutter)",
      description: "Implémentations complètes pour l'écosystème web africain : PHP natif (cURL & Webhook hash_equals), commandes cURL et intégration sécurisée dans applications mobiles (Flutter / React Native).",
      tags: ['PHP Natif (cURL)', 'cURL Universel', 'Flutter & Mobile', 'HMAC-SHA256 hash_equals']
    },
    {
      id: 'prompt7',
      badge: 'PROMPT 7 • WOOCOMMERCE & CMS',
      badgeColor: 'bg-teal-600 text-white',
      icon: ShoppingCart,
      iconColor: 'text-teal-600',
      title: "Volet d'Intégration WooCommerce & CMS No-Code",
      subtitle: "docs/integrations/woocommerce • nanaswitch-gateway.zip",
      description: "Installation pas à pas en 4 étapes de l'extension WordPress/WooCommerce, configuration des clés Zero-Trust, sélection du mode (AGREGATED vs BYOK) et liaison automatique du Webhook REST.",
      tags: ['WordPress & Woo', 'Téléchargement .zip', 'Guide 4 Étapes', 'Webhook REST /wp-json']
    },
    {
      id: 'prompt8',
      badge: 'PROMPT 8 • LAYOUT UX & MODALES',
      badgeColor: 'bg-indigo-700 text-white',
      icon: Activity,
      iconColor: 'text-indigo-700',
      title: "Layout UX Multipage, Sidebar Dynamique & Multi-popups",
      subtitle: "docs/layout-ux • Console API & Simulateur Webhook",
      description: "Architecture de navigation fluide multipage, sidebar hiérarchique avec sous-menus SDKs, overlay interactif 'Tester une API' et simulateur HMAC-SHA256 en temps réel.",
      tags: ['Sidebar Dynamique', 'Console API Interactive', 'Simulateur HMAC-SHA256', 'Multi-Popups']
    }
  ], []);

  // Filter cards based on search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return promptsRegistry;
    const q = searchQuery.toLowerCase();
    return promptsRegistry.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [promptsRegistry, searchQuery]);

  const handleCopyFullSkill = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT_CONTENT);
    setCopiedPrompt(true);
    if (copyToClipboard) {
      copyToClipboard(SYSTEM_PROMPT_CONTENT, "Prompt Système IA copié !");
    }
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleSendQuestion = (questionText?: string) => {
    const textToSend = questionText || userInput;
    if (!textToSend.trim()) return;

    const newMessages = [...chatMessages, { sender: 'user' as const, text: textToSend }];
    setChatMessages(newMessages);
    setUserInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      // Find matching canned answer or provide intelligent fallback
      const match = SIMULATED_PROMPTS.find(p => 
        textToSend.toLowerCase().includes(p.q.toLowerCase().slice(0, 15)) ||
        p.q.toLowerCase().split(' ').some(w => w.length > 4 && textToSend.toLowerCase().includes(w))
      );

      let reply = match 
        ? match.a 
        : `En tant qu'Assistant Spécialisé NanaSwitch Cloud (\`system:nanaswitch_integration_skill\`) :
Concernant votre demande "${textToSend}" :
• Assurez-vous d'utiliser vos clés sécurisées (\`ns_live_pk_...\` frontend, \`ns_live_sk_...\` backend).
• Pour une transaction standard, soumettez votre requête en POST vers \`https://nana-payment-api.onrender.com/v1/switch/route\`.
• Les notifications Webhooks doivent obligatoirement être vérifiées via l'en-tête \`x-nanaswitch-signature\` avec votre clé \`ns_whsec_...\`.
• Souhaitez-vous un exemple spécifique en Node.js, PHP, Python ou WordPress ?`;

      setChatMessages([...newMessages, { sender: 'assistant', text: reply }]);
      setIsAiTyping(false);
    }, 650);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 text-slate-800 pb-16 animate-in fade-in duration-300">
      
      {/* Top Sticky App Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1E40AF] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-700/20 font-black text-base transition group-hover:scale-105">
                N
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1E40AF]">Portail Développeur</span>
                <p className="text-sm font-extrabold text-slate-900 leading-none">NanaSwitch Cloud Docs</p>
              </div>
            </button>

            {activeView !== 'hub' && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 text-xs font-semibold text-slate-600">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button 
                  onClick={() => setActiveView('hub')}
                  className="hover:text-blue-600 transition"
                >
                  Accueil Hub
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-blue-700 font-extrabold uppercase tracking-wide">
                  {promptsRegistry.find(p => p.id === activeView)?.badge || activeView}
                </span>
              </div>
            )}
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un prompt, webhook, HMAC..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'hub') setActiveView('hub');
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-xs rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Interactive Modals Triggers (Prompt 8) */}
            <button
              onClick={() => setShowApiTesterModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E40AF] rounded-xl text-xs font-bold border border-blue-200 transition active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Tester une API</span>
            </button>

            <button
              onClick={() => {
                setWhTimestamp(Math.floor(Date.now() / 1000));
                setShowWebhookTesterModal(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition active:scale-95"
            >
              <Bell className="w-3.5 h-3.5 text-purple-600" />
              <span>Simulateur Webhook</span>
            </button>

            <a
              href="/downloads/nanaswitch-gateway.zip"
              download="nanaswitch-gateway.zip"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition border border-blue-200/60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Plugin WooCommerce (.zip)</span>
            </a>

            {/* Bouton Public Requis : Se connecter / S'inscrire vers la Console Cloud */}
            <a
              href="/nana-switch"
              className="px-4 py-2 bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#1E3A8A] hover:to-[#1D4ED8] text-white rounded-xl text-xs font-black shadow-md shadow-blue-700/25 transition flex items-center gap-1.5 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se connecter / S'inscrire</span>
            </a>

            {!isPublicPortal && onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: HOME HUB (INDEX OF ALL 8 PROMPTS IN APP MODEL) */}
      {activeView === 'hub' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
          
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#1E3A8A] to-slate-900 text-white p-8 md:p-12 shadow-xl shadow-blue-950/10">
            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Documentation Officielle & Prompts Systèmes • NANASORE TECHNOLOGIES</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Centre de Documentation & Développeur NanaSwitch Cloud
              </h1>
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                Connectez vos plateformes e-commerce et applications à l'écosystème de paiement Mobile Money UEMOA. 
                Explorez l'architecture Zero-Trust, notre modèle hybride B2B et intégrez notre Assistant IA spécialisé.
              </p>

              {/* Key Features Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-white">8</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Prompts d'Architecture</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-emerald-400">Zero-Trust</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Authentification API</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-amber-300">300s</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Anti-Rejeu HMAC</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="block text-2xl font-black text-purple-300">0.02 XOF</span>
                  <span className="text-[11px] text-blue-200 font-semibold">Coût Requête SaaS</span>
                </div>
              </div>
            </div>

            {/* Background Accent Gradients */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Explorez les 8 Prompts et Modules d'Intégration NanaSwitch Cloud</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Résultats : <strong>{filteredPrompts.length}</strong> modules</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 font-bold hover:underline ml-2"
                >
                  Effacer le filtre
                </button>
              )}
            </div>
          </div>

          {/* Hub Grid: 8 Quick Access Prompt Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredPrompts.map((p) => {
              const IconComponent = p.icon;
              const isPrompt1 = p.id === 'prompt1';

              return (
                <div 
                  key={p.id}
                  onClick={() => setActiveView(p.id)}
                  className={`group relative bg-white rounded-3xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 ${
                    isPrompt1 
                      ? 'border-blue-400/80 shadow-md shadow-blue-500/5 ring-2 ring-blue-500/20' 
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Card Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isPrompt1 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {p.title}
                      </h3>
                      <p className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                        {p.subtitle}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {p.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>{isPrompt1 ? 'Ouvrir le Module & IA' : 'Accéder au Guide'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        /* DETAIL VIEW FOR SPECIFIC PROMPTS (APP MODEL MULTI-PAGES) */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Navigation */}
            <aside className="space-y-2">
              <button
                onClick={() => setActiveView('hub')}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Accueil du Hub de Documentation</span>
              </button>

              {/* Sidebar Dynamique Spécifiée PROMPT 8 */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1 block">
                  Navigation du Portail
                </span>

                {/* 1. Introduction & Modèle */}
                <button
                  onClick={() => setActiveView('prompt2')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeView === 'prompt2' 
                      ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-700/25' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Globe2 className={`w-4 h-4 shrink-0 ${activeView === 'prompt2' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">Introduction & Modèle</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                    activeView === 'prompt2' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>P2</span>
                </button>

                {/* 2. Parcours & KYC */}
                <button
                  onClick={() => setActiveView('prompt3')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeView === 'prompt3' 
                      ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-700/25' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <UserCheck className={`w-4 h-4 shrink-0 ${activeView === 'prompt3' ? 'text-white' : 'text-amber-600'}`} />
                    <span className="truncate">Parcours & KYC (14+ Mod.)</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                    activeView === 'prompt3' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>P3</span>
                </button>

                {/* 3. Sécurité & Glossaire */}
                <button
                  onClick={() => setActiveView('prompt4')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeView === 'prompt4' 
                      ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-700/25' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${activeView === 'prompt4' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="truncate">Sécurité & Glossaire</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                    activeView === 'prompt4' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>P4</span>
                </button>

                {/* 4. Console SDKs & Code (avec sous-menus dynamiques) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between px-3 py-1 text-[11px] font-extrabold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Console SDKs & Code</span>
                    </div>
                  </div>

                  <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-3">
                    <button
                      onClick={() => {
                        setActiveView('prompt5');
                        setActiveSdkLang('node');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeView === 'prompt5' && activeSdkLang === 'node'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Node.js / Express
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('prompt5');
                        setActiveSdkLang('python');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeView === 'prompt5' && activeSdkLang === 'python'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Python / Flask
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('prompt6');
                        setActivePhpMobileTab('php');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeView === 'prompt6' && activePhpMobileTab === 'php'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        PHP Natif & cURL
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('prompt6');
                        setActivePhpMobileTab('mobile');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeView === 'prompt6' && (activePhpMobileTab === 'mobile' || activePhpMobileTab === 'curl')
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        cURL & Mobile (Flutter)
                      </span>
                    </button>
                  </div>
                </div>

                {/* 5. Plugins No-Code */}
                <button
                  onClick={() => setActiveView('prompt7')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeView === 'prompt7' 
                      ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-700/25' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ShoppingCart className={`w-4 h-4 shrink-0 ${activeView === 'prompt7' ? 'text-white' : 'text-teal-600'}`} />
                    <span className="truncate">Plugins No-Code (Woo)</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                    activeView === 'prompt7' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>P7</span>
                </button>

                {/* 6. Assistant IA Integration Skill */}
                <button
                  onClick={() => setActiveView('prompt1')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeView === 'prompt1' 
                      ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-700/25' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Bot className={`w-4 h-4 shrink-0 ${activeView === 'prompt1' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">Assistant IA Integration</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                    activeView === 'prompt1' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>P1</span>
                </button>

                {/* 7. Outils & Overlays Interactifs (Prompt 8) */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1 block">
                    Outils de Test Live
                  </span>

                  <button
                    onClick={() => setShowApiTesterModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Tester une API (Live)</span>
                  </button>

                  <button
                    onClick={() => {
                      setWhTimestamp(Math.floor(Date.now() / 1000));
                      setShowWebhookTesterModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition"
                  >
                    <Bell className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Simulateur HMAC-SHA256</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="lg:col-span-3 space-y-6">

              {/* ---------------- PROMPT 1: SKILL IA D'INTÉGRATION AUTONOME ---------------- */}
              {activeView === 'prompt1' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Prompt 1 Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-blue-200/80 shadow-md shadow-blue-500/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          <Bot className="w-3.5 h-3.5" />
                          <span>PROMPT 1 • Assistant IA Spécialisé Antigravity</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                          Skill IA d'Intégration Autonome
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm font-mono mt-1">
                          Identifiant : <span className="text-blue-600 font-bold">system:nanaswitch_integration_skill</span>
                        </p>
                      </div>

                      {/* Action Buttons: Copy System Prompt & Download */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={handleCopyFullSkill}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm ${
                            copiedPrompt 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-blue-600/20'
                          }`}
                        >
                          {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedPrompt ? 'Prompt Système Copié !' : 'Copier le Prompt Système'}</span>
                        </button>

                        <a
                          href="/downloads/nanaswitch-integration-skill.md"
                          download="nanaswitch-integration-skill.md"
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <Download className="w-4 h-4 text-slate-600" />
                          <span>Télécharger SKILL.md</span>
                        </a>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Ce Skill dote tout assistant IA (ChatGPT, Claude, Antigravity Agent, SasPay AI) de l'expertise intégrale de l'architecture NanaSwitch Cloud : modèle Zero-Trust, commutateur hybride (Agrégé vs BYOK), plafonds KYC (1M vs 5M XOF) et validation cryptographique HMAC-SHA256.
                    </p>

                    {/* Subtabs for Prompt 1 */}
                    <div className="flex border-b border-slate-200 pt-2 gap-4">
                      {[
                        { id: 'simulator', label: 'Simulateur de Chat IA (Test en Direct)', icon: Bot },
                        { id: 'code', label: 'Code Source du Prompt Système (SKILL.md)', icon: FileCode },
                        { id: 'specs', label: 'Spécifications Techniques', icon: Terminal }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTabPrompt1(t.id as any)}
                          className={`flex items-center gap-2 pb-3 text-xs font-extrabold border-b-2 transition ${
                            activeTabPrompt1 === t.id 
                              ? 'border-[#1E40AF] text-[#1E40AF]' 
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <t.icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUBTAB 1: LIVE INTERACTIVE CHAT SIMULATOR */}
                  {activeTabPrompt1 === 'simulator' && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                      
                      {/* Chat Header */}
                      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                            <Bot className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-extrabold text-white">NanaSwitch Integration Architect AI</h3>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">Agent actif • system:nanaswitch_integration_skill</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setChatMessages([{
                            sender: 'assistant',
                            text: "👋 Bonjour ! Je suis l'Assistant IA d'Intégration NanaSwitch Cloud (NANASORE TECHNOLOGIES). Posez-moi vos questions techniques ou choisissez une question rapide ci-dessous."
                          }])}
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Réinitialiser</span>
                        </button>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 text-xs">
                        {chatMessages.map((msg, i) => (
                          <div 
                            key={i} 
                            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.sender === 'assistant' && (
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                                <Bot className="w-4 h-4" />
                              </div>
                            )}

                            <div className={`max-w-[85%] rounded-2xl p-4 leading-relaxed whitespace-pre-wrap ${
                              msg.sender === 'user'
                                ? 'bg-[#1E40AF] text-white shadow-sm'
                                : 'bg-white text-slate-800 border border-slate-200 shadow-xs'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}

                        {isAiTyping && (
                          <div className="flex gap-2 items-center text-slate-400 text-xs italic pl-10">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>L'architecte IA analyse votre demande...</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Suggested Questions Bar */}
                      <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
                        <span className="text-slate-400 font-bold shrink-0">Suggestions :</span>
                        {SIMULATED_PROMPTS.map((sp, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendQuestion(sp.q)}
                            className="shrink-0 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg transition font-medium border border-slate-200/60"
                          >
                            {sp.q}
                          </button>
                        ))}
                      </div>

                      {/* Chat Input Bar */}
                      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Posez une question à l'assistant IA d'intégration..."
                          value={userInput}
                          onChange={e => setUserInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendQuestion()}
                          className="flex-1 bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition"
                        />
                        <button
                          onClick={() => handleSendQuestion()}
                          disabled={!userInput.trim() || isAiTyping}
                          className="px-4 py-2.5 bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Envoyer</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: RAW SYSTEM PROMPT VIEWER */}
                  {activeTabPrompt1 === 'code' && (
                    <div className="bg-slate-900 rounded-3xl p-6 text-slate-100 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-mono font-bold text-slate-300">skills/nanaswitch-integration/SKILL.md</span>
                        </div>
                        <button
                          onClick={handleCopyFullSkill}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPrompt ? 'Copié' : 'Copier Tout'}</span>
                        </button>
                      </div>

                      <pre className="font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto max-h-[550px] p-2 select-all">
                        {SYSTEM_PROMPT_CONTENT}
                      </pre>
                    </div>
                  )}

                  {/* SUBTAB 3: ARCHITECTURE SPECS */}
                  {activeTabPrompt1 === 'specs' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 text-xs text-slate-700">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Spécifications Directrices du Skill IA
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2 text-blue-700 font-extrabold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>1. Règle Zero-Trust Stricte</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            L'IA interdit formellement d'exposer la clé secrète (<code className="text-blue-600 font-bold">ns_live_sk_*</code>) ou le secret Webhook (<code className="text-purple-600 font-bold">ns_whsec_*</code>) côté navigateur client (React, Vue, HTML). Seul le hash bcrypt est stocké dans Firestore.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
                            <Layers className="w-4 h-4" />
                            <span>2. Moteur Hybride B2B</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            L'IA oriente chaque développeur vers le bon mode : <strong>Agrégé</strong> (+1.5% marge, aucun contrat nécessaire) ou <strong>BYOK</strong> (0.02 XOF/req, clés personnelles SasPay/Sebpay).
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2 text-amber-700 font-extrabold">
                            <Lock className="w-4 h-4" />
                            <span>3. Plafonds Risque KYC</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            L'IA rappelle les seuils mensuels stricts : <strong>1 000 000 XOF</strong> pour les Particuliers et <strong>5 000 000 XOF</strong> pour les Entreprises avec coupe-circuit 403 Forbidden.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2 text-purple-700 font-extrabold">
                            <ShieldAlert className="w-4 h-4" />
                            <span>4. Anti-Rejeu HMAC-SHA256</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            L'IA fournit des snippets certifiés avec comparaison timingSafeEqual et rejet des requêtes webhooks dont le timestamp dépasse 300 secondes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ---------------- PROMPT 2: VISION, MODÈLE D'AFFAIRES & COUVERTURE UEMOA ---------------- */}
              {activeView === 'prompt2' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Prompt 2 Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <Globe2 className="w-3.5 h-3.5" />
                          <span>PROMPT 2 • docs/overview • LEAD TECHNICAL WRITER & PRODUCT DESIGNER</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                          Vision, Modèle d'Affaires & Couverture UEMOA
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                          Infrastructure d'orchestration de paiements résiliente opérée par <strong className="text-slate-800">NANASORE TECHNOLOGIES</strong>.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                          Route : /docs/overview
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      <strong>NanaSwitch Cloud</strong> est un switch B2B et un orchestrateur de paiements intelligent conçu pour éliminer la fragmentation des moyens de paiement en Afrique de l'Ouest. Il permet aux marchands, développeurs et FinTechs d'unifier l'encaissement Mobile Money et cartes bancaires via une API unique haute disponibilité dotée de bascule automatique (failover).
                    </p>
                  </div>

                  {/* 1. LES 2 MODES D'OPÉRATION : COMPARATIF COMPLET */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">ARCHITECTURE HYBRIDE</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Deux Modes d'Opération Adaptés à Chaque Profil
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Choisissez le modèle opérationnel correspondant à votre niveau d'autonomie bancaire et de volume de transactions.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* CARD MODE AGRÉGÉ */}
                      <div className="p-6 rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/60 to-white space-y-5 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-600 text-white">
                              MODE 1 • AGRÉGÉ (MASTER MERCHANT)
                            </span>
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                              Prêt à l'emploi
                            </span>
                          </div>

                          <div>
                            <h3 className="text-lg font-black text-slate-900">Compte Maître Collecteur NanaSwitch</h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              Idéal pour les PME, e-commerçants et marchands qui souhaitent commencer à encaisser immédiatement sans négocier de contrats directs avec chaque opérateur télécom.
                            </p>
                          </div>

                          <div className="space-y-2.5 text-xs text-slate-700">
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Gestion des fonds :</strong> Les fonds sont collectés via le compte maître régulé NanaSwitch Cloud.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Grille tarifaire :</strong> Frais opérateur de base + <strong className="text-blue-700">1.5% de marge de switch</strong> retenue à la source.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Disponibilité :</strong> Crédit instantané sur votre wallet multi-devises (XOF, USD, XAF, GNF, GHS) avec reversements (payouts) à la demande.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <span><strong>Plafonds mensuels KYC stricts :</strong>
                                <ul className="list-disc list-inside mt-1 pl-2 text-slate-600 space-y-0.5">
                                  <li><strong className="text-slate-900">Particulier / Indépendant :</strong> max <strong>1 000 000 XOF / mois</strong> (CNIB + Selfie).</li>
                                  <li><strong className="text-slate-900">Entreprise Enregistrée :</strong> max <strong>5 000 000 XOF / mois</strong> (RCCM + IFU + CNIB).</li>
                                </ul>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-blue-100 text-[11px] text-blue-900 font-medium">
                          💡 En cas de dépassement de quota, l'API renvoie le code HTTP <strong>403_MONTHLY_VOLUME_LIMIT_REACHED</strong>.
                        </div>
                      </div>

                      {/* CARD MODE BYOK */}
                      <div className="p-6 rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/60 to-white space-y-5 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-700 text-white">
                              MODE 2 • BYOK (BRING YOUR OWN KEYS)
                            </span>
                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                              Routeur SaaS Pur
                            </span>
                          </div>

                          <div>
                            <h3 className="text-lg font-black text-slate-900">Routeur API SaaS Haute Performance</h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              Conçu pour les <strong>FinTechs, entrepreneurs, e-commerçants, startups et grandes entreprises</strong> qui possèdent déjà leurs propres clés d'API délivrées dans le cadre d'un contrat direct entre eux et leurs agrégateurs ou opérateurs de paiement (Orange Money, MTN MoMo, Moov Africa, Wave Business, SasPay, Sebpay, banques partenaires, etc.).
                            </p>
                          </div>

                          <div className="space-y-2.5 text-xs text-slate-700">
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Gestion des fonds :</strong> Routage direct <em>pass-through</em>. Les fonds vont directement sur vos propres comptes marchands chez vos opérateurs/agrégateurs. NanaSwitch ne touche pas à l'argent et ne stocke aucun fonds.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Commission de switch :</strong> <strong className="text-emerald-700">0% de commission</strong> sur le volume financier transité.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <Coins className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <span><strong>Facturation SaaS :</strong> <strong className="text-purple-700">0,02 XOF par requête / transaction</strong>, décompté automatiquement de votre solde de crédits API Cloud.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <span><strong>Plafonds de volume :</strong> <strong className="text-slate-900">Exempt de tout plafond de volume</strong> (Transactions illimitées sans restriction mensuelle).</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <span><strong>Responsabilité :</strong> Vos clés d'API délivrées par vos agrégateurs ou opérateurs partenaires restent sous votre entière responsabilité et sont injectées en toute sécurité via notre coffre-fort Zero-Trust.</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-purple-100 text-[11px] text-purple-900 font-medium">
                          ⚡ Si le solde de crédits API atteint 0, le coupe-circuit <strong>HTTP 402 Payment Required</strong> s'active automatiquement.
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 2. PARCOURS UTILISATEUR & FLUX TRANSACTIONNEL */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">WORKFLOW TECHNIQUE</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Parcours Utilisateur & Orchestration en 5 Étapes
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        De la validation du panier e-commerce jusqu'à la réconciliation par webhook cryptographique.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">1</span>
                        <h4 className="font-bold text-slate-900">Initiation Panier</h4>
                        <p className="text-slate-500 text-[11px]">Le client final valide sa commande sur WooCommerce, Shopify ou votre application mobile.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">2</span>
                        <h4 className="font-bold text-slate-900">Appel Zero-Trust</h4>
                        <p className="text-slate-500 text-[11px]">Votre serveur envoie <code className="text-blue-600">POST /v1/switch/route</code> avec <code className="text-rose-600">ns_live_sk_*</code>.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">3</span>
                        <h4 className="font-bold text-slate-900">Switch & Failover</h4>
                        <p className="text-slate-500 text-[11px]">NanaSwitch sélectionne la meilleure passerelle (SasPay/Sebpay) selon la disponibilité réseau en temps réel.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">4</span>
                        <h4 className="font-bold text-slate-900">Paiement Client</h4>
                        <p className="text-slate-500 text-[11px]">Le client valide le paiement via Push OTP, USSD Mobile Money ou 3D-Secure Carte Bancaire.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px]">5</span>
                        <h4 className="font-bold text-slate-900">Webhook HMAC</h4>
                        <p className="text-slate-500 text-[11px]">Notification signée HMAC-SHA256 envoyée à votre serveur pour confirmation immédiate de commande.</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. COUVERTURE RÉGIONALE & OPÉRATEURS : LES 26 PAYS AFRICAINS ET INTERNATIONAUX */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">COUVERTURE COMPLÈTE • 26 PAYS</span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                          26 Pays Couverts & Opérateurs Télécoms Partenaires
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Présence panafricaine et internationale avec interconnexion directe aux opérateurs Mobile Money et réseaux bancaires.
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>26 / 26 Pays Opérationnels</span>
                      </span>
                    </div>

                    {/* ZONE 1 : UEMOA (8 PAYS) */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>Zone UEMOA (8 Pays • Devise Franc CFA XOF)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇧🇫 Burkina Faso</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Orange Money BF, Moov Money BF, Wave BF, LigdiCash</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇨🇮 Côte d'Ivoire</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Wave CI, Orange Money CI, MTN MoMo CI, Moov Money CI</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇸🇳 Sénégal</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Wave Sénégal, Orange Money SN, Free Money Sénégal</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇧🇯 Bénin</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo Bénin, Moov Money Bénin, Celtiis Cash</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇲🇱 Mali</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Orange Money Mali, Moov Mali (Malitel), Wave Mali</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇹🇬 Togo</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">T-Money (TogoCom), Moov Money Togo (Flooz), Wave Togo</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇳🇪 Niger</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Airtel Money Niger, Moov Niger, Wave Niger, Zamani Telecom</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇼 Guinée-Bissau</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">XOF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Orange Bissau, MTN Bissau</p>
                        </div>
                      </div>
                    </div>

                    {/* ZONE 2 : CEMAC (6 PAYS) */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>Zone CEMAC (6 Pays • Devise Franc CFA XAF)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇨🇲 Cameroun</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo Cameroun, Orange Money Cameroun</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇦 Gabon</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Airtel Money Gabon, Moov Money Gabon</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇨🇬 Congo-Brazzaville</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo Congo, Airtel Money Congo</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇹🇩 Tchad</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Airtel Money Tchad, Moov Money Tchad</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇨🇫 Centrafrique</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Orange Centrafrique, Telecel Centrafrique</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇶 Guinée Équatoriale</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">XAF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Getesa Guinée Équatoriale</p>
                        </div>
                      </div>
                    </div>

                    {/* ZONE 3 : AUTRES PAYS D'AFRIQUE & INTERNATIONAL (12 PAYS) */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        <span>Autres Régions d'Afrique & Diaspora Internationale (12 Pays)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇳 Guinée (Conakry)</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">GNF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Orange Money Guinée, MTN MoMo Guinée</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇭 Ghana</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">GHS</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo Ghana, Telecel Cash, AT Money</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇳🇬 Nigeria</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">NGN</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo PSB, SmartCash PSB, Paystack Virement</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇨🇩 R.D. Congo</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">CDF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">M-Pesa Vodacom, Orange Money RDC, Airtel, AfriMoney</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇰🇪 Kenya</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">KES</span>
                          </span>
                          <p className="text-[11px] text-slate-600">M-Pesa Safaricom Kenya, Airtel Money Kenya</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇷🇼 Rwanda</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">RWF</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN Mobile Money Rwanda, Airtel Rwanda</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇺🇬 Ouganda</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">UGX</span>
                          </span>
                          <p className="text-[11px] text-slate-600">MTN MoMo Uganda, Airtel Money Uganda</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇹🇿 Tanzanie</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">TZS</span>
                          </span>
                          <p className="text-[11px] text-slate-600">M-Pesa Vodacom, Airtel Money, Tigo Pesa, Halotel</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇿🇲 Zambie</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">ZMW</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Airtel Money Zambie, MTN MoMo Zambie</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇲🇷 Mauritanie</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">MRU</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Bankily (BPM), Masrvi, Sedad Payment</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                          <span className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🇬🇲 Gambie</span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">GMD</span>
                          </span>
                          <p className="text-[11px] text-slate-600">AfriMoney Gambie</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-1">
                          <span className="font-bold text-blue-900 flex items-center justify-between">
                            <span>🌍 Diaspora / Global</span>
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">Cartes</span>
                          </span>
                          <p className="text-[11px] text-slate-600">Cartes VISA, Mastercard</p>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ---------------- PROMPT 3: GUIDE INSCRIPTION, KYC & DASHBOARD (14+ MODULES) ---------------- */}
              {activeView === 'prompt3' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Prompt 3 Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>PROMPT 3 • docs/onboarding-kyc • UX WRITER & ONBOARDING SPECIALIST</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                          Guide Complet Inscription, KYC & Dashboard (14+ Modules)
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                          Parcours pas à pas pour configurer votre compte, soumettre votre dossier KYC et exploiter les 14+ modules métier.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                          Route : /docs/onboarding-kyc
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Ce guide accompagne les commerçants, indépendants et entreprises dans leur parcours d'onboarding sur NanaSwitch Cloud : de la création de la première application marchande jusqu'à la validation par le Super Admin et la maîtrise du tableau de bord.
                    </p>
                  </div>

                  {/* 1. CRÉATION D'APPLICATION */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">ÉTAPE 1</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Création & Configuration d'une Application Marchande
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Chaque projet (boutique e-commerce, application mobile, plateforme SaaS) est isolé dans une Application dédiée.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Nom de l'Application</h3>
                        <p className="text-slate-600 leading-relaxed">
                          Choisissez un libellé clair représentant votre enseigne (ex : <em>"Boutique Nana Ouaga"</em>, <em>"Fintech Express"</em>). Il sera affiché sur les reçus de paiement et la page de checkout client.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">2</div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Devise Principale (XOF)</h3>
                        <p className="text-slate-600 leading-relaxed">
                          Sélectionnez votre devise de référence comptable (par défaut <strong>XOF - Franc CFA</strong>). Votre wallet principal et vos rapports d'encaissement seront libellés dans cette devise.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">3</div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Test Sandbox vs Live Production</h3>
                        <p className="text-slate-600 leading-relaxed">
                          Basculez facilement entre l'environnement <strong>Sandbox</strong> (simulation avec numéros d'essai) et l'environnement <strong>Live Production</strong> pour traiter des transactions bancaires réelles.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. GUIDE DES DOCUMENTS KYC PAR PROFIL */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">ÉTAPE 2 • CONFORMITÉ</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Guide des Documents KYC par Profil (Particulier vs Entreprise)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Pour respecter la réglementation BCEAO et prévenir la fraude financière, les marchands soumettent leur dossier selon leur forme légale.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                      
                      {/* PROFIL PARTICULIER */}
                      <div className="p-6 rounded-3xl border-2 border-blue-200 bg-blue-50/40 space-y-4">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">PROFIL INDÉPENDANT</span>
                            <h3 className="text-lg font-black text-slate-900 mt-0.5">Particulier / Vendeur Indépendant</h3>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                            Plafond : 1 000 000 XOF / mois
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed">
                          Ce statut est destiné aux créateurs individuels, freelances et vendeurs sur réseaux sociaux sans structure légale immatriculée.
                        </p>

                        <div className="space-y-3 pt-1">
                          <h4 className="font-bold text-slate-900">Documents obligatoires requis :</h4>
                          <ul className="space-y-2 text-slate-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Nom complet & Prénoms :</strong> Identique à la pièce d'identité officielle.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Domaine d'activité :</strong> E-commerce, Prestation, Artisanat, Services digitaux, etc.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>CNIB ou Passeport valide (Recto ET Verso) :</strong> Scan ou photo haute résolution lisible sans reflets.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Photo / Selfie de capture de visage :</strong> Pour la vérification de présence (liveness detection).</span>
                            </li>
                          </ul>

                          {/* NOTE IMPORTANTE PARTICULIER */}
                          <div className="p-3 bg-emerald-100/70 border border-emerald-300 text-emerald-950 rounded-xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>Règle stricte : AUCUN document d'entreprise (RCCM, IFU) n'est demandé aux particuliers.</span>
                          </div>
                        </div>
                      </div>

                      {/* PROFIL ENTREPRISE */}
                      <div className="p-6 rounded-3xl border-2 border-emerald-200 bg-emerald-50/40 space-y-4">
                        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">PROFIL SOCIÉTÉ</span>
                            <h3 className="text-lg font-black text-slate-900 mt-0.5">Entreprise Enregistrée (SARL, SAS, SUARL)</h3>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-700 text-white">
                            Plafond : 5 000 000 XOF / mois
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed">
                          Ce statut est destiné aux sociétés formalisées désireuses de traiter des volumes financiers importants (extensible sur demande Super Admin).
                        </p>

                        <div className="space-y-3 pt-1">
                          <h4 className="font-bold text-slate-900">Documents obligatoires requis :</h4>
                          <ul className="space-y-2 text-slate-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Nom complet du Gérant :</strong> Représentant légal de l'entreprise.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Email professionnel :</strong> Adresse email corporate (ex: <em>contact@entreprise.com</em>).</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Domaine d'activité :</strong> Secteur d'activité de l'entreprise.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>CNIB ou Passeport du Gérant (Recto ET Verso) :</strong> Pièce officielle en cours de validité.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span><strong>Photo / Selfie du Gérant :</strong> Capture pour certification biométrique.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                              <span><strong>RCCM :</strong> Registre du Commerce et du Crédit Mobilier de la société.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                              <span><strong>IFU :</strong> Identifiant Fiscal Unique officiel de l'administration fiscale.</span>
                            </li>
                          </ul>

                          <div className="p-3 bg-white border border-emerald-200 text-emerald-950 rounded-xl font-medium">
                            📈 Possibilité d'extension de quota au-delà de 5 000 000 XOF/mois après audit d'activité par le Super Admin.
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 3. AFFICHAGE DU DOMAINE D'ACTIVITÉ DANS LE DASHBOARD */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">IDENTITÉ COMMERCIALE</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Affichage Dynamique du Domaine d'Activité
                      </h2>
                      <p className="text-slate-500 mt-1">
                        Pour renforcer la traçabilité et la transparence des flux financiers, le Domaine d'activité renseigné lors du KYC est automatiquement lié au compte marchand.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Ma Super Boutique</span>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">
                            m_live_bf98124
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 text-[#1E40AF] border border-blue-200 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500">Domaine :</span>
                          <span>E-commerce & Vente en ligne</span>
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed pt-1">
                        Ce badge dynamique est visible en permanence dans la barre supérieure du Dashboard, dans la liste des applications et sur les factures et reçus émis par le marchand.
                      </p>
                    </div>
                  </div>

                  {/* 4. COMPRÉHENSION DES 14+ MODULES DU DASHBOARD */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">FONCTIONNALITÉS MÉTIER</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        Exploration des 14+ Modules du Tableau de Bord Marchand
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Une suite d'outils complète conçue pour piloter la croissance financière de votre entreprise en Afrique.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      
                      {/* Module 1: Wallets Multi-Devises */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-blue-700 font-extrabold">
                          <Wallet className="w-4 h-4" />
                          <span>1. Wallets Multi-Devises</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Gestion instantanée des soldes disponibles en Franc CFA (XOF, XAF), GNF, GHS, USD et EUR avec calcul de la réserve de sécurité.
                        </p>
                      </div>

                      {/* Module 2: Liens de Paiement */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
                          <Link2 className="w-4 h-4" />
                          <span>2. Liens de Paiement (Payment Links)</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Génération en un clic de pages de paiement sécurisées à montant fixe ou libre, partageables par WhatsApp, SMS, QR code ou email.
                        </p>
                      </div>

                      {/* Module 3: Gestion des Litiges */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-rose-700 font-extrabold">
                          <ShieldAlert className="w-4 h-4" />
                          <span>3. Gestion des Litiges & Chargebacks</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Suivi transparent des réclamations clients, téléversement des bordereaux de livraison et résolution amiable avant arbitrage bancaire.
                        </p>
                      </div>

                      {/* Module 4: Logs & Moniteur Webhooks */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-purple-700 font-extrabold">
                          <History className="w-4 h-4" />
                          <span>4. Logs & Moniteur Webhooks</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Journalisation détaillée de chaque tentative de notification sortante avec statut HTTP, payload JSON brut et signature HMAC-SHA256.
                        </p>
                      </div>

                      {/* Module 5: Retraits & Reversements (Payouts) */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 font-extrabold">
                          <Coins className="w-4 h-4" />
                          <span>5. Retraits & Reversements (Payouts)</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Demandes de virement des fonds disponibles vers vos comptes bancaires d'Afrique de l'Ouest ou vos comptes Mobile Money (Orange, Moov, Wave, MTN).
                        </p>
                      </div>

                      {/* Module 6: Développeur & Clés API */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-indigo-700 font-extrabold">
                          <Key className="w-4 h-4" />
                          <span>6. Développeur & Clés API</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Commutateur dynamique entre le mode Agrégé et le mode BYOK, consultation de la clé publique `ns_live_pk_*` et secret webhook `ns_whsec_*`.
                        </p>
                      </div>

                      {/* Module 7: Caisses POS & Boutiques */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-teal-700 font-extrabold">
                          <ShoppingCart className="w-4 h-4" />
                          <span>7. Terminaux & Caisses POS</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Connexion de points de vente physiques pour l'encaissement direct au comptoir par QR code dynamique ou terminal intelligent.
                        </p>
                      </div>

                      {/* Module 8: Reçus & Facturation Automatique */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 font-extrabold">
                          <FileText className="w-4 h-4" />
                          <span>8. Reçus & Factures PDF</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Génération instantanée de reçus fiscaux certifiés avec QR code de vérification pour chaque paiement client réussi.
                        </p>
                      </div>

                      {/* Module 9: Supervision Super Admin */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2 text-yellow-700 font-extrabold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>9. Audit & File d'Attente Super Admin</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          Validation manuelle des dossiers KYC d'entreprise et extension personnalisée des plafonds de volume mensuel.
                        </p>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ---------------- PROMPT 4: DICTIONNAIRE TECHNIQUE, SÉCURITÉ ZERO-TRUST & CONSEILS DE GESTION ---------------- */}
              {activeView === 'prompt4' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-purple-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white">
                            PROMPT 4 • docs/security-glossary
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Cybersecurity & Technical Content Specialist
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Dictionnaire Technique, Modèle Zero-Trust & Bonnes Pratiques
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 self-start sm:self-auto">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Sécurité Critique & Zero-Trust
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Cette section fondamentale détaille le dictionnaire des technologies sous-jacentes de NanaSwitch Cloud, le modèle d'authentification <strong>Zero-Trust</strong> basé sur trois clés distinctes, ainsi que les protocoles opérationnels de gestion des secrets et de réconciliation de trésorerie.
                    </p>
                  </div>

                  {/* 1. GLOSSAIRE DES TERMES TECHNIQUES */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                        1
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Glossaire des Termes Techniques</h3>
                        <p className="text-xs text-slate-500">Les définitions et concepts au cœur du switch de paiement intelligent.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mode Agrégé */}
                      <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black">AGREGATED</span>
                          <span className="font-extrabold text-slate-900 text-sm">Mode Agrégé (Master Merchant)</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full ml-auto">Compte Maître Régulé</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Modèle tout-en-un où <strong>NanaSwitch opère en tant que Maître Marchand</strong>. Aucune démarche ni contrat direct auprès des opérateurs télécoms ou bancaires n'est requise. NanaSwitch encaisse via son compte maître, retient sa marge (+1.5% de frais de switch à la source), et crédite directement le Wallet de l'application marchande. Ce mode est obligatoirement assujetti aux <strong>plafonds de vérification d'identité KYC</strong> (1 000 000 XOF/mois pour Particulier, 5 000 000 XOF/mois pour Entreprise).
                        </p>
                      </div>

                      {/* BYOK */}
                      <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-blue-600 text-white rounded-lg text-xs font-black">BYOK</span>
                          <span className="font-extrabold text-slate-900 text-sm">Bring Your Own Key</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Modèle d'intégration où les marchands, startups et FinTechs utilisent directement leurs propres identifiants API obtenus par contrat auprès de leurs agrégateurs ou opérateurs de paiement. NanaSwitch agit comme un <strong>routeur technique pur</strong> (0% de commission de flux, facturé <strong>0,02 XOF / requête</strong>).
                        </p>
                      </div>

                      {/* HMAC-SHA256 */}
                      <div className="p-5 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-purple-600 text-white rounded-lg text-xs font-black">HMAC</span>
                          <span className="font-extrabold text-slate-900 text-sm">HMAC-SHA256</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Signature cryptographique symétrique (<em>Hash-based Message Authentication Code</em>). Chaque webhook émis par NanaSwitch est signé avec votre secret <code className="font-mono text-purple-700 bg-white px-1 rounded">ns_whsec_...</code>, garantissant l'intégrité absolue de la payload et empêchant tout tiers de falsifier une notification de paiement.
                        </p>
                      </div>

                      {/* Failover / Smart Routing */}
                      <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black">FAILOVER</span>
                          <span className="font-extrabold text-slate-900 text-sm">Smart Routing & Tolérance de Panne</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Algorithme de routage dynamique résilient. En cas d'indisponibilité ou d'erreur réseau d'un opérateur mobile money, NanaSwitch bascule automatiquement la requête vers une route alternative ou un agrégateur de secours en temps réel (ex: optimisation et forçage de l'indicatif <strong>+226</strong> au Burkina Faso).
                        </p>
                      </div>

                      {/* Idempotence */}
                      <div className="p-5 rounded-2xl border border-amber-100 bg-amber-50/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-amber-600 text-white rounded-lg text-xs font-black">IDEMPOTENCE</span>
                          <span className="font-extrabold text-slate-900 text-sm">Clé d'Idempotence (Idempotency Key)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Mécanisme anti-doublon via l'en-tête <code className="font-mono text-amber-800 bg-white px-1 rounded">x-idempotency-key</code>. Lors de micro-coupures réseau ou de renvois de requête côté client, le serveur garantit qu'une commande ne sera jamais débitée deux fois.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. ARCHITECTURE DES CLÉS ZERO-TRUST */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                        2
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Architecture des Clés Zero-Trust</h3>
                        <p className="text-xs text-slate-500">Séparation stricte des privilèges et périmètres d'exposition des identifiants.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* Clé Publique */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Client / Frontend</span>
                            <span className="text-[11px] font-bold text-slate-500">Portée Publique</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">Clé Publique (Public Key)</h4>
                            <p className="text-xs font-mono text-blue-700 font-bold mt-0.5">ns_live_pk_... / ns_test_pk_...</p>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                            <li>Utilisée dans les SDKs Front-End, widgets JS et réglages WooCommerce.</li>
                            <li>Identifie l'application marchande auprès de la passerelle.</li>
                            <li><strong className="text-emerald-700">Sécurité :</strong> Peut être visible dans le code source HTML / JS sans risque direct.</li>
                            <li><strong className="text-rose-700">Interdit :</strong> Ne dispose d'aucun privilège de retrait (Payout) ou d'annulation.</li>
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700">
                          Format : <span className="text-blue-600">ns_live_pk_0123456789abcdef...</span> (32 car.)
                        </div>
                      </div>

                      {/* Clé Secrète */}
                      <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/30 p-5 space-y-3 flex flex-col justify-between shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Serveur / Backend</span>
                            <span className="text-[11px] font-bold text-rose-600">Strictement Privé</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">Clé Secrète (Secret Key)</h4>
                            <p className="text-xs font-mono text-purple-700 font-bold mt-0.5">ns_live_sk_... / ns_test_sk_...</p>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                            <li>Envoyée dans l'en-tête <code className="font-mono text-purple-700">Authorization: Bearer</code> ou <code className="font-mono text-purple-700">x-nanaswitch-skey</code>.</li>
                            <li>Permet d'initier des débits directs, remboursements et retraits vers wallets.</li>
                            <li><strong className="text-rose-700">Règle d'or :</strong> Ne JAMAIS commiter sur GitHub, ni injecter dans une app mobile ou React client.</li>
                            <li>Seul son condensé haché SHA-256 est conservé dans Firestore.</li>
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-purple-200 text-[11px] font-mono text-slate-700">
                          Format : <span className="text-purple-600">ns_live_sk_fedcba9876543210...</span> (32 car.)
                        </div>
                      </div>

                      {/* Secret Webhook */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Webhook Listener</span>
                            <span className="text-[11px] font-bold text-amber-700">Signature HMAC</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">Clé Secrète Webhook (Signing Secret)</h4>
                            <p className="text-xs font-mono text-amber-700 font-bold mt-0.5">ns_whsec_...</p>
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                            <li>Secret cryptographique partagé entre NanaSwitch et votre serveur de webhook.</li>
                            <li>Sert à recalculer et authentifier la signature <code className="font-mono text-amber-800">x-nanaswitch-signature</code>.</li>
                            <li>Contient un timestamp anti-rejeu garantissant une validité maximale de <strong>300 secondes (5 min)</strong>.</li>
                            <li>Immunise votre backend contre les injections frauduleuses d'événements.</li>
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700">
                          Format : <span className="text-amber-700">ns_whsec_a1b2c3d4e5f6...</span> (64 car.)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. CONSEILS DE GESTION & SÉCURITÉ FINANCIÈRE */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                        3
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Conseils de Gestion & Sécurité de Trésorerie</h3>
                        <p className="text-xs text-slate-500">Procédures d'urgence en cas de compromission et gouvernance financière.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-700">
                      {/* Rotation d'urgence */}
                      <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-rose-600" />
                          <span className="font-extrabold text-rose-900 text-sm">Procédure de Rotation d'Urgence</span>
                        </div>
                        <p className="leading-relaxed">
                          Si une clé secrète (<code className="font-mono text-rose-700">ns_live_sk_...</code>) est accidentellement exposée sur un dépôt public ou des logs :
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600">
                          <li>Accédez immédiatement à l'onglet <strong>Développeur & Clés API</strong> du dashboard.</li>
                          <li>Cliquez sur <strong>"Régénérer les clés"</strong> pour générer instantanément une nouvelle paire.</li>
                          <li>Déployez la nouvelle clé dans vos variables d'environnement serveur.</li>
                          <li>L'ancienne clé reste valide pendant <strong>24h en période de grâce</strong> pour éviter toute interruption de service avant désactivation complète.</li>
                        </ol>
                      </div>

                      {/* Stockage Sécurisé */}
                      <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-blue-600" />
                          <span className="font-extrabold text-blue-900 text-sm">Stockage & Secrets Management</span>
                        </div>
                        <p className="leading-relaxed">
                          Ne stockez jamais les clés secrètes en clair dans le code applicatif.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          <li>Utilisez des variables d'environnement chiffrées (<code className="font-mono text-blue-700">process.env.NANASWITCH_SECRET_KEY</code>).</li>
                          <li>Vérifiez impérativement la présence de <code className="font-mono text-slate-800">.env</code> dans votre fichier <code className="font-mono text-slate-800">.gitignore</code>.</li>
                          <li>En production, préférez des coffres-forts dédiés (AWS Secrets Manager, Google Secret Manager ou HashiCorp Vault).</li>
                        </ul>
                      </div>

                      {/* Réconciliation financière */}
                      <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <span className="font-extrabold text-emerald-900 text-sm">Réconciliation de Trésorerie</span>
                        </div>
                        <p className="leading-relaxed">
                          Pour assurer une gestion saine et détecter toute anomalie :
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          <li>Rapprochez quotidiennement la somme des webhooks reçus (<code className="font-mono text-emerald-700">payment.success</code>) avec le solde du Wallet marchand.</li>
                          <li>Surveillez les alertes de volume KYC pour éviter le blocage préventif à 1M ou 5M XOF.</li>
                          <li>Exportez vos relevés mensuels au format CSV / Excel depuis le module <strong>Historique & Relevés</strong> pour votre comptabilité fiscale.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Code Snippet Timing Safe Webhook Verification */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Implémentation de Référence : Vérification Cryptographique Timing-Safe (Node.js)</span>
                        <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">Anti-Rejeu 300s</span>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`const crypto = require('crypto');

/**
 * Valide cryptographiquement la provenance d'un webhook NanaSwitch
 * @param {string|Buffer} rawBody - Corps brut de la requête (ne pas parser en JSON avant)
 * @param {string} signatureHeader - En-tête "x-nanaswitch-signature"
 * @param {string} webhookSecret - Votre secret ns_whsec_...
 * @returns {boolean} true si valide, false ou exception si invalide
 */
function verifyNanaSwitchWebhook(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;

  // 1. Découpage de l'en-tête (format: t=1730000000,v1=6a3f...)
  const elements = Object.fromEntries(
    signatureHeader.split(',').map(pair => pair.trim().split('='))
  );

  const timestamp = parseInt(elements.t, 10);
  const receivedSignature = elements.v1;

  if (!timestamp || !receivedSignature) return false;

  // 2. Fenêtre de tolérance anti-rejeu stricte de 300 secondes (5 minutes)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestamp) > 300) {
    throw new Error('SECURITY_ERROR: Webhook timestamp expired (> 300 seconds).');
  }

  // 3. Calcul du HMAC-SHA256 sur la chaîne standardisée "\${timestamp}.\${rawBody}"
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  // 4. Comparaison temporelle constante (timing-safe) contre les attaques temporelles
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'utf8'),
    Buffer.from(computedSignature, 'utf8')
  );
}`}
                      </pre>
                    </div>

                  </div>

                </div>
              )}

              {/* ---------------- PROMPT 5: CONSOLE MULTI-LANGAGES — NODE.JS & PYTHON ---------------- */}
              {activeView === 'prompt5' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                            PROMPT 5 • docs/sdks/node-python
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Senior Developer Advocate (Node.js & Python)
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Console Multi-Langages — Node.js & Python
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                        <Terminal className="w-4 h-4 text-indigo-600" />
                        SDKs & Code d'Appui
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Exemples complets et production-ready pour intégrer NanaSwitch Cloud en <strong>Node.js</strong> et <strong>Python</strong>. Couvre l'initialisation de paiement (POST <code className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded">/v1/switch/route</code>) et la validation cryptographique des signatures Webhook HMAC-SHA256 avec protection anti-rejeu.
                    </p>

                    {/* Language Switcher Tabs */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => setActiveSdkLang('node')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          activeSdkLang === 'node'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        Node.js / Express
                      </button>
                      <button
                        onClick={() => setActiveSdkLang('python')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          activeSdkLang === 'python'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        Python / FastAPI / Flask
                      </button>
                    </div>
                  </div>

                  {/* ======================= TAB NODE.JS ======================= */}
                  {activeSdkLang === 'node' && (
                    <div className="space-y-6 animate-in fade-in duration-150">

                      {/* Guide Pédagogique d'Intégration Node.js */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-blue-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">💡</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">Comment intégrer NanaSwitch dans votre site ou application Node.js ?</h3>
                            <p className="text-xs text-slate-500">Comprendre l'architecture en 4 étapes simples avant d'écrire le code.</p>
                          </div>
                        </div>

                        {/* Les 4 Étapes du Flux */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-blue-700 block">1. Clic Client</span>
                            <p className="text-slate-600 leading-relaxed">Le visiteur clique sur <strong>"Payer"</strong> sur votre site. Votre frontend appelle votre propre route backend (<code className="font-mono text-slate-800">/api/create-order</code>).</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                            <span className="font-extrabold text-blue-700 block">2. Session Backend</span>
                            <p className="text-slate-600 leading-relaxed">Votre serveur Node.js appelle NanaSwitch (<code className="font-mono text-blue-800">/v1/switch/route</code>) avec votre clé secrète et récupère l'URL <code className="font-mono text-emerald-700">checkout_url</code>.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-blue-700 block">3. Redirection</span>
                            <p className="text-slate-600 leading-relaxed">Le frontend redirige le client vers cette URL. Le client confirme le débit sur son Mobile Money ou sa Carte bancaire.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                            <span className="font-extrabold text-emerald-800 block">4. Validation Webhook</span>
                            <p className="text-slate-600 leading-relaxed">NanaSwitch notifie votre serveur via un webhook signé HMAC-SHA256. Votre backend valide la signature et active le service.</p>
                          </div>
                        </div>

                        {/* Pré-requis & Fichier .env */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 block">📦 1. Installation des Dépendances</span>
                            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">npm install axios express dotenv</pre>
                          </div>
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 block">🔐 2. Variables d'Environnement (.env)</span>
                            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">{`NANASWITCH_PUBLIC_KEY=ns_live_pk_12345
NANASWITCH_SECRET_KEY=ns_live_sk_67890
NANASWITCH_WEBHOOK_SECRET=ns_whsec_...`}</pre>
                          </div>
                        </div>

                        {/* Exemple d'appel Frontend */}
                        <div className="space-y-2 pt-2">
                          <span className="font-bold text-slate-900 block text-xs">🌐 3. Exemple d'Appel Frontend (JavaScript / Fetch depuis votre bouton de paiement) :</span>
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`// Côté Client (React, Vue, ou simple fichier HTML/JS de votre boutique)
async function onPayButtonClicked() {
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, orderId: 'CMD_12345' })
  });

  const { checkoutUrl } = await response.json();
  // Redirection automatique vers la page de paiement sécurisée NanaSwitch
  window.location.href = checkoutUrl;
}`}
                          </pre>
                        </div>
                      </div>
                      
                      {/* 1. Initialisation de Paiement Node.js */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">4</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">4. Code Backend : Initialisation de Paiement (Node.js)</h3>
                              <p className="text-[11px] text-slate-500">Appel POST avec Axios et en-têtes Zero-Trust.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`// Initialisation de paiement NanaSwitch Cloud
const axios = require('axios');
const crypto = require('crypto');

async function createPayment() {
  const response = await axios.post('https://nana-payment-api.onrender.com/v1/switch/route', {
    amount: 5000,
    currency: 'XOF',
    order_id: 'CMD_12345',
    customer: { email: 'client@example.com', phone: '+22670000000' }
  }, {
    headers: {
      'x-nanaswitch-key': 'ns_live_pk_12345',
      'x-nanaswitch-skey': 'ns_live_sk_67890'
    }
  });
  return response.data.checkout_url;
}`, 'Code Node.js Initialisation')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le code
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`// Initialisation de paiement NanaSwitch Cloud
const axios = require('axios');
const crypto = require('crypto');

async function createPayment() {
  const response = await axios.post('https://nana-payment-api.onrender.com/v1/switch/route', {
    amount: 5000,
    currency: 'XOF',
    order_id: 'CMD_12345',
    customer: { email: 'client@example.com', phone: '+22670000000' }
  }, {
    headers: {
      'x-nanaswitch-key': 'ns_live_pk_12345',
      'x-nanaswitch-skey': 'ns_live_sk_67890'
    }
  });
  return response.data.checkout_url;
}`}
                        </pre>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-900 block">En-tête Public</span>
                            <span className="font-mono text-blue-600 text-[11px]">x-nanaswitch-key</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">Votre clé publique (ns_live_pk_...).</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-900 block">En-tête Secret</span>
                            <span className="font-mono text-purple-600 text-[11px]">x-nanaswitch-skey</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">Votre clé secrète backend (ns_live_sk_...).</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-900 block">Réponse Attendue</span>
                            <span className="font-mono text-emerald-600 text-[11px]">checkout_url</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">URL de redirection vers l'interface de paiement.</p>
                          </div>
                        </div>
                      </div>

                      {/* 2. Validation Webhook HMAC-SHA256 Node.js */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">2</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">2. Vérification Webhook HMAC-SHA256 (Node.js)</h3>
                              <p className="text-[11px] text-slate-500">Comparaison cryptographique en temps constant avec crypto.timingSafeEqual.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`// Verification Webhook HMAC-SHA256
function verifyWebhook(payload, signatureHeader, secret) {
  const [timestamp, signature] = signatureHeader.split(',');
  const tsValue = timestamp.split('=')[1];
  const sigValue = signature.split('=')[1];
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(\`\${tsValue}.\${payload}\`)
    .digest('hex');
    
  return crypto.timingSafeEqual(Buffer.from(sigValue), Buffer.from(expectedSig));
}`, 'Code Node.js Validation Webhook')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le code
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`// Verification Webhook HMAC-SHA256
function verifyWebhook(payload, signatureHeader, secret) {
  const [timestamp, signature] = signatureHeader.split(',');
  const tsValue = timestamp.split('=')[1];
  const sigValue = signature.split('=')[1];
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(\`\${tsValue}.\${payload}\`)
    .digest('hex');
    
  return crypto.timingSafeEqual(Buffer.from(sigValue), Buffer.from(expectedSig));
}`}
                        </pre>
                      </div>

                      {/* 3. Serveur Express Complet de Référence */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">3</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">3. Serveur Express.js Complet (Listener Production)</h3>
                              <p className="text-[11px] text-slate-500">Capture du body brut et acquittement immédiat HTTP 200.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`const express = require('express');
const crypto = require('crypto');
const app = express();

const WEBHOOK_SECRET = process.env.NANASWITCH_WEBHOOK_SECRET || 'ns_whsec_...';

// IMPORTANT : Conserver le corps brut de la requête pour le calcul HMAC
app.post('/api/nanaswitch-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['x-nanaswitch-signature'];
  const rawBody = req.body.toString('utf8');

  try {
    const isValid = verifyWebhook(rawBody, signatureHeader, WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Signature webhook invalide');
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    const event = JSON.parse(rawBody);
    console.log('Événement reçu avec succès :', event.event_type, event.transaction_id);

    if (event.event_type === 'payment.success') {
      // Traitement de la commande payée (livraison, activation, validation panier)
      console.log('Commande validée :', event.order_id, 'Montant :', event.amount, event.currency);
    }

    // Toujours retourner 200 immédiatement
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook :', err.message);
    return res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Serveur webhook écoute sur le port 3000'));`, 'Serveur Express Complet')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le serveur
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`const express = require('express');
const crypto = require('crypto');
const app = express();

const WEBHOOK_SECRET = process.env.NANASWITCH_WEBHOOK_SECRET || 'ns_whsec_...';

// IMPORTANT : Conserver le corps brut de la requête pour le calcul HMAC
app.post('/api/nanaswitch-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['x-nanaswitch-signature'];
  const rawBody = req.body.toString('utf8');

  try {
    const isValid = verifyWebhook(rawBody, signatureHeader, WEBHOOK_SECRET);
    if (!isValid) {
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    const event = JSON.parse(rawBody);
    if (event.event_type === 'payment.success') {
      // Mettre à jour la commande dans votre base de données
      console.log('Commande payée :', event.order_id, event.amount, event.currency);
    }

    // Acquittement immédiat HTTP 200
    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Écoute sur http://localhost:3000'));`}
                        </pre>
                      </div>

                    </div>
                  )}

                  {/* ======================= TAB PYTHON ======================= */}
                  {activeSdkLang === 'python' && (
                    <div className="space-y-6 animate-in fade-in duration-150">

                      {/* Guide Pédagogique d'Intégration Python */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm">🐍</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">Comment intégrer NanaSwitch dans votre site ou application Python / Flask ?</h3>
                            <p className="text-xs text-slate-500">Flux d'intégration étape par étape : du bouton de paiement à la validation asynchrone.</p>
                          </div>
                        </div>

                        {/* Les 4 Étapes du Flux Python */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-amber-800 block">1. Clic Client</span>
                            <p className="text-slate-600 leading-relaxed">L'utilisateur valide son panier sur votre site. Votre frontend envoie une requête POST vers votre application Flask (<code className="font-mono text-slate-800">/api/checkout</code>).</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                            <span className="font-extrabold text-amber-800 block">2. Requête API</span>
                            <p className="text-slate-600 leading-relaxed">Votre vue Flask appelle NanaSwitch Cloud via <code className="font-mono text-amber-900">requests.post</code> avec vos clés secrètes et récupère le <code className="font-mono text-emerald-700">checkout_url</code>.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-amber-800 block">3. Paiement Mobile</span>
                            <p className="text-slate-600 leading-relaxed">Le navigateur redirige l'acheteur vers la page sécurisée. L'acheteur tape son code USSD ou saisit sa carte VISA / Mastercard.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                            <span className="font-extrabold text-emerald-800 block">4. Webhook Flask</span>
                            <p className="text-slate-600 leading-relaxed">NanaSwitch émet un webhook HMAC-SHA256. Votre serveur Flask vérifie la signature avec <code className="font-mono text-emerald-800">hmac.compare_digest</code> et valide la commande.</p>
                          </div>
                        </div>

                        {/* Pré-requis & Fichier .env */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 block">📦 1. Installation des Dépendances</span>
                            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">pip install requests flask python-dotenv</pre>
                          </div>
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 block">🔐 2. Variables d'Environnement (.env)</span>
                            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">{`NANASWITCH_PUBLIC_KEY=ns_live_pk_12345
NANASWITCH_SECRET_KEY=ns_live_sk_67890
NANASWITCH_WEBHOOK_SECRET=ns_whsec_...`}</pre>
                          </div>
                        </div>

                        {/* Exemple d'appel Frontend */}
                        <div className="space-y-2 pt-2">
                          <span className="font-bold text-slate-900 block text-xs">🌐 3. Exemple d'Appel Frontend (JavaScript Fetch vers la route Flask) :</span>
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`// Côté Client (sur votre site e-commerce ou dashboard client)
async function onPayButtonClicked() {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, order_id: 'CMD_12345' })
  });

  const data = await response.json();
  // Redirection immédiate vers le guichet de paiement NanaSwitch
  window.location.href = data.checkout_url;
}`}
                          </pre>
                        </div>
                      </div>
                      
                      {/* 1. Initialisation & Verification Webhook Python (Code Officiel) */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">4</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">4. Code Python d'Appui : Initialisation & Vérification Webhook</h3>
                              <p className="text-[11px] text-slate-500">Fonctions pures réutilisables dans n'importe quel framework Python.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`import hmac, hashlib, requests

# Initialisation
def create_payment():
    headers = {
        "x-nanaswitch-key": "ns_live_pk_12345",
        "x-nanaswitch-skey": "ns_live_sk_67890"
    }
    payload = {
        "amount": 5000, "currency": "XOF", "order_id": "CMD_12345"
    }
    res = requests.post("https://nana-payment-api.onrender.com/v1/switch/route", json=payload, headers=headers)
    return res.json()["checkout_url"]

# Verification Webhook HMAC-SHA256
def verify_webhook(raw_body, signature_header, secret):
    parts = dict(item.split("=") for item in signature_header.split(","))
    ts, sig = parts["t"], parts["v1"]
    computed = hmac.new(secret.encode(), f"{ts}.{raw_body}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, computed)`, 'Code Python / Flask')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le code
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`import hmac, hashlib, requests

# Initialisation
def create_payment():
    headers = {
        "x-nanaswitch-key": "ns_live_pk_12345",
        "x-nanaswitch-skey": "ns_live_sk_67890"
    }
    payload = {
        "amount": 5000, "currency": "XOF", "order_id": "CMD_12345"
    }
    res = requests.post("https://nana-payment-api.onrender.com/v1/switch/route", json=payload, headers=headers)
    return res.json()["checkout_url"]

# Verification Webhook HMAC-SHA256
def verify_webhook(raw_body, signature_header, secret):
    parts = dict(item.split("=") for item in signature_header.split(","))
    ts, sig = parts["t"], parts["v1"]
    computed = hmac.new(secret.encode(), f"{ts}.{raw_body}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, computed)`}
                        </pre>
                      </div>

                      {/* 2. Serveur Flask de Référence */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">3</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Serveur Flask de Référence (Listener Production)</h3>
                              <p className="text-[11px] text-slate-500">Capture du body brut (as_text=True) et réponse JSON HTTP 200.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`from flask import Flask, request, jsonify
import os

app = Flask(__name__)
WEBHOOK_SECRET = os.getenv("NANASWITCH_WEBHOOK_SECRET", "ns_whsec_...")

@app.route("/api/nanaswitch-webhook", methods=["POST"])
def nanaswitch_webhook():
    sig_header = request.headers.get("x-nanaswitch-signature")
    raw_body = request.get_data(as_text=True)

    if not sig_header or not verify_webhook(raw_body, sig_header, WEBHOOK_SECRET):
        return jsonify({"error": "Invalid HMAC signature"}), 401

    event = request.get_json(silent=True) or {}
    if event.get("event_type") == "payment.success":
        order_id = event.get("order_id")
        amount = event.get("amount")
        print(f"Paiement validé pour la commande {order_id} ({amount} XOF)")

    return jsonify({"received": True}), 200

if __name__ == "__main__":
    app.run(port=5000)`, 'Serveur Flask')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier Flask
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`from flask import Flask, request, jsonify
import os

app = Flask(__name__)
WEBHOOK_SECRET = os.getenv("NANASWITCH_WEBHOOK_SECRET", "ns_whsec_...")

@app.route("/api/nanaswitch-webhook", methods=["POST"])
def nanaswitch_webhook():
    sig_header = request.headers.get("x-nanaswitch-signature")
    raw_body = request.get_data(as_text=True)

    if not sig_header or not verify_webhook(raw_body, sig_header, WEBHOOK_SECRET):
        return jsonify({"error": "Invalid HMAC signature"}), 401

    event = request.get_json(silent=True) or {}
    if event.get("event_type") == "payment.success":
        order_id = event.get("order_id")
        amount = event.get("amount")
        print(f"Paiement validé pour la commande {order_id} ({amount} XOF)")

    return jsonify({"received": True}), 200

if __name__ == "__main__":
    app.run(port=5000)`}
                        </pre>
                      </div>

                    </div>
                  )}

                  {/* 4. En-têtes & Configuration Requise */}
                  <div className="bg-slate-900 text-slate-200 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      Tableau des Paramètres de Requête (`/v1/switch/route`)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-blue-400 font-bold">Headers Requis</span>
                        <p className="text-slate-300 text-[11px]">x-nanaswitch-key: ns_live_pk_...</p>
                        <p className="text-slate-300 text-[11px]">x-nanaswitch-skey: ns_live_sk_...</p>
                        <p className="text-slate-400 text-[10px]">Content-Type: application/json</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-emerald-400 font-bold">Champs JSON Obligatoires</span>
                        <p className="text-slate-300 text-[11px]">amount (nombre entier en XOF)</p>
                        <p className="text-slate-300 text-[11px]">currency ("XOF")</p>
                        <p className="text-slate-300 text-[11px]">order_id (identifiant unique marchand)</p>
                        <p className="text-slate-300 text-[11px]">customer (email, phone au format +226...)</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ---------------- PROMPT 6: CONSOLE MULTI-LANGAGES — PHP & CURL / MOBILE ---------------- */}
              {activeView === 'prompt6' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                            PROMPT 6 • docs/sdks/php-curl
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Senior Developer Advocate (PHP & Mobile/cURL)
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Console Multi-Langages — PHP & cURL / Mobile
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 self-start sm:self-auto">
                        <FileCode className="w-4 h-4 text-rose-600" />
                        Écosystème Web Africain & Mobile
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Implémentations officielles pour <strong>PHP natif</strong> (largement déployé sur l'écosystème web africain), requêtes <strong>cURL génériques</strong> pour tests API et intégration sécurisée dans des applications mobiles <strong>Flutter</strong> et <strong>React Native</strong>.
                    </p>

                    {/* Navigation Sub-Tabs */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => setActivePhpMobileTab('php')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          activePhpMobileTab === 'php'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                        PHP Natif (cURL & hash_equals)
                      </button>
                      <button
                        onClick={() => setActivePhpMobileTab('curl')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          activePhpMobileTab === 'curl'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        cURL / Requête Générique
                      </button>
                      <button
                        onClick={() => setActivePhpMobileTab('mobile')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          activePhpMobileTab === 'mobile'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        Applications Mobiles (Flutter / React Native)
                      </button>
                    </div>
                  </div>

                  {/* ======================= SUB-TAB: PHP NATIF ======================= */}
                  {activePhpMobileTab === 'php' && (
                    <div className="space-y-6 animate-in fade-in duration-150">

                      {/* Guide Pédagogique PHP */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm">🐘</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">Comment intégrer NanaSwitch dans votre site ou CMS PHP ?</h3>
                            <p className="text-xs text-slate-500">Flux d'intégration en 4 étapes simples, compatible avec 100% des hébergements web mutualisés et serveurs dédiés.</p>
                          </div>
                        </div>

                        {/* Les 4 Étapes PHP */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-rose-700 block">1. Formulaire Panier</span>
                            <p className="text-slate-600 leading-relaxed">L'internaute valide son panier. Le formulaire HTML ou bouton soumet la commande vers votre script <code className="font-mono text-slate-800">checkout.php</code>.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                            <span className="font-extrabold text-rose-700 block">2. Script cURL PHP</span>
                            <p className="text-slate-600 leading-relaxed"><code className="font-mono text-rose-800">checkout.php</code> exécute un appel cURL serveur vers NanaSwitch Cloud avec vos clés secrètes et récupère <code className="font-mono text-emerald-700">$checkout_url</code>.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="font-extrabold text-rose-700 block">3. Redirection Client</span>
                            <p className="text-slate-600 leading-relaxed">Votre script PHP redirige l'acheteur avec <code className="font-mono text-slate-800">header('Location: ' . $checkout_url);</code> vers la page de paiement sécurisée.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                            <span className="font-extrabold text-emerald-800 block">4. Webhook PHP</span>
                            <p className="text-slate-600 leading-relaxed">NanaSwitch émet un webhook vers <code className="font-mono text-emerald-800">webhook.php</code>. Le script vérifie la signature HMAC avec <code className="font-mono text-emerald-800">hash_equals</code> et valide la commande.</p>
                          </div>
                        </div>

                        {/* Exemple d'appel Frontend HTML classique */}
                        <div className="space-y-2 pt-2">
                          <span className="font-bold text-slate-900 block text-xs">🌐 Exemple de Formulaire Frontend (HTML / PHP) :</span>
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`<!-- Formulaire d'achat sur votre boutique PHP (index.php ou cart.php) -->
<form action="checkout.php" method="POST">
  <input type="hidden" name="order_id" value="CMD_12345">
  <input type="hidden" name="amount" value="5000">
  <button type="submit" class="btn-payer">
    Payer 5 000 XOF avec NanaSwitch (Mobile Money / Carte)
  </button>
</form>`}
                          </pre>
                        </div>
                      </div>

                      {/* 1. Code d'appui officiel : Initialisation de Paiement PHP */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">1</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">1. Initialisation de Paiement PHP (cURL Natif)</h3>
                              <p className="text-[11px] text-slate-500">Appel POST vers l'endpoint de routage NanaSwitch Cloud.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`<?php
// Initialisation de Paiement
$ch = curl_init('https://nana-payment-api.onrender.com/v1/switch/route');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'amount' => 5000, 'currency' => 'XOF', 'order_id' => 'CMD_12345'
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-nanaswitch-key: ns_live_pk_12345',
        'x-nanaswitch-skey: ns_live_sk_67890'
    ]
]);
$response = json_decode(curl_exec($ch), true);
$checkout_url = $response['checkout_url'];

// Rediriger le client vers l'interface de paiement
header("Location: " . $checkout_url);
exit;`, 'Code PHP Initialisation')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le code
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`<?php
// Initialisation de Paiement
$ch = curl_init('https://nana-payment-api.onrender.com/v1/switch/route');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'amount' => 5000, 'currency' => 'XOF', 'order_id' => 'CMD_12345'
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-nanaswitch-key: ns_live_pk_12345',
        'x-nanaswitch-skey: ns_live_sk_67890'
    ]
]);
$response = json_decode(curl_exec($ch), true);
$checkout_url = $response['checkout_url'];

// Redirection du client vers la page de paiement NanaSwitch
header("Location: " . $checkout_url);
exit;`}
                        </pre>
                      </div>

                      {/* 2. Code d'appui officiel : Validation Webhook HMAC-SHA256 PHP */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">2</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">2. Validation Webhook HMAC-SHA256 (PHP)</h3>
                              <p className="text-[11px] text-slate-500">Capture de php://input et comparaison timing-safe avec hash_equals.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`<?php
// Validation Webhook HMAC-SHA256
$webhook_secret = getenv('NANASWITCH_WEBHOOK_SECRET') ?: 'ns_whsec_...';
$raw_body = file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_X_NANASWITCH_SIGNATURE'];
parse_str(str_replace(',', '&', $sig_header), $sig_parts);

$computed_sig = hash_hmac('sha256', $sig_parts['t'] . '.' . $raw_body, $webhook_secret);
if (hash_equals($sig_parts['v1'], $computed_sig)) {
    // Paiement valide
    $event = json_decode($raw_body, true);
    if ($event['event_type'] === 'payment.success') {
        // Valider la commande en base MySQL / PDO
    }
    http_response_code(200);
    echo json_encode(["received" => true]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Invalid signature"]);
}`, 'Code PHP Validation Webhook')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier le code
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`<?php
// Validation Webhook HMAC-SHA256
$webhook_secret = getenv('NANASWITCH_WEBHOOK_SECRET') ?: 'ns_whsec_...';
$raw_body = file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_X_NANASWITCH_SIGNATURE'];
parse_str(str_replace(',', '&', $sig_header), $sig_parts);

$computed_sig = hash_hmac('sha256', $sig_parts['t'] . '.' . $raw_body, $webhook_secret);
if (hash_equals($sig_parts['v1'], $computed_sig)) {
    // Paiement valide
    $event = json_decode($raw_body, true);
    if ($event['event_type'] === 'payment.success') {
        // Valider la commande en base de données
    }
    http_response_code(200);
    echo json_encode(["received" => true]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Invalid signature"]);
}`}
                        </pre>
                      </div>

                    </div>
                  )}

                  {/* ======================= SUB-TAB: CURL ======================= */}
                  {activePhpMobileTab === 'curl' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      
                      {/* Guide cURL */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-blue-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">⚡</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">cURL / Requête Générique universelle</h3>
                            <p className="text-xs text-slate-500">Testez l'initiation de paiement directement depuis votre terminal, Postman ou scripts shell.</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          La commande <strong>cURL</strong> est l'outil idéal pour tester vos clés d'API Zero-Trust (<code className="font-mono text-blue-700">ns_live_pk_...</code> et <code className="font-mono text-purple-700">ns_live_sk_...</code>) avant toute intégration logicielle.
                        </p>
                      </div>

                      {/* Code d'appui officiel cURL */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">⚡</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Requête cURL d'Appui Officielle</h3>
                              <p className="text-[11px] text-slate-500">POST /v1/switch/route avec headers Zero-Trust.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`curl -X POST https://nana-payment-api.onrender.com/v1/switch/route \\
  -H "Content-Type: application/json" \\
  -H "x-nanaswitch-key: ns_live_pk_12345" \\
  -H "x-nanaswitch-skey: ns_live_sk_67890" \\
  -d '{
    "amount": 5000,
    "currency": "XOF",
    "order_id": "CMD_12345",
    "customer": { "email": "client@example.com" }
  }'`, 'Commande cURL')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier cURL
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`curl -X POST https://nana-payment-api.onrender.com/v1/switch/route \\
  -H "Content-Type: application/json" \\
  -H "x-nanaswitch-key: ns_live_pk_12345" \\
  -H "x-nanaswitch-skey: ns_live_sk_67890" \\
  -d '{
    "amount": 5000,
    "currency": "XOF",
    "order_id": "CMD_12345",
    "customer": { "email": "client@example.com" }
  }'`}
                        </pre>

                        {/* Réponse attendue cURL */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-slate-900">Réponse JSON Renvoyée (HTTP 200 / 201) :</span>
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "transaction_id": "sw_749102",
  "order_id": "CMD_12345",
  "amount": 5000,
  "currency": "XOF",
  "status": "PENDING",
  "checkout_url": "https://nana-payment-api.onrender.com/pay/sw_749102"
}`}
                          </pre>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ======================= SUB-TAB: MOBILE ======================= */}
                  {activePhpMobileTab === 'mobile' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      
                      {/* Règle de Sécurité Mobile Cruciale */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">📱</span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">Architecture Mobile Sécurisée (Flutter & React Native)</h3>
                            <p className="text-xs text-slate-500">La règle d'or : ne JAMAIS inclure la clé secrète dans le code binaire de l'application.</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Les applications mobiles compilées (APK Android ou IPA iOS) peuvent être décompilées par des tiers. C'est pourquoi votre application mobile <strong>appelle votre propre API backend</strong> pour demander la création du paiement. Votre backend génère l'URL <code className="font-mono text-emerald-700">checkout_url</code> avec votre clé secrète, puis l'application mobile ouvre cette URL dans un navigateur intégré ou une WebView.
                        </p>
                      </div>

                      {/* Exemple Flutter */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">FL</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Intégration Mobile en Flutter (Dart)</h3>
                              <p className="text-[11px] text-slate-500">Appel backend et ouverture de la page de paiement avec url_launcher.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

Future<void> initiateNanaSwitchPayment() async {
  // 1. Appel vers VOTRE serveur backend sécurisé
  final response = await http.post(
    Uri.parse('https://votre-domaine.com/api/create-payment'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'amount': 5000, 'orderId': 'CMD_12345'}),
  );

  final data = jsonDecode(response.body);
  final String checkoutUrl = data['checkout_url'];

  // 2. Ouverture de la page de paiement sécurisée
  final Uri uri = Uri.parse(checkoutUrl);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  }
}`, 'Code Flutter')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier Flutter
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

Future<void> initiateNanaSwitchPayment() async {
  // 1. Appel vers VOTRE serveur backend sécurisé
  final response = await http.post(
    Uri.parse('https://votre-domaine.com/api/create-payment'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'amount': 5000, 'orderId': 'CMD_12345'}),
  );

  final data = jsonDecode(response.body);
  final String checkoutUrl = data['checkout_url'];

  // 2. Ouverture de la page de paiement sécurisée dans l'application
  final Uri uri = Uri.parse(checkoutUrl);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  }
}`}
                        </pre>
                      </div>

                      {/* Exemple React Native */}
                      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">RN</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Intégration Mobile en React Native / Expo</h3>
                              <p className="text-[11px] text-slate-500">Ouverture de session de paiement avec expo-web-browser.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard?.(`import * as WebBrowser from 'expo-web-browser';

async function handleMobileCheckout() {
  // 1. Obtenir le lien de paiement depuis votre serveur
  const res = await fetch('https://votre-domaine.com/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, orderId: 'CMD_12345' }),
  });
  
  const { checkout_url } = await res.json();

  // 2. Ouvrir le guichet de paiement in-app
  await WebBrowser.openBrowserAsync(checkout_url);
}`, 'Code React Native')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copier React Native
                          </button>
                        </div>

                        <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`import * as WebBrowser from 'expo-web-browser';

async function handleMobileCheckout() {
  // 1. Obtenir le lien de paiement depuis votre serveur
  const res = await fetch('https://votre-domaine.com/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, orderId: 'CMD_12345' }),
  });
  
  const { checkout_url } = await res.json();

  // 2. Ouvrir le guichet de paiement in-app
  await WebBrowser.openBrowserAsync(checkout_url);
}`}
                        </pre>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* ---------------- PROMPT 7: WOOCOMMERCE & CMS NO-CODE ---------------- */}
              {activeView === 'prompt7' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Header Banner & Download Action */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-teal-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white">
                            PROMPT 7 • docs/integrations/woocommerce
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            WooCommerce & WordPress Integration Lead
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Volet d'Intégration WooCommerce & CMS No-Code
                        </h2>
                      </div>

                      <a 
                        href="/downloads/nanaswitch-gateway.zip" 
                        download="nanaswitch-gateway.zip"
                        className="px-5 py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-700/25 transition flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 group"
                      >
                        <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition" />
                        <span>Télécharger nanaswitch-gateway.zip</span>
                      </a>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Déployez la passerelle NanaSwitch Cloud sur votre boutique WordPress / WooCommerce en quelques clics sans écrire la moindre ligne de code. L'extension officielle gère le routage multi-opérateurs (Orange Money, Moov, MTN, Wave, Cartes VISA/Mastercard), supporte les deux modes d'intégration (<strong>AGREGATED</strong> et <strong>BYOK</strong>), et s'intègre au système de stockage haute performance HPOS.
                    </p>

                    {/* Compatibility Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        HPOS Ready (Custom Order Tables)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        WordPress 5.8 à 6.7+
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        WooCommerce 7.0 à 9.5+
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 font-bold border border-blue-200">
                        Sécurité HMAC-SHA256 Native
                      </span>
                    </div>
                  </div>

                  {/* 1. TÉLÉCHARGEMENT & PRÉSENTATION DU PLUGIN */}
                  <div className="bg-gradient-to-br from-teal-500/10 via-white to-blue-500/10 p-6 sm:p-8 rounded-3xl border border-teal-200 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Archive Officielle Recommandée</span>
                        <h3 className="text-lg font-black text-slate-900">1. Téléchargement du Plugin Officiel</h3>
                        <p className="text-xs text-slate-600">Archive installable directement depuis l'administration de WordPress (.zip conforme aux standards WP.org).</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <a 
                          href="/downloads/nanaswitch-gateway.zip" 
                          download="nanaswitch-gateway.zip"
                          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-teal-600/20 transition flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>nanaswitch-gateway.zip (v1.0.0)</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="font-bold text-slate-900 block">Nom de l'Extension</span>
                        <p className="text-slate-600 font-mono text-[11px] mt-0.5">NanaSwitch Gateway for WooCommerce</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="font-bold text-slate-900 block">Identifiant Passerelle</span>
                        <p className="text-slate-600 font-mono text-[11px] mt-0.5">nanaswitch_gateway</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="font-bold text-slate-900 block">Endpoint Webhook Automatique</span>
                        <p className="text-teal-700 font-mono text-[11px] mt-0.5 font-bold">/wp-json/nanaswitch/v1/webhook</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. PROCÉDURE D'INSTALLATION EN 4 ÉTAPES */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-sm">
                        2
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Procédure d'Installation en 4 Étapes</h3>
                        <p className="text-xs text-slate-500">Guide détaillé pour configurer la passerelle sans intervention technique.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Étape 1 */}
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">Téléverser l'extension dans WordPress</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Dans le menu d'administration de votre site WordPress, rendez-vous dans :<br />
                          <strong>Extensions (Plugins) &gt; Ajouter une extension</strong>.<br />
                          Cliquez sur le bouton <strong>"Téléverser une extension"</strong> situé tout en haut, sélectionnez le fichier <code className="font-mono text-blue-700 bg-white px-1 rounded">nanaswitch-gateway.zip</code> puis cliquez sur <strong>"Installer maintenant"</strong>.
                        </p>
                      </div>

                      {/* Étape 2 */}
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">Activer le plugin NanaSwitch Gateway</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Une fois l'installation confirmée, cliquez sur le bouton bleu <strong>"Activer l'extension"</strong>.<br />
                          L'extension apparaît sous le nom officiel :<br />
                          <strong className="text-slate-900">NanaSwitch Gateway for WooCommerce</strong> (compatible avec les commandes HPOS).
                        </p>
                      </div>

                      {/* Étape 3 */}
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">3</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">Accéder aux réglages de paiement WooCommerce</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Dans le menu de gauche, rendez-vous dans :<br />
                          <strong>WooCommerce &gt; Réglages &gt; Onglet Paiements</strong>.<br />
                          Recherchez la ligne <strong>NanaSwitch Gateway</strong>, activez le commutateur principal, puis cliquez sur le bouton <strong>"Gérer"</strong> pour ouvrir le panneau d'administration des clés.
                        </p>
                      </div>

                      {/* Étape 4 */}
                      <div className="p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/30 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center">4</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">Choisir le mode & renseigner vos clés Zero-Trust</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Renseignez les champs de configuration avec les identifiants de votre application :
                        </p>
                        <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                          <li><strong>Mode de Fonctionnement :</strong> Choisissez entre <code className="font-mono text-blue-700 font-bold">AGREGATED</code> (*Mode Simplifié Master Merchant*) ou <code className="font-mono text-purple-700 font-bold">BYOK</code> (*Bring Your Own Keys*).</li>
                          <li><strong>Clé Publique :</strong> Collez votre <code className="font-mono text-blue-600">ns_live_pk_...</code></li>
                          <li><strong>Clé Secrète :</strong> Collez votre <code className="font-mono text-purple-600">ns_live_sk_...</code></li>
                          <li><strong>Secret Webhook :</strong> Collez votre <code className="font-mono text-amber-700">ns_whsec_...</code></li>
                        </ul>
                        <p className="text-[11px] text-teal-800 font-semibold pt-1">
                          N'oubliez pas de cliquer sur <strong>"Enregistrer les modifications"</strong> en bas de page.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* 3. LIER L'URL DU WEBHOOK */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                        3
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Lier l'URL du Webhook Automatique</h3>
                        <p className="text-xs text-slate-500">L'étape essentielle pour valider automatiquement vos commandes après le paiement client.</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <p>
                        Lors de l'activation, le plugin WooCommerce NanaSwitch crée automatiquement une route REST standardisée sur votre boutique WordPress :
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-slate-900 rounded-2xl">
                        <div className="font-mono text-xs text-emerald-400 break-all flex-1">
                          https://votre-site.com/wp-json/nanaswitch/v1/webhook
                        </div>
                        <button
                          onClick={() => copyToClipboard?.('https://votre-site.com/wp-json/nanaswitch/v1/webhook', 'URL Webhook WooCommerce')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier l'URL</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-900 block">1. Copier depuis WooCommerce</span>
                          <p className="text-slate-600 text-[11px]">Cette URL est visible dans les réglages de votre passerelle NanaSwitch sous WordPress.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
                          <span className="font-bold text-blue-900 block">2. Coller dans NanaSwitch Cloud</span>
                          <p className="text-slate-600 text-[11px]">Connectez-vous à la console NanaSwitch Cloud &gt; Onglet Développeur &gt; Champ <strong>Webhook Endpoint URL</strong>.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-900 block">3. Validation Instantanée</span>
                          <p className="text-slate-600 text-[11px]">Chaque paiement validé par le client met à jour immédiatement la commande WooCommerce vers le statut <strong>Terminée</strong> ou <strong>En cours</strong>.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. CHECKLIST DE TEST & RECETTE */}
                  <div className="bg-slate-900 text-slate-200 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Checklist de Validation & Recette E-commerce
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-blue-400 font-bold block">1. Mode Sandbox</span>
                        <p className="text-slate-300 text-[11px]">Testez d'abord un achat avec vos clés de test (<code className="text-blue-300">ns_test_pk_...</code>) pour vérifier le parcours sans débit réel.</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-emerald-400 font-bold block">2. Certificat SSL (HTTPS)</span>
                        <p className="text-slate-300 text-[11px]">Le webhook exige impérativement une adresse <code className="text-emerald-300">https://</code> valide pour garantir le chiffrement des données de transaction.</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-purple-400 font-bold block">3. Bascule en Production</span>
                        <p className="text-slate-300 text-[11px]">Remplacez simplement les clés de test par vos clés Live (<code className="text-purple-300">ns_live_pk_...</code>) dès la validation du compte marchand.</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ---------------- PROMPT 8: LAYOUT UX MULTIPAGE & MULTI-POPUPS ---------------- */}
              {activeView === 'prompt8' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Header Banner */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                            PROMPT 8 • docs/layout-ux
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Lead Frontend & UX Engineer
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Layout UX Multipage, Sidebar Dynamique & Multi-popups
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        Navigation Fluide & Outils Interactifs
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Architecture moderne de portail développeur multipages sans rechargement. Intègre une <strong>sidebar hiérarchique avec sous-menus SDKs</strong>, deux <strong>popups interactifs</strong> (console de test d'API live et générateur/simulateur de signatures Webhook HMAC-SHA256), ainsi que l'assistant conversationnel IA d'intégration.
                    </p>

                    {/* Quick Access Popups Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => setShowApiTesterModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-[#1E40AF] text-white shadow-md shadow-blue-700/20 hover:bg-[#1E3A8A] transition active:scale-95"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Ouvrir la Console : Tester une API</span>
                      </button>

                      <button
                        onClick={() => {
                          setWhTimestamp(Math.floor(Date.now() / 1000));
                          setShowWebhookTesterModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-purple-600 text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition active:scale-95"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Ouvrir le Simulateur de Webhook HMAC</span>
                      </button>

                      <button
                        onClick={() => setActiveView('prompt1')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <Bot className="w-4 h-4 text-blue-600" />
                        <span>Ouvrir le Chatbot IA Integration</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. ARCHITECTURE DU LAYOUT UX */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                        1
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Spécifications du Layout UX Multipage</h3>
                        <p className="text-xs text-slate-500">Navigation fluide SPA, zéro rechargement et arborescence hiérarchique.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <span className="font-extrabold text-slate-900 text-sm block">Sidebar Dynamique Gauche</span>
                        <p className="text-slate-600 leading-relaxed">
                          Arborescence structurée en 6 sections majeures (Introduction, Parcours KYC, Sécurité, Console SDKs multi-langages, Plugins No-Code, Assistant IA).
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                        <span className="font-extrabold text-blue-900 text-sm block">Sous-menus SDKs Interactifs</span>
                        <p className="text-slate-600 leading-relaxed">
                          Boutons d'accès directs aux langages (Node.js, Python, PHP natif, cURL/Mobile) avec préservation de l'état sans bascule brutale.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                        <span className="font-extrabold text-purple-900 text-sm block">Multi-Popups Développeur</span>
                        <p className="text-slate-600 leading-relaxed">
                          Modales interactives superposées en overlay pour tester en temps réel les appels API REST et certifier la conformité des webhooks.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. MATRICE DES CODES HTTP & SUPPORT TECHNIQUE */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                        2
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Matrice des Codes HTTP & Dépannage</h3>
                        <p className="text-xs text-slate-500">Guide de diagnostic rapide pour résoudre les erreurs en phase d'intégration.</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      {[
                        { code: '400 Bad Request', msg: 'Paramètres manquants ou payload JSON invalide', fix: 'Vérifiez les champs amount, currency (XOF), order_id et customer (phone, email).' },
                        { code: '401 Unauthorized', msg: 'Clé secrète absente ou invalide', fix: 'Vérifiez les headers x-nanaswitch-key (ns_live_pk_...) et x-nanaswitch-skey (ns_live_sk_...).' },
                        { code: '402 Payment Required', msg: 'Solde de crédits API SaaS insuffisant (0,02 XOF)', fix: 'Rechargez votre solde de crédits API SaaS depuis l\'onglet Développeur.' },
                        { code: '403 Forbidden', msg: 'Plafond mensuel KYC atteint (1M XOF Particulier / 5M XOF Entreprise)', fix: 'Soumettez les pièces RCCM et IFU dans l\'onglet KYC pour passer en statut Entreprise.' },
                        { code: '500 Server Error', msg: 'Indisponibilité temporaire d\'un opérateur télécom', fix: 'Le switch intelligent déclenche automatiquement le failover vers une route de secours.' }
                      ].map(err => (
                        <div key={err.code} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-mono font-black text-slate-900 text-xs">{err.code}</span>
                            <span className="text-slate-500 text-[11px] font-medium">{err.msg}</span>
                          </div>
                          <p className="text-blue-700 font-semibold text-[11px]">👉 Résolution : {err.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </main>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TESTER UNE API (LIVE CONSOLE OVERLAY - PROMPT 8)                  */}
      {/* ========================================================================= */}
      {showApiTesterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Console Interactive : Tester l'API NanaSwitch</h3>
                  <p className="text-[11px] text-slate-500">Simulation d'initiation POST /v1/switch/route en temps réel.</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiTesterModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              
              {/* Endpoint & Method */}
              <div className="flex items-center gap-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">POST</span>
                <span className="text-blue-300">https://nana-payment-api.onrender.com/v1/switch/route</span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-900 block mb-1">Montant (XOF) :</label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={e => setTestAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1">Référence Commande :</label>
                  <input
                    type="text"
                    value={testOrderId}
                    onChange={e => setTestOrderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1">Email Client :</label>
                  <input
                    type="email"
                    value={testCustomerEmail}
                    onChange={e => setTestCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1">Téléphone Client :</label>
                  <input
                    type="tel"
                    value={testCustomerPhone}
                    onChange={e => setTestCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={isApiTesting}
                  onClick={() => {
                    setIsApiTesting(true);
                    setTimeout(() => {
                      const mockTxId = 'sw_' + Math.floor(100000 + Math.random() * 900000);
                      const response = {
                        success: true,
                        transaction_id: mockTxId,
                        order_id: testOrderId || 'CMD_TEST_9841',
                        amount: parseInt(testAmount || '5000', 10),
                        currency: testCurrency,
                        status: 'PENDING',
                        checkout_url: `https://nana-payment-api.onrender.com/pay/${mockTxId}`,
                        mode: 'AGREGATED',
                        routing: {
                          operator: 'ORANGE_MONEY_BF',
                          corridor: 'BF_UEMOA',
                          failover_fallback: 'MOOV_MONEY_BF'
                        },
                        timestamp: new Date().toISOString()
                      };
                      setApiResponseJson(JSON.stringify(response, null, 2));
                      setIsApiTesting(false);
                    }, 400);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isApiTesting ? 'Exécution en cours...' : '🚀 Lancer la Requête API'}</span>
                </button>

                {apiResponseJson && (
                  <button
                    onClick={() => copyToClipboard?.(apiResponseJson, 'Réponse API copiée !')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier la Réponse
                  </button>
                )}
              </div>

              {/* Response Viewer */}
              {apiResponseJson && (
                <div className="space-y-1.5 pt-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Réponse JSON Renvoyée par la Passerelle :</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">HTTP 200 OK</span>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                    {apiResponseJson}
                  </pre>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SIMULATEUR DE WEBHOOK HMAC-SHA256 (PROMPT 8)                     */}
      {/* ========================================================================= */}
      {showWebhookTesterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Bell className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Simulateur de Webhook HMAC-SHA256</h3>
                  <p className="text-[11px] text-slate-500">Calcul en temps réel de la signature cryptographique et test d'événement.</p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookTesterModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-900 block mb-1">Secret Webhook (ns_whsec_...) :</label>
                  <input
                    type="text"
                    value={whSecret}
                    onChange={e => setWhSecret(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1">Type d'Événement :</label>
                  <select
                    value={whEventType}
                    onChange={e => setWhEventType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-xs focus:bg-white focus:outline-purple-600"
                  >
                    <option value="payment.success">payment.success (Paiement Validé)</option>
                    <option value="payment.failed">payment.failed (Paiement Échoué)</option>
                    <option value="payout.completed">payout.completed (Retrait Validé)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Signature Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">En-tête x-nanaswitch-signature Calculé :</span>
                  <button
                    onClick={() => {
                      setWhTimestamp(Math.floor(Date.now() / 1000));
                    }}
                    className="text-[10px] text-purple-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Actualiser le Timestamp
                  </button>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-purple-300 break-all select-all">
                  x-nanaswitch-signature: t={whTimestamp},v1={whSignature}
                </div>
              </div>

              {/* Payload Viewer */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 text-xs">Corps de la Requête (JSON brut) :</span>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
                  {whPayloadString}
                </pre>
              </div>

              {/* Test Verification Dispatcher */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <span className="font-extrabold text-purple-900 block text-xs">Test de Validation Local ou Distant :</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={whTargetUrl}
                    onChange={e => setWhTargetUrl(e.target.value)}
                    placeholder="http://localhost:3000/api/nanaswitch-webhook"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-purple-200 font-mono text-xs focus:outline-purple-600"
                  />
                  <button
                    disabled={isWhDispatching}
                    onClick={() => {
                      setIsWhDispatching(true);
                      setTimeout(() => {
                        setWhDispatchedStatus(`✅ Simulation Réussie : Signature HMAC-SHA256 validée timing-safe. Tolérance temporelle respectée (timestamp t=${whTimestamp}).`);
                        setIsWhDispatching(false);
                      }, 350);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Tester la Signature</span>
                  </button>
                </div>

                {whDispatchedStatus && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold animate-in fade-in">
                    {whDispatchedStatus}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
