import React, { useState } from 'react';
import {
  Megaphone,
  Bell,
  BellOff,
  Check,
  Plus,
  Share2,
  Info,
  ChevronLeft,
  BadgeCheck
} from 'lucide-react';
import { DiscussionItem } from '../../../../types/wameetDiscussion';

export interface ChannelChatHeaderProps {
  channel: DiscussionItem;
  onBack?: () => void;
  onToggleSubscribe?: (channelId: string, willSubscribe: boolean) => void;
  onToggleMute?: (channelId: string, isMuted: boolean) => void;
  onOpenChannelInfo?: () => void;
  onShareChannel?: () => void;
}

/**
 * Formate le nombre d'abonnés de manière concise (ex: "1 450 abonnés", "24.5k abonnés")
 */
export function formatSubscribersCount(count?: number | null): string {
  const num = typeof count === 'number' && !isNaN(count) ? count : 0;
  if (num <= 0) return '0 abonné';
  if (num === 1) return '1 abonné';
  if (num < 1000) return `${num} abonnés`;
  if (num < 1000000) {
    const formatted = (num / 1000).toFixed(num % 1000 >= 100 ? 1 : 0);
    return `${formatted}k abonnés`;
  }
  const formatted = (num / 1000000).toFixed(1);
  return `${formatted}M abonnés`;
}

export const ChannelChatHeader: React.FC<ChannelChatHeaderProps> = ({
  channel,
  onBack,
  onToggleSubscribe,
  onToggleMute,
  onOpenChannelInfo,
  onShareChannel
}) => {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(
    Boolean(channel?.isSubscribed)
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const channelTitle = channel?.channelName || channel?.name || 'Chaîne Wameet';
  const subscribersText = formatSubscribersCount(channel?.subscribersCount);

  const handleSubscribeToggle = () => {
    const nextState = !isSubscribed;
    setIsSubscribed(nextState);
    if (onToggleSubscribe && channel?.id) {
      onToggleSubscribe(channel.id, nextState);
    }
  };

  const handleMuteToggle = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (onToggleMute && channel?.id) {
      onToggleMute(channel.id, nextState);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 py-3 select-none">
      <div className="flex items-center justify-between gap-2">
        {/* Section Gauche : Retour mobile + Avatar Mégaphone + Titre + Nombre d'abonnés */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Retour aux discussions"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Avatar avec Badge Mégaphone Officiel */}
          <div className="relative shrink-0">
            {channel?.avatarUrl ? (
              <img
                src={channel.avatarUrl}
                alt={channelTitle}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Megaphone className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
            )}

            {/* Badge Mégaphone incrusté en bas à droite */}
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow-xs"
              title="Chaîne de diffusion"
            >
              <Megaphone className="w-2.5 h-2.5 text-amber-400 stroke-[2.5]" />
            </span>
          </div>

          {/* Nom de la chaîne & Abonnés */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 truncate">
                {channelTitle}
              </h3>
              {channel?.isVerified !== false && (
                <span title="Chaîne certifiée Wameet" className="inline-flex items-center">
                  <BadgeCheck className="w-4 h-4 text-[#0084FF] shrink-0 fill-[#0084FF]/10" />
                </span>
              )}
            </div>

            {/* Au lieu du statut en ligne, affichage du nombre d'abonnés */}
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="text-[#0084FF] font-bold">{subscribersText}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400 font-medium">Chaîne publique</span>
            </div>
          </div>
        </div>

        {/* Section Droite : Bouton S'abonner / Se désabonner + Cloche Mute + Partage */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bouton Dynamique S'abonner / Abonné */}
          <button
            type="button"
            onClick={handleSubscribeToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 shadow-2xs ${
              isSubscribed
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-[#0084FF] hover:bg-blue-600 text-white'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span>Abonné</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>S'abonner</span>
              </>
            )}
          </button>

          {/* Toggle Cloche de Notification */}
          {isSubscribed && (
            <button
              type="button"
              onClick={handleMuteToggle}
              className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 shadow-2xs ${
                isMuted
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title={isMuted ? 'Activer les notifications' : 'Mettre en sourdine'}
            >
              {isMuted ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>
          )}

          {onShareChannel && (
            <button
              type="button"
              onClick={onShareChannel}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer active:scale-95 shadow-2xs hidden sm:inline-flex"
              title="Partager le lien de la chaîne"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {onOpenChannelInfo && (
            <button
              type="button"
              onClick={onOpenChannelInfo}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Informations sur la chaîne"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelChatHeader;
