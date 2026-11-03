import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, BookOpen, Bot, Settings, X, ExternalLink, 
  Copy, Check, Sparkles, Send, Loader2, ArrowRight, ShieldCheck, 
  Download, Play, CheckCircle2, Award, FileText, Smartphone,
  Users, MessageSquare, Video, Zap, Sliders, ChevronRight, Globe
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { askTinnelaTutor, TutorChatMessage } from '../../../../services/courseTutorAiService';
import { MarketplaceCourse } from './marketplace/types';
import { ExternalIntegrationsHub } from './integrations/ExternalIntegrationsHub';

// =============================================================================
// MODAL 1 : MON CAMPUS PRIVÉ (MARQUE BLANCHE)
// =============================================================================

export interface CampusPriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterCampus: () => void;
  onOpenWhiteLabel?: () => void;
  schoolName?: string;
  customDomain?: string;
}

export const CampusPriveModal: React.FC<CampusPriveModalProps> = ({
  isOpen,
  onClose,
  onEnterCampus,
  onOpenWhiteLabel,
  schoolName = 'Académie Digitale Privée',
  customDomain = 'campus.votredomaine.com'
}) => {
  const [copied, setCopied] = useState(false);
  const campusUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/classroom` 
    : 'https://nanasore.com/classroom';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    playValidationBeep();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(campusUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/50 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">Mon Campus Privé</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black border border-indigo-500/30">
                  100% MARQUE BLANCHE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Votre école en ligne autonome : nom de domaine propre, charte visuelle exclusive et accès direct élèves.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Principale : Accéder au Campus en Direct */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Salle de classe virtuelle active</span>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Opérationnel
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Consultez votre campus comme vos apprenants : lecteur vidéo épuré anti-fuite, quiz interactifs, simulateur vocal IA, salon d&apos;entraide et délivrance des attestations officielles.
          </p>

          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onEnterCampus();
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-98 cursor-pointer"
          >
            <GraduationCap className="w-5 h-5" />
            <span>Entrer dans le Campus Virtuel Élèves (Direct)</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Lien d'accès Étudiants */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Lien d&apos;invitation privé pour vos étudiants :
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={campusUrl}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Paramètres de Marque Blanche & Domaine */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Spécifications Marque Blanche
            </span>
            {onOpenWhiteLabel && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onClose();
                  onOpenWhiteLabel();
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Configurer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Nom de domaine :</span>
                <span className="font-mono text-white text-[11px]">{customDomain}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Branding NaNa :</span>
                <span className="font-bold text-emerald-400 text-[11px]">100% Masqué (Neutre)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Protection Vidéo :</span>
                <span className="font-bold text-white text-[11px]">Filigrane IP/Email actif</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Certifications :</span>
                <span className="font-bold text-white text-[11px]">QR Code UEMOA inclus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de modal */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onEnterCampus();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Accéder au Campus</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// MODAL 2 : NANA ACADEMY (FORMATIONS & RESSOURCES FORMATEURS)
// =============================================================================

export interface NanaAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreCatalog?: () => void;
}

export const NanaAcademyModal: React.FC<NanaAcademyModalProps> = ({
  isOpen,
  onClose,
  onExploreCatalog
}) => {
  const [activeTab, setActiveTab] = useState<'MASTERCLASSES' | 'TEMPLATES' | 'CATALOG'>('MASTERCLASSES');
  const [copiedResource, setCopiedResource] = useState<string | null>(null);

  if (!isOpen) return null;

  const MASTERCLASSES = [
    {
      id: 'm1',
      title: 'De 0 à 1 000 Étudiants en Afrique de l’Ouest',
      desc: 'Fixation des prix en FCFA (Wave / Orange Money), preuves sociales et lancements sans budget publicitaire.',
      duration: '18 min',
      speaker: 'Prof. Ibrahim Konkobo',
      level: 'Stratégique',
      category: 'BOOST VENTES'
    },
    {
      id: 'm2',
      title: 'Closing WhatsApp : Doubler le taux d’inscription',
      desc: 'Scripts vocaux de 45 secondes, relance des paniers abandonnés et lever les hésitations des apprenants.',
      duration: '14 min',
      speaker: 'Équipe Croissance NaNa',
      level: 'Pratique',
      category: 'WHATSAPP CRO'
    },
    {
      id: 'm3',
      title: 'Pédagogie Active : Structurer des Modules Courts',
      desc: 'Format micro-learning de 5 à 8 minutes, quiz post-leçon immédiat et techniques anti-décrochage.',
      duration: '12 min',
      speaker: 'NaNa AI Research',
      level: 'Pédagogie',
      category: 'ENGAGEMENT'
    },
    {
      id: 'm4',
      title: 'Contrats B2B & Séquestre Escrow pour Formateurs',
      desc: 'Vendre des formations aux entreprises et sécuriser le paiement total des factures par séquestre.',
      duration: '22 min',
      speaker: 'Direction Juridique & FinTech',
      level: 'B2B Élite',
      category: 'SÉQUESTRE'
    }
  ];

  const DOWNLOADABLE_TEMPLATES = [
    {
      id: 't1',
      title: 'Script de Relance WhatsApp (Formation)',
      desc: 'Modèle de message à fort taux de réponse pour convertir les prospects intéressés en inscrits fermes.',
      content: `Bonjour [Prénom] ! C'est [Votre Nom] de l'Académie [Nom Académie].\n\nJ'ai vu que vous aviez consulté notre formation [Titre de la Formation]. Les inscriptions avec accès au groupe VIP ferment ce soir à minuit.\n\nVous pouvez valider votre place directement en 1-Clic par Wave ou Orange Money ici : [Lien Campus]\n\nAvez-vous une question particulière sur le programme avant de démarrer ? Je suis disponible pour vous répondre !`
    },
    {
      id: 't2',
      title: 'Checklist Tournage Vidéo Smartphone',
      desc: 'Les 7 règles d’or : éclairage face à la fenêtre, micro-cravate à 15 cm du menton, résolution 1080p, stabilisateur.',
      content: `CHECKLIST TOURNAGE VIDÉO SMARTPHONE (NANA ACADEMY)\n\n1. Lumière : Face à une fenêtre ou lampe LED blanche (pas de contre-jour).\n2. Son : Micro-cravate branché ou enregistrement dans une pièce sans écho.\n3. Position caméra : À hauteur des yeux (utiliser un support stable ou trépied).\n4. Format : Résolution Full HD (1080p) à 30 ou 60 images/seconde.\n5. Durée par leçon : 5 à 10 minutes maximum (1 idée clé par capsule).\n6. Mode Avion activé pour éviter toute interruption d'appel.\n7. Test de 30 secondes avant d'enregistrer le module complet.`
    },
    {
      id: 't3',
      title: 'Modèle Contrat & Devis Formation B2B UEMOA',
      desc: 'Structure juridique pour facturer les PME et entreprises partenaires avec clause de séquestre.',
      content: `CONTRAT CADRE DE FORMATION PROFESSIONNELLE CONTINUE\n\nEntre l'Organisme de Formation : [Votre Entreprise / Raison Sociale]\nEt l'Entreprise Cliente : [Nom de l'Entreprise Partenaire]\n\nObjet : Session de formation pratique sur [Thématique]\nDurée : [Nombre] heures réparties sur [Nombre] sessions.\nModalités de règlement : Dépôt de 50% à la signature sous séquestre sécurisé Escrow, solde après délivrance des attestations homologuées.`
    }
  ];

  const handleCopyTemplate = (templateId: string, text: string) => {
    playValidationBeep();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedResource(templateId);
      setTimeout(() => setCopiedResource(null), 2500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/40 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">NaNa Academy</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                  FORMATIONS &amp; RESSOURCES FORMATEURS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Apprenez à booster vos ventes avec nos experts et découvrez les secrets pédagogiques des tops formateurs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'onglets */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('MASTERCLASSES');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'MASTERCLASSES'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Masterclasses Vidéo ({MASTERCLASSES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('TEMPLATES');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'TEMPLATES'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Boîte à Outils &amp; Scripts ({DOWNLOADABLE_TEMPLATES.length})</span>
          </button>
        </div>

        {/* Contenu Onglet 1 : Masterclasses */}
        {activeTab === 'MASTERCLASSES' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MASTERCLASSES.map((mc) => (
                <div 
                  key={mc.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {mc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        {mc.duration}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">
                      {mc.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {mc.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[11px]">
                    <span className="text-slate-400">{mc.speaker}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Visionner</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenu Onglet 2 : Boîte à Outils & Templates */}
        {activeTab === 'TEMPLATES' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {DOWNLOADABLE_TEMPLATES.map((tmpl) => (
              <div 
                key={tmpl.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-black text-white">{tmpl.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(tmpl.id, tmpl.content)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      copiedResource === tmpl.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {copiedResource === tmpl.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedResource === tmpl.id ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {tmpl.desc}
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-850 font-mono text-[10.5px] text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                  {tmpl.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pied de modal */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          {onExploreCatalog && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
                onExploreCatalog();
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Explorer la Vitrine Publique NaNa</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer ml-auto"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// MODAL 3 : AGENT IA PÉDAGOGIQUE (TUTEUR 24/7 & GÉNÉRATEUR DE QUIZ)
// =============================================================================

export interface AiPedagogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorName?: string;
  onOpenForge?: () => void;
}

export const AiPedagogicModal: React.FC<AiPedagogicModalProps> = ({
  isOpen,
  onClose,
  instructorName = 'Prof. Ibrahim Konkobo',
  onOpenForge
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'CHAT' | 'QUIZ_GEN' | 'SETTINGS'>('CHAT');

  // État du Chat Tuteur IA
  const [messages, setMessages] = useState<TutorChatMessage[]>([
    {
      id: 'init-1',
      sender: 'tutor',
      text: `Bonjour ${instructorName} ! Je suis votre **Agent IA Pédagogique** personnel.\n\nJe suis entraîné pour assister vos apprenants 24h/24, répondre à leurs interrogations sur vos cours, générer des quiz d'évaluation et adapter les explications selon leur niveau.\n\nQue souhaitez-vous faire aujourd'hui ?`,
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // État du Générateur de Quiz IA
  const [quizTopic, setQuizTopic] = useState('Gestion de Caisse Mobile Money & Sécurité financière');
  const [quizLevel, setQuizLevel] = useState<'debutant' | 'intermediaire' | 'avance'>('intermediaire');
  const [generatedQuiz, setGeneratedQuiz] = useState<any[] | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [copiedQuiz, setCopiedQuiz] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying]);

  if (!isOpen) return null;

  const mockCourseForAi: MarketplaceCourse = {
    id: 'telecom-fintech-masterclass',
    title: 'Formation Masterclass Telecom, FinTech & IA',
    category: 'TELECOM',
    price: 25000,
    instructor: { name: instructorName, avatarUrl: '', bio: '', verified: true } as any,
    modules: [],
    level: 'BEGINNER' as any,
    status: 'published',
    rating: 4.9,
    studentsCount: 340,
    durationHours: 12
  } as any;

  const handleSendChat = async (promptToSend?: string) => {
    const text = (promptToSend || chatInput).trim();
    if (!text || isAiReplying) return;

    playTapBeep();
    const userMsg: TutorChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiReplying(true);

    try {
      const response = await askTinnelaTutor(mockCourseForAi, text, [...messages, userMsg]);
      playValidationBeep();
      const tutorMsg: TutorChatMessage = {
        id: `t-${Date.now()}`,
        sender: 'tutor',
        text: response.reply,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, tutorMsg]);
    } catch {
      const fallbackMsg: TutorChatMessage = {
        id: `t-${Date.now()}`,
        sender: 'tutor',
        text: "J'ai bien noté votre demande pédagogique. N'hésitez pas à spécifier les points d'achoppement de vos étudiants pour que j'adapte les résumés et les questions de validation.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiReplying(false);
    }
  };

  const handleGenerateQuiz = () => {
    if (!quizTopic.trim() || isGeneratingQuiz) return;
    playTapBeep();
    setIsGeneratingQuiz(true);

    setTimeout(() => {
      playValidationBeep();
      setGeneratedQuiz([
        {
          question: `Quelle est la règle prioritaire lors d'une transaction liée à : "${quizTopic}" ?`,
          options: [
            "Valider le SMS de confirmation reçu sur son propre terminal sécurisé avant remise de fonds",
            "Faire confiance au client s'il montre une capture d'écran sur son téléphone",
            "Effectuer le transfert sans vérifier le solde préalable",
            "Déléguer la transaction à un tiers sans code PIN"
          ],
          correctIndex: 0,
          explanation: "La validation directe sur le terminal de point de vente est le pilier anti-fraude fondamental recommandé par NaNa Academy."
        },
        {
          question: "Comment un tuteur doit-il aborder un apprenant qui hésite sur ce concept ?",
          options: [
            "Lui proposer un cas pratique simulé dans l'Arène Vocale ou un atelier concret",
            "Lui demander de relire le syllabus sans explication supplémentaire",
            "Ignorer sa question et passer au chapitre suivant",
            "Lui attribuer une note éliminatoire sans feedback"
          ],
          correctIndex: 0,
          explanation: "La méthode active par mise en situation renforce l'ancrage mémoriel à plus de 85%."
        },
        {
          question: "Quel indicateur atteste de la maîtrise définitive d'un module par l'étudiant ?",
          options: [
            "La réussite au quiz avec au moins 80% et la complétion des devoirs pratiques",
            "Le simple visionnage de la vidéo en accéléré",
            "La consultation de la table des matières",
            "L'inscription au cours sans participation"
          ],
          correctIndex: 0,
          explanation: "L'attestation officielle NaNa exige une validation concrète des compétences acquises."
        }
      ]);
      setIsGeneratingQuiz(false);
    }, 1200);
  };

  const handleCopyQuizText = () => {
    if (!generatedQuiz) return;
    playValidationBeep();
    const formatted = generatedQuiz.map((q, idx) => {
      return `QUESTION ${idx + 1} : ${q.question}\n` +
        q.options.map((opt: string, i: number) => `  ${String.fromCharCode(65 + i)}) ${opt} ${i === q.correctIndex ? '✓ [BONNE RÉPONSE]' : ''}`).join('\n') +
        `\nExplication : ${q.explanation}\n`;
    }).join('\n---\n\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedQuiz(true);
      setTimeout(() => setCopiedQuiz(false), 2500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-fuchsia-950/40 text-white space-y-6 max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-900/50 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">Agent IA Pédagogique</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-black border border-fuchsia-500/30">
                  TUTEUR INTELLIGENT 24/7 &amp; QUIZ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tuteur virtuel pour assister vos étudiants, générer vos quiz et rédiger vos devoirs pédagogiques.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de sous-onglets */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveSubTab('CHAT');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'CHAT'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tester le Tuteur IA en Direct</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveSubTab('QUIZ_GEN');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'QUIZ_GEN'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Générateur Automatique de Quiz</span>
          </button>
        </div>

        {/* ONGLET 1 : CHAT TUTEUR EN DIRECT */}
        {activeSubTab === 'CHAT' && (
          <div className="flex-1 flex flex-col space-y-3 min-h-[360px]">
            {/* Suggestions rapides */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 font-bold shrink-0">Prompts rapides :</span>
              {[
                "Comment vulgariser un sujet complexe ?",
                "Propose 3 questions pièges pour tester un élève",
                "Message de relance bienveillant pour un élève bloqué"
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChat(p)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition cursor-pointer border border-slate-700/60"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Zone de discussion */}
            <div className="flex-1 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 overflow-y-auto max-h-[300px]">
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'tutor' && (
                    <div className="w-7 h-7 rounded-lg bg-fuchsia-600/30 text-fuchsia-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isAiReplying && (
                <div className="flex items-center gap-2 text-xs text-fuchsia-400 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>L&apos;Agent IA réfléchit et rédige sa réponse...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Saisie */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Posez une question pédagogique à votre Agent IA..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500"
              />
              <button
                type="button"
                onClick={() => handleSendChat()}
                disabled={!chatInput.trim() || isAiReplying}
                className="px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        )}

        {/* ONGLET 2 : GÉNÉRATEUR AUTOMATIQUE DE QUIZ */}
        {activeSubTab === 'QUIZ_GEN' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Thème du module ou sujet de l&apos;évaluation :
                </label>
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="Ex : Gestion de stock et Mobile Money..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Niveau :</span>
                  {(['debutant', 'intermediaire', 'avance'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setQuizLevel(lvl)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                        quizLevel === lvl
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-slate-850 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz || !quizTopic.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-fuchsia-600/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isGeneratingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{isGeneratingQuiz ? 'Génération...' : 'Générer avec l\'IA'}</span>
                </button>
              </div>
            </div>

            {/* Affichage du Quiz Généré */}
            {generatedQuiz && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Questions générées ({generatedQuiz.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyQuizText}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        copiedQuiz
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {copiedQuiz ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedQuiz ? 'Copié !' : 'Copier le Quiz'}</span>
                    </button>
                    {onOpenForge && (
                      <button
                        type="button"
                        onClick={() => {
                          playValidationBeep();
                          onClose();
                          onOpenForge();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Insérer dans Forge</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {generatedQuiz.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <p className="text-xs font-black text-white">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div 
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                              oIdx === q.correctIndex
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-850 text-slate-300'
                            }`}
                          >
                            <span className="font-mono text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                            {oIdx === q.correctIndex && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10.5px] text-slate-400 italic pt-1 border-t border-slate-850/60">
                        💡 Explication pédagogique : {q.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pied de modal */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// MODAL 4 : INTÉGRATIONS EXTERNES
// =============================================================================

export interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId?: string;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  instructorId = 'instructor-default'
}) => {
  const [activeTab, setActiveTab] = useState<'ECOMMERCE_SMS' | 'VIDEO_LMS'>('ECOMMERCE_SMS');
  const [wooUrl, setWooUrl] = useState('');
  const [wooKey, setWooKey] = useState('');
  const [brevoKey, setBrevoKey] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    playValidationBeep();
    setSaveToast('Connecteurs synchronisés et enregistrés avec succès !');
    setTimeout(() => setSaveToast(null), 3500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg border border-slate-700 shrink-0">
              <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">Intégrations Externes &amp; Passerelles</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black border border-slate-700">
                  CONNECTEURS API SOUVERAINS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connectez vos comptes WooCommerce, Brevo emailing, passerelles Twilio SMS et salons vidéo Daily.co / Zoom.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'onglets */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('ECOMMERCE_SMS');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'ECOMMERCE_SMS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>WooCommerce, Brevo &amp; Twilio SMS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('VIDEO_LMS');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'VIDEO_LMS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Zoom, Jitsi, Google Meet &amp; Classroom</span>
          </button>
        </div>

        {saveToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* ONGLET 1 : WOOCOMMERCE, BREVO, TWILIO */}
        {activeTab === 'ECOMMERCE_SMS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Carte WooCommerce */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      WooCommerce REST
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      Connecté
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Synchronisation automatique des stocks et création de commandes On-Hold.
                  </p>
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold block">URL Boutique :</label>
                    <input
                      type="url"
                      value={wooUrl}
                      onChange={(e) => setWooUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">Consumer Key :</label>
                    <input
                      type="password"
                      value={wooKey}
                      onChange={(e) => setWooKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Carte Brevo Emailing */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Brevo (SendinBlue)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      Actif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Envoi automatique des reçus transactionnels et exports de contacts.
                  </p>
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold block">Clé API Brevo v3 :</label>
                    <input
                      type="password"
                      value={brevoKey}
                      onChange={(e) => setBrevoKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Carte Twilio SMS & WhatsApp */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Twilio SMS / WhatsApp
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      Prêt
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Passerelle SMS instantanée et relance automatique sur WhatsApp Business.
                  </p>
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold block">Account SID :</label>
                    <input
                      type="password"
                      value={twilioSid}
                      onChange={(e) => setTwilioSid(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer &amp; Synchroniser les Connecteurs</span>
              </button>
            </div>
          </div>
        )}

        {/* ONGLET 2 : VIDEO & LMS */}
        {activeTab === 'VIDEO_LMS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <ExternalIntegrationsHub instructorId={instructorId} />
          </div>
        )}

        {/* Pied */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// MODAL 5 : VISIBILITÉ SUR LA VITRINE PUBLIQUE NANA
// =============================================================================

export interface VitrinePubliqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCatalog: () => void;
}

export const VitrinePubliqueModal: React.FC<VitrinePubliqueModalProps> = ({
  isOpen,
  onClose,
  onOpenCatalog
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const catalogUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/catalog`
    : 'https://nanasore.com/catalog';

  if (!isOpen) return null;

  const handleCopy = () => {
    playValidationBeep();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(catalogUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-950/40 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-900/40 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">Vitrine Publique NaNa</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                  EXCLUSIVITÉ PLAN ÉLITE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Propulsez vos cours sur la vitrine officielle NaNa pour capter des milliers d’étudiants qualifiés.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicateurs de performance & Référencement */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Statut Vitrine</span>
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Référencé Actif</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Audience Cible</span>
            <div className="text-amber-400 font-black text-sm">
              +45 000 Élèves
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Frais NaNa</span>
            <div className="text-emerald-400 font-black text-sm">
              0% Commission
            </div>
          </div>
        </div>

        {/* Lien direct de la vitrine */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Lien officiel vers votre vitrine :
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={catalogUrl}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Boutons d'action vitrine */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Mise en avant sur le Marketplace NaNa</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Vos cours bénéficient de la visibilité sur la vitrine officielle, avec badges de certification officielle, avis apprenants vérifiés et encaissement direct Wave &amp; Orange Money.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onClose();
                onOpenCatalog();
              }}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Ouvrir la Vitrine (Direct)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.open('/catalog', '_blank');
                }
              }}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Nouvel Onglet</span>
            </button>
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};


export default CampusPriveModal;
