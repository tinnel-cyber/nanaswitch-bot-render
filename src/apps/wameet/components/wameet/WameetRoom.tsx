/**
 * @file WameetRoom.tsx
 * @description Composant Salle Vidéo Wameet & Salon Visioconférence (Prompt 5).
 * 
 * Spécifications :
 * 1. Méta-balises Open Graph dynamiques :
 *    - Titre : "Invitation Wameet de [Nom du Créateur]"
 *    - Description : "Motif : [Motif de la rencontre] | Session sécurisée Wameet"
 *    - Couleur de thème : #4169E1
 * 2. Phase 1 : Salle d'Attente & Carte d'Invitation
 *    - Fond Blanc Pur, ruban/badge Bleu Royal (#4169E1)
 *    - Affichage clair du nom de l'hôte, motif validé, bouton stylé "Entrer dans le Salon Wameet"
 * 3. Phase 2 : Connexion WebRTC / Visioconférence
 *    - API Iframe externe Jitsi (https://meet.jit.si/external_api.js)
 *    - Nom de salle unique et anonymisé : Wameet-Room-[idDuWameet]
 *    - Conteneur dédié : w-full h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200
 *    - Marque blanche : Masquage des filigranes, "Membre Wameet", toolbarButtons épurés
 *    - Bouton Bouclier / Signalement d'urgence
 */

