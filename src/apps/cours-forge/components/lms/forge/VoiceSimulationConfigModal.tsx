import React, { useState, useCallback } from 'react';
import { 
  X, 
  Mic, 
  Bot, 
  Sparkles, 
  Clock, 
  Award, 
  Sliders, 
  Layers, 
  Volume2, 
  HelpCircle,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { VoiceSimulationScenarioConfig } from '../../../../../types';

interface VoiceSimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: VoiceSimulationScenarioConfig;
  onSave: (config: VoiceSimulationScenarioConfig) => void;
}

const PRESET_SCENARIOS: Partial<VoiceSimulationScenarioConfig>[] = [
  {
    title: "Support FinTech - Panne USSD & Client Mécontent",
    persona: "Vous êtes Mamadou, gérant d'une boutique à Abidjan. Votre terminal Mobile Money refuse les transactions Wave et Orange Money depuis 45 minutes un samedi après-midi de forte affluence. Vous êtes furieux et impatient.",
    objective: "L'étudiant doit calmer le commerçant, vérifier le code d'erreur USSD, lui expliquer posément la procédure de secours et lui offrir une compensation commerciale de 2 000 FCFA.",
    initialGreeting: "Allô le support ? C'est inadmissible ! Mes clients attendent en caisse et vos serveurs sont en panne ! Qu'est-ce que vous faites ?",
    voiceGender: 'male',
    maxDurationSeconds: 180,
    passingScore: 75,
    difficulty: 'INTERMEDIAIRE'
  },
  {
    title: "Négociation B2B - Partenariat Caisse NaNa",
    persona: "Vous êtes Mme Diallo, directrice financière d'une chaîne de 12 supermarchés au Sahel. Vous êtes très sceptique quant à l'abandon de vos terminaux bancaires traditionnels pour la Caisse NaNa.",
    objective: "L'étudiant doit présenter le gain sur les commissions de transactions, la synchronisation temps réel hors-ligne et l'instantanéité des règlements fournisseurs.",
    initialGreeting: "Bonjour. J'ai 5 minutes devant moi. Expliquez-moi pourquoi je risquerais mes opérations avec votre solution plutôt qu'avec ma banque historique.",
    voiceGender: 'female',
    maxDurationSeconds: 240,
    passingScore: 80,
    difficulty: 'EXPERT'
  }
];

export const VoiceSimulationConfigModal: React.FC<VoiceSimulationConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [title, setTitle] = useState(config?.title || 'Simulation Vocale IA');
  const [persona, setPersona] = useState(
    config?.persona || "Vous êtes un client exigeant qui souhaite tester l'expertise technique de l'apprenant."
  );
  const [objective, setObjective] = useState(
    config?.objective || "L'apprenant doit identifier le besoin, expliquer la solution avec clarté et rassurer."
  );
  const [initialGreeting, setInitialGreeting] = useState(
    config?.initialGreeting || "Bonjour, j'ai une question urgente concernant votre module."
  );
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(config?.voiceGender || 'female');
  const [maxDurationSeconds, setMaxDurationSeconds] = useState(config?.maxDurationSeconds || 180);
  const [passingScore, setPassingScore] = useState(config?.passingScore || 70);
  const [difficulty, setDifficulty] = useState<'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT'>(
    config?.difficulty || 'INTERMEDIAIRE'
  );

  if (!isOpen) return null;

  const applyPreset = (preset: Partial<VoiceSimulationScenarioConfig>) => {
    if (preset.title) setTitle(preset.title);
    if (preset.persona) setPersona(preset.persona);
    if (preset.objective) setObjective(preset.objective);
    if (preset.initialGreeting) setInitialGreeting(preset.initialGreeting);
    if (preset.voiceGender) setVoiceGender(preset.voiceGender);
    if (preset.maxDurationSeconds) setMaxDurationSeconds(preset.maxDurationSeconds);
    if (preset.passingScore) setPassingScore(preset.passingScore);
    if (preset.difficulty) setDifficulty(preset.difficulty);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: config?.id || `sim-vocale-${Date.now()}`,
      title,
      persona,
      objective,
      initialGreeting,
      voiceGender,
      maxDurationSeconds,
      passingScore,
      difficulty
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Configuration de la Simulation Vocale IA
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Définissez le persona, l'objectif et le seuil de passage pour le jeu de rôle immersif.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 touch-pan-y custom-scrollbar">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
              Modèles de Scénarios Prêts à l'Emploi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_SCENARIOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                      {p.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {p.difficulty} • {p.maxDurationSeconds ? Math.round(p.maxDurationSeconds / 60) : 3} min
                    </p>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    Appliquer &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">
              Titre de l'épreuve vocale
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              placeholder="ex: Résolution Incident Paiement Mobile"
            />
          </div>

          {/* Persona Prompt */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block flex items-center justify-between">
              <span>Persona & Rôle de l'IA (System Prompt)</span>
              <span className="text-[10px] font-normal text-slate-400">Qui incarne l'IA ?</span>
            </label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              required
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              placeholder="Vous êtes un client exigeant demandant un remboursement immédiat..."
            />
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block flex items-center justify-between">
              <span>Objectif Pédagogique de l'Élève</span>
              <span className="text-[10px] font-normal text-slate-400">Critère d'évaluation principal</span>
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
              rows={2}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              placeholder="L'étudiant doit désamorcer la tension et proposer la solution d'urgence..."
            />
          </div>

          {/* Initial Greeting */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">
              Phrase d'ouverture vocale par l'IA
            </label>
            <input
              type="text"
              value={initialGreeting}
              onChange={(e) => setInitialGreeting(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              placeholder="Allô bonjour ! J'ai un gros souci avec mon paiement..."
            />
          </div>

          {/* Grid Settings: Voice, Duration, Score, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            {/* Voice Gender */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Timbre Vocal de l'Agent IA
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceGender('female')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    voiceGender === 'female'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Voix Féminine
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceGender('male')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    voiceGender === 'male'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Voix Masculine
                </button>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Difficulté du Jeu de Rôle
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="DEBUTANT">🟢 Débutant (Guidé)</option>
                <option value="INTERMEDIAIRE">🟡 Intermédiaire (Réaliste)</option>
                <option value="EXPERT">🔴 Expert (Haute Tension)</option>
              </select>
            </div>

            {/* Max Duration */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Durée maximale de l'épreuve
                </span>
                <span className="text-cyan-300 font-bold">{Math.round(maxDurationSeconds / 60)} min ({maxDurationSeconds}s)</span>
              </label>
              <input
                type="range"
                min="60"
                max="600"
                step="30"
                value={maxDurationSeconds}
                onChange={(e) => setMaxDurationSeconds(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800"
              />
            </div>

            {/* Passing Score */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  Score Minimal de Réussite
                </span>
                <span className="text-emerald-300 font-bold">{passingScore}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Enregistrer la Simulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoiceSimulationConfigModal;
