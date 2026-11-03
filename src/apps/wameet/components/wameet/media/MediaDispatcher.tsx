/**
 * @file MediaDispatcher.tsx
 * @description Moteur Central d'Aiguillage et de Routage Média Wameet / Nanasore (Prompt 11).
 * 
 * Spécifications Strictes de la Matrice :
 * 1. MODULE DAILY.CO (session_type: 'instant_match' | 'appointment' | 'quick_booth')
 *    - Synergy Match & Appels Instantanés
 *    - Prise de Rendez-vous Automatique
 *    - Guichet Rapide & Pitchs Asynchrones
 * 2. MODULE JITSI AUTO-HÉBERGÉ (session_type: 'classroom' | 'vip_live')
 *    - Salles de Classe Virtuelles & Ateliers de Formation
 *    - Live Sales VIP & Salons Privés en Marque Blanche (#4169E1)
 * 3. MODULE YOUTUBE LIVE (session_type: 'public_live')
 *    - Diffusion Grand Public de Masse (Illimitée en spectateurs passifs)
 * 4. MODULE REELS & CONTENUS S3 (session_type: 'reel' | 'ad_banner')
 *    - Reels Verticaux 9:16 avec Snap-Scroll & IntersectionObserver
 *    - Affiches et Vidéos explicatives Cloud Haute Performance
 */

import React from 'react';
import { DailyVideoRoom } from './DailyVideoRoom';
import { WameetRoom } from '../WameetRoom';
import { YouTubeLivePlayer } from './YouTubeLivePlayer';
import { ReelVideoPlayer } from './ReelVideoPlayer';
import { FeatureErrorBoundary } from '../../../../../components/FeatureErrorBoundary';

export type SessionType = 
  | 'instant_match'   // Daily.co: Synergy Match & appels spontanés
  | 'appointment'     // Daily.co: Rendez-vous programmés via calendrier
  | 'quick_booth'     // Daily.co: Guichet rapide & pitchs 30s asynchrones
  | 'classroom'       // Jitsi: Salles de classe & ateliers de formation
  | 'vip_live'        // Jitsi: Salons VIP & Live Sales privés
  | 'public_live'     // YouTube Live: Diffusion de masse grand public
  | 'reel'            // S3 / HTML5: Reels courts verticaux 9:16
  | 'ad_banner';      // S3 / HTML5: Affiches et vidéos 16:9

export interface MediaDispatcherProps {
  session_type: SessionType;
  
  // Identifiants & URLs médias
  mediaUrl?: string;          // URL S3/MP4, stream YouTube Live ou vidéo
  roomUrl?: string;           // URL de salon Daily.co (ex: https://wameet.daily.co/...)
  roomId?: string;            // ID de salle Jitsi ou Daily
  posterUrl?: string;         // Miniature haute définition

  // Métadonnées d'affichage & Marque Blanche
  title?: string;
  subtitle?: string;
  creatorName?: string;
  creatorAvatar?: string;
  reason?: string;
  viewersCount?: number;

  // Options de lecture
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: 'auto' | '9:16' | '16:9';

  // Callbacks & Cycle de vie
  onLeave?: () => void;
  onEnded?: () => void;
  onComplete?: () => void;
  className?: string;
}