import React, { useState, useEffect, useRef } from 'react';
import { Video, Clock, ShieldCheck, LogOut, Sparkles, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export interface WameetRoomProps {
  wameetId: string;
  creatorName?: string;
  reason?: string;
  time?: string;
  onBack?: () => void;
}

export const WameetRoom: React.FC<WameetRoomProps> = ({
  wameetId,
  creatorName = 'Ibrahim Pousbila',
  reason = 'Discussion & Synergie Business',
  time = 'Maintenant',
  onBack
}) => {
  const [isAccepted, setIsAccepted] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  // État du Bouton Bouclier & Modération d'Urgence
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [safetyToast, setSafetyToast] = useState<string | null>(null);

  // 1. Configuration des Méta-Balises de Partage / Open Graph (Prompt 5 - Étape 2)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousTitle = document.title;
    const ogTitle = `Invitation Wameet de ${creatorName}`;
    const ogDescription = `Motif : ${reason} | Session sécurisée Wameet`;
    const themeColor = '#4169E1';

    document.title = ogTitle;

    const setMetaTag = (attr: string, key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMetaTag('property', 'og:title', ogTitle);
    setMetaTag('property', 'og:description', ogDescription);
    setMetaTag('property', 'og:type', 'video.other');
    setMetaTag('property', 'og:site_name', 'Wameet');
    setMetaTag('name', 'description', ogDescription);
    setMetaTag('name', 'theme-color', themeColor);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', ogTitle);
    setMetaTag('name', 'twitter:description', ogDescription);

    return () => {
      document.title = previousTitle;
    };
  }, [creatorName, reason]);

  // Chargement dynamique du script officiel de l'API Iframe Jitsi Meet
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.JitsiMeetExternalAPI) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      setIsApiLoaded(true);
      console.log('[WAMEET ROOM] API Visioconférence externe chargée avec succès.');
    };
    script.onerror = () => {
      console.error('[WAMEET ROOM] Erreur de chargement du script visioconférence externe.');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script si nécessaire
    };
  }, []);

  // 3. Intégration Visioconférence : Nom de salle unique Wameet-Room-[idDuWameet]
  useEffect(() => {
    if (!isAccepted || !isApiLoaded || !jitsiContainerRef.current) return;

    const configuredDomain = 
      (typeof process !== 'undefined' && process.env?.REACT_APP_JITSI_DOMAIN) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_JITSI_DOMAIN) ||
      'jitsi.wameet.net';
    const domain = configuredDomain || 'meet.jit.si';
    const cleanId = wameetId.replace(/[^a-zA-Z0-9-_]/g, '');
    const roomName = `Wameet-Room-${cleanId}`;

    try {
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'tileview',
            'fullscreen'
          ]
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          DEFAULT_BACKGROUND: '#4169E1',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Membre Wameet',
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'tileview',
            'fullscreen'
          ]
        },
        userInfo: {
          displayName: 'Membre Wameet'
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      api.addEventListeners({
        videoConferenceLeft: () => {
          console.log('[WAMEET] Session terminée par l\'utilisateur');
          handleLeave();
        }
      });

      return () => {
        try {
          api.dispose();
        } catch (e) {
          console.warn('[WAMEET] Erreur lors de la fermeture de la session', e);
        }
      };
    } catch (err) {
      console.error('[WAMEET] Erreur lors de l\'instanciation du salon', err);
    }
  }, [isAccepted, isApiLoaded, wameetId]);

  const handleAccept = () => {
    playValidationBeep();
    setIsAccepted(true);
  };

  const handleLeave = () => {
    playTapBeep();
    if (jitsiApi) {
      try {
        jitsiApi.dispose();
      } catch (e) {}
      setJitsiApi(null);
    }
    setIsAccepted(false);
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/wameet';
    }
  };

  /**
   * Modération d'Urgence (Kill Switch - Prompt 8)
   */
  const handleEmergencyReport = async () => {
    setIsReporting(true);
    playTapBeep();

    // 1. Destruction immédiate de la session vidéo côté client via l'API Jitsi (api.dispose())
    if (jitsiApi) {
      try {
        jitsiApi.dispose();
      } catch (e) {
        console.warn('[KILL SWITCH] Erreur dispose salon Jitsi:', e);
      }
      setJitsiApi(null);
    }
    setIsAccepted(false);
    setIsReportModalOpen(false);

    // 2. Toast de confirmation rassurant exigé par le Prompt 8
    const victimMessage = "Appel sécurisé. Signalement transmis à notre équipe d'éthique.";
    setSafetyToast(victimMessage);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('wameet_safety_toast', victimMessage);
      } catch (e) {}
    }

    // 3. Sanction Backend : Statut à 'REPORTED_ABUSE' & réduction du score d'impact de 500 points
    const nowIso = new Date().toISOString();
    try {
      await supabase
        .from('wameet_messages')
        .insert({
          id: `rep_${Date.now()}`,
          chat_id: wameetId,
          sender_name: creatorName,
          text: `REPORTED_ABUSE: Signalement d'urgence en direct (Bouton Bouclier)`,
          type: 'abuse_report',
          status: 'reported',
          created_at: nowIso
        });
    } catch (dbErr) {
      console.warn('[KILL SWITCH] Enregistrement Supabase :', dbErr);
    }

    // C. Requête API backend de réplication
    try {
      await fetch('/api/wameet/report-abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wameetId,
          reportedParticipantId: creatorName,
          reason: "Signalement d'urgence en direct (Bouton Bouclier)"
        })
      });
    } catch (err) {
      console.warn('[KILL SWITCH] Requête API report-abuse :', err);
    }

    // 4. Redirection immédiate vers le fil d'accueil
    setTimeout(() => {
      if (onBack) {
        onBack();
      } else if (typeof window !== 'undefined') {
        window.location.href = '/wameet';
      }
    }, 1200);
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 flex flex-col justify-center items-center relative overflow-hidden select-none px-4 py-8">
      {/* ===================================================================
          PHASE 1 : SALLE D'ATTENTE & CARTE D'INVITATION (AVANT ACCÈS)
          Fond Blanc Pur, ruban et badges Bleu Royal (#4169E1)
         =================================================================== */}
      {!isAccepted ? (
        <div className="w-full max-w-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
            {/* Ruban décoratif Bleu Royal (#4169E1) */}
            <div className="w-full h-2.5 bg-[#4169E1] absolute top-0 inset-x-0" />

            {/* Bouton retour optionnel */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Badge Wameet */}
            <div className="mt-2 mb-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#4169E1] text-[11px] font-black uppercase tracking-wider border border-blue-100 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Invitation Salon Wameet</span>
            </div>

            {/* Titre */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Invitation Wameet de <span className="text-[#4169E1]">{creatorName}</span>
            </h1>

            {/* Détails de l'invitation */}
            <div className="w-full my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#4169E1] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Motif de la rencontre
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    {reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-200/60">
                <Clock className="w-4 h-4 text-[#4169E1] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Créneau horaire
                  </span>
                  <p className="text-xs font-black text-slate-800">
                    {time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-200/60">
                <Video className="w-4 h-4 text-[#4169E1] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Salon Sécurisé Wameet
                  </span>
                  <p className="text-[11px] font-mono text-slate-700 truncate">
                    Wameet-Room-{wameetId.slice(0, 16)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton Stylé : "Entrer dans le Salon Wameet" */}
            <button
              type="button"
              onClick={handleAccept}
              className="w-full py-4 px-6 rounded-2xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-sm shadow-xl shadow-[#4169E1]/30 cursor-pointer transition active:scale-95 flex items-center justify-center gap-2 tracking-wide"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Entrer dans le Salon Wameet</span>
            </button>

            <p className="text-[11px] text-slate-400 font-medium mt-3.5">
              Accès instantané par navigateur • Sans téléchargement requis
            </p>
          </div>
        </div>
      ) : (
        /* ===================================================================
           PHASE 2 : CONNEXION WEBRTC / VISIOCONFÉRENCE DÉDIÉE
           Conteneur dédié : w-full h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200
           =================================================================== */
        <div className="w-full max-w-5xl flex flex-col items-center gap-3 animate-in fade-in duration-300">
          {/* Barre Supérieure du Salon Wameet */}
          <div className="w-full bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl flex items-center justify-between border border-slate-200 shadow-md">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  Salon Wameet • {creatorName}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {reason}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4169E1] text-[10px] font-black uppercase tracking-wider border border-blue-100">
                En Direct
              </span>
            </div>

            <button
              type="button"
              onClick={handleLeave}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quitter le salon</span>
            </button>
          </div>

          {/* Conteneur dédié de visioconférence (Spécification Prompt 5) */}
          <div className="w-full h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-black relative">
            <div
              ref={jitsiContainerRef}
              className="w-full h-full bg-black"
            />

            {/* Bouton Bouclier Flottant d'Urgence / Kill Switch (Prompt 8) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsReportModalOpen(true);
              }}
              title="Signaler et couper l'appel d'urgence"
              aria-label="Signaler et couper l'appel"
              className="fixed bottom-8 right-6 z-[100] bg-red-600 hover:bg-red-700 text-white p-3.5 rounded-full shadow-[0_8px_25px_rgba(239,68,68,0.5)] transition-all active:scale-95 border border-white/20 flex items-center justify-center cursor-pointer group"
            >
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <span className="sr-only">Signaler et couper l'appel d'urgence</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Signalement d'Urgence (Prompt 8) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-red-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 ring-8 ring-red-50">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 leading-tight">
              Signaler et couper immédiatement l'appel ?
            </h3>

            <p className="text-xs text-slate-500 font-medium mt-2 mb-6 leading-relaxed">
              La session sera instantanément fermée et le compte signalé subira une pénalité de{' '}
              <strong className="text-red-600 font-black">-500 points d'impact</strong>.
            </p>

            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                disabled={isReporting}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleEmergencyReport}
                disabled={isReporting}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isReporting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Oui, couper</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Réassurance */}
      {safetyToast && (
        <div className="fixed top-8 inset-x-4 max-w-md mx-auto z-[120] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-black leading-snug">{safetyToast}</p>
            <p className="text-[10px] text-emerald-100 font-medium">Redirection sécurisée vers l'accueil...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetRoom;
