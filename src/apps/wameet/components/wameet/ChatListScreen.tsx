import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  CheckCheck,
  ChevronLeft,
  Send,
  Mic,
  Image as ImageIcon,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  ShieldCheck,
  ShoppingBag,
  Coins,
  MapPin,
  Lock,
  Sparkles,
  Volume2,
  Plus,
  Gift,
  Users,
  PieChart,
  Flame,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import { MiniAppsGridModal, MiniAppActionPayload } from './MiniAppsGridModal';

export interface ChatActionBadge {
  type: 'farotage' | 'delivery' | 'escrow' | 'voice' | 'product';
  label: string;
  color: string;
}

export type ChatTransactionStatus = 'COMMANDE' | 'LIVRER' | 'PAYE' | 'NONE';
export type ChatFilterType = 'ALL' | 'UNREAD' | 'COMMANDE' | 'LIVRER' | 'PAYE';

export interface ChatConversationItem {
  id: string;
  memberName: string;
  memberHandle: string;
  memberAvatar: string;
  memberBadge: string;
  isOnline: boolean;
  lastActivityLabel: string;
  unreadCount: number;
  lastMessagePreview: string;
  actionBadge?: ChatActionBadge;
  transactionStatus?: ChatTransactionStatus;
  messages: Array<{
    id: string;
    sender: 'me' | 'them';
    text?: string;
    createdAt: string;
    type?: 'text' | 'voice' | 'image' | 'transaction';
    audioDurationSec?: number;
    transactionInfo?: {
      title: string;
      amountFcfa?: number;
      status: string;
      badge?: string;
      imageUrl?: string;
      category?: string;
      meta?: Record<string, any>;
    };
  }>;
}

export interface ChatListScreenProps {
  currentUserProfile: {
    name: string;
    handle: string;
    avatarUrl: string;
    statusBadge: string;
  };
  initialRecipient?: {
    name: string;
    handle: string;
    avatarUrl: string;
    contextReelTitle?: string;
  } | null;
  onOpenShopForMember?: (product?: any, memberHandle?: string) => void;
  onOpenProfileForMember?: (memberName: string, memberHandle: string) => void;
  onOpenContacts?: () => void;
}

