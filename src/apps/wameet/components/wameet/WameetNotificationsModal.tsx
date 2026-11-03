import React from 'react';
import { X, Bell, Heart, MessageCircle, Film, ShoppingBag, Check } from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'WALL_PROFILE' | 'REELS' | 'W_CHAT' | 'SHOP') => void;
}

export const WameetNotificationsModal: React.FC<WameetNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      type: 'like',
      icon: Heart,
      iconColor: 'text-rose-500 bg-rose-50 border-rose-200',
      title: 'Awa Ouédraogo a aimé votre publication',
      sub: '"L\'Afterwork Tech d\'hier soir..."',
      time: 'Il y a 5 min',
      read: false
    },
    {
      id: 'notif-2',
      type: 'chat',
      icon: MessageCircle,
      iconColor: 'text-[#2563EB] bg-blue-50 border-blue-200',
      title: 'Nouveau message vocal reçu',
      sub: 'Ibrahim Pousbila : "Note vocale 0:42"',
      time: 'Il y a 18 min',
      read: false
    },
    {
      id: 'notif-3',
      type: 'reel',
      icon: Film,
      iconColor: 'text-amber-500 bg-amber-50 border-amber-200',
      title: 'Votre Reel a franchi un cap !',
      sub: 'Plus de 1 200 vues et 84 partages enregistrés',
      time: 'Il y a 1h',
      read: false
    },
    {
      id: 'notif-4',
      type: 'shop',
      icon: ShoppingBag,
      iconColor: 'text-emerald-500 bg-emerald-50 border-emerald-200',
      title: 'Paiement Wameet confirmé',
      sub: 'Transaction de 15 000 FCFA sous séquestre',
      time: 'Il y a 3h',
      read: true
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-start justify-end p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
        onClick={() => {
          playTapBeep();
          onClose();
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden z-10 animate-in slide-in-from-top-4 duration-250 mt-12"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">Notifications</h4>
              <span className="text-[10px] text-slate-500 font-semibold">3 non lues</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer border border-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                onClick={() => {
                  playTapBeep();
                  if (n.type === 'chat' && onNavigateToTab) onNavigateToTab('W_CHAT');
                  if (n.type === 'reel' && onNavigateToTab) onNavigateToTab('REELS');
                  if (n.type === 'shop' && onNavigateToTab) onNavigateToTab('SHOP');
                  onClose();
                }}
                className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                  !n.read ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${n.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 leading-tight truncate">
                    {n.title}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {n.sub}
                  </p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">
                    {n.time}
                  </span>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="text-[11px] font-black text-[#2563EB] hover:underline cursor-pointer"
          >
            Tout marquer comme lu
          </button>
          <span className="text-[10px] text-slate-400">Wameet Supra-App</span>
        </div>
      </div>
    </div>
  );
};

export default WameetNotificationsModal;
