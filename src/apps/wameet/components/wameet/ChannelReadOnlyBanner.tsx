import React, { useState } from 'react';
import { Megaphone, Bell, BellOff, Lock } from 'lucide-react';

export interface ChannelReadOnlyBannerProps {
  channelName?: string;
  isSubscribed?: boolean;
  onToggleMute?: (isMuted: boolean) => void;
  className?: string;
}

export const ChannelReadOnlyBanner: React.FC<ChannelReadOnlyBannerProps> = ({
  channelName,
  isSubscribed = true,
  onToggleMute,
  className = ''
}) => {
  const [isMuted, setIsMuted] = useState(false);

  const handleMuteClick = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (onToggleMute) {
      onToggleMute(nextState);
    }
  };

  return (
    <div
      className={`p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 select-none ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0084FF] flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
          <Megaphone className="w-4 h-4 stroke-[2.2]" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
            <span>Vous êtes abonné à cette chaîne</span>
            <span title="Lecture seule" className="inline-flex items-center">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            </span>
          </p>
          <p className="text-[10px] font-semibold text-slate-500 truncate">
            Seuls les administrateurs peuvent publier des messages.
          </p>
        </div>
      </div>

      {isSubscribed && (
        <button
          type="button"
          onClick={handleMuteClick}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 ${
            isMuted
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
          title={isMuted ? 'Activer les notifications' : 'Mettre en sourdine'}
        >
          {isMuted ? (
            <>
              <BellOff className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">En sourdine</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-[#0084FF]" />
              <span className="hidden sm:inline">Notifications</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ChannelReadOnlyBanner;
