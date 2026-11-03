import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreUser, UserRole, SellerMode } from '../../types';
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
import { saveUserProfile, getUserProfile, subscribeToPlatformLegal, DEFAULT_PLATFORM_LEGAL, updateStoreSubscription, updateSellerModeInFirestore } from '../../utils/firestoreService';
import { hashMasterPin, generateStoreUniqueId } from '../../utils/managerSecurityService';
import { normalizePlanId, isUnlimitedCourses, resolveSellerMode, persistSellerModeLocally } from '../../utils/planFeatures';
import { PlatformLegalConfig } from '../../types';
import { LegalTickerFooter } from '../../components/LegalTickerFooter';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import { NanasoreLogo } from '../../components/common/NanasoreLogo';
import { 
  Sparkles, 
  ShoppingBag, 
  ShieldCheck, 
  BookOpen, 
  GraduationCap,
  Rocket,
  Mic, 
  Store, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  MessageCircle,
  KeyRound,
  Zap,
  Lock,
  Mail,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Check,
  X,
  Send
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
  | 'REGISTER'            // Inscription Email / Mot de passe
  | 'EMAIL_VERIFICATION'  // Sas de vérification email obligatoire
  | 'PIN_SETUP'           // Configuration obligatoire du PIN 4 chiffres
  | 'STORE_PROFILE';      // Personnalisation rapide du nom de la boutique

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

  // Détection URL /register et intention rôle 'vendor' & plan 'free' / payant avec checkout
  const [selectedPlan, setSelectedPlan] = useState<string>(() => {
    if (initialPlan) return initialPlan;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan');
      if (p) return p;
      const local = localStorage.getItem('nana_user_plan');
      if (local) return local;
    }
    return 'free';
  });

  // Configuration Légale Dynamique & Modale
  const [legalConfig, setLegalConfig] = useState<PlatformLegalConfig>(DEFAULT_PLATFORM_LEGAL);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'LEGAL_MENTIONS' | 'PRIVACY_POLICY' | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformLegal((cfg) => {
      setLegalConfig(cfg);
    });
    return () => unsub();
  }, []);

  const [sellerMode, setSellerMode] = useState<SellerMode>(() => resolveSellerMode());
  const [sellerIntention, setSellerIntention] = useState<'products' | 'courses' | 'hybrid'>(() => {
    const mode = resolveSellerMode();
    if (mode === 'creator_trainer') return 'courses';
    if (mode === 'hybrid_all') return 'hybrid';
    return 'products';
  });

  const handleSelectSellerMode = useCallback((mode: SellerMode) => {
    setSellerMode(mode);
    if (mode === 'creator_trainer') {
      setSellerIntention('courses');
    } else if (mode === 'hybrid_all') {
      setSellerIntention('hybrid');
    } else {
      setSellerIntention('products');
    }
    persistSellerModeLocally(mode);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      const isRegisterUrl = pathname === '/register' || pathname.startsWith('/register/');
      const hasRegisterParam = params.get('step') === 'register' || params.get('auth') === 'register';
      const planParam = params.get('plan') || initialPlan;
      const intentParam = params.get('intent') || params.get('role');
      const isCheckoutIntent = params.get('checkout') === 'true' || !!initialPlan;
      const typeParam = params.get('type') || params.get('intention') || params.get('mode');

      if (isRegisterUrl || hasRegisterParam || planParam || isCheckoutIntent) {
        setStep('REGISTER');
      }
      if (planParam) {
        setSelectedPlan(planParam);
        try {
          localStorage.removeItem('nana_pending_checkout_plan');
          localStorage.setItem('nana_user_plan', planParam);
        } catch (e) {}
      }
      if (intentParam === 'vendor' || intentParam === 'merchant' || intentParam === 'commercant') {
        setRole('GERANT');
        handleSelectSellerMode('merchant_ecommerce');
      } else if (intentParam === 'instructor' || intentParam === 'formateur' || intentParam === 'teacher') {
        setRole('GERANT');
        handleSelectSellerMode('creator_trainer');
        setStoreName('Mon Académie Pro');
      } else if (intentParam === 'hybrid' || intentParam === 'hybride') {
        setRole('GERANT');
        handleSelectSellerMode('hybrid_all');
      } else if (intentParam === 'partner' || intentParam === 'affiliate' || intentParam === 'partenaire') {
        setRole('GERANT');
        handleSelectSellerMode('merchant_ecommerce');
        setStoreName('Espace Ambassadeur Partenaire');
        try {
          localStorage.setItem('nana_pending_partner_intent', 'true');
        } catch (e) {
          console.error(e);
        }
      }
      if (typeParam === 'courses' || typeParam === 'course' || typeParam === 'formations' || typeParam === 'formation' || typeParam === 'creator_trainer') {
        handleSelectSellerMode('creator_trainer');
        setStoreName('Mon Académie Pro');
      } else if (typeParam === 'hybrid' || typeParam === 'hybrid_all') {
        handleSelectSellerMode('hybrid_all');
      } else if (typeParam === 'products' || typeParam === 'merchant_ecommerce') {
        handleSelectSellerMode('merchant_ecommerce');
      }

      // Nettoyage systématique pour empêcher toute ouverture involontaire de paywall
      try {
        localStorage.removeItem('nana_pending_checkout_plan');
      } catch (e) {}
    }
  }, [initialPlan, handleSelectSellerMode]);

  // Email / Password Form
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Store & profile state
  const [storeName, setStoreName] = useState<string>('Alimentation de la Paix');
  const [ownerName, setOwnerName] = useState<string>('Amadou Diallo');
  const [phone, setPhone] = useState<string>('+225 07 12 34 56 78');
  const [city, setCity] = useState<string>('Abidjan (Treichville)');
  const [role, setRole] = useState<UserRole>('GERANT');

  // PIN Setup state (4 digits)
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinStep, setPinStep] = useState<'ENTER' | 'CONFIRM'>('ENTER');

  // Resend verification timer/cooldown
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);

  // Mot de passe oublié (Firebase Auth)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [resetEmailInput, setResetEmailInput] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  // Détection secrète 5 tapotements sur le logo Nana (intervalle <= 1.5s)
  const [logoTapCount, setLogoTapCount] = useState<number>(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLogoTapTimeRef = useRef<number>(0);

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
        const isAuthorizedEmail =
          auth.currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
          emailInput.trim().toLowerCase() === 'pousbila36@gmail.com' ||
          auth.currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
          emailInput.trim().toLowerCase() === 'pousbila04@gmail.com' ||
          auth.currentUser?.email?.toLowerCase() === 'admin@nanasore.com' ||
          emailInput.trim().toLowerCase() === 'admin@nanasore.com';

        if (isAuthorizedEmail && onOpenSaasAdmin) {
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
      setResetSuccessMsg(
        'Un lien de réinitialisation sécurisé a été envoyé à votre adresse email. Vérifiez votre boîte de réception et vos spams.'
      );
    } catch (err: any) {
      playCancelSound();
      console.error('[FIREBASE RESET PASSWORD ERROR]', err);
      if (err.code === 'auth/user-not-found') {
        setResetErrorMsg('Aucun compte associé à cette adresse email.');
      } else if (err.code === 'auth/invalid-email') {
        setResetErrorMsg('Format d\'adresse email invalide.');
      } else if (err.code === 'auth/too-many-requests') {
        setResetErrorMsg('Trop de requêtes. Veuillez réessayer dans un instant.');
      } else {
        setResetErrorMsg(err.message || 'Impossible d\'envoyer le lien de réinitialisation.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  // Au chargement, vérifier si un utilisateur Firebase est déjà connecté
  useEffect(() => {
    const checkCurrentAuth = async () => {
      const fbUser = auth.currentUser;
      if (fbUser) {
        setEmailInput(fbUser.email || '');
        if (fbUser.displayName) setOwnerName(fbUser.displayName);

        // Forcer le rafraîchissement du statut emailVerified
        try {
          await fbUser.reload();
        } catch (e) {
          // Ignore reload error if offline
        }

        if (!fbUser.emailVerified && fbUser.providerData.some(p => p.providerId === 'password')) {
          setStep('EMAIL_VERIFICATION');
          return;
        }

        // Vérifier si le PIN est configuré dans Firestore
        const profile = await getUserProfile(fbUser.uid);
        if ((profile?.pinCode || profile?.masterPin) && profile?.setupCompleted) {
          const resolvedMode = resolveSellerMode(
            profile.sellerMode ||
            profile.vendorType ||
            (profile.role === 'INSTRUCTOR' || profile.role === 'instructor' ? 'creator_trainer' : undefined)
          );
          persistSellerModeLocally(resolvedMode);
          // Utilisateur complet -> Connexion directe au Tableau de Bord Caméléon
          const completedUser: StoreUser = {
            id: fbUser.uid,
            storeId: profile.storeId || `store-${fbUser.uid.slice(0, 8)}`,
            storeUniqueId: profile.storeUniqueId,
            name: profile.name || fbUser.displayName || 'Gérant Nana',
            email: fbUser.email || 'boutiquier@nana.app',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            storeName: profile.storeName || 'Ma Boutique Nana',
            role: profile.role || 'GERANT',
            vendorType: profile.vendorType || (resolvedMode === 'creator_trainer' ? 'elearning' : 'ecommerce'),
            sellerMode: resolvedMode,
            phone: profile.phone || '+225 07 00 00 00',
            city: profile.city || 'Abidjan',
            country: profile.country || "Côte d'Ivoire",
            currency: 'F CFA',
            defaultCreditLimit: 20000,
            loginProvider: 'google',
            kycStatus: profile.kycStatus || 'unverified',
            pinCode: profile.pinCode,
            masterPin: profile.masterPin,
            pinConfiguredAt: profile.pinConfiguredAt,
            credits: profile.credits !== undefined ? profile.credits : 15,
            createdAt: profile.createdAt || new Date().toISOString(),
          };
          onLoginSuccess(completedUser);
        } else {
          // Imposer la configuration du Master PIN
          setStep('PIN_SETUP');
        }
      }
    };

    checkCurrentAuth();
  }, []);

  // 1. Connexion Email / Mot de passe
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorMessage('Veuillez remplir votre email et mot de passe.');
      playCancelSound();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const user = await loginWithEmail(emailInput, passwordInput);
      playValidationBeep();

      // Vérification Email Obligatoire
      if (!user.emailVerified) {
        setStep('EMAIL_VERIFICATION');
        return;
      }

      // Vérifier si le PIN ou Master PIN existe
      const profile = await getUserProfile(user.uid);
      if (profile?.pinCode || profile?.masterPin) {
        const resolvedMode = resolveSellerMode(
          profile.sellerMode ||
          profile.vendorType ||
          (profile.role === 'INSTRUCTOR' || profile.role === 'instructor' ? 'creator_trainer' : sellerMode)
        );
        persistSellerModeLocally(resolvedMode);
        const storeUser: StoreUser = {
          id: user.uid,
          storeId: profile.storeId || `store-${user.uid.slice(0, 8)}`,
          storeUniqueId: profile.storeUniqueId,
          name: profile.name || user.displayName || 'Gérant Nana',
          email: user.email || emailInput,
          avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          storeName: profile.storeName || storeName,
          role: profile.role || 'GERANT',
          vendorType: profile.vendorType || (resolvedMode === 'creator_trainer' ? 'elearning' : 'ecommerce'),
          sellerMode: resolvedMode,
          phone: profile.phone || phone,
          city: profile.city || city,
          country: "Côte d'Ivoire",
          currency: 'F CFA',
          defaultCreditLimit: 20000,
          loginProvider: 'google',
          kycStatus: profile.kycStatus || 'unverified',
          pinCode: profile.pinCode,
          masterPin: profile.masterPin,
          pinConfiguredAt: profile.pinConfiguredAt,
          credits: profile.credits !== undefined ? profile.credits : 15,
          createdAt: profile.createdAt || new Date().toISOString(),
        };
        playCashChime();
        onLoginSuccess(storeUser);
      } else {
        // PIN non configuré -> Redirection vers la configuration du PIN
        setStep('PIN_SETUP');
      }
    } catch (err: any) {
      playCancelSound();
      console.error('[AUTH ERROR]', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Email ou mot de passe incorrect.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Mot de passe erroné. Veuillez réessayer.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Trop de tentatives infructueuses. Patientez quelques instants.');
      } else {
        setErrorMessage(err.message || 'Erreur de connexion. Vérifiez vos identifiants.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Inscription Email / Mot de passe
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

    try {
      const user = await registerWithEmail(emailInput, passwordInput);
      playValidationBeep();
      setInfoMessage('Un email de vérification vous a été envoyé.');
      // Envoi direct vers l'écran de vérification email
      setStep('EMAIL_VERIFICATION');
    } catch (err: any) {
      playCancelSound();
      console.error('[REGISTER ERROR]', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Cet email est déjà utilisé. Veuillez vous connecter.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Adresse email invalide.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Mot de passe trop faible (6 caractères minimum).');
      } else {
        setErrorMessage(err.message || "Erreur lors de l'inscription.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Renvoyer l'email de confirmation
  const handleResendEmail = async () => {
    setIsResending(true);
    playTapBeep();
    try {
      const sent = await resendVerificationEmail();
      if (sent) {
        playValidationBeep();
        setInfoMessage('✓ Nouveau lien de vérification envoyé à votre boîte mail !');
        setTimeout(() => setInfoMessage(null), 5000);
      } else {
        setErrorMessage('Session expirée. Veuillez vous reconnecter.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Impossible d'envoyer l'email. Patientez 1 minute.");
    } finally {
      setIsResending(false);
    }
  };

  // 4. Vérifier si l'utilisateur a cliqué sur le lien email
  const handleCheckEmailVerified = async () => {
    setIsCheckingEmail(true);
    playTapBeep();

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          playCashChime();
          setInfoMessage('✓ Email vérifié avec succès !');
          setStep('PIN_SETUP');
        } else {
          playCancelSound();
          setErrorMessage("L'email n'a pas encore été validé. Cliquez sur le lien reçu dans votre boîte de réception.");
          setTimeout(() => setErrorMessage(null), 4000);
        }
      } else {
        setStep('LOGIN');
      }
    } catch (err) {
      setErrorMessage('Erreur de synchronisation avec Firebase.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // 5. Configuration du Master PIN à 4-6 chiffres (Pavé numérique tactile)
  const handlePinDigitPress = (digit: string) => {
    playTapBeep();
    if (pinStep === 'ENTER') {
      if (newPin.length < 6) {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 6) {
          playValidationBeep();
          setPinStep('CONFIRM');
        }
      }
    } else {
      if (confirmPin.length < newPin.length) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === newPin.length) {
          // Vérification de la correspondance des deux PINs
          if (next === newPin) {
            playValidationBeep();
            setStep('STORE_PROFILE');
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

  const handleAdvanceToConfirm = () => {
    if (newPin.length >= 4) {
      playValidationBeep();
      setPinStep('CONFIRM');
    }
  };

  const handlePinDelete = () => {
    playTapBeep();
    if (pinStep === 'ENTER') {
      setNewPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setErrorMessage(null);
  };

  const handlePinClear = () => {
    playTapBeep();
    if (pinStep === 'ENTER') {
      setNewPin('');
    } else {
      setConfirmPin('');
      setNewPin('');
      setPinStep('ENTER');
    }
    setErrorMessage(null);
  };

  // 6. Sauvegarde finale dans Firestore users/{uid} + stores/{storeId} & entrée dans le Tableau de Bord Caméléon
  const handleFinalizeStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    playCashChime();
    setIsLoading(true);

    const currentUserAuth = auth.currentUser;
    const uid = currentUserAuth?.uid || `usr-${Date.now()}`;
    const userEmail = currentUserAuth?.email || emailInput.trim() || 'boutiquier@nana.app';
    const storeSlug = storeName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) || 'nana';
    const resolvedStoreId = currentUserAuth?.uid || `store-${storeSlug}-${Date.now().toString(36)}`;
    const storeUniqueId = generateStoreUniqueId(city || 'CI');
    const masterPinHashed = await hashMasterPin(newPin || '1234');

    const resolvedSellerMode: SellerMode = sellerMode || (sellerIntention === 'courses' ? 'creator_trainer' : sellerIntention === 'hybrid' ? 'hybrid_all' : 'merchant_ecommerce');
    const isInstructorChoice = resolvedSellerMode === 'creator_trainer' || role === 'INSTRUCTOR' || role === 'instructor';
    const resolvedRole: UserRole = isInstructorChoice ? 'INSTRUCTOR' : role;
    const resolvedVendorType = resolvedSellerMode === 'creator_trainer' ? 'elearning' : 'ecommerce';

    persistSellerModeLocally(resolvedSellerMode);
    try {
      localStorage.setItem('nana_registered_role', isInstructorChoice ? 'instructor' : 'merchant');
    } catch (e) {}

    const resolvedTargetPlan = normalizePlanId(
      selectedPlan ||
      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('plan') : null) ||
      (typeof window !== 'undefined' ? localStorage.getItem('nana_user_plan') : null) ||
      'free'
    );
    const isProOrElite = resolvedTargetPlan === 'pro' || resolvedTargetPlan === 'elite';
    const isStarter = resolvedTargetPlan === 'starter';
    const isFreePlanInit = resolvedTargetPlan === 'free';

    const userProfileData = {
      id: uid,
      storeId: resolvedStoreId,
      storeUniqueId,
      name: ownerName.trim() || (isInstructorChoice ? 'Prof. Ibrahim Konkobo' : 'Gérant Nana'),
      email: userEmail,
      storeName: storeName.trim() || (isInstructorChoice ? 'Mon Académie Pro' : 'Ma Boutique Nana'),
      role: resolvedRole,
      vendorType: resolvedVendorType,
      sellerMode: resolvedSellerMode,
      plan: resolvedTargetPlan,
      subscriptionPlan: resolvedTargetPlan,
      subscriptionStatus: isFreePlanInit ? ('ACTIVE' as const) : ('pending_activation' as const),
      quotas: {
        maxCourses: isProOrElite ? -1 : (isStarter ? 5 : 1),
        unlimitedCourses: isProOrElite,
      },
      phone: phone.trim() || '+225 07 00 00 00',
      city: city.trim() || 'Abidjan',
      country: "Côte d'Ivoire",
      currency: 'F CFA',
      defaultCreditLimit: 20000,
      loginProvider: 'google' as const,
      kycStatus: 'unverified' as const,
      pinCode: newPin || '1234',
      masterPin: masterPinHashed,
      pinConfiguredAt: Date.now(),
      setupCompleted: true,
      credits: 15,
      createdAt: new Date().toISOString(),
    };

    // Enregistrement dans Firestore users/{uid}, stores/{resolvedStoreId} et cache local
    try {
      await saveUserProfile(uid, userProfileData);
      await updateSellerModeInFirestore(resolvedSellerMode, uid, resolvedStoreId);
    } catch (e) {
      console.warn('[FIRESTORE] Enregistrement profil en cache local :', e);
    }

    // Initialisation immédiate de l'abonnement Store (Plan sélectionné transmis)
    try {
      const targetPlan = resolvedTargetPlan;
      const initialSub = {
        status: isFreePlanInit ? ('ACTIVE' as const) : ('pending_activation' as const),
        plan: targetPlan,
        expiresAt: isFreePlanInit
          ? Date.now() + 365 * 24 * 60 * 60 * 1000
          : Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 jours d'essai en attendant le paiement
        startedAt: Date.now(),
        lastPaymentMethod: (isFreePlanInit ? 'FREE_PLG' : 'TRIAL') as any,
        lastAmountPaid: 0,
      };
      await updateStoreSubscription(resolvedStoreId, initialSub, uid, `REG-${Date.now().toString(36).toUpperCase()}`);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nana_user_plan', targetPlan);
        localStorage.setItem('nana_store_plan', targetPlan);
        localStorage.setItem('nana_store_sub', JSON.stringify(initialSub));
      }
    } catch (e) {
      console.warn('[FIRESTORE] Initialisation abonnement :', e);
    }

    const finalStoreUser: StoreUser = {
      ...userProfileData,
      avatarUrl: currentUserAuth?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    };

    setIsLoading(false);
    onLoginSuccess(finalStoreUser);
  };

  // Connexion Google rapide
  const handleGoogleSignInClick = async () => {
    playTapBeep();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        if (fbUser.displayName) setOwnerName(fbUser.displayName);
        if (fbUser.email) setEmailInput(fbUser.email);

        // Vérifier si l'utilisateur a déjà un profil Firestore avec un code PIN
        const profile = await getUserProfile(fbUser.uid);
        if ((profile?.pinCode || profile?.masterPin) && profile?.setupCompleted) {
          playCashChime();
          const resolvedMode = resolveSellerMode(
            profile.sellerMode ||
            profile.vendorType ||
            (profile.role === 'INSTRUCTOR' || profile.role === 'instructor' ? 'creator_trainer' : sellerMode)
          );
          persistSellerModeLocally(resolvedMode);
          const existingUser: StoreUser = {
            id: fbUser.uid,
            storeId: profile.storeId || fbUser.uid,
            storeUniqueId: profile.storeUniqueId,
            name: profile.name || fbUser.displayName || 'Gérant Nana',
            email: fbUser.email || 'boutiquier@nana.app',
            avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            storeName: profile.storeName || 'Ma Boutique Nana',
            role: profile.role || 'GERANT',
            vendorType: profile.vendorType || (resolvedMode === 'creator_trainer' ? 'elearning' : 'ecommerce'),
            sellerMode: resolvedMode,
            phone: profile.phone || '+225 07 00 00 00',
            city: profile.city || 'Abidjan',
            country: profile.country || "Côte d'Ivoire",
            currency: 'F CFA',
            defaultCreditLimit: 20000,
            loginProvider: 'google',
            kycStatus: profile.kycStatus || 'unverified',
            pinCode: profile.pinCode,
            masterPin: profile.masterPin,
            pinConfiguredAt: profile.pinConfiguredAt,
            credits: profile.credits !== undefined ? profile.credits : 15,
            createdAt: profile.createdAt || new Date().toISOString(),
          };
          onLoginSuccess(existingUser);
          return;
        }

        // Sinon, forcer la configuration du code PIN Maître
        setStep('PIN_SETUP');
        playValidationBeep();
      }
    } catch (err: any) {
      console.info('[FIREBASE AUTH] Poursuite avec profil personnalisé :', err);
      setErrorMessage(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-scroll-container="true"
      className="h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col relative overflow-y-auto overflow-x-hidden overscroll-y-contain font-sans pb-48 sm:pb-24"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBack();
              }}
              className="mr-1 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition active:scale-95 cursor-pointer"
              title="Retour à l'accueil"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            onClick={handleLogoTap}
            className="cursor-pointer active:scale-95 transition-transform flex items-center"
            title="Nanasore — La Voie Facile"
          >
            <NanasoreLogo variant="horizontal" size="md" theme="dark" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onContinueDemo();
          }}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer"
        >
          Mode Démo &gt;
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-start px-4 max-w-md mx-auto w-full pt-4 pb-24 sm:pb-12">
        {/* Messages d'erreur ou d'information */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {infoMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: CONNEXION EMAIL / MOT DE PASSE (ou bascule Inscription) */}
        {/* ------------------------------------------------------------- */}
        {step === 'LOGIN' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-center space-y-1.5 flex flex-col items-center">
              <NanasoreLogo variant="full" size="md" theme="dark" className="mb-1" />
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Espace Sécurisé Firebase Auth</span>
              </div>
              <h2 className="text-xl font-black text-white">Connexion à votre Tableau de Bord</h2>
              <p className="text-xs text-slate-400">Accédez à votre Quartier Général Formateur, Commerçant ou Hybride</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Adresse Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nom@boutique.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Mot de passe
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setResetEmailInput(emailInput);
                      setResetSuccessMsg(null);
                      setResetErrorMsg(null);
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-[11px] text-amber-400/90 hover:text-amber-300 transition cursor-pointer font-medium hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Se Connecter au Tableau de Bord</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                ou
              </span>
            </div>

            {/* Bouton Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow active:scale-[0.98] transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Lien bascule Inscription */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setErrorMessage(null);
                  setStep('REGISTER');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                Pas encore de compte ? <span className="underline">Créer un compte</span>
              </button>
            </div>

            {/* Bouton Accès Direct NaNa Académie Tuto 1 */}
            <div className="pt-2 text-center border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nana_open_academy', { detail: { tutorialId: 'tuto-1-gmail-signup' } }));
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-bold transition shadow-lg shadow-indigo-950/40 cursor-pointer active:scale-95 group"
                title="Suivre le tutoriel pour créer un compte Gmail officiel et démarrer sur Nanasore"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">🎬</span>
                <span>Pas encore de mail ou de compte ? Suivez ce tutoriel</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: INSCRIPTION EMAIL / MOT DE PASSE */}
        {/* ------------------------------------------------------------- */}
        {step === 'REGISTER' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-center space-y-1.5 flex flex-col items-center">
              <NanasoreLogo variant="full" size="md" theme="dark" className="mb-1" />
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {normalizePlanId(selectedPlan) === 'pro'
                    ? 'Inscription Nanasore • Formule Pro (Accès Illimité)'
                    : normalizePlanId(selectedPlan) === 'starter'
                    ? 'Inscription Nanasore • Formule Starter'
                    : 'Inscription Nanasore • Plan Gratuit (0F)'}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">Créer votre compte</h2>
              <p className="text-xs text-slate-400">Choisissez votre univers pour personnaliser votre Tableau de Bord Caméléon</p>
            </div>

            {/* Sélecteur de Profil / Modèle d'Affaires Caméléon (3 Modes) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Sélectionnez votre mode d'activité (modifiable en 1 clic à tout moment) :
              </label>
              <div className="grid grid-cols-1 gap-2">
                {/* Mode 1 : creator_trainer */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    handleSelectSellerMode('creator_trainer');
                    setRole('GERANT');
                    if (storeName === 'Alimentation de la Paix') setStoreName('Mon Académie Pro');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    sellerMode === 'creator_trainer'
                      ? 'bg-[#2563EB] border-[#2563EB] text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-blue-500/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    sellerMode === 'creator_trainer' ? 'bg-white text-[#2563EB] shadow-sm' : 'bg-slate-800 text-blue-400'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-white flex items-center justify-between gap-1">
                      <span>🎓 Je veux vendre mon savoir / Formations / Produits Digitaux &amp; Lives</span>
                      {sellerMode === 'creator_trainer' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </div>
                    <p className={`text-[10.5px] mt-0.5 ${sellerMode === 'creator_trainer' ? 'text-blue-100' : 'text-slate-400'}`}>
                      Formations 1080×1080, Ebooks, Nanasore Live OS (Quiz, Devoirs PDF, Coaching 1-to-1) &amp; Tunnels 12 Blocs
                    </p>
                  </div>
                </button>

                {/* Mode 2 : merchant_ecommerce */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    handleSelectSellerMode('merchant_ecommerce');
                    setRole('GERANT');
                    if (storeName === 'Mon Académie Pro') setStoreName('Ma Boutique E-Commerce');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    sellerMode === 'merchant_ecommerce'
                      ? 'bg-[#2563EB] border-[#2563EB] text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-blue-500/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    sellerMode === 'merchant_ecommerce' ? 'bg-white text-[#2563EB] shadow-sm' : 'bg-slate-800 text-blue-400'
                  }`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-white flex items-center justify-between gap-1">
                      <span>🛍️ Je suis Commerçant / Boutique E-Commerce &amp; Physique</span>
                      {sellerMode === 'merchant_ecommerce' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </div>
                    <p className={`text-[10.5px] mt-0.5 ${sellerMode === 'merchant_ecommerce' ? 'text-blue-100' : 'text-slate-400'}`}>
                      Boutique en ligne nsore.shop, Commandes WhatsApp, Tunnels de Vente, Lives Shopping &amp; Caisse Magasin
                    </p>
                  </div>
                </button>

                {/* Mode 3 : hybrid_all */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    handleSelectSellerMode('hybrid_all');
                    setRole('GERANT');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    sellerMode === 'hybrid_all'
                      ? 'bg-[#2563EB] border-[#2563EB] text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-blue-500/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    sellerMode === 'hybrid_all' ? 'bg-white text-[#2563EB] shadow-sm' : 'bg-slate-800 text-blue-400'
                  }`}>
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-white flex items-center justify-between gap-1">
                      <span>🚀 Mode Hybride (Commerçant + Formateur Tout-en-un)</span>
                      {sellerMode === 'hybrid_all' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </div>
                    <p className={`text-[10.5px] mt-0.5 ${sellerMode === 'hybrid_all' ? 'text-blue-100' : 'text-slate-400'}`}>
                      Vendez à la fois vos produits physiques, vos formations digitales, vos Lives et vos Tunnels sur un seul QG
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Adresse Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="votre-email@boutique.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Mot de passe (6 caractères min)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Créer mon Compte</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setErrorMessage(null);
                  setStep('LOGIN');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
              >
                Déjà inscrit ? <span className="text-blue-400 underline">Se connecter</span>
              </button>
            </div>

            {/* Bouton Accès Direct NaNa Académie Tuto 1 */}
            <div className="pt-2 text-center border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nana_open_academy', { detail: { tutorialId: 'tuto-1-gmail-signup' } }));
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-bold transition shadow-lg shadow-indigo-950/40 cursor-pointer active:scale-95 group"
                title="Suivre le tutoriel pour créer un compte Gmail officiel et démarrer sur Nanasore"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">🎬</span>
                <span>Pas encore de mail ou de compte ? Suivez ce tutoriel</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: VÉRIFICATION EMAIL OBLIGATOIRE */}
        {/* ------------------------------------------------------------- */}
        {step === 'EMAIL_VERIFICATION' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Vérification de votre Email</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Un email de confirmation vous a été envoyé à :
                <br />
                <span className="font-bold text-amber-300 font-mono">{emailInput || auth.currentUser?.email}</span>
              </p>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-400">
                Vérifiez votre boîte de réception pour activer votre compte. Cliquez sur le lien reçu puis validez ci-dessous.
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Bouton : J'ai validé mon email */}
              <button
                type="button"
                onClick={handleCheckEmailVerified}
                disabled={isCheckingEmail}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition cursor-pointer"
              >
                {isCheckingEmail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>J'ai cliqué sur le lien (Activer)</span>
                  </>
                )}
              </button>

              {/* Bouton Renvoyer l'email */}
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.98] transition cursor-pointer"
              >
                {isResending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Renvoyer l'email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  playTapBeep();
                  await logoutUser();
                  setStep('LOGIN');
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors pt-2 block mx-auto cursor-pointer"
              >
                Utiliser une autre adresse email
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: CONFIGURATION DU CODE MASTER PIN (4 À 6 CHIFFRES) */}
        {/* ------------------------------------------------------------- */}
        {step === 'PIN_SETUP' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-2 shadow-md shadow-indigo-600/20">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-black text-white">
              {pinStep === 'ENTER' ? 'Créer votre Master PIN Gérant' : 'Confirmer votre Master PIN'}
            </h2>
            <p className="text-xs text-slate-400 mb-3 max-w-xs">
              {pinStep === 'ENTER'
                ? 'Choisissez un code secret de 4 à 6 chiffres pour verrouiller les modules et actions sensibles.'
                : 'Tapez une seconde fois votre Master PIN pour confirmation.'}
            </p>

            {/* 6 Bulles indicatrices */}
            <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-slate-950 border border-slate-800 mb-3 shadow-inner">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const currentDigits = pinStep === 'ENTER' ? newPin : confirmPin;
                const isFilled = currentDigits.length > idx;
                const targetLen = pinStep === 'CONFIRM' ? newPin.length : 6;
                if (idx >= targetLen) return null;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-indigo-400 scale-125 shadow-md shadow-indigo-400/50 ring-2 ring-indigo-300/40'
                        : idx >= 4
                        ? 'bg-slate-900 border-2 border-dashed border-slate-700'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Bouton Continuer pour valider 4 ou 5 chiffres en mode ENTER */}
            {pinStep === 'ENTER' && newPin.length >= 4 && newPin.length < 6 && (
              <button
                type="button"
                onClick={handleAdvanceToConfirm}
                className="mb-3 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer animate-in fade-in transition-transform active:scale-95"
              >
                <span>Confirmer ce code ({newPin.length} chiffres)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Tactile Keypad */}
            <div className="w-full max-w-[260px] grid grid-cols-3 gap-2 mb-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigitPress(digit)}
                  className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-white font-mono font-black text-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                className="h-12 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-750 text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                Vider
              </button>
              <button
                type="button"
                onClick={() => handlePinDigitPress('0')}
                className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-white font-mono font-black text-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-12 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                &larr;
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 5: PERSONNALISATION RAPIDE DE LA BOUTIQUE */}
        {/* ------------------------------------------------------------- */}
        {step === 'STORE_PROFILE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                {sellerIntention === 'courses' ? <GraduationCap className="w-5 h-5 text-indigo-400" /> : <Store className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {sellerIntention === 'courses' ? "Profil de votre Campus & Académie" : "Profil de votre Boutique"}
                </h2>
                <p className="text-xs text-slate-400">Code PIN 4 chiffres scellé avec succès</p>
              </div>
            </div>

            <form onSubmit={handleFinalizeStoreProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  {sellerIntention === 'courses' ? <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> : <Store className="w-3.5 h-3.5 text-amber-400" />}
                  {sellerIntention === 'courses' ? "Nom du Campus / Académie" : "Nom de la Boutique"}
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={sellerIntention === 'courses' ? "Ex: Académie Digitale d'Abidjan" : "Ex: Alimentation Générale de la Paix"}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    {sellerIntention === 'courses' ? "Nom du Formateur / Directeur" : "Nom du Gérant"}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={sellerIntention === 'courses' ? "Ex: Prof. Ibrahim Konkobo" : "Ex: Amadou Diallo"}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Téléphone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    Ville
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Abidjan"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-red-400 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Devise
                  </label>
                  <div className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-bold flex items-center justify-between">
                    <span>Franc CFA</span>
                    <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">F CFA</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-[0.98] transition cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {sellerMode === 'creator_trainer'
                        ? 'Valider & Accéder à mon Tableau de Bord Formateur'
                        : sellerMode === 'hybrid_all'
                        ? 'Valider & Accéder à mon Tableau de Bord Hybride'
                        : 'Valider & Accéder à mon Tableau de Bord Commerçant'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Modal Réinitialisation du Mot de Passe (Firebase Auth) */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mot de passe oublié</h3>
                    <p className="text-[11px] text-slate-400">Réinitialisation via Firebase Auth</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowForgotPasswordModal(false);
                    setResetErrorMsg(null);
                    setResetSuccessMsg(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {resetSuccessMsg ? (
                <div className="space-y-4 py-2">
                  <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{resetSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setShowForgotPasswordModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Fermer et retourner à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetPassword} className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Saisissez votre adresse email. Un lien sécurisé vous sera envoyé pour réinitialiser votre mot de passe.
                  </p>

                  {resetErrorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{resetErrorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      Adresse Email
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      placeholder="nom@boutique.com"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setShowForgotPasswordModal(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                    >
                      {isSendingReset ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Envoyer le lien</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer légal avec défilement fluide et accès aux documents */}
      <footer className="relative z-10 w-full mt-auto pb-10 sm:pb-4">
        <LegalTickerFooter
          tickerText={legalConfig.ticker_text}
          showTicker={legalConfig.show_ticker}
          onOpenDoc={(docType) => setActiveLegalDoc(docType)}
        />
      </footer>

      {/* Modale d'affichage des textes légaux sans casser la session */}
      <LegalDocModal
        isOpen={!!activeLegalDoc}
        initialDoc={activeLegalDoc || 'LEGAL_MENTIONS'}
        onClose={() => setActiveLegalDoc(null)}
        legalConfig={legalConfig}
      />
    </div>
  );
};

export default WelcomeAuthScreen;
