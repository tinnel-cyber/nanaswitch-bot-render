import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Send, 
  HelpCircle, 
  ChevronRight, 
  Bot, 
  Phone, 
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface SupportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiAdvisor?: () => void;
  avatarUrl?: string;
}

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FREQUENT_QUESTIONS: FaqItem[] = [
  {
    question: "Comment encaisser une vente et imprimer le ticket ?",
    answer: "Sur l'écran Caisse, recherchez vos articles ou utilisez le micro pour dicter la vente. Cliquez ensuite sur le bouton vert 'Paiement Cash' pour afficher la monnaie à rendre et imprimer ou télécharger le reçu en PDF.",
    category: "Caisse"
  },
  {
    question: "Comment fonctionne la validation automatique par SMS ?",
    answer: "Nanasore intercepte les SMS officiels reçus d'Orange Money, Wave, Moov et MTN. Lorsque le client effectue le transfert, le système fait correspondre le montant et le numéro pour valider la vente instantanément sans saisie manuelle.",
    category: "Paiements"
  },
  {
    question: "Comment ajouter un produit rapidement avec l'IA ?",
    answer: "Rendez-vous dans la section Stock ou Boutique, cliquez sur 'Ajouter un produit' puis sur le bouton 'Génération IA'. Saisissez un mot-clé : l'IA génère la description marketing, le prix conseillé et le visuel studio.",
    category: "Stock & IA"
  },
  {
    question: "Comment partager ma boutique sur WhatsApp ?",
    answer: "Dans l'onglet Boutique, cliquez sur le bouton 'Partager' en haut à droite. Vous pouvez copier votre lien unique commerçant ou télécharger votre QR Code prêt à être imprimé ou partagé en statut WhatsApp.",
    category: "Boutique"
  },
  {
    question: "Puis-je utiliser Nanasore sans connexion Internet ?",
    answer: "Oui ! La caisse tactile, la reconnaissance vocale locale et le calcul des totaux fonctionnent à 100% hors-ligne. Dès que la connexion revient, vos données se synchronisent automatiquement en arrière-plan.",
    category: "Hors-ligne"
  }
];

export const SupportQuestionModal: React.FC<SupportQuestionModalProps> = ({
  isOpen,
  onClose,
  onOpenAiAdvisor,
  avatarUrl = '/assets/avatar_nanasore.jpg'
}) => {
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSendToWhatsApp = (questionText?: string) => {
    playTapBeep();
    const textToSend = questionText || userQuestion || "Bonjour l'équipe Nanasore, j'ai besoin d'une assistance sur mon application POS.";
    const encoded = encodeURIComponent(textToSend);
    const whatsappUrl = `https://wa.me/22670000000?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    playValidationBeep();
    setSubmitted(true);
    setTimeout(() => {
      handleSendToWhatsApp(userQuestion);
      setUserQuestion('');
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0d1527] border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt="Avatar Support" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                }}
                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400 shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Centre d’Aide &amp; Support</h3>
              <p className="text-[11px] text-indigo-300">Support commerçant réactif 7j/7</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps modal scrollable */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Bannière WhatsApp Direct */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white">Besoin d'une réponse immédiate ?</h4>
                <p className="text-[11px] text-slate-400">Échangez en direct avec un conseiller Nanasore sur WhatsApp</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSendToWhatsApp()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/50 cursor-pointer shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ouvrir WhatsApp</span>
            </button>
          </div>

          {/* Formulaire de question personnalisée */}
          <div>
            <label htmlFor="user-support-input" className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Posez votre question à notre assistant</span>
            </label>
            <form onSubmit={handleSubmitQuestion} className="space-y-2">
              <div className="relative">
                <textarea
                  id="user-support-input"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Décrivez votre question ou problème (ex: Je n'arrive pas à configurer Wave)..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500 text-xs sm:text-sm outline-none transition resize-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {onOpenAiAdvisor && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onClose();
                      onOpenAiAdvisor();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Bot className="w-3 h-3 text-indigo-400" />
                    <span>Demander au Conseiller</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!userQuestion.trim() || submitted}
                  className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {submitted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Transmission WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer au support</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Questions Fréquentes (FAQ) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>Questions Fréquentes</span>
            </h4>
            <div className="space-y-2">
              {FREQUENT_QUESTIONS.map((item, idx) => (
                <div 
                  key={idx}
                  className="border border-slate-800 rounded-2xl bg-slate-900/50 hover:bg-slate-800/60 transition overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedFaq(selectedFaq?.question === item.question ? null : item);
                    }}
                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold border border-indigo-800/40">
                        {item.category}
                      </span>
                      <span>{item.question}</span>
                    </div>
                    <ChevronRight 
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        selectedFaq?.question === item.question ? 'rotate-90 text-indigo-400' : ''
                      }`} 
                    />
                  </button>

                  {selectedFaq?.question === item.question && (
                    <div className="px-3.5 pb-3 pt-1 text-xs text-slate-300 bg-slate-950/40 border-t border-slate-800/80 leading-relaxed animate-in fade-in duration-150">
                      <p>{item.answer}</p>
                      <div className="mt-2 pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSendToWhatsApp(`Bonjour, j'ai une question sur: ${item.question}`)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Demander plus de détails sur WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pied modal */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>Assistance en ligne active</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="text-slate-400 hover:text-white transition font-medium cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