const BaseMediaDispatcher: React.FC<MediaDispatcherProps> = ({
  session_type,
  mediaUrl = '',
  roomUrl,
  roomId,
  posterUrl,
  title = '',
  subtitle,
  creatorName = 'Créateur Wameet',
  creatorAvatar,
  reason,
  viewersCount = 350,
  autoPlay = false,
  loop = true,
  muted = true,
  aspectRatio = 'auto',
  onLeave,
  onEnded,
  onComplete,
  className = ''
}) => {
  const [useJitsiFallback, setUseJitsiFallback] = React.useState(false);
  const effectiveRoomId = roomId || 'wameet-session-' + Date.now();
  const effectiveJitsiRoomId = effectiveRoomId.startsWith('http')
    ? (effectiveRoomId.split('/').pop() || effectiveRoomId)
    : effectiveRoomId;

  // Repli automatique sur Jitsi Meet si Daily.co signale une erreur (quota, clé ou réseau)
  if (useJitsiFallback && (session_type === 'instant_match' || session_type === 'appointment' || session_type === 'quick_booth')) {
    return (
      <div className={`relative w-full h-full min-h-[420px] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-[#4169E1]/30 flex flex-col ${className}`}>
        <div className="bg-[#4169E1]/15 px-4 py-2 border-b border-[#4169E1]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-white">Relais Sécurisé Wameet (Jitsi Meet)</span>
          </div>
          <span className="text-[10px] text-blue-200">Session Chiffrée P2P</span>
        </div>
        <div className="flex-1 w-full h-full relative">
          <WameetRoom
            wameetId={effectiveJitsiRoomId}
            creatorName={creatorName}
            reason={reason || title || 'Synergy Match / Salon VIP Wameet'}
            time="Maintenant"
            onBack={onLeave}
          />
        </div>
      </div>
    );
  }

  switch (session_type) {
    // -------------------------------------------------------------------------
    // 1. MODULE DAILY.CO (Instant Match, Appointments, Quick Booth)
    // -------------------------------------------------------------------------
    case 'instant_match':
    case 'appointment':
    case 'quick_booth':
      return (
        <DailyVideoRoom
          roomUrl={roomUrl}
          roomId={effectiveRoomId}
          userName={creatorName}
          sessionType={session_type}
          durationSeconds={session_type === 'instant_match' ? 900 : 7200}
          title={title}
          partnerName={creatorName}
          onErrorFallback={() => {
            console.log('[MediaDispatcher] Bascule automatique Daily.co -> Jitsi Meet');
            setUseJitsiFallback(true);
          }}
          onLeave={onLeave}
          className={className}
        />
      );

    // -------------------------------------------------------------------------
    // 2. MODULE JITSI AUTO-HÉBERGÉ (Classroom, VIP Live Sales)
    // -------------------------------------------------------------------------
    case 'classroom':
    case 'vip_live':
      return (
        <WameetRoom
          wameetId={roomId || 'wameet-classroom-session'}
          creatorName={creatorName}
          reason={reason || title || (session_type === 'classroom' ? 'Salle de classe Wameet' : 'Live Sales VIP')}
          time="En direct"
          onBack={onLeave}
        />
      );

    // -------------------------------------------------------------------------
    // 3. MODULE YOUTUBE LIVE (Diffusion Grand Public)
    // -------------------------------------------------------------------------
    case 'public_live':
      return (
        <YouTubeLivePlayer
          streamUrl={mediaUrl}
          title={title || 'Direct Grand Public Wameet'}
          creatorName={creatorName}
          viewersCount={viewersCount}
          className={className}
        />
      );

    // -------------------------------------------------------------------------
    // 4. MODULE REELS & CONTENUS S3 (Reels 9:16 & Bannières S3 / CloudFront)
    // -------------------------------------------------------------------------
    case 'reel':
    case 'ad_banner':
    default:
      return (
        <ReelVideoPlayer
          mediaUrl={mediaUrl}
          posterUrl={posterUrl}
          sessionType={session_type === 'ad_banner' ? 'ad_banner' : 'reel'}
          title={title}
          subtitle={subtitle}
          creatorName={creatorName}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          aspectRatio={aspectRatio}
          onEnded={onEnded || onComplete}
          className={className}
        />
      );
  }
};

export const MediaDispatcher: React.FC<MediaDispatcherProps> = (props) => (
  <FeatureErrorBoundary featureName="Visio / Live Wameet">
    <BaseMediaDispatcher {...props} />
  </FeatureErrorBoundary>
);

// Export par défaut et alias de rétrocompatibilité
export default MediaDispatcher;
export { MediaDispatcher as WameetMediaDispatcherCompat };