const INITIAL_CONVERSATIONS: ChatConversationItem[] = [
  {
    id: 'conv-1',
    memberName: 'Awa Ouédraogo',
    memberHandle: '@awa.empire.bf',
    memberAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🛍️ Commerçante & E-Shop',
    isOnline: true,
    lastActivityLabel: '19:42',
    unreadCount: 2,
    lastMessagePreview: 'Votre commande Coffret Karité a été remise au livreur Swarm !',
    transactionStatus: 'LIVRER',
    actionBadge: {
      type: 'delivery',
      label: '🛍️ Commande Swarm Delivery',
      color: 'bg-amber-50 text-amber-800 border border-amber-200/70'
    },
    messages: [
      {
        id: 'm-1',
        sender: 'them',
        text: 'Bonsoir ! Merci pour votre achat en direct sur le Reel Wameet 🌙',
        createdAt: '19:35',
        type: 'text'
      },
      {
        id: 'm-2',
        sender: 'them',
        createdAt: '19:40',
        type: 'transaction',
        transactionInfo: {
          title: 'Commande #SW-8492 validée',
          amountFcfa: 18500,
          status: 'Livreur en route (Livraison estimée : 25 min)'
        }
      },
      {
        id: 'm-3',
        sender: 'them',
        text: 'Votre commande Coffret Karité a été remise au livreur Swarm !',
        createdAt: '19:42',
        type: 'text'
      }
    ]
  },
  {
    id: 'conv-2',
    memberName: 'Salif Tech & Gadgets',
    memberHandle: '@salif.tech.ci',
    memberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🚀 Entrepreneur Hybride',
    isOnline: true,
    lastActivityLabel: '19:15',
    unreadCount: 1,
    lastMessagePreview: 'Farotage de 5 000 FCFA reçu pour booster le direct ! 🎉',
    transactionStatus: 'PAYE',
    actionBadge: {
      type: 'farotage',
      label: '💸 Farotage reçu (+5 000 F)',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
    },
    messages: [
      {
        id: 'm-4',
        sender: 'them',
        text: 'Salut Ibrahim ! Merci infiniment pour le soutien pendant notre Live Shopping.',
        createdAt: '19:10',
        type: 'text'
      },
      {
        id: 'm-5',
        sender: 'them',
        createdAt: '19:15',
        type: 'transaction',
        transactionInfo: {
          title: 'Farotage Sécurisé Wameet',
          amountFcfa: 5000,
          status: 'Crédité sur votre Portefeuille'
        }
      }
    ]
  },
  {
    id: 'conv-3',
    memberName: 'Dr. Idriss Kaboré',
    memberHandle: '@idriss.academie',
    memberAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🎓 Formateur & Mentor',
    isOnline: true,
    lastActivityLabel: '18:50',
    unreadCount: 0,
    lastMessagePreview: 'Fonds de la masterclass sécurisés en attente de validation.',
    transactionStatus: 'COMMANDE',
    actionBadge: {
      type: 'escrow',
      label: '🔒 Escrow Sécurisé (25 000 F)',
      color: 'bg-blue-50 text-[#2563EB] border border-blue-200/70'
    },
    messages: [
      {
        id: 'm-6',
        sender: 'them',
        text: 'Bonsoir ! Votre accès à la Masterclass Tunnels 12 Blocs a été débloqué.',
        createdAt: '18:48',
        type: 'text'
      },
      {
        id: 'm-7',
        sender: 'them',
        text: 'Fonds de la masterclass sécurisés en attente de validation.',
        createdAt: '18:50',
        type: 'text'
      }
    ]
  },
  {
    id: 'conv-4',
    memberName: 'Fatou Ndiaye (Dakar)',
    memberHandle: '@fatou.dakar',
    memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🎨 Créatrice & Mode',
    isOnline: false,
    lastActivityLabel: '17:30',
    unreadCount: 0,
    lastMessagePreview: '🎙️ Note vocale (0:34)',
    transactionStatus: 'NONE',
    actionBadge: {
      type: 'voice',
      label: '🎙️ Note vocale (0:34)',
      color: 'bg-slate-100 text-slate-700 border border-slate-200/70'
    },
    messages: [
      {
        id: 'm-8',
        sender: 'them',
        text: 'Coucou ! J’ai adoré ton post sur Wameet, on se fait un live demain ?',
        createdAt: '17:28',
        type: 'text'
      },
      {
        id: 'm-9',
        sender: 'them',
        createdAt: '17:30',
        type: 'voice',
        audioDurationSec: 34
      }
    ]
  },
  {
    id: 'conv-5',
    memberName: 'Moussa Traoré',
    memberHandle: '@moussa.digital',
    memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    memberBadge: '💡 Développeur & IA',
    isOnline: true,
    lastActivityLabel: '15:10',
    unreadCount: 0,
    lastMessagePreview: 'Rendez-vous calé pour la démo NaNa POS.',
    transactionStatus: 'NONE',
    messages: [
      {
        id: 'm-10',
        sender: 'them',
        text: 'Salut Ibrahim ! La liaison API NaNa POS avec les Reels est prête.',
        createdAt: '15:05',
        type: 'text'
      },
      {
        id: 'm-11',
        sender: 'me',
        text: 'Super Moussa ! On teste ça ce soir.',
        createdAt: '15:09',
        type: 'text'
      },
      {
        id: 'm-12',
        sender: 'them',
        text: 'Rendez-vous calé pour la démo NaNa POS.',
        createdAt: '15:10',
        type: 'text'
      }
    ]
  },
  {
    id: 'conv-6',
    memberName: 'Aminata Cissé • Wax Design',
    memberHandle: '@aminata.wax',
    memberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🛍️ Créatrice Mode',
    isOnline: true,
    lastActivityLabel: '14:20',
    unreadCount: 1,
    lastMessagePreview: 'Votre commande #CMD-902 est confirmée et en cours de préparation.',
    transactionStatus: 'COMMANDE',
    actionBadge: {
      type: 'product',
      label: '📦 Commande en préparation',
      color: 'bg-blue-50 text-[#2563EB] border border-blue-200/70'
    },
    messages: [
      {
        id: 'm-20',
        sender: 'them',
        text: 'Votre commande #CMD-902 est confirmée et en cours de préparation.',
        createdAt: '14:20',
        type: 'text'
      }
    ]
  },
  {
    id: 'conv-7',
    memberName: 'Oumar Diallo (Swarm Express)',
    memberHandle: '@oumar.livreur',
    memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🛵 Livreur Partenaire Swarm',
    isOnline: true,
    lastActivityLabel: '13:55',
    unreadCount: 0,
    lastMessagePreview: 'Je suis devant votre portail avec le colis de la boutique !',
    transactionStatus: 'LIVRER',
    actionBadge: {
      type: 'delivery',
      label: '🚚 Colis en cours de livraison',
      color: 'bg-amber-50 text-amber-800 border border-amber-200/70'
    },
    messages: [
      {
        id: 'm-21',
        sender: 'them',
        text: 'Je suis devant votre portail avec le colis de la boutique !',
        createdAt: '13:55',
        type: 'text'
      }
    ]
  },
  {
    id: 'conv-8',
    memberName: 'Koffi Digital Entreprise',
    memberHandle: '@koffi.tech',
    memberAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    memberBadge: '💡 Business & Tech',
    isOnline: false,
    lastActivityLabel: '11:15',
    unreadCount: 0,
    lastMessagePreview: 'Paiement de 42 000 FCFA reçu avec succès via Wameet.',
    transactionStatus: 'PAYE',
    actionBadge: {
      type: 'farotage',
      label: '💳 Paiement Confirmé (42 000 F)',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
    },
    messages: [
      {
        id: 'm-22',
        sender: 'them',
        text: 'Paiement de 42 000 FCFA reçu avec succès via Wameet.',
        createdAt: '11:15',
        type: 'text'
      }
    ]
  }
];

