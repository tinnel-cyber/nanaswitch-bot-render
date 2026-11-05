import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreUser, UserRole, PlatformLegalConfig } from '../../types';
import { playCashChime, playValidationBeep, playTapBeep, playCancelSound } from '../../utils/audio';
import { 
  loginWithEmail, 
  registerWithEmail, 
  resendVerificationEmail, 
  signInWithGoogle, 
  resetPasswordEmail,
  auth,
  logoutUser
} from '../../firebase';
import { saveUserProfile, getUserProfile, subscribeToPlatformLegal, DEFAULT_PLATFORM_LEGAL } from '../../utils/firestoreService';
import { hashMasterPin, generateStoreUniqueId } from '../../utils/managerSecurityService';
import { syncAuthProfileWithSupabase } from '../../services/authProfileSyncService';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import { NanasoreLogo } from '../../components/common/NanasoreLogo';
import { 
  ShieldCheck, 
  Rocket,
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  KeyRound,
  Zap,
  Lock,
  Mail,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  CreditCard,
  Building2,
  Globe
} from 'lucide-react';

interface WelcomeAuthScreenProps {
  onLoginSuccess: (user: StoreUser) => void;
  onContinueDemo: () => void;
  onOpenSaasAdmin?: () => void;
  onOpenSecretAdminModal?: () => void;
  onBack?: () => void;
  initialPlan?: string;
}

type ScreenStep = 
  | 'LOGIN'               // Connexion Email / Mot de passe
  | 'REGISTER'            // Inscription Email / Mot de passe (Nom, WhatsApp, Email, Pass)
  | 'EMAIL_VERIFICATION'  // Sas de vérification email
  | 'PIN_SETUP';          // Configuration obligatoire du Master PIN de sécurité

import { ALL_WORLD_COUNTRIES, CountryCodeOption } from '../../utils/worldCountries';

const COUNTRY_DIAL_OPTIONS: CountryCodeOption[] = ALL_WORLD_COUNTRIES;

