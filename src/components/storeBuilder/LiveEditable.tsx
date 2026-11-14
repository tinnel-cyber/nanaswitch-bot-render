import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, Sliders, Sparkles, Image as ImageIcon } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

export interface LiveEditableProps {
  label: string;
  value?: any;
  field?: string; // Nom de la propriété dans draftThemeConfig (ex: 'heroTitle', 'subBanner1.title')
  sectionId?: string; // ID de la section custom (ex: sec.id dans ThemeBlankCustom)
  sectionField?: string; // Nom du champ dans la section (ex: 'title', 'subtitle', 'heroTitle', 'badgeText')
  targetAccordion?: number; // Accordéon Studio correspondant (1: Brand, 2: Hero, 3: Offres, 4: Footer)
  type?: 'text' | 'textarea' | 'image' | 'color';
  children: React.ReactNode;
  className?: string;
  isInline?: boolean;
  isAdminPreview?: boolean;
  onValueChange?: (newValue: any) => void;
}

export const LiveEditable: React.FC<LiveEditableProps> = ({
  label,
  value,
  field,
  sectionId,
  sectionField,
  targetAccordion,
  type = 'text',
  children,
  className = '',
  isInline = false,
  isAdminPreview,
  onValueChange
}) => {
  // Détection stricte de l'environnement d'administration preview
  const isEffectiveAdmin = Boolean(
    isAdminPreview ??
    (typeof window !== 'undefined' && ((window as any).isAdminPreview || (window as any).__isAdminPreview))
  );

  // Si on est en mode client / public nsore.shop : AUCUN instrument, rendu pur 100% propre
  if (!isEffectiveAdmin) {
    return <>{children}</>;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [currentVal, setCurrentVal] = useState<string>(value !== undefined && value !== null ? String(value) : '');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Synchronisation avec la valeur externe
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setCurrentVal(String(value));
    }
  }, [value]);

  // Fermeture par la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    setIsOpen(true);
  };

  const handleInputChange = (newVal: string) => {
    setCurrentVal(newVal);
    onValueChange?.(newVal);

    if (typeof window !== 'undefined') {
      if (sectionId) {
        // Mise à jour temps réel d'un module/blueprint Architect OS
        window.dispatchEvent(
          new CustomEvent('nana_update_section_content', {
            detail: {
              sectionId,
              field: sectionField || field || 'title',
              value: newVal
            }
          })
        );
      } else if (field) {
        // Mise à jour temps réel d'un champ du thème Studio
        window.dispatchEvent(
          new CustomEvent('nana_update_theme_field', {
            detail: {
              field,
              value: newVal
            }
          })
        );
      }
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    playValidationBeep();
    setIsOpen(false);
  };

  const handleOpenInspector = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    setIsOpen(false);

    if (typeof window !== 'undefined') {
      if (sectionId) {
        window.dispatchEvent(
          new CustomEvent('nana_configure_custom_section', {
            detail: { sectionId }
          })
        );
      } else if (targetAccordion !== undefined) {
        window.dispatchEvent(
          new CustomEvent('nana_open_customizer_accordion', {
            detail: { accordionIndex: targetAccordion }
          })
        );
      }
    }
  };

  const Tag = isInline ? 'span' : 'div';

  return (
    <Tag
      className={`group/live-field relative transition-all duration-150 ${
        isInline ? 'inline-block' : 'block'
      } hover:outline hover:outline-2 hover:outline-dashed hover:outline-blue-500/90 hover:rounded hover:bg-blue-500/5 cursor-pointer ${className}`}
      onClick={handleTriggerClick}
      title={`Cliquer pour modifier directement "${label}" en temps réel (0ms)`}
    >
      {/* Badge flottant au survol avec crayon d'édition */}
      <span className="opacity-0 group-hover/live-field:opacity-100 transition-opacity duration-150 absolute -top-3 -right-2 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-lg flex items-center gap-1 select-none pointer-events-none border border-blue-400/50 backdrop-blur-sm scale-95">
        <Edit3 className="w-2.5 h-2.5 text-blue-200" />
        <span>{label}</span>
      </span>

      {/* Contenu visuel d'origine */}
      {children}

      {/* Popover d'édition directe en temps réel (0ms) */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-lg bg-slate-950 text-white border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Entête du popover */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{label}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Temps Réel 0ms</span>
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Modifiez ce champ instantanément. La modification se reflète en direct sur votre vitrine.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps d'édition */}
            <div className="space-y-3">
              {type === 'textarea' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Texte / Description :
                  </label>
                  <textarea
                    autoFocus
                    rows={4}
                    value={currentVal}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={`Saisissez le contenu pour ${label}...`}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none transition font-sans resize-y"
                  />
                </div>
              ) : type === 'image' ? (
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    URL de l'image / Bannière :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      autoFocus
                      value={currentVal}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                  {currentVal && (
                    <div className="w-full h-32 rounded-xl border border-slate-800 overflow-hidden bg-slate-900 flex items-center justify-center relative">
                      <img
                        src={currentVal}
                        alt="Aperçu direct"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 right-2 text-[9px] bg-black/70 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                        Aperçu direct
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Valeur du champ :
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={currentVal}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={`Saisissez la valeur pour ${label}...`}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-medium"
                  />
                </div>
              )}
            </div>

            {/* Pied du popover avec actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              {(sectionId || targetAccordion !== undefined) && (
                <button
                  type="button"
                  onClick={handleOpenInspector}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700/60 flex items-center gap-1.5 transition cursor-pointer"
                  title="Ouvrir tous les réglages détaillés dans la barre latérale"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Inspecteur Complet</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Valider & Terminer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Tag>
  );
};

export default LiveEditable;