/**
 * COMPOSANT ChatListScreen (Prompt 46 : L'Écran Wameet Messagerie Épurée)
 * 
 * Directives UI/UX au millimètre :
 * 1. Liste des Conversations :
 *    - Chaque ligne de chat prend toute la largeur : w-full px-4 py-3 flex items-center.
 * 2. Séparateurs Subtils :
 *    - Fini les cartes.
 *    - Ligne de séparation extrêmement fine uniquement sous le texte, pas sous l'avatar (border-b border-gray-100 ml-16).
 * 3. Indicateurs d'Action :
 *    - Affiche clairement les notifications de transactions ("💸 Farotage reçu", "🛍️ Commande Swarm Delivery", "🔒 Escrow")
 *      avec des micro-badges colorés.
 */
export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  currentUserProfile,
  initialRecipient,
  onOpenShopForMember,
  onOpenProfileForMember,
  onOpenContacts
}) => {
  const [conversations, setConversations] = useState<ChatConversationItem[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChatFilterType>('ALL');
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
  const [messageInput, setMessageInput] = useState('');
  const [isMiniAppsModalOpen, setIsMiniAppsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (newFilter: ChatFilterType) => {
    playTapBeep();
    setFilterType(newFilter);
    setIsQueryLoading(true);
    // Simule la requête de rechargement en base de données ciblée par statut
    setTimeout(() => {
      setIsQueryLoading(false);
    }, 200);
  };

  // Auto-sélection si un destinataire initial est transmis
  useEffect(() => {
    if (initialRecipient) {
      const existing = conversations.find(c => c.memberHandle === initialRecipient.handle);
      if (existing) {
        setSelectedConvId(existing.id);
      } else {
        const newConv: ChatConversationItem = {
          id: `conv-auto-${Date.now()}`,
          memberName: initialRecipient.name,
          memberHandle: initialRecipient.handle,
          memberAvatar: initialRecipient.avatarUrl,
          memberBadge: 'Membre Wameet',
          isOnline: true,
          lastActivityLabel: 'À l’instant',
          unreadCount: 0,
          lastMessagePreview: initialRecipient.contextReelTitle
            ? `Discussion au sujet de : ${initialRecipient.contextReelTitle}`
            : 'Nouvelle conversation',
          transactionStatus: 'NONE',
          messages: [
            {
              id: `m-init-${Date.now()}`,
              sender: 'them',
              text: `Bonjour ${currentUserProfile.name} ! ${
                initialRecipient.contextReelTitle
                  ? `J’ai vu votre intérêt pour "${initialRecipient.contextReelTitle}". Comment puis-je vous aider ?`
                  : 'Ravi d’échanger avec vous sur Wameet !'
              }`,
              createdAt: 'À l’instant',
              type: 'text'
            }
          ]
        };
        setConversations(prev => [newConv, ...prev]);
        setSelectedConvId(newConv.id);
      }
    }
  }, [initialRecipient]);

  // Filtrage des conversations selon l'état de filtrage de la requête de base de données
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch =
        c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.memberHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterType === 'UNREAD') return c.unreadCount > 0;
      if (filterType === 'COMMANDE') return c.transactionStatus === 'COMMANDE';
      if (filterType === 'LIVRER') return c.transactionStatus === 'LIVRER';
      if (filterType === 'PAYE') return c.transactionStatus === 'PAYE';
      return true;
    });
  }, [conversations, searchQuery, filterType]);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === selectedConvId) || null,
    [conversations, selectedConvId]
  );

  const handleSelectConversation = (convId: string) => {
    playTapBeep();
    setSelectedConvId(convId);
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConvId) return;
    playValidationBeep();
    const textToSend = messageInput.trim();
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== selectedConvId) return c;
        return {
          ...c,
          lastActivityLabel: nowTime,
          lastMessagePreview: textToSend,
          messages: [
            ...c.messages,
            {
              id: `msg-${Date.now()}`,
              sender: 'me',
              text: textToSend,
              createdAt: nowTime,
              type: 'text'
            }
          ]
        };
      })
    );
    setMessageInput('');

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleMiniAppAction = (payload: MiniAppActionPayload) => {
    if (!selectedConvId) return;
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatConversationItem['messages'][0] = {
      id: `msg-mini-${Date.now()}`,
      sender: 'me',
      text: payload.subtitle || payload.title,
      createdAt: nowTime,
      type: 'transaction',
      transactionInfo: {
        title: payload.title,
        amountFcfa: payload.amountFcfa,
        status: payload.subtitle || payload.badge || 'Action confirmée via Wameet',
        badge: payload.badge,
        imageUrl: payload.imageUrl,
        category: payload.type,
        meta: payload.meta
      }
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== selectedConvId) return c;
        return {
          ...c,
          lastActivityLabel: nowTime,
          lastMessagePreview: `${payload.badge || '⚡ Mini-App'} : ${payload.title}`,
          messages: [...c.messages, newMsg]
        };
      })
    );

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  // =========================================================================
  // 1. VUE CONVERSATION DIRECTE PLEIN ÉCRAN (SI UNE CONVERSATION EST OUVERTE)
  // =========================================================================
  if (activeConversation) {
    return (
      <div className="h-full w-full bg-[#EFEAE2] flex flex-col select-none relative animate-in fade-in duration-200">
        {/* Header de Conversation Native Wameet */}
        <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setSelectedConvId(null);
              }}
              className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer -ml-1 transition active:scale-95"
              title="Retour aux discussions"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="relative shrink-0">
              <img
                src={activeConversation.memberAvatar}
                alt={activeConversation.memberName}
                className="w-10 h-10 rounded-full object-cover bg-slate-100"
              />
              {activeConversation.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                {activeConversation.memberName}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium truncate">
                {activeConversation.isOnline ? 'En ligne' : activeConversation.memberBadge}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-600">
            <button
              type="button"
              onClick={() => playTapBeep()}
              className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
              title="Appel audio Wameet"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => playTapBeep()}
              className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
              title="Appel vidéo Wameet"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps des Messages avec Fond Texturé Wameet */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-[#EFEAE2]/90">
          {/* Bandeau de Chiffrement de Bout en Bout */}
          <div className="max-w-xs mx-auto my-2 p-2 rounded-xl bg-amber-100/90 text-[11px] text-amber-900 text-center font-medium shadow-2xs flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
            <span>Messages chiffrés de bout en bout et protégés par Wameet.</span>
          </div>

          {activeConversation.messages.map((m) => {
            const isMe = m.sender === 'me';

            // Message Transactionnel / Mini-Apps Spécifique
            if (m.type === 'transaction' && m.transactionInfo) {
              const info = m.transactionInfo;
              const isFarotage = info.category === 'farotage' || info.badge?.includes('Farotage');
              const isTontine = info.category === 'tontine' || info.badge?.includes('Tontine');
              const isGift = info.category === 'gift' || info.badge?.includes('Cadeau');
              const isCagnotte = info.category === 'cagnotte' || info.badge?.includes('Cagnotte');
              const isProduct = info.category === 'nana_product' || info.badge?.includes('Produit');

              return (
                <div key={m.id} className="w-full flex justify-center my-2.5 animate-in zoom-in-95 duration-200">
                  <div
                    className={`w-full max-w-sm rounded-3xl p-4 shadow-md border space-y-2.5 ${
                      isFarotage
                        ? 'bg-gradient-to-br from-amber-500/10 via-amber-50 to-yellow-50 border-amber-300'
                        : isTontine
                        ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 border-emerald-300'
                        : isGift
                        ? 'bg-gradient-to-br from-purple-500/10 via-purple-50 to-pink-50 border-purple-300'
                        : isCagnotte
                        ? 'bg-gradient-to-br from-blue-500/10 via-blue-50 to-indigo-50 border-blue-300'
                        : isProduct
                        ? 'bg-white border-slate-300'
                        : 'bg-white border-emerald-200'
                    }`}
                  >
                    {/* Header Carte Mini-App */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-black flex items-center gap-1.5 ${
                          isFarotage
                            ? 'text-amber-800'
                            : isTontine
                            ? 'text-emerald-800'
                            : isGift
                            ? 'text-purple-800'
                            : isCagnotte
                            ? 'text-blue-800'
                            : 'text-slate-900'
                        }`}
                      >
                        {isFarotage && <Coins className="w-4 h-4 text-amber-600" />}
                        {isTontine && <Users className="w-4 h-4 text-emerald-600" />}
                        {isGift && <Gift className="w-4 h-4 text-purple-600" />}
                        {isCagnotte && <PieChart className="w-4 h-4 text-[#2563EB]" />}
                        {isProduct && <ShoppingBag className="w-4 h-4 text-slate-800" />}
                        <span className="truncate">{info.title}</span>
                      </span>

                      {info.amountFcfa && (
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                            isFarotage
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isTontine
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isGift
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : isCagnotte
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-900 text-white border-slate-900'
                          }`}
                        >
                          {info.amountFcfa.toLocaleString('fr-FR')} F
                        </span>
                      )}
                    </div>

                    {/* Image d'aperçu si présente (Cadeau / Produit NaNa POS) */}
                    {info.imageUrl && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 max-h-36 flex items-center justify-center">
                        <img src={info.imageUrl} alt={info.title} className="w-full h-32 object-cover" />
                        {isGift && (
                          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3 text-center">
                            <Lock className="w-5 h-5 text-amber-300 mb-0.5" />
                            <span className="text-xs font-black">Cadeau Mystère Verrouillé</span>
                            <span className="text-[10px] text-slate-300">
                              Détection GPS requise pour déverrouiller
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Statut & Détails */}
                    <p className="text-xs text-slate-700 font-medium leading-snug">
                      {info.status}
                    </p>

                    {/* Pied de Carte avec Rassurance & Lien */}
                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-200/60 text-[10px]">
                      <span className="text-slate-400 font-medium">
                        {m.createdAt} • Reçu certifié Wameet
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          if (info.amountFcfa) playCashChime();
                        }}
                        className="font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Détails & Suivi</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Message Vocal
            if (m.type === 'voice') {
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] sm:max-w-sm p-3 rounded-2xl shadow-xs flex items-center gap-3 ${
                      isMe ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => playTapBeep()}
                      className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <div className="h-1.5 w-28 bg-emerald-300 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-emerald-700 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-semibold">
                        <span>0:{m.audioDurationSec || 18}</span>
                        <span>{m.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Message Texte Classique
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] sm:max-w-md px-3.5 py-2 rounded-2xl shadow-xs relative ${
                    isMe
                      ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-none'
                      : 'bg-white text-slate-900 rounded-tl-none'
                  }`}
                >
                  <p className="text-xs sm:text-sm font-normal leading-relaxed">{m.text}</p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                    <span>{m.createdAt}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Barre de Saisie Native avec Bouton Plus (+) Prompt 49 */}
        <form
          onSubmit={handleSendMessage}
          className="p-2 sm:p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0"
        >
          {/* BOUTON DÉCLENCHEUR DU HUB D'ATTACHEMENTS (PROMPT 49) */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMiniAppsModalOpen(true);
            }}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition shrink-0 border border-slate-200/60"
            title="Menu Pièces jointes & Mini-Apps (+)"
            aria-label="Menu Pièces jointes & Mini-Apps"
          >
            <Plus className="w-5 h-5 text-slate-700" />
          </button>

          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 border-0 focus:ring-1 focus:ring-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center cursor-pointer shadow-md transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* ===================================================================
            HUB D'ATTACHEMENTS : LA GRILLE DES MINI-APPS (PROMPT 49)
           =================================================================== */}
        <MiniAppsGridModal
          isOpen={isMiniAppsModalOpen}
          onClose={() => setIsMiniAppsModalOpen(false)}
          onSelectAction={handleMiniAppAction}
          chatRecipientName={activeConversation.memberName}
          chatRecipientHandle={activeConversation.memberHandle}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. VUE LISTE DES CONVERSATIONS WAMEET (PROMPT 46)
  // =========================================================================
  return (
    <div className="h-full w-full bg-white flex flex-col select-none overflow-hidden">
      {/* En-tête Titre & Recherche Native */}
      <div className="p-4 pb-2 bg-white border-b border-gray-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Discussions</h1>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {conversations.reduce((acc, c) => acc + c.unreadCount, 0)} non lus
            </span>
            {onOpenContacts && (
              <button
                type="button"
                onClick={onOpenContacts}
                className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#4169E1] border border-blue-200 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                title="Contacts & Nouvelle discussion"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Contacts</span>
              </button>
            )}
          </div>
        </div>



        {/* Filtres Rapides & Onglets Transactionnels Wameet */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
          <button
            type="button"
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange('UNREAD')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'UNREAD'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Non lu</span>
            {conversations.filter(c => c.unreadCount > 0).length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterType === 'UNREAD' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'
              }`}>
                {conversations.filter(c => c.unreadCount > 0).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange('COMMANDE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'COMMANDE'
                ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🛍️ Commande</span>
            {conversations.filter(c => c.transactionStatus === 'COMMANDE').length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterType === 'COMMANDE' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
              }`}>
                {conversations.filter(c => c.transactionStatus === 'COMMANDE').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange('LIVRER')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'LIVRER'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🚚 Livrer</span>
            {conversations.filter(c => c.transactionStatus === 'LIVRER').length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterType === 'LIVRER' ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'
              }`}>
                {conversations.filter(c => c.transactionStatus === 'LIVRER').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange('PAYE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'PAYE'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>💳 Payé</span>
            {conversations.filter(c => c.transactionStatus === 'PAYE').length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterType === 'PAYE' ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
              }`}>
                {conversations.filter(c => c.transactionStatus === 'PAYE').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          LISTE DES CONVERSATIONS : CHIRURGICALE, SANS CARTES
          Chaque ligne prend toute la largeur : w-full px-4 py-3 flex items-center
          Séparateur subtil uniquement sous le texte : border-b border-gray-100 ml-16
         ===================================================================== */}
      <div className="flex-1 overflow-y-auto">
        {isQueryLoading ? (
          <div className="p-4 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600">
              Aucune discussion liée au statut « {filterType === 'ALL' ? 'Toutes' : filterType === 'UNREAD' ? 'Non lu' : filterType === 'COMMANDE' ? 'Commande' : filterType === 'LIVRER' ? 'Livrer' : 'Payé'} »
            </p>
            <button
              type="button"
              onClick={() => handleFilterChange('ALL')}
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              Afficher toutes les discussions
            </button>
          </div>
        ) : (
          filteredConversations.map((thread) => (
          <div
            key={thread.id}
            onClick={() => handleSelectConversation(thread.id)}
            className="w-full hover:bg-slate-50/80 active:bg-slate-100 transition-colors cursor-pointer group"
          >
            {/* Ligne de Conversation Wameet */}
            <div className="w-full px-4 py-3 flex items-center gap-3">
              {/* Avatar avec pastille en ligne (hors du séparateur de texte) */}
              <div className="relative shrink-0">
                <img
                  src={thread.memberAvatar}
                  alt={thread.memberName}
                  className="w-12 h-12 rounded-full object-cover bg-slate-100 border border-slate-200/50"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                  }}
                />
                {thread.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>

              {/* Bloc Textuel du Chat */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {thread.memberName}
                  </h4>
                  <span
                    className={`text-[11px] font-medium shrink-0 ${
                      thread.unreadCount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {thread.lastActivityLabel}
                  </span>
                </div>

                {/* Deuxième Ligne : Micro-badge indicateur d'action + Dernier Message */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Indicateur d'Action Coloré Spécifique (Prompt 46) */}
                    {thread.actionBadge && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${thread.actionBadge.color}`}
                      >
                        {thread.actionBadge.label}
                      </span>
                    )}
                    <p
                      className={`text-xs truncate ${
                        thread.unreadCount > 0
                          ? 'font-semibold text-slate-900'
                          : 'font-normal text-slate-500'
                      }`}
                    >
                      {thread.lastMessagePreview}
                    </p>
                  </div>

                  {/* Badge Compteur Non Lu */}
                  {thread.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Séparateur Subtil Uniquement sous le texte (ml-16 = aligné au début du texte après l'avatar) */}
            <div className="border-b border-gray-100 ml-16" />
          </div>
        )))}
      </div>
    </div>
  );
};

export default ChatListScreen;