interface CarouselSlide {
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  subtitle: string;
  steps: Array<{ title: string; desc: string }>;
  highlight: string;
}

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    badge: 'Étape 1 • Inscription Simple',
    badgeIcon: <Rocket className="w-3.5 h-3.5 text-amber-300" />,
    title: 'Créez votre compte en 30 secondes',
    subtitle: 'La procédure la plus fluide d’Afrique de l’Ouest sans paperasse ni carte bancaire.',
    steps: [
      { title: '1. Identité Rapide', desc: 'Votre Nom, Email et Numéro WhatsApp suffisent pour démarrer.' },
      { title: '2. Zéro Justificatif', desc: 'Aucun document RCCM exigé à l’entrée, accès immédiat garanti.' },
      { title: '3. Master PIN Protégé', desc: 'Un code secret à 4 chiffres pour sceller vos données et actions.' }
    ],
    highlight: 'Sans KYC obligatoire à l’entrée • 100% Gratuit'
  },
  {
    badge: 'Étape 2 • Quartier Général',
    badgeIcon: <Layers className="w-3.5 h-3.5 text-blue-300" />,
    title: 'Tableau de Bord Unifié & 27 Modules',
    subtitle: 'Explorez librement toutes les fonctionnalités et l’Omnibar de recherche universelle.',
    steps: [
      { title: '1. Navigation Universelle', desc: 'Recherchez et parcourez les 27 modules via l’Omnibar (Ctrl + K).' },
      { title: '2. Mode Démo & Lecture', desc: 'Testez l’ensemble des interfaces métiers en visualisation gratuite.' },
      { title: '3. Activation à la Carte', desc: 'Activez vos outils avancés uniquement quand votre activité le demande.' }
    ],
    highlight: 'Mode Démo & Lecture inclus pour tout utilisateur'
  },
  {
    badge: 'Étape 3 • Zéro Commission',
    badgeIcon: <CreditCard className="w-3.5 h-3.5 text-emerald-300" />,
    title: 'Encaissements Directs 0% Commission',
    subtitle: 'Conservez 100% de vos marges avec vos moyens de paiement locaux favoris.',
    steps: [
      { title: '1. Mobile Money Direct', desc: 'Orange Money, Moov, Wave, MTN MoMo connectés en direct.' },
      { title: '2. Portefeuille Wallet', desc: 'Payez les modules à l’usage directement depuis votre solde.' },
      { title: '3. Retraits Immédiats', desc: 'Vos fonds transférés instantanément sur votre compte sans délai.' }
    ],
    highlight: '0% de commission garantie sur vos encaissements directs'
  }
];

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onLoginSuccess,
  onContinueDemo,
  onOpenSaasAdmin,
  onOpenSecretAdminModal,
  onBack,
  initialPlan,
}) => {
  const [step, setStep] = useState<ScreenStep>('LOGIN');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Carousel Slide State
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Form Fields
  const [fullName, setFullName] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('BF');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Master PIN State (4 à 6 chiffres)
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinStep, setPinStep] = useState<'ENTER' | 'CONFIRM'>('ENTER');

  // Pending Firebase User during PIN setup
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<any>(null);

  // Email verification cooldown
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);

  // Mot de passe oublié
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [resetEmailInput, setResetEmailInput] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  // Legal Modal
  const [legalConfig, setLegalConfig] = useState<PlatformLegalConfig>(DEFAULT_PLATFORM_LEGAL);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'LEGAL_MENTIONS' | 'PRIVACY_POLICY' | null>(null);

  // Logo secret tap
  const [logoTapCount, setLogoTapCount] = useState<number>(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLogoTapTimeRef = useRef<number>(0);

  // Auto-slide carousel toutes les 6 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = subscribeToPlatformLegal((cfg) => {
      setLegalConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Détection URL /register ou plan
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (pathname === '/register' || params.get('step') === 'register' || params.get('auth') === 'register') {
        setStep('REGISTER');
      }
    }
  }, []);

  // Détection secrète 5 tapotements
  const handleLogoTap = () => {
    const now = Date.now();
    const isWithinWindow = now - lastLogoTapTimeRef.current <= 1500;
    lastLogoTapTimeRef.current = now;

    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }

    setLogoTapCount((prev) => {
      const next = isWithinWindow ? prev + 1 : 1;
      if (next >= 5) {
        if (onOpenSaasAdmin) {
          playValidationBeep();
          onOpenSaasAdmin();
        } else if (onOpenSecretAdminModal) {
          playTapBeep();
          onOpenSecretAdminModal();
        }
        return 0;
      }
      logoTapTimerRef.current = setTimeout(() => {
        setLogoTapCount(0);
      }, 1500);
      return next;
    });
  };

  // Au chargement, vérifier session active Firebase Auth
  useEffect(() => {
    const checkCurrentAuth = async () => {
      const fbUser = auth.currentUser;
      if (fbUser) {
        setEmailInput(fbUser.email || '');
        if (fbUser.displayName) setFullName(fbUser.displayName);

        try {
          await fbUser.reload();
        } catch {}

        if (!fbUser.emailVerified && fbUser.providerData.some(p => p.providerId === 'password')) {
          setStep('EMAIL_VERIFICATION');
          return;
        }

        const profile = await getUserProfile(fbUser.uid);
        if (profile?.pinCode || profile?.masterPin) {
          // Synchronisation neutre Supabase en arrière-plan
          syncAuthProfileWithSupabase({
            firebaseUid: fbUser.uid,
            email: fbUser.email || '',
            fullName: profile.name || fbUser.displayName || '',
            whatsapp: profile.phone || ''
          }).catch(console.warn);

          const completedUser: StoreUser = {
            id: fbUser.uid,
            storeId: profile.storeId || `store-${fbUser.uid.slice(0, 8)}`,
            storeUniqueId: profile.storeUniqueId,
            name: profile.name || fbUser.displayName || 'Utilisateur Nanasore',
            email: fbUser.email || 'utilisateur@nanasore.com',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            storeName: profile.storeName || 'Mon Espace Nanasore',
            role: profile.role || 'GERANT',
            vendorType: 'ecommerce',
            sellerMode: 'merchant_ecommerce',
            phone: profile.phone || '+226 00 00 00 00',
            city: profile.city || 'Ouagadougou',
            country: 'Burkina Faso',
            currency: 'F CFA',
            defaultCreditLimit: 20000,
            loginProvider: 'google',
            kycStatus: 'none',
            pinCode: profile.pinCode,
            masterPin: profile.masterPin,
            pinConfiguredAt: profile.pinConfiguredAt,
            credits: profile.credits !== undefined ? profile.credits : 15,
            createdAt: profile.createdAt || new Date().toISOString(),
          };
          onLoginSuccess(completedUser);
        } else {
          setPendingFirebaseUser(fbUser);
          setStep('PIN_SETUP');
        }
      }
    };
    checkCurrentAuth();
  }, []);

  // =========================================================================
  // ACTIONS D'AUTHENTIFICATION
  // =========================================================================

  // 1. Connexion Email
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      playCancelSound();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await loginWithEmail(emailInput.trim(), passwordInput);
      playValidationBeep();

      if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        setStep('EMAIL_VERIFICATION');
        return;
      }

      // Synchronisation neutre dans Supabase (kyc_status: none, pricing_model: none)
      await syncAuthProfileWithSupabase({
        firebaseUid: user.uid,
        email: user.email || emailInput.trim(),
        fullName: user.displayName || fullName || ''
      });

      const profile = await getUserProfile(user.uid);
      if (profile?.pinCode || profile?.masterPin) {
        const storeUser: StoreUser = {
          id: user.uid,
          storeId: profile.storeId || `store-${user.uid.slice(0, 8)}`,
          storeUniqueId: profile.storeUniqueId,
          name: profile.name || user.displayName || 'Utilisateur Nanasore',
          email: user.email || emailInput.trim(),
          avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          storeName: profile.storeName || 'Mon Espace Nanasore',
          role: profile.role || 'GERANT',
          vendorType: 'ecommerce',
          sellerMode: 'merchant_ecommerce',
          phone: profile.phone || '+226 00 00 00 00',
          city: profile.city || 'Ouagadougou',
          country: 'Burkina Faso',
          currency: 'F CFA',
          defaultCreditLimit: 20000,
          loginProvider: 'google',
          kycStatus: 'none',
          pinCode: profile.pinCode,
          masterPin: profile.masterPin,
          pinConfiguredAt: profile.pinConfiguredAt,
          credits: profile.credits !== undefined ? profile.credits : 15,
          createdAt: profile.createdAt || new Date().toISOString(),
        };
        playCashChime();
        onLoginSuccess(storeUser);
      } else {
        setPendingFirebaseUser(user);
        setStep('PIN_SETUP');
      }
    } catch (err: any) {
      playCancelSound();
      console.error('[AUTH ERROR]', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Email ou mot de passe incorrect.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Mot de passe erroné. Veuillez réessayer.');
      } else {
        setErrorMessage(err.message || 'Erreur de connexion. Vérifiez vos identifiants.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Inscription Unique (Nom, WhatsApp, Email, Mot de passe)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      playCancelSound();
      return;
    }
    if (passwordInput.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      playCancelSound();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const dial = COUNTRY_DIAL_OPTIONS.find(c => c.code === selectedCountry)?.dialCode || '+226';
    const fullWhatsapp = whatsappNumber.startsWith('+') ? whatsappNumber : `${dial} ${whatsappNumber.trim()}`;

    try {
      const user = await registerWithEmail(emailInput.trim(), passwordInput);
      playValidationBeep();

      // Expédition de l'email de vérification officiel via Brevo & Server Action (contact@nanasore.com)
      fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email || emailInput.trim() })
      }).catch((e) => console.warn('[AUTH] Expédition email Brevo différée:', e));

      // Persistance Neutre Immédiate dans Supabase :
      // kyc_status: 'none', pricing_model: 'none', wallet_balance: 0, enabled_themes: []
      await syncAuthProfileWithSupabase({
        firebaseUid: user.uid,
        email: user.email || emailInput.trim(),
        fullName: fullName.trim() || 'Utilisateur Nanasore',
        whatsapp: fullWhatsapp
      });

      setPendingFirebaseUser(user);
      setInfoMessage('Compte créé avec succès !');

      if (!user.emailVerified) {
        setStep('EMAIL_VERIFICATION');
      } else {
        setStep('PIN_SETUP');
      }
    } catch (err: any) {
      playCancelSound();
      console.error('[REGISTER ERROR]', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Cet email est déjà enregistré. Veuillez vous connecter.');
      } else {
        setErrorMessage(err.message || 'Erreur lors de la création de compte.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Connexion Google SSO
  const handleGoogleSignInClick = async () => {
    playTapBeep();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        if (fbUser.displayName) setFullName(fbUser.displayName);
        if (fbUser.email) setEmailInput(fbUser.email);

        // Persistance neutre dans Supabase
        await syncAuthProfileWithSupabase({
          firebaseUid: fbUser.uid,
          email: fbUser.email || '',
          fullName: fbUser.displayName || 'Utilisateur Nanasore'
        });

        const profile = await getUserProfile(fbUser.uid);
        if (profile?.pinCode || profile?.masterPin) {
          playCashChime();
          const existingUser: StoreUser = {
            id: fbUser.uid,
            storeId: profile.storeId || fbUser.uid,
            storeUniqueId: profile.storeUniqueId,
            name: profile.name || fbUser.displayName || 'Utilisateur Nanasore',
            email: fbUser.email || 'utilisateur@nanasore.com',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            storeName: profile.storeName || 'Mon Espace Nanasore',
            role: profile.role || 'GERANT',
            vendorType: 'ecommerce',
            sellerMode: 'merchant_ecommerce',
            phone: profile.phone || '+226 00 00 00 00',
            city: profile.city || 'Ouagadougou',
            country: 'Burkina Faso',
            currency: 'F CFA',
            defaultCreditLimit: 20000,
            loginProvider: 'google',
            kycStatus: 'none',
            pinCode: profile.pinCode,
            masterPin: profile.masterPin,
            pinConfiguredAt: profile.pinConfiguredAt,
            credits: profile.credits !== undefined ? profile.credits : 15,
            createdAt: profile.createdAt || new Date().toISOString(),
          };
          onLoginSuccess(existingUser);
          return;
        }

        setPendingFirebaseUser(fbUser);
        setStep('PIN_SETUP');
        playValidationBeep();
      }
    } catch (err: any) {
      console.error('[GOOGLE AUTH ERROR]', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Erreur lors de la connexion Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Clavier Tactile Master PIN (Zero mention de "Caisse Nanasore")
  const handlePinDigitPress = async (digit: string) => {
    playTapBeep();
    if (pinStep === 'ENTER') {
      if (newPin.length < 4) {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) {
          playValidationBeep();
          setPinStep('CONFIRM');
        }
      }
    } else {
      if (confirmPin.length < newPin.length) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === newPin.length) {
          if (next === newPin) {
            playValidationBeep();
            await finalizeMasterPinSetup(newPin);
          } else {
            playCancelSound();
            setErrorMessage('Les deux codes PIN ne correspondent pas. Recommencez.');
            setConfirmPin('');
            setNewPin('');
            setPinStep('ENTER');
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }
      }
    }
  };

  const handlePinDelete = () => {
    playTapBeep();
    if (pinStep === 'ENTER') {
      setNewPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  // Finalisation Master PIN & Entrée directe dans le Tableau de Bord Unifié
  const finalizeMasterPinSetup = async (pinValue: string) => {
    setIsLoading(true);
    const currentUserAuth = pendingFirebaseUser || auth.currentUser;
    const uid = currentUserAuth?.uid || `user-${Date.now()}`;
    const userEmail = currentUserAuth?.email || emailInput.trim();
    const cleanFullName = fullName.trim() || currentUserAuth?.displayName || 'Utilisateur Nanasore';
    const dial = COUNTRY_DIAL_OPTIONS.find(c => c.code === selectedCountry)?.dialCode || '+226';
    const fullWhatsapp = whatsappNumber.startsWith('+') ? whatsappNumber : `${dial} ${whatsappNumber.trim()}`;

    const masterPinHashed = await hashMasterPin(pinValue);
    const storeUniqueId = generateStoreUniqueId();
    const resolvedStoreId = `store-${uid.slice(0, 8)}`;

    const userProfileData = {
      id: uid,
      storeId: resolvedStoreId,
      storeUniqueId,
      name: cleanFullName,
      email: userEmail,
      storeName: 'Mon Espace Nanasore',
      role: 'GERANT' as UserRole,
      vendorType: 'ecommerce' as const,
      sellerMode: 'merchant_ecommerce' as const,
      plan: 'free',
      subscriptionPlan: 'free',
      subscriptionStatus: 'ACTIVE' as const,
      phone: fullWhatsapp,
      city: 'Ouagadougou',
      country: COUNTRY_DIAL_OPTIONS.find(c => c.code === selectedCountry)?.name || 'Burkina Faso',
      currency: 'F CFA',
      defaultCreditLimit: 20000,
      loginProvider: 'google' as const,
      kycStatus: 'none' as const,
      pinCode: pinValue,
      masterPin: masterPinHashed,
      pinConfiguredAt: Date.now(),
      setupCompleted: true,
      credits: 15,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveUserProfile(uid, userProfileData);
    } catch (e) {
      console.warn('[STORAGE] Profil local:', e);
    }

    // Persistance Neutre dans Supabase
    await syncAuthProfileWithSupabase({
      firebaseUid: uid,
      email: userEmail,
      fullName: cleanFullName,
      whatsapp: fullWhatsapp
    });

    const finalStoreUser: StoreUser = {
      ...userProfileData,
      avatarUrl: currentUserAuth?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    };

    playCashChime();
    setIsLoading(false);
    onLoginSuccess(finalStoreUser);
  };

  // Réinitialisation mot de passe
  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput.trim()) {
      setResetErrorMsg('Veuillez saisir votre adresse email.');
      return;
    }
    setIsSendingReset(true);
    setResetErrorMsg(null);
    setResetSuccessMsg(null);
    try {
      await resetPasswordEmail(resetEmailInput.trim());
      playValidationBeep();
      setResetSuccessMsg('Un lien de réinitialisation sécurisé a été envoyé à votre adresse email.');
    } catch (err: any) {
      playCancelSound();
      console.error("Erreur complète reset :", err);
      setResetErrorMsg(err?.message || String(err) || "Erreur lors de la demande de réinitialisation.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const activeSlideData = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-950 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Halos d'ambiance en arrière-plan */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* ===================================================================== */}
      {/* COCKPIT D'AUTHENTIFICATION UNIFIÉ NANASORE (STYLE NANASWITCH CLOUD)   */}
      {/* ===================================================================== */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative z-10">
        
        {/* =================================================================== */}
        {/* COLONNE GAUCHE (5/12) : CARROUSEL D'IMAGES & SALUTATION             */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* En-tête de Marque & Salutation de Bienvenue en haut */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div 
                onClick={handleLogoTap} 
                className="cursor-pointer active:scale-95 transition-transform" 
                title="Nanasore"
              >
                <NanasoreLogo variant="horizontal" size="md" theme="dark" />
              </div>

              {onBack && (
                <button
                  type="button"
                  onClick={() => { playTapBeep(); onBack(); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Retour à l'accueil"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Accueil</span>
                </button>
              )}
            </div>

            {/* Salutation de bienvenue chaleureuse */}
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-[11px] font-black uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span>Portail Universel Nanasore</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Bienvenue sur Nanasore
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Votre plateforme unifiée pour créer et développer votre business en toute sécurité et souveraineté.
              </p>
            </div>

            {/* Carrousel Interactif d'Explication (3 Slides) */}
            <div className="pt-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 sm:p-5 rounded-2xl space-y-3 min-h-[220px] flex flex-col justify-between transition-all duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-2">
                    {activeSlideData.badgeIcon}
                    <span>{activeSlideData.badge}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {activeSlideData.title}
                  </h3>
                  <p className="text-[11.5px] text-blue-100/90 mt-1 leading-relaxed">
                    {activeSlideData.subtitle}
                  </p>
                </div>

                <div className="space-y-2 pt-1 border-t border-white/10">
                  {activeSlideData.steps.map((st, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 text-xs">
                      <div className="w-4 h-4 rounded-full bg-white/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white font-bold">{st.title} : </strong>
                        <span className="text-blue-100 text-[11px]">{st.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-1 text-[10.5px] font-extrabold text-amber-300 flex items-center gap-1">
                  <span>✦ {activeSlideData.highlight}</span>
                </div>
              </div>

              {/* Contrôles du Carrousel (Puces indicatrices & Flèches) */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-2">
                  {CAROUSEL_SLIDES.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => { playTapBeep(); setCurrentSlide(dotIdx); }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlide === dotIdx ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Aller au slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-white/70">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
                    title="Slide précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
                    title="Slide suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pied de Carte Gauche : Engagement Souverain & SLA */}
          <div className="pt-6 border-t border-white/15 relative z-10 flex items-center justify-between text-[11px] text-blue-200">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chiffrement SSL & Isolation Zero-Trust</span>
            </div>
            <span className="font-mono font-bold text-emerald-300">SLA 99.98%</span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLONNE DROITE (7/12) : FORMULAIRE EN BLANC PUR & BLEU ROYAL        */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white overflow-y-auto">
          
          <div>
            {/* Messages d'erreur ou de succès */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {infoMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Onglets Connexion / Inscription si on n'est pas dans le PIN setup */}
            {step !== 'PIN_SETUP' && step !== 'EMAIL_VERIFICATION' && (
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setStep('LOGIN'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    step === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setStep('REGISTER'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    step === 'REGISTER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Inscription Gratuite
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CAS 1 : CONNEXION                                             */}
            {/* ------------------------------------------------------------- */}
            {step === 'LOGIN' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Bon retour parmi nous !
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Connectez-vous pour accéder immédiatement à votre Quartier Général unifié.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Adresse Email :
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        Mot de passe :
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setResetEmailInput(emailInput);
                          setShowForgotPasswordModal(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Se Connecter à mon Espace</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    ou
                  </span>
                </div>

                {/* Bouton Google SSO */}
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>Continuer avec Google</span>
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CAS 2 : INSCRIPTION UNIQUE (Nom, WhatsApp, Email, Pass)       */}
            {/* ------------------------------------------------------------- */}
            {step === 'REGISTER' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Créer votre Compte Gratuit
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Accès immédiat sans carte bancaire ni vérification d’identité.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Nom et Prénom :
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Ibrahim Konkobo"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                    />
                  </div>

                  {/* Numéro WhatsApp avec préfixe pays */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      Numéro WhatsApp (Notifications &amp; Paiements) :
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-blue-600 shrink-0 max-w-[130px] sm:max-w-[180px] cursor-pointer truncate"
                      >
                        {COUNTRY_DIAL_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.dialCode} ({c.name})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="70 00 00 00"
                        className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Adresse Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Adresse Email :
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                    />
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Mot de passe (6 caractères min) :
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Créer mon Compte Nanasore</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    ou
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>S'inscrire avec Google</span>
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CAS 3 : CONFIGURATION DU MASTER PIN (Zero mention de Caisse)  */}
            {/* ------------------------------------------------------------- */}
            {step === 'PIN_SETUP' && (
              <div className="space-y-4 animate-in fade-in duration-200 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/10 mb-1">
                  <KeyRound className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {pinStep === 'ENTER' ? 'Créer votre Master PIN de Sécurité Nanasore' : 'Confirmer votre Master PIN'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {pinStep === 'ENTER'
                      ? 'Définissez votre code secret à 4 chiffres pour protéger votre espace et sécuriser vos accès.'
                      : 'Tapez une seconde fois votre code secret à 4 chiffres pour validation.'}
                  </p>
                </div>

                {/* 4 Bulles Indicatrices */}
                <div className="flex items-center justify-center gap-3.5 py-3 px-6 rounded-2xl bg-slate-100 border border-slate-200 my-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const currentDigits = pinStep === 'ENTER' ? newPin : confirmPin;
                    const isFilled = currentDigits.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full transition-all duration-150 ${
                          isFilled
                            ? 'bg-blue-600 scale-125 shadow-md shadow-blue-500/40 ring-2 ring-blue-300'
                            : 'bg-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Pavé Numérique Tactile */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[260px] w-full pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinDigitPress(digit)}
                      className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition active:scale-95 cursor-pointer shadow-sm border border-slate-200"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setNewPin('');
                      setConfirmPin('');
                      setPinStep('ENTER');
                    }}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-500 font-bold text-xs transition active:scale-95 cursor-pointer border border-slate-200"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigitPress('0')}
                    className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition active:scale-95 cursor-pointer shadow-sm border border-slate-200"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinDelete}
                    className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition active:scale-95 cursor-pointer border border-slate-200 flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CAS 4 : VÉRIFICATION EMAIL                                    */}
            {/* ------------------------------------------------------------- */}
            {step === 'EMAIL_VERIFICATION' && (
              <div className="space-y-4 text-center animate-in fade-in duration-200 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Vérifiez votre boîte de réception
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Un email de confirmation a été envoyé à <strong>{emailInput}</strong>. Cliquez sur le lien pour valider votre compte.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => { playValidationBeep(); setStep('PIN_SETUP'); }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    J'ai validé mon email • Continuer
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsResending(true);
                      await resendVerificationEmail();
                      setIsResending(false);
                      setInfoMessage('✓ Nouveau lien envoyé !');
                    }}
                    disabled={isResending}
                    className="w-full py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  >
                    {isResending ? 'Envoi...' : 'Renvoyer le lien'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pied de Carte Droite : Mode Démo & Mentions Légales */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => { playTapBeep(); onContinueDemo(); }}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Explorer en Mode Démo →
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveLegalDoc('LEGAL_MENTIONS')}
                className="hover:text-slate-600 transition cursor-pointer"
              >
                Mentions Légales
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveLegalDoc('PRIVACY_POLICY')}
                className="hover:text-slate-600 transition cursor-pointer"
              >
                Confidentialité
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale Mot de Passe Oublié */}
      {showForgotPasswordModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Réinitialiser votre mot de passe
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Saisissez votre adresse email pour recevoir un lien sécurisé de réinitialisation.
            </p>
            {resetSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs">
                {resetSuccessMsg}
              </div>
            )}
            {resetErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
                {resetErrorMsg}
              </div>
            )}
            <form onSubmit={handleSendResetPassword} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmailInput}
                onChange={(e) => setResetEmailInput(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
              >
                {isSendingReset ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modale Mentions Légales & Confidentialité */}
      <LegalDocModal
        isOpen={activeLegalDoc !== null}
        initialDoc={activeLegalDoc || 'LEGAL_MENTIONS'}
        onClose={() => setActiveLegalDoc(null)}
        legalConfig={legalConfig}
      />
    </div>
  );
};

export default WelcomeAuthScreen;
