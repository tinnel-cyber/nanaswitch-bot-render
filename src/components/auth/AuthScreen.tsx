import React, { useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  GraduationCap, 
  Store, 
  Rocket,
  ShieldCheck, 
  Percent, 
  Bot, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { loginWithEmail, registerWithEmail, signInWithGoogle } from '../../services/supabaseAuthService';
import { supabase } from '../../lib/supabase';
import { Logo } from '../common/Logo';
import { SellerMode } from '../../types';
import { resolveSellerMode, persistSellerModeLocally } from '../../utils/planFeatures';

export interface AuthScreenProps {
  role?: 'teacher' | 'merchant' | 'admin';
  onBack?: () => void;
  onSuccess?: (user?: { email: string; name: string; role: string; sellerMode?: SellerMode }) => void;
  defaultMode?: 'login' | 'register';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  role = 'teacher',
  onBack,
  onSuccess,
  defaultMode = 'login',
}) => {
  // État bascule entre Connexion et Inscription
  const [isSignUp, setIsSignUp] = useState<boolean>(defaultMode === 'register');
  const [sellerMode, setSellerMode] = useState<SellerMode>(() =>
    role === 'teacher' ? 'creator_trainer' : resolveSellerMode()
  );
  
  // Champs de saisie
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // États de traitement & retour utilisateur
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isTeacher = sellerMode === 'creator_trainer' || (role === 'teacher' && sellerMode !== 'merchant_ecommerce');

  const handleModeSelect = useCallback((mode: SellerMode) => {
    playTapBeep();
    setSellerMode(mode);
    persistSellerModeLocally(mode);
  }, []);

  // Textes inspirants selon le rôle
  const leftInspiringTitle = isTeacher
    ? "Rejoignez l'élite des formateurs. Créez votre campus virtuel aujourd'hui."
    : "Rejoignez l'élite du commerce moderne. Bâtissez votre empire omnicanal aujourd'hui.";

  const leftDescription = isTeacher
    ? "Bâtissez vos formations en marque blanche stricte sous votre propre nom de domaine. Profitez de syllabus visuels nodulaires, d'évaluations automatisées par IA et de la certification infalsifiable par QR Code."
    : "Pilotez votre boutique en ligne, vos tunnels de vente, vos sessions Live Shopping 1-to-1 et vos encaissements instantanés avec 0% de commission prélevée sur votre chiffre d'affaires.";

  const ctaSubmitText = isSignUp
    ? (sellerMode === 'creator_trainer'
        ? "Accéder à mon Tableau de Bord Formateur"
        : sellerMode === 'hybrid_all'
        ? "Accéder à mon Tableau de Bord Hybride"
        : "Accéder à mon Tableau de Bord Commerçant")
    : "Se connecter au Tableau de Bord";

  // Soumission du formulaire Email / Mot de passe
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    // Validations préliminaires
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage("Veuillez saisir une adresse email valide.");
      playCancelSound();
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      playCancelSound();
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setErrorMessage(isTeacher ? "Veuillez saisir votre nom ou le nom de votre académie." : "Veuillez renseigner votre nom complet.");
      playCancelSound();
      return;
    }

    setIsLoading(true);
    playTapBeep();

    try {
      let resolvedName = fullName.trim() || (isTeacher ? "Prof. Formateur Nanasore" : "Commerçant Nanasore");

      if (isSignUp) {
        const userCred = await registerWithEmail(email.trim(), password, resolvedName, sellerMode);
        if (userCred?.displayName) {
          resolvedName = userCred.displayName;
        }

        setInfoMessage("Compte créé avec succès ! Veuillez vérifier votre boîte de réception pour confirmer votre compte.");
        persistSellerModeLocally(sellerMode);

        if (userCred?.id) {
          try {
            await supabase.from('profiles').upsert({
              id: userCred.id,
              email: email.trim(),
              full_name: resolvedName,
              role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch {}
        }

        setTimeout(() => {
          setIsLoading(false);
          playValidationBeep();
          if (onSuccess) {
            onSuccess({
              email: email.trim(),
              name: resolvedName,
              role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
              sellerMode
            });
          }
        }, 800);
      } else {
        const userCred = await loginWithEmail(email.trim(), password);
        if (userCred?.displayName) {
          resolvedName = userCred.displayName;
        }

        persistSellerModeLocally(sellerMode);
        if (userCred?.id) {
          try {
            await supabase.from('profiles').update({
              role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT'
            }).eq('id', userCred.id);
          } catch {}
        }

        setTimeout(() => {
          setIsLoading(false);
          playValidationBeep();
          if (onSuccess) {
            onSuccess({
              email: email.trim(),
              name: resolvedName,
              role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
              sellerMode
            });
          }
        }, 800);
      }

    } catch (err: any) {
      setIsLoading(false);
      playCancelSound();
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'authentification.");
    }
  };

  // Authentification via Google Supabase
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    playTapBeep();

    try {
      let resolvedEmail = isTeacher ? "formateur@google.nanasore.ci" : "commercant@google.nanasore.ci";
      let resolvedName = isTeacher ? "Prof. Ibrahim Konkobo" : "Commerçant Nanasore";

      const userCred = await signInWithGoogle();
      if (userCred) {
        if (userCred.email) resolvedEmail = userCred.email;
        if (userCred.displayName) resolvedName = userCred.displayName;
        if (userCred.id) {
          try {
            await supabase.from('profiles').upsert({
              id: userCred.id,
              email: resolvedEmail,
              full_name: resolvedName,
              role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT'
            }, { onConflict: 'id' });
          } catch {}
        }
      }

      persistSellerModeLocally(sellerMode);

      setTimeout(() => {
        setIsLoading(false);
        playValidationBeep();
        if (onSuccess) {
          onSuccess({
            email: resolvedEmail,
            name: resolvedName,
            role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
            sellerMode
          });
        }
      }, 800);

    } catch (err: any) {
      setIsLoading(false);
      playCancelSound();
      setErrorMessage(err?.message || "Connexion Google interrompue.");
    }
  };

  return (
    <div
      data-scroll-container="true"
      className="h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex flex-col lg:grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 font-sans overflow-y-auto lg:overflow-hidden selection:bg-indigo-600 selection:text-white"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      
      {/* ===================================================================== */}
      {/* MOITIÉ GAUCHE : SPLIT SCREEN DESKTOP (IMAGE / GRADIENT SOMBRE & LOGO) */}
      {/* ===================================================================== */}
      <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-slate-950 text-white select-none border-r border-slate-800/80">
        
        {/* Halos d'ambiance et gradient cyber */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />

        {/* 1. Haut : Logo Nanasore & Badge Univers */}
        <div className="relative z-10 flex items-center gap-4">
          <Logo size="2xl" darkBackground accentColor="text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {isTeacher ? 'Campus v2.4' : 'Commerce v2.4'}
          </span>
        </div>

        {/* 2. Centre : Phrase Inspirante & Piliers Technologiques */}
        <div className="relative z-10 space-y-8 my-auto py-12 max-w-xl">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{isTeacher ? "Espace Enseignement Supérieur & Formations" : "Espace Retail & Commerce Connecté"}</span>
          </div>

          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-white leading-tight">
            {isTeacher ? (
              <>
                Rejoignez l'élite des formateurs.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                  Créez votre campus virtuel aujourd'hui.
                </span>
              </>
            ) : (
              <>
                Rejoignez l'élite du commerce moderne.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Bâtissez votre empire omnicanal aujourd'hui.
                </span>
              </>
            )}
          </h1>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
            {leftDescription}
          </p>

          {/* Grille de badges d'excellence */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Marque Blanche 100%</div>
                <div className="text-[10px] text-slate-400 truncate">Votre domaine & identité</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">0% de Commission</div>
                <div className="text-[10px] text-slate-400 truncate">100% de vos gains directs</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Intelligence Artificielle</div>
                <div className="text-[10px] text-slate-400 truncate">Quiz et corrections auto</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Certificats QR-Code</div>
                <div className="text-[10px] text-slate-400 truncate">Diplômes infalsifiables</div>
              </div>
            </div>
          </div>

        </div>

        {/* 3. Bas : Témoignage & Preuve Sociale */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white">
                IK
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white">
                AD
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white">
                SK
              </div>
            </div>
            <span>
              Plus de <strong className="text-white font-bold">1 850 formateurs</strong> actifs en Afrique & Diaspora
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant Partitionné</span>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* MOITIÉ DROITE : FORMULAIRE D'AUTHENTIFICATION SUR FOND BLANC ÉPURÉ   */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col justify-start p-6 sm:p-10 lg:p-14 bg-white dark:bg-slate-900 min-h-[100dvh] h-auto relative overflow-y-auto overflow-x-hidden pb-48 sm:pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {/* Barre Supérieure : Bouton Retour à l'accueil (ArrowLeft) */}
        <div className="w-full flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (onBack) {
                onBack();
              } else if (typeof window !== 'undefined') {
                window.history.back();
              }
            }}
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Revenir à l'accueil"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Retour à l'accueil</span>
          </button>

          {/* Badge mobile indiquant la marque et le rôle */}
          <div className="lg:hidden flex items-center gap-2">
            <Logo size="sm" accentColor="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {isTeacher ? 'Campus' : 'POS'}
            </span>
          </div>
        </div>

        {/* Conteneur Déroulant du Formulaire */}
        <div className="w-full max-w-md mx-auto py-4 sm:py-6">
          
          {/* En-tête du formulaire */}
          <div className="text-left mb-8">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-3">
              {isSignUp ? "Nouvelle Inscription" : "Connexion Sécurisée"}
            </span>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isSignUp 
                ? (isTeacher ? "Créez votre Campus Virtuel" : "Créez votre Espace Commerçant")
                : (isTeacher ? "Accédez à votre Campus" : "Accédez à votre Boutique")}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {isSignUp 
                ? "Rejoignez l'élite des créateurs et formateurs. Déployez vos programmes en toute autonomie."
                : "Renseignez vos identifiants pour accéder directement à votre tableau de bord de gestion."}
            </p>
          </div>

          {/* Messages d'erreur ou d'information */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-3 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{infoMessage}</div>
            </div>
          )}

          {/* Sélecteur de Mode Caméléon 1-Clic */}
          <div className="mb-5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Choisissez votre mode de Tableau de Bord :
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleModeSelect('creator_trainer')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  sellerMode === 'creator_trainer'
                    ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]'
                }`}
              >
                <span className="text-base">🎓</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold leading-snug">
                    Je veux vendre mon savoir / Formations / Produits Digitaux &amp; Lives
                  </div>
                </div>
                {sellerMode === 'creator_trainer' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('merchant_ecommerce')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  sellerMode === 'merchant_ecommerce'
                    ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]'
                }`}
              >
                <span className="text-base">🛍️</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold leading-snug">
                    Je suis Commerçant / Boutique E-Commerce &amp; Physique
                  </div>
                </div>
                {sellerMode === 'merchant_ecommerce' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('hybrid_all')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  sellerMode === 'hybrid_all'
                    ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]'
                }`}
              >
                <span className="text-base">🚀</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold leading-snug">
                    Mode Hybride (Commerçant + Formateur Tout-en-un)
                  </div>
                </div>
                {sellerMode === 'hybrid_all' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
              </button>
            </div>
          </div>

          {/* 1. Bouton "Continuer avec Google" (Design Premium) */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleAuth}
            className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
          >
            {/* Logo officiel Google en SVG vectoriel précis */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          {/* 2. Séparateur Stylisé */}
          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-4 bg-white dark:bg-slate-900 text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
              ou avec votre email
            </span>
          </div>

          {/* 3. Formulaire Email & Mot de Passe */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Nom (visible uniquement en mode Inscription) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTeacher ? "Nom du Formateur / Académie" : "Nom & Prénom"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isTeacher ? "Prof. Ibrahim Konkobo" : "Amadou Diallo"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse Email Professionnelle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTeacher ? "formateur@moncampus.com" : "contact@maboutique.ci"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm shadow-sm"
                />
              </div>
            </div>

            {/* Mot de Passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                {!isSignUp && (
                  <a
                    href="/reset-password"
                    onClick={(e) => {
                      playTapBeep();
                      // Laisser la navigation par défaut vers /reset-password
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </a>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Bouton Principal de Validation (avec Spinner 1s) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isSignUp ? "Création du campus en cours..." : "Connexion au tableau de bord..."}</span>
                </>
              ) : (
                <>
                  {isSignUp ? <Sparkles className="w-4 h-4 text-amber-300" /> : <ArrowRight className="w-4 h-4 text-white" />}
                  <span>{ctaSubmitText}</span>
                </>
              )}
            </button>

          </form>

          {/* 5. Toggle Bascule "Connexion" vs "Inscription" */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            {isSignUp ? (
              <p>
                Vous avez déjà un compte formateur ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setErrorMessage(null);
                    setInfoMessage(null);
                    setIsSignUp(false);
                  }}
                  className="font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                >
                  Se connecter
                </button>
              </p>
            ) : (
              <p>
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setErrorMessage(null);
                    setInfoMessage(null);
                    setIsSignUp(true);
                  }}
                  className="font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                >
                  Créer un compte Formateur
                </button>
              </p>
            )}

            {/* Bouton Accès Direct NaNa Académie Tuto 1 */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
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

          {/* Rassurance de sécurité */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chiffrement TLS 256 bits • Données cloisonnées</span>
          </div>

        </div>

        {/* Pied de page du formulaire */}
        <div className="w-full text-center text-[11px] text-slate-400 pt-4">
          <span>© 2026 Nanasore Technologies Inc. Tous droits réservés.</span>
        </div>

      </div>

    </div>
  );
};

export default AuthScreen;
