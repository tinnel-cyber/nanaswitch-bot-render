import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Video, 
  Globe, 
  Radio, 
  Calendar, 
  Clock, 
  Sparkles, 
  KeyRound, 
  Check, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { LivePlatformProvider, LiveSessionConfig } from '../../../../../types';
import { generateLiveMeeting } from '../../../../../services/externalIntegrationsService';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface LiveSessionConfigModalProps {
  isOpen: boolean;
  nodeId: string;
  initialTitle?: string;
  initialConfig?: LiveSessionConfig;
  onClose: () => void;
  onSave: (nodeId: string, title: string, config: LiveSessionConfig) => void;
}

export const LiveSessionConfigModal: React.FC<LiveSessionConfigModalProps> = ({
  isOpen,
  nodeId,
  initialTitle = 'Session Directe Interactive',
  initialConfig,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [provider, setProvider] = useState<LivePlatformProvider>(initialConfig?.provider || 'DAILY');
  const [scheduledAt, setScheduledAt] = useState(
    initialConfig?.scheduledAt || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(initialConfig?.durationMinutes || 60);
  const [meetingUrl, setMeetingUrl] = useState(initialConfig?.meetingUrl || '');
  const [meetingId, setMeetingId] = useState(initialConfig?.meetingId || '');
  const [passcode, setPasscode] = useState(initialConfig?.passcode || '');
  const [jitsiServerDomain, setJitsiServerDomain] = useState(initialConfig?.jitsiServerDomain || 'meet.jit.si');
  const [jitsiRoomName, setJitsiRoomName] = useState(initialConfig?.jitsiRoomName || '');
  const [isAutoRecord, setIsAutoRecord] = useState(initialConfig?.isAutoRecordEnabled ?? true);
  const [autoMarkCompleted, setAutoMarkCompleted] = useState(initialConfig?.autoMarkCompletedOnEnd ?? true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleGenerateMeeting = async () => {
    playTapBeep();
    setIsGenerating(true);

    try {
      const generated = await generateLiveMeeting(provider, {
        title: title || 'Session Directe',
        scheduledAt,
        durationMinutes,
        instructorId: 'telecom-master-instructor'
      });

      setMeetingUrl(generated.meetingUrl || '');
      setMeetingId(generated.meetingId || '');
      setPasscode(generated.passcode || '');
      if (generated.jitsiServerDomain) setJitsiServerDomain(generated.jitsiServerDomain);
      if (generated.jitsiRoomName) setJitsiRoomName(generated.jitsiRoomName);
      if (generated.isAutoRecordEnabled !== undefined) setIsAutoRecord(generated.isAutoRecordEnabled);

      playValidationBeep();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();

    const finalConfig: LiveSessionConfig = {
      provider,
      scheduledAt,
      durationMinutes,
      meetingUrl: meetingUrl || `https://konkobo-telecom.daily.co/live-${Date.now().toString().slice(-4)}`,
      meetingId: meetingId || `meet-${Date.now().toString().slice(-4)}`,
      passcode: passcode || 'nana2026',
      jitsiServerDomain: provider === 'JITSI' ? jitsiServerDomain : undefined,
      jitsiRoomName: provider === 'JITSI' ? jitsiRoomName : undefined,
      isAutoRecordEnabled: isAutoRecord,
      autoMarkCompletedOnEnd: autoMarkCompleted
    };

    playValidationBeep();
    onSave(nodeId, title, finalConfig);
    onClose();
  };

  const handleCopyLink = () => {
    if (!meetingUrl) return;
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    playValidationBeep();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto overscroll-contain">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">Configuration de la Session Directe</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    LIVE STREAMING
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Connectez Daily.co, Zoom, Google Meet ou Jitsi Meet à votre cursus
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Titre de la leçon Live */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Titre de la Masterclass / Session Live
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Masterclass Direct : Rapprochement bancaire USSD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none transition"
                required
              />
            </div>

            {/* Sélecteur de Plateforme Fournisseur */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Fournisseur de Visioconférence (Platform Provider)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'DAILY', label: 'Daily.co (Natif)', icon: <Video className="w-3.5 h-3.5 text-emerald-400" /> },
                  { id: 'ZOOM', label: 'Zoom Video', icon: <Video className="w-3.5 h-3.5 text-blue-400" /> },
                  { id: 'GOOGLE_MEET', label: 'Google Meet', icon: <Globe className="w-3.5 h-3.5 text-teal-400" /> },
                  { id: 'JITSI', label: 'Jitsi (Iframe)', icon: <Radio className="w-3.5 h-3.5 text-cyan-400" /> },
                ].map((p) => {
                  const isSelected = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setProvider(p.id as LivePlatformProvider);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {p.icon}
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-xs font-black truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Durée */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Date et Heure Planifiée
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Durée Estimée (Minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={15}
                    max={360}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Bouton Magique : Génération Automatique des Liens */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-black">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>
                    {provider === 'DAILY' || provider === 'JITSI' 
                      ? 'Génération Instantanée Salle Sécurisée' 
                      : `Connexion Compte ${provider}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {provider === 'DAILY'
                    ? "Crée une salle active sur l'infrastructure souveraine Daily.co avec jeton cryptographique."
                    : provider === 'JITSI'
                    ? "Provisionne une salle Jitsi Meet chiffrée de bout en bout sans installation requise."
                    : `Pour ${provider}, collez votre lien de réunion créé depuis votre compte officiel.`}
                </p>
              </div>

              {(provider === 'DAILY' || provider === 'JITSI') && (
                <button
                  type="button"
                  onClick={handleGenerateMeeting}
                  disabled={isGenerating}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Création de la salle...' : 'Créer la Salle Live'}</span>
                </button>
              )}
            </div>

            {/* Détails de la Réunion Générée */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>URL de la Réunion (Meeting URL)</span>
                  {meetingUrl && (
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder={`Lien généré pour ${provider}...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    ID de Réunion (Meeting ID)
                  </label>
                  <input
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="Ex: 849 392 1029"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Code Secret / Passcode
                  </label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Ex: 894021"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {provider === 'JITSI' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Serveur Jitsi
                  </label>
                  <input
                    type="text"
                    value={jitsiServerDomain}
                    onChange={(e) => setJitsiServerDomain(e.target.value)}
                    placeholder="meet.jit.si"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Options additionnelles */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoMarkCompleted}
                  onChange={(e) => setAutoMarkCompleted(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200">
                    Validation Automatique par Webhook
                  </span>
                  <p className="text-[10.5px] text-slate-400">
                    Marque la leçon comme terminée pour les apprenants dès la fin du live.
                  </p>
                </div>
              </label>
            </div>

            {/* Boutons Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer la Session Live</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LiveSessionConfigModal;
