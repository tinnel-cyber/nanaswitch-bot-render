import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Check,
  CheckCheck,
  AlertCircle,
  Plus,
  X,
  MessageSquare,
  Sparkles,
  Star,
  Users,
  Bookmark,
  ShoppingBag,
  ArrowRight,
  Megaphone,
  Radio
} from 'lucide-react';
import {
  DiscussionItem,
  DiscussionType,
  MessageDeliveryStatus,
  GroupMember
} from '../../../../types/wameetDiscussion';
import { formatSubscribersCount } from './ChannelChatHeader';
import { calculateHeatScore, getHeatScoreDetails } from '../../../../utils/heatScoreEngine';
import { ChatItem } from './ChatItem';

// ============================================================================
// EXPORT DES TYPES DU COMPOSANT
// ============================================================================

export type { DiscussionItem, DiscussionType, MessageDeliveryStatus, GroupMember };

export interface WameetChatListProps {
  discussions?: DiscussionItem[];
  activeDiscussionId?: string | null;
  onSelectDiscussion?: (discussion: DiscussionItem) => void;
  onNewDiscussion?: () => void;
  className?: string;
}

// ============================================================================
// RÈGLE STRICTE (EDGE CASE) : FALLBACK NOM -> "+countryCode phoneNumber"
// ============================================================================

/**
 * Formate de manière sécurisée et blindée l'affichage du numéro :
 * Résultat strict : "+countryCode phoneNumber"
 */
export function formatContactFallbackPhone(
  phoneNumber?: string | null,
  countryCode?: string | null
): string {
  const rawPhone = (phoneNumber ?? '').trim();
  const rawCode = (countryCode ?? '').trim();

  if (!rawPhone && !rawCode) {
    return 'Contact inconnu';
  }

  const cleanCode = rawCode.replace(/^\+/, '');
  const cleanPhone = rawPhone.replace(/^\+/, '');

  if (cleanCode && cleanPhone) {
    if (cleanPhone.startsWith(cleanCode)) {
      return `+${cleanPhone}`;
    }
    return `+${cleanCode} ${cleanPhone}`;
  }

  if (cleanPhone) {
    return rawPhone.startsWith('+') ? rawPhone : `+${cleanPhone}`;
  }

  return `+${cleanCode}`;
}

const DEFAULT_CATEGORIES: string[] = [
  'Toutes',
  'Non lues',
  'Commande',
  'Livrer',
  'Payé',
  'Favoris',
  'Groupes',
  'Important',
  'Nouveau prospect',
  'Commandes'
];

// ============================================================================
// COMPOSANT PRINCIPAL : WAMEET CHAT LIST (PRODUCTION-READY - MULTI-TYPES)
// ============================================================================

