/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Portail d'Authentification Dédié (/nana-switch/auth)
 * Routeur & SaaS Cloud Intelligent d'API
 * 
 * Architecture d'Isolation Zero-Trust :
 * - Totalement séparé de la connexion boutique Nanasore (/login, /register).
 * - N'écrit JAMAIS dans la collection `stores/` !
 * - Crée et authentifie exclusivement dans la collection `switch_accounts/{uid}`.
 * - Initialise automatiquement le portefeuille `switch_wallets/{uid}` avec 100 crédits Sandbox offerts.
 * - Gère intelligemment la rétrocompatibilité si un compte Firebase Auth existe déjà.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Building2, 
  User, 
  Phone, 
  Globe, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Server, 
  Layers, 
  Check, 
  Eye, 
  EyeOff, 
  Loader2,
  ChevronLeft,
  KeyRound
} from 'lucide-react';
import { loginWithEmail, registerWithEmail, signInWithGoogle } from '../../../services/supabaseAuthService';
import { supabase } from '../../../lib/supabase';
import { auth, db } from '../../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  User as SupabaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { hashPin } from '../../../utils/nanaSwitchPinCrypto';
import { NaNaSwitchLogo } from '../components/NaNaSwitchLogo';

export interface NaNaSwitchAuthPageProps {
  onNavigate?: (path: string) => void;
  defaultTab?: 'register' | 'login';
}

type AuthTab = 'register' | 'login';
type ProfileType = 'developer' | 'business' | 'agency';

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'INT', name: 'International / Diaspora', flag: '🌍' }
];

