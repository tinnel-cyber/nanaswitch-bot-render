import React, { useState, useMemo } from 'react';
import {
  Users,
  ChevronDown,
  Phone,
  Video,
  Info,
  ShieldCheck,
  User,
  X,
  Search,
  ChevronLeft
} from 'lucide-react';
import { DiscussionItem, GroupMember } from '../../../../types/wameetDiscussion';

export interface GroupChatHeaderProps {
  group: DiscussionItem;
  currentUserId?: string;
  onBack?: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  onOpenGroupInfo?: () => void;
  onMemberClick?: (member: GroupMember) => void;
}

export const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({
  group,
  currentUserId,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
  onOpenGroupInfo,
  onMemberClick
}) => {
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Sécurisation stricte des tableaux pour prévenir tout crash Firestore
  const members = useMemo(() => {
    return Array.isArray(group?.members) ? group.members : [];
  }, [group?.members]);

  const admins = useMemo(() => {
    return Array.isArray(group?.admins) ? group.admins : [];
  }, [group?.admins]);

  const totalMembersCount = members.length;
  const onlineMembersCount = useMemo(() => {
    return members.filter(m => Boolean(m?.isOnline)).length;
  }, [members]);

  // Filtrage des membres dans la liste déroulante
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase().trim();
    return members.filter(
      m =>
        m?.name?.toLowerCase().includes(q) ||
        m?.phoneNumber?.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const groupTitle = group?.groupName || group?.name || 'Groupe Wameet';

  // 3 premières vignettes d'avatar pour le cluster
  const clusterAvatars = useMemo(() => {
    return members
      .filter(m => Boolean(m?.avatarUrl))
      .slice(0, 3)
      .map(m => m.avatarUrl!);
  }, [members]);

  return (
    <div className="relative bg-white border-b border-slate-200/80 select-none">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        {/* Section Gauche : Retour mobile + Avatar Cluster + Titre + Membres cliquables */}
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

          {/* Avatar Cluster de Groupe (2 ou 3 mini-photos superposées) */}
          <div
            className="relative shrink-0 w-11 h-11 cursor-pointer"
            onClick={() => setShowMembersDropdown(prev => !prev)}
            title="Voir les membres du groupe"
          >
            {clusterAvatars.length >= 2 ? (
              <div className="relative w-full h-full">
                {clusterAvatars.map((url, idx) => {
                  const offsets = [
                    'top-0 left-0 z-3',
                    'bottom-0 right-0 z-2',
                    'bottom-0 left-0 z-1'
                  ];
                  return (
                    <img
                      key={`${url}-${idx}`}
                      src={url}
                      alt="Membre du groupe"
                      className={`absolute w-6 h-6 rounded-full object-cover border-2 border-white shadow-2xs ${offsets[idx] || ''}`}
                    />
                  );
                })}
              </div>
            ) : group?.avatarUrl ? (
              <img
                src={group.avatarUrl}
                alt={groupTitle}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Users className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
            )}
          </div>

          {/* Informations du Groupe & Liste déroulante des membres */}
          <div className="min-w-0">
            <h3
              onClick={() => setShowMembersDropdown(prev => !prev)}
              className="text-sm font-extrabold text-slate-900 truncate hover:text-[#0084FF] transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="truncate">{groupTitle}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[#0084FF] text-[10px] font-bold border border-blue-200/60 shrink-0">
                Groupe
              </span>
            </h3>

            {/* Sous-titre dynamique cliquable avec le nombre de membres et en ligne */}
            <button
              type="button"
              onClick={() => setShowMembersDropdown(prev => !prev)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <span>
                {totalMembersCount} membre{totalMembersCount > 1 ? 's' : ''}
              </span>
              {onlineMembersCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {onlineMembersCount} en ligne
                  </span>
                </>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  showMembersDropdown ? 'rotate-180 text-[#0084FF]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section Droite : Actions d'appel et d'information */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onStartAudioCall && (
            <button
              type="button"
              onClick={onStartAudioCall}
              className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 border border-slate-200/60 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Appel vocal de groupe"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {onStartVideoCall && (
            <button
              type="button"
              onClick={onStartVideoCall}
              className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0084FF] text-slate-600 border border-slate-200/60 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Appel vidéo de groupe"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {onOpenGroupInfo && (
            <button
              type="button"
              onClick={onOpenGroupInfo}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Infos du groupe"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================
          LISTE DÉROULANTE INTERACTIVE DES MEMBRES EN LIGNE ET DU GROUPE
         =================================================================== */}
      {showMembersDropdown && (
        <div className="absolute left-4 right-4 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0084FF]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMembersDropdown(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                Aucun membre trouvé
              </div>
            ) : (
              filteredMembers.map(member => {
                const isAdmin =
                  member?.role === 'admin' ||
                  (member?.id && admins.includes(member.id));
                const isMe = currentUserId && member?.id === currentUserId;

                return (
                  <div
                    key={member?.id}
                    onClick={() => onMemberClick && onMemberClick(member)}
                    className="p-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {member?.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member?.name || 'Membre'}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        {member?.isOnline && (
                          <span
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/40"
                            title="En ligne"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>
                            {member?.name || member?.phoneNumber || 'Membre'}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Vous)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {member?.isOnline ? (
                            <span className="text-emerald-600 font-semibold">
                              En ligne
                            </span>
                          ) : (
                            member?.phoneNumber || 'Hors ligne'
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0084FF] text-[10px] font-bold border border-blue-200/60 shrink-0 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatHeader;
