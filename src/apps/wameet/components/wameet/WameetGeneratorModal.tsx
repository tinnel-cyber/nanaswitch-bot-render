import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Lightbulb,
  Video,
  Copy,
  Check,
  Send,
  ShoppingBag,
  Zap,
  Bot
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
  creatorName?: string;
  onGenerateSuccess?: (generatedContent: {
    type: 'affiche' | 'idee' | 'reel';
    text: string;
    mediaUrl?: string;
  }) => void;
}

export const WameetGeneratorModal: React.FC<WameetGeneratorModalProps> = ({
  isOpen,
  onClose,
  creatorId = '@createur',
  creatorName = 'Créateur',
  onGenerateSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'affiche' | 'idee' | 'reel'>('idee');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'convivial' | 'vendeur' | 'inspirant' | 'expert'>('convivial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setIsGenerating(true);
    setGeneratedResult(null);

    // Simulation de génération IA instantanée adaptée au créateur ciblé
    setTimeout(() => {
      let result = '';
      const targetTag = creatorId.startsWith('@') ? creatorId : `@${creatorId}`;

      if (activeTab === 'affiche') {
        result = `🎨 CONCEPT D'AFFICHE POUR ${targetTag.toUpperCase()}\n\n` +
          `📢 Titre Accrocheur : "${prompt.trim() || 'L\'Excellence à votre portée avec ' + creatorName}"\n` +
          `✨ Sous-titre : Solutions premium & accompagnement personnalisé.\n` +
          `🎯 Call To Action : "Réservez votre place dès ce soir sur Wameet VIP !"\n` +
          `🏷️ Hashtags : #WameetAffaires #Innovation #BusinessAfrique`;
      } else if (activeTab === 'reel') {
        result = `🎬 SCRIPT REEL WAMEET POUR ${targetTag.toUpperCase()}\n\n` +
          `⏱️ [0-3s Hook] : "Tu fais encore cette erreur fatale dans ton business ? Regarde ça !"\n` +
          `💡 [3-15s Valeur] : "${prompt.trim() || 'Voici les 3 étapes éprouvées que nous appliquons avec ' + creatorName + ' pour multiplier vos ventes.'}"\n` +
          `🚀 [15-25s Action] : "Clique sur le lien en bio ou viens discuter directement sur mon Guichet Wameet !"`;
      } else {
        result = `💡 IDÉE BUSINESS & PITCH STRATÉGIQUE (${targetTag})\n\n` +
          `🎯 Problématique Ciblée : Résoudre les freins d'achat immédiats.\n` +
          `🔥 Proposition de Valeur : "${prompt.trim() || 'Offre groupée exclusive pour la communauté Wameet.'}"\n` +
          `📊 Modèle Économique : Vente flash avec paiement mobile instantané (Orange Money / Moov / Wave).\n` +
          `🤝 Partenariat suggéré avec le créateur : ${creatorName} (${targetTag}).`;
      }

      setGeneratedResult(result);
      setIsGenerating(false);
      playValidationBeep();
    }, 900);
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    playTapBeep();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseInFeed = () => {
    if (!generatedResult) return;
    if (onGenerateSuccess) {
      onGenerateSuccess({
        type: activeTab,
        text: generatedResult
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Charte Bleu Royal (#4169E1) & Blanc */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4169E1] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Wameet AI Studio</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#4169E1]/10 text-[#4169E1] text-[10px] font-black uppercase tracking-wider">
                  Générateur
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Créateur ciblé :</span>
                <span className="font-bold text-[#4169E1] bg-blue-50 px-2 py-0.5 rounded-md">
                  {creatorId.startsWith('@') ? creatorId : `@${creatorId}`}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer active:scale-95"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Sélecteur de type de publication */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Que souhaitez-vous générer pour {creatorName} ?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('idee');
                }}
                className={`p-3 rounded-2xl border text-left transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  activeTab === 'idee'
                    ? 'border-[#4169E1] bg-blue-50/50 text-[#4169E1] shadow-sm ring-1 ring-[#4169E1]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <Lightbulb className="w-5 h-5" />
                <span className="text-xs font-black">Idée Business</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('affiche');
                }}
                className={`p-3 rounded-2xl border text-left transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  activeTab === 'affiche'
                    ? 'border-[#4169E1] bg-blue-50/50 text-[#4169E1] shadow-sm ring-1 ring-[#4169E1]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs font-black">Affiche Pub</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('reel');
                }}
                className={`p-3 rounded-2xl border text-left transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reel'
                    ? 'border-[#4169E1] bg-blue-50/50 text-[#4169E1] shadow-sm ring-1 ring-[#4169E1]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <Video className="w-5 h-5" />
                <span className="text-xs font-black">Script Reel</span>
              </button>
            </div>
          </div>

          {/* Formulaire de prompt */}
          <form onSubmit={handleGenerate} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Sujet / Mot-clé ou besoin spécifique
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Ex: Proposer un partenariat commercial avec ${creatorName}, une formation express, ou une vente privée...`}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 outline-none text-xs text-slate-800 placeholder-slate-400 transition resize-none font-normal"
              />
            </div>

            {/* Ton du contenu */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Tonalité de rédaction
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: 'convivial', label: '🤝 Convivial' },
                    { id: 'vendeur', label: '⚡ Vendeur Flash' },
                    { id: 'inspirant', label: '🌟 Inspirant' },
                    { id: 'expert', label: '🎯 Expert VIP' }
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setTone(t.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      tone === t.id
                        ? 'bg-[#4169E1] text-white shadow-sm shadow-[#4169E1]/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de génération */}
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 rounded-2xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-black shadow-lg shadow-[#4169E1]/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Génération par l'IA en cours...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Générer avec Nana AI Studio</span>
                </>
              )}
            </button>
          </form>

          {/* Résultat Généré */}
          {generatedResult && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#4169E1]" />
                  Contenu prêt à l'emploi
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {generatedResult}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUseInFeed}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Insérer dans la publication</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WameetGeneratorModal;
