import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Droplets, Check, Palette } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { playTapBeep } from '../../utils/audio';

export interface ThemeSwitcherProps {
  variant?: 'dropdown' | 'pills' | 'icon-only';
  className?: string;
  showLabels?: boolean;
}

interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorPreview: string; // Style CSS preview ou classe
  badgeColor: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Sombre',
    description: 'Ambiance Nuit & OLED',
    icon: Moon,
    colorPreview: 'bg-[#070b14] border-slate-700 text-white',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'light',
    name: 'Pur Blanc',
    description: 'Contraste net & Moderne',
    icon: Sun,
    colorPreview: 'bg-white border-slate-300 text-slate-900',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'blue',
    name: 'Pur Bleu',
    description: 'Signature Brand Tech',
    icon: Droplets,
    colorPreview: 'bg-[#0a192f] border-blue-600 text-blue-100',
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
  showLabels = true,
}) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le menu lors d'un clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  const handleSelectTheme = (newTheme: ThemeMode) => {
    playTapBeep();
    setTheme(newTheme);
    setIsOpen(false);
  };

  // 1. Variante "pills" : 3 boutons segmented côte à côte
  if (variant === 'pills') {
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-xl bg-card border border-theme shadow-xs transition-colors ${className}`}
        role="group"
        aria-label="Sélecteur de thème"
      >
        {THEME_OPTIONS.map((opt) => {
          const isSelected = theme === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectTheme(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-body hover:bg-card-hover'
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--brand-primary)' : undefined,
                color: isSelected ? '#ffffff' : undefined,
              }}
              title={opt.description}
            >
              <Icon className="w-3.5 h-3.5" />
              {showLabels && <span>{opt.name}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Variante "icon-only" : bouton rapide qui cycle entre les 3 thèmes au clic
  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          toggleTheme();
        }}
        className={`relative p-2 rounded-xl border border-theme bg-card hover:bg-card-hover text-body transition-all duration-200 cursor-pointer active:scale-95 shadow-xs ${className}`}
        title={`Thème actif : ${activeOption.name} (Cliquer pour basculer)`}
        aria-label="Basculer le thème"
      >
        <ActiveIcon className="w-4 h-4 text-brand-primary" style={{ color: 'var(--brand-primary)' }} />
      </button>
    );
  }

  // 3. Variante "dropdown" (Par Défaut) : Bouton élégant avec popover des 3 thèmes
  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          setIsOpen((prev) => !prev)}
        }
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-theme bg-card hover:bg-card-hover text-body text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group shrink-0 min-h-[36px]"
        title={`Thème actuel : ${activeOption.name}. Cliquez pour changer (Sombre / Blanc Pur / Pur Bleu)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div
          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${activeOption.badgeColor}`}
        >
          <ActiveIcon className="w-3.5 h-3.5" />
        </div>
        {showLabels && (
          <span className="hidden sm:inline font-semibold text-[11px] text-body">
            {activeOption.name}
          </span>
        )}
        <Palette className="w-3 h-3 text-muted ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Menu déroulant flottant des 3 thèmes */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-secondary border border-theme shadow-2xl p-2 z-[99999] animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2.5 py-1.5 mb-1 border-b border-theme/60 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              Apparence & Couleurs
            </span>
            <span className="text-[10px] font-bold text-muted bg-card px-1.5 py-0.5 rounded-md border border-theme">
              3 Modes
            </span>
          </div>

          <div className="space-y-1">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectTheme(opt.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-card border border-theme shadow-xs ring-1 ring-blue-500/30'
                      : 'hover:bg-card/70 border border-transparent'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-xs shrink-0 ${opt.colorPreview}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-body font-black' : 'text-body'}`}>
                        {opt.name}
                      </span>
                      <span className="text-[10px] text-muted truncate">
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ml-1 shadow-xs"
                      style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-1.5 border-t border-theme/50 px-2 flex items-center justify-between text-[10px] text-muted">
            <span>Persistant (SSR sans flash)</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Nanasore UX</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
