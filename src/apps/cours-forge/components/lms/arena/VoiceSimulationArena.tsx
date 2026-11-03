import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Bot, 
  User, 
  Sparkles, 
  Clock, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Play, 
  Square,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { VoiceSimulationScenarioConfig, VoiceSimulationReport } from '../../../../../types';
import { useVoiceAI } from '../../../../../hooks/useVoiceAI';

interface VoiceSimulationArenaProps {
  scenario: VoiceSimulationScenarioConfig;
  studentId: string;
  courseId: string;
  lessonId: string;
  onFinish: (report: VoiceSimulationReport) => void;
  onClose: () => void;
}

export const VoiceSimulationArena: React.FC<VoiceSimulationArenaProps> = ({
  scenario,
  studentId,
  courseId,
  lessonId,
  onFinish,
  onClose
}) => {
  const {
    isSupported,
    isSessionActive,
    isListening,
    isAiSpeaking,
    isProcessing,
    userFrequencyData,
    aiFrequencyData,
    conversationHistory,
    remainingSeconds,
    formattedTime,
    currentTranscript,
    aiResponseText,
    startSession,
    endSession,
    startSpeaking,
    stopSpeakingAndSubmit,
    cancelSession
  } = useVoiceAI(scenario, studentId, courseId, lessonId);

  const [isFinishing, setIsFinishing] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentTranscript, aiResponseText]);

  const handleEndSimulation = async () => {
    setIsFinishing(true);
    try {
      const report = await endSession();
      if (report) {
        onFinish(report);
      }
    } catch (err) {
      console.error('Erreur fin de simulation:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleStart = async () => {
    try {
      await startSession();
    } catch (err) {
      console.error('Erreur démarrage arène:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl animate-fadeIn">
      {/* Arena Container */}
      <div 
        className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cyber Neon Background Gradients */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {scenario.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Arène Vocale NaNa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Évaluation interactive orale avec streaming LLM Gemini 3.8 Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSessionActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-400 shadow-inner">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formattedTime}</span>
              </div>
            )}
            <button
              onClick={() => {
                cancelSession();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              aria-label="Fermer la simulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Not Supported Fallback Alert */}
        {!isSupported && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center gap-2 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Votre navigateur ne supporte pas l'API Web Speech de manière native. Utilisez Google Chrome ou Edge pour une expérience optimale.</span>
          </div>
        )}

        {/* Arena Body (Split: Visualizer Top / Left, Live Transcript Bottom / Right) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 touch-pan-y custom-scrollbar relative z-10 flex flex-col justify-between">
          {!isSessionActive ? (
            /* Briefing Card before start */
            <div className="my-auto max-w-xl mx-auto w-full p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-emerald-500 mx-auto flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <Mic className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white mb-1">Prêt pour le jeu de rôle ?</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  Vous allez converser vocalement avec notre agent IA. Répondez naturellement à voix haute comme dans une situation réelle.
                </p>
              </div>

              <div className="text-left bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-cyan-400 block mb-0.5">🎭 Persona adverse :</span>
                  <p className="text-slate-300">{scenario.persona}</p>
                </div>
                <div>
                  <span className="font-bold text-emerald-400 block mb-0.5">🎯 Votre mission :</span>
                  <p className="text-slate-300">{scenario.objective}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>Temps alloué : {Math.round(scenario.maxDurationSeconds / 60)} min</span>
                  <span className="font-bold text-amber-400">Score de passage : {scenario.passingScore}%</span>
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={!isSupported}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Lancer la Simulation Vocale
              </button>
            </div>
          ) : (
            /* Active Simulation Interface */
            <div className="flex-1 flex flex-col justify-between space-y-6">
              {/* Dual Visualizer Zone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Persona Voice Card */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  isAiSpeaking 
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isAiSpeaking ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Agent NaNa (Interlocuteur)</h5>
                        <p className="text-[10px] text-cyan-400 font-medium">
                          {isAiSpeaking ? 'En train de parler...' : 'À l\'écoute'}
                        </p>
                      </div>
                    </div>
                    <Volume2 className={`w-4 h-4 ${isAiSpeaking ? 'text-cyan-400 animate-bounce' : 'text-slate-600'}`} />
                  </div>

                  {/* AI Frequency visualizer bars */}
                  <div className="h-14 flex items-center justify-center gap-1.5 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    {aiFrequencyData.map((val, idx) => {
                      const heightPercent = isAiSpeaking ? Math.max(10, Math.min(100, (val / 255) * 100)) : 10;
                      return (
                        <div
                          key={idx}
                          className="w-2 rounded-full bg-gradient-to-t from-cyan-600 to-teal-400 transition-all duration-75"
                          style={{ height: `${heightPercent}%` }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Learner Voice Card */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  isListening 
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isListening ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Vous (Apprenant)</h5>
                        <p className="text-[10px] text-emerald-400 font-medium">
                          {isListening ? 'Microphone actif (Parlez)' : 'Microphone en attente'}
                        </p>
                      </div>
                    </div>
                    <Mic className={`w-4 h-4 ${isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                  </div>

                  {/* User Frequency visualizer bars */}
                  <div className="h-14 flex items-center justify-center gap-1.5 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    {userFrequencyData.map((val, idx) => {
                      const heightPercent = isListening ? Math.max(10, Math.min(100, (val / 255) * 100)) : 10;
                      return (
                        <div
                          key={idx}
                          className="w-2 rounded-full bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-75"
                          style={{ height: `${heightPercent}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scrollable Conversation Transcript Area */}
              <div className="flex-1 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 overflow-y-auto overscroll-contain min-h-[200px] max-h-[45vh] space-y-3 touch-pan-y custom-scrollbar">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                  <span className="font-semibold uppercase tracking-wider">Transcription Temps Réel</span>
                  <span className="text-cyan-400 font-mono">{conversationHistory.length} échanges</span>
                </div>

                {conversationHistory.map((turn) => {
                  const isUser = turn.role === 'user';
                  return (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                        <span>{isUser ? 'Vous' : 'Agent NaNa'}</span>
                        <span>•</span>
                        <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-emerald-600/90 text-white rounded-br-none shadow-md'
                            : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none shadow-md'
                        }`}
                      >
                        {turn.text}
                      </div>
                    </div>
                  );
                })}

                {/* Live stream text preview */}
                {isListening && currentTranscript && (
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-emerald-400 mb-0.5 px-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      En cours d'élocution...
                    </div>
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl text-xs bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 rounded-br-none italic">
                      {currentTranscript}...
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 py-2">
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>L'agent IA réfléchit et prépare sa réponse vocale...</span>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>

              {/* Bottom Controller Bar */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                {/* Hold to speak / toggle button */}
                <div className="flex items-center gap-3">
                  {!isListening ? (
                    <button
                      type="button"
                      onClick={startSpeaking}
                      disabled={isAiSpeaking || isProcessing}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-40"
                    >
                      <Mic className="w-4 h-4" />
                      Activer le micro & Parler
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopSpeakingAndSubmit}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse transition-all active:scale-95"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Arrêter & Envoyer ma réponse
                    </button>
                  )}

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {isListening ? 'Cliquez pour soumettre votre voix' : 'Cliquez pour prendre la parole'}
                  </span>
                </div>

                {/* Finalize Assessment Button */}
                <button
                  type="button"
                  onClick={handleEndSimulation}
                  disabled={isFinishing || conversationHistory.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2 disabled:opacity-40"
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  {isFinishing ? 'Évaluation IA en cours...' : 'Terminer & Évaluer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceSimulationArena;
