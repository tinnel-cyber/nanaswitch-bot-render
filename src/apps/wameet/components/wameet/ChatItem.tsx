import React from 'react';
import {
  Users,
  Megaphone,
  Radio,
  Check,
  CheckCheck,
  Clock,
  Flame,
  Zap,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useHeatmapScore, HeatmapChatData } from '../../../../hooks/useHeatmapScore';
import {
  DiscussionItem,
  DiscussionType,
  MessageDeliveryStatus
} from '../../../../types/wameetDiscussion';
import { formatContactFallbackPhone } from './WameetChatList';

export interface ChatItemProps {
  item: DiscussionItem & HeatmapChatData;
  isSelected?: boolean;
  onSelect?: (item: DiscussionItem) => void;
  showHeatBadge?: boolean;
  className?: string;
}

/**
 * COMPOSANT MÉMORISÉ ChatItem (Wameet CRM Heatmap)
 * Performance 60 FPS garantie via React.memo et useMemo.
 * Injecte dynamiquement la bordure autour de la balise <img> de l'avatar :
 * - Score < 30 (Froid) : ring-1 ring-blue-100
 * - Score 30-70 (Tiède) : ring-2 ring-orange-400 ring-offset-2
 * - Score > 70 (Chaud) : ring-2 ring-red-500 ring-offset-2 shadow-[0_0_8px_rgba(239,68,68,0.6)]
 */