export const WameetChatList: React.FC<WameetChatListProps> = ({
  discussions = [],
  activeDiscussionId = null,
  onSelectDiscussion,
  onNewDiscussion,
  className = ''
}) => {
  // --------------------------------------------------------------------------
  // 1. GESTION STRICTE DE L'ÉTAT LOCAL DE L'UI
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('Toutes');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Total des discussions avec messages non lus
  const totalUnreadCount = useMemo(() => {
    return (discussions ?? []).reduce((acc, item) => {
      return acc + ((item?.unreadCount ?? 0) > 0 ? 1 : 0);
    }, 0);
  }, [discussions]);

  // --------------------------------------------------------------------------
  // 2. MOTEUR DE FILTRAGE BLINDÉ (useMemo avec optional chaining ?.)
  // --------------------------------------------------------------------------
  const filteredDiscussions = useMemo(() => {
    if (!Array.isArray(discussions)) return [];

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = discussions.filter(item => {
      if (!item) return false;

      const itemType: DiscussionType = item?.type || 'private';

      // --- A. FILTRAGE PAR CATÉGORIE ---
      if (activeCategory === 'Non lues') {
        if ((item?.unreadCount ?? 0) <= 0) return false;
      } else if (activeCategory === 'Groupes') {
        const isGroupType = itemType === 'group' || item?.isGroup;
        const hasGroupCategory = item?.categories?.some(
          cat => cat?.toLowerCase() === 'groupes'
        );
        if (!isGroupType && !hasGroupCategory) return false;
      } else if (activeCategory !== 'Toutes') {
        const matchesCategory = item?.categories?.some(
          cat => cat?.toLowerCase() === activeCategory.toLowerCase()
        );
        if (!matchesCategory) return false;
      }

      // --- B. FILTRAGE PAR RECHERCHE TEXTUELLE ---
      if (normalizedQuery) {
        const groupName = item?.groupName?.toLowerCase() ?? '';
        const channelName = item?.channelName?.toLowerCase() ?? '';
        const contactName = item?.name?.toLowerCase() ?? '';
        const rawPhone = item?.phoneNumber?.toLowerCase() ?? '';
        const fallbackFormattedPhone = formatContactFallbackPhone(
          item?.phoneNumber,
          item?.countryCode
        ).toLowerCase();

        let lastMessageText = '';
        if (typeof item?.lastMessage === 'string') {
          lastMessageText = item.lastMessage.toLowerCase();
        } else if (item?.lastMessage && typeof item.lastMessage === 'object') {
          lastMessageText = (item.lastMessage.text ?? '').toLowerCase();
        }

        const matchesSearch =
          groupName.includes(normalizedQuery) ||
          channelName.includes(normalizedQuery) ||
          contactName.includes(normalizedQuery) ||
          rawPhone.includes(normalizedQuery) ||
          fallbackFormattedPhone.includes(normalizedQuery) ||
          lastMessageText.includes(normalizedQuery);

        if (!matchesSearch) return false;
      }

      return true;
    });

    // CRM Heatmap : Si le vendeur consulte les "Nouveaux prospects", afficher les plus chauds en premier
    if (activeCategory === 'Nouveau prospect') {
      return [...filtered].sort((a, b) => calculateHeatScore(b) - calculateHeatScore(a));
    }

    return filtered;
  }, [discussions, activeCategory, searchQuery]);

  // --------------------------------------------------------------------------
  // 3. ACTIONS MEMOISÉES
  // --------------------------------------------------------------------------
  const handleResetToAll = useCallback(() => {
    setActiveCategory('Toutes');
    setSearchQuery('');
  }, []);

  const handleSelect = useCallback(
    (item: DiscussionItem) => {
      if (onSelectDiscussion && item) {
        onSelectDiscussion(item);
      }
    },
    [onSelectDiscussion]
  );

  const handleAddCustomCategorySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newCategoryInput.trim();
      if (trimmed && !allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        setCustomCategories(prev => [...prev, trimmed]);
        setActiveCategory(trimmed);
        setNewCategoryInput('');
        setIsAddingCategory(false);
      }
    },
    [newCategoryInput, allCategories]
  );

  // --------------------------------------------------------------------------
  // 4. RENDU DES ACCUSÉS DE RÉCEPTION
  // --------------------------------------------------------------------------
  const renderDeliveryStatusIcon = (status?: MessageDeliveryStatus) => {
    if (!status) return null;

    switch (status) {
      case 'downloaded':
        return (
          <span title="Envoyé" className="inline-flex items-center mr-1">
            <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </span>
        );
      case 'delivered':
        return (
          <span title="Délivré (non lu)" className="inline-flex items-center mr-1">
            <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </span>
        );
      case 'read':
        return (
          <span title="Lu" className="inline-flex items-center mr-1">
            <CheckCheck className="w-3.5 h-3.5 text-[#0084FF] shrink-0" />
          </span>
        );
      case 'failed':
        return (
          <span title="Échec d'envoi" className="inline-flex items-center mr-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white border-r border-slate-200/80 font-sans select-none antialiased ${className}`}
    >
      {/* ===================================================================
          EN-TÊTE : RECHERCHE MODERNE & TITRE DYNAMIQUE
         =================================================================== */}
      <div className="pt-3.5 px-4 pb-2 bg-white/95 backdrop-blur-md sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              Discussions
            </h2>
            {totalUnreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0084FF] border border-blue-200/60 shadow-xs">
                {totalUnreadCount} non lue{totalUnreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {onNewDiscussion && (
            <button
              type="button"
              onClick={onNewDiscussion}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition active:scale-95 cursor-pointer"
              title="Nouvelle discussion"
              aria-label="Nouvelle discussion"
            >
              <Plus className="w-4 h-4 text-slate-700" />
            </button>
          )}
        </div>

        {/* Barre de Recherche Stylisée */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-[#0084FF] text-slate-400">
            <Search className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une discussion, un groupe ou une chaîne..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-[#0084FF]/30 focus:ring-4 focus:ring-[#0084FF]/10 transition-all duration-200 outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Effacer la recherche"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ===================================================================
            FILTRES DE CATÉGORIES (SCROLL HORIZONTAL ULTRA-FLUIDE)
           =================================================================== */}
        <div className="relative flex items-center pt-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full">
            {allCategories.map(category => {
              const isActive = activeCategory === category;
              const isUnreadTab = category === 'Non lues';

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 select-none ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {category === 'Favoris' && <Star className="w-3 h-3 fill-current text-amber-400" />}
                  {category === 'Groupes' && <Users className="w-3 h-3 text-slate-400" />}
                  {category === 'Important' && <Bookmark className="w-3 h-3 text-rose-400 fill-current" />}
                  {category === 'Nouveau prospect' && <Sparkles className="w-3 h-3 text-cyan-400" />}
                  {category === 'Commandes' && <ShoppingBag className="w-3 h-3 text-emerald-400" />}

                  <span>{category}</span>

                  {isUnreadTab && totalUnreadCount > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#0084FF] text-white'
                          : 'bg-emerald-500 text-white shadow-2xs'
                      }`}
                    >
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0084FF] text-slate-500 border border-slate-200/70 transition-all duration-150 shrink-0 cursor-pointer active:scale-90"
              title="Ajouter une catégorie"
              aria-label="Ajouter une catégorie"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Mini-tiroir d'ajout rapide de catégorie */}
        {isAddingCategory && (
          <form
            onSubmit={handleAddCustomCategorySubmit}
            className="flex items-center gap-2 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <input
              type="text"
              autoFocus
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              placeholder="Nom de la liste (ex: VIP, SAV...)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-blue-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-xl bg-[#0084FF] text-white text-xs font-bold hover:bg-blue-600 transition cursor-pointer"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryInput('');
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* ===================================================================
          LISTE DES DISCUSSIONS (OU ÉTAT VIDE)
         =================================================================== */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
        {filteredDiscussions.length === 0 ? (
          /* ===============================================================
             ÉTAT VIDE
             =============================================================== */
          <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center select-none animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0084FF] flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
              <MessageSquare className="w-7 h-7 stroke-[1.75]" />
            </div>

            <p className="text-sm font-semibold text-slate-700 max-w-[260px] leading-relaxed">
              Aucune discussion dans la catégorie concernée
            </p>

            <button
              type="button"
              onClick={handleResetToAll}
              className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#0084FF] hover:text-blue-700 hover:underline transition cursor-pointer group"
            >
              <span>Voir toutes les discussions</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ) : (
          /* ===============================================================
             CHAT ITEM : COMPOSANT MÉMOISÉ AVEC HEATMAP PROSPECT CRM
             =============================================================== */
          filteredDiscussions.map((item) => {
            const isSelected = item?.id === activeDiscussionId;
            return (
              <ChatItem
                key={item?.id}
                item={item}
                isSelected={isSelected}
                onSelect={handleSelect}
                showHeatBadge={activeCategory === 'Nouveau prospect'}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default WameetChatList;
