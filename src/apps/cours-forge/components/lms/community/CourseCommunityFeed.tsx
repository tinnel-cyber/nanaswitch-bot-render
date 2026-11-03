import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  Send, 
  Image as ImageIcon, 
  Tag, 
  CheckCircle, 
  Sparkles, 
  Filter, 
  Pin, 
  Flame, 
  ShieldCheck, 
  MoreVertical, 
  ChevronDown, 
  Plus, 
  Award,
  Clock,
  User
} from 'lucide-react';
import { CommunityPost, PostComment, CommunityTopicTag } from '../../../../../types/community';
import { 
  subscribeToCourseFeed, 
  createCommunityPost, 
  togglePostLike, 
  addCommentToPost,
  loadMoreCourseFeed,
  endorsePost,
  ensureStudentInCommunityGroup
} from '../../../../../services/communityService';
import { DocumentSnapshot } from 'firebase/firestore';

interface CourseCommunityFeedProps {
  courseId: string;
  courseTitle?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserRole?: 'STUDENT' | 'INSTRUCTOR';
  onViewLearnerProfile?: (userId: string) => void;
  onOpenDirectMessage?: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
}

const TOPIC_TAGS: { label: string; value: CommunityTopicTag; color: string }[] = [
  { label: 'Tous', value: 'GENERAL', color: 'bg-slate-800 text-slate-300' },
  { label: '🤝 Entraide', value: 'ENTRAIDE', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { label: '📝 Devoirs & Exercices', value: 'DEVOIR', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { label: '💡 Astuces', value: 'ASTUCE', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { label: '📢 Annonces', value: 'ANNONCE', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
];

export const CourseCommunityFeed: React.FC<CourseCommunityFeedProps> = ({
  courseId,
  courseTitle = 'Communauté du Cours',
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole = 'STUDENT',
  onViewLearnerProfile,
  onOpenDirectMessage
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTopic, setActiveTopic] = useState<CommunityTopicTag | 'ALL'>('ALL');

  // Post composer state
  const [postContent, setPostContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<CommunityTopicTag>('ENTRAIDE');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active comments drawer
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState(false);

  // Auto-register user into community group on mount
  useEffect(() => {
    if (courseId && currentUserId) {
      ensureStudentInCommunityGroup(courseId, {
        id: currentUserId,
        name: currentUserName,
        email: '',
        role: currentUserRole === 'INSTRUCTOR' ? 'instructor' : 'student',
        avatarUrl: currentUserAvatar
      } as any);
    }
  }, [courseId, currentUserId, currentUserName, currentUserAvatar, currentUserRole]);

  // Real-time Firestore subscription to course feed
  useEffect(() => {
    if (!courseId) return;

    const unsubscribe = subscribeToCourseFeed(courseId, ({ posts: feedPosts, hasMore: feedHasMore, lastDoc: feedLastDoc }) => {
      setPosts(feedPosts);
      setHasMore(feedHasMore);
      setLastDoc(feedLastDoc);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [courseId]);

  // Handle cursor pagination
  const handleLoadMore = async () => {
    if (!courseId || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const { posts: nextPosts, hasMore: nextHasMore, lastDoc: nextLastDoc } = await loadMoreCourseFeed(courseId, 10, lastDoc);
      if (!nextHasMore) {
        setHasMore(false);
      }
      setPosts((prev) => [...prev, ...nextPosts]);
      setLastDoc(nextLastDoc);
    } catch (err) {
      console.error('Erreur pagination curseur:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Submit new community post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createCommunityPost(courseId, {
        courseId,
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole: currentUserRole,
        authorAvatar: currentUserAvatar,
        content: postContent.trim(),
        topicTag: selectedTag,
        attachmentUrl: attachmentUrl.trim() || undefined,
        attachmentType: attachmentUrl.trim() ? 'IMAGE' : undefined
      });

      setPostContent('');
      setAttachmentUrl('');
      setIsAddingImage(false);
    } catch (err) {
      console.error('Erreur création post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Like
  const handleLike = async (postId: string) => {
    try {
      await togglePostLike(courseId, postId, currentUserId);
    } catch (err) {
      console.error('Erreur like:', err);
    }
  };

  // Submit comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || submittingComment) return;

    setSubmittingComment(true);
    try {
      await addCommentToPost(courseId, postId, {
        postId,
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole: currentUserRole,
        authorAvatar: currentUserAvatar,
        content: text
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Erreur commentaire:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Instructor endorsement
  const handleEndorse = async (postId: string, commentId: string) => {
    if (currentUserRole !== 'INSTRUCTOR') return;
    try {
      await endorsePost(courseId, postId, currentUserName);
    } catch (err) {
      console.error('Erreur validation instructeur:', err);
    }
  };

  // Filter posts by tag
  const filteredPosts = posts.filter((p) => {
    if (activeTopic === 'ALL') return true;
    return p.topicTag === activeTopic;
  });

  return (
    <div className="w-full flex flex-col min-h-[500px] bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-100 overflow-hidden">
      {/* Header bar */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">
              {courseTitle}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Social Campus Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Échangez avec les autres apprenants et les formateurs en temps réel.
          </p>
        </div>

        {/* Topic Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <button
            onClick={() => setActiveTopic('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTopic === 'ALL'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            Tous
          </button>
          {TOPIC_TAGS.slice(1).map((tag) => (
            <button
              key={tag.value}
              onClick={() => setActiveTopic(tag.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                activeTopic === tag.value
                  ? 'bg-slate-800 text-emerald-300 border-emerald-500 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline Scrollable Container */}
      <div className="flex-1 max-h-[720px] overflow-y-auto overscroll-contain p-4 space-y-4 touch-pan-y custom-scrollbar">
        {/* Post Composer Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={currentUserName}
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800"
            />
            <div className="flex-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Posez une question, partagez une astuce ou commentez un exercice..."
                rows={2}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none transition"
              />

              {/* Optional Image URL Input */}
              {isAddingImage && (
                <div className="mt-2">
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="URL de l'image ou capture d'écran de l'exercice..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Composer Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  {/* Topic tag selector */}
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value as CommunityTopicTag)}
                    className="bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ENTRAIDE">🤝 Entraide</option>
                    <option value="DEVOIR">📝 Devoir</option>
                    <option value="ASTUCE">💡 Astuce</option>
                    <option value="GENERAL">💬 Général</option>
                    {currentUserRole === 'INSTRUCTOR' && (
                      <option value="ANNONCE">📢 Annonce Officielle</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsAddingImage(!isAddingImage)}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 border transition ${
                      isAddingImage
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Capture</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() || isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs disabled:opacity-40 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">Aucun message dans ce salon</p>
            <p className="text-[11px] text-slate-500">
              Soyez le premier à poser une question ou lancer une discussion avec votre promotion !
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const hasLiked = post.likedBy?.includes(currentUserId);
            const isCommentsExpanded = expandedCommentsPostId === post.id;

            return (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-shadow shadow-md space-y-3"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onViewLearnerProfile && onViewLearnerProfile(post.authorId)}
                      className="relative group"
                    >
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 group-hover:border-emerald-500 transition"
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewLearnerProfile && onViewLearnerProfile(post.authorId)}
                          className="text-xs font-bold text-white hover:text-emerald-400 transition"
                        >
                          {post.authorName}
                        </button>
                        {post.authorRole === 'INSTRUCTOR' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> Formateur
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{new Date(post.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400">#{post.topicTag}</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct message shortcut */}
                  {onOpenDirectMessage && post.authorId !== currentUserId && (
                    <button
                      onClick={() => onOpenDirectMessage(post.authorId, post.authorName, post.authorAvatar)}
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 text-xs transition"
                      title="Envoyer un message direct"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {post.content}
                </div>

                {/* Optional Attachment */}
                {post.attachmentUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 max-h-80">
                    <img
                      src={post.attachmentUrl}
                      alt="Pièce jointe du devoir"
                      className="w-full h-auto object-cover hover:scale-102 transition duration-300"
                    />
                  </div>
                )}

                {/* Actions bar (Likes, Comments, Endorsement) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                        hasLiked
                          ? 'text-rose-400 bg-rose-500/10 font-bold'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current text-rose-500' : ''}`} />
                      <span>{post.likesCount || 0}</span>
                    </button>

                    <button
                      onClick={() => setExpandedCommentsPostId(isCommentsExpanded ? null : post.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                        isCommentsExpanded
                          ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{post.commentsCount || 0} réponses</span>
                    </button>
                  </div>

                  {currentUserRole === 'INSTRUCTOR' && (
                    <button
                      onClick={() => handleEndorse(post.id, '')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" /> Valider Solution
                    </button>
                  )}
                </div>

                {/* Expandable Comments Drawer */}
                {isCommentsExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 bg-slate-950/40 p-3 rounded-xl">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Échanges & Commentaires
                    </h5>

                    {/* Comment composer */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Répondre à cette discussion..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={submittingComment || !commentInputs[post.id]?.trim()}
                        className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-40 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load More Cursor Button */}
        {hasMore && posts.length >= 10 && (
          <div className="pt-2 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 disabled:opacity-50 transition"
            >
              {loadingMore ? 'Chargement des messages suivants...' : 'Charger les messages précédents'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCommunityFeed;
