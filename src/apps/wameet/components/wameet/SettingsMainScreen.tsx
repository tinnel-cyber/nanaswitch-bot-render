import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  ShieldCheck,
  Lock,
  KeyRound,
  Wallet,
  Coins,
  History,
  Store,
  RefreshCw,
  Crown,
  Flame,
  Moon,
  Sun,
  Globe,
  HardDrive,
  FileText,
  HelpCircle,
  LogOut,
  User,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Bell,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { WameetPrivacySecurityScreen } from './WameetPrivacySecurityScreen';
import { WameetWalletFinanceScreen } from './WameetWalletFinanceScreen';
import { WameetCreatorBusinessToolsScreen } from './WameetCreatorBusinessToolsScreen';
import { WameetPreferencesStorageScreen } from './WameetPreferencesStorageScreen';
import { LegalDocumentPage, LegalDocumentType } from './LegalDocumentPage';

export interface UserSettingsProfile {
  name: string;
  username: string;
  avatarUrl: string;
  isProCreator?: boolean;
  proRole?: string;
  phone?: string;
  walletBalanceFcfa?: number;
}

export interface SettingsMainScreenProps {
  currentUser?: UserSettingsProfile;
  onBack?: () => void;
  onLogout?: () => void;
  onNavigateToVipRooms?: () => void;
  onNavigateToShop?: () => void;
  className?: string;
}

/**
 * Composant Ligne de Paramètre Réutilisable (SettingsRow)
 */
