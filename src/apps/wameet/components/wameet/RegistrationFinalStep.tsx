import React, { useState } from 'react';
import {
  User,
  AtSign,
  ShieldCheck,
  CheckCircle2,
  Camera,
  ArrowRight,
  Sparkles,
  Lock,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface RegistrationFinalStepFormData {
  fullName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  verifiedPhoneNumber?: string;
  isLegalAccepted: boolean;
}

export interface RegistrationFinalStepProps {
  verifiedPhoneNumber?: string;
  initialData?: Partial<RegistrationFinalStepFormData>;
  onSubmit: (formData: RegistrationFinalStepFormData) => Promise<void> | void;
  onCancel?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  className?: string;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
];

/**
 * PROMPT 31 : L'UI de la Case à Cocher (Fin d'Inscription Wameet)
 * Mission : UI/UX de l'Écran de Finalisation d'Inscription
 * 
 * Directives UI/UX au millimètre :
 * - La Case à Cocher (Checkbox) : Juste au-dessus du grand bouton de validation "Créer mon compte",
 *   carré discret (w-4 h-4 border border-gray-300 rounded-sm focus:ring-blue-500 text-blue-600).
 * - Le Texte Légal : À côté de la case, texte très fin et lisible (text-[11px] text-gray-500 leading-tight).
 * - Contenu : "En créant un compte, j'accepte les Conditions d'utilisation et la Politique de confidentialité de Wameet."
 * - Interactions : Les mots en gras/spécifiés sont des liens cliquables (text-blue-600 cursor-pointer hover:underline)
 *   qui ouvrent les pages légales dans une modale ou via un callback.
 * - Validation : Le bouton "Créer mon compte" reste grisé/désactivé (disabled, opacity-50) tant que la case n'est pas cochée.
 */
export const RegistrationFinalStep: React.FC<RegistrationFinalStepProps> = ({
  verifiedPhoneNumber = '+226 70 00 12 34',
  initialData,
  onSubmit,
  onCancel,
  onNavigateToTerms,
  onNavigateToPrivacy,
  className = ''
}) => {
  // 1. États du formulaire de finalisation
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    initialData?.avatarUrl || DEFAULT_AVATARS[0]
  );

  // 2. État obligatoire d'acceptation légale (Prompt 31)
  const [isLegalAccepted, setIsLegalAccepted] = useState(
    initialData?.isLegalAccepted || false
  );

  // 3. États UX
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 4. État de la modale légale intégrée
  const [activeLegalModal, setActiveLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);

  const handleUsernameChange = (val: string) => {
    // Normalise le pseudo : minuscules, chiffres, underscores
    const clean = val.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase();
    setUsername(clean);
  };

  const handleToggleLegal = () => {
    playTapBeep();
    setIsLegalAccepted((prev) => !prev);
    if (validationError) setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setValidationError('Veuillez renseigner votre nom complet.');
      return;
    }

    if (!username.trim() || username.length < 3) {
      setValidationError('Veuillez choisir un identifiant @pseudo d’au moins 3 caractères.');
      return;
    }

    if (!isLegalAccepted) {
      setValidationError('Veuillez cocher la case d’acceptation légale pour créer votre compte.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    playValidationBeep();

    try {
      await onSubmit({
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatarUrl: selectedAvatar,
        verifiedPhoneNumber,
        isLegalAccepted
      });
    } catch (err: any) {
      setValidationError(err?.message || 'Une erreur est survenue lors de la création de votre compte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTerms = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playTapBeep();
    if (onNavigateToTerms) {
      onNavigateToTerms();
    } else {
      setActiveLegalModal('TERMS');
    }
  };

  const openPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playTapBeep();
    if (onNavigateToPrivacy) {
      onNavigateToPrivacy();
    } else {
      setActiveLegalModal('PRIVACY');
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-y-auto text-gray-900 ${className}`}>
      {/* =====================================================================
          HEADER : TITRE ET NUMÉRO VÉRIFIÉ
         ===================================================================== */}
      <div className="p-6 pb-4 bg-gradient-to-b from-blue-50/70 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-black text-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Finaliser mon profil
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Dernière étape avant d'entrer sur Wameet
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Badge Numéro Téléphone Vérifié */}
        {verifiedPhoneNumber && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{verifiedPhoneNumber}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              Vérifié par SMS
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          FORMULAIRE PRINCIPAL
         ===================================================================== */}
      <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-4">
        {validationError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. Sélection de la photo de profil */}
        <div className="flex items-center gap-4 py-1">
          <div className="relative group shrink-0">
            <img
              src={selectedAvatar}
              alt="Avatar sélectionné"
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-600 ring-offset-2 shadow-md"
            />
            <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-700">Photo de profil</p>
            <p className="text-[11px] text-gray-400">Choisissez un avatar ou importez</p>
            <div className="flex items-center gap-1.5 mt-2">
              {DEFAULT_AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedAvatar(av);
                  }}
                  className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedAvatar === av
                      ? 'border-blue-600 scale-105 shadow-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="Option" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Nom complet */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Nom complet ou Raison commerciale *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex : Ibrahim Traoré ou Boutique Moderne"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* 3. Identifiant / Pseudo Wameet */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-700">
              Identifiant Wameet (@pseudo) *
            </label>
            <span className="text-[10px] text-gray-400">Unique sur le réseau</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600 font-black text-xs">
              @
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="ibrahim_traore"
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all font-mono"
            />
          </div>
        </div>

        {/* 4. Bio courte optionnelle */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Statut / Bio courte <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex : Commerçant import-export, Dakar & Abidjan"
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-gray-800 placeholder-gray-400 outline-none transition-all"
          />
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 31 : LA CASE À COCHER LÉGALE AU MILLIMÈTRE
            Position : Juste au-dessus du grand bouton de validation
           ===================================================================== */}
        <div className="pt-2 pb-1">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-200/60 transition-colors hover:bg-gray-50">
            {/* La case à cocher personnalisée */}
            <input
              type="checkbox"
              id="wameet-legal-consent"
              checked={isLegalAccepted}
              onChange={handleToggleLegal}
              className="w-4 h-4 border border-gray-300 rounded-sm focus:ring-blue-500 text-blue-600 cursor-pointer mt-0.5 shrink-0"
            />

            {/* Le texte légal très fin et lisible */}
            <label
              htmlFor="wameet-legal-consent"
              className="text-[11px] text-gray-500 leading-tight cursor-pointer select-none"
            >
              En créant un compte, j'accepte les{' '}
              <span
                onClick={openTerms}
                role="button"
                tabIndex={0}
                className="font-bold text-blue-600 cursor-pointer hover:underline"
              >
                Conditions d'utilisation
              </span>{' '}
              et la{' '}
              <span
                onClick={openPrivacy}
                role="button"
                tabIndex={0}
                className="font-bold text-blue-600 cursor-pointer hover:underline"
              >
                Politique de confidentialité
              </span>{' '}
              de Wameet.
            </label>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 31 : LE GRAND BOUTON DE VALIDATION "CRÉER MON COMPTE"
            Règle : Reste grisé/désactivé (disabled, opacity-50) tant que la case n'est pas cochée
           ===================================================================== */}
        <button
          type="submit"
          disabled={!isLegalAccepted || isSubmitting}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            !isLegalAccepted || isSubmitting
              ? 'opacity-50 cursor-not-allowed bg-blue-600/70 shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/25 cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Création du compte en cours...</span>
            </>
          ) : (
            <>
              <span>Créer mon compte</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Chiffrement de bout en bout Wameet & Conformité Régionale OHADA
          </p>
        </div>
      </form>

      {/* =====================================================================
          MODALE DE CONSULTATION DES DOCUMENTS LÉGAUX (TERMS & PRIVACY)
         ===================================================================== */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la modale légale */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {activeLegalModal === 'TERMS'
                      ? "Conditions Générales d'Utilisation (CGU)"
                      : 'Politique de Confidentialité & Données'}
                  </h3>
                  <p className="text-[11px] text-gray-500">Wameet Panafricain • Version 2026</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du texte juridique */}
            <div className="p-5 overflow-y-auto text-xs text-gray-600 space-y-3.5 leading-relaxed scrollbar-thin">
              {activeLegalModal === 'TERMS' ? (
                <>
                  <p className="font-bold text-gray-800">1. Objet et Champ d'Application</p>
                  <p>
                    Les présentes Conditions régissent l'accès et l'utilisation de l'écosystème Wameet,
                    incluant les services de messagerie sécurisée, les Espaces VIP (Salles de cours et Salons d'affaires)
                    ainsi que les transactions financières opérées via Wameet.
                  </p>

                  <p className="font-bold text-gray-800">2. Règles des Espaces VIP & Masterclass</p>
                  <p>
                    L'accès aux Salles VIP d'Éducation et aux Salons d'Affaires est strictement réservé aux titulaires
                    d'abonnements valides. Tout partage d'identifiants, duplication de supports de cours (PDF, vidéos) ou
                    divulgation d'analyses confidentielles entraîne la suspension immédiate du compte sans remboursement.
                  </p>

                  <p className="font-bold text-gray-800">3. Engagements du Membre & Secret des Affaires</p>
                  <p>
                    Les échanges au sein des Salons d'Affaires sont régis par une obligation de stricte confidentialité.
                    Les accords et requêtes de financement soumis sur les Tableaux de Réseau constituent des informations privilégiées.
                  </p>

                  <p className="font-bold text-gray-800">4. Transactions et Comptes Séquestres</p>
                  <p>
                    Les règlements d'abonnements et de consultations 1-to-1 sont traités de manière sécurisée par Wameet
                    selon les normes financières de la zone UEMOA/CEMAC.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-800">1. Collecte et Finalité des Données</p>
                  <p>
                    Wameet collecte votre numéro de téléphone et les informations de profil indispensables
                    à l'authentification et à la synchronisation sécurisée de vos contacts. Vos données ne sont jamais
                    vendues à des tiers publicitaires.
                  </p>

                  <p className="font-bold text-gray-800">2. Chiffrement et Sécurité</p>
                  <p>
                    Les visioconférences privées 1-to-1 et les flux de cours bénéficient d'un chiffrement de bout en bout.
                    Les pièces jointes confidentielles partagées dans les salons d'affaires sont stockées sur des infrastructures
                    souveraines sécurisées.
                  </p>

                  <p className="font-bold text-gray-800">3. Vos Droits</p>
                  <p>
                    Conformément aux réglementations sur la protection des données personnelles, vous disposez d'un droit
                    permanent d'accès, de rectification et d'effacement de vos données sur simple demande dans les paramètres
                    de votre compte Wameet.
                  </p>
                </>
              )}
            </div>

            {/* Pied de la modale avec bouton "Accepter et fermer" */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">
                Lecture recommandée avant inscription
              </span>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setIsLegalAccepted(true);
                  setActiveLegalModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
              >
                J'ai lu et j'accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationFinalStep;
