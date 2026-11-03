/**
 * @file WameetMediaDispatcher.tsx
 * @description Routeur central de lecteurs vidéo pour l'écosystème Wameet & Nanasore (Prompt 9).
 * 
 * Spécifications :
 * 1. Vidéos YouTube Longues -> WameetYouTubePlayer (16:9 standard épuré)
 * 2. Vidéos Cloud & CDN -> WameetAdaptiveCloudPlayer (Auto-détection 9:16 vs 16:9)
 * 3. Cours et Leçons dans les Salles de Classe :
 *    - Leçons préenregistrées -> WameetClassroomReelPlayer (Immersif Reels, IntersectionObserver)
 *    - Sessions Live en classe -> WameetClassroomLivePlayer (YouTube Live API, streaming direct)
 * 4. Salons VIP, Lives Shopping et Formations Live -> WameetRoom (WebRTC Jitsi Meet encapsulé, Sas de Paiement, Bouton Bouclier)
 */

import React from 'react';
import { WameetYouTubePlayer } from './WameetYouTubePlayer';
import { WameetAdaptiveCloudPlayer } from './WameetAdaptiveCloudPlayer';
import { WameetClassroomReelPlayer } from './WameetClassroomReelPlayer';
import { WameetClassroomLivePlayer } from './WameetClassroomLivePlayer';
import { WameetRoom } from '../WameetRoom';
import { extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';
import { MediaDispatcher, SessionType } from './MediaDispatcher';
import { FeatureErrorBoundary } from '../../../../../components/FeatureErrorBoundary';

export type WameetMediaContext =
  | 'auto'
  | 'youtube'
  | 'cloud'
  | 'classroom_lesson'
  | 'classroom_live'
  | 'vip_room'
  | 'live_shopping';

export interface WameetMediaDispatcherProps {
  session_type?: SessionType;
  roomUrl?: string;
  mediaUrl?: string;
  context?: WameetMediaContext;
  title?: string;
  subtitle?: string;
  posterUrl?: string;
  aspectRatio?: 'auto' | '16:9' | '9:16';
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  instructorName?: string;
  courseTitle?: string;
  moduleLabel?: string;
  isCompleted?: boolean;
  hasNextLesson?: boolean;
  onComplete?: () => void;
  onNextLesson?: () => void;

  // Spécifique Salons VIP & Live Shopping (WebRTC / Jitsi)
  wameetId?: string;
  creatorName?: string;
  reason?: string;
  time?: string;
  onBack?: () => void;

  className?: string;
}

const BaseWameetMediaDispatcher: React.FC<WameetMediaDispatcherProps> = ({
  session_type,
  roomUrl,
  mediaUrl = '',
  context = 'auto',
  title = '',
  subtitle,
  posterUrl,
  aspectRatio = 'auto',
  autoPlay = false,
  loop = false,
  muted = false,
  instructorName,
  courseTitle,
  moduleLabel,
  isCompleted = false,
  hasNextLesson = false,
  onComplete,
  onNextLesson,
  wameetId,
  creatorName,
  reason,
  time,
  onBack,
  className = ''
}) => {
  // Si session_type de la nouvelle matrice est spécifié, déléguer directement à MediaDispatcher
  if (session_type) {
    return (
      <MediaDispatcher
        session_type={session_type}
        mediaUrl={mediaUrl}
        roomUrl={roomUrl}
        roomId={wameetId}
        posterUrl={posterUrl}
        title={title || courseTitle}
        subtitle={subtitle || moduleLabel}
        creatorName={creatorName || instructorName}
        reason={reason}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        aspectRatio={aspectRatio}
        onLeave={onBack}
        onComplete={onComplete}
        className={className}
      />
    );
  }

  // 1. Branche Salons VIP, Lives Shopping et Formations Live interactives (Jitsi Meet encapsulé)
  if (context === 'vip_room' || context === 'live_shopping' || (wameetId && !mediaUrl)) {
    return (
      <WameetRoom
        wameetId={wameetId || 'wameet-direct-session'}
        creatorName={creatorName || instructorName || 'Hôte Wameet'}
        reason={reason || title || 'Session Privée & Live Wameet'}
        time={time || 'En direct'}
        onBack={onBack}
      />
    );
  }

  // 2. Branche Sessions Live dans les Salles de Classe (YouTube Live)
  if (context === 'classroom_live') {
    return (
      <WameetClassroomLivePlayer
        streamUrl={mediaUrl}
        title={title || 'Session Live en Direct'}
        instructorName={instructorName}
        className={className}
      />
    );
  }

  // 3. Branche Leçons Vidéo Préenregistrées dans les Salles de Classe (Reel Immersif / IntersectionObserver)
  if (context === 'classroom_lesson') {
    return (
      <WameetClassroomReelPlayer
        videoUrl={mediaUrl}
        posterUrl={posterUrl}
        lessonTitle={title || 'Leçon de cours'}
        courseTitle={courseTitle}
        moduleLabel={moduleLabel}
        instructorName={instructorName}
        isCompleted={isCompleted}
        hasNextLesson={hasNextLesson}
        onComplete={onComplete}
        onNextLesson={onNextLesson}
        className={className}
      />
    );
  }

  // 4. Détection Automatique de la Source si context === 'auto' ou standard
  const isYouTube = Boolean(extractYouTubeVideoId(mediaUrl));

  if (context === 'youtube' || (context === 'auto' && isYouTube)) {
    return (
      <WameetYouTubePlayer
        videoUrl={mediaUrl}
        title={title}
        subtitle={subtitle}
        autoPlay={autoPlay}
        onEnded={onComplete}
        className={className}
      />
    );
  }

  // 5. Branche Vidéos Espace Cloud / CDN / MP4 avec Auto-Ratio
  return (
    <WameetAdaptiveCloudPlayer
      src={mediaUrl}
      poster={posterUrl}
      title={title}
      subtitle={subtitle}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      forcedRatio={aspectRatio}
      onEnded={onComplete}
      className={className}
    />
  );
};

export const WameetMediaDispatcher: React.FC<WameetMediaDispatcherProps> = (props) => (
  <FeatureErrorBoundary featureName="Visio / Live Wameet">
    <BaseWameetMediaDispatcher {...props} />
  </FeatureErrorBoundary>
);

export default WameetMediaDispatcher;
