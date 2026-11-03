import React, { useState, useEffect, useCallback } from 'react';
import { 
  Video, 
  Globe, 
  Radio, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  Settings, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  Sparkles, 
  Lock,
  Layers,
  ArrowUpRight,
  Sliders,
  Check
} from 'lucide-react';
import { IntegrationProvider, InstructorIntegrationConfig } from '../../../../../types';
import { getInstructorIntegrations, disconnectInstructorIntegration } from '../../../../../services/externalIntegrationsService';
import { IntegrationConfigModal } from './IntegrationConfigModal';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface ExternalIntegrationsHubProps {
  instructorId?: string;
  className?: string;
}

export const ExternalIntegrationsHub: React.FC<ExternalIntegrationsHubProps> = ({
  instructorId = 'instructor-default',
  className = ''
}) => {
  const [integrations, setIntegrations] = useState<Record<IntegrationProvider, InstructorIntegrationConfig> | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<IntegrationProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  const loadIntegrations = async () => {
    setIsLoading(true);
    const data = await getInstructorIntegrations(instructorId);
    setIntegrations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadIntegrations();
  }, [instructorId]);

  const handleOpenConfig = (provider: IntegrationProvider) => {
    playTapBeep();
    setSelectedProviderForModal(provider);
  };

  const handleSaveSuccess = (updated: InstructorIntegrationConfig) => {
    setIntegrations(prev => prev ? { ...prev, [updated.provider]: updated } : null);
    setActiveNotification(`Intégration ${updated.provider} synchronisée avec succès !`);
    setTimeout(() => setActiveNotification(null), 3500);
  };

  const handleDisconnectSuccess = (provider: IntegrationProvider) => {
    setIntegrations(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [provider]: {
          ...prev[provider],
          status: 'DISCONNECTED'
        }
      };
    });
    setActiveNotification(`Intégration ${provider} déconnectée.`);
    setTimeout(() => setActiveNotification(null), 3500);
  };

  const CARDS_DATA: {
    provider: IntegrationProvider;
    title: string;
    description: string;
    category: string;
    features: string[];
    gradient: string;
    borderGlow: string;
    badgeColor: string;
    icon: React.ReactNode;
  }[] = [
    {
      provider: 'ZOOM',
      title: 'Zoom Video Conferencing',
      description: 'Planifiez des masterclass et leçons en direct dans votre cursus avec génération automatique de liens et enregistrement cloud.',
      category: 'Visioconférence & Replay',
      features: ['Génération auto de liens & PIN', 'Enregistrement Cloud Zoom', 'Webhooks de fin de cours'],
      gradient: 'from-blue-600/20 via-slate-900 to-slate-950',
      borderGlow: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: <Video className="w-6 h-6 text-blue-400" />
    },
    {
      provider: 'JITSI',
      title: 'Jitsi Meet (Open-Source)',
      description: 'Visioconférence 100% intégrée en Iframe native dans le Campus Virtuel. Compatible avec meet.jit.si ou votre serveur privé.',
      category: 'Iframe Native Sans Redirection',
      features: ['Incrusté dans le lecteur de classe', 'Zéro limite de temps', 'Auto-hébergement possible'],
      gradient: 'from-cyan-600/20 via-slate-900 to-slate-950',
      borderGlow: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      icon: <Radio className="w-6 h-6 text-cyan-400" />
    },
    {
      provider: 'GOOGLE_MEET',
      title: 'Google Meet',
      description: 'Créez des espaces de réunion Google Meet instantanés et sécurisés pour vos séances individuelles et coaching collectifs.',
      category: 'Google Workspace',
      features: ['Codes réunions dynamiques', 'Sécurité Google Workspace', 'Lien d\'accès 1-clic étudiant'],
      gradient: 'from-emerald-600/20 via-slate-900 to-slate-950',
      borderGlow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: <Globe className="w-6 h-6 text-emerald-400" />
    },
    {
      provider: 'GOOGLE_CLASSROOM',
      title: 'Google Classroom',
      description: 'Synchronisez vos cohortes d\'étudiants, devoirs à rendre et annonces de formation directement avec Google Classroom.',
      category: 'LMS Sync & Cohortes',
      features: ['Publication de devoirs synchronisée', 'Import de listes d\'élèves', 'Notations croisées'],
      gradient: 'from-amber-600/20 via-slate-900 to-slate-950',
      borderGlow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: <BookOpen className="w-6 h-6 text-amber-400" />
    }
  ];

  return (
    <div className={`space-y-6 max-w-7xl mx-auto w-full ${className}`}>
      {/* Toast de confirmation */}
      {activeNotification && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/60 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{activeNotification}</span>
        </div>
      )}

      {/* Bannière Header Cyber-Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black">
              <Zap className="w-3.5 h-3.5" />
              <span>EXTERNAL INTEGRATIONS APP STORE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Hub d'Intégrations Externes & Visioconférence
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Connectez vos outils préférés (<strong className="text-white">Zoom</strong>, <strong className="text-white">Jitsi Meet</strong>, <strong className="text-white">Google Classroom</strong>, <strong className="text-white">Google Meet</strong>) directement au studio de création de cours et aux leçons en direct de vos étudiants.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Sécurité des Données
              </span>
              <span className="text-xs font-black text-emerald-400">
                Clés chiffrées côté serveur
              </span>
            </div>
          </div>
        </div>

        {/* Effet lumineux décoratif d'arrière-plan */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grille des Connecteurs (App Store Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {CARDS_DATA.map((card) => {
          const config = integrations ? integrations[card.provider] : null;
          const isConnected = config?.status === 'CONNECTED';

          return (
            <div
              key={card.provider}
              className={`p-6 rounded-3xl bg-gradient-to-b ${card.gradient} border border-slate-800/90 shadow-xl transition-all duration-200 flex flex-col justify-between gap-5 ${card.borderGlow}`}
            >
              {/* En-tête de la carte */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
                      {card.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">{card.title}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{card.category}</span>
                    </div>
                  </div>

                  {/* Statut Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black border flex items-center gap-1.5 shrink-0 ${
                    isConnected 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{isConnected ? 'Connecté' : 'Non configuré'}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {card.description}
                </p>

                {/* Badges de fonctionnalités */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {card.features.map((feat, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[10.5px] font-semibold text-slate-300 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-indigo-400" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Pied de la carte */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {isConnected && config?.accountEmail ? (
                    <span className="text-slate-300 font-mono text-[10.5px]">
                      {config.accountEmail}
                    </span>
                  ) : (
                    <span>Configuration API &amp; OAuth</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenConfig(card.provider)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isConnected
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{isConnected ? 'Configurer' : 'Connecter'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de configuration dynamique */}
      {selectedProviderForModal && (
        <IntegrationConfigModal
          isOpen={!!selectedProviderForModal}
          provider={selectedProviderForModal}
          currentConfig={integrations ? integrations[selectedProviderForModal] : undefined}
          instructorId={instructorId}
          onClose={() => setSelectedProviderForModal(null)}
          onSaveSuccess={handleSaveSuccess}
          onDisconnectSuccess={handleDisconnectSuccess}
        />
      )}
    </div>
  );
};

export default ExternalIntegrationsHub;
