'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Award, 
  Send, 
  User, 
  Bot, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  Sparkles,
  HelpCircle,
  Briefcase,
  X,
  MessageCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

export interface Message {
  id?: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
  internalThought?: string;
}

export interface GrowthDirectorAssistantProps {
  userFullName?: string;
  userName?: string;
  storeName?: string;
  currency?: string;
  sellerMode?: string;
  isNewUser?: boolean;
  salesCount?: number;
  productsCount?: number;
  currentPlan?: string;
  isFloating?: boolean;
  onClose?: () => void;
  onNavigateToPlan?: () => void;
}

function extractFirstName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  const clean = name.trim().replace(/^(m\.|mme\.|dr\.|prof\.)\s+/i, '');
  return clean.split(/\s+/)[0] || '';
}

function sanitizeClientInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:xkeysib-|AIza|sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,})[a-zA-Z0-9_\-]*/gi, '[CLÉ_PROTÉGÉE]')
    .replace(/(?:password|mot\s*de\s*passe)\s*[:=]\s*['"]?[^\s'"]+/gi, '[MOT_DE_PASSE_PROTÉGÉ]');
}

export function GrowthDirectorAssistant({
  userFullName,
  userName,
  storeName = 'Ma Boutique Pro',
  currency = 'FCFA',
  sellerMode = 'ecommerce',
  isNewUser = true,
  salesCount = 0,
  productsCount = 0,
  currentPlan = 'Starter',
  isFloating = false,
  onClose,
  onNavigateToPlan
}: GrowthDirectorAssistantProps) {
  const firstName = useMemo(() => extractFirstName(userFullName || userName), [userFullName, userName]);
  
  // Salutation humaine personnalisée selon le statut nouveau vs ancien inscrit
  const initialGreeting = useMemo(() => {
    const greeting = firstName ? `Bonjour ${firstName} !` : `Salutations distinguées !`;
    if (isNewUser) {
      return `${greeting} C'est un réel plaisir de vous accueillir sur Nanasore.\n\nPuis-je vous aider à choisir la formule idéale pour lancer ${storeName} en toute rentabilité, ou préférez-vous que je vous présente les outils qui correspondent le mieux à votre profil ?`;
    }
    return `Heureux de vous retrouver, ${firstName || 'cher partenaire'} !\n\nLes indicateurs de ${storeName} sont au vert. Souhaitez-vous que nous optimisions vos marges avec une campagne ciblée sur le Studio E-mailing Pro, ou regardons-nous la gestion de vos stocks comptoir ?`;
  }, [firstName, isNewUser, storeName]);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome-1',
      sender: 'ai', 
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // État minimisé : respect absolu du confort visuel du marchand
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && isFloating) {
      return localStorage.getItem('nsore_assistant_minimized') === 'true';
    }
    return false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions rapides adaptées intelligemment au statut de l'utilisateur (Règle du Ping-Pong)
  const quickPrompts = useMemo(() => {
    if (isNewUser) {
      return [
        "Quel plan pour vendre mon livre ?",
        "Comment activer les 29 modules via l'Omnibar ?",
        "M'accompagner à remplir mon KYC",
        "Paiement à la commission vs Abonnement fixe"
      ];
    }
    return [
      "Comment activer un nouveau module via l'Omnibar ?",
      "Comment augmenter ma marge nette ce mois-ci ?",
      "Lancer une offre flash ou un tunnel de vente",
      "Dois-je basculer sur l'abonnement fixe ?"
    ];
  }, [isNewUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isLoading, isMinimized]);

  const toggleMinimize = () => {
    setIsMinimized(prev => {
      const next = !prev;
      if (typeof window !== 'undefined' && isFloating) {
        localStorage.setItem('nsore_assistant_minimized', String(next));
      }
      return next;
    });
  };

  const handleSend = async (textToSend?: string) => {
    const rawQuery = (textToSend || input).trim();
    if (!rawQuery || isLoading) return;

    // Guardrail strict côté client
    const cleanQuery = sanitizeClientInput(rawQuery);

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: cleanQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/growth-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: cleanQuery,
          messages: updatedMessages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            sender: m.sender,
            content: m.text,
            text: m.text
          })),
          merchantContext: {
            userFullName: userFullName || userName,
            userName: firstName,
            storeName,
            currency,
            sellerMode,
            isNewUser,
            salesCount,
            productsCount,
            currentPlan
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.reply) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.reply,
            internalThought: data.internalThought,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        // Fallback local instantané avec psychologie commerciale humaine complète
        const q = cleanQuery.toLowerCase();
        const prevAiMsg = [...messages].reverse().find(m => m.sender === 'ai')?.text?.toLowerCase() || '';
        let fallbackText = `C'est une excellente question pour ${storeName}. En tant que commerçant, notre priorité est de transformer chaque visiteur en client payant tout en protégeant vos marges.\n\nQuel produit ou service souhaitez-vous commercialiser en priorité aujourd'hui ?`;
        
        // Réponses contextuelles "oui" / "non" selon la question précédente
        const isAcceptingKycHelp = (
          q === 'oui' || q.includes('accompagne') || q.includes('d\'accord') ||
          q.includes('daccord') || q.includes('ok') || q.includes('montre') ||
          q.includes('je veux bien') || q.includes('vas-y') || q.includes('vas y') ||
          q.includes('comment faire') || q.includes('allons-y') || q.includes('c\'est parti')
        ) && (
          prevAiMsg.includes('partie 1') || prevAiMsg.includes('accompagner') ||
          prevAiMsg.includes('pièce d\'identité') || prevAiMsg.includes('remplir votre kyc')
        ) && !q.includes('deja') && !q.includes('déjà');

        if (
          q.includes('ou avez vous mis') || q.includes('où avez vous mis') ||
          q.includes('ou se trouve') || q.includes('où se trouve') ||
          q.includes('ou trouver') || q.includes('où trouver') ||
          q.includes('ou cliquer') || q.includes('où cliquer') ||
          q.includes('module d\'identification') || q.includes('bouton pour s\'identifier') ||
          q.includes('bouton kyc') || q.includes('ou est le kyc') || q.includes('où est le kyc')
        ) {
          fallbackText = `Le module d'identification KYC de Nanasore est accessible à 4 endroits stratégiques de votre tableau de bord :\n\n1. **Tout en haut sous le nom de votre boutique (Le plus rapide)** : Vous y trouvez directement les 2 badges cliquables **[P1 : INDIVIDUEL]** et **[P2 : ENTREPRISE]**. Un simple clic ouvre instantanément l'étape souhaitée.\n2. **Dans le Hub des Modules** : La carte de module intitulée **« Chaîne d’Identification KYC (Partie 1 & 2) »** avec son bouton vert **« Gérer l’Identification »** dans la section Technologies.\n3. **Dans les Paramètres Généraux** : Cliquez sur l'icône **Engrenage / Sliders** tout en haut à droite, puis sélectionnez l'onglet vert **« Chaîne d'Identification (2 Étapes) »**.\n4. **Dans l'Omnibar au centre en haut** : Tapez simplement **« KYC »** ou **« Identification »** pour l'ouvrir en 1 seconde.\n\nAvez-vous votre pièce d'identité sous la main pour que nous validions la Partie 1 ensemble dès maintenant ?`;
        } else if (isAcceptingKycHelp) {
          fallbackText = `C'est parti, je vous accompagne pas à pas ! Voici le chemin exact pour ouvrir le module et vous identifier en toute simplicité :\n\n📍 **1. Où se trouve le bouton pour ouvrir le formulaire :**\nSur votre écran, vous avez le choix :\n- **Le plus direct** : Cliquez tout en haut sur le badge **« P1 : INDIVIDUEL »** situé juste sous le nom de votre boutique dans le bandeau supérieur.\n- *(Ou cliquez sur l'icône **Paramètres / Sliders** en haut à droite, puis sur l'onglet vert **« Chaîne d'Identification (2 Étapes) »**)*.\n- *(Ou tapez simplement **« KYC »** dans l'Omnibar en haut au centre)*.\n\n📄 **2. Remplir la Partie 1 (Gérant - 2 minutes) :**\n1. Téléversez la photo recto/verso de votre pièce d'identité officielle (CNIB, Passeport ou Permis).\n2. Prenez votre selfie de conformité avec la caméra.\n3. Cliquez sur **« Valider la Partie 1 »**.\n\n🏢 **3. Enchaîner sur la Partie 2 (Entreprise - 1 minute) :**\n1. Renseignez le nom de votre entreprise, votre NIF/RCCM (ou attestation d'activité) et l'adresse.\n2. Cliquez sur **« Soumettre le dossier KYC »**.\n\nVos encaissements réels Mobile Money et Cartes Bancaires seront immédiatement débloqués sans limite de volume.\n\nVoyez-vous le badge **« P1 : INDIVIDUEL »** tout en haut de votre écran pour démarrer ?`;
        } else if ((q === 'non' || q.includes('pas encore') || q.includes('pas de compte') || q.includes('pas créé')) && (prevAiMsg.includes('ouvert votre compte') || prevAiMsg.includes('boutique sur nanasore'))) {
          fallbackText = `C'est tout à fait normal ! Pour activer votre formule et commencer à encaisser vos clients en toute conformité, la première étape indispensable est d'ouvrir votre compte boutique. La bonne nouvelle, c'est que cela ne prend que 2 minutes et je peux vous accompagner dès maintenant. Souhaitez-vous que nous procédions à l'ouverture ensemble tout de suite ?`;
        } else if ((q === 'oui' || q.includes('deja fait') || q.includes('déjà fait') || q.includes('j\'ai un compte')) && (prevAiMsg.includes('ouvert votre compte') || prevAiMsg.includes('boutique sur nanasore'))) {
          fallbackText = `Parfait, vous avez une longueur d'avance ! Il vous suffit désormais de taper **Ultimate Funnel** (si c'est un livre ou produit vedette) ou **Vitrine E-Shop** dans l'Omnibar en haut de votre écran pour créer votre page et fixer votre prix. Avez-vous déjà déterminé le prix de vente de votre produit ?`;
        } else if ((q === 'non' || q.includes('pas encore') || q.includes('c\'est quoi kyc')) && (prevAiMsg.includes('rempli votre kyc') || prevAiMsg.includes('votre kyc'))) {
          fallbackText = `Vous devez impérativement le faire pour débloquer les encaissements réels et activer vos modules commerciaux. Mais la très bonne nouvelle, c'est que c'est simple, rapide et que je suis là pour vous accompagner pas à pas dès maintenant.\n\nAvez-vous votre pièce d'identité officielle sous la main pour valider la Partie 1 en 2 minutes ?`;
        } else if ((q.includes('deja fait') || q.includes('déjà fait') || q.includes('deja rempli') || q.includes('déjà rempli') || q.includes('deja valide') || q.includes('déjà validé')) || (q === 'oui' && prevAiMsg.includes('avez-vous déjà rempli votre kyc ? oui ou non'))) {
          fallbackText = `Félicitations, vos voyants sont au vert ! Pour activer n'importe quel module, tapez simplement son nom dans l'**Omnibar** en haut de votre écran, cliquez sur 'Activer' ou 'Tester en démo', et il est immédiatement prêt à l'emploi. Quel module souhaitez-vous lancer en premier ?`;
        } else if (q.includes('livre') || q.includes('ebook') || q.includes('e-book') || q.includes('roman') || q.includes('manuel')) {
          // Schéma 1 : Vente de Livre -> Recommandation Plan + Question fermeture compte
          fallbackText = `Pour vendre votre livre en toute rentabilité, le plan **Pay-as-you-go** ou la formule à la **Commission (0 FCFA de frais fixes)** est la solution idéale : vous déployez votre page de vente sans risque et ne payez qu'une commission modérée par exemplaire vendu.\n\nAvez-vous déjà ouvert votre compte boutique sur Nanasore ?`;
        } else if (q.includes('comment activer') || (q.includes('activer') && (q.includes('pay as you go') || q.includes('pay-as-you-go') || q.includes('module')))) {
          // Schéma 2 : Question Retour Prérequis KYC
          fallbackText = `Avant de vous guider dans l'activation, permettez-moi de vous poser une question essentielle : avez-vous déjà rempli votre KYC (vérification d'identité) ? Oui ou non ?`;
        } else if (q.includes('kyc') || q.includes('identité') || q.includes('verification') || q.includes('vérification')) {
          fallbackText = `Le KYC (Know Your Customer) est la vérification officielle obligatoire qui sécurise vos encaissements Mobile Money et Cartes Bancaires : Partie 1 (votre pièce d'identité et selfie) et Partie 2 (les coordonnées de votre entreprise).\n\nPuis-je vous accompagner pour remplir la Partie 1 dès maintenant en 2 minutes ?`;
        } else if (q.includes('omnibar') || q.includes('barre de recherche')) {
          fallbackText = `L'**Omnibar** est votre commande centrale Nanasore, située tout en haut de votre écran. Il vous suffit d'y taper le nom de n'importe lequel de nos 29 modules pour l'ouvrir, visionner une démo ou l'activer en un clic.\n\nQuel outil souhaitez-vous chercher dans l'Omnibar à cet instant ?`;
        } else if (q.includes('enerve') || q.includes('énerv') || q.includes('agace') || q.includes('reponds pas')) {
          fallbackText = `Je vous présente mes excuses les plus sincères, ${firstName || 'cher partenaire'}. Mon intention n'était absolument pas de vous heurter, mais uniquement de vous propulser vers la rentabilité.\n\nReprenons calmement : quelle est votre question prioritaire à cet instant précis ?`;
        } else if (q.includes('business') || q.includes('argent') || q.includes('combinaison') || q.includes('pack')) {
          fallbackText = `Pour générer des revenus solides sur Nanasore, vous avez l'embarras du choix parmi nos 29 modules : la combinaison **Caisse POS + Vitrine WhatsApp** pour le commerce physique, ou **Ultimate Funnel + NaNa Cours Forge** pour vendre des livres et formations numériques.\n\nQuel domaine vous correspond le mieux : les produits physiques ou les produits numériques ?`;
        } else if (q.includes('commission') || q.includes('risque')) {
          fallbackText = `Entre nous, le **Paiement à la Commission** est l'option idéale pour débuter : vous activez nos 29 modules sans débourser un centime de frais fixe, et Nanasore ne prélève une commission que lorsque vous encaissez réellement.\n\nPréférez-vous démarrer avec cette formule sans engagement, ou souhaitez-vous comparer avec l'abonnement fixe ?`;
        } else if (q.includes('plan') || q.includes('abonnement')) {
          fallbackText = `Regardons les chiffres concrètement, ${firstName || 'cher entrepreneur'} : si vous lancez votre activité, la formule à la commission (0 FCFA de coût fixe) est la plus sûre. Dès que vos ventes dépassent un certain seuil mensuel, l'abonnement fixe protège 100% de vos marges nettes.\n\nAvez-vous déjà un volume de ventes mensuel estimé, ou préférez-vous débuter en douceur à la commission ?`;
        }

        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (networkError) {
      console.warn('[AGENT_NSORE] Connexion résiliente:', networkError);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Je reste à vos côtés, ${firstName || 'cher partenaire'}. Sur Nanasore, vos 29 modules sont tous accessibles via l'Omnibar pour dynamiser vos ventes au comptoir et en ligne.\n\nSouhaitez-vous que nous vérifiions ensemble votre KYC ou que nous préparions votre première page de vente ?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // VUE FLOTTANTE MINIMISÉE (DISCRÈTE, NE GÊNE AUCUNEMENT L'UTILISATEUR)
  // =========================================================================
  if (isFloating && isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={toggleMinimize}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Consulter l'Agent Nsore (Directeur de Croissance)"
          aria-label="Ouvrir l'assistant Agent Nsore"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
            <Award className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black leading-tight flex items-center gap-1.5">
              <span>Agent Nsore</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-[10px] text-blue-100 font-medium leading-tight">Directeur Commercial</p>
          </div>
          <ChevronUp className="w-4 h-4 text-blue-200 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  // =========================================================================
  // VUE STANDARD / DOCK DÉPLIÉ
  // =========================================================================
  return (
    <div className={`bg-[#FFFFFF] rounded-3xl border-2 border-[#2563EB]/30 shadow-xl transition-all duration-300 text-slate-800 ${
      isFloating 
        ? 'fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-full sm:max-w-md md:max-w-lg shadow-2xl border-blue-500/50' 
        : 'w-full p-4 sm:p-7 space-y-5'
    }`}>
      
      {/* En-tête de l'Agent Nsore */}
      <div className={`flex items-center justify-between gap-3 border-b border-blue-100 ${
        isFloating ? 'p-3.5 pb-2.5' : 'pb-4'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-indigo-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30 shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Agent Nsore</h2>
              <span className="px-2 py-0.5 bg-[#2563EB] text-white font-black text-[9px] rounded-full uppercase tracking-wider shadow-2xs">
                Directeur Croissance
              </span>
              {isNewUser ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] rounded-full hidden xs:inline">
                  Nouveau Partenaire
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[9px] rounded-full hidden xs:inline">
                  Partenaire Actif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {firstName ? `Conseiller de ${firstName}` : 'Votre mentor stratégique'} • Monétisation & Arbitrage
            </p>
          </div>
        </div>

        {/* Boutons de contrôle discrets */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Sécurisé</span>
          </div>

          {/* Bouton Réduire / Déplier */}
          <button
            type="button"
            onClick={toggleMinimize}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition active:scale-95"
            title={isMinimized ? "Déplier l'assistant" : "Réduire pour dégager l'écran"}
            aria-label="Réduire"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 cursor-pointer transition active:scale-95"
              title="Fermer le conseiller"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Corps du Widget (Visible quand déplié) */}
      {!isMinimized && (
        <div className={`space-y-4 ${isFloating ? 'p-3.5 pt-0' : ''}`}>
          
          {/* Boîte de Discussion - Blanc Cassé (#FBF9F5) et Bleu Royal (#2563EB) */}
          <div 
            className="bg-[#FBF9F5] border border-slate-200/90 rounded-2xl p-3.5 sm:p-4.5 h-72 sm:h-84 overflow-y-auto space-y-3.5 flex flex-col shadow-inner"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div 
                  key={msg.id || idx} 
                  className={`flex gap-2.5 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-xs ${
                    isUser 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-[#2563EB] text-white shadow-blue-500/20'
                  }`}>
                    {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>

                  {/* Bulle de texte (Ping-Pong concis) */}
                  <div className="space-y-1 max-w-[85%]">
                    <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                      isUser 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-medium'
                    }`}>
                      <div className="whitespace-pre-line">
                        {msg.text}
                      </div>

                      {/* Boutons d'Action Directe (Accompagnement opérationnel 1-clic) */}
                      {!isUser && (msg.text.includes('KYC') || msg.text.includes('P1 : INDIVIDUEL') || msg.text.includes("module d'identification")) && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('nanasore_open_kyc', { detail: { step: 1 } }));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Ouvrir la Chaîne d'Identification KYC (Partie 1) →</span>
                          </button>
                        </div>
                      )}

                      {!isUser && msg.text.includes('ouvrir votre compte') && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToPlan) onNavigateToPlan();
                              else window.dispatchEvent(new CustomEvent('nanasore_open_register'));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Ouvrir mon compte boutique en 2 min →</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.timestamp && (
                      <p className={`text-[9.5px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Animation de réflexion naturelle (Typing cadence) */}
            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs font-semibold text-blue-800 animate-pulse bg-blue-50/80 p-2.5 px-3 rounded-2xl border border-blue-200/80 w-fit">
                <div className="w-6 h-6 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>L'Agent Nsore analyse votre stratégie...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions rapides en 1 clic (Ping-Pong) */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              <span>Questions Stratégiques Fréquentes</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50 shadow-2xs"
                >
                  <span className="truncate max-w-[240px] sm:max-w-none">{prompt}</span> 
                  <ArrowRight className="w-2.5 h-2.5 text-[#2563EB] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Barre de saisie sécurisée */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={firstName ? `${firstName}, posez votre question à l'Agent Nsore...` : "Posez votre question à l'Agent Nsore..."}
              className="flex-1 px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
            />
            <button
              type="button"
              disabled={isLoading || !input.trim()}
              onClick={() => handleSend()}
              className="px-4 sm:px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span className="hidden xs:inline">Envoyer</span> 
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Note de confidentialité & Sécurité absolue */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex-wrap gap-1">
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <Lock className="w-3 h-3 text-emerald-600" />
              Confidentialité garantie • Mots de passe & clés API scellés
            </span>
            <span className="text-slate-400">
              Modèles : Abonnement • Commission • Pay-as-you-go
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
