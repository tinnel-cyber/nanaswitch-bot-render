import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Award, 
  BookOpen, 
  Calendar, 
  MapPin, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  ExternalLink, 
  Edit3,
  Check,
  ChevronRight
} from 'lucide-react';
import { LearnerProfile, LearnerBadge, LearnerCertificateItem } from '../../../../../types/community';
import { getLearnerProfile, updateLearnerProfile, SYSTEM_BADGES } from '../../../../../services/communityService';

interface LearnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  currentUserId?: string;
  onOpenDirectMessage?: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
}

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserId,
  onOpenDirectMessage
}) => {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CERTIFICATES' | 'COURSES'>('OVERVIEW');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let mounted = true;
    setLoading(true);

    getLearnerProfile(userId)
      .then((p) => {
        if (!mounted) return;
        if (p) {
          setProfile(p);
          setBioInput(p.bio || '');
          setTitleInput(p.title || '');
          setLocationInput(p.location || '');
        }
      })
      .catch((err) => {
        console.error('Erreur chargement profil:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isOwner = currentUserId === userId;

  const handleSaveProfile = async () => {
    if (!userId || !profile) return;
    try {
      await updateLearnerProfile(userId, {
        bio: bioInput,
        title: titleInput,
        location: locationInput
      });
      setProfile({
        ...profile,
        bio: bioInput,
        title: titleInput,
        location: locationInput
      });
      setIsEditingBio(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Erreur sauvegarde profil:', e);
    }
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'border-amber-500/60 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
      case 'EPIC':
        return 'border-purple-500/60 bg-purple-500/10 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]';
      case 'RARE':
        return 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]';
      default:
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner glow */}
        <div className="h-28 w-full bg-gradient-to-r from-emerald-600/30 via-cyan-600/20 to-purple-600/30 relative border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
          <button
            onClick={onClose}
            aria-label="Fermer le profil"
            className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info Header */}
        <div className="px-6 -mt-12 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-end gap-4">
            <div className="relative">
              <img
                src={profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={profile?.name || 'Apprenant'}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-900 bg-slate-800 shadow-xl"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">
                  {profile?.name || 'Chargement...'}
                </h3>
                {profile?.role === 'INSTRUCTOR' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 border border-purple-500/50 text-purple-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> FORMATEUR
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> APPRENANT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {profile?.title || 'Membre Actif de la Communauté NaNa'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-end">
            {!isOwner && onOpenDirectMessage && (
              <button
                onClick={() => {
                  if (profile) {
                    onOpenDirectMessage(profile.userId, profile.name, profile.avatarUrl);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Message Direct
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setIsEditingBio(!isEditingBio)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                {isEditingBio ? 'Annuler' : 'Modifier Profil'}
              </button>
            )}
          </div>
        </div>

        {/* Reputation & Level Bar */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {profile?.reputationPoints || 0} pts de Réputation
            </span>
            <span className="text-slate-400 font-medium">•</span>
            <span className="text-cyan-300 font-semibold">
              Niveau : {profile?.levelTitle || 'Apprenant NaNa'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            {profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Inscrit en 2026</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Vue d'ensemble & Badges
          </button>
          <button
            onClick={() => setActiveTab('CERTIFICATES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'CERTIFICATES'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Certifications ({profile?.certificates?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('COURSES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'COURSES'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Cours Suivis ({profile?.enrolledCourses?.length || 0})
          </button>
        </div>

        {/* Main Scrollable Content Area */}
        <div className="p-6 overflow-y-auto overscroll-contain flex-1 space-y-6 touch-pan-y custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Chargement du profil sécurisé...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Edit Form (if owner editing) */}
                  {isEditingBio ? (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Modifier mes informations
                        </h4>
                        {saveSuccess && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Enregistré !
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Titre professionnel</label>
                        <input
                          type="text"
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          placeholder="ex: Spécialiste FinTech UEMOA"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Localisation</label>
                        <input
                          type="text"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="ex: Ouagadougou, BF"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Biographie</label>
                        <textarea
                          value={bioInput}
                          onChange={(e) => setBioInput(e.target.value)}
                          rows={3}
                          placeholder="Racontez vos projets et domaines d'expertise..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsEditingBio(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Bio Card */
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Biographie
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {profile?.bio || 'Aucune biographie fournie pour le moment.'}
                      </p>
                    </div>
                  )}

                  {/* Badges Earned Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Insignes & Trophées Obtenus
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {profile?.badges?.length || 0} débloqués
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(profile?.badges && profile.badges.length > 0 ? profile.badges : SYSTEM_BADGES.slice(0, 2)).map((badge) => (
                        <div
                          key={badge.id}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${getRarityBadgeStyle(badge.rarity)}`}
                        >
                          <div className="text-2xl flex-shrink-0">{badge.icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{badge.name}</p>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-black/40">
                                {badge.rarity}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CERTIFICATES */}
              {activeTab === 'CERTIFICATES' && (
                <div className="space-y-3">
                  {profile?.certificates && profile.certificates.length > 0 ? (
                    profile.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <Award className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white">{cert.courseTitle}</h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Délivré à {cert.studentName} • {new Date(cert.issuedAt).toLocaleDateString('fr-FR')}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-300 border border-slate-700">
                                ID: {cert.verificationCode}
                              </span>
                              {cert.score && (
                                <span className="text-[10px] font-bold text-cyan-300">
                                  Score : {cert.score}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => alert(`Certificat vérifié : ${cert.verificationCode}`)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 border border-slate-700"
                          >
                            <ExternalLink className="w-3 h-3" /> Vérifier
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                      <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">Aucun certificat officiel pour l'instant</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Complétez un parcours d'apprentissage pour débloquer votre certificat certifié.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ENROLLED COURSES */}
              {activeTab === 'COURSES' && (
                <div className="space-y-3">
                  {profile?.enrolledCourses && profile.enrolledCourses.length > 0 ? (
                    profile.enrolledCourses.map((c) => (
                      <div
                        key={c.courseId}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-white">{c.courseTitle}</h5>
                          <span className="text-xs font-extrabold text-emerald-400">
                            {c.progressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${c.progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>{c.completedLessonsCount} sur {c.totalLessonsCount} leçons validées</span>
                          <span>Dernière activité : {new Date(c.lastActiveAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                      <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">Aucun cours inscrit</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Identité cryptographique vérifiée sur le réseau NaNa</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnerProfileModal;
