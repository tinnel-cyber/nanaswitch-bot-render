import React, { useState, useEffect, useCallback } from 'react';
import { PrivacyPolicyConfig } from '../../types';
import { getPrivacyPolicy, savePrivacyPolicy } from '../../utils/firestoreService';
import { Shield, X, Edit3, Check, RefreshCw, Lock } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  adminName?: string;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  canEdit = false,
  adminName = 'Super-Admin',
}) => {
  const [policy, setPolicy] = useState<PrivacyPolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getPrivacyPolicy()
      .then((data) => {
        setPolicy(data);
        setEditedContent(data.content);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!policy) return;
    playTapBeep();
    setSaving(true);
    try {
      const updated: PrivacyPolicyConfig = {
        ...policy,
        content: editedContent,
        lastUpdated: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        updatedBy: adminName,
      };
      await savePrivacyPolicy(updated);
      setPolicy(updated);
      setIsEditing(false);
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur sauvegarde politique :', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 relative my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Politique de Confidentialité & Mentions Légales
              </h3>
              <p className="text-[11px] text-slate-400">
                Nanasore • Protection des Données & Conformité RGPD / OHADA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsEditing(true);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-300 leading-relaxed pr-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span>Chargement des mentions légales...</span>
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
                Mode Éditeur Super-Admin : Vous pouvez ajuster les clauses de confidentialité et conditions générales de vente affichées à vos marchands.
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={16}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-blue-500 leading-relaxed"
              />
            </div>
          ) : (
            <div className="prose prose-invert prose-xs max-w-none space-y-3">
              <div className="text-[11px] text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Dernière révision : {policy?.lastUpdated || '12 Septembre 2026'}</span>
                <span>Version {policy?.version || '1.2'}</span>
              </div>
              
              <div className="whitespace-pre-wrap leading-relaxed text-slate-200">
                {policy?.content}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 text-[11px]">
            © 2026 Nanasore. Tous droits réservés.
          </span>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
