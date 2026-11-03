import React, { useState, useCallback } from 'react';
import { 
  Eye, 
  Smartphone, 
  Monitor, 
  Save, 
  Sparkles, 
  Layers, 
  Palette, 
  CheckCircle, 
  Play, 
  Star, 
  Users, 
  Award, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Course } from '../../../../../types';

interface StorefrontBlock {
  id: string;
  type: 'HERO' | 'CURRICULUM' | 'INSTRUCTOR' | 'TESTIMONIALS' | 'PRICING' | 'FAQ';
  title: string;
  subtitle?: string;
  enabled: boolean;
  content: Record<string, any>;
}

interface VisualStorefrontBuilderProps {
  course: Course;
  onSave: (courseUpdated: Course) => void;
  onClose?: () => void;
}

const DEFAULT_BLOCKS: StorefrontBlock[] = [
  {
    id: 'block-hero',
    type: 'HERO',
    title: 'Bannière d\'Impact & Inscription Immédiate',
    enabled: true,
    content: {
      headline: 'Maîtrisez les Passerelles de Paiement Mobile Money & USSD',
      tagline: 'La formation certifiante la plus demandée par les banques et fintechs de la zone UEMOA.',
      ctaText: 'Rejoindre la Promotion Immédiatement',
      badgeText: 'Certification Officielle Incluse',
      bgGlow: 'from-emerald-600/30 to-teal-600/10'
    }
  },
  {
    id: 'block-curriculum',
    type: 'CURRICULUM',
    title: 'Programme Détaillé & Modules Pratiques',
    enabled: true,
    content: {
      showModuleDetails: true,
      highlightVoiceSim: true
    }
  },
  {
    id: 'block-instructor',
    type: 'INSTRUCTOR',
    title: 'Votre Mentor & Réputation',
    enabled: true,
    content: {
      bio: 'Plus de 10 ans d\'expérience dans l\'architecture bancaire et le déploiement de commutateurs de paiement en Afrique de l\'Ouest.',
      credentials: 'Ex-Lead Architect Wave & UBA'
    }
  },
  {
    id: 'block-testimonials',
    type: 'TESTIMONIALS',
    title: 'Retours d\'Expérience & Diplômés',
    enabled: true,
    content: {
      rating: 4.9,
      reviewsCount: 142
    }
  },
  {
    id: 'block-pricing',
    type: 'PRICING',
    title: 'Paiement Sécurisé Mobile Money 1-Clic',
    enabled: true,
    content: {
      installmentsAllowed: true,
      supportedProviders: ['ORANGE_MONEY', 'WAVE', 'MOOV_MONEY', 'MTN_MOMO']
    }
  }
];