export interface SettingsRowProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  badge?: string;
  badgeTone?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate';
  danger?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = React.memo(({
  icon,
  iconBgColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  title,
  subtitle,
  rightElement,
  onClick,
  badge,
  badgeTone = 'slate',
  danger = false
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
  }[badgeTone];

  return (
    <div
      onClick={() => {
        playTapBeep();
        onClick?.();
      }}
      className={`min-h-[52px] p-3.5 sm:p-4 flex items-center justify-between gap-3.5 transition-colors cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 select-none ${
        danger ? 'text-red-600' : 'text-slate-900 dark:text-white'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            danger ? 'bg-red-50 text-red-600' : iconBgColor
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`text-xs sm:text-sm font-semibold truncate ${
                danger ? 'text-red-600 font-bold' : 'text-slate-900 dark:text-white'
              }`}
            >
              {title}
            </h4>
            {badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightElement}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
});

SettingsRow.displayName = 'SettingsRow';

/**
 * Composant Groupe de Paramètres Réutilisable (SettingsGroup)
 */
export interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = React.memo(({
  title,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {title && (
        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-3">
          {title}
        </h3>
      )}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
});

SettingsGroup.displayName = 'SettingsGroup';

/**
 * PROMPT 34 : L'UI du "Main Settings Hub" (Le Menu Principal Wameet)
 * Mission : UI/UX Premium - Écran Principal des Paramètres (Wameet Settings Hub)
 * 
 * Directives UI/UX au millimètre :
 * - Layout (SettingsMainScreen) : Fond gris très clair (bg-slate-50), header fixe contenant
 *   "Paramètres et confidentialité" et une icône de retour.
 * - Barre de Recherche : Input de recherche (bg-gray-100 rounded-xl px-4 py-2) avec loupe.
 * - La Carte Profil ("Meta Center") : Bloc blanc (bg-white rounded-2xl p-4 shadow-sm mb-4) avec avatar,
 *   nom, @username, bouton "Modifier le profil" et badge doré "Créateur VIP" si pro.
 * - Groupes de Paramètres :
 *   - Groupe 1 (Compte & Sécurité) : Clé, Cadenas, Double authentification (connecté au Prompt 35).
 *   - Groupe 2 (Portefeuille & Monétisation) : Wallet, Historique Wameet, Escrow.
 *   - Groupe 3 (Outils Créateur & Business) : Boutique, NaNa POS Sync, VIP Rooms, Heatmap CRM.
 *   - Groupe 4 (Préférences & Médias) : Thème, Langue, Stockage.
 */
export const SettingsMainScreen: React.FC<SettingsMainScreenProps> = ({
  currentUser = {
    name: 'Ibrahim Traoré',
    username: 'ibrahim_traore',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isProCreator: true,
    proRole: 'Business Angel & Avocat Conseil',
    phone: '+225 07 48 92 10',
    walletBalanceFcfa: 185400
  },
  onBack,
  onLogout,
  onNavigateToVipRooms,
  onNavigateToShop,
  className = ''
}) => {
  // Navigation vers sous-écrans dédiés
  const [activeSubScreen, setActiveSubScreen] = useState<
    | 'main'
    | 'privacy_security'
    | 'legal_terms'
    | 'legal_privacy'
    | 'edit_profile'
    | 'wallet_finance'
    | 'creator_tools'
    | 'preferences_storage'
  >('main');

  // Recherche rapide de réglage
  const [searchQuery, setSearchQuery] = useState('');

  // États de préférences rapides
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'FR' | 'EN' | 'WO' | 'DY'>('FR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBack = () => {
    playTapBeep();
    if (activeSubScreen !== 'main') {
      setActiveSubScreen('main');
    } else if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  // Filtrage des éléments si recherche active
  const hasSearch = searchQuery.trim().length > 0;
  const q = searchQuery.toLowerCase();

  const matches = (text: string) => {
    if (!hasSearch) return true;
    return text.toLowerCase().includes(q);
  };

  // =========================================================================
  // ROUTAGE VERS SOUS-ÉCRANS SPÉCIALISÉS (PROMPTS 33, 35, 36, 37 & 38)
  // =========================================================================
  if (activeSubScreen === 'preferences_storage') {
    return <WameetPreferencesStorageScreen onBack={() => setActiveSubScreen('main')} />;
  }

  if (activeSubScreen === 'creator_tools') {
    return (
      <WameetCreatorBusinessToolsScreen
        onBack={() => setActiveSubScreen('main')}
        onNavigateToVipRooms={onNavigateToVipRooms}
      />
    );
  }

  if (activeSubScreen === 'wallet_finance') {
    return (
      <WameetWalletFinanceScreen
        initialBalance={currentUser.walletBalanceFcfa || 145000}
        onBack={() => setActiveSubScreen('main')}
      />
    );
  }

  if (activeSubScreen === 'privacy_security') {
    return <WameetPrivacySecurityScreen onBack={() => setActiveSubScreen('main')} />;
  }

  if (activeSubScreen === 'legal_terms') {
    return (
      <LegalDocumentPage
        initialDocument="terms"
        onBack={() => setActiveSubScreen('main')}
      />
    );
  }

  if (activeSubScreen === 'legal_privacy') {
    return (
      <LegalDocumentPage
        initialDocument="privacy"
        onBack={() => setActiveSubScreen('main')}
      />
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] selection:bg-blue-100 selection:text-blue-900 ${className}`}
    >
      {/* Toast de notification flottante */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle transform-gpu will-change-transform">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. HEADER FIXE AVEC FLÈCHE RETOUR (44x44 TAP TARGET) & SAFE AREA TOP
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 flex items-center gap-2">
        {/* FIXED: Zone de frappe tactile 44x44 standard */}
        <button
          type="button"
          onClick={handleBack}
          className="w-11 h-11 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
            Paramètres et confidentialité
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            Centre de gestion du compte Wameet & Services NaNa
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* =====================================================================
            2. BARRE DE RECHERCHE RAPIDE AVEC CONTRASTE ÉLEVÉ
           ===================================================================== */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un paramètre (sécurité, portefeuille, thème...)"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-150 focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Effacer
            </button>
          )}
        </div>

        {/* =====================================================================
            3. CARTE PROFIL STYLE "META ACCOUNTS CENTER" (DARK MODE READY)
           ===================================================================== */}
        {!hasSearch && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            {/* Halo subtil bleu */}
            <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 blur-2xl rounded-full" />

            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-blue-600/30 shadow-md"
                  />
                  {currentUser.isProCreator && (
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-md"
                      title="Créateur VIP Certifié"
                    >
                      <Crown className="w-3 h-3 fill-slate-950" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </h2>
                    {currentUser.isProCreator && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                        <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                        Créateur VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    @{currentUser.username}
                  </p>
                  {currentUser.phone && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      {currentUser.phone}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  showToast('Éditeur de profil Wameet ouvert.');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                Modifier le profil
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            4. GROUPE 1 : COMPTE & SÉCURITÉ (CLÉ, CADENAS, 2FA)
           ===================================================================== */}
        {(matches('sécurité') ||
          matches('confidentialité') ||
          matches('compte') ||
          matches('2fa') ||
          matches('chiffrement') ||
          matches('appareils')) && (
          <SettingsGroup title="Compte & Sécurité">
            <SettingsRow
              icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
              iconBgColor="bg-emerald-50"
              title="Confidentialité & Sécurité du Compte"
              subtitle="Visibilité en ligne, double-ticks, chiffrement et 2FA"
              badge="Wameet Style"
              badgeTone="emerald"
              onClick={() => setActiveSubScreen('privacy_security')}
            />

            <SettingsRow
              icon={<KeyRound className="w-5 h-5 text-blue-600" />}
              iconBgColor="bg-blue-50"
              title="Vérification en deux étapes (2FA Wameet)"
              subtitle="Code PIN à 6 chiffres pour sécuriser vos retraits d'argent"
              badge="Recommandé"
              badgeTone="blue"
              onClick={() => setActiveSubScreen('privacy_security')}
            />

            <SettingsRow
              icon={<Lock className="w-5 h-5 text-amber-600" />}
              iconBgColor="bg-amber-50"
              title="Chiffrement & Sessions Wameet Web"
              subtitle="Gérer les ordinateurs et navigateurs connectés"
              onClick={() => setActiveSubScreen('privacy_security')}
            />
          </SettingsGroup>
        )}

        {/* =====================================================================
            5. GROUPE 2 : PORTEFEUILLE & MONÉTISATION WAMEET
           ===================================================================== */}
        {(matches('portefeuille') ||
          matches('wallet') ||
          matches('wameet') ||
          matches('argent') ||
          matches('solde') ||
          matches('escrow') ||
          matches('tontine')) && (
          <SettingsGroup title="Portefeuille & Monétisation">
            <SettingsRow
              icon={<Wallet className="w-5 h-5 text-blue-600" />}
              iconBgColor="bg-blue-50"
              title="Portefeuille Numérique Wameet"
              subtitle="Solde disponible pour abonnements et micro-relais"
              rightElement={
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                  {currentUser.walletBalanceFcfa?.toLocaleString('fr-FR')} FCFA
                </span>
              }
              onClick={() => setActiveSubScreen('wallet_finance')}
            />

            <SettingsRow
              icon={<History className="w-5 h-5 text-purple-600" />}
              iconBgColor="bg-purple-50"
              title="Historique des Transactions & Reçus"
              subtitle="Abonnements VIP, micro-relais et achats sécurisés"
              onClick={() => setActiveSubScreen('wallet_finance')}
            />

            <SettingsRow
              icon={<Coins className="w-5 h-5 text-amber-600" />}
              iconBgColor="bg-amber-50"
              title="Contrats Smart Escrow & Tontines Flash"
              subtitle="Paiements sous séquestre garantis jusqu'à livraison"
              badge="OHADA"
              badgeTone="amber"
              onClick={() => setActiveSubScreen('wallet_finance')}
            />
          </SettingsGroup>
        )}

        {/* =====================================================================
            6. GROUPE 3 : OUTILS CRÉATEUR & BUSINESS (NANA POS, VIP ROOMS)
           ===================================================================== */}
        {(matches('créateur') ||
          matches('business') ||
          matches('nana') ||
          matches('pos') ||
          matches('vip') ||
          matches('lms') ||
          matches('boutique') ||
          matches('crm') ||
          matches('heatmap')) && (
          <SettingsGroup title="Outils Créateur & Business">
            <SettingsRow
              icon={<Crown className="w-5 h-5 text-amber-600" />}
              iconBgColor="bg-amber-50"
              title="Espaces VIP (Salles de Cours & Salons)"
              subtitle="Gérer vos abonnés, vos masterclass et cercles d'affaires"
              badge="VIP Hub"
              badgeTone="amber"
              onClick={() => setActiveSubScreen('creator_tools')}
            />

            <SettingsRow
              icon={<RefreshCw className="w-5 h-5 text-emerald-600" />}
              iconBgColor="bg-emerald-50"
              title="Synchronisation NaNa POS Studio"
              subtitle="Pont M2M en temps réel vers votre caisse physique"
              badge="Connecté"
              badgeTone="emerald"
              onClick={() => setActiveSubScreen('creator_tools')}
            />

            <SettingsRow
              icon={<Store className="w-5 h-5 text-indigo-600" />}
              iconBgColor="bg-indigo-50"
              title="Mini-Boutique & Catalogue Phygital"
              subtitle="Gérer les produits épinglés lors de vos Lives Wameet"
              onClick={() => {
                if (onNavigateToShop) onNavigateToShop();
                else showToast('Ouverture de votre boutique Wameet.');
              }}
            />

            <SettingsRow
              icon={<Flame className="w-5 h-5 text-orange-600" />}
              iconBgColor="bg-orange-50"
              title="Heatmap CRM & Score de Chaleur"
              subtitle="Détection des prospects chauds et intentions d'achat"
              badge="IA"
              badgeTone="purple"
              onClick={() => showToast('Moteur Heat Score actif sur 48 prospects.')}
            />
          </SettingsGroup>
        )}

        {/* =====================================================================
            7. GROUPE 4 : PRÉFÉRENCES & MÉDIAS
           ===================================================================== */}
        {(matches('thème') ||
          matches('langue') ||
          matches('stockage') ||
          matches('médias') ||
          matches('notifications')) && (
          <SettingsGroup title="Préférences & Médias">
            <SettingsRow
              icon={isDarkMode ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
              iconBgColor={isDarkMode ? 'bg-indigo-50' : 'bg-amber-50'}
              title="Apparence du Thème"
              subtitle={isDarkMode ? 'Mode Sombre activé' : 'Mode Clair (Recommandé)'}
              rightElement={
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {isDarkMode ? 'Sombre' : 'Clair'}
                </span>
              }
              onClick={() => setActiveSubScreen('preferences_storage')}
            />

            <SettingsRow
              icon={<Globe className="w-5 h-5 text-cyan-600" />}
              iconBgColor="bg-cyan-50"
              title="Langue de l'application"
              subtitle="Français, Anglais, Dioula, Mooré, Wolof..."
              rightElement={
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {currentLanguage}
                </span>
              }
              onClick={() => setActiveSubScreen('preferences_storage')}
            />

            <SettingsRow
              icon={<HardDrive className="w-5 h-5 text-indigo-600" />}
              iconBgColor="bg-indigo-50"
              title="Stockage et Données Réseau"
              subtitle="Cache vidéo, audios et téléchargement automatique"
              badge="Cache 450 Mo"
              badgeTone="purple"
              onClick={() => setActiveSubScreen('preferences_storage')}
            />
          </SettingsGroup>
        )}

        {/* =====================================================================
            8. GROUPE 5 : DOCUMENTATION LÉGALE & AIDE
           ===================================================================== */}
        {(matches('cgu') ||
          matches('conditions') ||
          matches('confidentialité') ||
          matches('légal') ||
          matches('aide') ||
          matches('déconnexion')) && (
          <SettingsGroup title="Informations Légales & Assistance">
            <SettingsRow
              icon={<FileText className="w-5 h-5 text-slate-600" />}
              iconBgColor="bg-slate-100"
              title="Conditions d'utilisation (CGU)"
              subtitle="Règles d'utilisation et cadre contractuel OHADA"
              onClick={() => setActiveSubScreen('legal_terms')}
            />

            <SettingsRow
              icon={<ShieldCheck className="w-5 h-5 text-slate-600" />}
              iconBgColor="bg-slate-100"
              title="Politique de Confidentialité"
              subtitle="Protection des données personnelles et RGPD local"
              onClick={() => setActiveSubScreen('legal_privacy')}
            />

            <SettingsRow
              icon={<HelpCircle className="w-5 h-5 text-blue-600" />}
              iconBgColor="bg-blue-50"
              title="Centre d'Aide & Support Client 24/7"
              subtitle="Poser une question à notre équipe à Abidjan/Dakar"
              onClick={() => showToast('Support Wameet disponible 24/7 via Chat.')}
            />

            <SettingsRow
              icon={<LogOut className="w-5 h-5 text-red-600" />}
              iconBgColor="bg-red-50 text-red-600"
              title="Se déconnecter"
              subtitle="Fermer la session sur cet appareil"
              danger={true}
              onClick={() => {
                playTapBeep();
                if (onLogout) onLogout();
                else showToast('Déconnexion effectuée.');
              }}
            />
          </SettingsGroup>
        )}

        {/* Pied de page institutionnel Wameet */}
        <div className="pt-4 text-center text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-500">Wameet SupraApp v3.2.0 • Build 2026</p>
          <p>Conçu pour l'excellence phygitale panafricaine.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsMainScreen;
