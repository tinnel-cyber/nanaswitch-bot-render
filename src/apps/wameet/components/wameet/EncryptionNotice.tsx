import React, { useState } from 'react';
import { Lock, ShieldCheck, Key, CheckCircle2, X } from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export interface EncryptionNoticeProps {
  /**
   * Classe CSS additionnelle pour personnaliser l'enveloppe
   */
  className?: string;
  /**
   * Permet d'activer une modale explicative au clic pour les utilisateurs curieux
   */
  interactive?: boolean;
  /**
   * Identifiant optionnel de la discussion pour afficher l'empreinte de sécurité
   */
  chatId?: string;
}

/**
 * PROMPT 32 : Le Sceau de Chiffrement dans le Chat (Message Gris)
 * Mission : UI/UX du "Security Trust Badge" dans l'écran de Chat (Wameet)
 * 
 * Directives UI/UX au millimètre :
 * - Positionnement : Tout en haut de la conversation (flex flex-col items-center justify-center my-6 px-4).
 * - Design (Discret et Subtil) :
 *   - Petite icône de cadenas fermé dorée ou jaune pâle (Lock de lucide-react, w-3 h-3 text-yellow-600/80 mb-1).
 *   - Texte "pas trop visible", très petit, gris et centré (text-[10px] text-gray-400/80 text-center max-w-[280px] leading-relaxed).
 * - Contenu Exact :
 *   "Vos messages et transactions sont chiffrés de bout en bout."
 *   "Personne en dehors de ce chat, pas même Wameet, ne peut les lire ou les écouter."
 *   "Votre vie privée est absolue."
 * - Comportement : Au survol (hover), le texte devient légèrement plus lisible (hover:text-gray-500 transition-colors).
 */
export const EncryptionNotice: React.FC<EncryptionNoticeProps> = ({
  className = '',
  interactive = true,
  chatId
}) => {
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const handleClick = () => {
    if (!interactive) return;
    playTapBeep();
    setShowSecurityModal(true);
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={`flex flex-col items-center justify-center my-6 px-4 group select-none ${
          interactive ? 'cursor-pointer' : ''
        } ${className}`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        title={interactive ? 'Cliquez pour afficher les garanties de chiffrement' : undefined}
      >
        {/* Encart discret avec micro-fond jaune pâle / ambre très doux */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-amber-500/[0.04] dark:bg-yellow-500/[0.03] border border-amber-500/10 group-hover:border-amber-500/25 group-hover:bg-amber-500/[0.07] transition-all duration-300 max-w-[320px]">
          {/* Petite icône de cadenas fermé dorée ou jaune pâle */}
          <Lock className="w-3 h-3 text-yellow-600/80 mb-1 shrink-0 group-hover:text-yellow-600 transition-colors" />

          {/* Texte très fin, discret, gris et centré */}
          <p className="text-[10px] text-gray-400/80 group-hover:text-gray-500 transition-colors text-center max-w-[280px] leading-relaxed font-normal">
            Vos messages et transactions sont chiffrés de bout en bout. Personne en dehors de ce chat,
            pas même Wameet, ne peut les lire ou les écouter. Votre vie privée est absolue.
          </p>
        </div>
      </div>

      {/* =====================================================================
          MODALE EXPLICATIVE DE SÉCURITÉ AU CLIC (TRANSPARENCE CRYPTOGRAPHIQUE)
         ===================================================================== */}
      {showSecurityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in text-gray-900"
          onClick={() => setShowSecurityModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-yellow-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900">
                    Chiffrement de Bout en Bout
                  </h4>
                  <p className="text-[10px] text-gray-500">Protocole Wameet Double Ratchet</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-2.5 leading-relaxed">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Vos échanges, vocaux, photos et transactions Wameet sont chiffrés sur votre appareil avant envoi.
                </span>
              </div>

              <p className="text-[11px] text-gray-500">
                Seuls vous et votre interlocuteur possédez les clés privées nécessaires pour déchiffrer les messages.
                Aucun serveur intermédiaire ni administrateur ne peut intercepter vos conversations.
              </p>

              {chatId && (
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[10px] text-gray-500 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-yellow-600" /> Empreinte de session
                  </span>
                  <span className="font-bold text-gray-700">{chatId.slice(0, 12)}...</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors shadow-sm"
              >
                Compris & Sécurisé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EncryptionNotice;