export const VisualStorefrontBuilder: React.FC<VisualStorefrontBuilderProps> = ({
  course,
  onSave,
  onClose
}) => {
  const [blocks, setBlocks] = useState<StorefrontBlock[]>(DEFAULT_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEFAULT_BLOCKS[0].id);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#10b981'); // Emerald
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBlocks(updated);
  };

  const toggleBlockStatus = (id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b))
    );
  };

  const updateBlockContent = (id: string, key: string, val: any) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, [key]: val } } : b
      )
    );
  };

  const handleSaveStorefront = () => {
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
    onSave(course);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <div className="p-3.5 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                Éditeur Visuel de Page de Vente (Storefront)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden sm:inline">
                Native Elementor Killer
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              {course.title}
            </p>
          </div>
        </div>

        {/* View Mode & Save Actions */}
        <div className="flex items-center gap-2.5">
          {/* Device toggle */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setDevicePreview('desktop')}
              className={`p-1.5 rounded-lg transition ${
                devicePreview === 'desktop'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Aperçu Ordinateur"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`p-1.5 rounded-lg transition ${
                devicePreview === 'mobile'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Aperçu Mobile 60 FPS"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSaveStorefront}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavedAlert ? 'Enregistré !' : 'Publier la Page'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Blocks Manager & Customizer (Scrollable) */}
        <div className="w-full lg:w-96 bg-slate-900/60 border-r border-slate-800 flex flex-col h-full overflow-hidden">
          {/* Blocks List Tab */}
          <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Blocs de Conversion ({blocks.length})
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer opacity-0 absolute"
                title="Couleur Principale"
              />
            </div>
          </div>

          {/* Scrollable Block List */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 touch-pan-y custom-scrollbar">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedBlockId === block.id
                    ? 'bg-slate-800/90 border-emerald-500/70 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                    <span className="text-xs font-bold text-white">{block.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(idx, 'down');
                      }}
                      disabled={idx === blocks.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBlockStatus(block.id);
                      }}
                      className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        block.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {block.enabled ? 'Actif' : 'Masqué'}
                    </button>
                  </div>
                </div>

                {/* Inline Quick Editor if selected */}
                {selectedBlockId === block.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2 text-xs">
                    {block.type === 'HERO' && (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Titre d'accroche</label>
                          <input
                            type="text"
                            value={block.content.headline || ''}
                            onChange={(e) => updateBlockContent(block.id, 'headline', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Texte du Bouton CTA</label>
                          <input
                            type="text"
                            value={block.content.ctaText || ''}
                            onChange={(e) => updateBlockContent(block.id, 'ctaText', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                          />
                        </div>
                      </>
                    )}
                    {block.type === 'INSTRUCTOR' && (
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">Bio Formateur</label>
                        <textarea
                          value={block.content.bio || ''}
                          onChange={(e) => updateBlockContent(block.id, 'bio', e.target.value)}
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Storefront Canvas (Scrollable) */}
        <div className="flex-1 bg-slate-950/90 flex flex-col items-center justify-start overflow-y-auto overscroll-contain p-4 sm:p-8 touch-pan-y custom-scrollbar">
          <div
            className={`transition-all duration-300 w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl ${
              devicePreview === 'mobile' ? 'max-w-sm my-4 max-h-[85vh] overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar' : 'max-w-4xl'
            }`}
          >
            {/* Mock Browser Header */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[10px] text-slate-500">nana.academy/course/{course.id}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>

            {/* Rendered Live Storefront Preview */}
            <div className="divide-y divide-slate-800/80">
              {blocks.filter((b) => b.enabled).map((block) => {
                if (block.type === 'HERO') {
                  return (
                    <div
                      key={block.id}
                      className="p-6 sm:p-12 text-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950"
                    >
                      <div className="max-w-2xl mx-auto space-y-4 relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Award className="w-3.5 h-3.5" />
                          {block.content.badgeText || 'Certification Incluse'}
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                          {block.content.headline || course.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                          {block.content.tagline || course.description}
                        </p>
                        <div className="pt-2">
                          <button
                            className="px-6 py-3 rounded-2xl font-extrabold text-slate-950 text-sm shadow-xl transition hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {block.content.ctaText || 'Rejoindre la Promotion'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (block.type === 'CURRICULUM') {
                  return (
                    <div key={block.id} className="p-6 sm:p-10 space-y-4">
                      <div className="text-center max-w-xl mx-auto mb-6">
                        <h3 className="text-lg sm:text-xl font-bold text-white">Programme de la Formation</h3>
                        <p className="text-xs text-slate-400 mt-1">Conçu pour un apprentissage pratique orienté marché.</p>
                      </div>

                      <div className="space-y-2">
                        {course.modules.slice(0, 3).map((mod, idx) => (
                          <div key={mod.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white">{mod.title}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">{mod.lessons.length} leçons</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (block.type === 'PRICING') {
                  return (
                    <div key={block.id} className="p-6 sm:p-10 text-center bg-slate-950/40">
                      <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tarif d'Accès Complet</h4>
                        <div className="text-3xl font-black text-white">
                          {course.price?.toLocaleString()} <span className="text-emerald-400 text-lg">FCFA</span>
                        </div>
                        <p className="text-xs text-slate-400">Accès à vie, mises à jour, communauté Social Campus et certificat vérifié.</p>
                        <button
                          className="w-full py-3.5 rounded-2xl font-black text-slate-950 text-sm shadow-xl"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Payer par Mobile Money (Wave, Orange, Moov, MTN)
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualStorefrontBuilder;
