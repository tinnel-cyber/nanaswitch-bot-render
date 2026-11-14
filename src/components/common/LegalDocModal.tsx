import React, { useState, useCallback } from 'react';
import { PlatformLegalConfig } from '../../types';
import { playTapBeep } from '../../utils/audio';
import { 
  FileText, 
  ShieldCheck, 
  X, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  ExternalLink 
} from 'lucide-react';

interface LegalDocModalProps {
  isOpen: boolean;
  initialDoc?: 'LEGAL_MENTIONS' | 'PRIVACY_POLICY';
  onClose: () => void;
  legalConfig?: PlatformLegalConfig | null;
}

export const LegalDocModal: React.FC<LegalDocModalProps> = ({
  isOpen,
  initialDoc = 'LEGAL_MENTIONS',
  onClose,
  legalConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'LEGAL_MENTIONS' | 'PRIVACY_POLICY'>(initialDoc);

  // Synchronise avec la demande d'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialDoc);
    }
  }, [isOpen, initialDoc]);

  if (!isOpen) return null;

  const contentToDisplay =
    activeTab === 'LEGAL_MENTIONS'
      ? legalConfig?.legal_mentions_content || 'Mentions Légales en cours de chargement...'
      : legalConfig?.privacy_policy_content || 'Politique de Confidentialité en cours de chargement...';

  const docTitle =
    activeTab === 'LEGAL_MENTIONS'
      ? 'Mentions Légales & Identification Éditeur'
      : 'Politique de Confidentialité & Données Marchandes';

  const handlePrint = () => {
    playTapBeep();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête avec onglets */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                {activeTab === 'LEGAL_MENTIONS' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">
                  {docTitle}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Nanasore</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3 h-3" />
                    Mise à jour : {legalConfig?.lastUpdated || 'Septembre 2026'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Onglets de sélection */}
          <div className="flex items-center gap-2 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('LEGAL_MENTIONS');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'LEGAL_MENTIONS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mentions Légales</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('PRIVACY_POLICY');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'PRIVACY_POLICY'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Confidentialité & Données</span>
            </button>
          </div>
        </div>

        {/* Corps du texte (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {contentToDisplay.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-base sm:text-lg font-black text-white border-b border-slate-800 pb-2">
                  {paragraph.replace('# ', '')}
                </h1>
              );
            }
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-sm sm:text-base font-extrabold text-white text-blue-400 pt-2">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            return (
              <p key={idx} className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Pied de la modale */}
        <div className="shrink-0 px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95"
          >
            Fermer la fenêtre
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDocModal;
