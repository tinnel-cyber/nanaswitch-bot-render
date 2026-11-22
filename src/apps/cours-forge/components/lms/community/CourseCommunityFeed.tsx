import React, { useState, useEffect, useCallback } from 'react';
import {
  Hash,
  Lock,
  Crown,
  Users,
  Plus,
  Send,
  Heart,
  MessageSquare,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Copy,
  Check,
  Globe,
  X,
  Megaphone
} from 'lucide-react';
import { UltimateCheckout } from '../../../../../services/nana-switch/payment/UltimateCheckout';
import { formatCFA } from '../../../../../utils/audio';

export interface CourseCommunityFeedProps {
  courseId: string;
  courseTitle?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserRole?: 'STUDENT' | 'INSTRUCTOR';
  onViewLearnerProfile?: (userId: string) => void;
  onOpenDirectMessage?: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
}

interface CampusGroup {
  id: string;
  courseId: string;
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'premium';
  inviteCode?: string;
  subscriptionPrice: number;
  billingCycle: string;
  ownerId: string;
  ownerName: string;
  hasAccess: boolean;
  memberCount: number;
}

interface CampusChannel {
  id: string;
  groupId: string;
  courseId: string;
  name: string;
  description: string;
  channelType: 'text' | 'announcements' | 'premium_room';
  isPremium: boolean;
  subscriptionPrice: number;
  hasAccess: boolean;
}

interface CampusComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

interface CampusMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  content: string;
  topicTag: string;
  attachmentUrl?: string;
  likesCount: number;
  likedBy: string[];
  commentsCount: number;
  comments: CampusComment[];
  createdAt: string;
}

const TOPIC_TAGS = [
  { label: '🤝 Entraide', value: 'ENTRAIDE' },
  { label: '📝 Devoir', value: 'DEVOIR' },
  { label: '💡 Astuce', value: 'ASTUCE' },
  { label: '💬 Général', value: 'GENERAL' },
  { label: '📢 Annonce', value: 'ANNONCE' }
];