export const ChatItem: React.FC<ChatItemProps> = React.memo(({
  item,
  isSelected = false,
  onSelect,
  showHeatBadge = false,
  className = ''
}) => {
  // 1. Calcul mémorisé du score Heatmap CRM (zéro lag de rendu)
  const heatmap = useHeatmapScore(item);

  const itemType: DiscussionType = item?.type || 'private';

  // 2. Nom ou Titre d'affichage
  let displayName = '';
  if (itemType === 'group') {
    displayName = item?.groupName || item?.name || 'Groupe sans nom';
  } else if (itemType === 'channel') {
    displayName = item?.channelName || item?.name || 'Chaîne officielle';
  } else {
    const hasValidName = typeof item?.name === 'string' && item.name.trim() !== '';
    displayName = hasValidName
      ? item.name!
      : formatContactFallbackPhone(item?.phoneNumber, item?.countryCode);
  }

  // 3. Aperçu du dernier message et statut d'envoi
  let messageText = '';
  let messageSenderName = '';
  let messageStatus: MessageDeliveryStatus | undefined = item?.status;

  if (typeof item?.lastMessage === 'string') {
    messageText = item.lastMessage;
  } else if (item?.lastMessage && typeof item.lastMessage === 'object') {
    messageText = item.lastMessage.text ?? '';
    messageSenderName = item.lastMessage.senderName ?? '';
    if (item.lastMessage.status) {
      messageStatus = item.lastMessage.status;
    }
  }

  const formattedPreviewText =
    itemType === 'group' && messageSenderName
      ? `${messageSenderName}: ${messageText}`
      : messageText || 'Aucun message';

  const messageTime =
    item?.timestamp ||
    (typeof item?.lastMessage === 'object' ? item?.lastMessage?.timestamp : null) ||
    '';

  const unreadCount = item?.unreadCount ?? 0;

  // 4. Cluster d'avatars pour les groupes
  const groupMembersAvatars =
    itemType === 'group' && Array.isArray(item?.members)
      ? item.members.filter((m) => Boolean(m?.avatarUrl)).slice(0, 3).map((m) => m.avatarUrl!)
      : [];

  const handleClick = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={`relative w-full px-4 py-3.5 text-left flex items-start gap-3.5 transition-all duration-150 cursor-pointer outline-none select-none ${
        isSelected
          ? 'bg-blue-50/80 hover:bg-blue-50'
          : 'bg-white hover:bg-slate-50/80 active:bg-slate-100/70'
      } ${className}`}
    >
      {/* Barre indicatrice de sélection active */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0084FF] rounded-r-full" />
      )}

      {/* =====================================================================
          SECTION AVATAR AVEC BORDURE DYNAMIQUE HEATMAP PROSPECT
         ===================================================================== */}
      <div className="relative shrink-0 mt-0.5">
        {itemType === 'group' ? (
          /* CAS 1 : GROUPE */
          groupMembersAvatars.length >= 2 ? (
            <div className="w-12 h-12 relative">
              {groupMembersAvatars.map((url, idx) => {
                const offsets = ['top-0 left-0 z-3', 'bottom-0 right-0 z-2', 'bottom-0 left-0 z-1'];
                return (
                  <img
                    key={`${url}-${idx}`}
                    src={url}
                    alt="Membre du groupe"
                    className={`absolute w-6 h-6 rounded-full object-cover border-2 border-white shadow-2xs ${
                      offsets[idx] || ''
                    }`}
                  />
                );
              })}
            </div>
          ) : item?.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border border-slate-200/80 shadow-2xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Users className="w-6 h-6 text-white" />
            </div>
          )
        ) : itemType === 'channel' ? (
          /* CAS 2 : CHAÎNE OFFICIELLE */
          <div className="relative">
            {item?.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border border-slate-200/80 shadow-2xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                <Radio className="w-6 h-6 text-white" />
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-white text-amber-400 flex items-center justify-center shadow-xs"
              title="Chaîne Wameet"
            >
              <Megaphone className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
          </div>
        ) : (
          /* CAS 3 : DISCUSSION PRIVÉE / NOUVEAU PROSPECT (Bordure Heatmap dynamique) */
          <div className="relative">
            {item?.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={displayName}
                className={`w-12 h-12 rounded-full object-cover transition-all duration-300 ${heatmap.ringClass}`}
                loading="lazy"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm transition-all duration-300 ${heatmap.ringClass}`}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Indicateur de présence en ligne */}
            {Boolean(item?.isOnline) && (
              <span
                aria-label="En ligne"
                title="En ligne"
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#0084FF] border-2 border-white ring-1 ring-blue-400/30 shadow-xs"
              />
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          CONTENU DU MESSAGE : TITRE, BADGE CHALEUR & DERNIER TEXTE
         ===================================================================== */}
      <div className="flex-1 min-w-0 pr-0.5">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3
              className={`text-sm font-bold truncate leading-snug ${
                unreadCount > 0 ? 'text-slate-950 font-black' : 'text-slate-900'
              }`}
            >
              {displayName}
            </h3>

            {/* Badge Visuel de "Chaleur" Prospect CRM */}
            {(showHeatBadge || itemType === 'private') && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-black shrink-0 border ${heatmap.badgeClass}`}
                title={`Probabilité d'achat: ${heatmap.score}% (${heatmap.label})`}
              >
                {heatmap.isHot && <Flame className="w-2.5 h-2.5 fill-red-500 text-red-500 shrink-0" />}
                {heatmap.isWarm && <Zap className="w-2.5 h-2.5 fill-orange-400 text-orange-400 shrink-0" />}
                <span>{heatmap.score}%</span>
              </span>
            )}
          </div>

          {/* Horodatage du dernier échange */}
          {messageTime && (
            <span
              className={`text-[11px] font-medium shrink-0 whitespace-nowrap ${
                unreadCount > 0 ? 'text-[#0084FF] font-bold' : 'text-slate-400'
              }`}
            >
              {messageTime}
            </span>
          )}
        </div>

        {/* Ligne inférieure : Statut d'envoi (✓✓) + Aperçu du message + Compteur */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 text-xs text-slate-500">
            {/* Statuts des coches d'envoi et lecture */}
            {messageStatus === 'downloaded' && (
              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            {messageStatus === 'delivered' && (
              <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            {messageStatus === 'read' && (
              <CheckCheck className="w-3.5 h-3.5 text-[#0084FF] shrink-0" />
            )}
            {messageStatus === 'failed' && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
            )}

            <p
              className={`truncate text-xs leading-normal ${
                unreadCount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-500 font-normal'
              }`}
            >
              {formattedPreviewText}
            </p>
          </div>

          {/* Badge de Messages Non Lus */}
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#0084FF] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

export default ChatItem;