export const NaNaSwitchAuthPage: React.FC<NaNaSwitchAuthPageProps> = ({
  onNavigate,
  defaultTab = 'register'
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);

  // Formulaire d'inscription
  const [orgName, setOrgName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [profileType, setProfileType] = useState<ProfileType>('developer');
  const [country, setCountry] = useState<string>('BF');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Code PIN de Sécurité (4 chiffres hachés en SHA-256)
  const [securityPin, setSecurityPin] = useState<string>('');
  const [confirmSecurityPin, setConfirmSecurityPin] = useState<string>('');
  const [activationPin, setActivationPin] = useState<string>('');

  // Formulaire de connexion
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Écran d'initialisation en 1-clic (si le compte Firebase existe déjà sans switch_account)
  const [needsActivation, setNeedsActivation] = useState<boolean>(false);
  const [pendingSupabaseUser, setPendingSupabaseUser] = useState<SupabaseUser | null>(null);
  const [activationOrgName, setActivationOrgName] = useState<string>('');
  const [activationProfileType, setActivationProfileType] = useState<ProfileType>('developer');

  // États de chargement et retours d'information
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Lecture de la notice de redirection éventuelle (gardien)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const notice = sessionStorage.getItem('nanaswitch_auth_notice');
      if (notice) {
        setNoticeMessage(notice);
        // Supprimer la notice après lecture
        sessionStorage.removeItem('nanaswitch_auth_notice');
      }
    }
  }, []);

  // Nettoyage des erreurs au changement d'onglet
  const handleTabChange = useCallback((tab: AuthTab) => {
    playTapBeep();
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // Redirection réussie vers le Cockpit
  const redirectToOverview = useCallback(() => {
    playValidationBeep();
    if (onNavigate) {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('nanaswitch_auth_redirect') : null;
      if (typeof window !== 'undefined') sessionStorage.removeItem('nanaswitch_auth_redirect');
      onNavigate(saved || '/nana-switch/connectors');
    } else if (typeof window !== 'undefined') {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('nanaswitch_auth_redirect') : null;
      if (typeof window !== 'undefined') sessionStorage.removeItem('nanaswitch_auth_redirect');
      window.location.href = saved || '/nana-switch/connectors';
    }
  }, [onNavigate]);

  // =========================================================================
  // 2. LOGIQUE D'INITIALISATION DE switch_accounts/{uid} (100 Crédits)
  // =========================================================================

  const initializeSwitchAccountDocument = useCallback(async (
    uid: string,
    userEmail: string,
    org: string,
    contact: string,
    phone: string,
    profile: ProfileType,
    userCountry: string,
    pin?: string
  ) => {
    const switchTenantId = `sw_${uid.slice(0, 10)}`;
    const nowIso = new Date().toISOString();

    let pinHash: string | undefined = undefined;
    if (pin && pin.trim().length === 4) {
      pinHash = await hashPin(pin.trim());
    }

    // 1. Profil de compte isolé switch_accounts/{uid}
    const accountRef = doc(db, 'switch_accounts', uid);
    const accountPayload: any = {
      uid,
      email: userEmail,
      organizationName: org || 'Organisation Cloud',
      contactName: contact || 'Développeur Cloud',
      whatsapp: phone || '',
      profileType: profile,
      country: userCountry || 'BF',
      switchTenantId,
      accountType: 'nana_switch_cloud_only',
      role: 'owner',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    if (pinHash) {
      accountPayload.pinHash = pinHash;
    }
    await setDoc(accountRef, accountPayload, { merge: true });

    // 2. Portefeuille isolé switch_wallets/{uid} avec 100 crédits Sandbox offerts
    const walletRef = doc(db, 'switch_wallets', uid);
    const walletSnap = await getDoc(walletRef);
    if (!walletSnap.exists()) {
      await setDoc(walletRef, {
        userId: uid,
        tenantId: switchTenantId,
        credits: 100,
        plan: 'sandbox_trial',
        updatedAt: nowIso,
        history: [
          {
            id: `bonus_welcome_${Date.now()}`,
            amount: 100,
            type: 'BONUS',
            description: '🎁 100 Crédits d\'essai Sandbox offerts à l\'inscription',
            date: nowIso
          }
        ]
      });
    }

    // 3. Clé API initiale par défaut dans switch_api_keys
    const sampleKeyId = `key_${uid.slice(0, 8)}_live`;
    const keyRef = doc(db, 'switch_api_keys', sampleKeyId);
    const keySnap = await getDoc(keyRef);
    if (!keySnap.exists()) {
      await setDoc(keyRef, {
        keyId: sampleKeyId,
        userId: uid,
        tenantId: switchTenantId,
        name: 'Clé Cloud Principale',
        secretKey: `nana_sw_live_${uid.slice(0, 6)}8f2a`,
        status: 'ACTIVE',
        scope: 'FULL_ROUTING',
        ipWhitelist: ['*'],
        createdAt: nowIso
      });
    }

    return switchTenantId;
  }, []);

  // =========================================================================
  // 3. ACTION : INSCRIPTION ISOLÉE (ONGLET A)
  // =========================================================================

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!orgName.trim()) {
      setErrorMessage('Veuillez renseigner le nom de votre Organisation ou Projet.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMessage('Veuillez renseigner le nom du Responsable ou Développeur.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Veuillez fournir une adresse e-mail professionnelle valide.');
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    // Validation du Code PIN à 4 chiffres
    const cleanPin = securityPin.trim();
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setErrorMessage('Veuillez définir un Code PIN de Sécurité Cloud composé de 4 chiffres (ex: 1234).');
      return;
    }
    if (cleanPin !== confirmSecurityPin.trim()) {
      setErrorMessage('Les deux Codes PIN saisis ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      let registeredUser: SupabaseUser | null = null;

      try {
        // Tentative de création du compte Firebase Auth
        const supaUser = await registerWithEmail(cleanEmail, cleanPassword, orgName);
        registeredUser = supaUser as any;
      } catch (authErr: any) {
        // Gestion intelligente si l'e-mail existe déjà sur Firebase Auth (ex: utilisateur ayant un compte Nanasore)
        if (authErr?.code === 'auth/email-already-in-use') {
          try {
            // On vérifie le mot de passe fourni pour lier l'organisation
            const loginUser = await loginWithEmail(cleanEmail, cleanPassword);
            registeredUser = loginUser as any;
          } catch (loginErr: any) {
            setErrorMessage(
              'Cette adresse e-mail existe déjà dans notre système. Veuillez entrer le mot de passe exact correspondant à cet e-mail pour activer votre espace NaNaSwitch Cloud.'
            );
            setIsLoading(false);
            return;
          }
        } else {
          throw authErr;
        }
      }

      if (!registeredUser) {
        throw new Error('Impossible d\'initialiser l\'utilisateur.');
      }

      // Initialiser le document isolé switch_accounts/{uid} avec le pinHash (sans toucher à stores/)
      await initializeSwitchAccountDocument(
        registeredUser.uid,
        cleanEmail,
        orgName.trim(),
        contactName.trim(),
        whatsapp.trim(),
        profileType,
        country,
        cleanPin
      );

      setSuccessMessage('Compte Cloud créé avec succès ! Initialisation du Cockpit...');
      setTimeout(() => {
        redirectToOverview();
      }, 1200);

    } catch (err: any) {
      console.error('[NANA_SWITCH_REGISTER_ERROR]', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de la création du compte Cloud.');
    } finally {
      setIsLoading(false);
    }
  }, [
    email,
    password,
    orgName,
    contactName,
    whatsapp,
    profileType,
    country,
    securityPin,
    confirmSecurityPin,
    initializeSwitchAccountDocument,
    redirectToOverview
  ]);

  // =========================================================================
  // 4. ACTION : CONNEXION CONSOLE (ONGLET B)
  // =========================================================================

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }

    setIsLoading(true);

    try {
      const user: any = await loginWithEmail(cleanEmail, cleanPassword);

      // Vérifier si le compte possède un espace switch_accounts/{uid}
      const accountRef = doc(db, 'switch_accounts', user.uid);
      const snap = await getDoc(accountRef);

      if (snap.exists()) {
        // Compte Cloud existant et valide
        setSuccessMessage('Authentification réussie ! Accès au Nœud Cloud...');
        setTimeout(() => {
          redirectToOverview();
        }, 1000);
      } else {
        // L'utilisateur est connecté à Firebase mais n'a pas encore de profil d'organisation NaNaSwitch Cloud
        setPendingSupabaseUser(user);
        setActivationOrgName(user.displayName || 'Mon Organisation Cloud');
        setNeedsActivation(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[NANA_SWITCH_LOGIN_ERROR]', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        setErrorMessage('Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.');
      } else {
        setErrorMessage(err?.message || 'Erreur lors de la connexion à la console Cloud.');
      }
      setIsLoading(false);
    }
  }, [loginEmail, loginPassword, redirectToOverview]);

  // =========================================================================
  // 5. ACTION : CONNEXION VIA GOOGLE SSO CLOUD
  // =========================================================================

  const handleGoogleAuth = useCallback(async () => {
    playTapBeep();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user: any = await signInWithGoogle();

      // Vérifier si switch_accounts/{uid} existe
      const accountRef = doc(db, 'switch_accounts', user.uid);
      const snap = await getDoc(accountRef);

      if (snap.exists()) {
        setSuccessMessage('Connexion Google réussie ! Accès au Cockpit...');
        setTimeout(() => {
          redirectToOverview();
        }, 1000);
      } else {
        // Demander l'initialisation de son organisation Cloud
        setPendingSupabaseUser(user);
        setActivationOrgName(user.displayName ? `${user.displayName} Cloud` : 'Organisation Cloud');
        setNeedsActivation(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[NANA_SWITCH_GOOGLE_AUTH_ERROR]', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage('Échec de la connexion via Google. Veuillez réessayer.');
      }
      setIsLoading(false);
    }
  }, [redirectToOverview]);

  // =========================================================================
  // 6. ACTION : ACTIVATION EN 1-CLIC D'ORGANISATION POUR COMPTE EXISTANT
  // =========================================================================

  const handleActivateExistingAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    if (!pendingSupabaseUser) return;

    if (!activationOrgName.trim()) {
      setErrorMessage('Veuillez renseigner le nom de votre Organisation.');
      return;
    }

    const cleanActPin = activationPin.trim();
    if (!cleanActPin || cleanActPin.length !== 4 || !/^\d{4}$/.test(cleanActPin)) {
      setErrorMessage('Veuillez définir votre Code PIN de Sécurité à 4 chiffres (ex: 1234).');
      return;
    }

    setIsLoading(true);
    try {
      await initializeSwitchAccountDocument(
        pendingSupabaseUser.uid,
        pendingSupabaseUser.email || '',
        activationOrgName.trim(),
        pendingSupabaseUser.displayName || 'Développeur Cloud',
        pendingSupabaseUser.phoneNumber || '',
        activationProfileType,
        'BF',
        cleanActPin
      );

      setSuccessMessage('Organisation Cloud initialisée avec 100 crédits d\'essai ! Redirection...');
      setTimeout(() => {
        redirectToOverview();
      }, 1200);
    } catch (err: any) {
      console.error('[NANA_SWITCH_ACTIVATION_ERROR]', err);
      setErrorMessage('Erreur lors de l\'activation de votre organisation Cloud.');
    } finally {
      setIsLoading(false);
    }
  }, [
    pendingSupabaseUser,
    activationOrgName,
    activationProfileType,
    activationPin,
    initializeSwitchAccountDocument,
    redirectToOverview
  ]);

  // =========================================================================
  // 7. RENDU VISUEL DE LA PAGE D'AUTHENTIFICATION (2 COLONNES DESKTOP)
  // =========================================================================

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-10 selection:bg-blue-600 selection:text-white">
      {/* Conteneur Principal en Carte Blanche & Sombre */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* =================================================================== */}
        {/* COLONNE GAUCHE (5/12) : IDENTITÉ CLOUD & SÉCURITÉ ZERO-TRUST         */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Halos lumineux d'arrière-plan */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* En-tête de Marque */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <NaNaSwitchLogo variant="full" size="md" theme="dark" />

              {/* Bouton retour vers Landing Page */}
              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('/nana-switch') : window.location.href = '/nana-switch'}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Retour à la présentation"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Vitrine</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-[11px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Portail Zero-Trust Dédié</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                L'Infrastructure de Routage API Multi-Pays
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Connectez vos applications, sites web et tontines aux passerelles mobiles d'Afrique de l'Ouest avec bascule automatique 0ms.
              </p>
            </div>

            {/* Badges de Sécurité & Engagements Techniques */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 p-2.5 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-black">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-extrabold">Cloisonnement Strict</strong>
                  <span className="text-blue-200 text-[11px]">Compte 100% indépendant, sans boutique commerciale</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 p-2.5 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center flex-shrink-0 font-black">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-extrabold">Chiffrement AES-256 Volatile</strong>
                  <span className="text-blue-200 text-[11px]">Vos clés secrètes protégées en transit et au repos</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 p-2.5 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0 font-black">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-extrabold">100 Crédits Sandbox Offerts</strong>
                  <span className="text-blue-200 text-[11px]">Crédités dès la création pour tester vos premiers aiguillages</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pied de Carte Gauche : IP Fixe & SLA */}
          <div className="pt-6 border-t border-white/15 relative z-10 flex items-center justify-between text-[11px] text-blue-200">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>IP Fixe Cloud : 194.163.148.22</span>
            </div>
            <span className="font-mono font-bold text-emerald-300">99.98% SLA</span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLONNE DROITE (7/12) : FORMULAIRE EN BLANC PUR & BLEU ROYAL        */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white overflow-y-auto">
          
          <div>
            {/* Notice d'alerte Garde-Frontière (si redirection) */}
            {noticeMessage && (
              <div className="mb-6 bg-blue-50 border-2 border-blue-600 rounded-2xl p-4 flex items-start gap-3 animate-slideDown shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-900 leading-relaxed font-semibold">
                  {noticeMessage}
                </div>
              </div>
            )}

            {/* Message d'Erreur */}
            {errorMessage && (
              <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Message de Succès */}
            {successMessage && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* ÉCRAN D'ACTIVATION EN 1-CLIC SI COMPTE FIREBASE EXISTANT SANS switch_accounts */}
            {needsActivation ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    <span>Dernière Étape</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Activer votre Organisation NaNaSwitch Cloud
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Votre session est reconnue (<strong className="text-slate-800">{pendingSupabaseUser?.email}</strong>). Veuillez simplement nommer votre espace d'infrastructure Cloud pour initialiser votre portefeuille de 100 crédits Sandbox isolés.
                  </p>
                </div>

                <form onSubmit={handleActivateExistingAccount} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                      Nom de votre Organisation / Projet Cloud :
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={activationOrgName}
                        onChange={(e) => setActivationOrgName(e.target.value)}
                        placeholder="Ex: Kora API, FasoTech Infrastructure"
                        className="w-full bg-slate-50 border-2 border-blue-200 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition pl-10"
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                      Votre Profil d'Utilisation :
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActivationProfileType('developer')}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          activationProfileType === 'developer'
                            ? 'bg-blue-600 text-white border-blue-600 font-black shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold text-xs'
                        }`}
                      >
                        <div className="text-xs">👨‍💻 Développeur</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationProfileType('business')}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          activationProfileType === 'business'
                            ? 'bg-blue-600 text-white border-blue-600 font-black shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold text-xs'
                        }`}
                      >
                        <div className="text-xs">🏢 Entreprise</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationProfileType('agency')}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          activationProfileType === 'agency'
                            ? 'bg-blue-600 text-white border-blue-600 font-black shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold text-xs'
                        }`}
                      >
                        <div className="text-xs">🏦 Agence</div>
                      </button>
                    </div>
                  </div>

                  {/* Code PIN de Sécurité (4 chiffres) */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5 text-left">
                    <label className="text-[11px] font-extrabold uppercase text-blue-900 block flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <span>Définir votre Code PIN de Sécurité (4 chiffres) *</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        inputMode="numeric"
                        required
                        value={activationPin}
                        onChange={(e) => setActivationPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full bg-white border-2 border-blue-300 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-center text-base font-mono tracking-widest font-black text-slate-900 outline-none transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      🔒 Ce code PIN à 4 chiffres (haché en SHA-256) protégera l'accès à vos clés secrètes et connecteurs.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-white" />
                        <span>Activer mon Compte Cloud & Recevoir 100 Crédits</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setNeedsActivation(false); setPendingSupabaseUser(null); }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-bold py-1"
                  >
                    Utiliser un autre compte
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* SÉLECTEUR DES 2 ONGLETS AUTHENTIFICATION */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => handleTabChange('register')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'register'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Créer mon Compte Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'login'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Connexion Console</span>
                  </button>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* ONGLET A : INSCRIPTION ISOLÉE                               */}
                {/* ----------------------------------------------------------- */}
                {activeTab === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
                    
                    {/* Nom de l'Organisation & Nom du Responsable */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          Organisation / Projet Cloud *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="ex: FasoTech API"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition pl-9"
                          />
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          Nom & Prénom du Responsable *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="ex: Moussa Traoré"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition pl-9"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* E-mail Professionnel & WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          E-mail Professionnel *
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="dev@organisation.com"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none transition pl-9"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          Numéro WhatsApp (Alertes Sécu)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="+226 70 00 00 00"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none transition pl-9"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* Profil d'utilisation & Pays */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          Profil d'Utilisation
                        </label>
                        <select
                          value={profileType}
                          onChange={(e) => setProfileType(e.target.value as ProfileType)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition"
                        >
                          <option value="developer">👨‍💻 Développeur / Intégrateur API</option>
                          <option value="business">🏢 Entreprise / E-Commerce</option>
                          <option value="agency">🏦 Agence Multi-Projets</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                          Zone / Pays Principal
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition"
                        >
                          {COUNTRY_OPTIONS.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                        Mot de Passe Sécurisé *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Au moins 6 caractères"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition pl-9 pr-10"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Code PIN de Sécurité (4 Chiffres) & Confirmation */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase text-blue-900 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>Code PIN de Sécurité Cloud (4 chiffres) *</span>
                        </label>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          🔒 SHA-256
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <input
                            type="password"
                            maxLength={4}
                            pattern="\d{4}"
                            inputMode="numeric"
                            required
                            value={securityPin}
                            onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="PIN (4 chiffres)"
                            className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest font-black text-slate-900 outline-none transition shadow-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            maxLength={4}
                            pattern="\d{4}"
                            inputMode="numeric"
                            required
                            value={confirmSecurityPin}
                            onChange={(e) => setConfirmSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="Confirmer le PIN"
                            className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest font-black text-slate-900 outline-none transition shadow-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Ce code confidentiel à 4 chiffres protégera vos clés API secrètes, vos connecteurs et vos règles de routage.
                      </p>
                    </div>

                    {/* Bouton de Soumission Inscription */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Créer mon Compte Cloud & Recevoir 100 Crédits</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ----------------------------------------------------------- */}
                {/* ONGLET B : CONNEXION CONSOLE                                */}
                {/* ----------------------------------------------------------- */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                        Adresse E-mail Professionnelle :
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="dev@organisation.com"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none transition pl-9"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-slate-700 block mb-1">
                        Mot de Passe Cloud :
                      </label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Votre mot de passe"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none transition pl-9 pr-10"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Entrer dans la Console NaNaSwitch Cloud</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Séparateur OU */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400">
                    <span className="bg-white px-2">Ou Authentification SSO</span>
                  </div>
                </div>

                {/* Bouton Google Cloud SSO */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleAuth}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuer avec Google SSO</span>
                </button>
              </>
            )}
          </div>

          {/* Pied de Page Formulaire */}
          <div className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-500 space-y-1">
            <p>
              Espace sécurisé par le protocole d'infrastructure <strong>NaNaSwitch Cloud Zero-Trust</strong>.
            </p>
            <p className="text-[10px] text-slate-400">
              Chiffrement de bout en bout • Vos transactions et clés sont strictement isolées.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NaNaSwitchAuthPage;