export const CourseCommunityFeed: React.FC<CourseCommunityFeedProps> = ({
  courseId,
  courseTitle = 'Campus Social Live',
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole = 'STUDENT',
  onViewLearnerProfile
}) => {
  const effectiveCourseId = courseId || 'global';
  const effectiveUserId = currentUserId || 'student-guest';

  const [groups, setGroups] = useState<CampusGroup[]>([]);
  const [channels, setChannels] = useState<CampusChannel[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<CampusMessage[]>([]);
  const [accessLockCode, setAccessLockCode] = useState<string | null>(null);

  // Composer state
  const [postContent, setPostContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('ENTRAIDE');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Threads state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Modals: Create Group / Create Channel / Join Private / Premium Checkout
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupVis, setNewGroupVis] = useState<'public' | 'private' | 'premium'>('public');
  const [newGroupPrice, setNewGroupPrice] = useState('10000');

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPremium, setNewChannelPremium] = useState(false);
  const [newChannelPrice, setNewChannelPrice] = useState('5000');

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Premium Room / Group Checkout modal
  const [premiumPayTarget, setPremiumPayTarget] = useState<{
    kind: 'group' | 'room';
    id: string;
    name: string;
    price: number;
  } | null>(null);

  const flashToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // 1. Chargement de l'espace Campus Social (Groupes + Salons + Droits d'accès Cloud)
  const loadWorkspace = useCallback(async (preferredGroupId?: string, preferredChannelId?: string) => {
    try {
      const qs = new URLSearchParams({
        courseId: effectiveCourseId,
        userId: effectiveUserId,
        userRole: currentUserRole
      });
      const res = await fetch(`/api/campus/social/workspace?${qs.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success) return;

      const loadedGroups: CampusGroup[] = Array.isArray(json.groups) ? json.groups : [];
      const loadedChannels: CampusChannel[] = Array.isArray(json.channels) ? json.channels : [];
      setGroups(loadedGroups);
      setChannels(loadedChannels);

      const targetGroupId =
        preferredGroupId ||
        (activeGroupId && loadedGroups.some((g) => g.id === activeGroupId) ? activeGroupId : loadedGroups[0]?.id || '');
      setActiveGroupId(targetGroupId);

      const groupChannels = loadedChannels.filter((c) => c.groupId === targetGroupId);
      const targetChannelId =
        preferredChannelId ||
        (activeChannelId && groupChannels.some((c) => c.id === activeChannelId)
          ? activeChannelId
          : groupChannels[0]?.id || '');
      setActiveChannelId(targetChannelId);
    } catch (err) {
      console.warn('[SOCIAL CAMPUS] Erreur chargement workspace:', err);
    }
  }, [effectiveCourseId, effectiveUserId, currentUserRole, activeGroupId, activeChannelId]);

  useEffect(() => {
    loadWorkspace();
  }, [effectiveCourseId, effectiveUserId, currentUserRole]);

  // 2. Chargement & synchro temps réel (4s) des messages du salon actif
  const loadChannelMessages = useCallback(async () => {
    if (!activeChannelId) return;
    try {
      const qs = new URLSearchParams({
        userId: effectiveUserId,
        userRole: currentUserRole
      });
      const res = await fetch(`/api/campus/social/channels/${encodeURIComponent(activeChannelId)}/messages?${qs.toString()}`);
      const json = await res.json().catch(() => null);
      if (res.status === 403) {
        setAccessLockCode(json?.code || 'PREMIUM_ROOM_LOCKED');
        setMessages([]);
        return;
      }
      if (res.ok && json?.success) {
        setAccessLockCode(null);
        setMessages(Array.isArray(json.messages) ? json.messages : []);
      }
    } catch {}
  }, [activeChannelId, effectiveUserId, currentUserRole]);

  useEffect(() => {
    loadChannelMessages();
    const timer = setInterval(loadChannelMessages, 4000);
    return () => clearInterval(timer);
  }, [loadChannelMessages]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;
  const activeGroupChannels = channels.filter((c) => c.groupId === activeGroupId);
  const activeChannel = activeGroupChannels.find((c) => c.id === activeChannelId) || null;

  // Sélection d'un groupe
  const handleSelectGroup = (g: CampusGroup) => {
    setActiveGroupId(g.id);
    setActionError(null);
    const firstCh = channels.find((c) => c.groupId === g.id);
    setActiveChannelId(firstCh?.id || '');
  };

  // Créer un nouveau Groupe (Public / Privé / Premium)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setActionError(null);
    try {
      const res = await fetch('/api/campus/social/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: effectiveCourseId,
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          visibility: newGroupVis,
          subscriptionPrice: newGroupVis === 'premium' ? Number(newGroupPrice) || 5000 : 0,
          ownerId: effectiveUserId,
          ownerName: currentUserName
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setActionError(json?.error || 'Impossible de créer le groupe.');
        return;
      }
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      flashToast(
        json.group.inviteCode
          ? `Groupe privé créé ! Code d'invitation : ${json.group.inviteCode}`
          : `Groupe "${json.group.name}" créé avec succès.`
      );
      await loadWorkspace(json.group.id, json.defaultChannel?.id);
    } catch {
      setActionError('Erreur réseau lors de la création du groupe.');
    }
  };

  // Créer un nouveau Salon / Room Premium dans le groupe actif
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !newChannelName.trim()) return;
    setActionError(null);
    try {
      const res = await fetch('/api/campus/social/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroupId,
          courseId: effectiveCourseId,
          name: newChannelName.trim(),
          description: newChannelDesc.trim(),
          isPremium: newChannelPremium,
          subscriptionPrice: newChannelPremium ? Number(newChannelPrice) || 5000 : 0,
          createdBy: effectiveUserId
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setActionError(json?.error || 'Impossible de créer le salon.');
        return;
      }
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelPremium(false);
      flashToast(`Salon #${json.channel.name} ajouté au groupe.`);
      await loadWorkspace(activeGroupId, json.channel.id);
    } catch {
      setActionError('Erreur réseau lors de la création du salon.');
    }
  };

  // Rejoindre un groupe privé par code d'invitation
  const handleJoinPrivateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !inviteCodeInput.trim()) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/campus/social/groups/${encodeURIComponent(activeGroup.id)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: currentUserName,
          inviteCode: inviteCodeInput.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setActionError(json?.error || "Code d'invitation invalide.");
        return;
      }
      setInviteCodeInput('');
      flashToast('Accès au groupe privé débloqué !');
      await loadWorkspace(activeGroup.id, activeChannelId);
      await loadChannelMessages();
    } catch {
      setActionError('Erreur de vérification du code.');
    }
  };

  // Callback après paiement Mobile Money réussi d'un Groupe ou d'une Room Premium
  const handlePremiumPaymentSuccess = async (details: any) => {
    if (!premiumPayTarget) return;
    const ref = details?.transactionId || details?.orderId || `SUB-${Date.now()}`;
    try {
      if (premiumPayTarget.kind === 'room') {
        await fetch(`/api/campus/social/rooms/${encodeURIComponent(premiumPayTarget.id)}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            userName: currentUserName,
            paymentMethod: 'MOBILE_MONEY',
            paymentRef: ref
          })
        });
      } else {
        await fetch(`/api/campus/social/groups/${encodeURIComponent(premiumPayTarget.id)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            userName: currentUserName,
            paymentMethod: 'MOBILE_MONEY',
            paymentRef: ref
          })
        });
      }
      setPremiumPayTarget(null);
      flashToast(`Abonnement Premium activé pour "${premiumPayTarget.name}" !`);
      await loadWorkspace(activeGroupId, activeChannelId);
      await loadChannelMessages();
    } catch {}
  };

  // Publier un message dans le salon actif
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannelId || !postContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/campus/social/channels/${encodeURIComponent(activeChannelId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: effectiveUserId,
          authorName: currentUserName,
          authorRole: currentUserRole,
          authorAvatar: currentUserAvatar || '',
          content: postContent.trim(),
          topicTag: selectedTag,
          attachmentUrl: attachmentUrl.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.message) {
        setMessages((prev) => [json.message, ...prev]);
        setPostContent('');
        setAttachmentUrl('');
        setIsAddingImage(false);
      } else {
        setActionError(json?.error || "Impossible d'envoyer le message.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Like persisté Cloud
  const handleLike = async (msgId: string) => {
    try {
      const res = await fetch(`/api/campus/social/messages/${encodeURIComponent(msgId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, likesCount: json.likesCount, likedBy: json.likedBy } : m
          )
        );
      }
    } catch {}
  };

  // Ajouter une réponse dans un thread persisté Cloud
  const handleAddComment = async (msgId: string) => {
    const txt = commentInputs[msgId]?.trim();
    if (!txt) return;
    try {
      const res = await fetch(`/api/campus/social/messages/${encodeURIComponent(msgId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: effectiveUserId,
          authorName: currentUserName,
          authorRole: currentUserRole,
          content: txt
        })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.comment) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, comments: [...(m.comments || []), json.comment], commentsCount: json.commentsCount }
              : m
          )
        );
        setCommentInputs((prev) => ({ ...prev, [msgId]: '' }));
      }
    } catch {}
  };

  return (
    <div className="w-full min-h-[620px] bg-slate-950 rounded-3xl border border-slate-800 text-slate-100 overflow-hidden shadow-2xl flex flex-col lg:flex-row">
      {/* ==================== COLONNE GAUCHE : GROUPES & SALONS (STYLE DISCORD / TEAMS) ==================== */}
      <aside className="w-full lg:w-72 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Campus Social</h3>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{courseTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Groupe</span>
          </button>
        </div>

        {/* Liste des Groupes */}
        <div className="p-3 space-y-1.5 border-b border-slate-800 max-h-48 overflow-y-auto">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1">
            Groupes &amp; Communautés ({groups.length})
          </div>
          {groups.map((g) => {
            const isSelected = g.id === activeGroupId;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectGroup(g)}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/25 border border-indigo-500/50 text-white'
                    : 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {g.visibility === 'premium' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : g.visibility === 'private' ? (
                    <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs font-bold truncate">{g.name}</span>
                </div>
                {g.visibility === 'premium' && !g.hasAccess && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                    VIP
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Liste des Salons (#Channels & Rooms Premium) du groupe sélectionné */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Salons &amp; Rooms ({activeGroupChannels.length})
            </span>
            {activeGroup && activeGroup.hasAccess && (
              <button
                type="button"
                onClick={() => setShowCreateChannel(true)}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Salon</span>
              </button>
            )}
          </div>

          {activeGroupChannels.map((ch) => {
            const isSel = ch.id === activeChannelId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setActiveChannelId(ch.id);
                  setActionError(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                  isSel
                    ? 'bg-slate-800 text-white font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ch.isPremium ? (
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : ch.channelType === 'announcements' ? (
                    <Megaphone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  ) : (
                    <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className="truncate">{ch.name}</span>
                </div>
                {ch.isPremium && !ch.hasAccess && (
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Code d'invitation si groupe privé accessible */}
        {activeGroup && activeGroup.visibility === 'private' && activeGroup.hasAccess && activeGroup.inviteCode && (
          <div className="p-3 m-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-emerald-400" />
              <span>Code d&apos;invitation Privé</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-black text-emerald-300">{activeGroup.inviteCode}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeGroup.inviteCode || '');
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Copier le code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ==================== ZONE CENTRALE : SALON LIVE / PAYWALL PREMIUM ==================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/80">
        {/* En-tête du Salon */}
        <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {activeChannel?.isPremium ? (
                <Crown className="w-4 h-4 text-amber-400" />
              ) : (
                <Hash className="w-4 h-4 text-emerald-400" />
              )}
              <h4 className="text-sm font-black text-white truncate">
                {activeChannel ? activeChannel.name : 'Sélectionnez un salon'}
              </h4>
              {activeChannel?.isPremium && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Room Premium • {formatCFA(activeChannel.subscriptionPrice)}/mois
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {activeChannel?.description || activeGroup?.description || 'Échanges en temps réel synchronisés dans le Cloud.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sync Cloud Live</span>
          </div>
        </div>

        {/* Notifications / Erreurs */}
        {actionToast && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold">
            ✅ {actionToast}
          </div>
        )}
        {actionError && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold">
            ⚠️ {actionError}
          </div>
        )}

        {/* ÉTAT VERROUILLÉ : GROUPE PRIVÉ OU ROOM PREMIUM */}
        {accessLockCode === 'PRIVATE_GROUP_LOCKED' && activeGroup ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form onSubmit={handleJoinPrivateGroup} className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Groupe Privé : {activeGroup.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Entrez le code d&apos;invitation fourni par l&apos;administrateur pour rejoindre les salons de ce groupe.
                </p>
              </div>
              <input
                type="text"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="Ex: PRIV-4A9F2C"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono text-sm text-white uppercase focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition"
              >
                Débloquer &amp; Rejoindre le Groupe Privé
              </button>
            </form>
          </div>
        ) : accessLockCode === 'PREMIUM_ROOM_LOCKED' && activeChannel ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-500/40 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 mx-auto flex items-center justify-center text-amber-300">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Room Premium sur Abonnement
                </span>
                <h4 className="text-lg font-black text-white mt-1">#{activeChannel.name}</h4>
                <p className="text-xs text-slate-300 mt-1.5">
                  {activeChannel.description || 'Accès exclusif au coaching rapproché, échanges VIP et ressources privées.'}
                </p>
              </div>
              <div className="py-3 px-4 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                <span className="text-2xl font-black text-amber-300">
                  {formatCFA(activeChannel.subscriptionPrice || activeGroup?.subscriptionPrice || 10000)}
                </span>
                <span className="text-xs text-slate-400"> / mois</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPremiumPayTarget({
                    kind: activeGroup?.visibility === 'premium' && !activeGroup.hasAccess ? 'group' : 'room',
                    id: activeGroup?.visibility === 'premium' && !activeGroup.hasAccess ? activeGroup.id : activeChannel.id,
                    name: activeGroup?.visibility === 'premium' && !activeGroup.hasAccess ? activeGroup.name : `#${activeChannel.name}`,
                    price: activeChannel.subscriptionPrice || activeGroup?.subscriptionPrice || 10000
                  })
                }
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 cursor-pointer transition"
              >
                👑 S&apos;abonner &amp; Débloquer cette Room Premium
              </button>
            </div>
          </div>
        ) : (
          /* FLUX DE MESSAGES ACTIF */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Compositeur */}
            <form onSubmit={handleSendMessage} className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-2.5">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={2}
                placeholder={`Écrire dans #${activeChannel?.name || 'salon'}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
              {isAddingImage && (
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="URL d'image ou capture d'écran..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="bg-slate-800 text-slate-200 text-[11px] font-bold rounded-lg px-2.5 py-1.5 border border-slate-700"
                  >
                    {TOPIC_TAGS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingImage(!isAddingImage)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Image</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!postContent.trim() || isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Envoi...' : 'Publier'}</span>
                </button>
              </div>
            </form>

            {/* Liste des messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[540px]">
              {messages.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">Salon #{activeChannel?.name} prêt</p>
                  <p className="text-[11px] text-slate-500">
                    Lancez la conversation avec votre groupe. Tous les messages sont synchronisés dans le Cloud.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const liked = msg.likedBy?.includes(effectiveUserId);
                  const isExpanded = expandedPostId === msg.id;
                  return (
                    <div key={msg.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-black text-indigo-200">
                            {msg.authorName?.charAt(0)?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewLearnerProfile?.(msg.authorId)}
                                className="text-xs font-black text-white hover:underline cursor-pointer"
                              >
                                {msg.authorName}
                              </button>
                              {msg.authorRole === 'INSTRUCTOR' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Formateur
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(msg.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                          {msg.topicTag}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {msg.attachmentUrl && (
                        <img
                          src={msg.attachmentUrl}
                          alt="Pièce jointe"
                          className="max-h-56 rounded-xl border border-slate-800 object-cover"
                        />
                      )}

                      <div className="flex items-center gap-4 pt-1 border-t border-slate-800/70">
                        <button
                          type="button"
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1 text-xs font-bold cursor-pointer transition ${
                            liked ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                          <span>{msg.likesCount || 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedPostId(isExpanded ? null : msg.id)}
                          className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{msg.commentsCount || (msg.comments?.length || 0)} réponses</span>
                        </button>
                      </div>

                      {/* Fil de discussion (Thread) */}
                      {isExpanded && (
                        <div className="pt-2 pl-3 border-l-2 border-slate-800 space-y-2">
                          {(msg.comments || []).map((c) => (
                            <div key={c.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200">{c.authorName}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-300 mt-1">{c.content}</p>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={commentInputs[msg.id] || ''}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                              placeholder="Répondre dans ce fil..."
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(msg.id)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Envoyer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==================== MODAL : CRÉER UN GROUPE (PUBLIC / PRIVÉ / PREMIUM) ==================== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateGroup} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Créer un Groupe Social</span>
              </h4>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nom du groupe (ex: Cercle E-Commerce VIP)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <textarea
              rows={2}
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Description du groupe..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white resize-none"
            />
            <div className="grid grid-cols-3 gap-2">
              {(['public', 'private', 'premium'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewGroupVis(v)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black border cursor-pointer transition ${
                    newGroupVis === v
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {v === 'public' ? '🌐 Public' : v === 'private' ? '🔒 Privé' : '👑 Premium'}
                </button>
              ))}
            </div>
            {newGroupVis === 'premium' && (
              <input
                type="number"
                min={500}
                value={newGroupPrice}
                onChange={(e) => setNewGroupPrice(e.target.value)}
                placeholder="Tarif mensuel FCFA (ex: 10000)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-xs text-amber-200"
              />
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Créer le Groupe
            </button>
          </form>
        </div>
      )}

      {/* ==================== MODAL : CRÉER UN SALON / ROOM PREMIUM ==================== */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateChannel} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>Créer un Salon / Room</span>
              </h4>
              <button type="button" onClick={() => setShowCreateChannel(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Nom du salon (ex: coaching-live ou ressources)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <input
              type="text"
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              placeholder="Description courte..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newChannelPremium}
                onChange={(e) => setNewChannelPremium(e.target.checked)}
                className="rounded"
              />
              <span>👑 Transformer en Room Premium sur Abonnement</span>
            </label>
            {newChannelPremium && (
              <input
                type="number"
                min={500}
                value={newChannelPrice}
                onChange={(e) => setNewChannelPrice(e.target.value)}
                placeholder="Prix abonnement FCFA (ex: 5000)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-xs text-amber-200"
              />
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Créer le Salon
            </button>
          </form>
        </div>
      )}

      {/* ==================== MODAL : ABONNEMENT ROOM PREMIUM (ULTIMATE CHECKOUT) ==================== */}
      {premiumPayTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl relative">
            <UltimateCheckout
              isOpen={true}
              onClose={() => setPremiumPayTarget(null)}
              product={{
                id: `sub_vip_room_${premiumPayTarget.id}`,
                name: `Abonnement Room Premium : ${premiumPayTarget.name}`,
                price: premiumPayTarget.price,
                category: 'Abonnement Salle VIP',
                isDigital: true
              } as any}
              storeName="Campus Social Premium"
              onSuccess={handlePremiumPaymentSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCommunityFeed;
