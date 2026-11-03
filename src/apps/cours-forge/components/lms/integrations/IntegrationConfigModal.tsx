import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Server, 
  Key, 
  Lock, 
  Video, 
  Globe, 
  Radio, 
  BookOpen, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { IntegrationProvider, InstructorIntegrationConfig } from '../../../../../types';
import { testIntegrationConnection, saveInstructorIntegration, disconnectInstructorIntegration } from '../../../../../services/externalIntegrationsService';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface IntegrationConfigModalProps {
  isOpen: boolean;
  provider: IntegrationProvider;
  currentConfig?: InstructorIntegrationConfig;
  instructorId?: string;
  onClose: () => void;
  onSaveSuccess: (updated: InstructorIntegrationConfig) => void;
  onDisconnectSuccess: (provider: IntegrationProvider) => void;
}

export const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  isOpen,
  provider,
  currentConfig,
  instructorId = 'instructor-default',
  onClose,
  onSaveSuccess,
  onDisconnectSuccess
}) => {
  const [clientId, setClientId] = useState(currentConfig?.clientId || currentConfig?.googleClientId || '');
  const [clientSecret, setClientSecret] = useState(currentConfig?.clientSecret || currentConfig?.googleClientSecret || '');
  const [accountId, setAccountId] = useState(currentConfig?.accountId || '');
  const [serverDomain, setServerDomain] = useState(currentConfig?.serverDomain || 'meet.jit.si');
  const [roomPrefix, setRoomPrefix] = useState(currentConfig?.roomPrefix || 'nana-academy');
  const [jwtSecret, setJwtSecret] = useState(currentConfig?.jwtSecret || '');
  const [autoRecord, setAutoRecord] = useState(currentConfig?.autoRecord ?? true);
  const [autoClassroom, setAutoClassroom] = useState(currentConfig?.autoCreateClassroomAssignment ?? false);
  const [accountEmail, setAccountEmail] = useState(currentConfig?.accountEmail || '');

  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  if (!isOpen) return null;

  const isConnected = currentConfig?.status === 'CONNECTED';

  // Métadonnées d'en-tête selon le fournisseur
  const getProviderMeta = () => {
    switch (provider) {
      case 'ZOOM':
        return {
          title: 'Intégration Zoom Video API',
          subtitle: 'Planification automatique de réunions & synchronisation Cloud',
          badge: 'OAuth 2.0 & Server-to-Server',
          color: 'from-blue-600 to-indigo-600',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-400',
          icon: <Video className="w-5 h-5 text-blue-400" />
        };
      case 'JITSI':
        return {
          title: 'Configuration Jitsi Meet',
          subtitle: 'Visioconférence open-source intégrée sans redirection',
          badge: 'Iframe API Native',
          color: 'from-cyan-600 to-blue-600',
          borderColor: 'border-cyan-500/40',
          textColor: 'text-cyan-400',
          icon: <Radio className="w-5 h-5 text-cyan-400" />
        };
      case 'GOOGLE_MEET':
        return {
          title: 'Connecteur Google Meet',
          subtitle: 'Espaces de visioconférence Google Workspace & Calendar',
          badge: 'Google Meet API',
          color: 'from-emerald-600 to-teal-600',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-400',
          icon: <Globe className="w-5 h-5 text-emerald-400" />
        };
      case 'GOOGLE_CLASSROOM':
        return {
          title: 'Google Classroom Sync',
          subtitle: 'Synchronisation des cours, devoirs et promotions d\'élèves',
          badge: 'Classroom API v1',
          color: 'from-amber-600 to-orange-600',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-400',
          icon: <BookOpen className="w-5 h-5 text-amber-400" />
        };
    }
  };

  const meta = getProviderMeta();
  const webhookUrl = 'https://europe-west1-konkobo-telecom.cloudfunctions.net/onZoomWebhook';

  const handleTestConnection = async () => {
    playTapBeep();
    setIsTesting(true);
    setTestResult(null);

    const partialConfig: Partial<InstructorIntegrationConfig> = {
      provider,
      clientId,
      clientSecret,
      accountId,
      serverDomain,
      jwtSecret,
      autoRecord
    };

    const res = await testIntegrationConnection(provider, partialConfig);
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      playValidationBeep();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setIsSaving(true);

    const updatedConfig: InstructorIntegrationConfig = {
      provider,
      status: 'CONNECTED',
      accountEmail: accountEmail || (provider === 'ZOOM' ? 'instructeur@telecom-pousbila.bf' : 'instructeur@gmail.com'),
      accountName: currentConfig?.accountName || `${meta.title} (${provider})`,
      clientId: provider === 'ZOOM' ? clientId : undefined,
      clientSecret: provider === 'ZOOM' ? clientSecret : undefined,
      accountId: provider === 'ZOOM' ? accountId : undefined,
      autoRecord: provider === 'ZOOM' ? autoRecord : undefined,
      serverDomain: provider === 'JITSI' ? serverDomain : undefined,
      roomPrefix: provider === 'JITSI' ? roomPrefix : undefined,
      jwtSecret: provider === 'JITSI' ? jwtSecret : undefined,
      googleClientId: (provider === 'GOOGLE_MEET' || provider === 'GOOGLE_CLASSROOM') ? clientId : undefined,
      googleClientSecret: (provider === 'GOOGLE_MEET' || provider === 'GOOGLE_CLASSROOM') ? clientSecret : undefined,
      autoCreateClassroomAssignment: provider === 'GOOGLE_CLASSROOM' ? autoClassroom : undefined
    };

    await saveInstructorIntegration(instructorId, updatedConfig);
    setIsSaving(false);
    playValidationBeep();
    onSaveSuccess(updatedConfig);
    onClose();
  };

  const handleDisconnect = async () => {
    if (!window.confirm(`Confirmez-vous la déconnexion de l'intégration ${meta.title} ?`)) return;
    playTapBeep();
    await disconnectInstructorIntegration(instructorId, provider);
    onDisconnectSuccess(provider);
    onClose();
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    playValidationBeep();
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto overscroll-contain">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header Cyber-Premium */}
          <div className="px-6 py-5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${meta.color} flex items-center justify-center text-white shadow-lg shadow-blue-500/20`}>
                {meta.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">{meta.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
                    {meta.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{meta.subtitle}</p>
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

          {/* Formulaire de configuration */}
          <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Statut actuel */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-xs font-bold text-slate-200">
                  {isConnected ? 'Connecteur Actif & Synchronisé' : 'Non Connecté / Hors-Ligne'}
                </span>
              </div>
              {isConnected && currentConfig?.lastSyncAt && (
                <span className="text-[10.5px] text-slate-500">
                  Dernier ping : {new Date(currentConfig.lastSyncAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* FORMULAIRE ZOOM */}
            {provider === 'ZOOM' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Zoom Account ID
                  </label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Ex: acc_zm_bf_2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Client ID (OAuth 2.0 / Server-to-Server)
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Ex: zm_client_uemoa_88921"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Client Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Collez votre Secret Key Zoom"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-blue-200">Enregistrement Cloud Automatique</span>
                    <p className="text-[11px] text-slate-400">
                      Enregistre chaque masterclass sur le Cloud Zoom pour replay étudiant
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRecord}
                    onChange={(e) => setAutoRecord(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 cursor-pointer"
                  />
                </div>

                {/* Webhook Endpoint */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                    <span>URL Webhook Zoom (Validation de Présence & Auto-Finish)</span>
                    <button
                      type="button"
                      onClick={copyWebhook}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 truncate">
                    {webhookUrl}
                  </div>
                </div>
              </div>
            )}

            {/* FORMULAIRE JITSI */}
            {provider === 'JITSI' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nom de Domaine du Serveur Jitsi Meet
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serverDomain}
                      onChange={(e) => setServerDomain(e.target.value)}
                      placeholder="meet.jit.si ou votre instance privée (ex: jitsi.telecom-pousbila.bf)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Par défaut : <code>meet.jit.si</code> (gratuit, sans limite). Compatible serveur auto-hébergé.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Préfixe des Salles de Cours
                  </label>
                  <input
                    type="text"
                    value={roomPrefix}
                    onChange={(e) => setRoomPrefix(e.target.value)}
                    placeholder="nana-academy"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    JWT Secret (Optionnel pour serveurs sécurisés token-based)
                  </label>
                  <input
                    type="password"
                    value={jwtSecret}
                    onChange={(e) => setJwtSecret(e.target.value)}
                    placeholder="Laissez vide pour le serveur public meet.jit.si"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    <strong>Iframe Native Sans Redirection :</strong> Contrairement à Zoom, Jitsi s'intègre directement au lecteur de classe du Campus Virtuel sans faire sortir les étudiants de la plateforme.
                  </p>
                </div>
              </div>
            )}

            {/* FORMULAIRE GOOGLE MEET */}
            {provider === 'GOOGLE_MEET' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Email de compte Google Workspace
                  </label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="instructeur@entreprise-konkobo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Génère instantanément des codes de réunion Google Meet uniques (`xxx-yyyy-zzz`) et les rattache aux séances de coaching en direct.
                  </p>
                </div>
              </div>
            )}

            {/* FORMULAIRE GOOGLE CLASSROOM */}
            {provider === 'GOOGLE_CLASSROOM' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Google Classroom OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="classroom.google.com client ID"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none transition"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-200">Publication Automatique des Devoirs</span>
                    <p className="text-[11px] text-slate-400">
                      Crée les devoirs notés sur Google Classroom en même temps que sur NaNa
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoClassroom}
                    onChange={(e) => setAutoClassroom(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Résultats du Test de Connexion */}
            {testResult && (
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${
                testResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
                <span className="text-[10px] font-mono opacity-70">
                  {testResult.latencyMs}ms
                </span>
              </div>
            )}

            {/* Actions du footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{isTesting ? 'Test en cours...' : 'Tester la connexion'}</span>
                </button>

                {isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Déconnecter cette intégration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2 rounded-xl bg-gradient-to-r ${meta.color} hover:opacity-95 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer & Activer'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IntegrationConfigModal;
