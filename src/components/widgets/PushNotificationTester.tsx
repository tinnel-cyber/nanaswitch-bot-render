import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Crown,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  getOrRegisterFcmToken, 
  triggerNotification, 
  getStoredFcmToken, 
  isPushNotificationSupported,
  onForegroundNotification,
  CLOUDFLARE_WORKER_URL,
  FIREBASE_VAPID_KEY
} from '../../services/PushNotificationService';

interface PushNotificationTesterProps {
  merchantId?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export const PushNotificationTester: React.FC<PushNotificationTesterProps> = ({ 
  merchantId, 
  isPro = true,
  onUpgrade,
  className = '' 
}) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string>('');
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testTitle, setTestTitle] = useState<string>('🚀 Notification NaNa Studio');
  const [testBody, setTestBody] = useState<string>('Votre tunnel Cloudflare Worker -> Firebase FCM v1 est opérationnel !');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: any } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialisation : vérification de compatibilité et token existant
  useEffect(() => {
    async function checkSupport() {
      const supported = await isPushNotificationSupported();
      setIsSupported(supported);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }

      const stored = getStoredFcmToken();
      if (stored) {
        setFcmToken(stored);
      }
    }

    checkSupport();

    // Écoute des notifications reçues pendant que l'écran est actif
    let unsubscribe: (() => void) | null = null;
    onForegroundNotification((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Notification reçue !';
      const body = payload.notification?.body || payload.data?.body || '';
      setStatusMessage({
        type: 'success',
        text: `🎉 Message reçu en direct (Foreground) : "${title}"`,
        details: body
      });
    }).then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Étape 1 : Obtenir le Jeton FCM du navigateur avec la clé VAPID
  const handleGetToken = async () => {
    setIsTokenLoading(true);
    setStatusMessage(null);
    try {
      const token = await getOrRegisterFcmToken({ 
        merchantId,
        vapidKey: FIREBASE_VAPID_KEY
      });
      if (token) {
        setFcmToken(token);
        setPermission(Notification.permission);
        setStatusMessage({
          type: 'success',
          text: '✅ Jeton FCM obtenu avec la clé VAPID et enregistré dans le navigateur !'
        });
      }
    } catch (err: any) {
      console.error('Erreur Token :', err);
      setStatusMessage({
        type: 'error',
        text: `❌ Échec d'obtention du token : ${err.message || err}`
      });
    } finally {
      setIsTokenLoading(false);
    }
  };

  // Étape 2 : Envoyer la notification via le Cloudflare Worker
  const handleSendTestNotification = async () => {
    if (!fcmToken) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez d’abord générer ou récupérer votre jeton FCM ci-dessus.'
      });
      return;
    }

    setIsSending(true);
    setStatusMessage({
      type: 'info',
      text: 'Transmission de la requête au Cloudflare Worker...'
    });

    try {
      const res = await triggerNotification(fcmToken, testTitle, testBody, {
        source: 'NaNaStudioTester',
        timestamp: String(Date.now()),
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '🚀 Notification transmise avec succès au Cloudflare Worker ! Elle doit s’afficher sur votre écran dans un instant.',
          details: res.data
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Échec de l’envoi : ${res.error}`,
          details: res.data
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Erreur inattendue : ${err.message || err}`
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToken = () => {
    if (!fcmToken) return;
    navigator.clipboard.writeText(fcmToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSupported === false) {
    return (
      <div className={`p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3 ${className}`}>
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-200">Push Notifications non prises en charge</p>
          <p className="text-xs text-amber-300/80 mt-1">
            Votre navigateur ne supporte pas le standard Web Push ou est dans un environnement restreint (ex. navigation privée stricte).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Test Push Notifications (Cloudflare FCM)
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HTTP v1
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Validez la chaîne complète : Webapp &rarr; Cloudflare Worker &rarr; Google FCM &rarr; Écran
            </p>
          </div>
        </div>

        {/* Indicateur de permission */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Permission :</span>
          <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
            permission === 'granted'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : permission === 'denied'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {permission === 'granted' ? 'Autorisée' : permission === 'denied' ? 'Refusée' : 'Non demandée'}
          </span>
        </div>
      </div>

      {/* Endpoint Worker & Clé VAPID */}
      <div className="mt-4 space-y-2">
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="truncate max-w-[85%]">{CLOUDFLARE_WORKER_URL}</span>
          <a 
            href={CLOUDFLARE_WORKER_URL} 
            target="_blank" 
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-sans"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
          <span className="font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Certificat Web Push (VAPID) :
          </span>
          <span className="font-mono text-[10px] bg-slate-950/80 px-2 py-0.5 rounded text-indigo-200 border border-indigo-500/30 truncate max-w-[200px]" title={FIREBASE_VAPID_KEY}>
            {FIREBASE_VAPID_KEY.slice(0, 12)}...{FIREBASE_VAPID_KEY.slice(-6)}
          </span>
        </div>
      </div>

      {/* Bannière de verrouillage si forfait Gratuit */}
      {!isPro && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Fonctionnalité exclusive au Plan PRO
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Recevez des alertes sonores et visuelles instantanées à chaque commande en passant au forfait Pro.
              </p>
            </div>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              type="button"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Passer au Plan Pro
            </button>
          )}
        </div>
      )}

      {/* Bloc Jeton FCM */}
      <div className={`mt-4 space-y-2 ${!isPro ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            Jeton FCM de l'appareil
          </label>
          {fcmToken && (
            <button
              onClick={handleCopyToken}
              type="button"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          )}
        </div>

        {fcmToken ? (
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all select-all max-h-16 overflow-y-auto">
            {fcmToken}
          </div>
        ) : (
          <div className="p-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
            <p className="text-xs text-slate-400">Aucun jeton FCM actif sur cette session.</p>
          </div>
        )}

        <button
          onClick={handleGetToken}
          disabled={!isPro || isTokenLoading}
          type="button"
          className={`w-full mt-2 py-2.5 px-4 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            !isPro
              ? 'bg-slate-800/50 border-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 cursor-pointer'
          }`}
        >
          {!isPro ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-400/70" />
              Verrouillé (Réservé au Plan Pro)
            </>
          ) : isTokenLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Génération du token FCM...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              {fcmToken ? 'Rafraîchir mon Jeton FCM' : '1. Demander Permission & Obtenir Jeton FCM'}
            </>
          )}
        </button>
      </div>

      {/* Champs de test de la notification */}
      <div className={`mt-5 space-y-3 pt-4 border-t border-slate-800/80 ${!isPro ? 'opacity-60 pointer-events-none' : ''}`}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Titre de la notification
          </label>
          <input
            type="text"
            disabled={!isPro}
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Ex : Nouvelle commande reçue !"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Corps du message
          </label>
          <textarea
            rows={2}
            disabled={!isPro}
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder="Ex : Le client Moussa a commandé le pack Pro."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Bouton d'action principal */}
        <button
          onClick={handleSendTestNotification}
          disabled={!isPro || isSending || !fcmToken}
          type="button"
          className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
            !isPro
              ? 'bg-slate-800 border border-slate-700/80 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {!isPro ? (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              Passer au Plan Pro pour tester les notifications
            </>
          ) : isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Envoi en cours vers Cloudflare...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Tester les notifications (Envoi direct)
            </>
          )}
        </button>
      </div>

      {/* Résultat / Feedback */}
      {statusMessage && (
        <div className={`mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          ) : (
            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-indigo-400 mt-0.5" />
          )}
          <div className="space-y-1 overflow-hidden">
            <p className="font-medium break-words">{statusMessage.text}</p>
            {statusMessage.details && (
              <pre className="text-[10px] bg-black/40 p-1.5 rounded-lg overflow-x-auto text-slate-300 font-mono mt-1">
                {typeof statusMessage.details === 'object' 
                  ? JSON.stringify(statusMessage.details, null, 2) 
                  : String(statusMessage.details)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Note d'aide discrète */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Authentification Google v1 sécurisée (RS256 sans module Node).</span>
      </div>
    </div>
  );
};

export default PushNotificationTester;
